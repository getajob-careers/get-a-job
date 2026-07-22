// inferPrimaryDomainWrite — Onboarding V2 direction-screen glue that turns a
// goal-role pick into a persisted primary_domain, honoring the precedence
// invariant. Thin on purpose: the domain mapping lives in the shared,
// server-verifiable module (@shared/infer-primary-domain); this file only
// resolves the picked role's family, applies the CV-first guard, runs the
// enforceable write, and returns a record for the audit event.
//
// PRECEDENCE INVARIANT (why two guards, not one):
//   1. CLIENT guard — inference is a FALLBACK for the CV-less / no-domain user.
//      If extraction already produced a domain (held in shell state here, since
//      V2 persistence is deferred to the review screen), we do NOT infer at all.
//   2. SERVER guard — the UPDATE filters `primary_domain IS NULL OR
//      primary_domain_source = 'inferred'`, so even if the client guard is
//      bypassed or a stale/racy state slips through, an extracted value is
//      protected at the DB. Inference is the only writer of 'inferred', so
//      re-inference can only overwrite its own prior guess.

import { supabase } from "@/api/supabaseClient";
import { ROLE_LOOKUP } from "@/lib/roleLookup";
import { inferPrimaryDomain } from "@shared/infer-primary-domain";

// Resolve the role_family for a picked goal-role id from the client role mirror.
export function roleFamilyForId(goalRoleId) {
  if (!goalRoleId) return null;
  const role = ROLE_LOOKUP.find((r) => r.id === goalRoleId);
  return role?.role_family || null;
}

/**
 * Compute the inference record for a direction-screen state WITHOUT writing.
 * Pure and deterministic — this is what the unit test exercises.
 *
 * @param {object} p
 * @param {string|null} [p.goalRoleId]        five_year_goal_role_id
 * @param {string|null} [p.situation]         employment-status picker (audit only)
 * @param {string|null} [p.extractedDomain]   primary_domain from CV extraction, if any
 * @returns {{ shouldWrite: boolean, skippedReason: string|null, record: object }}
 */
export function computeInference({
  goalRoleId = null,
  situation = null,
  situations = null,
  extractedDomain = null,
}) {
  // Client guard: extraction wins. If a CV already yielded a domain, inference
  // is not our job — leave it untouched and record why.
  if (extractedDomain) {
    return {
      shouldWrite: false,
      skippedReason: "extracted_domain_present",
      record: null,
    };
  }

  const goalRoleFamily = roleFamilyForId(goalRoleId);
  // No goal role picked → nothing to infer from. Not an error; the user simply
  // skipped the goal picker.
  if (!goalRoleFamily && !goalRoleId) {
    return { shouldWrite: false, skippedReason: "no_goal_role", record: null };
  }

  const record = inferPrimaryDomain({
    goalRoleFamily,
    situation,
    situations,
    goalRoleId,
  });

  // A mapped family produced a domain → write it. An unmapped family
  // (record.primary_domain === null) is still recorded for the audit, but there
  // is nothing to persist.
  return {
    shouldWrite: record.primary_domain != null,
    skippedReason: record.primary_domain == null ? "unmapped_family" : null,
    record,
  };
}

/**
 * Run inference for the direction screen and, when appropriate, persist the
 * inferred primary_domain under the precedence invariant. Never throws for the
 * caller's flow — a write failure is logged and returned, not surfaced as an
 * onboarding blocker (the domain is a soft gate; a null domain degrades the
 * feed, it does not break onboarding).
 *
 * @returns {Promise<{ applied: boolean, skippedReason: string|null, record: object|null, error: any }>}
 *   `applied` is true only when a row was actually updated (i.e. the server
 *   guard admitted the write). The full inference `record` is returned so the
 *   caller fires exactly one audit event per picker combination.
 */
export async function runPrimaryDomainInference({
  userId,
  goalRoleId,
  situation,
  situations,
  extractedDomain,
}) {
  const { shouldWrite, skippedReason, record } = computeInference({
    goalRoleId,
    situation,
    situations,
    extractedDomain,
  });

  if (!shouldWrite) {
    return { applied: false, skippedReason, record, error: null };
  }

  try {
    // Enforceable precedence guard lives in the WHERE clause: only NULL or a
    // previously-inferred value is writable. .select() lets us see whether a
    // row was actually admitted (an extracted value yields zero rows).
    const { data, error } = await supabase
      .from("profiles")
      .update({
        primary_domain: record.primary_domain,
        primary_domain_source: "inferred",
      })
      .eq("id", userId)
      .or("primary_domain.is.null,primary_domain_source.eq.inferred")
      .select("id");

    if (error) {
      console.warn("[inferPrimaryDomainWrite] update failed:", error.message);
      return { applied: false, skippedReason: null, record, error };
    }
    return {
      applied: Array.isArray(data) && data.length > 0,
      skippedReason:
        Array.isArray(data) && data.length === 0 ? "protected_by_guard" : null,
      record,
      error: null,
    };
  } catch (err) {
    console.warn("[inferPrimaryDomainWrite] update threw:", err);
    return { applied: false, skippedReason: null, record, error: err };
  }
}
