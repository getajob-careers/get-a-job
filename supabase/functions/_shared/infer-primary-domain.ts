// infer-primary-domain.ts — derive a user's `primary_domain` from onboarding
// pickers when there is no CV to extract it from.
//
// WHY: `primary_domain` is populated ONLY by CV extraction (extract-proof-signals),
// yet it gates the jobs feed (scoreJobFit domain gate). A skip/CV-less user is
// left with a null domain and a gutted feed. This infers it from the goal-role
// pickers instead, writing the SAME field the extraction path writes
// (profiles.primary_domain) with values from the SAME taxonomy (DOMAIN_TO_FAMILIES).
//
// GROUNDING: the map below is the inverse of the canonical DOMAIN_TO_FAMILIES
// (track-scoring-constants.ts) — every value here is a real primary_domain key
// (asserted in the unit test), so an inferred domain is byte-compatible with the
// extracted one downstream.
//
// SERVER-VERIFIABLE: pure, deterministic, no I/O — runs identically in Deno
// (edge) and the browser (via the @shared alias). The caller persists the result
// to profiles.primary_domain and can be audited against the corpus later.
//
// INSTRUMENTED: inferPrimaryDomain returns the full inference record (inputs +
// output + source + confidence) so the caller emits ONE event per picker
// combination — enabling a later corpus audit of inference quality.

import { DOMAIN_TO_FAMILIES } from "./track-scoring-constants.ts";

// Canonical role_family -> primary_domain. Each family maps to the domain where
// it is the PRIMARY (first-listed) family in DOMAIN_TO_FAMILIES, plus sensible
// nearest-domain mappings for the library families that sit outside the domain
// taxonomy (AI_ML, Consulting, etc.). Families with no honest domain home
// (Leadership, Legal_Compliance) are intentionally absent -> inference returns
// null and the caller leaves primary_domain unset rather than guessing.
export const FAMILY_TO_DOMAIN: Record<string, string> = {
  // in DOMAIN_TO_FAMILIES verbatim
  Relationship_Growth: "customer_success",
  Onboarding_Implementation: "customer_success",
  Customer_Experience: "customer_experience",
  Support: "support",
  Product: "product",
  Sales: "sales",
  BD_Partnerships: "sales",
  Marketing: "marketing",
  Operations: "operations",
  RevOps_BizOps: "operations",
  Data: "data",
  Finance: "finance",
  HR_People: "hr",
  Admin_GA: "hr",
  Engineering: "engineering",
  Solutions_Engineering: "engineering",
  IT_Security: "cybersecurity",
  Design_UX: "design",
  // nearest-domain for library families outside the domain map
  AI_ML: "data",
  Manufacturing_Operations: "operations",
  Consulting: "operations",
  Research_Science: "data",
  // Leadership + Legal_Compliance: no honest single-domain home -> omitted.
};

export interface InferPrimaryDomainInputs {
  // role_family of the user's chosen 5-year goal role (from the role library).
  goalRoleFamily?: string | null;
  // optional secondary_family fallback when the primary family is unmapped.
  goalRoleSecondaryFamily?: string | null;
  // employment-status picker (student / have_job / looking / unemployed /
  // freelancing). Not a domain signal — carried through for the audit log only.
  // `situation` is the single priority-derived value (back-compat); `situations`
  // is the full multi-select array (V2 situation row is multi with XOR rules).
  situation?: string | null;
  situations?: string[] | null;
  // optional: the goal role id, for the audit trail.
  goalRoleId?: string | null;
}

export interface InferPrimaryDomainResult {
  primary_domain: string | null;
  source: "goal_family" | "goal_secondary_family" | "unmapped";
  confidence: "high" | "medium" | "none";
  inputs: InferPrimaryDomainInputs;
}

export function inferPrimaryDomain(
  inputs: InferPrimaryDomainInputs,
): InferPrimaryDomainResult {
  const fam = (inputs.goalRoleFamily ?? "").trim();
  const sec = (inputs.goalRoleSecondaryFamily ?? "").trim();

  if (fam && FAMILY_TO_DOMAIN[fam]) {
    return { primary_domain: FAMILY_TO_DOMAIN[fam], source: "goal_family", confidence: "high", inputs };
  }
  if (sec && FAMILY_TO_DOMAIN[sec]) {
    return { primary_domain: FAMILY_TO_DOMAIN[sec], source: "goal_secondary_family", confidence: "medium", inputs };
  }
  return { primary_domain: null, source: "unmapped", confidence: "none", inputs };
}

// Guard used by the unit test: every mapped domain must be a real primary_domain
// key in the canonical taxonomy, so inferred values are downstream-identical to
// extracted ones.
export function invalidMappedDomains(): string[] {
  const valid = new Set(Object.keys(DOMAIN_TO_FAMILIES));
  return [...new Set(Object.values(FAMILY_TO_DOMAIN))].filter((d) => !valid.has(d));
}
