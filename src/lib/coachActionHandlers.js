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
import { resolveDueDate } from "@/lib/taskDueDate";
import { scoreApplication } from "@/lib/scoreApplication";
import { stripHtml } from "../../scripts/lib/normalize.ts";
import {
  validTrack,
  validStatus,
  validInterviewStage,
  validateMatchedSkills,
  sanitizeMissingSkills,
  clampScore,
  sanitizeText,
  sanitizeActionItems,
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
        company: a.company,
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
    console.error("[coachActions] generateTailoredCV failed:", err);
    return { error: err?.message || "Could not generate CV." };
  }
}
