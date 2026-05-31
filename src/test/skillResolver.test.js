import { describe, it, expect } from "vitest";
import { resolveSkill, resolveSkillList } from "../lib/skillResolver";

describe("resolveSkill", () => {
  it("returns canonical IDs for direct alias hits", () => {
    // Spot-check labels from the curated chip bank — these are the highest-
    // signal cases the alias map was built to cover.
    expect(resolveSkill("Python").length).toBeGreaterThan(0);
    expect(resolveSkill("Figma")).toContain("figma_mastery");
  });

  it("normalizes case + whitespace before lookup", () => {
    const a = resolveSkill("PYTHON");
    const b = resolveSkill("python");
    const c = resolveSkill("  Python  ");
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("strips parenthetical qualifiers on the second pass", () => {
    // "Figma (basic)" → strip "(basic)" → look up "figma"
    const stripped = resolveSkill("Figma (basic)");
    const direct = resolveSkill("Figma");
    expect(stripped).toEqual(direct);
  });

  it("handles snake_case input by converting to space-form first", () => {
    // Some surfaces (e.g. older LLM extractions) emit "product_management"
    // — should resolve via the space-form alias if present.
    const snake = resolveSkill("product_management");
    expect(snake.length).toBeGreaterThan(0);
  });

  it("returns [] for unknown labels", () => {
    expect(resolveSkill("totally fake skill name xyzqq")).toEqual([]);
  });

  it("returns [] for non-string or empty input", () => {
    expect(resolveSkill(null)).toEqual([]);
    expect(resolveSkill(undefined)).toEqual([]);
    expect(resolveSkill("")).toEqual([]);
    expect(resolveSkill(42)).toEqual([]);
  });
});

describe("resolveSkillList", () => {
  it("dedupes canonical IDs + records unmapped phrases", () => {
    const { canonical, unmapped } = resolveSkillList([
      "Python",
      "python",        // dup — should collapse
      "Figma",
      "Custom Internal Tool",  // unmapped
    ]);
    // canonical contains python_* + figma_mastery at least, deduped
    expect(canonical).toContain("figma_mastery");
    const pythonHits = canonical.filter((id) => id.startsWith("python"));
    expect(pythonHits.length).toBeGreaterThan(0);
    expect(unmapped).toEqual(["custom internal tool"]);
  });

  it("returns empty arrays for empty/null input", () => {
    expect(resolveSkillList([])).toEqual({ canonical: [], unmapped: [] });
    expect(resolveSkillList(null)).toEqual({ canonical: [], unmapped: [] });
    expect(resolveSkillList(undefined)).toEqual({ canonical: [], unmapped: [] });
  });

  it("dedupes unmapped phrases case-insensitively", () => {
    const { unmapped } = resolveSkillList([
      "Made-Up Skill",
      "made-up skill",  // dup of above
      "Another Fake",
    ]);
    expect(unmapped).toHaveLength(2);
    expect(unmapped).toContain("made-up skill");
    expect(unmapped).toContain("another fake");
  });

  it("returns canonical sorted for stable equality across calls", () => {
    const a = resolveSkillList(["Python", "Figma"]);
    const b = resolveSkillList(["Figma", "Python"]);
    expect(a.canonical).toEqual(b.canonical);
  });
});

describe("Phase 0a alias additions (live-unmapped recovery)", () => {
  // One case per alias added in this PR. Each asserts the new key resolves
  // to the expected canonical target so the alias map can't silently drift.
  // Targets were confirmed present in skillIdsGenerated.json before adding.

  it("customer experience & retention → customer_health_management + customer_retention", () => {
    expect(resolveSkill("customer experience & retention")).toEqual(
      expect.arrayContaining(["customer_health_management", "customer_retention"]),
    );
    expect(resolveSkill("customer experience and retention")).toEqual(
      expect.arrayContaining(["customer_health_management", "customer_retention"]),
    );
  });

  it("user-facing operations → customer_support_operations", () => {
    expect(resolveSkill("user-facing operations")).toContain("customer_support_operations");
    expect(resolveSkill("user facing operations")).toContain("customer_support_operations");
  });

  it("stakeholder coordination → stakeholder_management", () => {
    expect(resolveSkill("stakeholder coordination")).toContain("stakeholder_management");
  });

  it("program & project execution → program_management + project_management", () => {
    expect(resolveSkill("program & project execution")).toEqual(
      expect.arrayContaining(["program_management", "project_management"]),
    );
    expect(resolveSkill("program and project execution")).toEqual(
      expect.arrayContaining(["program_management", "project_management"]),
    );
  });

  it("leadership & team management → leadership", () => {
    expect(resolveSkill("leadership & team management")).toContain("leadership");
    expect(resolveSkill("leadership and team management")).toContain("leadership");
  });

  // NOTE: PR #199 originally aliased this to onboarding_training. The
  // Phase 0a-followup audit found onboarding_strategy ("Customer
  // Onboarding Strategy") is the more-specific correct canonical;
  // alignment fixed in this PR. The realigned test lives in the
  // "Phase 0a-followup: customer-onboarding alignment fix" block.
  it("customer onboarding strategy → onboarding_strategy (post-realignment)", () => {
    expect(resolveSkill("customer onboarding strategy")).toContain("onboarding_strategy");
  });

  it("customer relations + common typo → customer_relationship_management", () => {
    expect(resolveSkill("customer relations")).toContain("customer_relationship_management");
    expect(resolveSkill("customer relationship managment")).toContain("customer_relationship_management");
  });

  it("team collaboration → cross_functional_collaboration", () => {
    expect(resolveSkill("team collaboration")).toContain("cross_functional_collaboration");
  });

  it("excel pivot tables + pivot tables → excel_advanced_finance", () => {
    expect(resolveSkill("excel pivot tables")).toContain("excel_advanced_finance");
    expect(resolveSkill("pivot tables")).toContain("excel_advanced_finance");
  });

  it("basic statistical data analysis → statistical_analysis", () => {
    expect(resolveSkill("basic statistical data analysis")).toContain("statistical_analysis");
  });

  it("intentionally-unmapped traits remain unresolved", () => {
    // Per Phase 0a decision: traits aren't skills. Leave them in
    // skills_unmapped rather than forcing a bad canonical mapping.
    expect(resolveSkill("team player")).toEqual([]);
    expect(resolveSkill("continuous learner")).toEqual([]);
  });

  it("modern AI tooling labels → existing canonicals", () => {
    expect(resolveSkill("agentic ai systems")).toContain("agentic_systems");
    expect(resolveSkill("claude / claude code")).toContain("claude_assistant");
    expect(resolveSkill("claude")).toContain("claude_assistant");
    expect(resolveSkill("no-code / low-code ai automation")).toContain("no_code_ai_automation");
  });

  it("operational logistics → logistics_practice", () => {
    expect(resolveSkill("operational logistics")).toContain("logistics_practice");
  });
});

describe("Phase 0a-followup: customer-onboarding alignment fix", () => {
  it("customer onboarding strategy → onboarding_strategy (was onboarding_training in PR #199)", () => {
    // The more-specific canonical "Customer Onboarding Strategy" is the
    // correct target. Both customer-onboarding phrasings should align
    // on it rather than fragmenting across canonicals.
    expect(resolveSkill("customer onboarding strategy")).toContain("onboarding_strategy");
  });
  it("customer onboarding → onboarding_strategy (paired with the strategy phrasing)", () => {
    expect(resolveSkill("customer onboarding")).toContain("onboarding_strategy");
  });
});

describe("Phase 0a-followup: role-coverage alias expansion (72 entries)", () => {
  // Sales / SDR / AE
  it("lead gen + lead generation + pipeline generation → demand_generation", () => {
    expect(resolveSkill("lead gen")).toContain("demand_generation");
    expect(resolveSkill("lead generation")).toContain("demand_generation");
    expect(resolveSkill("pipeline generation")).toContain("demand_generation");
  });
  it("cold outreach + cold calling → cold_calling", () => {
    expect(resolveSkill("cold outreach")).toContain("cold_calling");
    expect(resolveSkill("cold calling")).toContain("cold_calling");
  });
  it("cold email → sales_engagement_tools (activity→tooling, flagged for review)", () => {
    expect(resolveSkill("cold email")).toContain("sales_engagement_tools");
  });
  it("pipeline management → pipeline_management", () => {
    expect(resolveSkill("pipeline management")).toContain("pipeline_management");
  });
  it("quota + quota attainment → quota_attainment", () => {
    expect(resolveSkill("quota")).toContain("quota_attainment");
    expect(resolveSkill("quota attainment")).toContain("quota_attainment");
  });
  it("prospecting + outbound prospecting → outbound_prospecting", () => {
    expect(resolveSkill("prospecting")).toContain("outbound_prospecting");
    expect(resolveSkill("outbound prospecting")).toContain("outbound_prospecting");
  });
  it("discovery calls → discovery_calls", () => {
    expect(resolveSkill("discovery calls")).toContain("discovery_calls");
  });
  it("objection handling → objection_handling", () => {
    expect(resolveSkill("objection handling")).toContain("objection_handling");
  });
  it("closing → deal_closing (kept in bucket 1 per locked decision)", () => {
    expect(resolveSkill("closing")).toContain("deal_closing");
  });
  it("negotiating → negotiation", () => {
    expect(resolveSkill("negotiating")).toContain("negotiation");
  });
  it("upselling / cross-selling family → upselling_cross_selling", () => {
    expect(resolveSkill("upselling")).toContain("upselling_cross_selling");
    expect(resolveSkill("cross-selling")).toContain("upselling_cross_selling");
    expect(resolveSkill("cross sell")).toContain("upselling_cross_selling");
    expect(resolveSkill("up sell")).toContain("upselling_cross_selling");
  });
  it("account planning → account_management", () => {
    expect(resolveSkill("account planning")).toContain("account_management");
  });

  // Sales tooling
  it("CRM admin variants → revops_crm_administration", () => {
    expect(resolveSkill("salesforce admin")).toContain("revops_crm_administration");
    expect(resolveSkill("hubspot admin")).toContain("revops_crm_administration");
    expect(resolveSkill("crm hygiene")).toContain("revops_crm_administration");
  });
  it("salesforce reporting → salesforce", () => {
    expect(resolveSkill("salesforce reporting")).toContain("salesforce");
  });

  // CS
  it("renewal management → renewal_management", () => {
    expect(resolveSkill("renewal management")).toContain("renewal_management");
  });
  it("churn reduction → customer_retention", () => {
    expect(resolveSkill("churn reduction")).toContain("customer_retention");
  });
  it("health scoring → customer_health_management", () => {
    expect(resolveSkill("health scoring")).toContain("customer_health_management");
  });
  it("customer training → bizops_enablement_training", () => {
    expect(resolveSkill("customer training")).toContain("bizops_enablement_training");
  });
  it("time to value → value_realization", () => {
    expect(resolveSkill("time to value")).toContain("value_realization");
  });

  // PM / Product
  it("okrs → bizops_okr_framework", () => {
    expect(resolveSkill("okrs")).toContain("bizops_okr_framework");
  });
  it("product discovery → product_discovery", () => {
    expect(resolveSkill("product discovery")).toContain("product_discovery");
  });
  it("product strategy → product_strategy", () => {
    expect(resolveSkill("product strategy")).toContain("product_strategy");
  });
  it("roadmap / roadmapping / prioritization → roadmap_prioritization", () => {
    expect(resolveSkill("roadmap")).toContain("roadmap_prioritization");
    expect(resolveSkill("roadmapping")).toContain("roadmap_prioritization");
    expect(resolveSkill("prioritization")).toContain("roadmap_prioritization");
  });
  it("user interviews → customer_discovery_interviews", () => {
    expect(resolveSkill("user interviews")).toContain("customer_discovery_interviews");
  });
  it("metrics design → product_metrics", () => {
    expect(resolveSkill("metrics design")).toContain("product_metrics");
  });
  it("feature specs → feature_definition", () => {
    expect(resolveSkill("feature specs")).toContain("feature_definition");
  });
  it("prd / product requirements document → prd_writing", () => {
    expect(resolveSkill("prd")).toContain("prd_writing");
    expect(resolveSkill("product requirements document")).toContain("prd_writing");
  });

  // RevOps
  // (Note: "lead scoring" alias dropped during cross-review — it's a
  // distinct downstream qualification skill, queued for the bucket-2
  // curation task as a candidate for its own canonical.)
  it("attribution → campaign_analytics_attribution", () => {
    expect(resolveSkill("attribution")).toContain("campaign_analytics_attribution");
  });
  it("funnel analysis → funnel_optimization", () => {
    expect(resolveSkill("funnel analysis")).toContain("funnel_optimization");
  });
  it("go-to-market ops + gtm ops → revops_gtm_process_design", () => {
    expect(resolveSkill("go-to-market ops")).toContain("revops_gtm_process_design");
    expect(resolveSkill("gtm ops")).toContain("revops_gtm_process_design");
  });
  it("compensation planning → compensation_design", () => {
    expect(resolveSkill("compensation planning")).toContain("compensation_design");
  });

  // Marketing / Growth
  it("seo → seo_management", () => {
    expect(resolveSkill("seo")).toContain("seo_management");
  });
  it("sem + ppc → paid_search_advertising", () => {
    expect(resolveSkill("sem")).toContain("paid_search_advertising");
    expect(resolveSkill("ppc")).toContain("paid_search_advertising");
  });
  it("paid social → paid_social_advertising", () => {
    expect(resolveSkill("paid social")).toContain("paid_social_advertising");
  });
  it("email marketing + drip campaigns → marketing_automation", () => {
    expect(resolveSkill("email marketing")).toContain("marketing_automation");
    expect(resolveSkill("drip campaigns")).toContain("marketing_automation");
  });
  it("lifecycle marketing → lifecycle_marketing", () => {
    expect(resolveSkill("lifecycle marketing")).toContain("lifecycle_marketing");
  });
  it("content marketing + content strategy → content_strategy", () => {
    expect(resolveSkill("content marketing")).toContain("content_strategy");
    expect(resolveSkill("content strategy")).toContain("content_strategy");
  });
  it("brand strategy → brand_management", () => {
    expect(resolveSkill("brand strategy")).toContain("brand_management");
  });
  it("growth experimentation → marketing_experimentation", () => {
    expect(resolveSkill("growth experimentation")).toContain("marketing_experimentation");
  });
  it("conversion rate optimization + cro → conversion_rate_optimization", () => {
    expect(resolveSkill("conversion rate optimization")).toContain("conversion_rate_optimization");
    expect(resolveSkill("cro")).toContain("conversion_rate_optimization");
  });
  it("landing pages → web_design", () => {
    expect(resolveSkill("landing pages")).toContain("web_design");
  });
  it("event marketing → event_marketing", () => {
    expect(resolveSkill("event marketing")).toContain("event_marketing");
  });

  // BD / Partnerships
  it("partnership development → partnership_development", () => {
    expect(resolveSkill("partnership development")).toContain("partnership_development");
  });
  it("channel sales + alliance management → channel_sales_strategy", () => {
    expect(resolveSkill("channel sales")).toContain("channel_sales_strategy");
    expect(resolveSkill("alliance management")).toContain("channel_sales_strategy");
  });
  it("reseller management → channel_partner_management", () => {
    expect(resolveSkill("reseller management")).toContain("channel_partner_management");
  });
  it("co-selling → joint_business_planning", () => {
    expect(resolveSkill("co-selling")).toContain("joint_business_planning");
  });

  // Ops + Recruiting
  it("dashboarding → dashboarding", () => {
    expect(resolveSkill("dashboarding")).toContain("dashboarding");
  });
  it("sourcing + candidate sourcing → talent_acquisition_recruiting", () => {
    expect(resolveSkill("sourcing")).toContain("talent_acquisition_recruiting");
    expect(resolveSkill("candidate sourcing")).toContain("talent_acquisition_recruiting");
  });
  it("employer branding → employer_branding", () => {
    expect(resolveSkill("employer branding")).toContain("employer_branding");
  });
  it("hr analytics → hr_data_analytics", () => {
    expect(resolveSkill("hr analytics")).toContain("hr_data_analytics");
  });
});
