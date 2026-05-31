// Recompute profiles.skills_canonical + skills_unmapped from FRESH DB rows.
//
// PR #178 incident shape: stale per-source state passed into
// aggregateProfileSkills collapsed skills_canonical (Eli's experiences
// cache was poisoned by a narrow projection → narrow rows had no
// skills_used → saveProfile aggregated empty arrays → canonical dropped
// 64 → 7). Every recompute path must therefore fetch ALL FOUR sources
// fresh from the DB rather than reuse cached React state.
//
// Sources unioned (mirrors skillAggregation.collectAllSkillLabels):
//   1. profiles.skills            (catch-all from StepSkills)
//   2. experiences.skills_used + .tools_used
//   3. education.skills_developed
//   4. projects.skills_demonstrated
//
// Call after any per-table save that affects one of those columns:
//   - EducationTab.handleSave        (education.skills_developed)
//   - Profile.addExperience          (experiences.skills_used/tools_used)
//   - Profile.saveProfile            (profiles.skills + everything else)
//   - Future: Projects add/edit      (projects.skills_demonstrated)
//
// Returns { ok, canonical, unmapped, error }. Caller invalidates the
// userProfile query on ok=true.

import { aggregateProfileSkills } from "./skillAggregation";

export async function recomputeProfileSkillsCanonical(supabase, userId) {
  if (!supabase || !userId) {
    return { ok: false, error: new Error("recomputeProfileSkillsCanonical: supabase + userId required") };
  }

  try {
    const [
      { data: profileRow, error: profErr },
      { data: experiences, error: expErr },
      { data: educations, error: eduErr },
      { data: projects, error: projErr },
    ] = await Promise.all([
      supabase.from("profiles").select("skills").eq("id", userId).maybeSingle(),
      supabase.from("experiences").select("skills_used, tools_used").eq("user_id", userId),
      supabase.from("education").select("skills_developed").eq("user_id", userId),
      supabase.from("projects").select("skills_demonstrated").eq("user_id", userId),
    ]);

    const fetchErr = profErr || expErr || eduErr || projErr;
    if (fetchErr) return { ok: false, error: fetchErr };

    const { canonical, unmapped } = aggregateProfileSkills({
      profileSkills: Array.isArray(profileRow?.skills) ? profileRow.skills : [],
      experiences: experiences || [],
      educations: educations || [],
      projects: projects || [],
    });

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ skills_canonical: canonical, skills_unmapped: unmapped })
      .eq("id", userId);

    if (updErr) return { ok: false, error: updErr };
    return { ok: true, canonical, unmapped };
  } catch (e) {
    return { ok: false, error: e };
  }
}
