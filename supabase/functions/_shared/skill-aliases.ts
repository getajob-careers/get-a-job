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

  // ── Infrastructure / DevOps (high-frequency in JD scans) ────────────────
  "devops": ["cloud_platforms_devops"],
  "ci/cd": ["cloud_platforms_devops"],
  "ci cd": ["cloud_platforms_devops"],
  "cicd": ["cloud_platforms_devops"],
  "terraform": ["cloud_platforms_devops"],
  "iac": ["cloud_platforms_devops"],
  "infrastructure as code": ["cloud_platforms_devops"],
  "ansible": ["cloud_platforms_devops"],
  "helm": ["cloud_platforms_devops"],
  "argocd": ["cloud_platforms_devops"],
  "argo cd": ["cloud_platforms_devops"],
  "gitops": ["cloud_platforms_devops"],
  "jenkins": ["cloud_platforms_devops"],
  "circleci": ["cloud_platforms_devops"],
  "github actions": ["cloud_platforms_devops"],
  "cloud infrastructure": ["cloud_platforms_devops", "cloud_platforms"],
  "microservices": ["backend_development"],
  "service mesh": ["cloud_platforms_devops"],
  "istio": ["cloud_platforms_devops"],
  "eks": ["cloud_platforms_devops", "cloud_platforms"],
  "ecs": ["cloud_platforms_devops", "cloud_platforms"],
  "linux": ["linux_administration", "linux_fundamentals"],
  "linux administration": ["linux_administration"],
  "bash": ["scripting_automation"],
  "shell scripting": ["scripting_automation"],
  "networking": ["networking_fundamentals", "it_infrastructure_networking"],

  // ── Data engineering tools ──────────────────────────────────────────────
  "spark": ["databases"],
  "apache spark": ["databases"],
  "pyspark": ["python_data", "databases"],
  "kafka": ["api_integrations"],
  "apache kafka": ["api_integrations"],
  "airflow": ["workflow_automation"],
  "apache airflow": ["workflow_automation"],
  "snowflake": ["bi_tools", "databases"],
  "databricks": ["bi_tools", "databases"],
  "dbt": ["sql"],
  "big data": ["databases"],
  "etl": ["sql", "data_analysis"],
  "data pipelines": ["sql", "data_analysis"],
  "data engineering": ["sql", "databases"],

  // ── ML / AI tools (frequency rising fast in IL JDs) ─────────────────────
  "pytorch": ["machine_learning", "machine_learning_fundamentals"],
  "tensorflow": ["machine_learning", "machine_learning_fundamentals"],
  "scikit-learn": ["machine_learning_fundamentals"],
  "scikit learn": ["machine_learning_fundamentals"],
  "sklearn": ["machine_learning_fundamentals"],
  "huggingface": ["machine_learning_fundamentals"],
  "hugging face": ["machine_learning_fundamentals"],
  "transformers": ["machine_learning", "natural_language_processing"],
  "llm": ["machine_learning_fundamentals"],
  "llms": ["machine_learning_fundamentals"],
  "langchain": ["machine_learning_fundamentals"],
  "openai api": ["api_integrations", "machine_learning_fundamentals"],
  "rag": ["machine_learning", "natural_language_processing"],
  "vector databases": ["vector_databases"],
  "pinecone": ["vector_databases"],
  "weaviate": ["vector_databases"],
  "cuda": ["cuda_gpu_programming"],
  "ai tools": ["machine_learning_fundamentals"],
  "ai-first": ["machine_learning_fundamentals"],

  // ── Programming languages still missing ─────────────────────────────────
  "c++": ["programming_fundamentals", "backend_development"],
  "c/c++": ["programming_fundamentals", "backend_development"],
  "c#": ["backend_development", "programming_fundamentals"],
  ".net": ["backend_development"],
  "rust": ["backend_development", "programming_fundamentals"],
  "scala": ["backend_development", "programming_fundamentals"],
  "swift": ["programming_fundamentals"],
  "php": ["backend_development"],

  // ── Frontend frameworks still missing ───────────────────────────────────
  "nestjs": ["backend_development"],
  "nest.js": ["backend_development"],
  "fastapi": ["backend_development", "api_design"],
  "flask": ["backend_development"],
  "django": ["backend_development"],

  // ── Generic engineering practices ───────────────────────────────────────
  "code quality": ["analytical_thinking"],
  "performance tuning": ["analytical_thinking"],
  "performance optimization": ["analytical_thinking"],
  "scalability": ["analytical_thinking"],
  "system design": ["analytical_thinking"],
  "open source": ["git_version_control"],

  // ── Business / Product domain (snake_case + variant fixes) ──────────────
  "product_management": ["product_strategy", "product_discovery"],
  "product management": ["product_strategy", "product_discovery"],
  "automation": ["workflow_automation", "scripting_automation"],
  "process automation": ["workflow_automation", "bizops_process_automation"],
  "workflow automation": ["workflow_automation"],
  "analytics": ["data_analysis"],
  "data visualization": ["data_visualization_design"],

  // ── Sales / GTM tools ───────────────────────────────────────────────────
  "linkedin sales navigator": ["outbound_prospecting"],
  "outreach.io": ["outbound_prospecting"],
  "salesloft": ["outbound_prospecting"],
  "gong": ["revenue_operations"],
  "marketo": ["marketing_automation"],
  "pardot": ["marketing_automation"],
  "demandbase": ["marketing_automation"],
  "6sense": ["marketing_automation"],

  // ── Sales / GTM concepts ────────────────────────────────────────────────
  "saas platforms": ["product_strategy"],
  "saas": ["product_strategy"],
  "b2b demand generation": ["marketing_campaign_design"],
  "linkedin ads": ["marketing_campaign_design"],
  "paid search": ["marketing_campaign_design"],
  "content syndication": ["marketing_campaign_design"],

  // ── Backfill-driven expansion (2026-05-21) — alias misses identified
  //    from the 3,054-job extraction backfill. Each phrase points to existing
  //    skill_library IDs. Library-gap phrases (new skills) are added directly
  //    to 01_skill_library.ts in the same PR.
  // ─────────────────────────────────────────────────────────────────────────

  // API / web infrastructure (apis appeared 68 jobs; aliasing both verbatim)
  "apis": ["api_design", "api_integrations"],
  "api": ["api_design", "api_integrations"],
  "rest": ["api_design", "api_integrations"],
  "http": ["api_design"],
  "http protocol": ["api_design"],

  // Backend variants
  "backend": ["backend_development"],
  "backend engineering": ["backend_development"],
  "backend services": ["backend_development"],
  "backend systems": ["backend_development"],
  "backend technologies": ["backend_development"],
  "full-stack development": ["backend_development", "frontend_development"],
  "fullstack development": ["backend_development", "frontend_development"],
  "full stack": ["backend_development", "frontend_development"],

  // Frontend variants
  "frontend technologies": ["frontend_development"],
  "web technologies": ["frontend_development"],

  // Programming generics
  "programming": ["programming_fundamentals"],
  "coding": ["programming_fundamentals"],
  "software development": ["programming_fundamentals"],
  "software_development": ["programming_fundamentals"],
  "software engineering": ["programming_fundamentals"],
  "algorithms": ["programming_fundamentals"],
  "data structures": ["programming_fundamentals"],
  "design patterns": ["programming_fundamentals"],
  "oop": ["programming_fundamentals"],
  "object-oriented programming": ["programming_fundamentals"],
  "concurrency": ["programming_fundamentals"],
  "memory management": ["programming_fundamentals"],
  "operating systems": ["programming_fundamentals"],
  "scripting": ["scripting_automation"],
  "scripting languages": ["scripting_automation"],

  // Troubleshooting / support
  "troubleshooting": ["technical_troubleshooting"],

  // Cloud variants
  "cloud": ["cloud_platforms"],
  "cloud computing": ["cloud_platforms"],
  "cloud environments": ["cloud_platforms"],
  "cloud services": ["cloud_platforms"],
  "cloud technologies": ["cloud_platforms"],
  "cloud-based environments": ["cloud_platforms"],
  "cloud architecture": ["cloud_platforms"],
  "cloud-native architecture": ["cloud_platforms_devops"],
  "cloud infrastructure": ["cloud_platforms_devops", "cloud_platforms"],
  "containers": ["cloud_platforms_devops"],
  "ci/cd pipelines": ["cloud_platforms_devops"],
  "continuous integration": ["cloud_platforms_devops"],
  "devops practices": ["cloud_platforms_devops"],
  "microservices architecture": ["backend_development"],
  "event-driven architecture": ["backend_development"],
  "event-driven architectures": ["backend_development"],

  // Soft skill aliases (the ones with existing library IDs)
  "analytical skills": ["analytical_thinking"],
  "analytical_skills": ["analytical_thinking"],
  "communication skills": ["customer_communication", "presentation_skills"],
  "organizational skills": ["organization"],
  "collaboration": ["cross_functional_collaboration"],
  "data-driven decision making": ["data_analysis", "analytical_thinking"],
  "vendor management": ["vendor_third_party_risk"],

  // Product / UX
  "ux_design": ["ui_visual_design"],
  "user_experience": ["ui_visual_design"],
  "product_design": ["ui_visual_design", "product_discovery"],
  "product_marketing": ["marketing_campaign_design", "go_to_market_strategy"],
  "product marketing": ["marketing_campaign_design", "go_to_market_strategy"],
  "design systems": ["design_system_management"],
  "design": ["ui_visual_design"],
  "ai-assisted design tools": ["ai_design_tools"],

  // AI / ML grouping
  "ai/ml": ["machine_learning_fundamentals"],
  "ai engineering": ["machine_learning_fundamentals"],
  "ai integration": ["machine_learning_fundamentals"],
  "ai technologies": ["machine_learning_fundamentals"],
  "ai-assisted development tools": ["machine_learning_fundamentals"],
  "ai tools": ["machine_learning_fundamentals"],
  "genai": ["machine_learning_fundamentals"],
  "generative ai": ["machine_learning_fundamentals"],
  "ai agents": ["machine_learning_fundamentals"],
  "large language models": ["machine_learning_fundamentals", "natural_language_processing"],
  "llm-based applications": ["machine_learning_fundamentals"],
  "machine learning frameworks": ["machine_learning"],

  // Analytics
  "analytics": ["data_analysis"],
  "data analytics": ["data_analysis"],
  "kpi reporting": ["data_analysis", "dashboarding"],

  // Business / commercial
  "b2b": ["go_to_market_strategy"],
  "b2b_saas": ["product_strategy", "go_to_market_strategy"],
  "b2b saas": ["product_strategy", "go_to_market_strategy"],
  "business_development": ["go_to_market_strategy"],
  "business development": ["go_to_market_strategy"],
  "partnerships": ["go_to_market_strategy"],

  // Marketing
  "digital marketing": ["marketing_campaign_design"],
  "digital media": ["marketing_campaign_design"],
  "growth": ["marketing_campaign_design"],
  "marketing": ["marketing_campaign_design"],
  "google ads": ["marketing_campaign_design"],
  "performance marketing": ["marketing_campaign_design"],

  // Customer engagement
  "customer_engagement": ["customer_relationship_management", "customer_health_management"],

  // Office productivity
  "microsoft office": ["microsoft_office_suite"],
  "microsoft_office": ["microsoft_office_suite"],
  "microsoft 365": ["microsoft_office_suite"],
  "google workspace": ["microsoft_office_suite"],
  "advanced excel": ["excel_advanced_finance"],

  // Sales engagement
  "sales": ["outbound_prospecting"],
  "technical sales": ["solutions_engineering"],
  "software sales": ["outbound_prospecting"],
  "client relationship management": ["customer_relationship_management"],

  // Security existing
  "incident response": ["incident_response_forensics"],
  "incident_response": ["incident_response_forensics"],
  "incident response and forensics": ["incident_response_forensics"],

  // Methodology phrases that sometimes leak into skills — alias them so they
  // don't stay unmapped, but they belong in jobs.methodology column too.
  "agile": ["agile_practices"],
  "scrum": ["agile_practices"],
  "kanban": ["agile_practices"],
  "code reviews": ["analytical_thinking"],
  "code review": ["analytical_thinking"],

  // ── Forward-aliases to new library entries (2026-05-21 expansion) ────────
  // Where the phrase doesn't auto-resolve to a new library ID via snake_case
  // normalization, point at it explicitly.

  // Data tools
  "snowflake": ["snowflake_warehouse"],
  "observability": ["observability_engineering"],
  "observability tools": ["observability_engineering"],
  "monitoring": ["observability_engineering"],
  "monitoring tools": ["observability_engineering"],

  // Productivity tools
  "monday.com": ["monday_com"],
  "monday": ["monday_com"],

  // Languages / runtimes
  "c++": ["c_cpp"],
  "c/c++": ["c_cpp"],
  "c": ["c_cpp"],
  "c#": ["csharp_dotnet"],
  ".net": ["csharp_dotnet"],
  "r": ["r_language"],
  "windows": ["windows_admin"],
  "macos": ["macos_admin"],

  // Frontend frameworks
  "react native": ["react_native"],
  "spring boot": ["spring_boot"],

  // AI / dev tooling
  "cursor": ["cursor_ai_editor"],
  "langgraph": ["langgraph_framework"],
  "workato": ["workato_ipaas"],
  "okta": ["okta_iam"],
  "active directory": ["active_directory"],

  // Virtualization
  "vmware": ["vmware_admin"],
  "chef": ["chef_config_mgmt"],

  // Cybersecurity
  "cybersecurity": ["cybersecurity_general"],
  "cyber security": ["cybersecurity_general"],
  "security": ["cybersecurity_general"],
  "siem": ["siem_operations"],
  "edr": ["edr_endpoint_security"],
  "firewalls": ["firewall_admin"],
  "cloud security": ["cloud_security_general", "cloud_security_posture"],
  "data protection": ["data_protection_practice"],
  "cissp": ["cissp_certification"],
  "iam": ["identity_access_management"],

  // Compliance / governance
  "compliance": ["compliance_general"],
  "compliance frameworks": ["compliance_general"],
  "soc 2": ["soc2_compliance"],
  "soc2": ["soc2_compliance"],
  "iso27001": ["iso_27001"],
  "gdpr": ["gdpr_privacy"],
  "nist": ["nist_frameworks"],
  "sdlc": ["sdlc_practice"],
  "risk": ["risk_assessment_management"],
  "risk management": ["risk_assessment_management"],

  // Finance / accounting
  "accounting": ["accounting_general"],
  "cpa": ["cpa_certification"],
  "us gaap": ["us_gaap_practice"],
  "us_gaap": ["us_gaap_practice"],
  "payments": ["payments_processing"],
  "investment banking": ["investment_banking_skill"],
  "finance": ["financial_modeling"],

  // Operations / business
  "consulting": ["consulting_practice"],
  "procurement": ["procurement_practice"],
  "logistics": ["logistics_practice"],
  "logistics_practice": ["logistics_practice"],
  "budgeting": ["budget_management", "budget_forecasting"],
  "strategy": ["strategy_general"],
  "research": ["research_practice"],
  "qa": ["qa_engineering"],
  "testing": ["qa_engineering"],
  "automated testing": ["test_automation_engineering"],
  "test automation": ["test_automation_engineering"],
  "sre": ["sre_practice"],
  "reliability": ["sre_practice"],

  // Data engineering
  "data engineering": ["data_engineering_general"],
  "data warehousing": ["data_warehousing_practice"],
  "etl": ["etl_elt", "data_engineering_general"],
  "elt": ["etl_elt", "data_engineering_general"],
  "data pipelines": ["etl_elt", "data_engineering_general"],
  "data platforms": ["data_engineering_general"],
  "data platform": ["data_engineering_general"],
  "data architecture": ["data_engineering_general"],
  "data processing": ["data_engineering_general"],
  "big data": ["data_engineering_general", "spark"],
  "big data technologies": ["data_engineering_general", "spark"],

  // Databases
  "relational databases": ["sql", "databases"],
  "nosql databases": ["databases"],
  "sql databases": ["sql", "databases"],

  // Networking
  "tcp/ip": ["tcp_ip_networking"],
  "tcp_ip": ["tcp_ip_networking"],
  "tcp ip": ["tcp_ip_networking"],
  "dns": ["dns_practice"],
  "networking": ["networking_fundamentals", "it_infrastructure_networking"],
  "networking concepts": ["networking_fundamentals"],
  "networking protocols": ["networking_fundamentals"],
  "network protocols": ["networking_fundamentals"],
  "infrastructure": ["it_infrastructure_networking"],

  // EDA / VLSI (IL chip-design industry)
  "eda tools": ["eda_tools"],

  // Auth / web standards
  "oauth": ["api_design", "identity_access_management"],

  // Edge cases — minor existing-target additions found during classification
  "incident response": ["incident_response_general", "incident_response_forensics"],
  "incident_response": ["incident_response_general", "incident_response_forensics"],

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

  // 3. Snake-case → space normalization. JD extractors sometimes emit
  //    snake_case labels (e.g. "product_management", "big_data") that
  //    don't match the space-keyed alias map. Convert underscores back to
  //    spaces and retry. Covers the most common JD-extractor failure mode
  //    observed in the Phase 1 sample run.
  if (norm.includes("_")) {
    const unsnaked = norm.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
    if (unsnaked !== norm && unsnaked.length > 0) {
      const aliased = SKILL_ALIASES[unsnaked];
      if (aliased) return aliased.filter((id) => skillIdSet.has(id));
    }
  }

  // 4. Snake-case direct ID match (existing behavior — preserves the
  //    pre-alias-map matcher path so labels like "ab_testing" still
  //    resolve without an alias entry)
  const snake = norm.replace(/[\s-]+/g, "_");
  if (skillIdSet.has(snake)) return [snake];

  return [];
}
