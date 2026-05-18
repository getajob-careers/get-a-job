// Skill-alias map: free-text skill labels → library skill IDs.
//
// WHY: The skill library uses snake_case IDs like `python_development`,
// `figma_mastery`, `excel_advanced_finance`. The onboarding StepSkills chip
// bank surfaces human-readable labels like "Python", "Figma", "Excel". The
// previous matcher did `label.toLowerCase().replace(/[\s-]+/g, "_")` and
// looked the result up directly in SKILL_BY_ID. For ~95% of curated chips
// this failed silently, leaving the deterministic scorer with almost no
// matched skills and pushing every user into the empty-state path.
//
// This map covers the 72 curated chips + common variants seen in real user
// data (e.g. "Figma (basic)", "HubSpot CRM", "MERN Stack"). Each label maps
// to one or more library skill IDs that the label demonstrably evidences.
//
// AGGRESSIVENESS: Moderate. Tools map to the skill they evidence — picking
// "Salesforce" credits both `salesforce` and `crm_management` because owning
// Salesforce experience is concrete CRM evidence. We do NOT chain
// "Salesforce → CRM → customer success" because that's two inferential hops.
//
// KEYS: Always lowercased, whitespace-collapsed. The lookup helper at the
// bottom does the normalization, so callers can pass any user-input casing.
//
// EXTEND HERE not in the edge function. Future expansion goes in this file.

export const SKILL_ALIASES: Record<string, string[]> = {
  // ── Tools & Software (chip bank) ─────────────────────────────────────────
  "excel": ["excel_advanced_finance"],
  "microsoft excel": ["excel_advanced_finance"],
  "ms excel": ["excel_advanced_finance"],
  "google sheets": ["excel_advanced_finance"],
  "spreadsheets": ["excel_advanced_finance"],
  "powerpoint": ["presentation_design", "presentation_skills"],
  "microsoft powerpoint": ["presentation_design", "presentation_skills"],
  "ms powerpoint": ["presentation_design", "presentation_skills"],
  "google slides": ["presentation_design", "presentation_skills"],
  "keynote": ["presentation_design"],
  "microsoft word": ["technical_documentation"],
  "ms word": ["technical_documentation"],
  "google docs": ["technical_documentation"],
  "salesforce": ["salesforce", "crm_management"],
  "hubspot": ["crm_management"],
  "hubspot crm": ["crm_management"],
  "crm tools": ["crm_management"],
  "crm": ["crm_management"],
  "zendesk": ["customer_support_operations"],
  "intercom": ["customer_support_operations"],
  "figma": ["figma_mastery"],
  "figma (basic)": ["figma_mastery"],
  "sketch": ["ui_visual_design"],
  "adobe xd": ["ui_visual_design"],
  "adobe creative suite": ["adobe_creative_suite"],
  "photoshop": ["adobe_creative_suite"],
  "illustrator": ["adobe_creative_suite"],
  "canva": ["canva_design_tools"],

  // ── Domain Knowledge (chip bank) ─────────────────────────────────────────
  "customer success": ["customer_health_management", "customer_relationship_management"],
  "customer success management": ["customer_health_management", "customer_success_strategy"],
  "project management": ["project_management"],
  "product management": ["product_strategy", "product_discovery"],
  "product lifecycle management": ["product_lifecycle_management"],
  "account management": ["account_management"],
  "marketing strategy": ["marketing_campaign_design", "go_to_market_strategy"],
  "sales operations": ["revenue_operations"],
  "revops": ["revenue_operations"],
  "financial modeling": ["financial_modeling"],
  "financial analysis": ["financial_modeling"],
  "market research": ["market_research"],
  "ux research": ["user_research"],
  "user research": ["user_research"],
  "hr operations": ["hr_business_partnering", "employee_lifecycle_management"],
  "people operations": ["hr_business_partnering", "employee_lifecycle_management"],
  "contract negotiation": ["contract_negotiation"],

  // ── Technical & Engineering (chip bank) ──────────────────────────────────
  "python": ["python_development", "python_data"],
  "pandas": ["python_data"],
  "numpy": ["python_data"],
  "matplotlib": ["python_data", "data_visualization_design"],
  "javascript": ["frontend_development"],
  "js": ["frontend_development"],
  "typescript": ["frontend_development"],
  "ts": ["frontend_development"],
  "html": ["frontend_development"],
  "css": ["frontend_development"],
  "react": ["frontend_development"],
  "react.js": ["frontend_development"],
  "reactjs": ["frontend_development"],
  "vue": ["frontend_development"],
  "vue.js": ["frontend_development"],
  "angular": ["frontend_development"],
  "next.js": ["frontend_development"],
  "nextjs": ["frontend_development"],
  "node.js": ["backend_development"],
  "nodejs": ["backend_development"],
  "node": ["backend_development"],
  "express": ["backend_development"],
  "express.js": ["backend_development"],
  "mern stack": ["frontend_development", "backend_development"],
  "java": ["backend_development", "programming_fundamentals"],
  "kotlin": ["backend_development"],
  "go": ["backend_development"],
  "golang": ["backend_development"],
  "ruby": ["backend_development"],
  "ruby on rails": ["backend_development"],
  "rails": ["backend_development"],
  "rest apis": ["api_design", "api_integrations"],
  "rest api": ["api_design", "api_integrations"],
  "restful apis": ["api_design", "api_integrations"],
  "graphql": ["api_design"],
  "sql": ["sql"],
  "postgresql": ["sql", "databases"],
  "postgres": ["sql", "databases"],
  "mysql": ["sql", "databases"],
  "mongodb": ["databases"],
  "nosql": ["databases"],
  "git": ["git_version_control"],
  "github": ["git_version_control"],
  "gitlab": ["git_version_control"],
  "docker": ["cloud_platforms_devops"],
  "kubernetes": ["cloud_platforms_devops"],
  "k8s": ["cloud_platforms_devops"],
  "aws": ["cloud_platforms"],
  "amazon web services": ["cloud_platforms"],
  "azure": ["cloud_platforms"],
  "gcp": ["cloud_platforms"],
  "google cloud": ["cloud_platforms"],
  "machine learning": ["machine_learning", "machine_learning_fundamentals"],
  "ml": ["machine_learning_fundamentals"],
  "deep learning": ["deep_learning"],
  "nlp": ["natural_language_processing"],
  "natural language processing": ["natural_language_processing"],
  "ai": ["machine_learning_fundamentals"],

  // ── Analytical & Quantitative (chip bank) ────────────────────────────────
  "data analysis": ["data_analysis", "user_behavior_analysis"],
  "data analytics": ["data_analysis", "user_behavior_analysis"],
  "a/b testing": ["ab_testing"],
  "ab testing": ["ab_testing"],
  "a/b tests": ["ab_testing"],
  "forecasting": ["sales_forecasting", "budget_forecasting"],
  "kpi reporting": ["dashboarding", "data_analysis"],
  "cohort analysis": ["user_behavior_analysis"],
  "statistics": ["data_analysis"],
  "business intelligence": ["bi_tools", "dashboarding"],
  "tableau": ["dashboarding", "data_visualization_design", "bi_tools"],
  "power bi": ["dashboarding", "bi_tools"],
  "powerbi": ["dashboarding", "bi_tools"],
  "looker": ["dashboarding", "bi_tools"],
  "metabase": ["dashboarding", "bi_tools"],
  "excel modeling": ["excel_advanced_finance", "financial_modeling"],
  "dashboard design": ["dashboarding", "data_visualization_design"],
  "dashboards": ["dashboarding"],
  "mixpanel": ["product_analytics_expertise", "user_behavior_analysis"],
  "amplitude": ["product_analytics_expertise", "user_behavior_analysis"],
  "google analytics": ["product_analytics_expertise"],

  // ── Communication (chip bank) ────────────────────────────────────────────
  "presentations": ["presentation_design", "presentation_skills"],
  "public speaking": ["presentation_skills", "executive_presentation"],
  "technical writing": ["technical_documentation", "research_writing"],
  "copywriting": ["copywriting"],
  "stakeholder updates": ["bizops_executive_communication", "stakeholder_management"],
  "email outreach": ["linkedin_outreach", "outbound_prospecting"],
  "outreach": ["linkedin_outreach", "outbound_prospecting"],
  "storytelling": ["data_storytelling", "presentation_skills"],
  "documentation": ["technical_documentation", "it_documentation_process"],
  "cross-cultural communication": ["customer_communication"],
  "cross cultural communication": ["customer_communication"],
  "pitching": ["presentation_skills", "executive_presentation"],
  "negotiation": ["negotiation"],
  "active listening": ["customer_communication", "emotional_intelligence"],
  "communication": ["customer_communication"],

  // ── Leadership & People (chip bank) ──────────────────────────────────────
  "mentoring": ["mentoring"],
  "coaching": ["coaching"],
  "team coordination": ["cross_functional_collaboration", "stakeholder_management"],
  "stakeholder management": ["stakeholder_management"],
  "hiring": ["hiring_talent_acquisition", "talent_acquisition_recruiting"],
  "recruiting": ["talent_acquisition_recruiting"],
  "talent acquisition": ["talent_acquisition_recruiting"],
  "onboarding others": ["onboarding_training", "onboarding_offboarding_ops"],
  "onboarding": ["onboarding_training"],
  "delegation": ["stakeholder_management"],
  "conflict resolution": ["emotional_intelligence", "stakeholder_management"],
  "performance reviews": ["performance_management"],
  "performance management": ["performance_management"],
  "cross-functional collaboration": ["cross_functional_collaboration"],
  "cross functional collaboration": ["cross_functional_collaboration"],
  "1:1 management": ["performance_management", "coaching"],
  "1-on-1 management": ["performance_management", "coaching"],
  "vision setting": ["product_strategy", "executive_leadership"],
  "leadership": ["leadership"],
  "team leadership": ["leadership"],
  "team management": ["leadership", "performance_management"],

  // ── Generic / problem-solving (commonly typed) ───────────────────────────
  "problem solving": ["problem_solving"],
  "problem-solving": ["problem_solving"],
  "analytical thinking": ["analytical_thinking"],
  "critical thinking": ["analytical_thinking", "problem_solving"],
  "attention to detail": ["attention_to_detail"],
  "organization": ["organization"],
  "time management": ["organization"],
  "emotional intelligence": ["emotional_intelligence"],
  "empathy": ["empathy"],
  "adaptability": ["empathy"],
};

// Resolve a free-text skill label to library skill IDs.
//
// Lookup order:
//   1. Exact alias-map match on the lowercased, trimmed, whitespace-collapsed
//      form (e.g. "  Google  Sheets  " → "google sheets")
//   2. Stripped-parenthetical retry — "Figma (basic)" → "figma"
//   3. Snake-cased direct ID match — preserves the previous matcher path so
//      labels like "ab_testing" still work without an alias entry
//
// Returns [] when nothing matches; caller decides whether to fall through to
// proof-signal extraction (which is the existing backstop).
export function resolveSkillAliases(
  label: string,
  skillIdSet: Set<string>,
): string[] {
  if (!label || typeof label !== "string") return [];

  const norm = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (!norm) return [];

  // 1. Direct alias lookup
  const direct = SKILL_ALIASES[norm];
  if (direct) return direct.filter((id) => skillIdSet.has(id));

  // 2. Strip parenthetical content and retry
  const stripped = norm.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  if (stripped !== norm && stripped.length > 0) {
    const aliased = SKILL_ALIASES[stripped];
    if (aliased) return aliased.filter((id) => skillIdSet.has(id));
  }

  // 3. Snake-case direct ID match (existing behavior)
  const snake = norm.replace(/[\s-]+/g, "_");
  if (skillIdSet.has(snake)) return [snake];

  return [];
}
