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
  "soc": ["soc_design"],
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
  "claude": ["claude_assistant"],
  "claude code": ["claude_assistant"],
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
  "martech": ["adtech_domain"],
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

  // RevOps — attribution, funnel, GTM.
  "lead scoring": ["demand_generation"],
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
