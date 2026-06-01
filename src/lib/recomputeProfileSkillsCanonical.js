// Recompute profiles.skills_canonical + skills_unmapped from FRESH DB rows.
//
// PR #178 incident shape: stale per-source state passed into
// aggregateProfileSkills collapsed skills_canonical (Eli's experiences
// cache was poisoned by a narrow projection → narrow rows had no
// skills_used → saveProfile aggregated empty arrays → canonical dropped
// 64 → 7). Every recompute path must therefore fetch sources fresh from
// the DB rather than reuse cached React state.
//
// P1.3 read switch: single read against entity_spine (the federation
// VIEW from P1.0). Each spine row carries the unified `skills` column;
// the VIEW has security_invoker=true so RLS filters to the calling user.
// Lossless vs the legacy 4-query path — P1.1 backfill made
// entity.skills the union of every legacy column, so the aggregate is
// byte-identical to the pre-switch result.
//
// Call after any per-table save that affects one of those columns:
//   - EducationTab.handleSave        (education.skills)
//   - Profile.addExperience          (experiences.skills)
//   - Profile.saveProfile            (profiles.skills + everything else)
//   - Future: Projects add/edit      (projects.skills)
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
      { data: spineRows, error: spineErr },
    ] = await Promise.all([
      supabase.from("profiles").select("skills").eq("id", userId).maybeSingle(),
      // Single federated read across experiences + education + projects +
      // certifications. entity_spine is a security_invoker VIEW so RLS
      // on the underlying tables applies; user_id filter remains.
      supabase.from("entity_spine").select("skills").eq("user_id", userId),
    ]);

    const fetchErr = profErr || spineErr;
    if (fetchErr) return { ok: false, error: fetchErr };

    const { canonical, unmapped } = aggregateProfileSkills({
      profileSkills: Array.isArray(profileRow?.skills) ? profileRow.skills : [],
      entitySpine: spineRows || [],
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
