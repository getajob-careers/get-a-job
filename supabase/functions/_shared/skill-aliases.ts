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
  "customer experience": ["customer_experience_management", "customer_journey_management"],
  "customer experience management": ["customer_experience_management", "customer_journey_management"],
  "customer experience operations": ["customer_experience_management"],
  "cx operations": ["customer_experience_management"],
  "marketing operations": ["marketing_operations"],
  "marketing ops": ["marketing_operations"],
  "mops": ["marketing_operations"],
  "martech operations": ["marketing_operations"],
  "growth marketing": ["user_acquisition", "demand_generation"],
  "growth marketing strategy": ["user_acquisition", "demand_generation"],
  "growth hacking": ["user_acquisition", "marketing_experimentation"],
  "customer segmentation": ["marketing_analytics"],
  "audience segmentation": ["marketing_analytics"],
  "market segmentation": ["market_research"],
  // ── 7-role expansion: HW cluster (2026-07-14) ────────────────────────────
  // "firmware" / "signal processing" auto-resolve via the snake-ID step; these
  // are the variants + the circuit_design→board_design borderline alias (Eli:
  // same hiring competency, software_architecture pattern).
  "firmware development": ["firmware"],
  "embedded firmware": ["firmware"],
  "bare-metal": ["firmware"],
  "bare metal programming": ["firmware"],
  "rtos": ["firmware"],
  // "dsp" removed — ambiguous (AdTech "DSP" = Demand-Side Platform, not Digital
  // Signal Processing; it false-resolved on 6 non-eng jobs). "digital signal
  // processing" is unambiguous and kept.
  "digital signal processing": ["signal_processing"],
  // ── 7-role expansion: Security/IR cluster (2026-07-14) ────────────────────
  // Exact-snake "security research"/"malware analysis"/"log analysis"/"exploit
  // development"/"vulnerability analysis" auto-resolve; these are the variants +
  // maps to existing umbrella IDs.
  "offensive security research": ["security_research"],
  "defensive security research": ["security_research"],
  "cybersecurity research": ["security_research"],
  "cloud security research": ["security_research"],
  "offensive security": ["security_research"],
  "exploitation": ["exploit_development"],
  "exploit dev": ["exploit_development"],
  "software exploitation": ["exploit_development"],
  "malware research": ["malware_analysis"],
  "static malware analysis": ["malware_analysis"],
  "dynamic malware analysis": ["malware_analysis"],
  "vulnerability assessment": ["vulnerability_analysis"],
  "vulnerability assessments": ["vulnerability_analysis"],
  "log management": ["log_analysis"],
  "digital forensics": ["incident_response_forensics"],
  "forensics": ["incident_response_forensics"],
  // ── 7-role expansion: Quality/Ops cluster (2026-07-14) ────────────────────
  // "six sigma"/"lean manufacturing"/"spc" auto-resolve via snake-ID; variants:
  "lean methodology": ["lean_manufacturing"],
  "kaizen": ["lean_manufacturing"],
  "value stream mapping": ["lean_manufacturing"],
  "dmaic": ["six_sigma"],
  "6 sigma": ["six_sigma"],
  "statistical process control": ["spc"],
  "control charts": ["spc"],
  "process capability": ["spc"],
  "circuit design": ["board_design"],
  "analog design": ["board_design"],
  "schematic design": ["board_design"],
  // ── Library-expansion batch 1 (2026-07-13) ───────────────────────────────
  // Variants of the batch-1 additions that DON'T auto-resolve via the snake-ID
  // step (exact-snake phrases like "data science"/"os internals"/"teamwork"
  // /"interpersonal skills" already resolve to the new IDs for free), plus
  // section-A phrases mapping to EXISTING IDs (class-G safe — verified maps).
  "software architecture": ["system_design"],
  "architectural decisions": ["system_design"],
  "technical direction": ["system_design"],
  "fine-tuning": ["model_training_finetuning"],
  "fine tuning": ["model_training_finetuning"],
  "agents": ["ai_agent_development"],
  "tool use": ["ai_agent_development"],
  "coding standards": ["code_quality"],
  "clean code": ["code_quality"],
  "maintainability": ["code_quality"],
  "rca": ["root_cause_analysis"],
  "linux environments": ["linux_administration"],
  "containerized environments": ["containerization"],
  "python programming": ["python_development"],
  "excellent communication skills": ["communication"],
  "strong communication skills": ["communication"],
  "written communication": ["communication"],
  "written and verbal communication": ["communication"],
  "written and verbal communication skills": ["communication"],
  "communication and collaboration skills": ["communication"],
  "communication and interpersonal skills": ["communication", "interpersonal_skills"],
  "strong analytical skills": ["analytical_thinking"],
  "analytical and problem-solving skills": ["analytical_thinking", "problem_solving"],
  "analytical mindset": ["analytical_thinking"],
  "source control management": ["git_version_control"],
  "cross-functional coordination": ["cross_functional_collaboration"],
  "cross-functional teams": ["cross_functional_collaboration"],
  "stakeholder communication": ["stakeholder_management"],
  "mentoring engineers": ["mentoring"],
  "mentorship": ["mentoring"],
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
  // Office tools / presentation - batch 6 (demand-mapped onto existing IDs).
  "ms office": ["microsoft_office_suite"],
  "microsoft office applications": ["microsoft_office_suite"],
  "office suite": ["microsoft_office_suite"],
  "proficiency in microsoft office": ["microsoft_office_suite"],
  "outlook": ["microsoft_office_suite"],
  "vlookup": ["excel_advanced_finance"],
  "proficiency in excel": ["excel_advanced_finance"],
  "high level excel": ["excel_advanced_finance"],
  "strong excel skills": ["excel_advanced_finance"],
  "power point": ["presentation_design", "presentation_skills"],
  "technical presentations": ["presentation_skills"],
  "conference presentations": ["presentation_skills"],
  "customer presentations": ["presentation_skills"],
  "presentation preparation": ["presentation_skills"],
  "preparing presentations": ["presentation_skills"],
  "executive presentations": ["executive_presentation"],
  "executive level presentations": ["executive_presentation"],
  "google workspace administration": ["saas_administration"],
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
  "a/b testing": ["ab_testing"],
  "ab testing": ["ab_testing"],
  "a/b tests": ["ab_testing"],
  "forecasting": ["sales_forecasting", "budget_forecasting"],
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
  "microservices": ["backend_development"],
  "service mesh": ["cloud_platforms_devops"],
  "istio": ["cloud_platforms_devops"],
  "eks": ["cloud_platforms_devops", "cloud_platforms"],
  "ecs": ["cloud_platforms_devops", "cloud_platforms"],
  "linux": ["linux_administration", "linux_fundamentals"],
  "linux administration": ["linux_administration"],
  "bash": ["scripting_automation"],

  // ── Data engineering tools ──────────────────────────────────────────────
  "spark": ["databases"],
  "apache spark": ["databases"],
  "pyspark": ["python_data", "databases"],
  "kafka": ["api_integrations"],
  "apache kafka": ["api_integrations"],
  "airflow": ["workflow_automation"],
  "apache airflow": ["workflow_automation"],
  "databricks": ["bi_tools", "databases"],
  "dbt": ["sql"],

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
  "vector databases": ["vector_databases"],
  "pinecone": ["vector_databases"],
  "weaviate": ["vector_databases"],
  "cuda": ["cuda_gpu_programming"],
  "ai-first": ["machine_learning_fundamentals"],

  // ── Programming languages still missing ─────────────────────────────────
  "rust": ["backend_development", "programming_fundamentals"],
  "scala": ["backend_development", "programming_fundamentals"],
  "php": ["backend_development"],

  // ── Frontend frameworks still missing ───────────────────────────────────
  "nestjs": ["backend_development"],
  "nest.js": ["backend_development"],
  "fastapi": ["backend_development", "api_design"],
  "flask": ["backend_development"],
  "django": ["backend_development"],

  // ── Generic engineering practices ───────────────────────────────────────
  "code quality": ["analytical_thinking"],
  "scalability": ["analytical_thinking"],

  // ── Business / Product domain (snake_case + variant fixes) ──────────────
  "product_management": ["product_strategy", "product_discovery"],
  "product management": ["product_strategy", "product_discovery"],
  "automation": ["workflow_automation", "scripting_automation"],
  "process automation": ["workflow_automation", "bizops_process_automation"],
  "workflow automation": ["workflow_automation"],
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
  "memory management": ["programming_fundamentals"],
  "operating systems": ["programming_fundamentals"],
  "scripting": ["scripting_automation"],

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
  "large language models": ["machine_learning_fundamentals", "natural_language_processing"],
  "machine learning frameworks": ["machine_learning"],

  // Analytics
  "analytics": ["data_analysis"],
  "data analytics": ["data_analysis"],
  "kpi reporting": ["data_analysis", "dashboarding"],

  // Business / commercial
  "b2b": ["go_to_market_strategy"],
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
  // Security/risk batch 4 (reviewer-approved 22/25, alias-only, 0 new IDs). Surface-form
  // synonyms/abbreviations onto existing infosec IDs; all security/fin-crime-locked so no
  // non-security over-fire. red_teaming/iso_27001 already auto-resolve (snake-ID), so only
  // "red team" needs a row. Dropped (genuine new-ID gaps, see close-out report): vulnerability
  // management, zero trust, security compliance, security awareness, bare owasp.
  "pentest": ["penetration_testing"],
  "pen test": ["penetration_testing"],
  "pen testing": ["penetration_testing"],
  "penetration test": ["penetration_testing"],
  "ethical hacking": ["penetration_testing"],
  "red team": ["red_teaming"],
  "infosec": ["information_security"],
  "appsec": ["application_security"],
  "owasp top 10": ["application_security"],
  "identity and access management": ["identity_access_management"],
  "risk assessment": ["risk_assessment_management"],
  "data loss prevention": ["dlp_data_protection"],
  "anti money laundering": ["financial_crime_practice"],
  "kyc": ["financial_crime_practice"],
  "third party risk": ["vendor_third_party_risk"],
  "vendor risk": ["vendor_third_party_risk"],
  "grc": ["grc_frameworks"],
  "governance risk and compliance": ["grc_frameworks"],
  "security operations": ["secops_practice"],
  "security operations center": ["secops_practice"],
  "soc analyst": ["secops_practice"],
  "blue team": ["secops_practice"],

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

  // ── v4 expansion (2026-05-23) — second batch of forward-aliases ─────────
  // VLSI / EDA
  "rtl": ["rtl_design"],
  "rtl design": ["rtl_design"],
  "rtl_design": ["rtl_design"],
  "verilog": ["verilog"],
  "systemverilog": ["systemverilog"],
  "uvm": ["uvm_methodology"],
  "specman": ["specman_e"],
  "sta": ["static_timing_analysis"],
  "static timing analysis": ["static_timing_analysis"],
  "drc": ["drc_lvs", "physical_verification"],
  "lvs": ["drc_lvs", "physical_verification"],
  "physical verification": ["physical_verification"],
  "physical design": ["physical_design"],
  "pnr": ["place_and_route"],
  "place and route": ["place_and_route"],
  "formal verification": ["formal_verification"],
  "dft": ["dft_design_for_test"],
  "design for test": ["dft_design_for_test"],
  "rtl2gds": ["rtl2gds"],
  "rtl-to-gds": ["rtl2gds"],
  "rtl to gds": ["rtl2gds"],
  "soc design": ["soc_design"],
  "soc_design": ["soc_design"],
  "system on chip": ["soc_design"],
  "pcb": ["pcb_design"],
  "pcb design": ["pcb_design"],
  "signal integrity": ["signal_integrity"],
  "board design": ["board_design"],
  "rf": ["rf_engineering"],
  "rf design": ["rf_engineering"],
  "rf engineering": ["rf_engineering"],
  "cadence": ["eda_tools"],
  "synopsys": ["eda_tools"],
  "mentor": ["eda_tools"],
  "eda": ["eda_tools"],

  // Hardware / networking
  "pcie": ["pcie_protocol"],
  "pci express": ["pcie_protocol"],
  "rdma": ["rdma_networking"],
  "roce": ["rdma_networking"],
  "infiniband": ["rdma_networking"],
  "ethernet": ["ethernet_networking"],
  "hpc": ["hpc_computing"],
  "high performance computing": ["hpc_computing"],
  "high-performance computing": ["hpc_computing"],
  "multi-threading": ["multi_threading"],
  "multi threading": ["multi_threading"],
  "multithreading": ["multi_threading"],
  "concurrency": ["multi_threading"],
  "dpdk": ["dpdk_networking"],
  "ebpf": ["ebpf_kernel"],
  "mpi": ["hpc_computing"],

  // Modern AI / automation
  "n8n": ["n8n_automation"],
  "zapier": ["zapier_ipaas"],
  "mcp": ["mcp_protocol"],
  "model context protocol": ["mcp_protocol"],
  "claude_code": ["claude_assistant"],
  "openai api": ["openai_api"],
  "openai": ["openai_api"],
  "agentic ai": ["agentic_systems"],
  "agentic systems": ["agentic_systems"],
  "agentic_systems": ["agentic_systems"],
  "agentic workflows": ["agentic_systems"],
  "agent frameworks": ["agentic_systems"],
  "agentic frameworks": ["agentic_systems"],
  "multi-agent systems": ["agentic_systems"],
  "ai agents": ["agentic_systems"],
  "ai_agents": ["agentic_systems"],
  "rag": ["rag_pipelines"],
  "retrieval augmented generation": ["rag_pipelines"],
  "rag pipelines": ["rag_pipelines"],
  "jax": ["jax_framework"],
  "crewai": ["crewai_framework"],
  "feature engineering": ["feature_engineering"],
  "feature_engineering": ["feature_engineering"],
  "llmops": ["llmops"],
  "llm ops": ["llmops"],
  "llm based applications": ["agentic_systems"],
  "llm-based applications": ["agentic_systems"],
  "llm based solutions": ["agentic_systems"],
  "llm based systems": ["agentic_systems"],
  "llm-based systems": ["agentic_systems"],
  "foundation models": ["machine_learning_fundamentals"],
  "langgraph": ["langgraph_framework"],

  // Security ops
  "threat detection": ["threat_detection"],
  "threat hunting": ["threat_hunting"],
  "threat intelligence": ["threat_intelligence"],
  "endpoint security": ["endpoint_security"],
  "endpoint protection": ["endpoint_security"],
  "sast": ["sast_security"],
  "static application security testing": ["sast_security"],
  "dast": ["dast_security"],
  "dynamic application security testing": ["dast_security"],
  "devsecops": ["devsecops_practice"],
  "secops": ["secops_practice"],
  "splunk": ["splunk_platform"],
  "kibana": ["kibana_dashboards"],
  "elk": ["elk_stack"],
  "elk stack": ["elk_stack"],
  "xdr": ["xdr_security"],
  "dlp": ["dlp_data_protection"],
  "casb": ["casb_security"],
  "cspm": ["cspm_security"],
  "sase": ["sase_architecture"],
  "vpn": ["vpn_secure_access"],
  "ztna": ["vpn_secure_access"],
  "tls": ["tls_security"],
  "pki": ["tls_security"],
  "jwt": ["jwt_oauth_auth"],
  "oauth2": ["jwt_oauth_auth"],
  "oauth 2": ["jwt_oauth_auth"],
  "saml": ["jwt_oauth_auth"],
  "ips": ["ips_network_security"],

  // AWS
  "s3": ["aws_s3"],
  "aws s3": ["aws_s3"],
  "lambda": ["aws_lambda"],
  "aws lambda": ["aws_lambda"],
  "sqs": ["aws_sqs"],
  "aws sqs": ["aws_sqs"],
  "ec2": ["aws_ec2"],
  "aws ec2": ["aws_ec2"],
  "rds": ["aws_rds"],
  "aws rds": ["aws_rds"],

  // Databases
  "mssql": ["ms_sql_server"],
  "ms sql": ["ms_sql_server"],
  "microsoft sql server": ["ms_sql_server"],
  "sql server": ["ms_sql_server"],
  "t-sql": ["ms_sql_server"],
  "oracle": ["oracle_database"],
  "oracle db": ["oracle_database"],
  "pl/sql": ["oracle_database"],
  "neo4j": ["neo4j_graph"],
  "graph databases": ["neo4j_graph"],
  "hadoop": ["hadoop_ecosystem"],
  "hdfs": ["hadoop_ecosystem"],
  "hive": ["hadoop_ecosystem"],
  "mapreduce": ["hadoop_ecosystem"],

  // Tools
  "puppet": ["puppet_config"],
  "gerrit": ["gerrit_review"],
  "asana": ["asana_pm"],
  "ms teams": ["ms_teams"],
  "microsoft teams": ["ms_teams"],
  "teams": ["ms_teams"],
  "power apps": ["power_platform"],
  "powerapps": ["power_platform"],
  "power automate": ["power_platform"],
  "power_apps": ["power_platform"],
  "power_automate": ["power_platform"],
  "ios": ["ios_dev"],
  "swift": ["ios_dev"],
  "swiftui": ["ios_dev"],
  "android": ["android_dev"],
  "kotlin": ["android_dev"],
  "html5": ["html_css_modern"],
  "css3": ["html_css_modern"],
  "html": ["html_css_modern"],
  "css": ["html_css_modern"],
  "json": ["json_data"],
  "json-rpc": ["json_data"],
  "xml": ["json_data"],
  "protobuf": ["json_data"],

  // Data governance + quality
  "data governance": ["data_governance"],
  "model governance": ["data_governance"],
  "data quality": ["data_quality"],
  "data_quality": ["data_quality"],
  "schema design": ["schema_design"],

  // System design
  "system design": ["system_design"],
  "distributed systems": ["distributed_systems"],
  "distributed computing": ["distributed_systems"],
  "distributed_systems": ["distributed_systems"],
  "large-scale systems": ["distributed_systems", "system_design"],
  "data-intensive systems": ["distributed_systems", "data_engineering_general"],
  "real-time systems": ["distributed_systems"],
  "production-grade systems": ["system_design"],

  // Testing
  "unit testing": ["unit_testing_practice"],
  "unit_testing": ["unit_testing_practice"],
  "performance engineering": ["performance_engineering"],
  "performance optimization": ["performance_engineering"],
  "performance tuning": ["performance_engineering"],
  "performance profiling": ["performance_engineering"],
  "performance testing": ["performance_engineering"],
  "pytest": ["pytest_python_testing"],
  "selenium": ["selenium_qa"],

  // Certifications
  "pmp": ["pmp_certification"],
  "project management professional": ["pmp_certification"],
  "cism": ["cism_certification"],
  "cisa": ["cisa_certification"],
  "prince2": ["prince2_certification"],

  // Domain knowledge
  "tax compliance": ["tax_compliance"],
  "fraud": ["fraud_detection"],
  "fraud detection": ["fraud_detection"],
  "aml": ["financial_crime_practice"],
  "financial crime": ["financial_crime_practice"],
  "fintech": ["fintech_domain"],
  "ecommerce": ["ecommerce_domain"],
  "e-commerce": ["ecommerce_domain"],
  "adtech": ["adtech_domain"],
  "martech": ["marketing_operations"],
  "b2b saas": ["b2b_saas_domain"],
  "b2b_saas": ["b2b_saas_domain"],
  "lab equipment": ["lab_equipment_practice"],
  "inventory management": ["inventory_management"],

  // Design
  "after effects": ["after_effects"],
  "motion design": ["motion_design_basics"],
  "animation": ["motion_design_basics"],

  // Categorical aliases (rolling up vague phrases to umbrella IDs)
  "monitoring": ["observability_engineering"],
  "monitoring tools": ["observability_engineering"],
  "observability tools": ["observability_engineering"],
  "logging": ["observability_engineering"],
  "ci/cd tools": ["cloud_platforms_devops"],
  "developer tools": ["programming_fundamentals"],
  "frontend frameworks": ["frontend_development"],
  "frontend technologies": ["frontend_development"],
  "web technologies": ["frontend_development"],
  "automation tools": ["workflow_automation"],
  "automation frameworks": ["workflow_automation"],
  "automation platforms": ["workflow_automation"],
  "presentation tools": ["presentation_design"],
  "presentation": ["presentation_skills"],
  "collaboration tools": ["cross_functional_collaboration"],
  "design systems": ["design_system_management"],
  "frontend": ["frontend_development"],

  // Misc commonly-emitted phrases
  "operations": ["workflow_automation", "scripting_automation"],
  "engineering": ["programming_fundamentals"],
  "architecture": ["system_design"],
  "open source": ["git_version_control"],
  "open-source contributions": ["git_version_control"],
  "version control": ["git_version_control"],
  "scripting languages": ["scripting_automation"],
  "shell": ["scripting_automation"],
  "shell scripting": ["scripting_automation"],
  "unix": ["linux_administration"],
  "linux/unix": ["linux_administration"],
  "fluency": ["analytical_thinking"],
  "ai fluency": ["machine_learning_fundamentals"],
  "ai_fluency": ["machine_learning_fundamentals"],

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

  // ── Onboarding preset chips (StepSkills.jsx) ─────────────────────────────
  // Every chip the user can click MUST resolve to a library ID. 18 of the
  // 27 previously-unresolved chips alias to an existing canonical ID;
  // the remaining 9 got dedicated library entries (notion_workspace,
  // loom_async_video, supply_chain_management, pricing_strategy,
  // time_series_analysis, conflict_de_escalation, speech_writing,
  // strategic_planning, resource_allocation, talent_development).
  "airtable": ["databases"],
  "looker studio": ["bi_tools"],
  "linear": ["project_management"],
  "webflow": ["web_design"],
  "go-to-market": ["gtm_strategy"],
  "linux/bash": ["scripting_automation"],
  "regression analysis": ["statistical_analysis"],
  "causal inference": ["experimentation_framework"],
  "mixed methods research": ["research_practice"],
  "survey design": ["user_research"],
  "financial forecasting": ["budget_forecasting"],
  "internal memos": ["communication"],
  "customer calls": ["customer_communication"],
  "workshop facilitation": ["training_facilitation"],
  "cross-team negotiation": ["cross_functional_collaboration"],
  "org design": ["organizational_design"],
  "career coaching": ["coaching"],
  // The remaining 10 chips have dedicated library entries — aliasing both
  // the natural-language label AND the snake_case ID covers user input
  // and any v4-extractor JD output that already uses the canonical form.
  "notion": ["notion_workspace"],
  "loom": ["loom_async_video"],
  "supply chain": ["supply_chain_management"],
  "pricing strategy": ["pricing_strategy"],
  "time-series analysis": ["time_series_analysis"],
  "time series analysis": ["time_series_analysis"],
  "conflict de-escalation": ["conflict_de_escalation"],
  "conflict de escalation": ["conflict_de_escalation"],
  "speech writing": ["speech_writing"],
  "strategic planning": ["strategic_planning"],
  "resource allocation": ["resource_allocation"],
  "talent development": ["talent_development"],

  // ── Phase 0a (Skills Coherence) — live-unmapped recovery ─────────────────
  // Aliases for labels found unmapped in real user data (2026-05-31 audit).
  // Each target canonical was confirmed present in skillIdsGenerated.json
  // before adding here. Pure free-text catches; SkillChipBank chips are
  // already 100% resolvable. Tested in src/test/skillResolver.test.js.

  // Compound category labels seen on 13 of 21 profiles (from older
  // onboarding writes or resume extraction). Mapped to the closest single
  // or multi-canonical equivalent.
  "customer experience & retention": ["customer_health_management", "customer_retention"],
  "customer experience and retention": ["customer_health_management", "customer_retention"],
  "user-facing operations": ["customer_support_operations"],
  "user facing operations": ["customer_support_operations"],
  "stakeholder coordination": ["stakeholder_management"],
  "program & project execution": ["program_management", "project_management"],
  "program and project execution": ["program_management", "project_management"],
  "leadership & team management": ["leadership"],
  "leadership and team management": ["leadership"],

  // Customer-success variants surfaced by recent user data.
  // (Phase 0a alias for "customer onboarding strategy" originally
  // pointed at onboarding_training; Phase 0a-followup audit found the
  // more-specific canonical onboarding_strategy ("Customer Onboarding
  // Strategy") is the correct target — both customer-onboarding
  // phrasings now align on onboarding_strategy.)
  "customer onboarding strategy": ["onboarding_strategy"],
  "customer relations": ["customer_relationship_management"],
  "customer relationship managment": ["customer_relationship_management"], // common typo
  "team collaboration": ["cross_functional_collaboration"],

  // Excel-skill variants.
  "excel pivot tables": ["excel_advanced_finance"],
  "pivot tables": ["excel_advanced_finance"],

  // Stats variant.
  "basic statistical data analysis": ["statistical_analysis"],

  // Modern AI tooling labels — canonicals already exist in the library
  // but the natural-language forms weren't aliased. Catches user-typed
  // free-text from active Claude/agentic-AI users.
  "agentic ai systems": ["agentic_systems"],
  "claude / claude code": ["claude_assistant"],
  "claude": ["claude_assistant"],
  "claude code": ["claude_assistant"],
  "no-code / low-code ai automation": ["no_code_ai_automation"],
  "no-code ai automation": ["no_code_ai_automation"],
  "low-code ai automation": ["no_code_ai_automation"],

  // ── Skill-expansion batch 1: AI-tool labels (2026-07-26) ─────────────────
  // Consumer/generalist AI-assistant tools → `ai_tool_fluency` (the library's
  // "using AI tools" competency, which names ChatGPT/Claude/Copilot). chatgpt
  // is the #1 unmapped user label. Additive-only; none of these resolved before
  // (no ID, no snake fallback). Builder/reviewer split; reviewer-dropped
  // candidates logged in the PR body, not carried here.
  "chatgpt": ["ai_tool_fluency"],
  "chat gpt": ["ai_tool_fluency"],
  "gpt-4o": ["ai_tool_fluency"],
  "gemini": ["ai_tool_fluency"],
  "google gemini": ["ai_tool_fluency"],
  "microsoft copilot": ["ai_tool_fluency"],
  "m365 copilot": ["ai_tool_fluency"],
  "github copilot": ["ai_tool_fluency"],
  "github co-pilot": ["ai_tool_fluency"],
  "perplexity": ["ai_tool_fluency"],
  "perplexity ai": ["ai_tool_fluency"],
  "notebooklm": ["ai_tool_fluency"],
  // AI-engineering alias-gaps → existing specialist IDs.
  "mcp servers": ["mcp_protocol"],
  "multi-agent orchestration": ["agentic_systems"],

  // ── Skill-expansion mini-batch: gen-image AI tools (2026-07-27) ───────────
  // Image-generation tool brand-names -> `generative_ai_creative` (the library
  // ID whose description names Midjourney/DALL·E/Adobe Firefly verbatim).
  // Batch-1 routed GENERALIST AI tools to ai_tool_fluency and its reviewer
  // dropped these gen-image tools; this is the follow-up routing them to the
  // creative specialist. Job-side evidence is 100% creative-domain (Brand
  // designer, Creative Strategist). "stable diffusion" DEFERRED: dual-sense
  // (creative tool vs ML model) - out of ruled scope and the only ambiguous
  // phrase. Additive; none resolved before. Tested in skillResolver.test.js.
  "midjourney": ["generative_ai_creative"],
  "dall-e": ["generative_ai_creative"],
  "dall·e": ["generative_ai_creative"],
  "dalle": ["generative_ai_creative"],
  "adobe firefly": ["generative_ai_creative"],

  // Operations / logistics variant.
  "operational logistics": ["logistics_practice"],

  // ── Phase 0a-followup (role-coverage alias expansion) ────────────────────
  // 72 aliases recovering common job-relevant phrasings that the
  // pre-pilot role-coverage audit found unresolved. Every target
  // canonical was confirmed present in skillIdsGenerated.json before
  // adding. Zero collisions with existing entries (including the
  // 24 additions from Phase 0a). Pure additive — same pattern as #199.
  //
  // Net effect is bidirectional: the JD extractor uses this same alias
  // map, so JDs saying "SEO" / "PRD" / "OKRs" / "lead gen" — which
  // weren't resolving either — now land in canonical alongside user
  // free-text. Suppresses the zero-demand drift on canonicals like
  // seo_management, prd_writing, quota_attainment, etc.
  //
  // Tested in src/test/skillResolver.test.js — one case per alias.

  // Sales / SDR / AE — pipeline + activity terminology
  "lead gen": ["demand_generation"],
  "lead generation": ["demand_generation"],
  "pipeline generation": ["demand_generation"],
  "cold outreach": ["cold_calling"],
  "cold calling": ["cold_calling"],
  "cold email": ["sales_engagement_tools"],
  "pipeline management": ["pipeline_management"],
  "quota attainment": ["quota_attainment"],
  "quota": ["quota_attainment"],
  "prospecting": ["outbound_prospecting"],
  "outbound prospecting": ["outbound_prospecting"],
  "discovery calls": ["discovery_calls"],
  "objection handling": ["objection_handling"],
  "closing": ["deal_closing"],
  "negotiating": ["negotiation"],
  "upselling": ["upselling_cross_selling"],
  "cross-selling": ["upselling_cross_selling"],
  "cross sell": ["upselling_cross_selling"],
  "up sell": ["upselling_cross_selling"],
  "account planning": ["account_management"],

  // Sales tooling — CRM admin variants.
  "salesforce admin": ["revops_crm_administration"],
  "salesforce reporting": ["salesforce"],
  "hubspot admin": ["revops_crm_administration"],
  "crm hygiene": ["revops_crm_administration"],

  // Customer Success — common phrasings.
  "renewal management": ["renewal_management"],
  "churn reduction": ["customer_retention"],
  "health scoring": ["customer_health_management"],
  "customer onboarding": ["onboarding_strategy"],
  "customer training": ["bizops_enablement_training"],
  "time to value": ["value_realization"],

  // PM / Product — framework + artifact terms.
  "okrs": ["bizops_okr_framework"],
  "product discovery": ["product_discovery"],
  "product strategy": ["product_strategy"],
  "roadmap": ["roadmap_prioritization"],
  "roadmapping": ["roadmap_prioritization"],
  "prioritization": ["roadmap_prioritization"],
  "user interviews": ["customer_discovery_interviews"],
  "metrics design": ["product_metrics"],
  "feature specs": ["feature_definition"],
  "prd": ["prd_writing"],
  "product requirements document": ["prd_writing"],

  // PM functions - batch 3 (all-alias, reviewer-approved). Additive surface
  // forms onto existing PM canonicals; "sprint planning" targets
  // agile_methodology (the role-referenced ID) not agile_practices.
  "product vision": ["product_strategy"],
  "user stories": ["requirements_gathering"],
  "sprint planning": ["agile_methodology"],
  "product analytics": ["product_analytics_expertise"],
  "roadmap ownership": ["roadmap_prioritization"],
  "feature prioritization": ["roadmap_prioritization"],
  "acceptance criteria": ["feature_definition"],
  "prds": ["prd_writing"],

  // RevOps — attribution, funnel, GTM.
  // (Note: "lead scoring" was dropped from this batch during cross-review
  // — it's a distinct downstream MQL→SQL qualification skill that
  // warrants its own canonical, not collapsing into demand_generation.
  // Moved to the bucket-2 curation task.)
  "attribution": ["campaign_analytics_attribution"],
  "funnel analysis": ["funnel_optimization"],
  "go-to-market ops": ["revops_gtm_process_design"],
  "gtm ops": ["revops_gtm_process_design"],
  "compensation planning": ["compensation_design"],

  // Marketing / Growth — channel + tactic terms.
  "seo": ["seo_management"],
  "sem": ["paid_search_advertising"],
  "ppc": ["paid_search_advertising"],
  "paid social": ["paid_social_advertising"],
  "email marketing": ["marketing_automation"],
  "drip campaigns": ["marketing_automation"],
  "lifecycle marketing": ["lifecycle_marketing"],
  "content marketing": ["content_strategy"],
  "content strategy": ["content_strategy"],
  "brand strategy": ["brand_management"],
  "growth experimentation": ["marketing_experimentation"],
  "conversion rate optimization": ["conversion_rate_optimization"],
  "cro": ["conversion_rate_optimization"],
  "landing pages": ["web_design"],
  "event marketing": ["event_marketing"],

  // Marketing / Growth / CX - batch 5 (demand-mapped aliases onto existing IDs).
  "market analysis": ["market_research"],
  "market insights": ["market_research"],
  "market trend analysis": ["market_research"],
  "market trends analysis": ["market_research"],
  "market mapping": ["market_research"],
  "campaign performance analysis": ["campaign_analytics_attribution"],
  "attribution models": ["campaign_analytics_attribution"],
  "marketing design": ["marketing_campaign_design"],
  "content writing": ["copywriting"],
  "technical content": ["technical_content_creation"],
  "conversion optimization": ["conversion_rate_optimization"],
  "brand marketing": ["brand_management"],
  "brand awareness": ["brand_management"],
  "brand design": ["brand_identity_design"],
  "social media": ["social_media_management"],
  "social media platforms": ["social_media_management"],
  "community engagement": ["community_management"],
  "gtm operations": ["revops_gtm_process_design"],
  "go-to-market execution": ["go_to_market_product"],
  "strategic partnerships": ["partnership_development"],
  "partnership management": ["partner_management"],
  "cross-functional partnership": ["cross_functional_collaboration"],
  "marketing automation platforms": ["marketing_automation"],
  "braze": ["marketing_automation"],
  "salesforce marketing cloud": ["marketing_automation"],
  "crm platforms": ["crm_management"],
  "crms": ["crm_management"],
  "meta ads": ["paid_social_advertising"],
  "field marketing": ["event_marketing"],
  "telemarketing": ["cold_calling"],
  "affiliate marketing": ["user_acquisition_partnerships"],

  // BD / Partnerships.
  "partnership development": ["partnership_development"],
  "channel sales": ["channel_sales_strategy"],
  "reseller management": ["channel_partner_management"],
  "alliance management": ["channel_sales_strategy"],
  "co-selling": ["joint_business_planning"],

  // Ops + Recruiting helpers.
  "dashboarding": ["dashboarding"],
  "sourcing": ["talent_acquisition_recruiting"],
  "candidate sourcing": ["talent_acquisition_recruiting"],
  "employer branding": ["employer_branding"],
  "hr analytics": ["hr_data_analytics"],

  // ── Tier 1 skill recovery (2026-06-15) ───────────────────────────────────
  //
  // Hebrew + plain-English variants surfaced by the ≥3-job phrase audit of
  // extraction_unmapped_skills over zero-core IL jobs. 1,444 zero-core jobs
  // had real extracted skills failing canonical mapping (no aliases for
  // common Hebrew JD phrases or for snake_case extractor outputs). All
  // mappings audited against the live skill_library before adding; sector
  // entries are audience-relevant (IL business-grad pilot). Soft skills,
  // languages, and blue-collar/manufacturing phrases were filtered out per
  // the don't-add rules.
  //
  // Keys are lowercase + whitespace-collapsed to match the resolver's
  // normalization. Hebrew keys preserve characters as stored (the resolver
  // doesn't touch non-ASCII case).

  // — Microsoft Office / computer literacy cluster
  "office": ["microsoft_office_suite"],
  "office software": ["microsoft_office_suite"],
  "office_software": ["microsoft_office_suite"],
  "office applications": ["microsoft_office_suite"],
  "office_applications": ["microsoft_office_suite"],
  "office_management": ["office_operations"],
  "computer skills": ["microsoft_office_suite"],
  "computer_skills": ["microsoft_office_suite"],
  "computer_systems": ["microsoft_office_suite"],
  "אקסל": ["excel_advanced_finance"],
  "יישומי מחשב": ["microsoft_office_suite"],
  "יישומי office": ["microsoft_office_suite"],
  "תוכנות office": ["microsoft_office_suite"],
  "תוכנות אופיס": ["microsoft_office_suite"],
  "עבודה בסביבה ממוחשבת": ["microsoft_office_suite"],
  "שליטה ביישומי מחשב": ["microsoft_office_suite"],

  // — Sales cluster (Hebrew variants of existing "sales" alias)
  "מכירות": ["outbound_prospecting"],
  "מכירה": ["outbound_prospecting"],
  "ניהול מכירות": ["sales_team_leadership"],
  "מכירות טלפוניות": ["cold_calling"],
  "פיתוח לקוחות חדשים": ["outbound_prospecting"],

  // — Customer service / customer ops cluster
  "customer service": ["customer_support_operations"],
  "customer_service": ["customer_support_operations"],
  "שירות לקוחות": ["customer_support_operations"],
  "עבודה מול לקוחות": ["customer_communication"],
  "ניהול תיק לקוחות": ["account_management"],
  "ניהול קשר עם לקוחות": ["customer_relationship_management"],
  // NOTE: "ליווי עסקאות" was on the worklist (3 jobs) but dropped per spot-check
  // review — genuinely ambiguous between sales account_management and consulting
  // client_advisory; multi-targeting would blur-match both onto every job (the
  // false-match pattern the relevance gate just removed). 3 jobs unrecovered;
  // Tier 3 re-extraction will resolve more accurately with full JD context.
  "שימור": ["customer_retention"],

  // — People management / leadership cluster
  "ניהול צוות": ["people_management"],
  "ניהול צוותים": ["people_management"],
  "ניהול צוות עובדים": ["people_management"],
  "ניהול עובדים": ["people_management"],
  "ניסיון ניהולי": ["people_management"],

  // — Recruiting / HR cluster
  "recruitment": ["talent_acquisition_recruiting"],
  "interviewing": ["talent_acquisition_recruiting"],
  "human_resources": ["hr_business_partnering"],
  "גיוס": ["talent_acquisition_recruiting"],

  // — Training / mentoring cluster
  "training": ["training_facilitation"],
  "הדרכה": ["training_facilitation"],
  "הדרכה פרונטלית": ["training_facilitation"],
  "חניכה": ["onboarding_training", "mentoring"],

  // — Operations / admin cluster
  "administration": ["administrative_operations"],
  "administrative_experience": ["administrative_operations"],
  "data_entry": ["administrative_operations"],
  "אדמיניסטרציה": ["administrative_operations"],
  "תפעול": ["operational_management"],
  "ניהול אינבוקסים": ["administrative_operations"],  // borderline E12: approved
  "לוגיסטיקה": ["logistics_practice"],
  "הפצה": ["logistics_practice"],                       // borderline E11: approved
  "ניהול מלאי": ["inventory_management"],
  "implementation": ["implementation_management"],

  // — Project management cluster
  "ניהול פרויקטים": ["project_management"],
  "ms-project": ["project_management"],

  // — Marketing (generic — explicitly NOT b2b_marketing per Eli)
  "שיווק": ["marketing_campaign_design"],
  "social_media": ["social_media_management"],

  // — Negotiation
  "ניהול מו\"מ": ["negotiation"],
  "מו\"מ": ["negotiation"],

  // — Analytics + data
  "ניתוח נתונים": ["data_analysis"],
  "מאגרי מידע": ["databases"],

  // — Business understanding + process
  "הבנה עסקית": ["business_understanding"],
  "שיפור תהליכים": ["process_improvement"],

  // — AI tools
  "כלי ai": ["ai_tool_fluency"],

  // — Compliance / integration fallbacks (canonical IDs verified missing)
  "regulatory compliance": ["compliance_general"],
  "system integration": ["integration_middleware"],

  // — Accounting (borderline E8: approved)
  "taxation": ["accounting_general"],

  // ── NEW canonical IDs (4 added to 01_skill_library.ts in same PR) ────────
  // — Insurance domain (covers ביטוח + variants)
  "ביטוח": ["insurance_domain"],
  "ביטוח דירות": ["insurance_domain"],
  "ביטוח כלי רכב": ["insurance_domain"],
  "היכרות עם עולם הביטוח": ["insurance_domain"],
  "insurance": ["insurance_domain"],

  // — Collections
  "גבייה": ["collections_management"],
  "collections": ["collections_management"],

  // — Field sales (distinct modality from outbound_prospecting / cold_calling)
  // "מכירות פרונטליות" → field_sales (face-to-face / frontal selling)
  "field sales": ["field_sales"],
  "מכירות שטח": ["field_sales"],
  "מכירות פרונטליות": ["field_sales"],
  "territory sales": ["field_sales"],
  "outside sales": ["field_sales"],

  // — Underwriting
  "חיתום": ["underwriting"],
  "underwriting": ["underwriting"],

  // — Resolver consolidation step 2 (#511): class-A alias rows. Each maps a
  //   real unmapped JD phrase (top-50 unmapped, live DB 2026-07-07) to an
  //   EXISTING 01_skill_library.ts ID. Data-row additions only — no library
  //   change. (data science / security research were reclassified M — no
  //   canonical ID exists yet — and deferred to step 3; see PR body.)
  "technical_support": ["helpdesk_support"],
  "technical support": ["helpdesk_support"],
  "ai_ml": ["machine_learning_fundamentals"],
  "object-oriented design": ["programming_fundamentals"],
  "object_oriented_programming": ["programming_fundamentals"],
  "lookers": ["dashboarding", "bi_tools"],
  "system verilog": ["systemverilog"],
  "erp": ["erp_systems"],
  "priority_erp": ["erp_systems"],
  "authentication": ["jwt_oauth_auth"],
  "system engineering": ["system_design"],
  "ui_design": ["ui_visual_design"],
  "azure_devops": ["cloud_platforms_devops"],
  "embedded software development": ["embedded_systems"],
  "full stack development": ["frontend_development", "backend_development"],
  // ── Batch 2: Finance / accounting functions (2026-07-27) ─────────────────
  // Both-sided (real-user labels + JD-demanded) finance concepts. Each maps to
  // the existing library ID that already covers it (concept-verified against
  // the 619-ID set, reviewer-confirmed); no dup-concept IDs minted here. The
  // one genuine gap, accounts_payable, is a new library ID (auto-resolves via
  // the snake-ID step, so it needs no alias key). "accounts receivable" credits
  // collections_management (its "& Receivables" counterpart); "invoice
  // processing" is the AP sub-function. Keys dehyphenated so both surface forms
  // resolve (step-1 direct + step-5 dehyphen retry).
  "journal entries": ["accounting_general"],
  "accruals": ["accounting_general"],
  "month end close": ["accounting_general"],
  "financial statements": ["financial_reporting"],
  "account reconciliations": ["bookkeeping"],
  // Bookkeeping coverage batch (reviewer-approved 11/17). Restores bookkeeping
  // resolution for Bookkeeper JDs after the bare "reconciliation" narrow; every
  // key is finance-locked ("bank"/"credit card") or contains "bookkeep", so none
  // re-introduces the eng-role over-fire the bare key had. Space-form keys catch
  // hyphen/snake/paren input via the resolver's normalization retries.
  "bank reconciliations": ["bookkeeping"],
  "bank reconciliation": ["bookkeeping"],
  "credit card reconciliations": ["bookkeeping"],
  "certified bookkeeper": ["bookkeeping"],
  "bookkeeping certificate": ["bookkeeping"],
  "full cycle bookkeeping": ["bookkeeping"],
  "multi entity bookkeeping": ["bookkeeping"],
  "multi currency bookkeeping": ["bookkeeping"],
  "bookkeeping up to trial balance": ["bookkeeping"],
  "bookkeeping through balance sheet": ["bookkeeping"],
  "hands on bookkeeping": ["bookkeeping"],
  // Re-file mini-batch (from #792 reviewer drops, hub-approved). Structural/close
  // and AP-cycle reconciliations that belong to accounts_payable / accounting_general,
  // NOT bookkeeping. Finance-locked keys (vendor/supplier/intercompany/balance-sheet/
  // general-ledger) - no eng-role over-fire. Singular + plural are distinct keys
  // (resolver depluralizes single-token only), so both number forms are listed.
  "vendor reconciliations": ["accounts_payable"],
  "vendor reconciliation": ["accounts_payable"],
  "supplier reconciliations": ["accounts_payable"],
  "supplier reconciliation": ["accounts_payable"],
  "general ledger entries": ["accounting_general"],
  "gl entries": ["accounting_general"],
  "intercompany reconciliation": ["accounting_general"],
  "intercompany reconciliations": ["accounting_general"],
  "balance sheet reconciliations": ["accounting_general"],
  "balance sheet reconciliation": ["accounting_general"],
  "cash management": ["cash_flow_management"],
  "treasury": ["cash_flow_management"],
  "variance analysis": ["bva_analysis"],
  "financial planning": ["budget_forecasting"],
  "accounts receivable": ["collections_management"],
  "internal controls": ["risk_compliance_consulting"],
  "invoice processing": ["accounts_payable"],
  "quickbooks": ["bookkeeping"],
  "xero": ["bookkeeping"],
  // ── Batch 7: Modern web / cloud / data-eng + no-code + HRIS/ATS (2026-07-27) ─
  // All-alias onto existing IDs, 0 new IDs (builder proposed / independent
  // reviewer validated concept-correctness with drop-on-doubt). DROPPED by the
  // reviewer: "clean architecture" (falls between code_quality and system_design,
  // no clean single-hop home), "telemetry" (domain-ambiguous: SRE observability
  // vs HW/embedded sensor telemetry - would over-fire on the now-in-library HW
  // cluster, same class as the soc/dsp drops), "talent management" (3-way umbrella
  // split), "sdks" (too generic). "solidworks" (mint deferred) filed to the
  // Mechanical/HW role-expansion cluster as demand evidence, not aliased.
  "caching": ["backend_development"],
  "solution architecture": ["solution_design_architecture"],
  "azure devops": ["ci_cd"],
  "webhooks": ["backend_development"],
  "deployment pipelines": ["ci_cd"],
  "data models": ["data_modeling"],
  "openshift": ["containerization"],
  "scipy": ["python_data"],
  "dynamodb": ["databases"],
  "advanced sql": ["sql_advanced"],
  "vba": ["excel_advanced_finance"],
  "anomaly detection": ["machine_learning"],
  "employee relations": ["hr_business_partnering"],
  "employee engagement": ["employee_experience"],
  "succession planning": ["talent_development"],
  "linkedin recruiter": ["talent_acquisition_recruiting"],
  "compensation": ["compensation_benefits"],
  "hris": ["hris_management"],
  "supabase": ["backend_development"],
  "vercel": ["frontend_development"],
  "tailwind css": ["html_css_modern"],
  "wordpress": ["web_design"],
  "wix": ["web_design"],
  "base44": ["no_code_ai_automation"],
};

// THE one shared skill resolver. extract-job-requirements,
// generate-career-analysis, and the frontend (src/lib/skillResolver.js) all
// route through resolveSkill / resolveSkillList — do NOT re-implement the
// 4-step fallback anywhere else (this consolidates three hand-kept copies).
//
// Lookup order (unchanged from the three legacy copies, byte-for-byte):
//   1. Direct alias-map match on the lowercased, trimmed, whitespace-collapsed
//      form (e.g. "  Google  Sheets  " -> "google sheets")
//   2. Stripped-parenthetical retry — "Figma (basic)" -> "figma"
//   3. Snake_case -> space normalization — "product_management" ->
//      "product management" (JD extractors emit snake_case)
//   4. Snake-case direct ID match — "ab_testing" resolves without an alias
//
// The caller injects the canonical ID set: extract + career-analysis derive it
// from 01_skill_library.ts; the browser derives it from the generated mirror
// src/lib/skillIdsGenerated.json (a drift-guard test asserts the two are
// identical). One resolution algorithm over one logical ID source.
//
// Returns [] when nothing matches.
export function resolveSkill(
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

  // 3. Snake_case -> space normalization
  if (norm.includes("_")) {
    const unsnaked = norm.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
    if (unsnaked !== norm && unsnaked.length > 0) {
      const aliased = SKILL_ALIASES[unsnaked];
      if (aliased) return aliased.filter((id) => skillIdSet.has(id));
    }
  }

  // 4. Snake-case direct ID match
  const snake = norm.replace(/[\s-]+/g, "_");
  if (skillIdSet.has(snake)) return [snake];

  // ── PR-A normalization retries (Scoring Coverage Arc, fix #1) ──────────
  // Each retry ONLY looks up the curated alias map / ID set, so a normalized
  // form resolves only when it matches a real alias or ID — no new
  // mis-resolution (class-G) risk is introduced by the normalization itself.
  // Helper: try a candidate string against alias map, then snake-ID set.
  const tryResolve = (cand: string): string[] | null => {
    if (!cand || cand === norm) return null;
    const a = SKILL_ALIASES[cand];
    if (a) {
      const hit = a.filter((id) => skillIdSet.has(id));
      if (hit.length) return hit;
    }
    const s = cand.replace(/[\s-]+/g, "_");
    if (skillIdSet.has(s)) return [s];
    return null;
  };

  // 5. Hyphen -> space (e.g. "problem-solving" -> "problem solving") and
  //    ampersand -> "and" (e.g. "r&d" -> "r and d").
  const dehyphen = norm.replace(/-/g, " ").replace(/&/g, " and ").replace(/\s+/g, " ").trim();
  const r5 = tryResolve(dehyphen);
  if (r5) return r5;

  // 6. Strip a trailing descriptive noun the LLM commonly appends
  //    ("interpersonal SKILLS", "crm SYSTEMS", "ci/cd EXPERIENCE"). Strip one
  //    suffix at a time and retry.
  const SUFFIXES = [
    "skills", "skill", "systems", "system", "tools", "tool", "experience",
    "knowledge", "background", "abilities", "ability", "expertise",
    "proficiency", "principles", "fundamentals", "methodologies", "practices",
  ];
  const words = dehyphen.split(" ");
  if (words.length > 1 && SUFFIXES.includes(words[words.length - 1])) {
    const r6 = tryResolve(words.slice(0, -1).join(" "));
    if (r6) return r6;
  }

  // 7. Depluralize a single-token label ("lookers" -> "looker",
  //    "webhooks" -> "webhook"). Only strips when >3 chars, so it can never
  //    over-shorten; resolves only if the singular is a real alias/ID.
  if (!dehyphen.includes(" ") && dehyphen.length > 4) {
    const singular = dehyphen.endsWith("es")
      ? dehyphen.slice(0, -2)
      : dehyphen.endsWith("s")
        ? dehyphen.slice(0, -1)
        : null;
    if (singular) {
      const r7 = tryResolve(singular);
      if (r7) return r7;
    }
  }

  return [];
}

// Back-compat export name. generate-career-analysis imports resolveSkillAliases;
// it delegates to the one shared resolver so there is a single logic copy.
export function resolveSkillAliases(
  label: string,
  skillIdSet: Set<string>,
): string[] {
  return resolveSkill(label, skillIdSet);
}

// Resolve a list of raw skill labels to canonical IDs + capture unmapped
// phrases. Returns deduped arrays:
//   { canonical: ["python", "figma_mastery"], unmapped: ["my custom skill"] }
export function resolveSkillList(
  labels: string[],
  skillIdSet: Set<string>,
): { canonical: string[]; unmapped: string[] } {
  if (!Array.isArray(labels) || labels.length === 0) {
    return { canonical: [], unmapped: [] };
  }
  const canonical = new Set<string>();
  const unmapped: string[] = [];
  const seenUnmapped = new Set<string>();
  for (const raw of labels) {
    if (typeof raw !== "string") continue;
    const ids = resolveSkill(raw, skillIdSet);
    if (ids.length > 0) {
      for (const id of ids) canonical.add(id);
    } else {
      const norm = raw.toLowerCase().replace(/\s+/g, " ").trim();
      if (norm && !seenUnmapped.has(norm)) {
        seenUnmapped.add(norm);
        unmapped.push(norm);
      }
    }
  }
  return { canonical: Array.from(canonical).sort(), unmapped };
}
