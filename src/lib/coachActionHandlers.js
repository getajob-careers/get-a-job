// Shared apply-action handler logic for the SUGGESTED_*_JSON cards.
// Extracted from ChatInterface.jsx so both the full-page agents (still
// rendering the rich cards inside ChatInterface) and the new Coach
// dock/panel (one-line condensed rows) can call the same insert /
// invoke / cache-invalidate pipeline. UI state — addedTaskSets,
// appliedRoadmapSets, cvGenStates, etc — STAYS with each surface; only
// the mutation logic moves here.
//
// Each handler returns { ok: true, ...extras? } | { error: string,
// hasError?: true }. The caller decides what to toast and which UI
// state to flip. No toast is fired from this module so a caller can
// batch a multi-step apply without N toasts.
//
// Ported byte-equivalent from ChatInterface.jsx — every match-rule,
// validation guard, RLS-aware shortcut, and analytics behavior is the
// same as before this PR.

import { supabase } from "@/api/supabaseClient";
import { invokeWithAuthRetry } from "@/api/invokeWithAuthRetry";
import { track, EVENTS } from "@/lib/analytics";
import { resolveDueDate } from "@/lib/taskDueDate";
import { experiencesQueryKey } from "@/lib/queries/useExperiences";
import { scoreApplication } from "@/lib/scoreApplication";
import { stripHtml } from "../../scripts/lib/normalize.ts";
import { classifyBullets } from "@/lib/bulletDedup";
import {
  validTrack,
  validStatus,
  validInterviewStage,
  validateMatchedSkills,
  sanitizeMissingSkills,
  clampScore,
  sanitizeText,
  sanitizeActionItems,
  sanitizeCompany,
} from "@/lib/applyHandlerValidation";

// ─── Tasks ─────────────────────────────────────────────────────────────
// Single-task insert. The rich card calls this per-task as the user
// taps Add; the dock/panel condensed row calls it in a loop for all
// suggested tasks at once.
export async function applyTaskSuggestion({ user, task }) {
  if (!user?.id || !task?.title) return { error: "missing user or task title" };
  const priority = task.priority || "medium";
  const { error } = await supabase.from("tasks").insert({
    title: task.title,
    description: task.description || "",
    category: task.category || "application",
    priority,
    role_title: task.role_title || "",
    due_date: resolveDueDate(task.due_date),
    user_id: user.id,
    is_complete: false,
  });
  if (error) {
    console.error("[coachActions] applyTaskSuggestion failed:", error);
    return { error: error.message || "insert failed" };
  }
  return { ok: true };
}

// Convenience: apply EVERY task in a suggestion list. Used by the
// condensed dock/panel rows. Returns partial-success info so the caller
// can render an accurate state ("3 of 4 tasks added").
export async function applyAllTaskSuggestions({ user, tasks }) {
  if (!Array.isArray(tasks) || tasks.length === 0) return { error: "no tasks" };
  let added = 0;
  let lastError = null;
  for (const t of tasks) {
    const res = await applyTaskSuggestion({ user, task: t });
    if (res.ok) added++;
    else lastError = res.error;
  }
  if (added === 0) return { error: lastError || "no tasks added" };
  return { ok: true, added, total: tasks.length };
}

// ─── Roadmap changes ───────────────────────────────────────────────────
// Validates each change against the user's profile.skills (matched
// skills must already exist in the profile — anti-fab guard) before
// writing. Returns pathCRoles when an add_role landed without any
// AI-proposed skill arrays so the caller can nudge the user toward
// Refresh Analysis.
export async function applyRoadmapChanges({ user, changes, userSkills = [] }) {
  if (!user?.id || !Array.isArray(changes) || changes.length === 0) return { error: "missing input" };
  let hasError = false;
  const pathCRoles = [];

  for (const change of changes) {
    if (change.action === "update_track") {
      const newTrack = validTrack(change.new_track);
      if (!newTrack) { console.error("Roadmap update_track: invalid track", change.new_track); hasError = true; continue; }
      const { data: matches, error: lookupErr } = await supabase
        .from("career_roles")
        .select("id")
        .eq("user_id", user.id)
        .ilike("title", change.role_title);
      if (lookupErr) { console.error("Roadmap update_track lookup error:", lookupErr); hasError = true; continue; }
      if (!matches || matches.length === 0) { console.error("Roadmap update_track: role not found", change.role_title); hasError = true; continue; }
      const ids = matches.map((m) => m.id);
      const { error } = await supabase
        .from("career_roles")
        .update({ track: newTrack })
        .in("id", ids);
      if (error) { console.error("Roadmap update_track error:", error); hasError = true; }
    } else if (change.action === "add_role") {
      const track = validTrack(change.track);
      if (!track) { console.error("Roadmap add_role: invalid track", change.track); hasError = true; continue; }

      let matched_skills = [];
      let missing_skills = [];
      let usedAIProposed = false;
      if ("matched_skills_proposed" in change) {
        matched_skills = validateMatchedSkills(change.matched_skills_proposed, userSkills);
        usedAIProposed = true;
      }
      if ("missing_skills_proposed" in change) {
        missing_skills = sanitizeMissingSkills(change.missing_skills_proposed);
        usedAIProposed = true;
      }

      const insertPayload = {
        user_id: user.id,
        title: change.title,
        track,
        matched_skills,
        missing_skills,
        skills_gap: missing_skills,
      };
      if ("readiness_score" in change) {
        const score = clampScore(change.readiness_score);
        if (score !== null) {
          insertPayload.readiness_score = score;
          insertPayload.match_score = score;
        }
      }
      if ("reasoning" in change) insertPayload.reasoning = sanitizeText(change.reasoning, 500);
      if ("alignment_to_goal" in change) insertPayload.alignment_to_goal = sanitizeText(change.alignment_to_goal, 500);
      if ("action_items" in change) insertPayload.action_items = sanitizeActionItems(change.action_items);

      const { error } = await supabase.from("career_roles").insert(insertPayload);
      if (error) { console.error("Roadmap add_role error:", error); hasError = true; continue; }
      if (!usedAIProposed) pathCRoles.push(change.title);
    } else if (change.action === "remove_role") {
      const { data: matches, error: lookupErr } = await supabase
        .from("career_roles")
        .select("id")
        .eq("user_id", user.id)
        .ilike("title", change.role_title);
      if (lookupErr) { console.error("Roadmap remove_role lookup error:", lookupErr); hasError = true; continue; }
      if (!matches || matches.length === 0) { console.error("Roadmap remove_role: role not found", change.role_title); hasError = true; continue; }
      if (matches.length > 1) { console.error("Roadmap remove_role: ambiguous match", change.role_title); hasError = true; continue; }
      const { error } = await supabase
        .from("career_roles")
        .delete()
        .eq("id", matches[0].id);
      if (error) { console.error("Roadmap remove_role error:", error); hasError = true; }
    }
  }

  if (hasError) return { error: "some changes failed", hasError: true, pathCRoles };
  return { ok: true, pathCRoles };
}

// ─── Application actions ───────────────────────────────────────────────
export async function applyApplicationActions({ user, queryClient, actions }) {
  if (!user?.id || !Array.isArray(actions) || actions.length === 0) return { error: "missing input" };
  let hasError = false;

  for (const a of actions) {
    if (a.action === "add_application") {
      const status = validStatus(a.status) || "interested";
      const row = {
        user_id: user.id,
        company: sanitizeCompany(a.company),
        role_title: a.role_title,
        status,
        source: 'chat_agent',
        ...(a.url && { url: a.url }),
        ...(a.location && { location: a.location }),
        ...(a.notes && { notes: a.notes }),
        ...(a.job_description && { job_description: stripHtml(a.job_description) || a.job_description }),
        ...(status === "applied" && { applied_date: new Date().toISOString() }),
      };
      const { data: inserted, error } = await supabase.from("applications").insert(row).select("id").single();
      if (error) { console.error("add_application error:", error); hasError = true; continue; }
      if (inserted?.id && a.job_description) {
        const cleanedJd = stripHtml(a.job_description) || a.job_description;
        scoreApplication(supabase, queryClient, inserted.id, cleanedJd, user.id);
      }
    } else if (a.action === "update_application") {
      const patch = {};
      const newStatus = validStatus(a.new_status);
      const newTrack = validTrack(a.new_track);
      const newStage = validInterviewStage(a.new_interview_stage);
      if (newStatus) patch.status = newStatus;
      if (newStage) patch.interview_stage = newStage;
      if (newTrack) patch.track = newTrack;
      if (a.new_notes && typeof a.new_notes === "string") patch.notes = a.new_notes;
      if (Object.keys(patch).length === 0) continue;

      const { data: matches, error: lookupErr } = await supabase
        .from("applications")
        .select("id, applied_date")
        .eq("user_id", user.id)
        .ilike("company", a.match_company)
        .ilike("role_title", a.match_role_title);
      if (lookupErr) { console.error("update_application lookup error:", lookupErr); hasError = true; continue; }
      if (!matches || matches.length === 0) { console.error("update_application: not found", a.match_company, a.match_role_title); hasError = true; continue; }
      if (matches.length > 1) { console.error("update_application: ambiguous match"); hasError = true; continue; }
      const target = matches[0];

      if (newStatus === "applied" && !target.applied_date) {
        patch.applied_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("applications")
        .update(patch)
        .eq("id", target.id);
      if (error) { console.error("update_application error:", error); hasError = true; }
    }
  }
  if (hasError) return { error: "some applications failed", hasError: true };
  return { ok: true };
}

// ─── Company-target actions ────────────────────────────────────────────
export async function applyCompanyTargetActions({ user, actions }) {
  if (!user?.id || !Array.isArray(actions) || actions.length === 0) return { error: "missing input" };
  let hasError = false;
  let skippedDuplicate = 0;

  for (const a of actions) {
    if (a.action === "add_company_target") {
      const name = String(a.company_name || "").trim();
      if (!name) { hasError = true; continue; }
      const { data: existing, error: lookupErr } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (lookupErr) { console.error("company lookup error:", lookupErr); hasError = true; continue; }
      let companyId = existing?.id;
      if (!companyId) {
        const { data: created, error: createErr } = await supabase
          .from("companies")
          .insert({
            name,
            source: "manual",
            created_by: user.id,
            ...(a.company_domain && { domain: a.company_domain }),
            ...(a.company_sector && { sector: a.company_sector }),
          })
          .select("id")
          .single();
        if (createErr) { console.error("company insert error:", createErr); hasError = true; continue; }
        companyId = created?.id;
      }
      if (!companyId) { hasError = true; continue; }
      const { error: insertErr } = await supabase
        .from("company_targets")
        .insert({
          user_id: user.id,
          company_id: companyId,
          source: "self_added",
          status: "exploring",
          ...(a.pitched_role && { pitched_role: a.pitched_role }),
          ...(a.pitch_rationale && { pitch_rationale: a.pitch_rationale }),
          ...(Array.isArray(a.skill_gaps_this_fills) && a.skill_gaps_this_fills.length > 0 && { skill_gaps_this_fills: a.skill_gaps_this_fills }),
          ...(a.notes && { notes: a.notes }),
        });
      if (insertErr) {
        if (insertErr.code === "23505") { skippedDuplicate++; continue; }
        console.error("company_target insert error:", insertErr);
        hasError = true;
      }
    } else if (a.action === "update_company_target_status") {
      const matchCompany = String(a.match_company || "").trim();
      if (!matchCompany || !a.new_status) { hasError = true; continue; }
      const { data: matches, error: lookupErr } = await supabase
        .from("company_targets")
        .select("id, companies!inner(name)")
        .eq("user_id", user.id)
        .ilike("companies.name", matchCompany);
      if (lookupErr) { console.error("company_target lookup error:", lookupErr); hasError = true; continue; }
      if (!matches || matches.length === 0) { console.error("update_company_target_status: not found", matchCompany); hasError = true; continue; }
      if (matches.length > 1) { console.error("update_company_target_status: ambiguous match", matchCompany); hasError = true; continue; }
      const target = matches[0];
      const { error: updateErr } = await supabase
        .from("company_targets")
        .update({ status: a.new_status })
        .eq("id", target.id);
      if (updateErr) { console.error("company_target update error:", updateErr); hasError = true; continue; }
      if (a.note && a.note.trim()) {
        const { data: latestChange } = await supabase
          .from("company_target_status_changes")
          .select("id")
          .eq("target_id", target.id)
          .order("changed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestChange?.id) {
          await supabase
            .from("company_target_status_changes")
            .update({ note: a.note.trim() })
            .eq("id", latestChange.id);
        }
      }
    } else if (a.action === "enrich_company") {
      const matchCompany = String(a.match_company || "").trim();
      if (!matchCompany) { hasError = true; continue; }
      const patch = {};
      if (a.description) patch.description = a.description;
      if (a.sector) patch.sector = a.sector;
      if (a.domain) patch.domain = a.domain;
      if (a.industry) patch.industry = a.industry;
      if (Object.keys(patch).length === 0) continue;
      const { error: updateErr } = await supabase
        .from("companies")
        .update(patch)
        .ilike("name", matchCompany)
        .eq("source", "manual");
      if (updateErr) { console.error("enrich_company error:", updateErr); hasError = true; }
    }
  }
  if (hasError) return { error: "some internship updates failed", hasError: true, skippedDuplicate };
  return { ok: true, skippedDuplicate };
}

// ─── Profile writes: add-story + add-skill ─────────────────────────────
// The two ADD-ONLY profile-write capabilities (v1: adds, leaf-fields,
// recoverable — no edits/deletes). Centralized here so EVERY agent
// surface (full-page ChatInterface + the dock CoachThread) calls the
// same insert/update path. story-capture used to live inline in
// ChatInterface and never reached the dock — that seam is what this
// module closes. Both fail LOUDLY (return { error }) like the 5 above;
// the caller toasts. Nothing persists without the user confirming the
// card.

// Story extract — invokes the same extract-story-from-text edge function
// the StorySaveCard's two-stage flow calls. Returns the raw
// { story, extraction_notes } payload (or null) to match the card's
// onExtract contract; the card renders its own extract-failed state.
export async function extractStoryFromText({ text }) {
  try {
    const { data, error } = await supabase.functions.invoke("extract-story-from-text", {
      body: { text, source: "conversation" },
    });
    if (error) {
      console.error("[coachActions] extractStoryFromText failed:", error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error("[coachActions] extractStoryFromText exception:", err);
    return null;
  }
}

// Story save — writes the user-confirmed STAR story to `stories`. Both
// FKs are nullable; experience_id was UUID-validated by the ai-chat
// parser, conversationId is surface-local (null on a brand-new chat is
// fine — store without the back-link rather than block the save).
export async function saveStory({ user, story, capture, conversationId = null }) {
  if (!user?.id) return { error: "missing user" };
  if (!story?.title?.trim()) return { error: "story title required" };
  try {
    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      source: "conversation",
      experience_id: capture?.experience_id || null,
      conversation_id: conversationId || null,
      title: story.title,
      situation: story.situation || null,
      task: story.task || null,
      action: story.action || null,
      result: story.result || null,
      metrics: Array.isArray(story.metrics) ? story.metrics : [],
      skills_demonstrated: Array.isArray(story.skills_demonstrated) ? story.skills_demonstrated : [],
      tools_used: Array.isArray(story.tools_used) ? story.tools_used : [],
      relevance_tags: Array.isArray(story.relevance_tags) ? story.relevance_tags : [],
    });
    if (error) {
      console.error("[coachActions] saveStory failed:", error);
      return { error: error.message || "Could not save story." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[coachActions] saveStory exception:", err);
    return { error: err?.message || "Could not save story." };
  }
}

// ── Bullets (Story Bank -> experiences / education) ────────────────────────
// Bullets live on an experience OR an education entry. targetType selects the
// table; the read / append / snapshot / restore logic is otherwise identical.
const bulletsTable = (targetType) =>
  targetType === "education" ? "education" : "experiences";

// Bullet extract — the bullet-writer sibling of extractStoryFromText. Invokes
// extract-bullets (anti-fab gated; target_type + target_id REQUIRED) and
// returns { bullets, skills, extraction_notes } | null for the confirm card.
export async function extractBullets({ text, targetType, targetId }) {
  if (!targetType || !targetId) return null;
  try {
    const { data, error } = await supabase.functions.invoke("extract-bullets", {
      body: { text, target_type: targetType, target_id: targetId },
    });
    if (error) {
      console.error("[coachActions] extractBullets failed:", error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error("[coachActions] extractBullets exception:", err);
    return null;
  }
}

const dedupeAppend = (existing, incoming) => {
  const out = [...existing];
  const seen = new Set(existing.map((x) => String(x).trim().toLowerCase()));
  for (const raw of incoming) {
    const v = String(raw || "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
};

// Append user-confirmed bullets to an experience or education entry. Reads the
// current arrays so it can (a) snapshot the PRIOR bullets/skills for undo and
// (b) near-dedupe-append (see bulletDedup): clean bullets are appended, but a
// bullet that PARAPHRASES an existing one is NOT silently added, it is returned
// in `flagged` so the UI can ask add-anyway / replace / skip. Exact dupes are a
// silent no-op. `force: true` bypasses the check (the "add anyway" path). A NULL
// skills column (education.skills is nullable) coalesces to [] before the merge.
// Returns { ok, appended, flagged, snapshot } | { error }.
export async function appendBullets({ user, targetType, targetId, bullets, skills = [], force = false }) {
  if (!user?.id) return { error: "missing user" };
  if (!targetType || !targetId) return { error: "target required" };
  const table = bulletsTable(targetType);
  const incoming = (Array.isArray(bullets) ? bullets : [])
    .map((b) => String(b || "").trim())
    .filter(Boolean);
  if (incoming.length === 0) return { error: "no bullets to add" };
  try {
    const { data: row, error: readErr } = await (/** @type {any} */ (supabase))
      .from(table)
      .select("bullets, skills")
      .eq("id", targetId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readErr || !row) return { error: "entry not found" };
    const prevBullets = Array.isArray(row.bullets) ? row.bullets : [];
    const prevSkills = Array.isArray(row.skills) ? row.skills : []; // NULL -> []
    const { append, flagged } = force
      ? { append: incoming, flagged: [] }
      : classifyBullets(prevBullets, incoming);
    const mergedBullets = [...prevBullets, ...append];
    const mergedSkills = dedupeAppend(prevSkills, Array.isArray(skills) ? skills : []);
    // Nothing clean to add and skills unchanged: don't write, just hand the flags
    // back so the UI can prompt (caller re-invokes with force per user choice).
    const skillsUnchanged = mergedSkills.length === prevSkills.length;
    if (append.length === 0 && skillsUnchanged) {
      return { ok: true, appended: 0, flagged, snapshot: { bullets: prevBullets, skills: prevSkills } };
    }
    const { error } = await (/** @type {any} */ (supabase))
      .from(table)
      .update({ bullets: mergedBullets, skills: mergedSkills })
      .eq("id", targetId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[coachActions] appendBullets failed:", error);
      return { error: error.message || "Could not add bullets." };
    }
    return { ok: true, appended: append.length, flagged, snapshot: { bullets: prevBullets, skills: prevSkills } };
  } catch (err) {
    console.error("[coachActions] appendBullets exception:", err);
    return { error: err?.message || "Could not add bullets." };
  }
}

// Replace an entry's bullets (+ optionally skills) with the given arrays — the
// Profile editor owns the full draft. Returns { ok } | { error }.
export async function setBullets({ user, targetType, targetId, bullets, skills }) {
  if (!user?.id) return { error: "missing user" };
  if (!targetType || !targetId) return { error: "target required" };
  try {
    const patch = {
      bullets: (Array.isArray(bullets) ? bullets : [])
        .map((b) => String(b || "").trim())
        .filter(Boolean),
    };
    if (Array.isArray(skills)) patch.skills = skills;
    const { error } = await (/** @type {any} */ (supabase))
      .from(bulletsTable(targetType))
      .update(patch)
      .eq("id", targetId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[coachActions] setBullets failed:", error);
      return { error: error.message || "Could not save bullets." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[coachActions] setBullets exception:", err);
    return { error: err?.message || "Could not save bullets." };
  }
}

// Undo — restore a prior bullets/skills snapshot from appendBullets.
export async function restoreBullets({ user, targetType, targetId, snapshot }) {
  return setBullets({
    user,
    targetType,
    targetId,
    bullets: snapshot?.bullets || [],
    skills: snapshot?.skills,
  });
}


// Add-skill — appends ONE user-stated skill to a SPECIFIC experience's
// `experiences.skills` array. That column is the P1.3 read column the
// next generate-career-analysis run scores against (sanitised inputs +
// the deterministic match corpus + the LLM CANDIDATE_SKILLS prompt) —
// so the add lands exactly where the next analysis will see it. We do
// NOT re-run analysis here (too expensive per-edit); the next natural
// run picks it up.
//
// The experience must belong to the user (verified by the id + user_id
// fetch — RLS-aware AND an explicit ownership guard). v1 only supports
// skill+experience pairs: a skill without a resolvable experience never
// reaches this handler (the agent is told to ask which experience).
// Idempotent: a case-insensitive dupe is a no-op success, not a second
// array entry.
export async function applyAddSkillToExperience({ user, queryClient, skill, experienceId }) {
  if (!user?.id) return { error: "missing user" };
  const clean = typeof skill === "string" ? skill.trim() : "";
  if (!clean) return { error: "missing skill" };
  if (!experienceId) return { error: "missing experience" };
  try {
    const { data: exp, error: lookupErr } = await supabase
      .from("experiences")
      .select("id, title, company, skills")
      .eq("id", experienceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupErr) {
      console.error("[coachActions] addSkill lookup failed:", lookupErr);
      return { error: lookupErr.message || "Could not look up that experience." };
    }
    if (!exp) return { error: "That experience wasn't found on your profile." };

    const label = `${exp.title || "(untitled)"}${exp.company ? ` at ${exp.company}` : ""}`;
    const current = Array.isArray(exp.skills) ? exp.skills : [];
    if (current.some((s) => typeof s === "string" && s.toLowerCase() === clean.toLowerCase())) {
      return { ok: true, alreadyPresent: true, experienceLabel: label, skill: clean };
    }
    const { error: updateErr } = await supabase
      .from("experiences")
      .update({ skills: [...current, clean] })
      .eq("id", experienceId)
      .eq("user_id", user.id);
    if (updateErr) {
      console.error("[coachActions] addSkill update failed:", updateErr);
      return { error: updateErr.message || "Could not add the skill." };
    }
    // The DB write lands, but Profile reads experiences from the shared
    // ["experiences", uid] TanStack cache — without this invalidation the
    // new skill never shows until a hard reload (2026-06-16 add-skill bug).
    queryClient?.invalidateQueries({ queryKey: experiencesQueryKey(user.id) });
    return { ok: true, experienceLabel: label, skill: clean };
  } catch (err) {
    console.error("[coachActions] applyAddSkillToExperience exception:", err);
    return { error: err?.message || "Could not add the skill." };
  }
}

// ─── CV generation ─────────────────────────────────────────────────────
// Invokes generate-tailored-cv and persists the result alongside the
// original suggested_cv_generation payload so a reload shows the
// download link + fit analysis. The story-capture follow-up turn from
// ChatInterface is intentionally NOT included here — it requires
// surface-local conversation state (last user message, history slice,
// agentName) that's cleaner to manage at the caller. ChatInterface's
// own handler wraps this and chains the follow-up; the
// CoachConversationProvider does the same with its provider state.
export async function generateTailoredCV({ queryClient, proposal, messageId }) {
  if (!proposal?.target_role) return { error: "missing target_role" };
  const startedAt = performance.now();
  try {
    const { data, error } = await invokeWithAuthRetry("generate-tailored-cv", {
      body: {
        target_role: proposal.target_role,
        application_id: proposal.application_id || null,
        job_description: proposal.job_description ? (stripHtml(proposal.job_description) || proposal.job_description) : null,
        cv_model: "sonnet",
      },
    });
    if (error) throw error;
    if (!data?.cv_url) throw new Error(data?.error || "CV generation did not return a download link.");

    // Value moment: a downloadable tailored CV is back.
    track(EVENTS.CV_GENERATED, {
      success: true,
      source: "chat",
      model: data?.model || "sonnet",
      application_id: data?.application_id || proposal.application_id || null,
      role_title: proposal.target_role,
      duration_ms: Math.round(performance.now() - startedAt),
      unsourced_bullets_count: Array.isArray(data?.unsourced_bullets)
        ? data.unsourced_bullets.length
        : 0,
    });

    const result = {
      status: "done",
      cv_url: data.cv_url,
      fit_analysis: data.fit_analysis,
      application_id: data.application_id || null,
      tailoring: data.tailoring || null,
      unsourced_bullets: Array.isArray(data.unsourced_bullets) ? data.unsourced_bullets : [],
    };

    // Persist result alongside the original proposal so a refresh of
    // the conversation still shows the download link.
    if (messageId) {
      const merged = {
        ...proposal,
        result: {
          cv_url: data.cv_url,
          fit_analysis: data.fit_analysis,
          application_id: data.application_id,
          tailoring: data.tailoring || null,
          unsourced_bullets: result.unsourced_bullets,
        },
      };
      await supabase.from("chat_messages")
        .update({ suggested_cv_generation: merged })
        .eq("id", messageId);
    }

    if (queryClient) queryClient.invalidateQueries({ queryKey: ["applications"] });

    return { ok: true, result };
  } catch (err) {
    track(EVENTS.CV_GENERATED, {
      success: false,
      source: "chat",
      model: "sonnet",
      application_id: proposal.application_id || null,
      role_title: proposal.target_role,
      duration_ms: Math.round(performance.now() - startedAt),
      failure_reason: err?.message || "unknown",
    });
    console.error("[coachActions] generateTailoredCV failed:", err);
    return { error: err?.message || "Could not generate CV." };
  }
}
