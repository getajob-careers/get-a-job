// Shared target-anchor primitives used by the internship-flow LLM
// callers: generate-internship-profile (builds pitchable_role_archetypes),
// match-internship-companies (picks per-company pitched_role), and
// generate-career-analysis (locks profiles.primary_domain post-PR #175).
//
// The core idea: the steering signal for "which role should we pitch"
// is career_roles.goal_alignment_score restricted to Track-1, ranked
// high → low. profiles.primary_domain + profiles.five_year_role are
// CONTEXT for what alignment is measured against, not a hard domain
// filter. This generalises across users: a marketing student whose
// Track-1 has Marketing Manager 0.9 / Growth 0.85 gets the same
// treatment as a product student with Product Ops Manager 0.9 / APM
// 0.7 — the algorithm is identical, the targets differ.
//
// What PR #175 owns:
//   - five_year_role → role library → role_family → primary_domain
//     resolution (resolveGoalRoleId + transfer-path scoring). That
//     logic stays inside generate-career-analysis because it depends
//     on the role library + tokenizer + seniority cap state.
//   - The two canonical maps below: PRIMARY_DOMAIN_TO_ROLE_ID and
//     FAMILY_TO_PRIMARY_DOMAIN. Extracted here so the matcher + the
//     internship-profile generator can use them as fallbacks without
//     reimplementing the table. generate-career-analysis imports them
//     from this file (refactor: was local).

// ============================================================
// Canonical anchor role per primary_domain. Used as a fallback target
// when the user's stated five_year_role can't be resolved to a library
// role (typos, freeform titles). The matcher uses this to know "for a
// 'product_management' user, the canonical anchor is product_manager,"
// even when their typed goal is missing or non-library.
// ============================================================

export const PRIMARY_DOMAIN_TO_ROLE_ID: Record<string, string> = {
  customer_success: "customer_success_manager",
  product: "product_manager",
  product_management: "product_manager",
  sales: "account_executive",
  marketing: "marketing_manager",
  operations: "business_analyst",
  data: "data_analyst",
  analytics: "data_analyst",
  finance: "financial_analyst",
  hr: "hr_business_partner",
  people: "hr_business_partner",
  engineering: "software_engineer",
  design: "product_designer_ux_ui",
  support: "customer_support_specialist",
};

// ============================================================
// Reverse direction: role_family → primary_domain. Used by
// generate-career-analysis to update profiles.primary_domain when
// the user's stated five_year_role resolves to a library role.
// Extract-proof-signals (CV upload step) can't see the stated goal,
// so it locks users into their CURRENT-job domain; this map lets
// career-analysis correct that mid-flight.
// ============================================================

export const FAMILY_TO_PRIMARY_DOMAIN: Record<string, string> = {
  Support: "customer_success",
  Onboarding_Implementation: "customer_success",
  Customer_Experience: "customer_success",
  Relationship_Growth: "customer_success",
  Sales: "sales",
  BD_Partnerships: "sales",
  Marketing: "marketing",
  Product: "product_management",
  Engineering: "engineering",
  Solutions_Engineering: "engineering",
  IT_Security: "engineering",
  Design_UX: "design",
  Data: "data",
  AI_ML: "data",
  Operations: "operations",
  RevOps_BizOps: "operations",
  Finance: "finance",
  HR_People: "hr",
  Admin_GA: "hr",
};

// ============================================================
// Target-context builder. Reads a profile row + career_roles rows;
// returns the structured "what is this user pointing toward" block
// that the internship-profile generator + the matcher LLM both
// consume.
//
// Shape:
//   {
//     five_year_role,      // CONTEXT — the user's typed long-term goal
//     primary_domain,      // CONTEXT — domain resolved from the goal
//     anchor_role_title,   // CONTEXT — canonical role-library anchor
//                          //   for that domain (fallback target when
//                          //   goal_aligned_targets is empty)
//     goal_aligned_targets // STEERING — Track-1 roles, alignment-DESC
//   }
//
// The matcher prompt treats goal_aligned_targets as the steering
// signal: pick the bridge role toward the highest-alignment target
// reachable at the company. Lower-alignment Track-1 roles are valid
// bridges only when a higher-alignment one is unreachable. The other
// two fields exist to let the LLM understand "alignment toward what."
// ============================================================

export interface GoalAlignedTarget {
  title: string;
  alignment: number; // 0-1
}

export interface TargetContext {
  five_year_role: string | null;
  primary_domain: string | null;
  anchor_role_title: string | null;
  goal_aligned_targets: GoalAlignedTarget[];
}

interface CareerRoleLike {
  title: string | null | undefined;
  track: string | null | undefined;
  goal_alignment_score: number | string | null | undefined;
}

interface ProfileLike {
  five_year_role?: string | null;
  primary_domain?: string | null;
}

export function buildTargetContext(
  profile: ProfileLike | null,
  careerRoles: CareerRoleLike[],
  limit = 6,
): TargetContext {
  const five_year_role = profile?.five_year_role?.trim() || null;
  const primary_domain = profile?.primary_domain?.trim() || null;

  const anchor_role_title = primary_domain
    ? PRIMARY_DOMAIN_TO_ROLE_ID[primary_domain.toLowerCase()] || null
    : null;

  // Track-1 only, alignment-DESC. Drop rows with no title or no
  // numeric alignment — we only steer on signal we can rank.
  const goal_aligned_targets: GoalAlignedTarget[] = (careerRoles || [])
    .filter((r) => (r?.track || "").toLowerCase() === "track_1")
    .map((r) => {
      const title = (r?.title || "").trim();
      const align = Number(r?.goal_alignment_score);
      if (!title || !Number.isFinite(align)) return null;
      return { title, alignment: align } as GoalAlignedTarget;
    })
    .filter((x): x is GoalAlignedTarget => x !== null)
    .sort((a, b) => b.alignment - a.alignment)
    .slice(0, limit);

  return {
    five_year_role,
    primary_domain,
    anchor_role_title,
    goal_aligned_targets,
  };
}
