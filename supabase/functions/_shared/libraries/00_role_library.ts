export const roleLibrary = {
  "library_name": "get_a_job_role_library",
  "version": "2.0",
  "last_updated": "2026-05-13",
  "description": "Standardized role taxonomy for role matching, job classification, and career path logic. Unified schema (v2.0): merges historical Schema A (post-sale/ops/product) + Schema B (sales/marketing/data/finance/HR) + Schema C (engineering/AI/consulting) into one shape. See docs/role_library_schema.md.",
  "role_families": [
    "Support",
    "Onboarding_Implementation",
    "Customer_Experience",
    "Relationship_Growth",
    "Sales",
    "BD_Partnerships",
    "Marketing",
    "Product",
    "Engineering",
    "Design_UX",
    "Data",
    "AI_ML",
    "Operations",
    "RevOps_BizOps",
    "Finance",
    "HR_People",
    "Leadership",
    "Admin_GA",
    "IT_Security",
    "Solutions_Engineering",
    "Consulting"
  ],
  "seniority_levels": [
    "Entry",
    "Entry_Mid",
    "Mid",
    "Senior",
    "Lead_Manager",
    "Director_Head",
    "VP_Executive"
  ],
  "roles": [
    {
      "id": "customer_support_representative",
      "standardized_title": "Customer Support Representative",
      "alternate_titles": [
        "CS Representative",
        "Customer Service Representative",
        "Support Rep"
      ],
      "role_family": "Support",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Resolve basic customer inquiries and issues and maintain customer satisfaction.",
      "core_responsibilities": [
        "Respond to customer inquiries via chat, email, or phone",
        "Troubleshoot basic product or service issues",
        "Escalate complex problems to higher support tiers",
        "Document customer interactions",
        "Maintain customer satisfaction"
      ],
      "required_skills": [
        "customer_communication",
        "empathy",
        "problem_solving",
        "organization"
      ],
      "preferred_skills": [
        "crm_management",
        "customer_orientation"
      ],
      "tools": [
        "CRM",
        "email",
        "chat_tools",
        "ticketing_systems"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Support"
      ],
      "typical_backgrounds": [
        "customer_service",
        "retail",
        "call_center",
        "support"
      ],
      "next_roles": [
        "customer_support_specialist",
        "customer_onboarding_specialist",
        "customer_success_associate"
      ],
      "similar_roles": [
        "customer_support_specialist",
        "customer_experience_specialist"
      ],
      "not_to_confuse_with": [
        "Customer Success Manager",
        "Implementation Specialist"
      ],
      "keywords": [
        "tickets",
        "customer inquiries",
        "chat support",
        "phone support",
        "customer satisfaction",
        "escalation",
        "service"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates, bootcamp grads, IDF veterans starting in commercial-side tech; strong English a hard requirement for international product support. Stack patterns: Zendesk / Intercom / Salesforce Service Cloud + internal product wiki + Slack for escalations + knowledge-base tools. Hiring stage: common entry-level role across consumer-facing scale-ups (Lemonade, Wix, Fiverr, Lightricks, eToro) and B2B SaaS with broad customer bases (monday.com, HiBob, AppsFlyer). Often a stepping stone into customer_support_specialist, customer_onboarding_specialist, or commercial roles."
      }
    },
    {
      "id": "customer_support_specialist",
      "standardized_title": "Customer Support Specialist",
      "alternate_titles": [
        "Senior Customer Support Specialist",
        "Tier 2 Support Specialist",
        "Customer Support Lead"
      ],
      "role_family": "Support",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Resolve customer issues in a B2B or SaaS environment with stronger product and systems exposure.",
      "core_responsibilities": [
        "Handle support tickets across email, chat, and phone",
        "Support customers using software products",
        "Troubleshoot configuration issues",
        "Coordinate with internal teams for resolution",
        "Maintain service quality and response times"
      ],
      "required_skills": [
        "customer_communication",
        "customer_orientation",
        "problem_solving",
        "organization"
      ],
      "preferred_skills": [
        "crm_management",
        "data_analysis"
      ],
      "tools": [
        "CRM",
        "Zendesk",
        "Salesforce",
        "Excel"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Support"
      ],
      "typical_backgrounds": [
        "customer_service",
        "support",
        "client_services"
      ],
      "next_roles": [
        "technical_support_engineer",
        "customer_success_associate",
        "customer_onboarding_specialist"
      ],
      "similar_roles": [
        "technical_support_specialist",
        "customer_support_representative",
        "customer_success_specialist"
      ],
      "not_to_confuse_with": [
        "Customer Success Manager",
        "Technical Account Manager"
      ],
      "keywords": [
        "ticket system",
        "configuration",
        "crm integrations",
        "customer issues",
        "b2b support",
        "saas support"
      ],
      "years_experience_typical": "1-4",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: support rep promotions, often the start of a deeper specialization path (technical support, CS, or product). Stack patterns: Zendesk / Intercom + product knowledge base + Slack escalation + sometimes basic SQL for troubleshooting. Hiring stage: ubiquitous mid-level support role at scale-ups and unicorns. Heavy at monday.com, Wix, Fiverr, JFrog, HiBob, Lemonade, AppsFlyer, Lightricks. Career path forks to technical_support_engineer (more technical) or customer_success_specialist (more customer-relationship)."
      }
    },
    {
      "id": "technical_support_engineer",
      "standardized_title": "Technical Support Engineer",
      "alternate_titles": [
        "TSE",
        "Senior Technical Support Engineer",
        "Tier 3 Support Engineer"
      ],
      "role_family": "Support",
      "secondary_family": "Engineering",
      "seniority": "Mid",
      "core_purpose": "Resolve complex technical issues and act as the bridge between customers and engineering.",
      "core_responsibilities": [
        "Debug technical issues",
        "Analyze logs, APIs, integrations, and configurations",
        "Escalate product bugs to engineering",
        "Document solutions and knowledge base content",
        "Support customers in technical environments"
      ],
      "required_skills": [
        "technical_troubleshooting",
        "debugging",
        "analytical_thinking",
        "customer_communication"
      ],
      "preferred_skills": [
        "api_integrations",
        "cloud_tools"
      ],
      "tools": [
        "Jira",
        "Zendesk",
        "Postman",
        "SQL",
        "logs",
        "monitoring_tools"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Support"
      ],
      "typical_backgrounds": [
        "technical_support",
        "it_support",
        "implementation",
        "software_support"
      ],
      "next_roles": [
        "senior_support_engineer",
        "technical_account_manager",
        "sales_engineer"
      ],
      "similar_roles": [
        "senior_support_engineer",
        "solutions_engineer",
        "technical_account_manager"
      ],
      "not_to_confuse_with": [
        "Customer Success Manager",
        "Account Manager"
      ],
      "keywords": [
        "debugging",
        "api",
        "logs",
        "jira",
        "sql",
        "technical issues",
        "troubleshooting",
        "engineering escalation"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: technical support specialist promotion, junior SWE pivot to customer-facing, IDF technical units. Stack patterns: deep product debugging tools + API testing + reading product code + database querying + log analysis (Datadog / Sentry / Coralogix); customer-facing technical communication. Hiring stage: critical at technical / infrastructure SaaS — JFrog, Cloudinary, Coralogix, Logz.io, Snyk, Wiz, Aqua Security, AppsFlyer, monday.com. Often manages the most complex production-affecting customer issues; close partnership with engineering."
      }
    },
    {
      "id": "senior_support_engineer",
      "standardized_title": "Senior Support Engineer",
      "alternate_titles": [
        "Senior Technical Support Engineer",
        "Lead Support Engineer",
        "Principal TSE"
      ],
      "role_family": "Support",
      "secondary_family": "Engineering",
      "seniority": "Senior",
      "core_purpose": "Own complex escalations, mentor others, and resolve high-impact technical issues.",
      "core_responsibilities": [
        "Handle advanced escalations",
        "Lead incident resolution",
        "Mentor junior support engineers",
        "Partner deeply with engineering and product",
        "Improve documentation and troubleshooting patterns"
      ],
      "required_skills": [
        "advanced_debugging",
        "incident_management",
        "technical_leadership",
        "customer_communication"
      ],
      "preferred_skills": [
        "cloud_tools",
        "technical_documentation"
      ],
      "tools": [
        "monitoring_tools",
        "cloud_platforms",
        "ticketing_systems",
        "knowledge_base"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Support"
      ],
      "typical_backgrounds": [
        "technical_support_engineer",
        "systems_engineering"
      ],
      "next_roles": [
        "support_team_lead",
        "technical_account_manager",
        "sales_engineer"
      ],
      "similar_roles": [
        "technical_support_engineer",
        "solutions_engineer",
        "technical_account_manager"
      ],
      "not_to_confuse_with": [
        "VP Customer Success",
        "Customer Experience Manager"
      ],
      "keywords": [
        "escalations",
        "tier 2",
        "tier 3",
        "incident response",
        "complex issues",
        "mentoring"
      ],
      "years_experience_typical": "5-9",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: technical support engineer promotion, senior SWE pivot to customer-facing, sometimes external senior hires from US-based technical support orgs. Stack patterns: deepest product knowledge + ability to read and contribute to product code + escalation management + cross-team coordination. Hiring stage: typically at scale-ups and unicorns with technically complex products — JFrog, Coralogix, Wiz, Aqua Security, Snyk, Cellebrite, monday.com, AppsFlyer. Often paired with major enterprise customers as their primary technical escalation contact."
      }
    },
    {
      "id": "customer_onboarding_specialist",
      "standardized_title": "Customer Onboarding Specialist",
      "alternate_titles": [
        "Onboarding Manager",
        "Junior Implementation Specialist"
      ],
      "role_family": "Onboarding_Implementation",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Guide new customers through initial setup, education, and early product adoption.",
      "core_responsibilities": [
        "Guide new customers through setup",
        "Provide training and education",
        "Support early usage and activation",
        "Help customers reach first value",
        "Coordinate onboarding tasks"
      ],
      "required_skills": [
        "customer_communication",
        "onboarding_training",
        "organization",
        "product_knowledge"
      ],
      "preferred_skills": [
        "project_management",
        "customer_orientation"
      ],
      "tools": [
        "CRM",
        "Zoom",
        "email",
        "help_center_tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Onboarding",
        "Adoption"
      ],
      "typical_backgrounds": [
        "support",
        "customer_success_associate",
        "training"
      ],
      "next_roles": [
        "implementation_specialist",
        "customer_success_associate",
        "customer_success_manager"
      ],
      "similar_roles": [
        "implementation_specialist",
        "customer_success_specialist",
        "customer_support_specialist"
      ],
      "not_to_confuse_with": [
        "HR Onboarding Specialist"
      ],
      "keywords": [
        "onboarding",
        "setup",
        "activation",
        "training",
        "time to value",
        "early adoption"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: customer support promotions, recent graduates with strong organizational skills, hospitality-to-tech pivots. Stack patterns: Gainsight / Vitally + Salesforce + Notion / Confluence for onboarding playbooks + Asana / Monday for project tracking + Loom for async training. Hiring stage: common at B2B SaaS scale-ups with structured customer onboarding — monday.com, HiBob, JFrog, Gong, AppsFlyer, Wix (Studio segment), Forter, Tipalti. Often a feeder to customer_success_specialist or implementation_specialist."
      }
    },
    {
      "id": "customer_success_associate",
      "standardized_title": "Customer Success Associate",
      "alternate_titles": [
        "CS Associate",
        "Junior Customer Success Manager"
      ],
      "role_family": "Onboarding_Implementation",
      "secondary_family": "Relationship_Growth",
      "seniority": "Entry",
      "core_purpose": "Support customer adoption, satisfaction, and retention in an entry-level customer success capacity.",
      "core_responsibilities": [
        "Support onboarding and adoption",
        "Handle customer check-ins",
        "Assist with renewals and retention efforts",
        "Track customer health and engagement",
        "Collect feedback for internal teams"
      ],
      "required_skills": [
        "customer_communication",
        "relationship_building",
        "organization",
        "problem_solving"
      ],
      "preferred_skills": [
        "crm_management",
        "data_analysis"
      ],
      "tools": [
        "CRM",
        "customer_success_platforms",
        "email",
        "video_calls"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Adoption",
        "Retention"
      ],
      "typical_backgrounds": [
        "support",
        "onboarding",
        "client_services"
      ],
      "next_roles": [
        "customer_success_manager",
        "implementation_specialist",
        "account_manager"
      ],
      "similar_roles": [
        "customer_success_specialist",
        "customer_onboarding_specialist"
      ],
      "not_to_confuse_with": [
        "Customer Support Representative"
      ],
      "keywords": [
        "adoption",
        "customer health",
        "retention",
        "check-ins",
        "customer journey",
        "renewals"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates, customer support promotions, hospitality / retail-to-tech transitions; strong English (often near-native). Stack patterns: Zendesk / Intercom + Gainsight + Salesforce + Notion; lighter tooling than full CSM. Hiring stage: less common as a distinct title in Israeli tech — typically merged with customer_success_specialist. Where distinct, found at consumer-facing scale-ups with onboarding-heavy products (Lemonade, Wix, Fiverr, eToro)."
      }
    },
    {
      "id": "implementation_specialist",
      "standardized_title": "Implementation Specialist",
      "alternate_titles": [
        "Senior Implementation Specialist",
        "Implementation Consultant",
        "Onboarding Engineer"
      ],
      "role_family": "Onboarding_Implementation",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Translate customer needs into working product setup, configuration, and go-live execution.",
      "core_responsibilities": [
        "Gather requirements",
        "Configure product for customer environment",
        "Coordinate implementation tasks",
        "Support integrations and setup",
        "Drive go-live readiness"
      ],
      "required_skills": [
        "project_management",
        "requirements_gathering",
        "problem_solving",
        "customer_communication"
      ],
      "preferred_skills": [
        "api_integrations",
        "workflow_design"
      ],
      "tools": [
        "CRM",
        "project_management_tools",
        "integration_tools",
        "documentation_tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Onboarding",
        "Adoption"
      ],
      "typical_backgrounds": [
        "onboarding",
        "support",
        "customer_success_associate"
      ],
      "next_roles": [
        "implementation_manager",
        "technical_account_manager",
        "customer_success_manager"
      ],
      "similar_roles": [
        "implementation_manager",
        "customer_onboarding_specialist",
        "solutions_engineer"
      ],
      "not_to_confuse_with": [
        "Project Manager",
        "Customer Support Specialist"
      ],
      "keywords": [
        "implementation",
        "go live",
        "setup",
        "requirements",
        "configuration",
        "delivery"
      ],
      "years_experience_typical": "2-5",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: customer onboarding promotion, technical support pivot, consulting-to-tech transitions. Stack patterns: product configuration tools + APIs + SQL + Salesforce + Notion / Confluence for playbooks + project management. Hiring stage: common at B2B SaaS with substantial configuration / integration work — monday.com, JFrog, Gong, HiBob, AppsFlyer, Forter, Tipalti, Sapiens (insurance SaaS), AU10TIX, Earnix. Particularly heavy at FinTech / InsurTech where regulatory configuration is significant."
      }
    },
    {
      "id": "implementation_manager",
      "standardized_title": "Implementation Manager",
      "alternate_titles": [
        "Senior Implementation Manager",
        "Implementation Lead",
        "Customer Implementation Manager"
      ],
      "role_family": "Onboarding_Implementation",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Own end-to-end implementation delivery and ensure successful rollout into customer workflows.",
      "core_responsibilities": [
        "Own post-sale delivery",
        "Manage implementation lifecycle",
        "Coordinate stakeholders and partners",
        "Drive go-live and activation",
        "Manage timelines, scope, and issues"
      ],
      "required_skills": [
        "stakeholder_management",
        "project_management",
        "delivery_execution",
        "customer_communication"
      ],
      "preferred_skills": [
        "api_integrations",
        "partner_management",
        "product_adoption"
      ],
      "tools": [
        "project_management_tools",
        "CRM",
        "documentation_tools",
        "status_reporting_tools"
      ],
      "technical_depth": "Medium_High",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Onboarding",
        "Adoption"
      ],
      "typical_backgrounds": [
        "implementation_specialist",
        "customer_success",
        "technical_delivery"
      ],
      "next_roles": [
        "project_manager_customer_delivery",
        "technical_account_manager",
        "director_customer_success"
      ],
      "similar_roles": [
        "implementation_specialist",
        "project_manager_customer_delivery",
        "senior_customer_success_manager"
      ],
      "not_to_confuse_with": [
        "Customer Success Manager",
        "Internal Project Manager"
      ],
      "keywords": [
        "implementation",
        "rollout",
        "go live",
        "delivery",
        "partners",
        "requirements",
        "activation"
      ],
      "years_experience_typical": "4-8",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: implementation specialist promotion, senior CSM with technical specialization, ex-consultants from enterprise software backgrounds. Stack patterns: heavier project management discipline + customer escalation handling + cross-team coordination across product, engineering, and CS. Hiring stage: common at B2B SaaS with complex enterprise implementations — Amdocs, NICE Systems, Cellebrite, Sapiens, Earnix, Personetics, JFrog, monday.com (enterprise), Tipalti, AU10TIX. The role often blurs with project_manager_customer_delivery at companies focused on services-delivery."
      }
    },
    {
      "id": "project_manager_customer_delivery",
      "standardized_title": "Project Manager (Customer Delivery)",
      "alternate_titles": [
        "Customer Delivery PM",
        "Implementation PM",
        "Senior Customer Delivery Manager"
      ],
      "role_family": "Onboarding_Implementation",
      "secondary_family": "Operations",
      "seniority": "Senior",
      "core_purpose": "Coordinate complex customer deployment projects from kickoff through implementation and closure.",
      "core_responsibilities": [
        "Lead delivery governance",
        "Manage milestones, scope, and risks",
        "Coordinate internal and external stakeholders",
        "Run delivery ceremonies",
        "Drive project readiness and closure"
      ],
      "required_skills": [
        "project_management",
        "stakeholder_management",
        "risk_management",
        "customer_communication"
      ],
      "preferred_skills": [
        "crm_management",
        "analytical_thinking"
      ],
      "tools": [
        "Jira",
        "Confluence",
        "CRM",
        "project_management_tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Onboarding",
        "Implementation"
      ],
      "typical_backgrounds": [
        "implementation_manager",
        "professional_services",
        "project_management"
      ],
      "next_roles": [
        "support_team_lead",
        "director_customer_success",
        "implementation_manager"
      ],
      "similar_roles": [
        "implementation_manager",
        "technical_project_manager",
        "program_manager"
      ],
      "not_to_confuse_with": [
        "Customer Experience Manager",
        "Product Manager"
      ],
      "keywords": [
        "project plan",
        "milestones",
        "raid log",
        "stakeholder management",
        "deployment",
        "project closure"
      ],
      "years_experience_typical": "4-8",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: implementation manager promotion, traditional PM background pivoting to customer delivery, ex-consultants. Stack patterns: heavy use of Asana / Monday / Jira for project tracking + Salesforce for customer-facing visibility + Notion for playbooks. Hiring stage: most common at enterprise software companies with significant customer-delivery services components — Amdocs, NICE Systems, Cellebrite, Sapiens, Earnix, Personetics, Au10tix. Less common at PLG / self-serve SaaS where onboarding is product-led."
      }
    },
    {
      "id": "customer_success_manager",
      "standardized_title": "Customer Success Manager",
      "alternate_titles": [
        "CSM",
        "Senior Customer Success Manager (SMB tier)",
        "Mid-Market CSM"
      ],
      "role_family": "Relationship_Growth",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Drive customer adoption, retention, and long-term value realization.",
      "core_responsibilities": [
        "Own customer relationships",
        "Drive product adoption",
        "Monitor health and risk",
        "Support renewals and expansion",
        "Act as trusted advisor"
      ],
      "required_skills": [
        "customer_relationship_management",
        "customer_communication",
        "problem_solving",
        "stakeholder_management"
      ],
      "preferred_skills": [
        "renewal_management",
        "upselling_cross_selling",
        "customer_health_monitoring",
        "data_analysis"
      ],
      "tools": [
        "CRM",
        "customer_success_platforms",
        "video_calls",
        "dashboards"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Adoption",
        "Retention",
        "Expansion"
      ],
      "typical_backgrounds": [
        "customer_success_associate",
        "onboarding",
        "support",
        "account_management"
      ],
      "next_roles": [
        "senior_customer_success_manager",
        "technical_account_manager",
        "customer_success_team_lead"
      ],
      "similar_roles": [
        "senior_customer_success_manager",
        "account_manager",
        "technical_account_manager"
      ],
      "not_to_confuse_with": [
        "Customer Support Specialist",
        "Implementation Manager"
      ],
      "keywords": [
        "retention",
        "adoption",
        "renewals",
        "customer health",
        "churn",
        "stakeholder management",
        "upsell",
        "trusted advisor"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: customer success specialist promotion, account management pivots, ex-consultants or MBA grads. Stack patterns: Gainsight / Vitally / Catalyst for health scoring + Salesforce + Slack Connect with customers + Gong / Chorus for QBRs + Loom for async communication. Hiring stage: ubiquitous at B2B SaaS — monday.com, Wix, JFrog, Fiverr, Gong, HiBob, AppsFlyer, Lemonade, Forter, Tipalti, Cellebrite, Wiz (mid-market and SMB tiers). Most CSMs work US hours for North American account ownership."
      }
    },
    {
      "id": "senior_customer_success_manager",
      "standardized_title": "Senior Customer Success Manager",
      "alternate_titles": [
        "Senior CSM",
        "Strategic CSM",
        "Enterprise Customer Success Manager"
      ],
      "role_family": "Relationship_Growth",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Own high-value accounts and lead strategic customer outcomes and retention.",
      "core_responsibilities": [
        "Manage strategic or enterprise accounts",
        "Handle escalations",
        "Drive retention and expansion strategy",
        "Build executive relationships",
        "Mentor less experienced CSMs"
      ],
      "required_skills": [
        "executive_relationships",
        "retention_strategy",
        "customer_health_management",
        "commercial_mindset"
      ],
      "preferred_skills": [
        "stakeholder_management",
        "cross_functional_collaboration"
      ],
      "tools": [
        "CRM",
        "customer_success_platforms",
        "reporting_dashboards"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Tactical_Strategic",
      "lifecycle_stage": [
        "Retention",
        "Expansion"
      ],
      "typical_backgrounds": [
        "customer_success_manager",
        "account_manager"
      ],
      "next_roles": [
        "customer_success_team_lead",
        "director_customer_success"
      ],
      "similar_roles": [
        "customer_success_manager",
        "technical_account_manager",
        "account_manager"
      ],
      "not_to_confuse_with": [
        "Support Engineer"
      ],
      "keywords": [
        "enterprise accounts",
        "strategic accounts",
        "renewals",
        "expansion",
        "executive stakeholders"
      ],
      "years_experience_typical": "6-10",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: CSM promotion with strong retention / expansion track record; external senior hires from larger Israeli or US SaaS companies. Stack patterns: typical CSM tooling plus deeper account orchestration — Gainsight + Salesforce + Slack Connect + executive QBR templates + Loom + competitive intel. Hiring stage: typically owns enterprise / strategic accounts at scale-ups and unicorns. Heavy at Wiz, CyberArk, SentinelOne, Check Point, monday.com, JFrog, AppsFlyer, Gong, HiBob, Forter, Lemonade. Often a feeder to enterprise_account_executive or customer_success_management."
      }
    },
    {
      "id": "technical_account_manager",
      "standardized_title": "Technical Account Manager",
      "alternate_titles": [
        "TAM",
        "Senior TAM",
        "Strategic TAM"
      ],
      "role_family": "Relationship_Growth",
      "secondary_family": "Solutions_Engineering",
      "seniority": "Senior",
      "core_purpose": "Combine technical expertise and account ownership to help customers succeed with complex products.",
      "core_responsibilities": [
        "Act as technical advisor",
        "Guide customers through technical challenges",
        "Align product capabilities to business goals",
        "Coordinate technical stakeholders",
        "Proactively prevent issues"
      ],
      "required_skills": [
        "technical_problem_solving",
        "customer_relationship_management",
        "customer_communication",
        "business_understanding"
      ],
      "preferred_skills": [
        "api_integrations",
        "technical_troubleshooting",
        "project_management",
        "value_realization"
      ],
      "tools": [
        "CRM",
        "ticketing_systems",
        "technical_docs",
        "integration_tools"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical_Strategic",
      "lifecycle_stage": [
        "Adoption",
        "Retention",
        "Expansion"
      ],
      "typical_backgrounds": [
        "support_engineer",
        "implementation_manager",
        "technical_customer_success"
      ],
      "next_roles": [
        "sales_engineer",
        "customer_success_team_lead",
        "director_customer_success"
      ],
      "similar_roles": [
        "senior_customer_success_manager",
        "solutions_engineer",
        "account_manager"
      ],
      "not_to_confuse_with": [
        "Account Manager",
        "Support Engineer"
      ],
      "keywords": [
        "technical advisor",
        "architecture",
        "integrations",
        "technical success",
        "trusted advisor",
        "proactive support"
      ],
      "years_experience_typical": "4-9",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: SE pivot to post-sale, support engineer promotion, senior CSM with technical depth. Stack patterns: Salesforce + Gainsight + Slack Connect with engineering customers + deep product knowledge + access to engineering escalation paths. Hiring stage: common at technical / infrastructure SaaS where ongoing customer engineering support is critical — JFrog, Snyk, Cloudinary, Coralogix, Logz.io, Wiz, Aqua Security, monday.com (enterprise tier), Gong (technical implementations). Strong English plus customer-facing technical depth essential."
      }
    },
    {
      "id": "account_manager",
      "standardized_title": "Account Manager",
      "alternate_titles": [
        "Strategic Account Manager",
        "Senior Account Manager",
        "Customer Account Manager"
      ],
      "role_family": "Relationship_Growth",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Maintain and grow client relationships with a stronger commercial focus.",
      "core_responsibilities": [
        "Manage customer accounts",
        "Own renewals and upsell motions",
        "Coordinate internal teams",
        "Resolve client issues",
        "Drive account growth"
      ],
      "required_skills": [
        "account_management",
        "negotiation",
        "customer_communication",
        "organization"
      ],
      "preferred_skills": [
        "customer_retention",
        "stakeholder_management",
        "crm_management",
        "renewal_management"
      ],
      "tools": [
        "CRM",
        "reporting_tools",
        "presentation_tools"
      ],
      "technical_depth": "Low_Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Retention",
        "Expansion"
      ],
      "typical_backgrounds": [
        "customer_success_manager",
        "sales",
        "client_services"
      ],
      "next_roles": [
        "senior_customer_success_manager",
        "director_customer_success"
      ],
      "similar_roles": [
        "customer_success_manager",
        "senior_account_executive",
        "technical_account_manager"
      ],
      "not_to_confuse_with": [
        "Technical Account Manager",
        "Account Executive"
      ],
      "keywords": [
        "accounts",
        "client relationships",
        "upsell",
        "renewals",
        "revenue",
        "account growth"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: AE pivots to account management, CSM promotions to revenue-owning roles, sometimes external account management hires. Stack patterns: Salesforce + Gong + Gainsight + Outreach for upsell campaigns + DealHub / PandaDoc for contract work. Hiring stage: common at B2B SaaS with sizeable existing customer bases — monday.com, JFrog, Wix, Fiverr, Gong, HiBob, AppsFlyer, Cellebrite, Lemonade, Payoneer. The role distinction from CSM varies by company — some treat AM as the renewals + expansion specialist, others overlap heavily with CSM responsibilities."
      }
    },
    {
      "id": "customer_experience_specialist",
      "standardized_title": "Customer Experience Specialist",
      "alternate_titles": [
        "CX Specialist",
        "Customer Experience Coordinator",
        "Junior CX Specialist"
      ],
      "role_family": "Customer_Experience",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support customers while helping improve experience quality across touchpoints.",
      "core_responsibilities": [
        "Handle customer interactions",
        "Maintain service quality metrics",
        "Identify friction points",
        "Collaborate across teams to improve experience"
      ],
      "required_skills": [
        "customer_communication",
        "organization",
        "customer_orientation"
      ],
      "preferred_skills": [
        "process_improvement",
        "cross_functional_collaboration"
      ],
      "tools": [
        "support_tools",
        "crm",
        "reporting_tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Support",
        "Experience"
      ],
      "typical_backgrounds": [
        "customer_service",
        "support"
      ],
      "next_roles": [
        "customer_experience_manager",
        "customer_success_associate"
      ],
      "similar_roles": [
        "customer_support_specialist",
        "customer_success_specialist",
        "customer_onboarding_specialist"
      ],
      "not_to_confuse_with": [
        "Customer Experience Manager"
      ],
      "keywords": [
        "customer experience",
        "response time",
        "resolution speed",
        "service quality",
        "cx"
      ],
      "years_experience_typical": "0-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates, customer support promotions, hospitality / retail pivots to tech. Stack patterns: Zendesk / Intercom / Salesforce Service Cloud + Notion / Google Workspace + survey tooling (SurveyMonkey, Typeform, Qualtrics). Hiring stage: less common as a dedicated role in Israeli tech — most companies fold CX work into customer support or customer success. Where distinct, found at consumer-facing scale-ups with strong CX focus (Lemonade, Lightricks, Fiverr, Wix, eToro) and at SaaS companies with mature post-sale orgs (monday.com, HiBob, Gong)."
      }
    },
    {
      "id": "customer_experience_manager",
      "standardized_title": "Customer Experience Manager",
      "alternate_titles": [
        "Senior CX Manager",
        "Director of Customer Experience",
        "CX Operations Manager"
      ],
      "role_family": "Customer_Experience",
      "secondary_family": "Operations",
      "seniority": "Senior",
      "core_purpose": "Optimize the end-to-end customer journey and improve customer loyalty through better systems and touchpoints.",
      "core_responsibilities": [
        "Map customer journey",
        "Analyze NPS, CSAT, and experience data",
        "Improve customer-facing processes",
        "Partner with marketing, support, and product",
        "Drive customer experience strategy"
      ],
      "required_skills": [
        "customer_journey_management",
        "data_analysis",
        "cross_functional_collaboration",
        "customer_communication"
      ],
      "preferred_skills": [
        "process_design",
        "project_management"
      ],
      "tools": [
        "analytics_tools",
        "crm",
        "survey_tools",
        "reporting_dashboards"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low_Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Experience"
      ],
      "typical_backgrounds": [
        "customer_service",
        "customer_success",
        "operations",
        "marketing"
      ],
      "next_roles": [
        "director_customer_success",
        "director_customer_success_operations"
      ],
      "similar_roles": [
        "senior_customer_success_manager",
        "implementation_manager",
        "director_customer_success_operations"
      ],
      "not_to_confuse_with": [
        "Project Manager",
        "Customer Success Manager"
      ],
      "keywords": [
        "customer journey",
        "nps",
        "csat",
        "touchpoints",
        "experience strategy",
        "loyalty"
      ],
      "years_experience_typical": "5-9",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: senior customer success or support manager promotion, CX consulting pivot, sometimes operations specialist. Stack patterns: Gainsight / Vitally / Catalyst + Zendesk / Intercom + Salesforce + survey + journey-mapping tools (Smaply, UXPressia). Hiring stage: most common at consumer-facing scale-ups with mature CX functions — Lemonade, Wix, Fiverr, Lightricks, eToro, Plarium. Also appears at B2B SaaS with strong customer-centric culture (monday.com, HiBob, Gong, AppsFlyer)."
      }
    },
    {
      "id": "sales_engineer",
      "standardized_title": "Sales Engineer",
      "alternate_titles": [
        "Customer-Facing Sales Engineer",
        "Technical AE"
      ],
      "role_family": "Relationship_Growth",
      "secondary_family": "Solutions_Engineering",
      "seniority": "Mid",
      "core_purpose": "Support the sales process by acting as the technical expert in customer conversations and solution design.",
      "core_responsibilities": [
        "Deliver technical demos",
        "Answer technical questions",
        "Support proposal creation",
        "Run proof of concepts",
        "Translate customer needs into technical solutions"
      ],
      "required_skills": [
        "presentation_skills",
        "technical_explanation",
        "customer_discovery",
        "product_knowledge"
      ],
      "preferred_skills": [
        "technical_communication",
        "crm_management",
        "pre_sales_support"
      ],
      "tools": [
        "CRM",
        "demo_tools",
        "presentation_tools"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Pre_Sale",
        "Sale"
      ],
      "typical_backgrounds": [
        "support_engineer",
        "product_specialist",
        "technical_customer_success"
      ],
      "next_roles": [
        "technical_account_manager",
        "account_manager"
      ],
      "similar_roles": [
        "solutions_engineer",
        "account_executive",
        "technical_account_manager"
      ],
      "not_to_confuse_with": [
        "Customer Success Manager",
        "Implementation Specialist"
      ],
      "keywords": [
        "technical demo",
        "proof of concept",
        "proposal",
        "pre sales",
        "product expert"
      ],
      "years_experience_typical": "3-6",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: SWE pivots to customer-facing technical sales, support engineer promotions, SE-to-AE transitions. Stack patterns: Salesforce + technical demo environments + Postman + Notion + strong English for US customer engagement. Hiring stage: term often used interchangeably with Solutions Engineer in Israeli tech. Where distinguished, sales_engineer typically refers to a more sales-quota-owning version of the SE role — closer to a technical AE than a pure pre-sales SE. Common at cyber (Wiz, Check Point, CyberArk, SentinelOne) and B2B SaaS (JFrog, Gong, monday.com)."
      }
    },
    {
      "id": "support_team_lead",
      "standardized_title": "Support Team Lead",
      "alternate_titles": [
        "Customer Support Manager",
        "Technical Support Manager"
      ],
      "role_family": "Leadership",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "Lead support teams, improve support quality, and manage operational performance.",
      "core_responsibilities": [
        "Coach and manage support team",
        "Track KPIs and service levels",
        "Handle escalations",
        "Improve processes",
        "Coordinate staffing and coverage"
      ],
      "required_skills": [
        "people_management",
        "customer_support_operations",
        "coaching",
        "problem_solving"
      ],
      "preferred_skills": [
        "incident_management",
        "customer_success_metrics",
        "technical_documentation"
      ],
      "tools": [
        "ticketing_systems",
        "dashboards",
        "reporting_tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Tactical_People",
      "lifecycle_stage": [
        "Support"
      ],
      "typical_backgrounds": [
        "customer_support_specialist",
        "technical_support_engineer",
        "senior_support_engineer"
      ],
      "next_roles": [
        "director_customer_success",
        "director_customer_success_operations"
      ],
      "similar_roles": [
        "Customer Success Team Lead"
      ],
      "not_to_confuse_with": [
        "Customer Success Manager"
      ],
      "keywords": [
        "manage team",
        "support metrics",
        "sla",
        "coaching",
        "escalations",
        "team performance",
        "people leadership"
      ]
    },
    {
      "id": "customer_success_team_lead",
      "standardized_title": "Customer Success Team Lead",
      "alternate_titles": [
        "Manager, Customer Success",
        "Customer Success Manager (people manager)"
      ],
      "role_family": "Leadership",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "Manage a team of CSMs and improve customer retention, expansion, and team performance.",
      "core_responsibilities": [
        "Lead and mentor CSMs",
        "Track retention and expansion metrics",
        "Improve playbooks and workflows",
        "Support escalations",
        "Drive team performance"
      ],
      "required_skills": [
        "people_management",
        "coaching",
        "customer_success_metrics",
        "customer_communication"
      ],
      "preferred_skills": [
        "renewal_management",
        "expansion_strategy",
        "process_improvement"
      ],
      "tools": [
        "CRM",
        "customer_success_platforms",
        "dashboards"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Direct",
      "strategic_level": "Tactical_People",
      "lifecycle_stage": [
        "Retention",
        "Expansion"
      ],
      "typical_backgrounds": [
        "customer_success_manager",
        "senior_customer_success_manager"
      ],
      "next_roles": [
        "director_customer_success",
        "director_customer_success_operations"
      ],
      "similar_roles": [
        "Support Team Lead"
      ],
      "not_to_confuse_with": [
        "Director of Customer Success"
      ],
      "keywords": [
        "lead team",
        "retention targets",
        "coach csm",
        "expansion",
        "team performance",
        "playbooks",
        "team coaching",
        "manager escalation"
      ]
    },
    {
      "id": "director_customer_success",
      "standardized_title": "Director of Customer Success",
      "alternate_titles": [
        "Head of Customer Success"
      ],
      "role_family": "Leadership",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Own the customer success function, strategy, and team structure.",
      "core_responsibilities": [
        "Define customer success strategy",
        "Build team processes and playbooks",
        "Own retention and expansion performance",
        "Partner with sales, product, and support",
        "Manage managers or broader CS org"
      ],
      "required_skills": [
        "leadership",
        "customer_success_strategy",
        "cross_functional_alignment",
        "operational_management"
      ],
      "preferred_skills": [
        "customer_success_metrics",
        "expansion_strategy",
        "retention_strategy"
      ],
      "tools": [
        "CRM",
        "customer_success_platforms",
        "dashboards",
        "forecasting_tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Retention",
        "Expansion"
      ],
      "typical_backgrounds": [
        "customer_success_team_lead",
        "senior_customer_success_manager",
        "account_management_lead"
      ],
      "next_roles": [
        "vp_customer_success"
      ],
      "similar_roles": [
        "Head of Customer Success"
      ],
      "not_to_confuse_with": [
        "Director of Customer Success Operations"
      ],
      "keywords": [
        "cs strategy",
        "playbooks",
        "retention",
        "expansion",
        "leadership",
        "customer success function",
        "org design",
        "function ownership",
        "team strategy",
        "manager leadership"
      ]
    },
    {
      "id": "director_customer_success_operations",
      "standardized_title": "Director of Customer Success Operations",
      "alternate_titles": [
        "Director of CS Ops",
        "Head of Customer Success Operations",
        "Senior CS Operations Manager"
      ],
      "role_family": "Operations",
      "secondary_family": "RevOps_BizOps",
      "seniority": "Director_Head",
      "core_purpose": "Build and scale the systems, workflows, metrics, and automation behind the post-sale organization.",
      "core_responsibilities": [
        "Own CS operating model",
        "Build health scores and churn signals",
        "Standardize playbooks and SLAs",
        "Own CS dashboards and tooling",
        "Drive process compliance and automation"
      ],
      "required_skills": [
        "process_design",
        "systems_thinking",
        "data_analysis",
        "salesforce"
      ],
      "preferred_skills": [
        "crm_management",
        "process_improvement",
        "operational_management"
      ],
      "tools": [
        "Salesforce",
        "Gainsight",
        "Totango",
        "Gong",
        "dashboards"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Operations"
      ],
      "typical_backgrounds": [
        "customer_success_operations",
        "revops",
        "business_operations"
      ],
      "next_roles": [
        "vp_customer_success"
      ],
      "similar_roles": [
        "sales_operations_manager",
        "revops_manager",
        "head_of_revops"
      ],
      "not_to_confuse_with": [
        "Director of Customer Success"
      ],
      "keywords": [
        "health scoring",
        "playbooks",
        "slas",
        "automation",
        "customer success operations",
        "dashboards"
      ],
      "years_experience_typical": "8-12",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: senior CS operations manager promotion, sales ops pivot to CS, ex-consultants with post-sale specialization. Stack patterns: Gainsight / Vitally / Catalyst administration + Salesforce + Looker / Mode for CS metrics + Zapier / Workato for automation. Hiring stage: typically at scale-ups and unicorns with ~30+ CSMs and structured CS operations — monday.com, JFrog, Wix, HiBob, Gong, AppsFlyer, Lemonade, Forter, Tipalti, Cellebrite. Reports to VP Customer Success / Chief Customer Officer or to VP RevOps."
      }
    },
    {
      "id": "vp_customer_success",
      "standardized_title": "VP Customer Success",
      "alternate_titles": [
        "Vice President of Customer Success"
      ],
      "role_family": "Leadership",
      "secondary_family": null,
      "seniority": "VP_Executive",
      "core_purpose": "Own the entire post-sale organization, customer outcomes, retention, and expansion strategy.",
      "core_responsibilities": [
        "Lead global or company-wide customer success organization",
        "Own retention and expansion outcomes",
        "Build customer journey strategy",
        "Partner with executive team",
        "Represent customer voice at the highest level"
      ],
      "required_skills": [
        "executive_leadership",
        "retention_strategy",
        "organizational_design",
        "cross_functional_exec_presence"
      ],
      "preferred_skills": [
        "customer_success_strategy",
        "cross_functional_alignment",
        "leadership"
      ],
      "tools": [
        "executive_dashboards",
        "crm",
        "forecasting_tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low_Medium",
      "revenue_ownership": "Direct",
      "strategic_level": "Executive_Strategic",
      "lifecycle_stage": [
        "Retention",
        "Expansion",
        "Leadership"
      ],
      "typical_backgrounds": [
        "director_customer_success",
        "director_customer_success_operations",
        "professional_services_leadership"
      ],
      "next_roles": [],
      "similar_roles": [
        "Chief Customer Officer"
      ],
      "not_to_confuse_with": [
        "Customer Success Team Lead"
      ],
      "keywords": [
        "global cs",
        "retention",
        "nrr",
        "grr",
        "expansion",
        "executive",
        "post sales org",
        "executive leadership",
        "org strategy",
        "global leadership",
        "board level"
      ]
    },
    {
      "id": "project_manager",
      "standardized_title": "Project Manager",
      "alternate_titles": [
        "PM (non-product)",
        "Senior Project Manager",
        "Operations Project Manager"
      ],
      "role_family": "Operations",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Drive execution of defined projects by managing timelines, stakeholders, risks, and delivery milestones.",
      "core_responsibilities": [
        "Own project execution from kickoff through delivery",
        "Build and manage project plans, timelines, and milestones",
        "Coordinate cross-functional teams and track dependencies",
        "Identify risks, blockers, and delivery gaps",
        "Communicate project status and escalate issues when needed"
      ],
      "required_skills": [
        "project_management",
        "stakeholder_management",
        "risk_management",
        "cross_functional_collaboration"
      ],
      "preferred_skills": [
        "process_improvement",
        "delivery_execution",
        "customer_communication"
      ],
      "tools": [
        "Jira",
        "Monday",
        "Asana",
        "Confluence",
        "project_management_tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Execution",
        "Delivery"
      ],
      "typical_backgrounds": [
        "project_coordination",
        "operations",
        "implementation"
      ],
      "next_roles": [
        "technical_project_manager",
        "program_manager",
        "product_operations_manager"
      ],
      "similar_roles": [
        "technical_project_manager",
        "program_manager",
        "implementation_manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Product Operations Manager"
      ],
      "keywords": [
        "timeline",
        "milestones",
        "execution",
        "delivery",
        "dependencies",
        "risks",
        "stakeholders"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: operations promotion, ex-consultants from McKinsey / BCG / Bain Israel, military officer transitions to civilian project management. Stack patterns: Asana / Monday / Jira for project tracking + Notion / Confluence for documentation + Excel / Sheets for status reporting + Slack for cross-team coordination. Hiring stage: common across mid-sized and larger Israeli companies in cross-functional capacity — monday.com (the company), Wix, JFrog, Amdocs, NICE Systems, Cellebrite, Lemonade. Less common at small startups (under ~30 employees) where individual PMs / EMs handle project work."
      }
    },
    {
      "id": "technical_project_manager",
      "standardized_title": "Technical Project Manager",
      "alternate_titles": [
        "TPM",
        "Senior Technical Project Manager",
        "Engineering Program Manager"
      ],
      "role_family": "Operations",
      "secondary_family": "Engineering",
      "seniority": "Senior",
      "core_purpose": "Lead delivery of technically complex projects by translating business goals into structured execution plans across engineering and business teams.",
      "core_responsibilities": [
        "Manage technically complex projects end-to-end",
        "Translate technical requirements into plans, scope, and deliverables",
        "Coordinate engineering, product, infrastructure, and operations stakeholders",
        "Track technical blockers, risks, and dependencies",
        "Drive execution quality across technical workstreams"
      ],
      "required_skills": [
        "project_management",
        "technical_communication",
        "stakeholder_management",
        "risk_management"
      ],
      "preferred_skills": [
        "api_integrations",
        "delivery_execution",
        "systems_thinking",
        "process_improvement"
      ],
      "tools": [
        "Jira",
        "Confluence",
        "Monday",
        "Asana",
        "project_management_tools"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Execution",
        "Delivery",
        "Implementation"
      ],
      "typical_backgrounds": [
        "project_management",
        "engineering",
        "technical_operations"
      ],
      "next_roles": [
        "program_manager",
        "product_manager"
      ],
      "similar_roles": [
        "program_manager",
        "project_manager",
        "engineering_manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Product Analyst"
      ],
      "keywords": [
        "technical delivery",
        "engineering coordination",
        "system requirements",
        "technical dependencies",
        "implementation",
        "execution"
      ],
      "years_experience_typical": "5-9",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: engineering promotion to project leadership, ex-consultants with technical specialization, former PMs with strong engineering depth. Stack patterns: Jira / Linear / Notion / Confluence / Slack + technical documentation + cross-team coordination tools. Hiring stage: most common at scale-ups and unicorns with substantial cross-team engineering work — monday.com, JFrog, Wix, AppsFlyer, Wiz, Check Point, CyberArk, SentinelOne, Cellebrite, Amdocs, NICE Systems. Often manages multi-team engineering initiatives, infrastructure migrations, or platform programs."
      }
    },
    {
      "id": "program_manager",
      "standardized_title": "Program Manager",
      "alternate_titles": [
        "Senior Program Manager",
        "Strategic Program Manager",
        "Engineering Program Manager"
      ],
      "role_family": "Operations",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Coordinate multiple related projects or workstreams to achieve broader strategic business outcomes.",
      "core_responsibilities": [
        "Own multi-project program execution and alignment",
        "Coordinate workstreams across multiple teams and stakeholders",
        "Drive program governance, reporting, and execution cadence",
        "Manage risks, dependencies, and strategic tradeoffs across the program",
        "Ensure initiatives stay aligned with broader business goals"
      ],
      "required_skills": [
        "program_management",
        "stakeholder_management",
        "cross_functional_alignment",
        "risk_management"
      ],
      "preferred_skills": [
        "project_management",
        "operational_management",
        "executive_communication",
        "strategic_planning"
      ],
      "tools": [
        "Jira",
        "Confluence",
        "roadmapping_tools",
        "dashboards",
        "project_management_tools"
      ],
      "technical_depth": "Medium_High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical_Strategic",
      "lifecycle_stage": [
        "Planning",
        "Execution",
        "Governance"
      ],
      "typical_backgrounds": [
        "project_management",
        "technical_project_management",
        "operations"
      ],
      "next_roles": [
        "product_operations_manager"
      ],
      "similar_roles": [
        "technical_project_manager",
        "project_manager",
        "engineering_group_manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Product Operations Manager"
      ],
      "keywords": [
        "program",
        "multi-project",
        "governance",
        "cross-functional",
        "strategic initiatives",
        "dependencies",
        "cadence"
      ],
      "years_experience_typical": "6-10",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: senior project manager promotion, ex-consultants with operational specialization, engineering managers pivoting to cross-functional programs. Stack patterns: Asana / Monday / Jira + Looker / Mode for program-level metrics + Notion for documentation + heavy cross-functional facilitation. Hiring stage: most common at unicorns and large scale-ups — monday.com, JFrog, Wix, AppsFlyer, Check Point, CyberArk, SentinelOne, Amdocs, NICE Systems, Cellebrite, Wiz. Often runs strategic cross-org programs (large customer migrations, compliance initiatives, M&A integration)."
      }
    },
    {
      "id": "product_manager",
      "standardized_title": "Product Manager",
      "alternate_titles": [
        "PM",
        "Product Manager",
        "Senior Associate PM"
      ],
      "role_family": "Product",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Define what should be built and why by aligning user needs, business goals, and product strategy.",
      "core_responsibilities": [
        "Own product discovery, prioritization, and roadmap decisions",
        "Translate customer and market needs into product requirements",
        "Partner with design and engineering to deliver product features",
        "Define product success metrics and evaluate outcomes",
        "Align internal stakeholders around product direction and tradeoffs"
      ],
      "required_skills": [
        "product_strategy",
        "roadmap_prioritization",
        "customer_research",
        "cross_functional_collaboration"
      ],
      "preferred_skills": [
        "market_analysis",
        "kpi_definition",
        "product_communication",
        "data_informed_decision_making"
      ],
      "tools": [
        "Jira",
        "Confluence",
        "roadmapping_tools",
        "analytics_tools",
        "product_docs"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "mba_graduate",
        "former_consultant",
        "apm_promotion",
        "engineer_pivot",
        "marketing_pivot"
      ],
      "next_roles": [
        "technical_product_manager",
        "product_operations_manager"
      ],
      "similar_roles": [
        "technical_product_manager",
        "product_operations_manager",
        "growth_marketing_manager",
        "solutions_engineer"
      ],
      "not_to_confuse_with": [
        "Senior Product Manager",
        "Technical Product Manager",
        "Product Owner"
      ],
      "keywords": [
        "roadmap",
        "product strategy",
        "user research",
        "cross-functional",
        "prioritization"
      ],
      "years_experience_typical": "3-6",
      "market_notes": {
        "israel": "Backgrounds: MBAs from Reichman / IDC / TAU / Wharton-TLV, ex-consultants from McKinsey / BCG / Bain Israel, APM promotions, engineer / designer / data scientist pivots. Stack patterns: Jira + Figma + Mixpanel / Amplitude for product analytics, SQL for data work, increasingly Notion + Linear for spec writing; strong English plus US time-zone availability since most Israeli startups sell internationally. Hiring stage: one of the most common product roles across every B2B and consumer scale-up. Heavy across cyber (Wiz, Check Point, CyberArk, SentinelOne), SaaS (monday.com, Wix, JFrog, Fiverr, Gong, HiBob, AppsFlyer), AI (AI21 Labs, Run:ai, Hailo, Aidoc), FinTech (Lemonade, Payoneer, eToro, Forter, Tipalti), and consumer apps (Lightricks, Plarium, Playtika)."
      },
      "_research_method": "web_search"
    },
    {
      "id": "technical_product_manager",
      "standardized_title": "Technical Product Manager",
      "alternate_titles": [
        "TPM",
        "Platform PM",
        "Infrastructure PM",
        "API Product Manager"
      ],
      "role_family": "Product",
      "secondary_family": "Engineering",
      "seniority": "Senior",
      "core_purpose": "Own product direction for technically complex products by combining product judgment with strong engineering and systems understanding.",
      "core_responsibilities": [
        "Own roadmap and requirements for technically complex product areas",
        "Translate customer and business needs into technically viable product direction",
        "Partner deeply with engineering on architecture, APIs, systems, and tradeoffs",
        "Define success metrics and evaluate technical product outcomes",
        "Support prioritization across technical complexity, user value, and business impact"
      ],
      "required_skills": [
        "product_strategy",
        "technical_communication",
        "roadmap_prioritization",
        "systems_thinking"
      ],
      "preferred_skills": [
        "api_integrations",
        "customer_research",
        "data_informed_decision_making",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Jira",
        "Confluence",
        "roadmapping_tools",
        "analytics_tools",
        "technical_docs"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "engineer_pivot",
        "pm_with_technical_depth",
        "8200_alumni"
      ],
      "next_roles": [
        "product_manager"
      ],
      "similar_roles": [
        "product_manager",
        "senior_product_manager",
        "solutions_engineering_manager",
        "staff_engineer"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Engineering Manager",
        "Technical Project Manager"
      ],
      "keywords": [
        "platform PM",
        "API PM",
        "infrastructure",
        "developer-facing",
        "technical product"
      ],
      "years_experience_typical": "5-9",
      "market_notes": {
        "israel": "Backgrounds: senior engineers / staff engineers pivoting to product, or PMs with strong CS / engineering backgrounds. Unit 8200 / 81 / Mamram alumni over-represented given technical depth required. Stack patterns: API-first thinking, developer documentation, technical roadmap work; comfort with engineering tooling (Git, monitoring dashboards, internal CLI / SDK reviews). Hiring stage: common in infrastructure, developer tools, cyber platforms, and API-first SaaS where the buyer is a developer or architect. Heavy at cyber (Wiz, Check Point, CyberArk, SentinelOne, Aqua Security, Orca, Snyk), DevTools (JFrog, Coralogix, Logz.io, Cloudinary), AI infrastructure (Run:ai, AI21 Labs, Hailo), and data platforms (WEKA, Firebolt)."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "product_analyst",
      "standardized_title": "Product Analyst",
      "alternate_titles": [
        "Product Data Analyst",
        "Senior Product Analyst",
        "Growth Analyst"
      ],
      "role_family": "Product",
      "secondary_family": "Data",
      "seniority": "Mid",
      "core_purpose": "Turn product and user data into actionable insights that improve product decisions, experiments, and performance.",
      "core_responsibilities": [
        "Analyze user behavior, funnels, retention, adoption, and feature performance",
        "Build dashboards, reports, and KPI frameworks for product decision-making",
        "Design and evaluate experiments such as A/B tests",
        "Translate ambiguous product questions into structured analytical approaches",
        "Partner with product, R&D, and business teams to support data-informed decisions"
      ],
      "required_skills": [
        "sql_advanced",
        "product_metrics",
        "ab_testing",
        "data_storytelling"
      ],
      "preferred_skills": [
        "dashboard_building",
        "user_behavior_analysis",
        "cohort_retention_analysis",
        "statistical_validation"
      ],
      "tools": [
        "SQL",
        "Looker",
        "Tableau",
        "Power BI",
        "Mixpanel",
        "Amplitude"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "data_analyst_pivot",
        "engineering_pivot",
        "mba_with_analytics"
      ],
      "next_roles": [
        "product_manager"
      ],
      "similar_roles": [
        "data_analyst",
        "business_intelligence_analyst",
        "associate_product_manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Data Analyst"
      ],
      "keywords": [
        "product analytics",
        "Mixpanel",
        "Amplitude",
        "experimentation",
        "funnel analysis"
      ],
      "years_experience_typical": "2-5",
      "market_notes": {
        "israel": "Backgrounds: data analyst pivots, engineering pivots, MBAs with analytics specialization. Often forks into PM track for analysts who develop strong product intuition. Stack patterns: Amplitude / Mixpanel for product analytics, SQL + dbt for data modeling, Looker / Mode / Hex for dashboards, Python or R for statistical analysis. Hiring stage: clusters at consumer scale-ups (Lightricks, Plarium, Playtika), B2B SaaS (monday.com, Wix, Fiverr, Gong, HiBob), and FinTech (Lemonade, Payoneer, eToro, Tipalti) where deep user-behavior analysis directly drives product decisions. Often paired closely with one or two PMs as a partnership rather than working horizontally across the org."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "sales_development_representative",
      "standardized_title": "Sales Development Representative",
      "alternate_titles": [
        "SDR",
        "Sales Development Rep",
        "Outbound SDR",
        "Inbound SDR"
      ],
      "role_family": "Sales",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Generate and qualify leads to build the sales pipeline through outbound prospecting and inbound lead management.",
      "core_responsibilities": [
        "Execute outbound prospecting via cold calling, email, and LinkedIn",
        "Qualify inbound leads and manage early sales funnel activities",
        "Book qualified meetings and demos for Account Executives",
        "Conduct initial discovery conversations with prospects",
        "Maintain accurate records in CRM systems",
        "Collaborate with Marketing on targeting and messaging",
        "Meet or exceed pipeline generation targets"
      ],
      "required_skills": [
        "outbound_prospecting",
        "lead_qualification",
        "cold_calling",
        "customer_communication",
        "organization"
      ],
      "preferred_skills": [
        "linkedin_outreach",
        "sales_tools_proficiency",
        "crm_management",
        "objection_handling"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "Salesloft",
        "Outreach",
        "LinkedIn Sales Navigator",
        "email"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Pipeline Generation"
      ],
      "typical_backgrounds": [
        "customer_service",
        "retail",
        "sales",
        "business_development",
        "recent_graduate"
      ],
      "next_roles": [
        "account_executive",
        "business_development_representative",
        "customer_success_associate"
      ],
      "similar_roles": [
        "business_development_representative",
        "sales_associate"
      ],
      "not_to_confuse_with": [
        "Account Executive",
        "Customer Success Manager"
      ],
      "keywords": [
        "cold calling",
        "outbound",
        "prospecting",
        "pipeline",
        "SDR",
        "lead generation",
        "meetings booked",
        "quota",
        "CRM",
        "discovery"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates from Reichman / IDC / TAU / Wharton-TLV business programs, IDF veterans pivoting to commercial roles, ex-military officers; English fluency at near-native level is a hard requirement. Stack patterns: Salesforce + Outreach / Salesloft + LinkedIn Sales Navigator + ZoomInfo / Lusha (Israeli-headquartered tooling popular). Hiring stage: ubiquitous entry-level commercial role across B2B SaaS and cyber. Common at scale-ups and unicorns selling into US (Wiz, Check Point, monday.com, JFrog, Gong, HiBob, AppsFlyer, Forter, Lemonade). Typically work US hours given target market. Career path forks to AE within 12-24 months."
      }
    },
    {
      "id": "business_development_representative",
      "standardized_title": "Business Development Representative",
      "alternate_titles": [
        "BDR",
        "Business Development Rep",
        "BDR/SDR"
      ],
      "role_family": "Sales",
      "secondary_family": "BD_Partnerships",
      "seniority": "Entry",
      "core_purpose": "Identify and create new business opportunities through strategic outbound prospecting, market research, and target account engagement.",
      "core_responsibilities": [
        "Research and identify target accounts and key decision-makers",
        "Execute outbound prospecting across email, phone, LinkedIn, and social channels",
        "Qualify prospects using BANT or similar frameworks",
        "Schedule meetings for the sales team",
        "Collaborate with Marketing on campaigns and messaging",
        "Maintain CRM data and report on pipeline activity",
        "Stay current on industry trends and competitor landscape"
      ],
      "required_skills": [
        "outbound_prospecting",
        "lead_qualification",
        "linkedin_outreach",
        "customer_communication",
        "organization"
      ],
      "preferred_skills": [
        "cold_calling",
        "sales_tools_proficiency",
        "crm_management",
        "market_research"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "LinkedIn Sales Navigator",
        "Outreach",
        "Salesloft",
        "ZoomInfo",
        "Clay"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Pipeline Generation"
      ],
      "typical_backgrounds": [
        "sales",
        "customer_service",
        "marketing",
        "recent_graduate"
      ],
      "next_roles": [
        "account_executive",
        "customer_success_manager",
        "sales_manager"
      ],
      "similar_roles": [
        "sales_development_representative",
        "sales_associate"
      ],
      "not_to_confuse_with": [
        "Account Executive",
        "Account Manager"
      ],
      "keywords": [
        "outbound",
        "prospecting",
        "pipeline",
        "BDR",
        "lead generation",
        "discovery",
        "qualification",
        "meetings booked",
        "cold outreach"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: same talent pool as SDR — recent business / liberal arts graduates, IDF veterans, junior-level commercial pivots. The BDR vs SDR distinction is often nominal in Israeli companies; some use BDR for partnership outreach, SDR for direct prospecting. Stack patterns: Salesforce + Outreach / Salesloft + LinkedIn Sales Navigator + ZoomInfo / Lusha. Hiring stage: common across B2B SaaS and cyber selling internationally. Heavy at Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, Gong, HiBob, AppsFlyer, Forter, Payoneer, Riskified. US-hours work standard."
      }
    },
    {
      "id": "account_executive",
      "standardized_title": "Account Executive",
      "alternate_titles": [
        "AE",
        "Mid-Market Account Executive",
        "SMB Account Executive"
      ],
      "role_family": "Sales",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own the full sales cycle from discovery through close, converting qualified leads into paying customers and meeting revenue targets.",
      "core_responsibilities": [
        "Run discovery calls and product demos with qualified prospects",
        "Manage deals end-to-end from first contact through contract signing",
        "Build and maintain an accurate sales pipeline in CRM",
        "Identify and pursue outbound opportunities alongside inbound leads",
        "Negotiate and close contracts with business decision-makers",
        "Collaborate with SDR/BDR teams on pipeline generation",
        "Meet or exceed quarterly revenue quota"
      ],
      "required_skills": [
        "discovery_calls",
        "consultative_selling",
        "deal_closing",
        "pipeline_management",
        "quota_attainment",
        "customer_communication"
      ],
      "preferred_skills": [
        "saas_sales",
        "objection_handling",
        "crm_management",
        "sales_tools_proficiency",
        "negotiation"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "Outreach",
        "Salesloft",
        "LinkedIn Sales Navigator",
        "ZoomInfo"
      ],
      "technical_depth": "Low-Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Pipeline Conversion",
        "Deal Closing"
      ],
      "typical_backgrounds": [
        "sdr",
        "bdr",
        "customer_success",
        "sales"
      ],
      "next_roles": [
        "senior_account_executive",
        "sales_manager",
        "customer_success_manager"
      ],
      "similar_roles": [
        "senior_account_executive",
        "sales_representative",
        "sales_engineer"
      ],
      "not_to_confuse_with": [
        "Account Manager",
        "Customer Success Manager",
        "Sales Development Representative"
      ],
      "keywords": [
        "quota",
        "closing",
        "discovery",
        "demo",
        "pipeline",
        "revenue",
        "AE",
        "full cycle",
        "SaaS sales",
        "B2B",
        "deal closing"
      ],
      "years_experience_typical": "2-5",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: promoted SDRs / SRs after 2-3 years, sometimes external hires with B2B SaaS sales experience. Strong English (often near-native) for North American account ownership. Stack patterns: Salesforce + Gong + Outreach + LinkedIn Sales Navigator + ZoomInfo + DealHub / PandaDoc; increasingly Clari for forecasting. Most AEs work US hours given that Israeli SaaS / cyber sells primarily into US — Tel Aviv-based AEs cover EMEA accounts, US-based AEs cover NA. Hiring stage: ubiquitous role across B2B SaaS and cyber. Heavy at Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, Gong, HiBob, AppsFlyer, Forter, Lemonade, Tipalti, Riskified."
      }
    },
    {
      "id": "senior_account_executive",
      "standardized_title": "Senior Account Executive",
      "alternate_titles": [
        "Senior AE",
        "Strategic Account Executive",
        "Senior Sales Representative"
      ],
      "role_family": "Sales",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Own complex, high-value sales cycles with mid-market and enterprise accounts, driving significant revenue and shaping sales strategy.",
      "core_responsibilities": [
        "Run full sales cycles for mid-market and enterprise accounts",
        "Navigate multi-stakeholder deals involving procurement, legal, and C-suite",
        "Self-source a portion of pipeline through strategic outbound",
        "Develop account plans and expansion strategies",
        "Deliver compelling demos and ROI-focused presentations to senior buyers",
        "Forecast pipeline accurately and contribute to revenue planning",
        "Contribute to sales playbook and best practices"
      ],
      "required_skills": [
        "enterprise_sales",
        "consultative_selling",
        "deal_closing",
        "pipeline_management",
        "quota_attainment",
        "stakeholder_management",
        "negotiation"
      ],
      "preferred_skills": [
        "saas_sales",
        "sales_forecasting",
        "outbound_prospecting",
        "crm_management",
        "executive_relationships"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "LinkedIn Sales Navigator",
        "Outreach",
        "Clari",
        "ZoomInfo"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Pipeline Conversion",
        "Deal Closing",
        "Account Expansion"
      ],
      "typical_backgrounds": [
        "account_executive",
        "sales",
        "customer_success"
      ],
      "next_roles": [
        "sales_manager",
        "sales_director",
        "enterprise_account_executive"
      ],
      "similar_roles": [
        "account_executive",
        "enterprise_account_executive",
        "sales_manager"
      ],
      "not_to_confuse_with": [
        "Enterprise Account Executive",
        "Sales Manager"
      ],
      "keywords": [
        "enterprise",
        "mid-market",
        "quota",
        "closing",
        "multi-stakeholder",
        "complex sales",
        "full cycle",
        "ACV",
        "C-suite",
        "revenue"
      ],
      "years_experience_typical": "5-9",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: promoted AEs after 3-5 years with strong quota track record; external hires from larger Israeli or US tech companies. Stack patterns: typical AE tooling plus heavier MEDDIC / MEDDPICC discipline; deeper account planning in Salesforce / Clari; closer SE pairing. Hiring stage: typically owns larger / strategic mid-market accounts at scale-ups and unicorns. Heavy at Wiz, Check Point, CyberArk, SentinelOne, JFrog, monday.com, Gong, AppsFlyer, HiBob, Forter, Payoneer. Career path: enterprise_account_executive, sales_manager, or strategic account specialization."
      }
    },
    {
      "id": "enterprise_account_executive",
      "standardized_title": "Enterprise Account Executive",
      "alternate_titles": [
        "Enterprise AE",
        "Strategic AE",
        "Major Account Executive",
        "Global Account Executive"
      ],
      "role_family": "Sales",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Close large, complex enterprise deals with senior decision-makers across long sales cycles, driving strategic revenue growth.",
      "core_responsibilities": [
        "Own full sales cycle for enterprise accounts with 3-12 month deal timelines",
        "Navigate complex multi-stakeholder buying committees (C-suite, procurement, legal, security)",
        "Build and execute strategic account plans",
        "Self-source pipeline through targeted outbound and network leverage",
        "Deliver executive-level presentations and business case ROI justifications",
        "Negotiate and close high-ACV contracts",
        "Partner with Sales Engineers and Solutions teams on technical validation",
        "Contribute to sales strategy and playbook development"
      ],
      "required_skills": [
        "enterprise_sales",
        "consultative_selling",
        "deal_closing",
        "executive_relationships",
        "stakeholder_management",
        "negotiation",
        "pipeline_management"
      ],
      "preferred_skills": [
        "saas_sales",
        "sales_forecasting",
        "outbound_prospecting",
        "business_understanding",
        "crm_management"
      ],
      "tools": [
        "Salesforce",
        "LinkedIn Sales Navigator",
        "Clari",
        "Outreach",
        "ZoomInfo",
        "Gong"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Pipeline Conversion",
        "Deal Closing",
        "Account Expansion"
      ],
      "typical_backgrounds": [
        "senior_account_executive",
        "sales",
        "consulting",
        "solutions_engineering"
      ],
      "next_roles": [
        "sales_director",
        "vp_sales",
        "sales_manager"
      ],
      "similar_roles": [
        "senior_account_executive",
        "sales_manager",
        "channel_partner_manager"
      ],
      "not_to_confuse_with": [
        "Senior Account Executive",
        "Sales Manager"
      ],
      "keywords": [
        "enterprise",
        "large deals",
        "ACV",
        "C-suite",
        "multi-stakeholder",
        "complex sales cycle",
        "quota",
        "strategic accounts",
        "full cycle",
        "land and expand"
      ],
      "years_experience_typical": "8-15",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: senior AE promotion or external enterprise sales hire; often 8-15 years of total commercial experience including time at major US / EMEA enterprise software companies. Stack patterns: heavy MEDDIC / Force Management framework discipline; complex deal-cycle management; close partnership with SE, CS, and exec sponsors. Hiring stage: enterprise sales is a strong Israeli specialty given the volume of enterprise-targeting cyber and SaaS companies. Heavy at Wiz, Check Point, CyberArk, SentinelOne, JFrog, Amdocs, NICE Systems, Cellebrite, monday.com (enterprise tier), Sapiens, Earnix."
      }
    },
    {
      "id": "sales_manager",
      "standardized_title": "Sales Manager",
      "alternate_titles": [
        "Sales Team Lead",
        "Manager of Sales",
        "Regional Sales Manager"
      ],
      "role_family": "Sales",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "Lead and develop a sales team to consistently achieve revenue targets, coaching individual sellers while managing deals and pipeline.",
      "core_responsibilities": [
        "Lead, mentor, and develop a team of AEs or SDRs",
        "Monitor team pipeline and ensure accurate forecasting",
        "Support reps on complex deals and key accounts",
        "Define and implement sales processes and best practices",
        "Run regular deal reviews, pipeline reviews, and coaching sessions",
        "Collaborate with Marketing, Product, and CS on GTM alignment",
        "Recruit and onboard new sales team members",
        "Report on team performance to senior leadership"
      ],
      "required_skills": [
        "sales_team_leadership",
        "pipeline_management",
        "coaching",
        "sales_forecasting",
        "people_management",
        "consultative_selling"
      ],
      "preferred_skills": [
        "crm_management",
        "recruitment",
        "cross_functional_collaboration",
        "negotiation",
        "enterprise_sales"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "Gong",
        "Clari",
        "LinkedIn Sales Navigator"
      ],
      "technical_depth": "Low-Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Team",
      "strategic_level": "Management",
      "lifecycle_stage": [
        "Pipeline Generation",
        "Pipeline Conversion",
        "Deal Closing"
      ],
      "typical_backgrounds": [
        "account_executive",
        "senior_account_executive",
        "sales"
      ],
      "next_roles": [
        "sales_director",
        "vp_sales"
      ],
      "similar_roles": [
        "sales_director",
        "senior_account_executive",
        "solutions_engineering_manager"
      ],
      "not_to_confuse_with": [
        "Sales Director",
        "Account Executive"
      ],
      "keywords": [
        "team leadership",
        "quota",
        "coaching",
        "pipeline",
        "revenue",
        "forecasting",
        "deal reviews",
        "sales manager",
        "people management"
      ],
      "years_experience_typical": "5-10",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: senior AE promotion (most common), external sales manager hire from another B2B SaaS / cyber company. Stack patterns: people management on top of typical AE tooling — Lattice / 15Five for performance; Gong / Chorus for call review; Salesforce dashboards and Clari for forecasting; quarterly business reviews and pipeline reviews. Hiring stage: standard at scale-ups (Series B+) and unicorns — manages 4-8 AEs across a segment, region, or product line. Heavy at the major Israeli B2B exporters (Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, Gong, HiBob, AppsFlyer, Forter, Payoneer). Often US-hours work for managers covering NA territory."
      }
    },
    {
      "id": "sales_director",
      "standardized_title": "Sales Director",
      "alternate_titles": [
        "Director of Sales",
        "Regional Sales Director",
        "Senior Sales Director"
      ],
      "role_family": "Sales",
      "secondary_family": "Leadership",
      "seniority": "Director_Head",
      "core_purpose": "Own the sales function or a significant segment of it, defining strategy, managing managers, and driving revenue growth at scale.",
      "core_responsibilities": [
        "Define and execute sales strategy for a territory, segment, or product line",
        "Lead and develop a team of sales managers and/or senior AEs",
        "Own revenue targets and sales forecast for the function",
        "Build and refine sales processes, playbooks, and methodologies",
        "Partner with Marketing, Product, and CS on GTM strategy",
        "Engage directly in strategic deals and key accounts",
        "Recruit and develop top sales talent",
        "Report on sales performance to executive leadership"
      ],
      "required_skills": [
        "sales_team_leadership",
        "sales_forecasting",
        "go_to_market_strategy",
        "people_management",
        "enterprise_sales",
        "stakeholder_management",
        "negotiation"
      ],
      "preferred_skills": [
        "cross_functional_alignment",
        "executive_relationships",
        "expansion_strategy",
        "crm_management",
        "commercial_mindset"
      ],
      "tools": [
        "Salesforce",
        "Gong",
        "Clari",
        "LinkedIn Sales Navigator",
        "HubSpot"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium-High",
      "revenue_ownership": "Function",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Pipeline Generation",
        "Pipeline Conversion",
        "Deal Closing",
        "Account Expansion"
      ],
      "typical_backgrounds": [
        "sales_manager",
        "senior_account_executive",
        "enterprise_account_executive"
      ],
      "next_roles": [
        "vp_sales",
        "chief_revenue_officer"
      ],
      "similar_roles": [
        "sales_manager",
        "vp_sales",
        "head_of_solutions_engineering"
      ],
      "not_to_confuse_with": [
        "VP Sales",
        "Sales Manager"
      ],
      "keywords": [
        "sales strategy",
        "revenue",
        "team leadership",
        "forecasting",
        "pipeline",
        "playbooks",
        "director",
        "GTM",
        "quota",
        "sales org"
      ],
      "years_experience_typical": "10-15",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: sales manager promotion or external director hire; often 2-3 prior cycles at scale-ups or US SaaS companies. Stack patterns: manager-of-managers focus; org-design and territory planning; quarterly board reporting on commercial metrics. Hiring stage: typically at scale-ups and unicorns with ~30+ AEs across multiple regions or segments — Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, AppsFlyer, Gong, HiBob, Cellebrite, Amdocs, NICE Systems. Reports to VP Sales / CRO."
      }
    },
    {
      "id": "vp_sales",
      "standardized_title": "VP of Sales",
      "alternate_titles": [
        "VP of Sales",
        "Chief Revenue Officer",
        "CRO",
        "Head of Sales"
      ],
      "role_family": "Sales",
      "secondary_family": "Leadership",
      "seniority": "VP_Executive",
      "core_purpose": "Own the entire sales organization and revenue engine, setting global strategy, building the team, and driving company-level ARR growth.",
      "core_responsibilities": [
        "Define and execute the global sales strategy",
        "Own ARR targets and company revenue accountability",
        "Build, scale, and lead the sales organization (AEs, SDRs, SMs)",
        "Establish sales culture, KPIs, and performance standards",
        "Partner with CEO and executive team on GTM and company strategy",
        "Drive channel partnerships and strategic alliances",
        "Oversee sales forecasting, planning, and reporting",
        "Recruit and develop senior sales leadership"
      ],
      "required_skills": [
        "sales_team_leadership",
        "go_to_market_strategy",
        "sales_forecasting",
        "executive_leadership",
        "people_management",
        "enterprise_sales",
        "commercial_mindset",
        "organizational_design"
      ],
      "preferred_skills": [
        "channel_partner_management",
        "expansion_strategy",
        "cross_functional_exec_presence",
        "executive_relationships",
        "retention_strategy"
      ],
      "tools": [
        "Salesforce",
        "Gong",
        "Clari",
        "LinkedIn Sales Navigator"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Company",
      "strategic_level": "Executive",
      "lifecycle_stage": [
        "Pipeline Generation",
        "Pipeline Conversion",
        "Deal Closing",
        "Account Expansion"
      ],
      "typical_backgrounds": [
        "sales_director",
        "vp_sales",
        "enterprise_account_executive"
      ],
      "next_roles": [
        "chief_revenue_officer",
        "ceo"
      ],
      "similar_roles": [
        "sales_director",
        "head_of_solutions_engineering",
        "vp_marketing"
      ],
      "not_to_confuse_with": [
        "Sales Director",
        "Chief Revenue Officer"
      ],
      "keywords": [
        "ARR",
        "revenue",
        "global sales",
        "sales org",
        "executive",
        "GTM strategy",
        "VP",
        "quota",
        "scale",
        "team building"
      ],
      "years_experience_typical": "12-20",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: sales director promotion or external VP Sales / CRO hire from larger Israeli or US tech companies; often 2-3 prior cycles. Stack patterns: org-level commercial strategy, ICP definition, comp plan design, forecasting discipline; board-level commercial reporting. Hiring stage: critical hire at any company past ~30 commercial headcount. Often the founding sales leader at very early-stage companies evolves into VP Sales as the org scales. At scale-ups and unicorns frequently filled by external senior hires from US-headquartered SaaS or cyber. CRO title increasingly common at companies with combined Sales + Marketing + RevOps reporting under one executive."
      }
    },
    {
      "id": "sales_operations_manager",
      "standardized_title": "Sales Operations Manager",
      "alternate_titles": [
        "Sales Ops Manager",
        "Revenue Operations Manager",
        "Senior Sales Ops"
      ],
      "role_family": "Operations",
      "secondary_family": "RevOps_BizOps",
      "seniority": "Mid",
      "core_purpose": "Enable sales team efficiency and effectiveness through process optimization, data analysis, CRM management, and revenue systems.",
      "core_responsibilities": [
        "Manage and optimize CRM systems and data hygiene",
        "Build dashboards and reports on sales performance and pipeline health",
        "Identify bottlenecks in the sales funnel and implement improvements",
        "Design and maintain sales processes, workflows, and playbooks",
        "Partner with Sales, Marketing, and Finance on GTM alignment",
        "Manage sales tech stack and tool integrations",
        "Support quota setting, territory design, and compensation planning"
      ],
      "required_skills": [
        "revenue_operations",
        "crm_management",
        "data_analysis",
        "process_improvement",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "sql",
        "dashboarding",
        "marketing_analytics",
        "cross_functional_collaboration",
        "systems_thinking"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "Gong",
        "ZoomInfo",
        "Clay",
        "Tableau",
        "Excel",
        "SQL"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Operations"
      ],
      "typical_backgrounds": [
        "business_analyst",
        "sales_operations",
        "data_analyst",
        "consultant"
      ],
      "next_roles": [
        "director_revenue_operations",
        "vp_sales_operations"
      ],
      "similar_roles": [
        "revops_manager",
        "business_ops_manager",
        "revops_analyst"
      ],
      "not_to_confuse_with": [
        "Sales Manager",
        "Business Operations Manager"
      ],
      "keywords": [
        "revops",
        "CRM",
        "pipeline",
        "forecasting",
        "salesforce",
        "GTM",
        "process",
        "analytics",
        "sales operations",
        "reporting"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: sales ops analyst promotion, ex-consultants with commercial focus, sometimes former AEs or sales managers pivoting to operations. Stack patterns: Salesforce administration + CPQ tools (DealHub, Salesforce CPQ) + LeanData / Default for routing + Outreach / Salesloft for cadence + Clari / Boostup for forecasting + heavy Excel / Sheets. Hiring stage: ubiquitous at B2B SaaS and cyber scale-ups — monday.com, JFrog, Gong, HiBob, AppsFlyer, Wiz, Check Point, CyberArk, SentinelOne, Forter, Tipalti, Lemonade."
      }
    },
    {
      "id": "channel_partner_manager",
      "standardized_title": "Channel Partner Manager",
      "alternate_titles": [
        "Channel Sales Manager",
        "Partner Sales Manager",
        "Channel Account Manager"
      ],
      "role_family": "Sales",
      "secondary_family": "BD_Partnerships",
      "seniority": "Mid",
      "core_purpose": "Build and manage relationships with channel partners, resellers, and strategic alliances to drive indirect revenue growth.",
      "core_responsibilities": [
        "Identify, recruit, and onboard new channel partners",
        "Manage relationships with existing partners to drive revenue",
        "Develop and execute joint go-to-market plans with partners",
        "Enable partners with training, tools, and sales collateral",
        "Monitor partner pipeline and performance against targets",
        "Collaborate cross-functionally with Sales, Marketing, and Product",
        "Negotiate partnership agreements and commercial terms"
      ],
      "required_skills": [
        "channel_partner_management",
        "relationship_building",
        "negotiation",
        "stakeholder_management",
        "pipeline_management"
      ],
      "preferred_skills": [
        "go_to_market_strategy",
        "saas_sales",
        "sales_enablement",
        "crm_management",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "LinkedIn",
        "PRM tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Pipeline Generation",
        "Account Expansion"
      ],
      "typical_backgrounds": [
        "account_executive",
        "account_manager",
        "business_development",
        "customer_success"
      ],
      "next_roles": [
        "director_partnerships",
        "sales_director",
        "vp_sales"
      ],
      "similar_roles": [
        "account_executive",
        "partnerships_manager",
        "business_development_manager"
      ],
      "not_to_confuse_with": [
        "Account Executive",
        "Customer Success Manager"
      ],
      "keywords": [
        "partners",
        "channel",
        "resellers",
        "alliances",
        "partner pipeline",
        "enablement",
        "joint GTM",
        "partnerships",
        "indirect sales"
      ],
      "years_experience_typical": "4-8",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: AE pivots to indirect / partner sales, or external channel sales hires; strong understanding of partner economics + commercial discipline. Stack patterns: Salesforce + PartnerStack / Allbound / Impartner for partner relationship management; channel-specific MEDDIC variants; partner enablement content creation. Hiring stage: most common at cyber (Wiz, Check Point, CyberArk, SentinelOne, Cybereason, Aqua Security) and infrastructure SaaS (JFrog, Snyk, Wiz, Cellebrite) where channel is a major go-to-market motion. Less common at consumer-facing or product-led-growth companies."
      }
    },
    {
      "id": "marketing_coordinator",
      "standardized_title": "Marketing Coordinator",
      "alternate_titles": [
        "Marketing Operations Coordinator",
        "Junior Marketing Coordinator"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support marketing operations by coordinating campaigns, creating content, managing social channels, and assisting with events.",
      "core_responsibilities": [
        "Create and publish marketing content across channels",
        "Manage social media accounts and content calendars",
        "Coordinate event planning and logistics",
        "Assist with campaign execution and reporting",
        "Work with external vendors and agencies",
        "Support market research and competitive analysis",
        "Use AI and design tools to produce marketing assets"
      ],
      "required_skills": [
        "content_strategy",
        "social_media_management",
        "organization",
        "copywriting",
        "customer_communication"
      ],
      "preferred_skills": [
        "canva_design_tools",
        "ai_tools_marketing",
        "event_marketing",
        "marketing_analytics",
        "b2b_marketing"
      ],
      "tools": [
        "Canva",
        "WordPress",
        "Hootsuite",
        "Buffer",
        "Google Analytics",
        "Mailchimp",
        "AI tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low-Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Awareness",
        "Engagement"
      ],
      "typical_backgrounds": [
        "marketing_student",
        "communications",
        "content_creator",
        "social_media"
      ],
      "next_roles": [
        "marketing_manager",
        "social_media_manager",
        "content_marketing_manager"
      ],
      "similar_roles": [
        "marketing_manager",
        "event_coordinator",
        "social_media_coordinator"
      ],
      "not_to_confuse_with": [
        "Marketing Manager",
        "Social Media Manager"
      ],
      "keywords": [
        "content creation",
        "social media",
        "campaigns",
        "events",
        "coordination",
        "Canva",
        "marketing assistant",
        "content calendar"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: marketing assistant promotions or external hires with 1-3 years of B2B marketing operations experience. Stack patterns: HubSpot / Marketo administration, light Salesforce, email campaign management, Asana / Monday for project work. Hiring stage: common at scale-ups with structured marketing functions — monday.com, Wix, JFrog, Fiverr, Lemonade, AppsFlyer, Gong, HiBob. Often a stepping stone to specialist marketing roles (content, demand gen, lifecycle)."
      }
    },
    {
      "id": "marketing_manager",
      "standardized_title": "Marketing Manager",
      "alternate_titles": [
        "Marketing Lead",
        "Senior Marketing Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Plan and execute multi-channel marketing strategies to drive brand awareness, demand generation, and business growth.",
      "core_responsibilities": [
        "Develop and execute annual marketing plans and campaigns",
        "Manage digital, content, social, and event marketing channels",
        "Collaborate with sales, product, and design teams",
        "Analyze campaign performance and optimize based on data",
        "Manage marketing budget and external vendors",
        "Lead or mentor junior marketing team members",
        "Use AI tools to enhance marketing efficiency and output"
      ],
      "required_skills": [
        "demand_generation",
        "content_strategy",
        "marketing_analytics",
        "project_management",
        "cross_functional_collaboration"
      ],
      "preferred_skills": [
        "b2b_marketing",
        "performance_marketing",
        "brand_management",
        "ai_tools_marketing",
        "event_marketing"
      ],
      "tools": [
        "HubSpot",
        "Salesforce Marketing Cloud",
        "Google Analytics",
        "LinkedIn Ads",
        "Canva",
        "Mailchimp",
        "WordPress"
      ],
      "technical_depth": "Low-Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Awareness",
        "Demand Generation",
        "Engagement"
      ],
      "typical_backgrounds": [
        "marketing_coordinator",
        "content_marketer",
        "communications",
        "digital_marketing"
      ],
      "next_roles": [
        "head_of_marketing",
        "growth_marketing_manager",
        "product_marketing_manager"
      ],
      "similar_roles": [
        "product_marketing_manager",
        "growth_marketing_manager",
        "demand_generation_manager"
      ],
      "not_to_confuse_with": [
        "Head of Marketing",
        "Growth Marketing Manager"
      ],
      "keywords": [
        "campaigns",
        "brand",
        "digital marketing",
        "demand gen",
        "content",
        "omnichannel",
        "marketing strategy",
        "budget",
        "analytics"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: marketing coordinator promotion, external hire from another B2B / consumer scale-up; sometimes ex-consultants pivoting to marketing operations. Stack patterns: HubSpot / Marketo + Salesforce + Google Analytics + LinkedIn Ads + Google Ads + project management. Hiring stage: common at scale-ups and unicorns with structured marketing functions — monday.com, Wix, JFrog, Fiverr, Lemonade, AppsFlyer, Gong, HiBob, Cellebrite. Generalist role at smaller orgs; specializes by sub-function (product, growth, lifecycle, etc.) at larger orgs."
      }
    },
    {
      "id": "growth_marketing_manager",
      "standardized_title": "Growth Marketing Manager",
      "alternate_titles": [
        "Growth Marketing Lead",
        "Senior Growth Marketing Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Drive measurable pipeline and revenue growth through data-driven, full-funnel marketing strategies and experimentation.",
      "core_responsibilities": [
        "Own demand generation and pipeline contribution targets",
        "Plan and execute paid, SEO, ABM, and content campaigns",
        "Run A/B testing and experimentation across channels",
        "Manage marketing automation and lead scoring",
        "Align with BDR/SDR teams on lead quality and follow-up",
        "Build dashboards and report on pipeline and attribution metrics",
        "Use AI and automation tools to scale marketing output"
      ],
      "required_skills": [
        "demand_generation",
        "performance_marketing",
        "marketing_analytics",
        "ab_testing_marketing",
        "marketing_automation"
      ],
      "preferred_skills": [
        "account_based_marketing",
        "seo_management",
        "b2b_marketing",
        "ai_tools_marketing",
        "sales_collaboration"
      ],
      "tools": [
        "HubSpot",
        "Salesforce",
        "LinkedIn Ads",
        "Google Ads",
        "Clay",
        "ZoomInfo",
        "Gong",
        "GA4",
        "Tableau"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Demand Generation",
        "Pipeline Generation"
      ],
      "typical_backgrounds": [
        "marketing_manager",
        "performance_marketer",
        "digital_marketer",
        "analyst"
      ],
      "next_roles": [
        "head_of_marketing",
        "vp_marketing",
        "performance_marketing_manager"
      ],
      "similar_roles": [
        "performance_marketing_manager",
        "lifecycle_marketing_manager",
        "demand_generation_manager"
      ],
      "not_to_confuse_with": [
        "Performance Marketing Manager",
        "Marketing Manager"
      ],
      "keywords": [
        "demand gen",
        "pipeline",
        "ABM",
        "paid media",
        "SEO",
        "A/B testing",
        "attribution",
        "MQL",
        "SQL",
        "growth",
        "funnel"
      ],
      "years_experience_typical": "4-8",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: performance marketing pivots, marketing manager promotion, sometimes analytical / engineering pivots. Stack patterns: SQL + Amplitude / Mixpanel for funnel analysis; performance ads (Google, Meta, LinkedIn); lifecycle tooling (Iterable, Customer.io, Braze); A/B testing platforms (Optimizely, VWO); Looker / Mode for reporting. Hiring stage: heavy at consumer / PLG companies (Wix, Fiverr, Lemonade, Lightricks, Plarium, Playtika, HiBob, monday.com) and AI scale-ups building consumer-facing AI products (D-ID, Hour One, Bria AI)."
      }
    },
    {
      "id": "performance_marketing_manager",
      "standardized_title": "Performance Marketing Manager",
      "alternate_titles": [
        "Paid Media Manager",
        "Acquisition Marketing Manager",
        "User Acquisition Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own and optimize paid media campaigns across platforms to drive user acquisition, pipeline, and revenue at target efficiency metrics.",
      "core_responsibilities": [
        "Manage and optimize campaigns on Google, Meta, LinkedIn, TikTok",
        "Define targeting, audience segmentation, and budget allocation",
        "Analyze CAC, ROAS, LTV, and conversion data",
        "Run A/B tests on creative, audiences, and messaging",
        "Collaborate with creative and content teams on ad assets",
        "Build attribution frameworks and performance dashboards",
        "Use AI tools to enhance targeting and campaign efficiency"
      ],
      "required_skills": [
        "performance_marketing",
        "marketing_analytics",
        "ab_testing_marketing",
        "data_analysis",
        "user_acquisition"
      ],
      "preferred_skills": [
        "marketing_automation",
        "ai_tools_marketing",
        "demand_generation",
        "analytical_thinking",
        "b2b_marketing"
      ],
      "tools": [
        "Google Ads",
        "Meta Ads Manager",
        "LinkedIn Campaign Manager",
        "TikTok Ads",
        "GA4",
        "GTM",
        "Looker Studio",
        "Tableau",
        "AppsFlyer"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Demand Generation",
        "User Acquisition"
      ],
      "typical_backgrounds": [
        "digital_marketer",
        "media_buyer",
        "marketing_analyst",
        "growth_marketer"
      ],
      "next_roles": [
        "growth_marketing_manager",
        "head_of_marketing",
        "vp_marketing"
      ],
      "similar_roles": [
        "growth_marketing_manager",
        "demand_generation_manager",
        "growth_analyst"
      ],
      "not_to_confuse_with": [
        "Growth Marketing Manager",
        "Marketing Manager"
      ],
      "keywords": [
        "paid media",
        "Google Ads",
        "Meta",
        "ROAS",
        "CAC",
        "LTV",
        "user acquisition",
        "performance",
        "A/B testing",
        "attribution",
        "budget"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: paid media specialists, growth analyst promotions, ad-agency-to-in-house pivots. Stack patterns: Google Ads + Meta Ads + LinkedIn Ads + TikTok Ads + Apple Search Ads; Appsflyer / Adjust / Singular for mobile attribution; Skai / Madgicx / Smartly for creative iteration. Hiring stage: heavy at consumer mobile companies (Lightricks, Plarium, Playtika, Moon Active, Crazy Labs, Papaya Gaming, SciPlay), AppsFlyer (the tooling provider), and consumer-facing B2C scale-ups (Lemonade, eToro, Fiverr). Strong Israeli mobile-acquisition specialty given the gaming and consumer app concentration."
      }
    },
    {
      "id": "lifecycle_marketing_manager",
      "standardized_title": "Lifecycle Marketing Manager",
      "alternate_titles": [
        "CRM Marketing Manager",
        "Customer Lifecycle Marketing Manager",
        "Email Marketing Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Maximize customer lifetime value through data-driven lifecycle journeys, CRM automation, and retention programs.",
      "core_responsibilities": [
        "Design and execute customer lifecycle journeys across email, push, in-app, and SMS",
        "Build advanced audience segmentation (RFM, behavioral, firmographic)",
        "Own retention, upsell, and expansion marketing programs",
        "Run A/B tests on messaging, timing, and offers",
        "Analyze cohort behavior and LTV to inform strategy",
        "Manage marketing automation platforms",
        "Collaborate with Sales on handoff logic for sales-led motions"
      ],
      "required_skills": [
        "lifecycle_marketing",
        "marketing_automation",
        "data_analysis",
        "ab_testing_marketing",
        "customer_retention"
      ],
      "preferred_skills": [
        "marketing_analytics",
        "sql",
        "b2b_marketing",
        "ai_tools_marketing",
        "product_adoption"
      ],
      "tools": [
        "Braze",
        "HubSpot",
        "Iterable",
        "Klaviyo",
        "Salesforce Marketing Cloud",
        "Mixpanel",
        "Amplitude",
        "Tableau"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Retention",
        "Expansion",
        "Engagement"
      ],
      "typical_backgrounds": [
        "crm_manager",
        "email_marketer",
        "growth_marketer",
        "marketing_analyst"
      ],
      "next_roles": [
        "head_of_marketing",
        "growth_marketing_manager",
        "vp_marketing"
      ],
      "similar_roles": [
        "growth_marketing_manager",
        "marketing_manager",
        "demand_generation_manager"
      ],
      "not_to_confuse_with": [
        "Growth Marketing Manager",
        "Marketing Manager"
      ],
      "keywords": [
        "lifecycle",
        "CRM",
        "retention",
        "LTV",
        "churn",
        "email",
        "automation",
        "segmentation",
        "Braze",
        "HubSpot",
        "upsell",
        "NRR"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: email / CRM marketers, growth analysts pivoting to lifecycle, former marketing managers. Stack patterns: Iterable / Customer.io / Braze / Mailchimp / HubSpot for orchestration; Optimove (Israeli-headquartered CRM) widely used; Looker / Mode for analysis. Hiring stage: heavy at consumer companies with subscription / retention focus — Lemonade, eToro, Lightricks, Plarium, Playtika, Fiverr, Wix, monday.com. Common at FinTech (Lemonade, Tipalti, Payoneer) where lifecycle CRM directly drives retention metrics."
      }
    },
    {
      "id": "product_marketing_manager",
      "standardized_title": "Product Marketing Manager",
      "alternate_titles": [
        "PMM",
        "Senior Product Marketing Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": "Product",
      "seniority": "Mid",
      "core_purpose": "Bridge product and market by developing positioning, messaging, go-to-market strategy, and sales enablement for product launches and ongoing growth.",
      "core_responsibilities": [
        "Develop product positioning, messaging, and value propositions",
        "Lead go-to-market planning and execution for new features and products",
        "Create sales enablement materials (battlecards, pitch decks, one-pagers)",
        "Conduct market research and competitive intelligence",
        "Collaborate with Product, Sales, and CS on launches and messaging",
        "Write website copy, product pages, and customer-facing content",
        "Represent the voice of the customer in product decisions"
      ],
      "required_skills": [
        "product_positioning",
        "go_to_market_strategy",
        "market_research",
        "sales_enablement",
        "content_strategy",
        "copywriting"
      ],
      "preferred_skills": [
        "b2b_marketing",
        "ai_tools_marketing",
        "customer_advocacy",
        "analytical_thinking",
        "presentation_skills"
      ],
      "tools": [
        "HubSpot",
        "Salesforce",
        "Notion",
        "Figma",
        "WordPress",
        "AI tools",
        "Gong"
      ],
      "technical_depth": "Low-Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Indirect",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Awareness",
        "Demand Generation",
        "Enablement"
      ],
      "typical_backgrounds": [
        "marketing_manager",
        "product_manager",
        "content_marketer",
        "sales_engineer"
      ],
      "next_roles": [
        "head_of_marketing",
        "vp_product",
        "growth_marketing_manager"
      ],
      "similar_roles": [
        "marketing_manager",
        "growth_marketing_manager",
        "product_manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Marketing Manager",
        "Growth Marketing Manager"
      ],
      "keywords": [
        "positioning",
        "messaging",
        "GTM",
        "go-to-market",
        "launch",
        "battlecards",
        "sales enablement",
        "value proposition",
        "PMM",
        "competitive intelligence"
      ],
      "years_experience_typical": "4-9",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: marketing manager promotion, PM pivot to marketing, ex-consultants from McKinsey / BCG / Bain Israel offices, MBA graduates from Reichman / IDC. Stack patterns: HubSpot / Marketo, Salesforce, Notion for messaging frameworks, Highspot / Seismic for sales enablement, competitive intel platforms (Klue, Crayon). Hiring stage: critical role at B2B SaaS scale-ups and unicorns — monday.com, Wix, JFrog, Gong, HiBob, AppsFlyer, Wiz, Check Point, CyberArk, SentinelOne, Lemonade, Forter. Strong English communication for US-facing launches essential."
      }
    },
    {
      "id": "content_marketing_manager",
      "standardized_title": "Content Marketing Manager",
      "alternate_titles": [
        "Content Marketing Lead",
        "Senior Content Manager",
        "Editorial Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Drive brand awareness, SEO, and pipeline through high-quality content strategy and execution across blog, social, email, and other channels.",
      "core_responsibilities": [
        "Develop and execute content marketing strategy",
        "Write and edit blogs, whitepapers, case studies, and landing pages",
        "Manage content calendar and production workflows",
        "Collaborate with SEO, demand gen, and product marketing teams",
        "Repurpose content across formats and channels",
        "Use AI tools to accelerate content production",
        "Analyze content performance and optimize based on data"
      ],
      "required_skills": [
        "content_strategy",
        "copywriting",
        "seo_management",
        "project_management",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "ai_tools_marketing",
        "b2b_marketing",
        "social_media_management",
        "marketing_analytics",
        "product_positioning"
      ],
      "tools": [
        "WordPress",
        "HubSpot",
        "Ahrefs",
        "SEMrush",
        "Google Analytics",
        "Notion",
        "AI tools",
        "Canva"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Awareness",
        "Engagement",
        "Demand Generation"
      ],
      "typical_backgrounds": [
        "writer",
        "journalist",
        "marketing_coordinator",
        "communications"
      ],
      "next_roles": [
        "head_of_marketing",
        "product_marketing_manager",
        "marketing_manager"
      ],
      "similar_roles": [
        "seo_manager",
        "marketing_manager",
        "social_media_manager"
      ],
      "not_to_confuse_with": [
        "Product Marketing Manager",
        "Social Media Manager"
      ],
      "keywords": [
        "content",
        "blog",
        "SEO",
        "writing",
        "whitepapers",
        "case studies",
        "editorial",
        "content strategy",
        "copywriting",
        "content calendar"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: journalism / communications pivots, technical writing backgrounds, former editors at Israeli tech publications (CTech, NoCamels, Globes English); some come from US content marketing teams. Stack patterns: WordPress / Webflow CMS, Ahrefs / Semrush / Clearscope for SEO, Notion / Google Docs for editorial workflow, Buffer / Hootsuite for distribution. Hiring stage: common at B2B SaaS and cyber companies investing in inbound — monday.com, Wix, JFrog, HiBob, Gong, AppsFlyer, Wiz, Check Point, CyberArk, Cybereason, Lemonade. Strong English writing is a hard requirement given target market."
      }
    },
    {
      "id": "seo_manager",
      "standardized_title": "SEO Manager",
      "alternate_titles": [
        "SEO Lead",
        "Senior SEO Manager",
        "Organic Growth Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own organic search strategy to drive scalable traffic growth through technical SEO, content optimization, and keyword strategy.",
      "core_responsibilities": [
        "Define and execute SEO strategy across on-page, technical, and off-page",
        "Conduct keyword research and content gap analysis",
        "Manage technical SEO including site architecture, crawlability, and page speed",
        "Collaborate with content and engineering teams on SEO implementation",
        "Track rankings, traffic, and conversion metrics",
        "Stay current on algorithm changes and AI-powered search evolution (GEO)",
        "Lead or mentor SEO specialists"
      ],
      "required_skills": [
        "seo_management",
        "content_strategy",
        "data_analysis",
        "analytical_thinking",
        "technical_communication"
      ],
      "preferred_skills": [
        "marketing_analytics",
        "ai_tools_marketing",
        "sql",
        "cross_functional_collaboration",
        "dashboarding"
      ],
      "tools": [
        "Ahrefs",
        "SEMrush",
        "Screaming Frog",
        "Google Search Console",
        "GA4",
        "BrightEdge",
        "Botify"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Awareness",
        "Demand Generation"
      ],
      "typical_backgrounds": [
        "digital_marketer",
        "content_marketer",
        "web_analyst",
        "growth_marketer"
      ],
      "next_roles": [
        "head_of_marketing",
        "growth_marketing_manager",
        "vp_marketing"
      ],
      "similar_roles": [
        "content_marketing_manager",
        "growth_marketing_manager",
        "performance_marketing_manager"
      ],
      "not_to_confuse_with": [
        "Content Marketing Manager",
        "Performance Marketing Manager"
      ],
      "keywords": [
        "SEO",
        "organic",
        "search rankings",
        "keyword research",
        "technical SEO",
        "traffic",
        "GEO",
        "backlinks",
        "Ahrefs",
        "crawl",
        "indexation"
      ],
      "years_experience_typical": "3-7",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: SEO specialists, content marketers pivoting to organic, technical SEO from web development. Stack patterns: Ahrefs + Semrush + Google Search Console + Screaming Frog; technical SEO work in Webflow / WordPress / custom CMS; Clearscope / Frase for content optimization. Hiring stage: common at scale-ups with strong inbound motion — Wix (which itself runs the largest SEO operation in Israel), monday.com, Fiverr, JFrog, HiBob, Lemonade, AppsFlyer. Programmatic SEO investment growing across B2B SaaS."
      }
    },
    {
      "id": "social_media_manager",
      "standardized_title": "Social Media Manager",
      "alternate_titles": [
        "Social Media Lead",
        "Senior Social Media Manager",
        "Community Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Build and manage brand presence across social media channels through content creation, community engagement, and influencer collaboration.",
      "core_responsibilities": [
        "Manage brand social media accounts across Instagram, LinkedIn, TikTok, Twitter/X",
        "Plan and execute content calendars across platforms",
        "Create or coordinate social media content including copy, graphics, and video",
        "Engage with community and respond to comments and messages",
        "Manage influencer partnerships and collaborations",
        "Track social performance metrics and optimize strategy",
        "Use AI tools for content ideation and production"
      ],
      "required_skills": [
        "social_media_management",
        "content_strategy",
        "copywriting",
        "community_management",
        "organization"
      ],
      "preferred_skills": [
        "canva_design_tools",
        "ai_tools_marketing",
        "influencer_marketing",
        "marketing_analytics",
        "video_editing"
      ],
      "tools": [
        "Hootsuite",
        "Buffer",
        "Later",
        "Meta Business Suite",
        "Canva",
        "CapCut",
        "Iconosquare",
        "AI tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Awareness",
        "Engagement"
      ],
      "typical_backgrounds": [
        "content_creator",
        "marketing_coordinator",
        "communications",
        "digital_media"
      ],
      "next_roles": [
        "marketing_manager",
        "content_marketing_manager",
        "growth_marketing_manager"
      ],
      "similar_roles": [
        "content_marketing_manager",
        "brand_manager",
        "marketing_manager"
      ],
      "not_to_confuse_with": [
        "Marketing Manager",
        "Content Marketing Manager"
      ],
      "keywords": [
        "social media",
        "Instagram",
        "LinkedIn",
        "TikTok",
        "content calendar",
        "community",
        "influencers",
        "engagement",
        "brand",
        "Canva"
      ],
      "years_experience_typical": "2-5",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: promoted social media coordinator, content marketing pivot, or external hire with B2B / consumer social experience. Stack patterns: Hootsuite / Buffer / Sprout Social, Figma / Canva, platform-native analytics, increasingly AI tooling for content generation. Hiring stage: common across consumer-facing companies (Wix, Fiverr, Lemonade, Lightricks, Plarium, Playtika) and B2B SaaS investing in thought-leadership (monday.com, HiBob, Gong, AppsFlyer, Wiz). LinkedIn-heavy for B2B; Instagram / TikTok / X for consumer."
      }
    },
    {
      "id": "head_of_marketing",
      "standardized_title": "Head of Marketing",
      "alternate_titles": [
        "Director of Marketing",
        "VP Marketing (smaller orgs)",
        "Senior Director of Marketing"
      ],
      "role_family": "Marketing",
      "secondary_family": "Leadership",
      "seniority": "Director_Head",
      "core_purpose": "Own the entire marketing function, defining strategy, building the team, and driving brand awareness, demand generation, and revenue-aligned growth.",
      "core_responsibilities": [
        "Define and execute comprehensive marketing strategy across all channels",
        "Own demand generation, brand, content, and product marketing",
        "Build and lead the marketing team",
        "Manage marketing budget and vendor relationships",
        "Partner with Sales, Product, and Leadership on GTM alignment",
        "Set and track KPIs across all marketing channels",
        "Drive brand positioning and market differentiation",
        "Report marketing performance and pipeline contribution to leadership"
      ],
      "required_skills": [
        "go_to_market_strategy",
        "brand_management",
        "demand_generation",
        "people_management",
        "marketing_analytics",
        "cross_functional_alignment"
      ],
      "preferred_skills": [
        "performance_marketing",
        "product_positioning",
        "b2b_marketing",
        "ai_tools_marketing",
        "account_based_marketing"
      ],
      "tools": [
        "HubSpot",
        "Salesforce",
        "Google Analytics",
        "LinkedIn Ads",
        "Google Ads",
        "Notion",
        "Tableau"
      ],
      "technical_depth": "Low-Medium",
      "customer_facing_level": "Low-Medium",
      "revenue_ownership": "Indirect",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Awareness",
        "Demand Generation",
        "Pipeline Generation"
      ],
      "typical_backgrounds": [
        "marketing_manager",
        "growth_marketing_manager",
        "product_marketing_manager"
      ],
      "next_roles": [
        "vp_marketing",
        "chief_marketing_officer"
      ],
      "similar_roles": [
        "vp_marketing",
        "head_of_product",
        "vp_sales"
      ],
      "not_to_confuse_with": [
        "VP Marketing",
        "Marketing Manager"
      ],
      "keywords": [
        "marketing strategy",
        "brand",
        "demand gen",
        "pipeline",
        "team leadership",
        "GTM",
        "budget",
        "KPIs",
        "head of marketing",
        "director"
      ],
      "years_experience_typical": "10-15",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: senior marketing manager promotion, external Head of Marketing hire, or VP Marketing at an earlier-stage company. 2-3 prior cycles typical at scale-ups, unicorns, or US-headquartered companies. Stack patterns: cross-functional org leadership; HubSpot / Marketo + Salesforce; partnership with VP Sales / CRO on revenue alignment. Hiring stage: standard at scale-ups (Series B+); common at unicorns with VP Marketing above. Heavy at SaaS unicorns (monday.com, Wix, JFrog, Fiverr, Gong, HiBob, AppsFlyer, Lemonade) and at cyber companies investing in inbound (Check Point, CyberArk, SentinelOne)."
      }
    },
    {
      "id": "vp_marketing",
      "standardized_title": "VP of Marketing",
      "alternate_titles": [
        "VP of Marketing",
        "Chief Marketing Officer",
        "CMO"
      ],
      "role_family": "Marketing",
      "secondary_family": "Leadership",
      "seniority": "VP_Executive",
      "core_purpose": "Lead the global marketing organization, owning brand, demand generation, product marketing, and growth to drive company-level revenue and market leadership.",
      "core_responsibilities": [
        "Own global marketing strategy and budget",
        "Lead all marketing functions: brand, demand gen, product marketing, content, performance",
        "Build and scale a high-performing marketing organization",
        "Partner with CEO and executive team on GTM and company positioning",
        "Drive pipeline contribution and revenue-aligned marketing programs",
        "Set company-level brand narrative and market differentiation",
        "Oversee PR, analyst relations, and thought leadership",
        "Use AI and automation to build scalable marketing systems"
      ],
      "required_skills": [
        "go_to_market_strategy",
        "brand_management",
        "demand_generation",
        "executive_leadership",
        "people_management",
        "organizational_design",
        "marketing_analytics"
      ],
      "preferred_skills": [
        "performance_marketing",
        "product_positioning",
        "account_based_marketing",
        "ai_tools_marketing",
        "cross_functional_exec_presence"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "Google Analytics",
        "LinkedIn Ads",
        "Tableau",
        "Marketo"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low-Medium",
      "revenue_ownership": "Company",
      "strategic_level": "Executive",
      "lifecycle_stage": [
        "Awareness",
        "Demand Generation",
        "Pipeline Generation",
        "Brand"
      ],
      "typical_backgrounds": [
        "head_of_marketing",
        "vp_marketing",
        "growth_marketing_manager"
      ],
      "next_roles": [
        "chief_marketing_officer",
        "ceo"
      ],
      "similar_roles": [
        "head_of_marketing",
        "vp_sales",
        "head_of_product"
      ],
      "not_to_confuse_with": [
        "Head of Marketing",
        "Director of Marketing"
      ],
      "keywords": [
        "marketing strategy",
        "brand",
        "demand gen",
        "ARR",
        "pipeline",
        "team building",
        "executive",
        "CMO",
        "VP",
        "GTM",
        "scale",
        "global marketing"
      ],
      "years_experience_typical": "12-20",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: head of marketing promotion or external VP / CMO hire from larger Israeli or US tech companies; 2-3 prior cycles common. Stack patterns: executive-level brand + GTM strategy; partnership with VP Sales / CRO on revenue model; board-level commercial reporting. Hiring stage: critical hire at scale-ups (Series C+) and unicorns. CMO title increasingly used at companies that want a peer to the CRO / CTO. Heavy at SaaS unicorns (monday.com, Wix, JFrog, Fiverr, Gong, HiBob, AppsFlyer, Lemonade), cyber (Check Point, CyberArk, SentinelOne, Wiz), and Israeli enterprises (Amdocs, NICE Systems, Cellebrite)."
      }
    },
    {
      "id": "associate_product_manager",
      "standardized_title": "Associate Product Manager",
      "alternate_titles": [
        "APM",
        "Junior Product Manager",
        "Product Manager I",
        "Product Associate"
      ],
      "role_family": "Product",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Learn the craft of product management by supporting PMs on discovery, spec writing, and delivery while building foundational product skills.",
      "core_responsibilities": [
        "Support product managers with requirements gathering and documentation",
        "Write user stories and assist with PRD creation",
        "Work with engineering teams to translate customer needs into specifications",
        "Participate in the full product development lifecycle",
        "Conduct user research and customer interviews with guidance",
        "Use AI tools to automate research, documentation, and spec creation",
        "Analyze product data and contribute to experimentation"
      ],
      "required_skills": [
        "analytical_thinking",
        "technical_communication",
        "cross_functional_collaboration",
        "problem_solving",
        "organization"
      ],
      "preferred_skills": [
        "prd_writing",
        "agile_scrum",
        "ux_product_design_sense",
        "ai_product_thinking",
        "customer_discovery_interviews"
      ],
      "tools": [
        "Jira",
        "Notion",
        "Figma",
        "Google Analytics",
        "SQL basics",
        "AI tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Growth",
        "Scale"
      ],
      "typical_backgrounds": [
        "mba_graduate",
        "former_consultant",
        "engineer_pivot",
        "designer_pivot",
        "bootcamp_grad"
      ],
      "next_roles": [
        "product_manager",
        "product_analyst"
      ],
      "similar_roles": [
        "product_analyst",
        "business_intelligence_analyst",
        "solutions_engineer_junior"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Product Analyst"
      ],
      "keywords": [
        "entry-level PM",
        "rotational PM",
        "feature ownership",
        "stakeholder collaboration"
      ],
      "market_notes": {
        "israel": "Backgrounds: MBA graduates from Reichman / IDC / TAU / Wharton-TLV, ex-consultants from McKinsey / BCG / Bain Israel offices, engineers pivoting to product, designers pivoting to product, exceptionally strong analyst hires. Stack patterns: Jira / Figma / Mixpanel / Amplitude / SQL basics; product analytics tooling baseline; strong English + US time-zone availability essential. Hiring stage: relatively rare — most companies prefer mid-level PM hires with 3+ years prior experience. APM programs exist primarily at unicorns and large scale-ups (monday.com, Wix, JFrog, Lemonade, AppsFlyer) and Israeli offices of US tech giants (Google, Meta, Microsoft, Apple)."
      },
      "years_experience_typical": "0-2",
      "_research_method": "knowledge"
    },
    {
      "id": "senior_product_manager",
      "standardized_title": "Senior Product Manager",
      "alternate_titles": [
        "Senior PM",
        "Lead Product Manager",
        "Senior Product Manager"
      ],
      "role_family": "Product",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Own complex, high-impact product domains with full autonomy — defining strategy, driving execution, and influencing product direction across the organization.",
      "core_responsibilities": [
        "Own strategy, roadmap, and execution for complex product areas",
        "Lead discovery on high-ambiguity, high-impact problems",
        "Define and execute go-to-market strategy for major launches",
        "Drive product decisions using quantitative and qualitative data",
        "Build and present business cases and competitive analysis to leadership",
        "Mentor junior PMs and elevate product craft across the team",
        "Engage directly with enterprise customers and strategic accounts",
        "Lead cross-functional initiatives spanning engineering, design, sales, and CS",
        "Define and track product success metrics and iterate based on data"
      ],
      "required_skills": [
        "roadmap_prioritization",
        "product_strategy",
        "product_discovery",
        "prd_writing",
        "product_metrics",
        "stakeholder_management",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "customer_discovery_interviews",
        "ux_product_design_sense"
      ],
      "tools": [
        "Jira",
        "Figma",
        "Mixpanel",
        "Amplitude",
        "SQL",
        "Tableau",
        "AI tools",
        "Salesforce",
        "Gong"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "pm_promotion",
        "external_senior_pm_hire",
        "former_founder"
      ],
      "next_roles": [
        "group_product_manager",
        "head_of_product",
        "technical_product_manager"
      ],
      "similar_roles": [
        "technical_product_manager",
        "group_product_manager",
        "head_of_product"
      ],
      "not_to_confuse_with": [
        "Group Product Manager",
        "Head of Product"
      ],
      "keywords": [
        "strategic PM",
        "platform PM",
        "senior IC",
        "complex product areas"
      ],
      "years_experience_typical": "6-9",
      "market_notes": {
        "israel": "Backgrounds: PM promotion, external senior PM hire, or former founder operating rather than building. 1-2 prior cycles at scale-ups and unicorns common. Stack patterns: typical Israeli PM tooling (Jira / Figma / Mixpanel / Amplitude / SQL / Tableau) plus deeper customer-facing engagement and exec-level presentation; AI tooling fluency increasingly expected. Hiring stage: common at Series B+ scale-ups and unicorns where product orgs are large enough to need senior IC track distinct from people management. Strong concentration at cyber (Wiz, CyberArk, SentinelOne, Check Point), SaaS (monday.com, JFrog, Gong, HiBob, AppsFlyer, Wix), AI (AI21 Labs, Run:ai, Aidoc), and FinTech (Lemonade, Payoneer, Forter). Senior PMs typically own one major product area with 1-3 PMs sometimes reporting in (player-coach mode)."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "group_product_manager",
      "standardized_title": "Group Product Manager",
      "alternate_titles": [
        "GPM",
        "Group PM",
        "Senior Group Product Manager",
        "Lead PM"
      ],
      "role_family": "Product",
      "secondary_family": "Leadership",
      "seniority": "Lead_Manager",
      "core_purpose": "Lead a team of product managers across multiple product areas, balancing hands-on product ownership with people leadership and strategic direction.",
      "core_responsibilities": [
        "Lead and develop a team of product managers, providing coaching and direction",
        "Own product strategy across multiple related product areas or a portfolio",
        "Set priorities and ensure clarity of execution across the team's scope",
        "Partner closely with engineering leads, design leads, and leadership",
        "Act as a senior product voice with customers, stakeholders, and executives",
        "Drive competitive analysis and market intelligence to inform direction",
        "Define and maintain processes for the PM team's product lifecycle",
        "Support go-to-market efforts with clear narratives and cross-functional alignment",
        "Operate in ambiguity — shape opportunities where requirements are not predefined"
      ],
      "required_skills": [
        "pm_team_leadership",
        "product_strategy",
        "roadmap_prioritization",
        "people_management",
        "stakeholder_management",
        "product_discovery"
      ],
      "preferred_skills": [
        "coaching",
        "ai_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "cross_functional_alignment",
        "b2b_product_management"
      ],
      "tools": [
        "Jira",
        "Figma",
        "Mixpanel",
        "Amplitude",
        "SQL",
        "Tableau",
        "AI tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "senior_pm_promotion",
        "external_gpm_hire"
      ],
      "next_roles": [
        "head_of_product",
        "vp_product"
      ],
      "similar_roles": [
        "senior_product_manager",
        "head_of_product",
        "engineering_manager"
      ],
      "not_to_confuse_with": [
        "Head of Product",
        "Senior PM"
      ],
      "keywords": [
        "manager of PMs",
        "product group",
        "people management",
        "multi-product"
      ],
      "years_experience_typical": "8-12",
      "market_notes": {
        "israel": "Backgrounds: senior PM promotion or external GPM hire; 8-12 years typical. Stack patterns: people management + IC product work on most-strategic decisions; same product tooling as senior PM plus Lattice / 1:1 cadence tooling. Hiring stage: distinct level at scale-ups since 2018-2020; fills the gap between Senior PM and Head of Product at orgs with 8-15+ PMs. Common at large scale-ups and unicorns (monday.com, Wix, JFrog, Fiverr, Wiz, CyberArk, SentinelOne, AppsFlyer, Lemonade). Usually owns a product area or product line with 2-4 PMs reporting in."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "product_operations_manager",
      "standardized_title": "Product Operations Manager",
      "alternate_titles": [
        "ProductOps Manager",
        "Product Ops Lead",
        "Senior Product Operations Manager"
      ],
      "role_family": "Product",
      "secondary_family": "Operations",
      "seniority": "Mid",
      "core_purpose": "Enable product and go-to-market teams to operate at scale by designing processes, tracking performance, and bridging strategy with operational execution.",
      "core_responsibilities": [
        "Take end-to-end ownership of key operational and strategic initiatives within the product org",
        "Design and implement scalable processes and workflows for product and GTM teams",
        "Define and track KPIs for product initiatives and operational programs",
        "Build dashboards that provide visibility into product performance and customer outcomes",
        "Act as an internal consultant — conduct root-cause analysis and propose solutions",
        "Lead change management for new processes and tool rollouts",
        "Manage dependencies and risks across departments proactively",
        "Partner with CS, Sales, and Product teams on cross-functional programs"
      ],
      "required_skills": [
        "product_operations",
        "process_improvement",
        "cross_functional_collaboration",
        "analytical_thinking",
        "stakeholder_management",
        "delivery_execution"
      ],
      "preferred_skills": [
        "data_analysis",
        "dashboarding",
        "systems_thinking",
        "project_management",
        "crm_management"
      ],
      "tools": [
        "Jira",
        "Asana",
        "Monday.com",
        "Tableau",
        "Power BI",
        "Salesforce",
        "Excel",
        "Notion"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "pm_pivot_to_ops",
        "biz_ops_pivot",
        "consulting_background"
      ],
      "next_roles": [
        "senior_product_manager",
        "director_product_operations",
        "head_of_product"
      ],
      "similar_roles": [
        "product_manager",
        "revenue_operations",
        "head_of_product"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Revenue Operations Manager"
      ],
      "keywords": [
        "ProductOps",
        "product processes",
        "tools",
        "data infrastructure",
        "cross-PM enablement"
      ],
      "years_experience_typical": "5-9",
      "market_notes": {
        "israel": "Backgrounds: PMs pivoting to ops, biz ops pivots, consulting backgrounds. Stack patterns: Productboard / Aha / Pendo for product tooling, Notion for documentation, Looker / Mode for centralized analytics, Lattice for team rituals. Hiring stage: newer function in Israeli tech, emerging at Series C+ and unicorns that built large product orgs needing dedicated process and tools investment. Common at monday.com, Wix, JFrog, Wiz, CyberArk, SentinelOne, AppsFlyer, Lemonade. Often a single-person function (or 2-3 person team) supporting all PMs. Career path forks to head_of_product_ops, head_of_product, or director_product_operations."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "head_of_product",
      "standardized_title": "Head of Product",
      "alternate_titles": [
        "VP Product",
        "Chief Product Officer",
        "VP of Product Management",
        "Director of Product"
      ],
      "role_family": "Product",
      "secondary_family": "Leadership",
      "seniority": "Director_Head",
      "core_purpose": "Own the entire product function — defining product vision, building the PM team, and driving product strategy that creates market-leading outcomes.",
      "core_responsibilities": [
        "Define product vision and long-term strategy aligned with company goals",
        "Build, lead, and develop the product management organization",
        "Own the product roadmap across all product areas",
        "Partner with CEO, CTO, and executive team on company direction",
        "Engage with key customers and strategic accounts to shape product direction",
        "Drive product-market fit across the portfolio",
        "Define product metrics and success frameworks",
        "Lead go-to-market strategy for major product launches",
        "Build a culture of discovery, data-driven decisions, and user-first thinking"
      ],
      "required_skills": [
        "product_strategy",
        "pm_team_leadership",
        "people_management",
        "roadmap_prioritization",
        "stakeholder_management",
        "product_discovery",
        "go_to_market_product"
      ],
      "preferred_skills": [
        "ai_product_management",
        "competitive_analysis_product",
        "organizational_design",
        "executive_leadership",
        "b2b_product_management",
        "product_led_growth"
      ],
      "tools": [
        "Jira",
        "Figma",
        "Mixpanel",
        "Amplitude",
        "SQL",
        "Tableau",
        "AI tools",
        "Salesforce"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "gpm_promotion",
        "external_vp_hire",
        "former_founder_pivot"
      ],
      "next_roles": [
        "chief_product_officer",
        "ceo"
      ],
      "similar_roles": [
        "vp_engineering",
        "group_product_manager",
        "vp_design"
      ],
      "not_to_confuse_with": [
        "Senior Product Manager",
        "Group Product Manager"
      ],
      "keywords": [
        "product executive",
        "head of product",
        "VP product",
        "CPO"
      ],
      "years_experience_typical": "12-18",
      "market_notes": {
        "israel": "Backgrounds: GPM promotion, external VP Product hire, or former founder pivoting. 2-3 prior cycles at scale-ups, unicorns, or US-headquartered companies common. Strong overlap with founder profile — many Israeli VP Product hires have founded or co-founded earlier startups. Stack patterns: executive-level product strategy work; less hands-on tooling, more board / customer / exec-team engagement. Hiring stage: critical executive role at any product-led company past ~30 employees. Often the first product hire at very early stages (Seed) — founding PM evolves into Head of Product as the org scales. At scale-ups frequently filled by external senior hires from larger Israeli or US tech companies. Reports to CEO typically; to CPO when that role exists."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "data_analyst",
      "standardized_title": "Data Analyst",
      "alternate_titles": [
        "Business Analyst",
        "Senior Data Analyst",
        "Analytics Analyst"
      ],
      "role_family": "Data",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Transform raw data into actionable insights that drive business and product decisions through analysis, dashboards, and experimentation.",
      "core_responsibilities": [
        "Write complex SQL queries to analyze large datasets in cloud data warehouses",
        "Build and maintain dashboards and reports using BI tools",
        "Define and monitor KPIs and business metrics",
        "Conduct ad-hoc analysis to answer strategic business questions",
        "Partner with Product, Marketing, and business stakeholders on data-driven decisions",
        "Design and analyze A/B tests and experiments",
        "Translate complex data into clear narratives and recommendations",
        "Use AI tools to accelerate analysis and insight generation"
      ],
      "required_skills": [
        "sql_advanced",
        "data_analysis",
        "bi_tools",
        "analytical_thinking",
        "data_storytelling"
      ],
      "preferred_skills": [
        "python_data",
        "statistical_analysis",
        "experimentation_framework",
        "product_analytics_expertise",
        "cloud_data_platforms"
      ],
      "tools": [
        "SQL",
        "BigQuery",
        "Snowflake",
        "Redshift",
        "Tableau",
        "Looker",
        "Power BI",
        "Python",
        "Excel",
        "Mixpanel",
        "Amplitude"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "industrial_engineering",
        "economics",
        "consulting_pivot",
        "former_engineer"
      ],
      "next_roles": [
        "senior_data_analyst",
        "analytics_engineer",
        "product_analyst",
        "data_scientist"
      ],
      "similar_roles": [
        "business_intelligence_analyst",
        "analytics_engineer",
        "product_analyst"
      ],
      "not_to_confuse_with": [
        "Data Scientist",
        "Analytics Engineer",
        "Business Intelligence Analyst"
      ],
      "keywords": [
        "SQL",
        "Tableau",
        "Looker",
        "dashboards",
        "ad-hoc analysis",
        "business analytics"
      ],
      "years_experience_typical": "2-5",
      "market_notes": {
        "israel": "Backgrounds: industrial engineering or economics programs at Technion / TAU / Reichman / Hebrew University; some pivot from consulting; engineers transitioning to analytics. Stack patterns: SQL + dbt + Looker / Tableau / Mode; Python or R for deeper analyses; increasingly Snowflake / BigQuery as warehouses replace Postgres for analytics. Hiring stage: common entry / mid-level role across the ecosystem — virtually every B2B and consumer scale-up. Heavy at consumer companies with rich behavioral data (Lightricks, Plarium, Playtika, Gett, Moovit), SaaS scale-ups (monday.com, Wix, Fiverr, HiBob, Gong), FinTech (Lemonade, Payoneer, eToro, Forter), and cyber (Wiz, Check Point, CyberArk, SentinelOne)."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "business_intelligence_analyst",
      "standardized_title": "Business Intelligence Analyst",
      "alternate_titles": [
        "BI Analyst",
        "Senior BI Analyst",
        "BI Developer"
      ],
      "role_family": "Data",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Build the reporting infrastructure and data foundation that enables data-driven decision-making across the business through dashboards, data models, and KPI frameworks.",
      "core_responsibilities": [
        "Design and build company-wide dashboards and reporting frameworks",
        "Create and maintain data models and source-of-truth definitions",
        "Partner with stakeholders to define metrics and measurement frameworks",
        "Ensure data quality, consistency, and reliability across reports",
        "Evaluate and recommend BI tools and data stack improvements",
        "Train and support business users on self-service analytics",
        "Translate business requirements into data solutions"
      ],
      "required_skills": [
        "sql_advanced",
        "bi_tools",
        "data_modeling",
        "data_analysis",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "python_data",
        "cloud_data_platforms",
        "data_storytelling",
        "cross_functional_collaboration",
        "dashboarding"
      ],
      "tools": [
        "Tableau",
        "Looker",
        "Power BI",
        "Metabase",
        "SQL",
        "Snowflake",
        "BigQuery",
        "dbt",
        "Excel"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "data_analyst_promotion",
        "former_analyst_consulting",
        "industrial_engineering"
      ],
      "next_roles": [
        "senior_data_analyst",
        "analytics_engineer",
        "head_of_data"
      ],
      "similar_roles": [
        "data_analyst",
        "analytics_engineer"
      ],
      "not_to_confuse_with": [
        "Data Analyst",
        "Data Engineer"
      ],
      "keywords": [
        "BI",
        "Tableau",
        "Looker",
        "Power BI",
        "executive dashboards",
        "data modeling"
      ],
      "years_experience_typical": "2-5",
      "market_notes": {
        "israel": "Backgrounds: data analyst promotions, former analyst consulting, industrial engineering pivots. Stack patterns: Tableau or Looker dominates; Power BI mostly at Israeli offices of Microsoft-aligned enterprises; SQL universal; data modeling in dbt increasingly expected for senior BI roles. Hiring stage: most often at larger companies (100+ employees) with structured executive reporting needs — monday.com, Wix, JFrog, Fiverr, Lemonade, Check Point, Amdocs, NICE Systems. At smaller scale-ups the function is usually folded into the data analyst or analytics engineer role."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "analytics_engineer",
      "standardized_title": "Analytics Engineer",
      "alternate_titles": [
        "Senior Analytics Engineer",
        "Data Modeling Engineer"
      ],
      "role_family": "Data",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Build the data foundation that enables reliable analytics — designing clean, well-structured data models and pipelines that power dashboards, product decisions, and business intelligence.",
      "core_responsibilities": [
        "Transform raw complex data into clean, structured, analytics-ready datasets",
        "Design and implement data models using dbt or similar tools",
        "Build reusable, version-controlled data transformations and pipelines",
        "Define the source-of-truth tables that power strategic decision-making",
        "Translate abstract business concepts into precise SQL definitions",
        "Maintain data integrity, metric consistency, and reliable reporting",
        "Partner with analysts, data scientists, and product teams on data needs",
        "Optimize query performance and data infrastructure efficiency"
      ],
      "required_skills": [
        "sql_advanced",
        "data_modeling",
        "data_engineering_pipelines",
        "analytical_thinking",
        "cloud_data_platforms"
      ],
      "preferred_skills": [
        "python_data",
        "bi_tools",
        "cross_functional_collaboration",
        "data_analysis",
        "statistical_analysis"
      ],
      "tools": [
        "dbt",
        "Snowflake",
        "BigQuery",
        "Redshift",
        "SQL",
        "Python",
        "Airflow",
        "Looker",
        "Tableau",
        "Git"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "data_analyst_pivot_to_engineering",
        "data_engineer_pivot_to_modeling",
        "former_swe_with_data_interest"
      ],
      "next_roles": [
        "senior_analytics_engineer",
        "data_engineer",
        "head_of_data"
      ],
      "similar_roles": [
        "data_engineer",
        "data_analyst",
        "data_scientist"
      ],
      "not_to_confuse_with": [
        "Data Engineer",
        "Data Analyst"
      ],
      "keywords": [
        "dbt",
        "data modeling",
        "SQL",
        "warehouse",
        "ELT",
        "Snowflake"
      ],
      "years_experience_typical": "3-6",
      "market_notes": {
        "israel": "Backgrounds: data analyst pivots to engineering, data engineer pivots to modeling, former SWEs with data interest. The discipline sits at the intersection of analytics and data engineering. Stack patterns: highly converged on dbt + Snowflake / BigQuery; Fivetran / Airbyte for ingestion; Looker / Mode for serving; some use of Python for testing and orchestration. Hiring stage: emerged as a distinct discipline in Israeli tech around 2020-2022, driven by dbt + modern data stack adoption. Common at SaaS scale-ups with strong data culture (monday.com, Wix, JFrog, Fiverr, Gong, HiBob), FinTech (Lemonade, Forter, Tipalti, Payoneer, eToro), and AI / consumer companies (Lightricks, Playtika, Plarium)."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "data_engineer",
      "standardized_title": "Data Engineer",
      "alternate_titles": [
        "Senior Data Engineer",
        "Data Platform Engineer",
        "Big Data Engineer"
      ],
      "role_family": "Data",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Build and maintain the data infrastructure that enables the entire organization to work with reliable, scalable, high-quality data.",
      "core_responsibilities": [
        "Build, maintain, and optimize data pipelines for batch and streaming workloads",
        "Develop reliable data models and transformations for analytics and reporting",
        "Integrate new data sources, APIs, and event streams into the data platform",
        "Implement data quality checks, testing, documentation, and monitoring",
        "Write clean, performant SQL and Python code for data processing",
        "Collaborate with analysts, data scientists, and business stakeholders on data requirements",
        "Contribute to DataOps practices including CI/CD, testing, and automation",
        "Support cloud data platform architecture and optimization"
      ],
      "required_skills": [
        "data_engineering_pipelines",
        "sql_advanced",
        "python_data",
        "cloud_data_platforms",
        "data_modeling"
      ],
      "preferred_skills": [
        "mlops",
        "cloud_tools",
        "analytical_thinking",
        "cross_functional_collaboration",
        "llm_genai_data"
      ],
      "tools": [
        "Snowflake",
        "BigQuery",
        "dbt",
        "Airflow",
        "Dagster",
        "Spark",
        "Kafka",
        "Python",
        "SQL",
        "Docker",
        "AWS",
        "GCP",
        "Git"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "swe_pivot_to_data",
        "8200_data_unit",
        "former_backend_engineer"
      ],
      "next_roles": [
        "senior_data_engineer",
        "analytics_engineer",
        "head_of_data"
      ],
      "similar_roles": [
        "analytics_engineer",
        "data_scientist",
        "mlops_engineer",
        "software_engineer"
      ],
      "not_to_confuse_with": [
        "Analytics Engineer",
        "Data Scientist",
        "Data Analyst"
      ],
      "keywords": [
        "data pipelines",
        "Snowflake",
        "BigQuery",
        "Airflow",
        "Spark",
        "ELT",
        "data infrastructure"
      ],
      "years_experience_typical": "3-7",
      "market_notes": {
        "israel": "Backgrounds: SWE pivots to data; Unit 8200 data unit alumni; former backend engineers. 3-7 years typical. Stack patterns: Snowflake or BigQuery for warehouse; Airflow / Dagster / Prefect for orchestration; dbt for transformation; Kafka for streaming; Spark for big-data workloads. Hiring stage: one of the highest-demand roles given data-heavy nature of cyber, AI, FinTech, and consumer SaaS. Heavy at cyber (Wiz, Check Point, CyberArk, SentinelOne, Cyera, BigID, Cybereason, Aqua Security), SaaS (monday.com, Wix, JFrog, Fiverr, Gong, HiBob, AppsFlyer), FinTech (Lemonade, Payoneer, eToro, Forter, Tipalti, Pagaya), and AI scale-ups (Run:ai, AI21, Hailo, Verbit, Lightricks). Many data engineers transition from software engineering, with growing demand from MLOps and platform teams."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "data_scientist",
      "standardized_title": "Data Scientist",
      "alternate_titles": [
        "Senior Data Scientist",
        "Applied Scientist",
        "ML Data Scientist"
      ],
      "role_family": "Data",
      "secondary_family": "AI_ML",
      "seniority": "Mid",
      "core_purpose": "Develop and deploy machine learning models and statistical solutions that create measurable business value from complex data.",
      "core_responsibilities": [
        "Develop and deploy machine learning and statistical models in production",
        "Perform exploratory data analysis and feature engineering on large datasets",
        "Design and run experiments to validate modeling approaches",
        "Collaborate with engineering and product teams to bring models to production",
        "Define and track model performance metrics and KPIs",
        "Translate business problems into data science solutions",
        "Stay current with ML research and integrate new techniques",
        "Build and maintain ML pipelines from data ingestion to serving"
      ],
      "required_skills": [
        "machine_learning",
        "python_data",
        "sql_advanced",
        "statistical_analysis",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "deep_learning",
        "mlops",
        "llm_genai_data",
        "cloud_data_platforms",
        "experimentation_framework"
      ],
      "tools": [
        "Python",
        "scikit-learn",
        "PyTorch",
        "TensorFlow",
        "SQL",
        "Spark",
        "Airflow",
        "AWS/GCP",
        "MLflow",
        "Docker",
        "Jupyter"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "phd_pivot_to_industry",
        "statistics_economics_background",
        "former_ml_researcher"
      ],
      "next_roles": [
        "senior_data_scientist",
        "ml_lead",
        "head_of_data"
      ],
      "similar_roles": [
        "data_analyst",
        "ai_engineer_mid",
        "applied_ai_researcher",
        "analytics_engineer"
      ],
      "not_to_confuse_with": [
        "Data Analyst",
        "AI Engineer",
        "Applied AI Researcher",
        "Data Engineer"
      ],
      "keywords": [
        "statistical modeling",
        "machine learning",
        "experimentation",
        "causal inference"
      ],
      "years_experience_typical": "3-7",
      "market_notes": {
        "israel": "Backgrounds: PhDs in statistics, economics, physics, or computer science from Israeli universities or international programs. Splits into applied / business-oriented (closer to product analyst with statistical modeling) and ML / research-oriented (closer to AI Engineer / Applied Researcher). Stack patterns: Python / R / SQL universal; PyTorch / scikit-learn / statsmodels; experiment platforms; causal inference toolkits where relevant. Hiring stage: heavy demand at AI-native companies (AI21 Labs, Aidoc, Run:ai, Hailo, Lightricks, Hour One), consumer companies with rich behavioral data (Lightricks, Plarium, Playtika, Gett), B2B SaaS with strong product analytics (monday.com, Wix, Gong, Fiverr), FinTech (Lemonade, Forter, Pagaya, eToro, Tipalti), and Israeli AI / research labs (NVIDIA Israel, Intel AI, Microsoft Research Israel, IBM Research Israel)."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "senior_data_analyst",
      "standardized_title": "Senior Data Analyst",
      "alternate_titles": [
        "Lead Data Analyst",
        "Principal Data Analyst",
        "Senior Business Analyst"
      ],
      "role_family": "Data",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Own complex analytical domains end-to-end, drive strategic data decisions across the business, and elevate data culture and practices across the organization.",
      "core_responsibilities": [
        "Own analytics for a key business domain with full end-to-end accountability",
        "Define and track critical business and product KPIs",
        "Conduct deep-dive analyses that shape strategic decisions and product roadmaps",
        "Design robust experimentation frameworks and lead A/B test analysis",
        "Build advanced dashboards and self-service analytics tools for stakeholders",
        "Partner directly with senior leadership on data strategy",
        "Mentor junior analysts and elevate team analytical standards",
        "Use AI and automation tools to accelerate analysis at scale",
        "Identify data quality issues and drive improvements proactively"
      ],
      "required_skills": [
        "sql_advanced",
        "data_analysis",
        "statistical_analysis",
        "bi_tools",
        "data_storytelling",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "python_data",
        "experimentation_framework",
        "product_analytics_expertise",
        "cloud_data_platforms",
        "cross_functional_collaboration"
      ],
      "tools": [
        "SQL",
        "Snowflake",
        "BigQuery",
        "Tableau",
        "Looker",
        "Python",
        "Mixpanel",
        "Amplitude",
        "dbt",
        "AI tools"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "analyst_promotion",
        "consulting_to_industry",
        "former_data_scientist_pivot"
      ],
      "next_roles": [
        "head_of_data",
        "analytics_engineer",
        "data_scientist"
      ],
      "similar_roles": [
        "data_scientist",
        "analytics_engineer",
        "business_intelligence_analyst",
        "head_of_data"
      ],
      "not_to_confuse_with": [
        "Data Scientist",
        "Head of Data"
      ],
      "keywords": [
        "senior IC analyst",
        "cross-functional analytics",
        "business strategy support"
      ],
      "years_experience_typical": "5-9",
      "market_notes": {
        "israel": "Backgrounds: data analyst promotion, consulting-to-industry, former data scientist pivot to broader analytics. 5-9 years typical. Stack patterns: same canonical analytics tooling (SQL + dbt + Looker / Tableau / Mode + Python) plus cross-functional partnership skills and executive presentation. Hiring stage: most common senior IC analytics role — sits between mid-level analyst and head_of_data. Heavy concentration at scale-ups and unicorns with mature analytics functions: monday.com, Wix, JFrog, Fiverr, Lemonade, Gong, HiBob, AppsFlyer, Wiz, Check Point. The role typically leads cross-functional analytics initiatives, owns critical business reviews, and mentors mid-level analysts."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "head_of_data",
      "standardized_title": "Head of Data & Analytics",
      "alternate_titles": [
        "VP Data",
        "Director of Data",
        "Head of Analytics",
        "Chief Data Officer"
      ],
      "role_family": "Data",
      "secondary_family": "Leadership",
      "seniority": "Director_Head",
      "core_purpose": "Own the entire data and analytics function — defining data strategy, building the team, setting standards, and turning data into a company-wide competitive advantage.",
      "core_responsibilities": [
        "Define and own the company's data and analytics strategy",
        "Build, lead, and develop a multidisciplinary data team (analysts, engineers, scientists)",
        "Set standards for SQL practices, dashboard design, data documentation, and quality",
        "Partner with Product, Marketing, Finance, and Engineering leadership on data priorities",
        "Own company-wide KPI frameworks and measurement standards",
        "Drive experimentation culture and A/B testing infrastructure",
        "Evaluate and manage the data tech stack",
        "Champion data-driven decision making across the organization",
        "Hire, mentor, and develop data talent at all levels"
      ],
      "required_skills": [
        "data_team_leadership",
        "data_analysis",
        "sql_advanced",
        "people_management",
        "data_storytelling",
        "analytical_thinking",
        "cross_functional_alignment"
      ],
      "preferred_skills": [
        "python_data",
        "machine_learning",
        "bi_tools",
        "cloud_data_platforms",
        "experimentation_framework",
        "organizational_design"
      ],
      "tools": [
        "SQL",
        "Snowflake",
        "Tableau",
        "Looker",
        "Python",
        "dbt",
        "Airflow",
        "Mixpanel",
        "AI tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "data_scientist_leadership_track",
        "analytics_director_promotion",
        "external_head_of_data_hire"
      ],
      "next_roles": [
        "vp_data",
        "chief_data_officer",
        "vp_product"
      ],
      "similar_roles": [
        "head_of_ai",
        "vp_engineering",
        "head_of_product"
      ],
      "not_to_confuse_with": [
        "Chief Data Officer",
        "Head of AI",
        "VP Engineering"
      ],
      "keywords": [
        "head of data",
        "VP data",
        "data org leader",
        "analytics leader"
      ],
      "years_experience_typical": "10-15",
      "market_notes": {
        "israel": "Backgrounds: data scientist leadership track, analytics director promotion, external Head of Data hire; increasingly common to see candidates with PhDs plus production leadership experience. 10-15 years typical. Stack patterns: org-level data strategy; vendor evaluation across warehouse / ETL / BI stacks; budget ownership; cross-team partnerships with engineering and product leadership. Hiring stage: critical role at any data-driven company past ~50 employees. Heavy at scale-ups and unicorns: monday.com, Wix, JFrog, Fiverr, Lemonade, Gong, HiBob, AppsFlyer, Wiz, CyberArk, SentinelOne, Lightricks. Reports to CTO or VP Engineering at early stages, sometimes directly to CEO at data-product companies (Lemonade, Forter, Pagaya, Riskified, Tipalti)."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "fpa_analyst",
      "standardized_title": "FP&A Analyst",
      "alternate_titles": [
        "Financial Planning & Analysis Analyst",
        "Junior FP&A Analyst",
        "Corporate FP&A Analyst",
        "Finance Analyst",
        "Financial Analyst"
      ],
      "role_family": "Finance",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Support financial planning, budgeting, and forecasting processes while acting as an analytical business partner to enable data-driven decisions across the organization.",
      "core_responsibilities": [
        "Support or own the annual budgeting process and rolling forecast cycles",
        "Conduct Budget vs. Actual (BvA) variance analysis with clear explanations",
        "Build and maintain financial models to support business decisions",
        "Partner with business stakeholders (R&D, Sales, Marketing, Operations) on financial analysis",
        "Prepare management reports and financial presentations for senior leadership",
        "Analyze key business metrics and performance trends",
        "Support quarterly close processes and executive reporting",
        "Track SaaS metrics including ARR, NDR, churn, and bookings (in tech context)"
      ],
      "required_skills": [
        "budget_forecasting",
        "financial_modeling",
        "bva_analysis",
        "excel_advanced_finance",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "saas_finance_metrics",
        "finance_business_partnering",
        "erp_systems_finance",
        "epm_planning_tools",
        "presentation_skills"
      ],
      "tools": [
        "Excel",
        "Google Sheets",
        "NetSuite",
        "Pigment",
        "Anaplan",
        "PBCS",
        "Salesforce",
        "BI tools",
        "PowerPoint"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Planning",
        "Analysis",
        "Reporting"
      ],
      "typical_backgrounds": [
        "economics",
        "accounting",
        "finance",
        "business_administration",
        "industrial_engineering"
      ],
      "next_roles": [
        "senior_fpa_analyst",
        "finance_manager",
        "finance_business_partner"
      ],
      "similar_roles": [
        "Financial Analyst",
        "Corporate Finance Analyst",
        "Business Finance Analyst"
      ],
      "not_to_confuse_with": [
        "Controller",
        "Financial Analyst (accounting)",
        "Senior FP&A Analyst"
      ],
      "keywords": [
        "FP&A",
        "budgeting",
        "forecasting",
        "BvA",
        "variance analysis",
        "financial modeling",
        "Excel",
        "NetSuite",
        "SaaS metrics",
        "ARR",
        "business partner",
        "management reporting"
      ]
    },
    {
      "id": "senior_fpa_analyst",
      "standardized_title": "Senior FP&A Analyst",
      "alternate_titles": [
        "Senior Financial Analyst",
        "FP&A Manager",
        "Finance Business Partner",
        "FP&A Lead"
      ],
      "role_family": "Finance",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Drive financial planning and analysis at a senior level — owning complex models, leading business partnerships, and providing strategic insights that shape company decisions.",
      "core_responsibilities": [
        "Lead annual budgeting and rolling forecast cycles end-to-end",
        "Own complex financial models for strategic initiatives and scenario planning",
        "Deliver deep-dive BvA analysis with actionable management narratives",
        "Act as primary financial partner to senior leadership across departments",
        "Track and analyze SaaS metrics — ARR, NDR, churn, bookings, burn rate",
        "Develop KPI dashboards and performance monitoring frameworks",
        "Support board and investor reporting with financial analysis",
        "Lead or mentor junior FP&A team members",
        "Drive continuous improvement of FP&A processes and tools"
      ],
      "required_skills": [
        "budget_forecasting",
        "financial_modeling",
        "bva_analysis",
        "excel_advanced_finance",
        "finance_business_partnering",
        "saas_finance_metrics"
      ],
      "preferred_skills": [
        "erp_systems_finance",
        "epm_planning_tools",
        "stakeholder_management",
        "presentation_skills",
        "analytical_thinking"
      ],
      "tools": [
        "Excel",
        "Google Sheets",
        "NetSuite",
        "Pigment",
        "Anaplan",
        "Salesforce",
        "Tableau",
        "PowerPoint",
        "BI tools"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Planning",
        "Analysis",
        "Reporting",
        "Strategy"
      ],
      "typical_backgrounds": [
        "fpa_analyst",
        "investment_banking",
        "consulting",
        "economics",
        "accounting"
      ],
      "next_roles": [
        "finance_manager",
        "vp_finance_cfo",
        "head_of_finance"
      ],
      "similar_roles": [
        "FP&A Manager",
        "Finance Business Partner",
        "Senior Financial Analyst"
      ],
      "not_to_confuse_with": [
        "FP&A Analyst",
        "Controller",
        "Finance Manager"
      ],
      "keywords": [
        "FP&A",
        "senior",
        "financial modeling",
        "BvA",
        "ARR",
        "SaaS metrics",
        "business partner",
        "forecasting",
        "budgeting",
        "NetSuite",
        "Pigment",
        "board reporting",
        "Excel"
      ]
    },
    {
      "id": "controller",
      "standardized_title": "Controller",
      "alternate_titles": [
        "Financial Controller",
        "Assistant Controller",
        "Junior Controller",
        "VP Finance (accounting-focused)"
      ],
      "role_family": "Finance",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own the accounting function — ensuring accurate financial reporting, compliance, and controls while managing the month-end close and audit processes.",
      "core_responsibilities": [
        "Lead monthly, quarterly, and annual close processes",
        "Prepare financial statements in accordance with US GAAP or IFRS",
        "Manage accounts payable, accounts receivable, billing, and collections",
        "Serve as primary point of contact for external auditors",
        "Ensure compliance with tax requirements and regulatory obligations",
        "Maintain and improve internal financial controls and procedures",
        "Oversee bookkeeping operations and supervise junior finance staff",
        "Manage revenue recognition processes",
        "Work with Priority, NetSuite, or other ERP systems"
      ],
      "required_skills": [
        "cpa_accounting",
        "financial_reporting",
        "gaap_ifrs",
        "audit_management",
        "erp_systems_finance",
        "excel_advanced_finance"
      ],
      "preferred_skills": [
        "revenue_recognition",
        "cash_flow_management",
        "budget_forecasting",
        "bva_analysis",
        "process_improvement"
      ],
      "tools": [
        "NetSuite",
        "Priority ERP",
        "SAP",
        "Excel",
        "Bill.com",
        "Mesh",
        "Dokka",
        "Salesforce"
      ],
      "technical_depth": "Medium-High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Compliance",
        "Reporting",
        "Operations"
      ],
      "typical_backgrounds": [
        "big_4_accountant",
        "cpa",
        "accounting"
      ],
      "next_roles": [
        "finance_manager",
        "vp_finance_cfo"
      ],
      "similar_roles": [
        "Assistant Controller",
        "Financial Controller",
        "Junior Controller"
      ],
      "not_to_confuse_with": [
        "Finance Manager",
        "FP&A Analyst",
        "VP Finance"
      ],
      "keywords": [
        "CPA",
        "controller",
        "GAAP",
        "IFRS",
        "audit",
        "month-end close",
        "financial statements",
        "Big 4",
        "NetSuite",
        "Priority",
        "compliance",
        "reconciliations",
        "revenue recognition"
      ],
      "market_notes": {
        "israel": "CPA certification is mandatory in the Israeli high-tech market. Big 4 internship experience is required or strongly preferred by most companies. Priority ERP is the dominant system in Israeli companies; NetSuite is common in US-facing or international entities."
      }
    },
    {
      "id": "finance_manager",
      "standardized_title": "Finance Manager",
      "alternate_titles": [
        "Senior Finance Manager",
        "Director of Finance (smaller companies)",
        "Head of Accounting"
      ],
      "role_family": "Finance",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Lead the company's finance function — combining accounting oversight with financial planning to support executive decision-making and business growth.",
      "core_responsibilities": [
        "Manage and oversee financial operations, reporting, and compliance",
        "Lead financial planning, budgeting, and forecasting processes",
        "Prepare and review monthly, quarterly, and annual financial statements",
        "Monitor cash flow, profitability, and financial performance",
        "Supervise and develop the accounting and finance team",
        "Develop and implement financial policies and internal controls",
        "Prepare management reports and financial analysis for senior leadership",
        "Work with external auditors, banks, and financial advisors",
        "Identify opportunities for cost reduction and process improvement"
      ],
      "required_skills": [
        "financial_reporting",
        "budget_forecasting",
        "financial_modeling",
        "cpa_accounting",
        "gaap_ifrs",
        "people_management"
      ],
      "preferred_skills": [
        "cash_flow_management",
        "erp_systems_finance",
        "finance_business_partnering",
        "audit_management",
        "stakeholder_management"
      ],
      "tools": [
        "NetSuite",
        "Priority ERP",
        "Excel",
        "SAP",
        "BI tools",
        "PowerPoint"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Compliance",
        "Planning",
        "Reporting",
        "Strategy"
      ],
      "typical_backgrounds": [
        "controller",
        "fpa_analyst",
        "big_4_accountant",
        "senior_fpa_analyst"
      ],
      "next_roles": [
        "vp_finance_cfo",
        "head_of_finance"
      ],
      "similar_roles": [
        "Director of Finance",
        "Head of Accounting",
        "Senior Finance Manager"
      ],
      "not_to_confuse_with": [
        "Controller",
        "FP&A Manager",
        "VP Finance"
      ],
      "keywords": [
        "finance manager",
        "CPA",
        "budgeting",
        "financial reporting",
        "team management",
        "internal controls",
        "GAAP",
        "IFRS",
        "cash flow",
        "ERP",
        "Excel"
      ]
    },
    {
      "id": "vp_finance_cfo",
      "standardized_title": "VP Finance / CFO",
      "alternate_titles": [
        "VP Finance",
        "CFO",
        "Chief Financial Officer",
        "Head of Finance",
        "Finance Director",
        "Founding VP Finance"
      ],
      "role_family": "Finance",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Own the company's entire financial function — setting financial strategy, leading the team, supporting fundraising, and serving as a strategic partner to the CEO and board.",
      "core_responsibilities": [
        "Own all financial operations: budgeting, forecasting, cash management, and reporting",
        "Lead financial planning and analysis across the company",
        "Partner with the CEO and board on fundraising, investor relations, and strategic decisions",
        "Build and develop the finance team (FP&A, accounting, reporting)",
        "Ensure financial compliance, controls, and regulatory requirements across entities",
        "Manage multi-entity structures including US and Israeli subsidiaries",
        "Present financial performance and strategy to board and investors",
        "Lead or support M&A, due diligence, and strategic initiatives",
        "Drive ERP implementation and financial infrastructure"
      ],
      "required_skills": [
        "financial_modeling",
        "budget_forecasting",
        "investor_relations_finance",
        "saas_finance_metrics",
        "people_management",
        "stakeholder_management",
        "financial_reporting"
      ],
      "preferred_skills": [
        "cpa_accounting",
        "gaap_ifrs",
        "cash_flow_management",
        "executive_leadership",
        "finance_business_partnering"
      ],
      "tools": [
        "NetSuite",
        "Excel",
        "Pigment",
        "Anaplan",
        "Salesforce",
        "BI tools",
        "SAP",
        "Oracle"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Executive",
      "lifecycle_stage": [
        "Strategy",
        "Planning",
        "Compliance",
        "Reporting"
      ],
      "typical_backgrounds": [
        "finance_manager",
        "senior_fpa_analyst",
        "investment_banking",
        "big_4_partner"
      ],
      "next_roles": [
        "cfo",
        "board_member"
      ],
      "similar_roles": [
        "CFO",
        "Head of Finance",
        "Finance Director",
        "Founding VP Finance"
      ],
      "not_to_confuse_with": [
        "Finance Manager",
        "Controller",
        "FP&A Manager"
      ],
      "keywords": [
        "VP Finance",
        "CFO",
        "financial strategy",
        "fundraising",
        "investor relations",
        "board",
        "SaaS metrics",
        "ARR",
        "burn rate",
        "multi-entity",
        "US GAAP",
        "team leadership",
        "FP&A",
        "budgeting"
      ]
    },
    {
      "id": "hr_generalist",
      "standardized_title": "HR Generalist",
      "alternate_titles": [
        "People & Culture Generalist",
        "HR Coordinator",
        "HR & Office Manager",
        "People Operations Associate",
        "HR Specialist"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Entry_Mid",
      "core_purpose": "Support the full range of HR functions across the employee lifecycle — from recruitment and onboarding to employee relations and compliance — in a generalist capacity.",
      "core_responsibilities": [
        "Support end-to-end recruitment processes including sourcing and interviews",
        "Manage onboarding and offboarding processes for employees",
        "Maintain employee records and data in HRIS systems",
        "Handle employee inquiries on HR policies and benefits",
        "Support compliance with Israeli labor law requirements",
        "Assist with performance management cycles and documentation",
        "Coordinate employee welfare and engagement activities",
        "Support payroll-related administration and documentation"
      ],
      "required_skills": [
        "employee_lifecycle_management",
        "talent_acquisition_recruiting",
        "israeli_labor_law",
        "cross_functional_collaboration",
        "organization"
      ],
      "preferred_skills": [
        "hris_management",
        "employee_experience",
        "performance_management",
        "analytical_thinking",
        "learning_development"
      ],
      "tools": [
        "HiBob",
        "Workday",
        "LinkedIn Recruiter",
        "Comeet",
        "Greenhouse",
        "Excel",
        "Google Workspace"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Internal",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Operations",
        "Recruitment",
        "Compliance"
      ],
      "typical_backgrounds": [
        "human_resources",
        "behavioral_science",
        "psychology",
        "business_administration"
      ],
      "next_roles": [
        "hr_business_partner",
        "hr_operations_manager",
        "talent_acquisition_manager"
      ],
      "similar_roles": [
        "People Ops Associate",
        "HR Coordinator",
        "HR & Office Manager"
      ],
      "not_to_confuse_with": [
        "HR Business Partner",
        "HR Operations Manager",
        "Recruiter"
      ],
      "keywords": [
        "HR generalist",
        "onboarding",
        "offboarding",
        "recruitment",
        "labor law",
        "HRIS",
        "employee lifecycle",
        "engagement",
        "HiBob",
        "LinkedIn"
      ]
    },
    {
      "id": "hr_operations_manager",
      "standardized_title": "HR Operations Manager",
      "alternate_titles": [
        "People Operations Manager",
        "HR Ops Manager",
        "People Operations Specialist",
        "HR Systems Manager"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own the operational backbone of the HR function — building scalable processes, managing HRIS systems, ensuring data integrity, and enabling the People team to operate efficiently at scale.",
      "core_responsibilities": [
        "Own and optimize end-to-end employee lifecycle operations",
        "Manage and maintain HRIS platforms ensuring data accuracy and automation",
        "Build complex HR reports and translate data into insights for leadership",
        "Design and implement scalable HR processes for a growing organization",
        "Ensure compliance with local and international employment regulations",
        "Partner with Finance, IT, and Legal on headcount, payroll, and compliance",
        "Lead HR tech stack implementation and optimization",
        "Manage Israeli payroll-related administration including Hilan"
      ],
      "required_skills": [
        "hris_management",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "process_improvement",
        "israeli_labor_law"
      ],
      "preferred_skills": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "organizational_development",
        "bi_tools",
        "systems_thinking"
      ],
      "tools": [
        "HiBob",
        "Workday",
        "Hilan",
        "Zendesk",
        "Excel",
        "Power BI",
        "Awardco",
        "Google Workspace"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Internal",
      "revenue_ownership": "None",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Operations",
        "Compliance",
        "Data"
      ],
      "typical_backgrounds": [
        "hr_generalist",
        "industrial_engineering",
        "operations",
        "business_administration"
      ],
      "next_roles": [
        "hr_manager",
        "head_of_hr_people"
      ],
      "similar_roles": [
        "People Operations Specialist",
        "HR Systems Manager"
      ],
      "not_to_confuse_with": [
        "HR Generalist",
        "HR Business Partner",
        "HR Manager"
      ],
      "keywords": [
        "HR ops",
        "HRIS",
        "HiBob",
        "Workday",
        "Hilan",
        "people data",
        "process design",
        "compliance",
        "employee lifecycle",
        "analytics",
        "automation"
      ]
    },
    {
      "id": "ld_specialist",
      "standardized_title": "L&D Specialist",
      "alternate_titles": [
        "Learning & Development Specialist",
        "L&D Operations",
        "Training Specialist",
        "L&D Expert",
        "Organizational Development Specialist"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Design, deliver, and manage learning and development programs that build employee capabilities, drive engagement, and support organizational growth.",
      "core_responsibilities": [
        "Design and deliver training programs including onboarding, management, and soft skills",
        "Manage LMS platforms and digital learning administration",
        "Coordinate training logistics, vendors, and facilitators globally",
        "Track learning metrics and evaluate program effectiveness",
        "Partner with HRBPs and business leaders to diagnose capability gaps",
        "Build and manage compliance training programs",
        "Design learning paths and career development frameworks",
        "Use AI tools for content creation and learning personalization"
      ],
      "required_skills": [
        "learning_development",
        "organizational_development",
        "program_management",
        "cross_functional_collaboration",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "hr_data_analytics",
        "stakeholder_management",
        "employee_experience",
        "presentation_skills",
        "coaching"
      ],
      "tools": [
        "LMS platforms",
        "Skilljar",
        "Udemy",
        "LinkedIn Learning",
        "Zoom",
        "Excel",
        "PowerPoint",
        "AI content tools"
      ],
      "technical_depth": "Low-Medium",
      "customer_facing_level": "Internal",
      "revenue_ownership": "None",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Learning",
        "Development",
        "Engagement"
      ],
      "typical_backgrounds": [
        "hr_generalist",
        "psychology",
        "education",
        "organizational_behavior",
        "communications"
      ],
      "next_roles": [
        "hr_business_partner",
        "hr_manager",
        "head_of_hr_people"
      ],
      "similar_roles": [
        "Training Specialist",
        "OD Specialist",
        "L&D Expert"
      ],
      "not_to_confuse_with": [
        "HR Generalist",
        "HR Business Partner",
        "HR Operations Manager"
      ],
      "keywords": [
        "L&D",
        "learning",
        "training",
        "LMS",
        "onboarding",
        "capability building",
        "organizational development",
        "facilitation",
        "upskilling",
        "AI tools"
      ]
    },
    {
      "id": "hr_business_partner",
      "standardized_title": "HR Business Partner",
      "alternate_titles": [
        "HRBP",
        "People Partner",
        "Senior HRBP",
        "People Business Partner"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Serve as a strategic and operational partner to business leaders — translating people strategy into practice, coaching managers, and driving organizational effectiveness.",
      "core_responsibilities": [
        "Partner with managers and leaders to support team performance and effectiveness",
        "Coach managers on people decisions including performance, compensation, and development",
        "Lead talent management activities — development, succession, and retention",
        "Drive employee engagement and culture initiatives within business units",
        "Support organizational design and workforce planning",
        "Handle employee relations matters with fairness and sound judgment",
        "Implement global HR frameworks (Talent, Reward, L&D) locally",
        "Use data and insights to identify trends and influence people decisions",
        "Support change management through periods of growth or restructuring"
      ],
      "required_skills": [
        "hr_business_partnering",
        "performance_management",
        "organizational_development",
        "stakeholder_management",
        "coaching"
      ],
      "preferred_skills": [
        "employee_lifecycle_management",
        "hr_data_analytics",
        "talent_acquisition_recruiting",
        "learning_development",
        "israeli_labor_law"
      ],
      "tools": [
        "HiBob",
        "Workday",
        "Excel",
        "Google Workspace",
        "Hilan",
        "ATS systems"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Internal",
      "revenue_ownership": "None",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Partnership",
        "Development",
        "Engagement"
      ],
      "typical_backgrounds": [
        "hr_generalist",
        "psychology",
        "organizational_behavior",
        "business_administration"
      ],
      "next_roles": [
        "hr_manager",
        "head_of_hr_people"
      ],
      "similar_roles": [
        "People Partner",
        "Senior HRBP",
        "People Business Partner"
      ],
      "not_to_confuse_with": [
        "HR Generalist",
        "HR Manager",
        "L&D Specialist"
      ],
      "keywords": [
        "HRBP",
        "business partner",
        "manager coaching",
        "performance management",
        "talent management",
        "organizational development",
        "employee relations",
        "workforce planning",
        "engagement"
      ]
    },
    {
      "id": "compensation_benefits_specialist",
      "standardized_title": "Compensation & Benefits Specialist",
      "alternate_titles": [
        "C&B Specialist",
        "Total Rewards Specialist",
        "Compensation Analyst",
        "People Analytics & C&B Specialist",
        "FP&A Compensation Expert"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Design and manage competitive compensation and benefits programs that attract, retain, and motivate talent while ensuring market alignment and internal equity.",
      "core_responsibilities": [
        "Conduct market benchmarking and salary surveys to ensure competitive positioning",
        "Manage salary structures, job evaluation, and compensation review cycles",
        "Support annual salary and equity budgeting processes",
        "Partner with HRBPs and Finance on offers, promotions, and adjustments",
        "Administer employee benefits programs and vendor relationships",
        "Build HR analytics dashboards for compensation, headcount, and attrition",
        "Ensure compliance with compensation regulations and internal equity",
        "Manage HRIS data accuracy for compensation-related processes"
      ],
      "required_skills": [
        "compensation_benefits",
        "hr_data_analytics",
        "analytical_thinking",
        "excel_advanced_finance",
        "stakeholder_management"
      ],
      "preferred_skills": [
        "hris_management",
        "financial_modeling",
        "bi_tools",
        "cross_functional_collaboration",
        "data_analysis"
      ],
      "tools": [
        "HiBob",
        "Workday",
        "Excel",
        "Power BI",
        "Tableau",
        "Pigment",
        "Radford",
        "Mercer"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Internal",
      "revenue_ownership": "None",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Compensation",
        "Analytics",
        "Compliance"
      ],
      "typical_backgrounds": [
        "hr_generalist",
        "finance",
        "economics",
        "industrial_engineering",
        "statistics"
      ],
      "next_roles": [
        "hr_manager",
        "head_of_hr_people"
      ],
      "similar_roles": [
        "Total Rewards Specialist",
        "People Analytics Specialist",
        "Compensation Analyst"
      ],
      "not_to_confuse_with": [
        "HR Generalist",
        "HR Business Partner",
        "FP&A Analyst"
      ],
      "keywords": [
        "C&B",
        "compensation",
        "benefits",
        "salary",
        "equity",
        "benchmarking",
        "total rewards",
        "market data",
        "people analytics",
        "HRIS",
        "HiBob"
      ]
    },
    {
      "id": "talent_acquisition_manager",
      "standardized_title": "Talent Acquisition Manager",
      "alternate_titles": [
        "Head of Talent Acquisition",
        "Recruiting Manager",
        "TA Manager",
        "Talent Acquisition Lead"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Lead the talent acquisition function — building and managing recruiting teams, defining hiring strategy, and ensuring the organization attracts top talent at scale.",
      "core_responsibilities": [
        "Lead, coach, and develop a team of recruiters",
        "Build and execute a recruitment strategy aligned with business goals",
        "Drive employer branding and talent attraction initiatives",
        "Own full-cycle recruitment for senior or critical roles",
        "Partner with hiring managers to define needs and priorities",
        "Analyze recruiting metrics and optimize pipeline performance",
        "Implement AI recruiting tools and ATS systems",
        "Develop scalable sourcing strategies across channels",
        "Ensure exceptional candidate experience throughout the process"
      ],
      "required_skills": [
        "talent_acquisition_recruiting",
        "employer_branding",
        "people_management",
        "stakeholder_management",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "hr_data_analytics",
        "cross_functional_collaboration",
        "organizational_development",
        "coaching",
        "process_improvement"
      ],
      "tools": [
        "LinkedIn Recruiter",
        "Greenhouse",
        "Comeet",
        "Workable",
        "ATS systems",
        "HiBob",
        "AI sourcing tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "External_Candidates",
      "revenue_ownership": "None",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Recruitment",
        "Employer Brand"
      ],
      "typical_backgrounds": [
        "hr_generalist",
        "recruiter",
        "agency_recruiter",
        "hr_business_partner"
      ],
      "next_roles": [
        "head_of_hr_people",
        "vp_people"
      ],
      "similar_roles": [
        "Head of Talent Acquisition",
        "TA Lead",
        "Recruiting Manager"
      ],
      "not_to_confuse_with": [
        "HR Generalist",
        "HR Business Partner",
        "HR Manager"
      ],
      "keywords": [
        "talent acquisition",
        "recruiting",
        "TA manager",
        "sourcing",
        "employer branding",
        "full-cycle",
        "ATS",
        "LinkedIn",
        "hiring strategy",
        "AI recruiting",
        "team management"
      ]
    },
    {
      "id": "hr_manager",
      "standardized_title": "HR Manager",
      "alternate_titles": [
        "People Manager",
        "Senior HR Manager",
        "Director of HR (smaller companies)"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Own the HR function for a company or business unit — combining operational execution with strategic partnership to build a strong people foundation for growth.",
      "core_responsibilities": [
        "Own the full employee lifecycle from onboarding through offboarding",
        "Develop and implement HR policies and procedures compliant with Israeli labor law",
        "Lead recruitment processes in partnership with hiring managers",
        "Drive performance management and employee development programs",
        "Oversee benefits administration and compensation processes",
        "Manage HR reporting and people analytics",
        "Lead employee engagement and culture-building initiatives",
        "Implement and optimize HRIS tools and HR infrastructure",
        "Partner with global HR teams on cross-border alignment"
      ],
      "required_skills": [
        "hr_business_partnering",
        "employee_lifecycle_management",
        "talent_acquisition_recruiting",
        "israeli_labor_law",
        "people_management"
      ],
      "preferred_skills": [
        "hris_management",
        "compensation_benefits",
        "learning_development",
        "hr_data_analytics",
        "organizational_development"
      ],
      "tools": [
        "HiBob",
        "Workday",
        "Hilan",
        "LinkedIn Recruiter",
        "Excel",
        "ATS systems",
        "Google Workspace"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Internal",
      "revenue_ownership": "None",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Operations",
        "Partnership",
        "Compliance",
        "Development"
      ],
      "typical_backgrounds": [
        "hr_generalist",
        "hr_business_partner",
        "talent_acquisition",
        "hr_operations"
      ],
      "next_roles": [
        "head_of_hr_people",
        "vp_people"
      ],
      "similar_roles": [
        "Senior HR Manager",
        "People Manager",
        "Director of HR"
      ],
      "not_to_confuse_with": [
        "HR Business Partner",
        "HR Operations Manager",
        "Head of HR"
      ],
      "keywords": [
        "HR manager",
        "employee lifecycle",
        "labor law",
        "recruitment",
        "performance management",
        "HRIS",
        "HiBob",
        "engagement",
        "compliance",
        "culture"
      ]
    },
    {
      "id": "head_of_hr_people",
      "standardized_title": "Head of HR / VP People",
      "alternate_titles": [
        "VP People",
        "Chief People Officer",
        "Director of People",
        "Head of People",
        "Head of HR"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Own the entire people function — setting HR strategy, building the team, shaping culture, and serving as a strategic partner to the CEO and leadership on all people-related matters.",
      "core_responsibilities": [
        "Define and execute the company's people strategy aligned with business goals",
        "Build and lead the HR team across recruitment, operations, L&D, and HRBP",
        "Partner with CEO and leadership on organizational design and workforce planning",
        "Own compensation philosophy, performance frameworks, and talent programs",
        "Drive culture, engagement, and employer brand initiatives",
        "Ensure compliance with Israeli and international employment regulations",
        "Implement and scale HRIS infrastructure and people processes",
        "Lead hiring strategy and ensure quality talent acquisition at scale",
        "Present people insights and recommendations to board and leadership"
      ],
      "required_skills": [
        "hr_business_partnering",
        "people_management",
        "organizational_development",
        "talent_acquisition_recruiting",
        "stakeholder_management",
        "employee_lifecycle_management"
      ],
      "preferred_skills": [
        "compensation_benefits",
        "hr_data_analytics",
        "learning_development",
        "israeli_labor_law",
        "executive_leadership",
        "employer_branding"
      ],
      "tools": [
        "HiBob",
        "Workday",
        "Hilan",
        "LinkedIn Recruiter",
        "Excel",
        "ATS systems",
        "BI tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Internal",
      "revenue_ownership": "None",
      "strategic_level": "Executive",
      "lifecycle_stage": [
        "Strategy",
        "Operations",
        "Development",
        "Culture"
      ],
      "typical_backgrounds": [
        "hr_manager",
        "hr_business_partner",
        "talent_acquisition_manager"
      ],
      "next_roles": [
        "cpo",
        "board_member"
      ],
      "similar_roles": [
        "VP People",
        "Chief People Officer",
        "Director of People"
      ],
      "not_to_confuse_with": [
        "HR Manager",
        "HR Business Partner",
        "HR Operations Manager"
      ],
      "keywords": [
        "VP People",
        "CPO",
        "head of HR",
        "people strategy",
        "culture",
        "organizational design",
        "HiBob",
        "team leadership",
        "workforce planning",
        "compliance",
        "engagement"
      ]
    },
    {
      "id": "revops_analyst",
      "standardized_title": "Revenue Operations Analyst",
      "role_family": "RevOps_BizOps",
      "secondary_family": "Data",
      "seniority": "Mid",
      "core_purpose": "Supports the revenue operations function by maintaining CRM data hygiene, building dashboards, managing lead routing, and ensuring data accuracy across the sales funnel. Acts as the operational backbone for GTM teams by identifying bottlenecks and implementing automated workflows.",
      "core_responsibilities": [
        "Maintain CRM data integrity and lead-to-cash process accuracy",
        "Build and maintain dashboards tracking pipeline health, sales velocity, and North Star metrics",
        "Administer tech stack integrations between CRM and third-party tools (Gong, ZoomInfo, Clay)",
        "Identify funnel bottlenecks through data analysis and implement automated workflows",
        "Deliver weekly reports on pipeline health, churn trends, and conversion metrics",
        "Support lead routing and database hygiene as the single source of truth",
        "Drive team adoption of tools and processes through training sessions and documentation"
      ],
      "required_skills": [
        "sql",
        "revenue_operations",
        "revops_crm_administration",
        "data_visualization_design",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "sales_forecasting",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Salesforce / HubSpot",
        "Excel / Google Sheets",
        "Tableau / Power BI / Looker",
        "Gong",
        "ZoomInfo / Clay",
        "SQL"
      ],
      "years_experience_typical": "1-3",
      "market_notes": {
        "israel": "Backgrounds: revenue analyst promotion, ex-consultants pivoting to operations, sometimes senior data analysts with commercial specialization. Stack patterns: Salesforce + Looker / Mode + Clari / Boostup + CPQ (DealHub, Salesforce CPQ) + LeanData / Default + Outreach / Salesloft for cadence operations. Hiring stage: common at B2B SaaS scale-ups and unicorns — monday.com, JFrog, Gong, HiBob, AppsFlyer, Wiz, Check Point, CyberArk, SentinelOne, Forter, Tipalti, Lemonade, Payoneer."
      },
      "alternate_titles": [
        "Senior Revenue Operations Analyst",
        "RevOps Analyst",
        "GTM Analyst"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "revenue_analyst",
        "business_analyst",
        "revops_manager"
      ]
    },
    {
      "id": "revops_manager",
      "standardized_title": "Revenue Operations Manager",
      "role_family": "RevOps_BizOps",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Owns the operational backbone for business development and account management teams — pipelines, forecasting, handoffs, and coverage models. Bridges business needs and execution by leading cross-functional projects that enhance GTM processes or introduce scalable solutions. Drives prioritization frameworks and ensures teams operate against them.",
      "core_responsibilities": [
        "Build and maintain the commercial operating system: pipelines, forecasting, handoffs, and coverage models",
        "Lead cross-functional projects from initiation to completion ensuring timely delivery",
        "Own commercial dashboards and reporting: GMV, revenue, cohort performance, and solution-level metrics",
        "Design and implement scalable workflows across CRM, analytics, and internal tools",
        "Drive prioritization frameworks (tiers, ICP, wallet share) and ensure team adherence",
        "Partner with Product Marketing to build repeatable GTM assets and enablement materials",
        "Lead user acceptance testing, troubleshoot issues, and support rollout of new tools",
        "Train and enable teams on implemented processes and tools",
        "Collaborate with stakeholders to review current processes and propose enhancements"
      ],
      "required_skills": [
        "revenue_operations",
        "revops_crm_administration",
        "people_management",
        "process_design",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "sales_forecasting",
        "cross_functional_collaboration",
        "stakeholder_management"
      ],
      "tools": [
        "Salesforce / HubSpot",
        "CPQ tools",
        "Mixpanel / SensorTower",
        "Monday.com / Asana",
        "Tableau / Looker / Power BI",
        "Excel / Google Sheets",
        "SQL"
      ],
      "years_experience_typical": "3-6",
      "market_notes": {
        "israel": "Backgrounds: revops analyst promotion, sales ops manager promotion, ex-consultants with deep commercial specialization. Stack patterns: Salesforce administration + CPQ + LeanData / Default + Outreach / Salesloft + Clari / Boostup + Looker / Mode dashboards. Hiring stage: standard at scale-ups and unicorns — monday.com, JFrog, Gong, HiBob, AppsFlyer, Wiz, Check Point, CyberArk, SentinelOne, Forter, Tipalti, Lemonade, Payoneer. Often manages 3-5 RevOps analysts plus Salesforce admins."
      },
      "alternate_titles": [
        "Senior Revenue Operations Manager",
        "RevOps Manager",
        "Head of Sales Ops"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "sales_operations_manager",
        "business_ops_manager",
        "head_of_revops"
      ]
    },
    {
      "id": "head_of_revops",
      "standardized_title": "Head of Revenue Operations / Senior RevOps Manager",
      "role_family": "RevOps_BizOps",
      "secondary_family": "Leadership",
      "seniority": "Director_Head",
      "core_purpose": "Leads the entire revenue operations function, owning the processes, data infrastructure, and insights that enable commercial teams to scale efficiently. Partners with revenue leadership on quarterly planning, headcount modeling, KPIs, and board-level reporting. Ensures operational predictability across the full customer lifecycle.",
      "core_responsibilities": [
        "Own the end-to-end revenue operations strategy across sales, marketing, and customer success",
        "Lead quarterly and annual planning processes including headcount modeling and territory design",
        "Build and manage the commercial data infrastructure and reporting frameworks",
        "Drive board-level reporting on GMV, revenue, pipeline, and operational metrics",
        "Lead strategic projects across DTC analytics, publisher/customer segmentation, and GTM experimentation",
        "Manage and develop the RevOps team including analysts and managers",
        "Partner with Product and Engineering to shape tooling and platform roadmap",
        "Ensure cross-functional alignment between Sales, Marketing, CS, Product, and Finance",
        "Design compensation and incentive structures in partnership with Finance and HR"
      ],
      "required_skills": [
        "revenue_operations",
        "organizational_design",
        "people_management",
        "executive_presentation",
        "process_design"
      ],
      "preferred_skills": [
        "sales_forecasting",
        "stakeholder_management",
        "board_management"
      ],
      "tools": [
        "Salesforce (advanced administration)",
        "BI tools (Tableau, Looker, Power BI)",
        "CPQ / billing platforms",
        "Data warehouses (BigQuery, Snowflake)",
        "Excel / Google Sheets (advanced modeling)",
        "SQL",
        "Monday.com / Asana / Jira"
      ],
      "years_experience_typical": "6-10",
      "market_notes": {
        "israel": "Backgrounds: revops manager promotion, sales ops director promotion, ex-consultants with deep commercial specialization. Stack patterns: org-level RevOps strategy; comp plan design; territory planning; forecasting infrastructure; tech stack ownership across Salesforce / Clari / Outreach / Gong / LeanData. Hiring stage: standard at scale-ups (Series C+) and unicorns where commercial complexity demands dedicated executive RevOps leadership — monday.com, JFrog, Wiz, Check Point, CyberArk, SentinelOne, AppsFlyer, Gong, HiBob, Forter, Tipalti, Lemonade. Reports to CRO, VP Sales, or COO."
      },
      "alternate_titles": [
        "VP Revenue Operations",
        "Head of RevOps",
        "Director of Revenue Operations"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "revops_manager",
        "vp_operations",
        "vp_sales"
      ]
    },
    {
      "id": "business_analyst",
      "standardized_title": "Business Analyst",
      "role_family": "RevOps_BizOps",
      "secondary_family": "Data",
      "seniority": "Mid",
      "core_purpose": "Transforms data into actionable insights by analyzing business performance, building dashboards, and collaborating with stakeholders to support data-driven decision-making. May specialize in Salesforce business analysis, financial modeling, or operational analytics depending on the company.",
      "core_responsibilities": [
        "Collect, process, and analyze data from various sources to drive business performance",
        "Design and build interactive dashboards and reports (Power BI, Tableau, Looker)",
        "Collaborate with business stakeholders to understand data needs and translate them into analytical solutions",
        "Identify trends, correlations, and insights to inform strategic decisions",
        "Maintain and optimize data models, reporting pipelines, and documentation",
        "Gather, analyze, and document business requirements for system implementations",
        "Support user acceptance testing and rollout of new tools or processes",
        "Translate business requirements into technical designs for CRM and internal systems"
      ],
      "required_skills": [
        "sql",
        "data_visualization_design",
        "analytical_thinking",
        "stakeholder_management",
        "business_understanding"
      ],
      "preferred_skills": [
        "financial_modeling",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Excel / Google Sheets (advanced)",
        "Power BI / Tableau / Looker",
        "SQL",
        "Salesforce",
        "PowerPoint",
        "Python (advantage)",
        "ERP systems (Priority, SAP)"
      ],
      "years_experience_typical": "1-4",
      "market_notes": {
        "israel": "Backgrounds: industrial engineering, economics, or finance graduates; ex-consultants from McKinsey / BCG / Bain Israel offices. Stack patterns: SQL + Excel / Sheets financial modeling + Looker / Mode + Salesforce + Notion for documentation. Hiring stage: common at scale-ups and unicorns with mature business operations — monday.com, Wix, JFrog, Lemonade, Payoneer, AppsFlyer, HiBob, Forter, Tipalti, Wiz, Check Point. Often a generalist business problem-solver supporting multiple functions."
      },
      "alternate_titles": [
        "Senior Business Analyst",
        "BizOps Analyst",
        "Business Operations Analyst"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "business_ops_analyst",
        "revops_analyst",
        "operations_analyst"
      ]
    },
    {
      "id": "business_ops_analyst",
      "standardized_title": "Business Operations Analyst",
      "role_family": "RevOps_BizOps",
      "secondary_family": "Data",
      "seniority": "Mid",
      "core_purpose": "Supports the business operations function by handling day-to-day operational tasks, streamlining processes, and collaborating across teams. Focuses on invoicing, contract management, revenue tracking, and building automation to improve operational efficiency.",
      "core_responsibilities": [
        "Handle day-to-day operational tasks including customer communications and invoicing",
        "Assist in streamlining operational processes for efficiency",
        "Review client contracts and assess terms and requirements",
        "Compute revenue models and track payments",
        "Collaborate with cross-functional teams to build automation",
        "Issue invoices via ERP and procurement systems",
        "Support data tracking and reporting for operational KPIs",
        "Identify and address process gaps and underperformance"
      ],
      "required_skills": [
        "sql",
        "data_visualization_design",
        "analytical_thinking",
        "stakeholder_management",
        "business_understanding"
      ],
      "preferred_skills": [
        "financial_modeling",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Excel / Google Sheets (advanced)",
        "ERP systems",
        "CRM (Salesforce / HubSpot)",
        "PowerPoint",
        "Procurement platforms",
        "Monday.com / Asana"
      ],
      "years_experience_typical": "1-3",
      "market_notes": {
        "israel": "Backgrounds: ex-consultants pivoting to in-house operations, former finance / strategy analysts, industrial engineering graduates. Stack patterns: heavy SQL + Excel modeling + Looker / Mode + Salesforce + Notion. Hiring stage: common at scale-ups with chief-of-staff-style functions — monday.com, JFrog, Wix, HiBob, Gong, AppsFlyer, Wiz, Lemonade. Reports typically to head of business operations, chief of staff, or CFO at smaller companies."
      },
      "alternate_titles": [
        "BizOps Analyst",
        "Senior Business Operations Analyst",
        "Strategy Analyst"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "business_analyst",
        "revops_analyst",
        "operations_analyst"
      ]
    },
    {
      "id": "business_ops_manager",
      "standardized_title": "Business Operations Manager",
      "role_family": "RevOps_BizOps",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Operates and scales the company's execution engine by driving cross-functional coordination, managing OKR frameworks, and ensuring company priorities translate into structured action and measurable outcomes. Owns the operational rhythm including business reviews, planning cycles, and performance tracking.",
      "core_responsibilities": [
        "Own the end-to-end OKR framework and planning cycles to align company goals with team execution",
        "Drive monthly and quarterly business reviews tracking key initiatives and outcomes",
        "Structure leadership forums and data-driven materials to support executive decision-making",
        "Oversee high-impact cross-functional initiatives by identifying dependencies and resolving bottlenecks",
        "Standardize processes and templates to improve execution speed and knowledge sharing",
        "Lead transition and implementation processes for new customers or operational changes",
        "Coordinate across departments to identify and implement process improvements",
        "Track operational KPIs and provide data-driven insights to leadership"
      ],
      "required_skills": [
        "people_management",
        "process_design",
        "stakeholder_management",
        "analytical_thinking",
        "business_understanding"
      ],
      "preferred_skills": [
        "financial_modeling",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Monday.com / Asana / Jira",
        "Excel / Google Sheets",
        "Salesforce / HubSpot",
        "PowerPoint / Google Slides",
        "Notion / Confluence",
        "Power BI / Tableau / Looker",
        "OKR platforms (Lattice, Ally.io)"
      ],
      "years_experience_typical": "3-6",
      "market_notes": {
        "israel": "Backgrounds: business analyst promotion, ex-consultants with operational focus, chief-of-staff alumni. Stack patterns: heavy Notion + Looker + Salesforce + Excel + cross-functional project management. Hiring stage: common at scale-ups and unicorns with mature business operations — monday.com, JFrog, Wix, HiBob, Gong, AppsFlyer, Wiz, Lemonade, Forter. Reports to head of operations, CFO, or COO depending on org structure."
      },
      "alternate_titles": [
        "BizOps Manager",
        "Senior Business Operations Manager",
        "Strategy & Operations Manager"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "revops_manager",
        "strategy_ops_manager",
        "chief_of_staff"
      ]
    },
    {
      "id": "strategy_ops_manager",
      "standardized_title": "Strategy & Operations Manager",
      "role_family": "RevOps_BizOps",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Combines strategic thinking with operational execution to identify, build, and scale business initiatives. Analyzes performance of existing revenue streams, develops growth strategies, and leads cross-functional projects that drive business impact. Often serves as a bridge between executive leadership and operational teams.",
      "core_responsibilities": [
        "Identify and evaluate growth opportunities, new product ideas, and strategic initiatives",
        "Build business cases, financial models, and operational roadmaps for leadership decisions",
        "Lead development and rollout of key initiatives from pilot to full implementation",
        "Analyze performance of existing revenue streams and identify optimization opportunities",
        "Drive cross-company strategic projects ensuring alignment and execution across markets",
        "Act as key interface between leadership and functional teams (Marketing, Finance, RevOps, Legal)",
        "Define KPIs, track performance, and provide data-driven insights to leadership",
        "Support M&A analysis including target identification, valuation modeling, and integration planning"
      ],
      "required_skills": [
        "analytical_thinking",
        "business_understanding",
        "stakeholder_management",
        "executive_presentation",
        "process_design"
      ],
      "preferred_skills": [
        "financial_modeling",
        "competitive_analysis_product"
      ],
      "tools": [
        "Excel / Google Sheets (advanced financial modeling)",
        "PowerPoint / Google Slides",
        "SQL",
        "Tableau / Looker / Power BI",
        "Salesforce",
        "Notion / Confluence",
        "Financial modeling tools"
      ],
      "years_experience_typical": "4-8",
      "market_notes": {
        "israel": "Backgrounds: ex-consultants from McKinsey / BCG / Bain Israel offices, MBA graduates with strategy focus, business ops promotion. Stack patterns: heavy Excel financial modeling + Notion / Confluence + Looker / Mode + executive-level deck creation. Hiring stage: most common at unicorns and mature scale-ups with executive-strategy-team functions — monday.com, JFrog, Wix, Wiz, Check Point, CyberArk, SentinelOne, Lemonade, AppsFlyer. Reports to COO, CFO, or CEO depending on the org structure."
      },
      "alternate_titles": [
        "Strategy Manager",
        "Senior Strategy Manager",
        "Strategy & Operations Manager"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "business_ops_manager",
        "chief_of_staff",
        "revops_manager"
      ]
    },
    {
      "id": "chief_of_staff",
      "standardized_title": "Chief of Staff",
      "role_family": "RevOps_BizOps",
      "secondary_family": "Leadership",
      "seniority": "Senior",
      "core_purpose": "Serves as a strategic execution partner and force multiplier for the CEO or C-suite executive. Drives clarity, alignment, and accountability across the leadership team. Translates strategy into action, anticipates issues, resolves misalignment, and ensures momentum on high-priority initiatives. A highly visible role with direct exposure to company-shaping decisions.",
      "core_responsibilities": [
        "Serve as the CEO's trusted advisor and right hand, amplifying focus and driving execution",
        "Drive alignment and communication of priorities, decisions, and expectations across teams",
        "Own and lead cross-functional company-level initiatives from problem definition through execution",
        "Run leadership team cadence with rigor: agendas, offsites, decision tracking, and accountability",
        "Translate discussions into clear structured tasks with owners, timelines, and outcomes",
        "Maintain real-time visibility into execution status and identify drift, gaps, and dependencies",
        "Own internal and external communications on behalf of the executive",
        "Support annual and quarterly planning processes to drive focus and alignment",
        "Step in as an operator to unblock progress and ensure follow-through"
      ],
      "required_skills": [
        "executive_presentation",
        "stakeholder_management",
        "analytical_thinking",
        "business_understanding",
        "people_management"
      ],
      "preferred_skills": [
        "organizational_design",
        "executive_relationships"
      ],
      "tools": [
        "PowerPoint / Google Slides",
        "Excel / Google Sheets (advanced)",
        "Notion / Confluence",
        "Monday.com / Asana",
        "Salesforce",
        "OKR platforms",
        "AI productivity tools"
      ],
      "years_experience_typical": "5-10",
      "market_notes": {
        "israel": "Backgrounds: ex-consultants from McKinsey / BCG / Bain Israel, former founders, senior business operations professionals. Stack patterns: executive-level communication and orchestration; lighter on specific tooling; heavy cross-functional facilitation. Hiring stage: most common at scale-ups (Series C+) and unicorns where the CEO or CTO needs dedicated operational and strategic leverage — Wiz, Check Point, monday.com, JFrog, Lemonade, AI21 Labs, Aidoc. Often a stepping stone to a more substantive operational role (VP Operations, VP People, BD leadership) or a path back to founding."
      },
      "alternate_titles": [
        "Senior Chief of Staff",
        "Chief of Staff to CEO",
        "Chief of Staff to CTO"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "strategy_ops_manager",
        "business_ops_manager",
        "vp_operations"
      ]
    },
    {
      "id": "vp_operations",
      "standardized_title": "VP / Head of Operations",
      "role_family": "RevOps_BizOps",
      "secondary_family": "Leadership",
      "seniority": "VP_Executive",
      "core_purpose": "Leads the company's global operations including service delivery, customer lifecycle management, and operational excellence. Builds scalable, tech-enabled processes that support growth across regions. Manages offshore and distributed teams, defines KPIs and performance frameworks, and partners with Product and Engineering to shape the platform roadmap.",
      "core_responsibilities": [
        "Own global operations across regions ensuring reliability, accuracy, and seamless execution",
        "Build scalable processes supporting growth across multiple product lines and geographies",
        "Drive automation and implement smart workflows to reduce manual effort and improve quality",
        "Partner with Product and Engineering to bring operational insights into the platform roadmap",
        "Oversee customer success lifecycle: onboarding, adoption, health monitoring, and retention",
        "Manage and grow offshore and distributed operational teams across time zones",
        "Define KPIs, performance frameworks, and quality controls for operational execution",
        "Collaborate with Finance to ensure efficient cost structures and scalable service delivery",
        "Recruit, develop, and inspire high-performing teams across operations and customer success",
        "Lead introduction of new tools, systems, and AI capabilities for operational efficiency"
      ],
      "required_skills": [
        "executive_leadership",
        "organizational_design",
        "people_management",
        "process_design",
        "stakeholder_management"
      ],
      "preferred_skills": [
        "financial_modeling",
        "executive_presentation",
        "board_management"
      ],
      "tools": [
        "CRM platforms (Salesforce, HubSpot)",
        "ERP systems",
        "BI tools (Tableau, Power BI, Looker)",
        "Project management tools (Monday.com, Asana, Jira)",
        "Data warehouses (BigQuery, Snowflake)",
        "Workforce management tools",
        "AI/automation platforms"
      ],
      "years_experience_typical": "8-15",
      "market_notes": {
        "israel": "Backgrounds: senior operations leader promotion, ex-COO at smaller companies, ex-consultants at the partner level pivoting to in-house leadership. Stack patterns: executive-level operational strategy; heavy cross-functional orchestration; people / process / systems alignment at scale. Hiring stage: typically at unicorns and mature companies with substantial operational complexity — Amdocs, NICE Systems, Cellebrite, Check Point, CyberArk, monday.com, Wix, JFrog, Lemonade. Often a peer to the CFO and CRO; reports to CEO."
      },
      "alternate_titles": [
        "VP of Operations",
        "Chief Operating Officer",
        "COO"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "chief_of_staff",
        "head_of_revops",
        "vp_finance_cfo"
      ]
    },
    {
      "id": "junior_software_engineer",
      "standardized_title": "Junior Software Engineer",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Entry-level software engineering role focused on learning production codebases, contributing to feature development, and building foundational engineering skills. Typically involves working under senior guidance across backend, frontend, or full-stack domains while gaining hands-on experience with real systems and development workflows.",
      "required_skills": [
        "programming_fundamentals",
        "python_development",
        "git_version_control",
        "debugging",
        "data_structures_algorithms",
        "linux_fundamentals",
        "sql"
      ],
      "preferred_skills": [
        "frontend_development",
        "code_review_practices",
        "testing_practices",
        "cloud_fundamentals",
        "containerization",
        "agile_methodology"
      ],
      "market_notes": {
        "israel": "Backgrounds: Unit 8200 / 81 / Mamram graduates, supplemented by CS programs (Technion / TAU / Reichman / IDC / Hebrew University) and increasingly bootcamp grads (ITC, Elevation). Army experience is a soft preference at most companies. Stack patterns: Python or Node.js / TypeScript dominant for backend; AWS-heavy cloud; PostgreSQL + Redis common; Docker baseline. Hiring stage: most common at scale-ups and unicorns that have bandwidth to train (monday.com, JFrog, Wix, Lemonade, AppsFlyer); smaller startups under ~30 engineers usually skip this level. Cyber (Wiz, Check Point, CyberArk, SentinelOne), SaaS, and FinTech form the largest employer segments. Team-fit and learning velocity weigh more than depth at this level."
      },
      "alternate_titles": [
        "Entry-Level Software Engineer",
        "Software Engineer I",
        "Associate Software Engineer",
        "Graduate Software Engineer"
      ],
      "core_responsibilities": [
        "Pick up and ship small-to-medium features under code-review guidance, learning the team's production codebase and conventions",
        "Write tests for new code and run through the standard PR / review / merge / deploy workflow",
        "Fix bugs across the stack, often paired or shadowed by a more senior engineer for context",
        "Participate in team rituals (standup, planning, retros) and ask questions actively — assumed to be in heavy learning mode",
        "Improve internal documentation, scripts, and developer tooling as a low-risk way to build context",
        "Pair on incident response and on-call shadowing without being primary; expected to gradually take ownership over the first year"
      ],
      "tools": [
        "Python",
        "Node.js",
        "TypeScript",
        "Git",
        "PostgreSQL",
        "AWS",
        "Docker",
        "Jira",
        "Slack"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "All"
      ],
      "typical_backgrounds": [
        "computer_science",
        "bootcamp_graduate",
        "self_taught",
        "unit_8200",
        "academic_internship"
      ],
      "years_experience_typical": "0-2",
      "next_roles": [
        "software_engineer"
      ],
      "similar_roles": [
        "qa_engineer",
        "junior_ai_ml_engineer",
        "solutions_engineer_junior"
      ],
      "not_to_confuse_with": [
        "Software Engineer",
        "Software Engineering Intern"
      ],
      "keywords": [
        "entry-level",
        "graduate",
        "learning",
        "shadowing",
        "code review",
        "pair programming"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "software_engineer",
      "standardized_title": "Software Engineer",
      "alternate_titles": [
        "Backend Engineer",
        "Full-Stack Engineer",
        "Software Developer",
        "Backend Developer"
      ],
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Mid-level individual contributor responsible for designing, building, and maintaining production software systems. Owns features end-to-end — from design through deployment — and works independently across backend, frontend, or full-stack domains. Operates within a team but with increasing autonomy on technical decisions and the expectation of mentoring more junior engineers.",
      "core_responsibilities": [
        "Design and ship end-to-end features across backend services, APIs, and (often) frontend, owning the full lifecycle from spec to production deployment",
        "Write production-quality code with tests, code review, and documentation as part of the definition of done",
        "Debug and resolve production issues across the stack, including on-call rotations or incident response in many Israeli startups",
        "Collaborate cross-functionally with product managers, designers, and engineering peers to scope features and make trade-offs on scope and architecture",
        "Mentor junior engineers via code review, pairing, and design feedback — informal mentoring is a standard expectation at this level",
        "Contribute to technical decisions on libraries, services, and patterns within their team's domain; raise architectural concerns up the chain when needed"
      ],
      "required_skills": [
        "backend_development",
        "system_design_basics",
        "python_development",
        "databases",
        "api_design",
        "testing_practices",
        "git_version_control",
        "cloud_fundamentals"
      ],
      "preferred_skills": [
        "frontend_development",
        "system_architecture",
        "performance_optimization",
        "cross_functional_collaboration",
        "code_review_practices",
        "mentoring",
        "ci_cd",
        "containerization",
        "monitoring_observability"
      ],
      "tools": [
        "Python",
        "Node.js",
        "TypeScript",
        "PostgreSQL",
        "Redis",
        "AWS",
        "Docker",
        "Git",
        "Jira",
        "Slack"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "All"
      ],
      "typical_backgrounds": [
        "computer_science",
        "bootcamp_graduate",
        "self_taught",
        "unit_8200",
        "junior_engineer_promotion"
      ],
      "years_experience_typical": "3-5",
      "next_roles": [
        "senior_software_engineer",
        "tech_lead",
        "staff_engineer"
      ],
      "similar_roles": [
        "devops_engineer",
        "sre_engineer",
        "ai_engineer_mid",
        "data_engineer",
        "analytics_engineer"
      ],
      "not_to_confuse_with": [
        "Junior Software Engineer",
        "Tech Lead",
        "Engineering Manager"
      ],
      "keywords": [
        "individual contributor",
        "production code",
        "feature ownership",
        "code review",
        "on-call",
        "microservices",
        "full-stack"
      ],
      "market_notes": {
        "israel": "Backgrounds: CS graduates and elite IDF tech-unit alumni (Unit 8200, 81, Mamram) dominate; some bootcamp alumni reach this level after 2-3 years. Stack patterns: Python and Node.js / TypeScript dominate backend in Tel Aviv; Go and Rust growing in infrastructure-heavy cyber and AI; microservices on AWS (GCP secondary) is the baseline architecture; full-stack capability common at smaller orgs, more specialized at scale-ups. Hiring stage: core hiring target across every stage and sector. Cyber (Wiz, Check Point, CyberArk, SentinelOne, Cato Networks), SaaS (Wix, monday.com, JFrog, Fiverr), AI (AI21 Labs, Aidoc, Run:ai), and consumer/FinTech (Lemonade, Payoneer, eToro) are the largest employer segments. 3-5 years experience typical; lower end at Seed/Series A, higher end at scale-ups."
      },
      "_research_method": "web_search"
    },
    {
      "id": "senior_software_engineer",
      "standardized_title": "Senior Software Engineer",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Experienced individual contributor who drives significant technical initiatives, mentors junior engineers, and takes ownership of complex systems and features. Expected to make sound architectural decisions, lead technical discussions, and deliver high-impact work with minimal oversight. Often serves as a technical anchor within a product team.",
      "required_skills": [
        "backend_development",
        "system_design",
        "distributed_systems",
        "python_development",
        "api_design",
        "performance_optimization",
        "mentoring",
        "technical_communication",
        "cloud_platforms",
        "databases"
      ],
      "preferred_skills": [
        "frontend_development",
        "performance_optimization",
        "incident_management",
        "code_review_practices",
        "cross_functional_collaboration",
        "mentoring",
        "ci_cd"
      ],
      "market_notes": {
        "israel": "Backgrounds: 5-8 years total experience typical, with 8200 / 81 alumni sometimes reaching this level by 4-5 years given accelerated growth in elite units. Promotion from mid-level SWE is common; external senior hires also frequent. Stack patterns: Python and Node.js / TypeScript dominant, with Go and Rust appearing more in cyber infrastructure (Wiz, Aqua Security, Orca) and AI (Hailo, AI21 Labs); production reliability work, on-call leadership, and post-mortem facilitation expected. Hiring stage: the most common senior IC level — represents the technical backbone of most engineering orgs. Heavy presence at cyber, SaaS (monday.com, Wix, JFrog, Fiverr, Gong, HiBob), FinTech (Lemonade, Payoneer, eToro, Forter), and AI scale-ups (Run:ai, AI21, Aidoc). Senior → staff vs management is a deliberate career fork; tech_lead often a stepping stone."
      },
      "alternate_titles": [
        "Senior Backend Engineer",
        "Senior Full-Stack Engineer",
        "SWE III",
        "Software Engineer III"
      ],
      "core_responsibilities": [
        "Own and ship complex, cross-system features end-to-end — design, implementation, rollout, and post-launch monitoring",
        "Drive technical design reviews for non-trivial changes; produce architecture documents and run engineering discussions",
        "Lead production incident response when on-call and contribute to post-mortems that result in concrete reliability work",
        "Mentor 1-3 mid and junior engineers via pairing, design feedback, and weekly 1:1s (without being a people manager)",
        "Influence team-level technical direction — propose investments in tooling, infrastructure, and refactors that pay back over 2-3 quarters",
        "Partner with PM and design on roadmap shaping — push back on scope, suggest alternatives, and surface technical risks early"
      ],
      "tools": [
        "Python",
        "Node.js",
        "TypeScript",
        "Go",
        "PostgreSQL",
        "Redis",
        "Kafka",
        "AWS",
        "Kubernetes",
        "Datadog"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "All"
      ],
      "typical_backgrounds": [
        "computer_science",
        "unit_8200",
        "promoted_from_mid_swe",
        "external_senior_hire"
      ],
      "years_experience_typical": "5-8",
      "next_roles": [
        "staff_engineer",
        "tech_lead",
        "engineering_manager"
      ],
      "similar_roles": [
        "devops_engineer",
        "sre_engineer",
        "senior_ai_engineer",
        "mlops_engineer"
      ],
      "not_to_confuse_with": [
        "Tech Lead",
        "Staff Engineer",
        "Engineering Manager"
      ],
      "keywords": [
        "senior IC",
        "system design",
        "mentoring",
        "on-call",
        "production reliability",
        "architecture review"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "staff_engineer",
      "standardized_title": "Staff Engineer",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Principal-level individual contributor who operates at the intersection of deep technical expertise and business strategy. Defines architectural vision for product domains, solves the hardest cross-cutting technical challenges, and acts as a force multiplier — elevating the skills, velocity, and quality of engineers across the organization. Maintains hands-on involvement while providing strategic technical leadership.",
      "required_skills": [
        "system_architecture",
        "distributed_systems",
        "technical_leadership",
        "performance_optimization",
        "cross_functional_collaboration",
        "mentoring",
        "strategic_thinking",
        "cloud_platforms",
        "backend_development",
        "ai_tool_fluency"
      ],
      "preferred_skills": [
        "distributed_systems",
        "code_review_practices",
        "executive_presentation",
        "stakeholder_management",
        "cross_functional_collaboration"
      ],
      "market_notes": {
        "israel": "Backgrounds: 10+ years experience typical; often external hire with multiple prior cycles, or internal promotion from senior IC with deep specialization. Some are former EMs returning to IC. Stack patterns: heavy depth in distributed systems, performance, and platform-level concerns; multi-team architecture work; influences technical strategy without people management. Hiring stage: exists primarily at Series C+ scale-ups and unicorns where engineering orgs are large enough (50+ engineers) to need senior IC leadership distinct from people management. Concentrated at Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, AppsFlyer, and other major Israeli-headquartered tech companies. Smaller startups often skip this level — top senior engineers become tech_lead or EM directly. Cyber companies in particular have strong staff IC ladders given cloud/runtime/SASE platform depth."
      },
      "alternate_titles": [
        "Principal Engineer",
        "Principal Software Engineer",
        "Staff Software Engineer"
      ],
      "core_responsibilities": [
        "Drive technical strategy across multiple teams or platform-level initiatives — projects measured in quarters, not sprints",
        "Make and document architectural decisions that have org-wide impact; serve as a technical reviewer for major design proposals",
        "Identify and unblock cross-team technical issues that span ownership boundaries — the senior IC who sees the whole system",
        "Lead deep technical mentorship of senior engineers; develop the next generation of staff-level talent",
        "Partner with engineering leadership on technical roadmap, hiring bar, and engineering culture without managing people directly",
        "Represent engineering externally — conference talks, technical recruiting, partner technical discussions, customer escalations"
      ],
      "tools": [
        "Python",
        "Go",
        "Rust",
        "Kubernetes",
        "Terraform",
        "AWS",
        "GCP",
        "PostgreSQL",
        "Kafka",
        "Datadog"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "10y_ic_track",
        "former_em_returned_to_ic",
        "deep_specialist"
      ],
      "years_experience_typical": "8-12",
      "next_roles": [
        "principal_engineer",
        "distinguished_engineer",
        "vp_engineering"
      ],
      "similar_roles": [
        "tech_lead",
        "engineering_manager"
      ],
      "not_to_confuse_with": [
        "Tech Lead",
        "Senior Engineering Manager",
        "VP Engineering"
      ],
      "keywords": [
        "principal",
        "platform",
        "architecture",
        "technical strategy",
        "cross-team impact",
        "senior IC track"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "tech_lead",
      "standardized_title": "Tech Lead",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "Hands-on technical leader who combines active coding with team guidance, architectural ownership, and project leadership. Drives technical direction for a product team while remaining deeply involved in the codebase. Sets engineering standards, leads design reviews, mentors engineers, and ensures the team delivers reliable, scalable systems. Often the bridge between engineering execution and product/business needs.",
      "required_skills": [
        "backend_development",
        "system_design",
        "technical_leadership",
        "python_development",
        "code_review_practices",
        "mentoring",
        "ci_cd",
        "testing_practices",
        "cloud_platforms",
        "ai_tool_fluency"
      ],
      "preferred_skills": [
        "code_review_practices",
        "stakeholder_management",
        "performance_optimization",
        "incident_management",
        "hiring_talent_acquisition"
      ],
      "market_notes": {
        "israel": "Backgrounds: promoted from senior_software_engineer in most cases; sometimes external hire. 8200 alumni over-represented at scale-ups. Stack patterns: hands-on coding (typically 30-50% IC time) alongside team leadership and architectural ownership. Hiring stage: one of the most common 'lead' positions in Israeli engineering, especially at companies preferring flat structures or wanting senior ICs to manage scope without people-management overhead. Common at cyber (Wiz, Cato Networks, Aqua Security), SaaS (monday.com, JFrog, Gong, Cloudinary), FinTech (Forter, Payoneer, eToro), and AI (Run:ai, Hailo). At smaller startups (Seed-Series B), one person often fills both tech_lead and engineering_manager responsibilities for a team of 3-6 engineers."
      },
      "alternate_titles": [
        "Engineering Tech Lead",
        "TL",
        "Technical Lead",
        "Lead Engineer"
      ],
      "core_responsibilities": [
        "Lead a team of 4-8 engineers on technical execution — own architecture, code review bar, and engineering quality for the team's surface",
        "Continue to write code (typically 30-50% IC time) — staying hands-on is a definitional part of the role",
        "Plan team-level technical work alongside the engineering manager (or fill both roles when there is no separate EM)",
        "Run technical design reviews; mentor and unblock the team on complex problems; pair with senior engineers on the hardest work",
        "Interface with product, design, and other teams on technical scoping, dependencies, and trade-offs",
        "Own production reliability for the team's services — on-call leadership, post-mortem facilitation, reliability investments"
      ],
      "tools": [
        "Python",
        "TypeScript",
        "Go",
        "PostgreSQL",
        "Redis",
        "AWS",
        "Kubernetes",
        "Datadog",
        "Jira"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale"
      ],
      "typical_backgrounds": [
        "senior_swe_promotion",
        "8200_alumni",
        "external_senior_hire"
      ],
      "years_experience_typical": "6-9",
      "next_roles": [
        "engineering_manager",
        "staff_engineer"
      ],
      "similar_roles": [
        "senior_software_engineer",
        "engineering_manager",
        "staff_engineer"
      ],
      "not_to_confuse_with": [
        "Engineering Manager",
        "Staff Engineer"
      ],
      "keywords": [
        "hands-on lead",
        "technical execution",
        "team architecture",
        "player-coach"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "engineering_manager",
      "standardized_title": "Engineering Manager",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "People leader who manages a team of engineers (typically 4-10), combining technical credibility with team development, delivery ownership, and cross-functional collaboration. Responsible for hiring, mentoring, performance management, and ensuring the team delivers high-quality work on time. Stays close to the technology — reviewing code, participating in architecture discussions, and jumping in hands-on when needed.",
      "required_skills": [
        "people_management",
        "technical_leadership",
        "backend_development",
        "system_design",
        "hiring_talent_acquisition",
        "performance_management",
        "agile_methodology",
        "cross_functional_collaboration",
        "cloud_platforms",
        "ci_cd"
      ],
      "preferred_skills": [
        "stakeholder_management",
        "okr_framework",
        "engineering_leadership",
        "code_review_practices",
        "incident_management"
      ],
      "market_notes": {
        "israel": "Backgrounds: most often promoted from tech_lead or senior SWE; external EM hires also common at scale-ups. Stack patterns: hands-on hybrid is the Israeli norm — many EMs do code review, attend technical design reviews, and stay close to the work. Pure 'people manager who doesn't touch code' more common at unicorns (Wiz, JFrog, monday.com). Hiring stage: ubiquitous from Series A upward. Scope varies: 2-4 engineers at Seed-Series A; 8-12 standard at scale-ups (Series C+). Hiring is the single hardest part of the role given local competition (Wiz, Check Point, CyberArk, SentinelOne) and US-remote pressure. Strong EMs frequently rotate between cyber and AI companies (Run:ai, AI21, Aidoc) where engineering leadership is in highest demand."
      },
      "alternate_titles": [
        "EM",
        "Software Engineering Manager",
        "Manager of Engineering"
      ],
      "core_responsibilities": [
        "Manage a team of 4-10 engineers — run 1:1s, performance reviews, growth plans, hiring loops, and team development",
        "Own team-level delivery — partner with product and design on roadmap, set quarterly OKRs, run sprint cadence",
        "Hire — write JDs, screen, run interview loops, partner with recruiting; often a critical bottleneck in Israeli tech given competitive market",
        "Coach individual engineers on career growth — give honest feedback, broker stretch opportunities, navigate compensation conversations",
        "Stay technically credible — read code, attend design reviews, contribute to architecture discussions even if not writing production code daily",
        "Represent the team upward — surface risks, lobby for resources, give and receive feedback to / from senior engineering leadership"
      ],
      "tools": [
        "Jira",
        "Lattice",
        "Slack",
        "Notion",
        "Figma",
        "Datadog",
        "AWS"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "tech_lead_promotion",
        "senior_swe_pivot",
        "external_em_hire"
      ],
      "years_experience_typical": "7-12",
      "next_roles": [
        "senior_engineering_manager",
        "engineering_group_manager"
      ],
      "similar_roles": [
        "tech_lead",
        "staff_engineer"
      ],
      "not_to_confuse_with": [
        "Tech Lead",
        "VP Engineering"
      ],
      "keywords": [
        "people management",
        "team delivery",
        "hiring",
        "1:1s",
        "OKRs"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "senior_engineering_manager",
      "standardized_title": "Senior Engineering Manager / Director of Engineering",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Senior engineering leader who manages multiple teams or engineering managers, owns end-to-end engineering execution for a product domain, and drives architectural and organizational decisions at scale. Combines people leadership with technical ownership and strategic influence. Responsible for delivery quality, team scaling, process improvement, and cross-company technical initiatives.",
      "required_skills": [
        "engineering_leadership",
        "people_management",
        "system_architecture",
        "strategic_thinking",
        "hiring_talent_acquisition",
        "cross_functional_collaboration",
        "stakeholder_management",
        "distributed_systems",
        "cloud_platforms",
        "process_improvement"
      ],
      "preferred_skills": [
        "organizational_design",
        "stakeholder_management",
        "executive_presentation",
        "engineering_leadership"
      ],
      "market_notes": {
        "israel": "Backgrounds: usually promoted EM with strong track record; external director hires common at unicorns. Stack patterns: less hands-on coding; more focused on org design, headcount allocation, technical-strategy alignment with product. Hiring stage: typically only exists at 100+ engineer companies — scale-ups and unicorns (Wiz, Check Point, CyberArk, SentinelOne, monday.com, Wix, JFrog, AppsFlyer, Fiverr, Lemonade, AI21 Labs). Below that size, the EM → VPE jump skips this level. Strong senior EMs frequently move between cyber and SaaS sectors given transferable skill set; AI scale-ups (Run:ai, Hailo, Aidoc) are heavy recruiters as they scale engineering orgs from ~30 to ~100+."
      },
      "alternate_titles": [
        "Senior EM",
        "Director of Engineering",
        "Senior Manager, Engineering"
      ],
      "core_responsibilities": [
        "Manage 2-4 engineering managers (or tech leads), owning ~20-40 engineers indirectly across multiple teams",
        "Set engineering strategy for the group — quarterly planning, headcount allocation, technical roadmap alignment with product strategy",
        "Develop and grow the EMs reporting to you — coach on people management, hiring, performance, conflict resolution",
        "Own cross-team initiatives that span ownership boundaries — platform investments, architectural migrations, cross-team reliability work",
        "Represent the group to executive leadership (VPE, CTO, sometimes CEO) — surface risks, align on priorities, advocate for resources",
        "Partner with senior product, design, and GTM leaders to shape multi-quarter roadmaps and ensure engineering capacity matches product ambition"
      ],
      "tools": [
        "Jira",
        "Notion",
        "Lattice",
        "Slack",
        "Looker",
        "Datadog"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "em_promotion",
        "external_director_hire"
      ],
      "years_experience_typical": "10-15",
      "next_roles": [
        "engineering_group_manager",
        "vp_engineering"
      ],
      "similar_roles": [
        "engineering_manager",
        "engineering_group_manager",
        "head_of_data",
        "head_of_ai"
      ],
      "not_to_confuse_with": [
        "VP Engineering",
        "Engineering Manager"
      ],
      "keywords": [
        "manager of managers",
        "engineering strategy",
        "headcount planning",
        "org design"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "vp_engineering",
      "standardized_title": "VP Engineering / Head of Engineering",
      "role_family": "Engineering",
      "secondary_family": "Leadership",
      "seniority": "VP_Executive",
      "core_purpose": "Executive engineering leader responsible for the entire engineering organization, technology strategy, and technical vision. Leads large engineering teams (20-100+), defines the engineering roadmap aligned with company strategy, and drives major initiatives including platform modernization, AI adoption, and organizational scaling. Reports to CEO/CPO and serves as part of the executive leadership team. Combines strategic leadership with deep technical credibility.",
      "required_skills": [
        "executive_leadership",
        "engineering_leadership",
        "system_architecture",
        "strategic_thinking",
        "organizational_design",
        "talent_strategy",
        "stakeholder_management",
        "distributed_systems",
        "cloud_platforms",
        "ai_strategy"
      ],
      "preferred_skills": [
        "organizational_design",
        "executive_presentation",
        "strategic_thinking",
        "engineering_leadership"
      ],
      "market_notes": {
        "israel": "Backgrounds: senior EM promotion, external VPE hire, or former CTO re-pivoting; often 2-3 prior cycles at scale-ups or unicorns. Stack patterns: org-level strategy, technology vision, budget ownership, board-level engineering representation. Hiring stage: critical hire for any company past ~50 engineers — often the first executive engineering leader recruited externally even when there's a strong technical founder. CTO + VPE split is common at scale-ups (CTO sets technical vision, VPE owns the org). At smaller companies the founding CTO usually holds both roles until scale forces the split. Strong VPEs frequently rotate between cyber and SaaS verticals; AI is the hottest sector for VPE hires (Run:ai, AI21, Aidoc, Hailo)."
      },
      "alternate_titles": [
        "VPE",
        "VP of Engineering",
        "Vice President, Engineering",
        "Head of Engineering"
      ],
      "core_responsibilities": [
        "Own engineering org strategy, structure, and execution across the entire engineering function (50-500+ engineers depending on company size)",
        "Set technology strategy and major architectural direction in partnership with CTO (where the roles are split) or as the technical executive",
        "Build and develop the engineering leadership bench — hire, grow, and develop Senior EMs, Engineering Group Managers, and Staff/Principal engineers",
        "Own engineering budget, headcount planning, vendor relationships, and major build-vs-buy decisions",
        "Represent engineering at the executive table — board updates, investor conversations, cross-functional executive alignment",
        "Set engineering culture — quality bar, on-call practices, hiring standards, performance norms, and how engineering interfaces with product and GTM"
      ],
      "tools": [
        "Jira",
        "Notion",
        "Lattice",
        "Looker",
        "Slack"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "senior_em_promotion",
        "external_vpe_hire",
        "former_cto_repivot"
      ],
      "years_experience_typical": "15+",
      "next_roles": [
        "cto",
        "ceo"
      ],
      "similar_roles": [
        "cto",
        "senior_engineering_manager",
        "head_of_ai"
      ],
      "not_to_confuse_with": [
        "CTO",
        "Senior Engineering Manager"
      ],
      "keywords": [
        "executive",
        "engineering org",
        "technology strategy",
        "board-level",
        "people leadership at scale"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "qa_engineer",
      "standardized_title": "QA Engineer",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Quality assurance professional responsible for ensuring software quality through manual testing, test planning, automation development, and cross-functional collaboration. Designs and executes test strategies, identifies and documents defects, and works closely with developers, product managers, and designers throughout the development lifecycle. Increasingly expected to build and maintain automated test suites and leverage AI tools to improve QA workflows.",
      "required_skills": [
        "manual_testing",
        "test_automation",
        "test_planning",
        "bug_tracking",
        "api_testing",
        "qa_methodology",
        "attention_to_detail",
        "analytical_thinking",
        "communication",
        "ai_tool_fluency"
      ],
      "preferred_skills": [
        "api_testing",
        "scripting_automation",
        "performance_optimization",
        "cross_functional_collaboration",
        "agile_methodology"
      ],
      "market_notes": {
        "israel": "Backgrounds: increasingly automation-first; bootcamp graduates and IDF veterans from non-elite tech units form a significant entry pipeline; many transition from manual QA within 1-2 years. Stack patterns: Cypress and Playwright dominate frontend automation; pytest + custom Python frameworks for backend/API testing; Selenium increasingly legacy. Hiring stage: pure manual QA roles are rare outside legacy enterprise and large defense contractors. Strong employer base at cyber (Check Point, CyberArk, SentinelOne, Cellebrite), SaaS (monday.com, Wix, JFrog), and consumer apps (Lemonade, Lightricks, Plarium). Career typically progresses to senior_qa, sdet, or qa_manager."
      },
      "alternate_titles": [
        "QA Automation Engineer",
        "Test Engineer",
        "Software Tester",
        "SDET"
      ],
      "core_responsibilities": [
        "Design and execute test plans for new features — manual exploratory + automated regression coverage",
        "Build and maintain automated test suites at multiple levels — unit, integration, end-to-end (Cypress / Playwright / Selenium)",
        "Triage and reproduce bugs reported by users or surfaced by monitoring; partner with developers to root-cause",
        "Maintain test environments, fixtures, and CI test infrastructure; reduce flaky-test rate and improve test feedback loops",
        "Partner with product on acceptance criteria and edge cases before development starts — shift-left testing influence",
        "Contribute to release readiness — sign-off on go / no-go, run smoke testing on staging, monitor production rollouts"
      ],
      "tools": [
        "Cypress",
        "Playwright",
        "Selenium",
        "Postman",
        "Jira",
        "Python",
        "JavaScript",
        "AWS",
        "Docker"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "qa_promotion",
        "manual_qa_to_automation",
        "bootcamp_grad",
        "swe_pivot"
      ],
      "years_experience_typical": "2-5",
      "next_roles": [
        "senior_qa_engineer",
        "sdet",
        "qa_manager"
      ],
      "similar_roles": [
        "junior_software_engineer",
        "devops_engineer"
      ],
      "not_to_confuse_with": [
        "Manual Tester",
        "SDET",
        "DevOps Engineer"
      ],
      "keywords": [
        "automation",
        "test coverage",
        "regression",
        "Cypress",
        "Playwright",
        "shift-left"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "devops_engineer",
      "standardized_title": "DevOps Engineer",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Infrastructure and automation specialist responsible for designing, building, and maintaining cloud infrastructure, CI/CD pipelines, and deployment systems. Owns infrastructure-as-code, container orchestration, monitoring, and operational tooling. Works closely with software engineers to enable fast, reliable, and secure software delivery. Increasingly expected to integrate AI tools into infrastructure workflows.",
      "required_skills": [
        "cloud_platforms_devops",
        "infrastructure_as_code",
        "ci_cd",
        "containerization",
        "linux_administration",
        "scripting_automation",
        "monitoring_observability",
        "networking_fundamentals",
        "security_best_practices",
        "ai_tool_fluency"
      ],
      "preferred_skills": [
        "security_engineering",
        "networking_fundamentals",
        "performance_optimization",
        "cost_optimization_finops",
        "incident_management"
      ],
      "market_notes": {
        "israel": "Backgrounds: software engineers pivoting to infrastructure, system admins promoting up, or Unit 8200 / Mamram infrastructure alumni. Stack patterns: AWS dominant (>70% of cloud workloads), GCP growing in AI and data-heavy companies; Kubernetes and Terraform baseline; GitHub Actions / GitLab CI / Jenkins / ArgoCD for pipelines; Datadog / Grafana / Prometheus for observability. Hiring stage: one of the highest-demand roles given the cyber-heavy ecosystem and operational complexity of cloud-native security platforms. Heavy at cyber (Wiz, Check Point, CyberArk, SentinelOne, Aqua Security, Orca Security, Cato Networks), SaaS (monday.com, JFrog, Cloudinary, AppsFlyer), and AI infrastructure (Run:ai, Hailo). Career often progresses to SRE or Platform Engineering Lead within 3-5 years."
      },
      "alternate_titles": [
        "Platform Engineer",
        "Infrastructure Engineer",
        "Cloud Engineer",
        "DevOps / Cloud Engineer"
      ],
      "core_responsibilities": [
        "Build and maintain cloud infrastructure (AWS / GCP) using infrastructure-as-code (Terraform / Pulumi)",
        "Own CI/CD pipelines — GitHub Actions, GitLab CI, Jenkins, ArgoCD — and developer-experience tooling",
        "Manage Kubernetes clusters (EKS / GKE / self-managed) — networking, RBAC, autoscaling, observability",
        "Implement monitoring, alerting, and observability — Datadog / Grafana / Prometheus / Sentry",
        "Partner with security on compliance, secrets management, network policies, and infrastructure-level controls",
        "Respond to infrastructure incidents on-call; drive post-mortems and reliability improvements"
      ],
      "tools": [
        "AWS",
        "GCP",
        "Terraform",
        "Kubernetes",
        "Docker",
        "GitHub Actions",
        "ArgoCD",
        "Datadog",
        "Grafana",
        "Prometheus",
        "Helm"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "swe_pivot",
        "system_admin_promotion",
        "8200_infrastructure_unit"
      ],
      "years_experience_typical": "3-6",
      "next_roles": [
        "sre_engineer",
        "platform_engineer_senior",
        "devops_team_lead"
      ],
      "similar_roles": [
        "sre_engineer",
        "software_engineer",
        "security_analyst_soc"
      ],
      "not_to_confuse_with": [
        "SRE Engineer",
        "IT Administrator",
        "Software Engineer"
      ],
      "keywords": [
        "IaC",
        "Kubernetes",
        "Terraform",
        "CI/CD",
        "AWS",
        "cloud infrastructure"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "sre_engineer",
      "standardized_title": "SRE Engineer",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Site Reliability Engineer focused on ensuring the reliability, scalability, and performance of production systems. Owns observability, incident response, SLOs/SLIs, and automation of operational toil. Combines strong software engineering skills with deep systems knowledge to build tools and processes that keep production environments healthy. Works closely with engineering teams to improve deployment safety, system resilience, and mean time to recovery.",
      "required_skills": [
        "production_systems",
        "monitoring_observability",
        "incident_management",
        "scripting_automation",
        "distributed_systems",
        "linux_administration",
        "cloud_platforms_devops",
        "containerization",
        "networking_fundamentals",
        "ai_tool_fluency"
      ],
      "preferred_skills": [
        "chaos_engineering",
        "performance_optimization",
        "cost_optimization_finops",
        "security_engineering"
      ],
      "market_notes": {
        "israel": "Backgrounds: often promoted from DevOps or pivoted from SWE with systems focus; heavy overlap with Unit 8200 / 81 / Mamram infrastructure alumni. Stack patterns: Kubernetes, Datadog / Grafana / Prometheus for observability, AWS-dominant cloud, PagerDuty for on-call, Python or Go for tooling and automation. The Google SRE model is influential but adapted — Israeli SRE roles often retain more direct service ownership than pure 'platform' SRE. Hiring stage: SRE as a distinct discipline (separate from DevOps) is mostly found at scale-ups and unicorns with substantial production complexity — cyber (Wiz, Check Point, CyberArk, SentinelOne), large SaaS (monday.com, JFrog, AppsFlyer), and high-availability FinTech (Lemonade, Forter, eToro, Payoneer). Smaller startups typically merge DevOps and SRE into one team."
      },
      "alternate_titles": [
        "Site Reliability Engineer",
        "Senior SRE",
        "Production Engineer"
      ],
      "core_responsibilities": [
        "Own reliability and SLOs for production systems — define error budgets, run reliability reviews, drive reliability investments",
        "Lead incident response for critical production issues — incident commander role, communications, post-mortems",
        "Build and maintain observability infrastructure — metrics, logs, traces, alerting that engineers actually use",
        "Drive capacity planning and performance work — load testing, profiling, performance optimization initiatives",
        "Partner with engineering teams on production-readiness reviews for new services — ensure rollback, monitoring, runbooks before launch",
        "Reduce on-call toil — automate recurring operational work, build tooling, improve developer self-service"
      ],
      "tools": [
        "Kubernetes",
        "Datadog",
        "Grafana",
        "Prometheus",
        "AWS",
        "Terraform",
        "Python",
        "Go",
        "Linux",
        "PagerDuty"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "devops_promotion",
        "swe_with_systems_focus",
        "8200_infrastructure"
      ],
      "years_experience_typical": "5-8",
      "next_roles": [
        "senior_sre",
        "sre_team_lead",
        "platform_engineering_lead"
      ],
      "similar_roles": [
        "devops_engineer",
        "senior_software_engineer",
        "security_analyst_soc"
      ],
      "not_to_confuse_with": [
        "DevOps Engineer",
        "IT Administrator"
      ],
      "keywords": [
        "reliability",
        "SLO",
        "on-call",
        "incident response",
        "observability",
        "chaos engineering"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "engineering_group_manager",
      "standardized_title": "Engineering Group Manager",
      "role_family": "Engineering",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Senior engineering leader who manages a group of multiple engineering teams (typically 15-25+ engineers) through team leads and engineering managers. Drives product engineering execution at scale, shapes technical vision, and builds high-performing engineering organizations. Operates at the intersection of technical leadership, people management, and product strategy. Closely partners with product leadership to execute on the engineering roadmap.",
      "required_skills": [
        "engineering_leadership",
        "people_management",
        "organizational_design",
        "system_architecture",
        "cross_functional_collaboration",
        "stakeholder_management",
        "hiring_talent_acquisition",
        "strategic_thinking",
        "distributed_systems",
        "cloud_platforms"
      ],
      "preferred_skills": [
        "organizational_design",
        "executive_presentation",
        "engineering_leadership",
        "hiring_talent_acquisition"
      ],
      "market_notes": {
        "israel": "Backgrounds: senior EM promotion or external director hire; often 12-18 years total experience. Stack patterns: people management at scale (3-5 EMs / 30-60 engineers indirectly), cross-team initiatives, multi-quarter roadmap planning. Hiring stage: scale-ups and unicorns with ~80+ engineers — cyber (Wiz, Check Point, CyberArk, SentinelOne), SaaS (monday.com, JFrog, Wix, AppsFlyer), FinTech (Lemonade, Payoneer, eToro). At companies with simpler org structures, this layer is skipped — senior EM reports directly to VPE. Grown in prominence post-2023 as Israeli scale-ups flattened structures while still needing multi-team leaders below VP level."
      },
      "alternate_titles": [
        "Group EM",
        "Director of Engineering",
        "Group Engineering Manager",
        "Engineering Director"
      ],
      "core_responsibilities": [
        "Manage 3-5 Engineering Managers (and sometimes tech_leads) across multiple teams — typically 30-60 engineers indirectly",
        "Set engineering strategy for the group, align with product strategy, own multi-team initiatives that span ownership",
        "Develop the bench of Engineering Managers reporting to you — coach on people management, performance, hiring, conflict resolution",
        "Own the engineering culture, hiring bar, and performance standards across the group",
        "Partner with senior product, design, and GTM leadership to shape multi-quarter roadmaps and capacity planning",
        "Represent the group to VP/CTO/CEO — surface risks, advocate for resources, drive cross-functional alignment"
      ],
      "tools": [
        "Jira",
        "Notion",
        "Lattice",
        "Slack",
        "Looker"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "senior_em_promotion",
        "external_director_hire"
      ],
      "years_experience_typical": "12-18",
      "next_roles": [
        "vp_engineering"
      ],
      "similar_roles": [
        "senior_engineering_manager",
        "head_of_data",
        "head_of_ai",
        "head_of_solutions_engineering"
      ],
      "not_to_confuse_with": [
        "VP Engineering",
        "Senior Engineering Manager"
      ],
      "keywords": [
        "manager of managers",
        "group leadership",
        "engineering org",
        "headcount planning"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "junior_ai_ml_engineer",
      "standardized_title": "Junior AI/ML Engineer",
      "role_family": "AI_ML",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Entry-level engineer working on AI/ML features under close guidance. Contributes to building LLM-powered applications, data pipelines, model integration, and basic ML workflows. Focus is on learning production AI engineering practices while delivering small, well-scoped components within a larger AI system.",
      "core_responsibilities": [
        "Build LLM-powered features under senior guidance — chain prompts, integrate APIs, evaluate outputs, ship to production",
        "Work with embeddings and RAG systems — chunking strategies, vector store integration, retrieval-quality evaluation",
        "Run experiments with different models, prompts, and parameters; document results and iterate based on offline + online metrics",
        "Build data pipelines for training data preparation, evaluation set curation, and prompt-versioning workflows",
        "Pair with senior AI engineers and ML researchers on harder problems; learn the team's tools and ML production practices",
        "Contribute to monitoring and evaluation infrastructure — track model drift, response quality, latency, and cost"
      ],
      "required_skills": [
        "python_development",
        "llm_api_integration",
        "prompt_engineering",
        "machine_learning_fundamentals",
        "llm_fundamentals",
        "git_version_control"
      ],
      "preferred_skills": [
        "rag_systems",
        "vector_databases",
        "model_deployment_serving",
        "data_engineering_pipelines",
        "containerization"
      ],
      "tools": [
        "Python",
        "OpenAI API",
        "Anthropic Claude API",
        "LangChain",
        "Git",
        "Docker",
        "AWS/GCP/Azure basics",
        "Jupyter Notebooks",
        "REST APIs",
        "vector databases (Pinecone, Weaviate, Chroma)"
      ],
      "market_notes": {
        "israel": "Backgrounds: intensive bootcamp / training programs (Infinity Labs R&D, Microsoft Reactor, ITC), Unit 8200 / 81 alumni transitioning to civilian AI, exceptional CS graduates with strong project portfolios. Stack patterns: Python universal; OpenAI / Anthropic / Google API integration baseline; LangChain / LlamaIndex / Haystack at varying levels; vector databases (Pinecone, Weaviate, Qdrant) and embeddings work increasingly expected even at the junior level. Hiring stage: direct Junior AI/ML roles at product companies are relatively rare — most companies hire AI engineers at mid level. Strong concentration at AI-native scale-ups (AI21 Labs, Aidoc, Run:ai, Hailo, Lightricks, Hour One, D-ID), AI-heavy cyber (Wiz, Cyera, Snyk, BigID), and Israeli offices of major AI labs (NVIDIA AI, Intel AI, Microsoft Reactor)."
      },
      "alternate_titles": [
        "Junior AI Engineer",
        "Junior ML Engineer",
        "AI/ML Engineer I",
        "Entry-Level AI Engineer"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Growth",
        "Scale"
      ],
      "typical_backgrounds": [
        "computer_science",
        "bootcamp_grad",
        "data_science_pivot",
        "8200_alumni"
      ],
      "years_experience_typical": "0-2",
      "next_roles": [
        "ai_engineer_mid"
      ],
      "similar_roles": [
        "junior_software_engineer",
        "data_scientist"
      ],
      "not_to_confuse_with": [
        "AI Engineer Mid",
        "Junior Data Scientist"
      ],
      "keywords": [
        "LLM",
        "RAG",
        "prompt engineering",
        "embeddings",
        "entry AI"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "ai_engineer_mid",
      "standardized_title": "AI Engineer / GenAI Engineer",
      "role_family": "AI_ML",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Mid-level engineer who designs and builds production AI systems using LLMs, RAG pipelines, and agentic workflows. Owns features end-to-end — from problem definition through deployment and monitoring. Works closely with product and other engineers to translate business problems into AI-powered solutions that scale.",
      "core_responsibilities": [
        "Design and ship LLM-powered features end-to-end — from prompt design through evaluation, deployment, and monitoring",
        "Build production RAG systems — embedding pipelines, chunking strategies, vector retrieval, re-ranking, response generation",
        "Run rigorous offline + online evaluations — define quality metrics, build eval datasets, track regressions across model versions",
        "Optimize model serving for latency, cost, and throughput — caching strategies, batching, model selection trade-offs",
        "Partner with PM and ML researchers on harder problems — when to fine-tune vs prompt, when to use smaller open models, when to retrain",
        "Mentor junior AI engineers on prompt design, evaluation discipline, and the engineering rigor required for production AI"
      ],
      "required_skills": [
        "python_development",
        "llm_api_integration",
        "prompt_engineering",
        "rag_systems",
        "model_deployment_serving",
        "llm_evaluation",
        "vector_databases",
        "machine_learning"
      ],
      "preferred_skills": [
        "fine_tuning_models",
        "model_training_finetuning",
        "model_monitoring_drift",
        "data_engineering_pipelines",
        "ai_tool_fluency"
      ],
      "tools": [
        "Python",
        "OpenAI/Anthropic/Bedrock APIs",
        "LangChain",
        "LangGraph",
        "LlamaIndex",
        "Pinecone",
        "Weaviate",
        "FAISS",
        "Postgres/pgvector",
        "Docker",
        "Kubernetes",
        "AWS/GCP/Azure",
        "Databricks",
        "MLflow",
        "FastAPI",
        "Git"
      ],
      "market_notes": {
        "israel": "Backgrounds: ML engineer pivots, SWEs pivoting into AI, data scientists with strong engineering skills; pure data scientists without strong SWE skills usually pivot through MLOps or applied ML roles first. 3-6 years typical. Stack patterns: Python + LLM APIs (OpenAI / Anthropic / Bedrock); LangChain / LlamaIndex; vector databases (Pinecone, Weaviate, Qdrant); evaluation tooling (LangSmith, Phoenix); MLflow / Weights & Biases for experiment tracking. Hiring stage: most in-demand AI role in Israeli tech as of 2025-2026 — virtually every B2B and consumer scale-up is building GenAI features. Heavy at AI-native scale-ups (AI21 Labs, Aidoc, Run:ai, Hailo, Lightricks, Hour One, D-ID, Verbit, Decart), cyber adding AI (Wiz, Cyera, BigID, Snyk, CyberArk), SaaS (monday.com, Wix, JFrog, Gong, HiBob), and AI agent startups (Wonderful, Band, Sett)."
      },
      "alternate_titles": [
        "AI Engineer",
        "ML Engineer",
        "Applied AI Engineer",
        "GenAI Engineer"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "ml_engineer_pivot",
        "swe_pivot_to_ai",
        "data_scientist_pivot",
        "8200_alumni"
      ],
      "years_experience_typical": "3-6",
      "next_roles": [
        "senior_ai_engineer",
        "mlops_engineer"
      ],
      "similar_roles": [
        "software_engineer",
        "data_scientist",
        "data_engineer"
      ],
      "not_to_confuse_with": [
        "Senior AI Engineer",
        "ML Engineer",
        "Data Scientist"
      ],
      "keywords": [
        "GenAI engineer",
        "LLM production",
        "RAG",
        "evaluation",
        "applied AI"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "senior_ai_engineer",
      "standardized_title": "Senior AI Engineer",
      "role_family": "AI_ML",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Senior engineer responsible for architecting and delivering complex, production-scale AI systems. Makes core design decisions on model selection, system architecture, and engineering standards. Leads technical implementation of flagship AI features, mentors mid-level engineers, and operates across the full AI lifecycle from research to production.",
      "core_responsibilities": [
        "Own end-to-end AI systems with significant production impact — design, evaluation, deployment, monitoring, and continuous improvement",
        "Make architecture decisions on model selection, serving infrastructure, and evaluation methodology that ripple across the AI team",
        "Lead the most complex AI projects — multi-step agent workflows, custom fine-tuning, novel retrieval architectures, advanced evaluation systems",
        "Mentor mid-level AI engineers; set the engineering quality bar for AI work; review AI PRs for both ML correctness and engineering rigor",
        "Partner with ML researchers and applied scientists on harder problems requiring custom model development or training",
        "Represent the AI team in cross-functional technical discussions — explain AI capabilities and limits to PM, sales, and exec teams"
      ],
      "required_skills": [
        "python_development",
        "llm_api_integration",
        "prompt_engineering",
        "rag_systems",
        "model_deployment_serving",
        "llm_evaluation",
        "model_training_finetuning",
        "ml_systems_thinking",
        "machine_learning"
      ],
      "preferred_skills": [
        "deep_learning",
        "model_monitoring_drift",
        "mlops_pipelines",
        "cross_functional_collaboration",
        "mentoring"
      ],
      "tools": [
        "Python",
        "PyTorch",
        "TensorFlow",
        "LangChain/LangGraph",
        "OpenAI/Anthropic/Bedrock APIs",
        "vector databases (Pinecone, Weaviate, Qdrant)",
        "Kubernetes",
        "Docker",
        "AWS/GCP/Azure",
        "Databricks",
        "MLflow/W&B",
        "Ray",
        "FastAPI",
        "Node.js (for some roles)",
        "CI/CD pipelines",
        "Prometheus/Grafana"
      ],
      "market_notes": {
        "israel": "Backgrounds: AI engineer promotion, ML research pivots (PhD or strong academic publications), Unit 8200 / 81 / 9900 alumni over-represented given Israel's military AI / cyber heritage. Stack patterns: deep Python, PyTorch / TensorFlow, fine-tuning workflows, evaluation systems, LangGraph for agent flows, Ray / Modal for distributed compute; cross-functional fluency to explain AI capabilities to PM and exec teams. Hiring stage: technical backbone of Israeli AI orgs. Heavy at AI-native scale-ups and unicorns (AI21 Labs, Aidoc, Run:ai, Hailo, Lightricks, Hour One, D-ID, Decart, Verbit), AI-heavy cyber (Wiz, Cyera, BigID, Snyk, Astrix Security), and large product orgs at SaaS unicorns (monday.com, JFrog, Wix, Gong) where AI features drive substantial product investment."
      },
      "alternate_titles": [
        "Staff AI Engineer",
        "Principal AI Engineer",
        "Senior ML Engineer",
        "Senior Applied AI Engineer"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "ai_engineer_promotion",
        "ml_research_pivot",
        "phd_to_industry"
      ],
      "years_experience_typical": "6-10",
      "next_roles": [
        "ml_lead",
        "head_of_ai",
        "applied_ai_researcher"
      ],
      "similar_roles": [
        "staff_engineer",
        "applied_ai_researcher",
        "mlops_engineer"
      ],
      "not_to_confuse_with": [
        "Head of AI",
        "Applied AI Researcher",
        "MLOps Engineer"
      ],
      "keywords": [
        "staff AI",
        "principal AI",
        "AI architecture",
        "evaluation systems",
        "fine-tuning"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "mlops_engineer",
      "standardized_title": "MLOps / ML Platform Engineer",
      "role_family": "AI_ML",
      "secondary_family": "Engineering",
      "seniority": "Senior",
      "core_purpose": "Engineer focused on the infrastructure, pipelines, and tooling that turn AI models into reliable, scalable production systems. Owns the machine learning lifecycle from data and training through deployment, monitoring, and retraining. Bridges AI researchers, data engineers, and platform/DevOps teams.",
      "core_responsibilities": [
        "Build and maintain ML serving infrastructure — model deployment pipelines, A/B testing for model versions, canary rollouts",
        "Own model monitoring — drift detection, performance regression alerts, evaluation pipeline scheduling, cost tracking",
        "Build training pipeline infrastructure — feature stores, data versioning, experiment tracking, hyperparameter tuning",
        "Partner with data engineers on production data flows feeding training and inference",
        "Optimize inference cost and latency — GPU utilization, model quantization, serving framework selection, caching",
        "Set the platform standards for how AI engineers ship models — opinionated tooling, CI/CD for ML, evaluation gates"
      ],
      "required_skills": [
        "mlops",
        "mlops_pipelines",
        "model_deployment_serving",
        "model_monitoring_drift",
        "python_development",
        "cloud_platforms_devops",
        "containerization",
        "ci_cd"
      ],
      "preferred_skills": [
        "machine_learning",
        "kubernetes",
        "data_engineering_pipelines",
        "performance_optimization"
      ],
      "tools": [
        "Python",
        "PyTorch",
        "TensorFlow",
        "Kubernetes",
        "Docker",
        "Ray",
        "Airflow",
        "Prefect",
        "MLflow",
        "Weights & Biases",
        "DVC",
        "AWS (SageMaker)",
        "GCP (Vertex AI)",
        "Azure ML",
        "Databricks",
        "Prometheus",
        "Grafana",
        "OpenTelemetry",
        "Terraform"
      ],
      "market_notes": {
        "israel": "Backgrounds: DevOps engineers pivoting to ML, ML engineers pivoting to platform work, seasoned data engineers with ML experience. Stack patterns: heavy Kubernetes, Ray, Kubeflow, Airflow, MLflow, Weights & Biases; increasingly Modal / Anyscale-style serverless ML; GPU utilization optimization; model quantization; serving framework selection. Hiring stage: critical at AI-native scale-ups and any company with non-trivial production AI. Particularly heavy demand at Run:ai (entire business is MLOps infrastructure), Hailo, AI21 Labs, Aidoc, Verbit, Lightricks, Hour One, D-ID. Also common at SaaS scale-ups with embedded AI (monday.com, Gong, Cyera, BigID, Snyk, Wiz) and at companies building AI platforms (Decart, Solid, Granica)."
      },
      "alternate_titles": [
        "ML Platform Engineer",
        "ML Infrastructure Engineer",
        "AI Platform Engineer"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "devops_pivot_to_ml",
        "ml_engineer_pivot_to_platform",
        "platform_engineer_with_ml_focus"
      ],
      "years_experience_typical": "5-9",
      "next_roles": [
        "ml_lead",
        "head_of_ai",
        "platform_engineering_lead"
      ],
      "similar_roles": [
        "devops_engineer",
        "sre_engineer",
        "senior_ai_engineer",
        "data_engineer"
      ],
      "not_to_confuse_with": [
        "AI Engineer",
        "DevOps Engineer",
        "Data Engineer"
      ],
      "keywords": [
        "MLOps",
        "ML platform",
        "model serving",
        "training pipelines",
        "evaluation infrastructure"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "cv_edge_ai_engineer",
      "standardized_title": "Computer Vision / Edge AI Engineer",
      "role_family": "AI_ML",
      "secondary_family": "Engineering",
      "seniority": "Senior",
      "core_purpose": "Specialist engineer building AI systems for computer vision, real-time inference, and deployment on edge devices. Works across the full stack — from model development to systems optimization, sensor integration, and deployment on resource-constrained hardware. Common in defense, autonomous systems, robotics, AR/VR, and physical AI applications.",
      "core_responsibilities": [
        "Build computer vision models — object detection, segmentation, classification, depth estimation, OCR — for production use cases",
        "Optimize models for edge deployment — quantization, pruning, knowledge distillation, model compression for embedded targets",
        "Own the full CV / Edge AI stack — data annotation pipelines, training infrastructure, deployment to target hardware (GPUs, TPUs, NPUs, embedded SoCs)",
        "Profile model performance on target hardware; iterate on architecture and quantization to meet latency / power budgets",
        "Partner with embedded systems engineers on hardware-software co-design for edge AI products",
        "Evaluate research developments in CV / edge AI and adapt promising approaches into production"
      ],
      "required_skills": [
        "computer_vision",
        "deep_learning",
        "edge_ai_deployment",
        "python_development",
        "model_training_finetuning",
        "model_deployment_serving"
      ],
      "preferred_skills": [
        "model_quantization",
        "embedded_systems",
        "cuda_programming",
        "machine_learning",
        "ml_systems_thinking"
      ],
      "tools": [
        "Python",
        "C++",
        "CUDA",
        "PyTorch",
        "TensorFlow",
        "OpenCV",
        "TensorRT",
        "ONNX",
        "NVIDIA Jetson platforms",
        "ROS",
        "Docker",
        "Linux",
        "Git",
        "Classical CV algorithms (SIFT, SURF, optical flow)"
      ],
      "market_notes": {
        "israel": "Backgrounds: Unit 9900 (military imaging intelligence), 8200, and 81 alumni dominate the senior talent pool; CV research transitions to industry; embedded engineers pivoting to ML. Stack patterns: Python + PyTorch (TensorFlow declining); C++ / CUDA for performance-critical paths and embedded targets (NVIDIA Jetson, Hailo, Qualcomm, custom silicon); model quantization and compression toolchains. Hiring stage: particularly strong Israeli specialty given defense and automotive tech heritage. Heavy at Mobileye (autonomous driving), Hailo (edge AI chips), Innoviz Technologies, Foresight Autonomous, Cellebrite, Trigo, Trax Retail, OrCam, Edgybees, Aidoc (medical imaging), and CV / AI teams at major cyber companies (Wiz, BigID)."
      },
      "alternate_titles": [
        "Computer Vision Engineer",
        "Edge AI Engineer",
        "Embedded ML Engineer",
        "CV Engineer"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "cv_research_to_industry",
        "embedded_engineer_pivot",
        "ml_engineer_specialization"
      ],
      "years_experience_typical": "5-10",
      "next_roles": [
        "ml_lead",
        "applied_ai_researcher",
        "head_of_ai"
      ],
      "similar_roles": [
        "senior_ai_engineer",
        "applied_ai_researcher",
        "mlops_engineer"
      ],
      "not_to_confuse_with": [
        "AI Engineer",
        "Applied AI Researcher"
      ],
      "keywords": [
        "computer vision",
        "edge AI",
        "embedded ML",
        "quantization",
        "model optimization"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "applied_ai_researcher",
      "standardized_title": "Applied AI Researcher",
      "role_family": "AI_ML",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Research-oriented engineer who owns the full lifecycle of AI projects — from problem formulation and experimentation through production deployment. Bridges academic research and applied engineering, combining deep ML methodology with production systems thinking. Works on novel problems where off-the-shelf solutions don't exist.",
      "core_responsibilities": [
        "Bridge research and production — read latest papers, identify which methods are ready for production application, prototype them",
        "Run rigorous experiments comparing different model architectures, training approaches, or evaluation strategies",
        "Develop novel methods for the company's specific problem domain when off-the-shelf research doesn't fit",
        "Publish papers, give conference talks, and contribute to open-source projects that strengthen the company's research reputation",
        "Mentor AI engineers on rigorous experimentation, evaluation methodology, and how to read research papers critically",
        "Partner with senior product and engineering leadership on AI strategy — what's possible now, what's 6-12 months away"
      ],
      "required_skills": [
        "deep_learning",
        "machine_learning",
        "model_training_finetuning",
        "python_development",
        "llm_fundamentals",
        "ml_systems_thinking"
      ],
      "preferred_skills": [
        "research_writing",
        "experimental_design",
        "fine_tuning_models",
        "computer_vision",
        "model_evaluation"
      ],
      "tools": [
        "Python",
        "PyTorch",
        "TensorFlow",
        "scikit-learn",
        "Hugging Face Transformers",
        "Jupyter",
        "MLflow/W&B",
        "LangChain",
        "pandas",
        "NumPy",
        "statistical modeling tools",
        "LaTeX (for papers)",
        "vector databases"
      ],
      "market_notes": {
        "israel": "Backgrounds: PhDs from Technion, Hebrew University, Tel Aviv University, Weizmann Institute, or top US programs; some ML engineers transitioning to research with strong publication track records. Stack patterns: PyTorch dominant; W&B / MLflow for experimentation; LaTeX + Overleaf for paper writing; HuggingFace + custom training frameworks; deep evaluation methodology work. Distinct from pure ML research scientist roles at Meta AI / Google DeepMind — applied researchers in Israel typically maintain stronger production-engineering responsibilities. Hiring stage: concentrated at AI labs and AI-native scale-ups — AI21 Labs (one of the largest pure-play AI research orgs locally), Run:ai, Hailo, Aidoc, Lightricks, plus the Israeli AI research teams at NVIDIA Israel, Intel AI Israel, Microsoft Research Israel, IBM Research Israel, and increasingly large cyber companies (Wiz, Cyera)."
      },
      "alternate_titles": [
        "AI Research Scientist",
        "Applied Research Engineer",
        "ML Research Engineer",
        "Research Scientist"
      ],
      "technical_depth": "High",
      "customer_facing_level": "Low",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "phd_to_industry",
        "ml_engineer_research_pivot",
        "former_academic"
      ],
      "years_experience_typical": "5-12",
      "next_roles": [
        "principal_research_scientist",
        "head_of_ai",
        "vp_ai_chief_ai_officer"
      ],
      "similar_roles": [
        "senior_ai_engineer",
        "cv_edge_ai_engineer",
        "mlops_engineer"
      ],
      "not_to_confuse_with": [
        "Senior AI Engineer",
        "AI Research Scientist",
        "Head of AI"
      ],
      "keywords": [
        "AI research",
        "applied research",
        "ML research",
        "paper-to-production",
        "experimentation"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "prompt_engineer",
      "standardized_title": "Prompt Engineer / Conversational AI Designer",
      "role_family": "AI_ML",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Specialist focused on designing, optimizing, and maintaining prompts for LLM-based systems, with emphasis on conversational experiences, multi-turn dialogue, and consistent AI persona. Combines linguistic craft, AI engineering fundamentals, and rapid experimentation. Works closely with PMs and engineers to deliver natural, trustworthy AI interactions.",
      "core_responsibilities": [
        "Design and optimize prompts for production LLM applications — systematic versioning, A/B testing, evaluation harnesses",
        "Build prompt evaluation infrastructure — golden datasets, automated quality scoring, regression detection",
        "Develop prompt patterns and reusable templates for common task types (extraction, classification, generation, agent reasoning)",
        "Partner with AI engineers on integrating prompts into production code — separation of prompt concerns from application logic",
        "Document prompt strategies for the team; train other engineers and PMs on effective prompt design",
        "Stay current on emerging prompt techniques (chain-of-thought, ReAct, multi-agent patterns) and adapt to the team's stack"
      ],
      "required_skills": [
        "prompt_engineering",
        "llm_api_integration",
        "llm_fundamentals",
        "llm_evaluation",
        "python_development"
      ],
      "preferred_skills": [
        "rag_systems",
        "machine_learning_fundamentals",
        "experimentation_framework",
        "technical_communication"
      ],
      "tools": [
        "OpenAI/Anthropic APIs",
        "LangChain",
        "prompt management platforms (Promptfoo, LangSmith)",
        "Python (for testing/prototyping)",
        "Jupyter",
        "Git",
        "evaluation frameworks",
        "conversation analytics tools"
      ],
      "market_notes": {
        "israel": "Backgrounds: AI engineer specialization, product designer / content designer pivots, technical writers, linguists — hybrid engineering + language background more useful than pure SWE. Stack patterns: PromptLayer / Helicone / Langfuse for prompt versioning and evaluation; LangSmith for tracing; OpenAI / Anthropic / Google API directly; custom evaluation harnesses. Hiring stage: emerged with the 2023-2024 GenAI wave but consolidating — many companies have folded the function into AI Engineer roles rather than maintaining as separate specialty. Dedicated Prompt Engineer roles persist primarily at conversational AI companies (Wonderful, Hi.auto, Hyro), AI-first SaaS (Gong, Anyword, Bria AI, D-ID), and companies with heavy LLM-driven user-facing features (Lightricks, Hour One, Lemonade)."
      },
      "alternate_titles": [
        "Senior Prompt Engineer",
        "AI Prompt Engineer",
        "LLM Prompt Engineer",
        "Conversational AI Designer"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale"
      ],
      "typical_backgrounds": [
        "ai_engineer_specialization",
        "product_designer_pivot",
        "content_designer_pivot",
        "linguist_pivot"
      ],
      "years_experience_typical": "2-6",
      "next_roles": [
        "senior_ai_engineer",
        "ml_lead"
      ],
      "similar_roles": [
        "ai_engineer_mid",
        "product_manager"
      ],
      "not_to_confuse_with": [
        "AI Engineer",
        "Conversational AI Designer"
      ],
      "keywords": [
        "prompt engineering",
        "LLM prompts",
        "prompt evaluation",
        "chain-of-thought"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "ai_transformation_lead",
      "standardized_title": "AI Transformation Lead / AI Enablement Lead",
      "role_family": "AI_ML",
      "secondary_family": "Leadership",
      "seniority": "Senior",
      "core_purpose": "Cross-functional leader responsible for driving AI adoption across the business — not building AI products for customers, but enabling internal teams to work with AI. Identifies high-value internal AI use cases, leads rollouts, builds playbooks and training, and measures ROI of AI transformation efforts. Sits at the intersection of AI, operations, change management, and business strategy.",
      "core_responsibilities": [
        "Define AI strategy across the company — which functions can adopt AI, in what order, with what ROI expectations",
        "Run AI adoption programs — internal training, tool selection, vendor evaluation, change management",
        "Partner with functional leaders (Sales, Marketing, Customer Success, HR, Finance) on AI tool deployment within their teams",
        "Build the company's AI literacy — workshops, office hours, internal documentation, AI champion programs",
        "Measure and report on AI adoption — usage metrics, time saved, quality impact, cost ROI",
        "Stay current on the AI tooling landscape; evaluate new vendors and bring promising tools to internal stakeholders"
      ],
      "required_skills": [
        "ai_strategy_roadmap",
        "ai_tool_fluency",
        "change_management",
        "stakeholder_management",
        "cross_functional_collaboration"
      ],
      "preferred_skills": [
        "consulting_methodology",
        "vendor_management",
        "executive_presentation",
        "training_facilitation"
      ],
      "tools": [
        "OpenAI/Anthropic/enterprise LLM platforms",
        "Zapier",
        "Make",
        "n8n",
        "Workato",
        "Claude Code",
        "ChatGPT Enterprise",
        "Copilot ecosystems",
        "project management tools (Jira, Asana)",
        "documentation platforms",
        "AI governance/compliance tools"
      ],
      "market_notes": {
        "israel": "Backgrounds: former management consultants (McKinsey, BCG, Bain Israel offices), operations leaders, PMs with strong cross-functional credibility. Stack patterns: AI tool evaluation frameworks; change management methodology; vendor evaluation; internal training programs; KPI definition and tracking for adoption metrics. Hiring stage: emerged in 2024-2025 as enterprises and larger Israeli companies (200+ employees) sought dedicated leadership for internal AI adoption. Distinct from Head of AI (product-focused) — this role is operations / internal-tooling focused. Most common at large Israeli tech companies (monday.com, Wix, JFrog, Amdocs, NICE Systems, Check Point), mature Israeli enterprises (Bank Hapoalim, Bank Leumi, Strauss Group, Teva), and Israeli offices of US enterprises."
      },
      "alternate_titles": [
        "AI Transformation Manager",
        "Head of AI Adoption",
        "AI Strategy Lead",
        "Enterprise AI Lead"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "Medium",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Mature"
      ],
      "typical_backgrounds": [
        "consulting_background",
        "operations_leader_pivot",
        "former_pm",
        "change_management_specialist"
      ],
      "years_experience_typical": "7-12",
      "next_roles": [
        "head_of_ai",
        "vp_ai_chief_ai_officer"
      ],
      "similar_roles": [
        "head_of_ai",
        "head_of_business_operations",
        "chief_of_staff"
      ],
      "not_to_confuse_with": [
        "Head of AI",
        "Chief AI Officer"
      ],
      "keywords": [
        "AI adoption",
        "AI transformation",
        "AI literacy",
        "tool deployment",
        "internal AI"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "head_of_ai",
      "standardized_title": "Head of AI / AI Lead",
      "role_family": "AI_ML",
      "secondary_family": "Leadership",
      "seniority": "Lead_Manager",
      "core_purpose": "Senior leader who owns AI strategy and execution for a product or business unit. Manages a team of AI engineers, researchers, and MLOps specialists. Drives the AI roadmap, makes build-vs-buy decisions, and is accountable for the quality, reliability, and evolution of AI capabilities in production. Reports to CTO, VP Engineering, or CEO at smaller startups.",
      "core_responsibilities": [
        "Own AI / ML strategy across the company — what AI products to build, what models to use, where to invest research effort",
        "Build and develop the AI team — hire AI engineers, ML researchers, MLOps, prompt engineers; design the team's structure",
        "Set the technical AI bar — model selection, evaluation methodology, AI engineering quality standards",
        "Partner with product and engineering leadership on AI-product roadmap, prioritization, and resource allocation",
        "Represent the AI function externally — conferences, partnerships, hiring, customer technical conversations",
        "Stay current on the rapidly-evolving AI landscape; make strategic decisions on model providers, open-source vs proprietary, build-vs-buy"
      ],
      "required_skills": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "people_management",
        "machine_learning",
        "llm_fundamentals",
        "executive_presentation"
      ],
      "preferred_skills": [
        "deep_learning",
        "mlops",
        "organizational_design",
        "vendor_management",
        "hiring_talent_acquisition"
      ],
      "tools": [
        "Python (hands-on)",
        "all major LLM APIs and frameworks",
        "cloud AI platforms (AWS SageMaker, GCP Vertex, Azure ML)",
        "MLOps platforms",
        "team management tools",
        "product planning tools",
        "Jira/Linear",
        "strategic planning frameworks"
      ],
      "market_notes": {
        "israel": "Backgrounds: senior AI engineer promotion, ML research leader, external head of AI hire; often PhD + production experience + leadership chops combined. Many were former senior AI engineers at FAANG, ex-academia, or seasoned ML leaders from earlier ML scale-ups. Stack patterns: model selection across providers; build-vs-buy decisions; org design for AI teams; vendor management for compute / API spend. Hiring stage: critical role at any Israeli company with substantial AI investment. Role has proliferated rapidly since 2023. Heavy at AI-native companies (AI21 Labs, Aidoc, Run:ai, Hailo, Lightricks, Hour One, D-ID, Verbit, Decart), cyber investing in AI (Wiz, Cyera, BigID, Snyk, CyberArk, SentinelOne), and large SaaS unicorns (monday.com, Wix, JFrog, Gong, HiBob). Hiring is extremely competitive."
      },
      "alternate_titles": [
        "Head of AI",
        "Director of AI",
        "AI Lead",
        "Head of Machine Learning"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "senior_ai_engineer_promotion",
        "ml_research_leader",
        "external_head_of_ai_hire"
      ],
      "years_experience_typical": "10-15",
      "next_roles": [
        "vp_ai_chief_ai_officer"
      ],
      "similar_roles": [
        "vp_engineering",
        "head_of_data",
        "head_of_product"
      ],
      "not_to_confuse_with": [
        "VP AI / Chief AI Officer",
        "Senior AI Engineer",
        "Head of Data"
      ],
      "keywords": [
        "head of AI",
        "director of AI",
        "AI leadership",
        "ML lead",
        "AI strategy"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "vp_ai_chief_ai_officer",
      "standardized_title": "VP AI / Chief AI Officer",
      "role_family": "AI_ML",
      "secondary_family": "Leadership",
      "seniority": "VP_Executive",
      "core_purpose": "Executive-level AI leader accountable for the entire AI function across the company — strategy, engineering, research, platform, and organizational AI adoption. Owns AI as a core business capability, drives cross-functional AI transformation, and represents AI externally to board, investors, customers, and the market. Typically found at larger AI-native companies or enterprises undergoing deep AI transformation.",
      "core_responsibilities": [
        "Own AI strategy and execution at the executive level — set the company's AI direction across products, infrastructure, and operations",
        "Build the senior AI leadership bench — develop Head of AI, Heads of ML Research, MLOps leads",
        "Set the AI product vision in partnership with the CPO — what AI products to build, in what order, with what ambition",
        "Represent AI to the board, investors, and major customers — own the external narrative on AI capabilities and roadmap",
        "Own AI budget — model costs, compute costs, vendor spend, headcount; make build-vs-buy decisions at the strategic level",
        "Drive AI culture and literacy across the executive team and the broader org"
      ],
      "required_skills": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "executive_leadership",
        "organizational_design",
        "executive_presentation"
      ],
      "preferred_skills": [
        "vendor_management",
        "machine_learning",
        "ml_systems_thinking",
        "board_management"
      ],
      "tools": [
        "executive strategy frameworks",
        "board-level communication tools",
        "AI platform overview (hands-on-adjacent)",
        "financial modeling for AI investment",
        "organizational design frameworks",
        "external communication platforms"
      ],
      "market_notes": {
        "israel": "Backgrounds: Head of AI promotion, former CTO pivoting to AI, or external executive hire with multiple prior cycles. Talent pool is very small and highly competitive — often combine experience at major Israeli AI scale-ups with stints at FAANG AI orgs. Stack patterns: executive-level AI strategy, board / investor communication on AI capabilities, budget ownership across model costs / compute / vendor spend / headcount. Hiring stage: found primarily at AI-native scale-ups and unicorns (AI21 Labs, Aidoc, Hailo, Run:ai, Lightricks, Verbit, Hour One) and at mature companies making AI a strategic priority (Amdocs, NICE Systems, Check Point, Cellebrite, monday.com, JFrog, Lemonade). Often combined with CTO at smaller companies — full Chief AI Officer titles appear at companies with 100+ engineers and dedicated AI investment."
      },
      "alternate_titles": [
        "VP AI",
        "Chief AI Officer",
        "CAIO",
        "VP of Artificial Intelligence"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Mature"
      ],
      "typical_backgrounds": [
        "head_of_ai_promotion",
        "former_cto_pivot_to_ai",
        "external_executive_hire"
      ],
      "years_experience_typical": "15+",
      "next_roles": [
        "cto",
        "ceo"
      ],
      "similar_roles": [
        "cto",
        "vp_engineering",
        "head_of_ai"
      ],
      "not_to_confuse_with": [
        "Head of AI",
        "CTO",
        "Chief Data Officer"
      ],
      "keywords": [
        "executive AI",
        "VP AI",
        "chief AI officer",
        "AI strategy",
        "board-level AI"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "ai_solutions_engineering_manager",
      "standardized_title": "AI Solutions Engineering Manager",
      "role_family": "AI_ML",
      "secondary_family": "Solutions_Engineering",
      "seniority": "Senior",
      "core_purpose": "Hands-on leader managing a team of Solutions Engineers who implement AI-powered solutions for customers. Combines technical depth, customer-facing skills, and delivery operations. Owns delivery quality and customer outcomes, guides customers through complex AI transformations, and builds delivery processes and reusable assets. Sits between Engineering and Customer Success in many AI startups.",
      "core_responsibilities": [
        "Manage a team of 4-8 AI Solutions Engineers covering pre-sales technical work for AI products",
        "Own the AI SE playbook — discovery frameworks for AI use cases, demo design for LLM products, POC methodology for AI capability evaluation",
        "Build technical credibility with prospects on AI architecture, model selection, evaluation methodology",
        "Partner with the AI engineering team on what's feasible vs not — feed customer requirements back to product",
        "Coach SEs on the dual skill set — strong AI / ML technical depth + customer-facing sales acumen",
        "Run cross-functional alignment with Sales, Product, and AI Engineering on field intel and product gaps"
      ],
      "required_skills": [
        "people_management",
        "process_design",
        "technical_discovery",
        "solution_design_architecture",
        "llm_fundamentals",
        "prompt_engineering"
      ],
      "preferred_skills": [
        "ai_strategy_roadmap",
        "executive_presentation",
        "performance_management",
        "hiring_talent_acquisition"
      ],
      "tools": [
        "AI platforms (company-specific)",
        "LLM APIs",
        "agent frameworks",
        "project management tools (Asana, Jira, Linear)",
        "CRM systems",
        "customer analytics",
        "documentation platforms (Notion, Confluence)",
        "technical delivery tools"
      ],
      "market_notes": {
        "israel": "Backgrounds: SE manager with AI specialization, or senior AI engineers transitioning to customer-facing leadership. The combination of strong AI / ML technical depth + traditional SE / pre-sales leadership is relatively rare. Stack patterns: typical SE management tooling (Salesforce, Lattice, Highspot) plus deep AI fluency for technical positioning. Hiring stage: emerging specialty role at AI-native scale-ups and companies where AI is the primary product differentiator. Most common at AI21 Labs, Aidoc, Run:ai, Verbit, Hour One, D-ID, Wonderful, Anyword, and AI-heavy teams within larger SaaS (Gong, monday.com AI initiatives)."
      },
      "alternate_titles": [
        "AI SE Manager",
        "AI Solutions Architect Lead",
        "Head of AI Solutions"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "se_manager_with_ai_specialization",
        "ai_engineer_to_customer_facing"
      ],
      "years_experience_typical": "8-12",
      "next_roles": [
        "head_of_solutions_engineering",
        "head_of_ai"
      ],
      "similar_roles": [
        "solutions_engineering_manager",
        "engineering_manager"
      ],
      "not_to_confuse_with": [
        "Solutions Engineering Manager",
        "Head of AI"
      ],
      "keywords": [
        "AI pre-sales",
        "AI solutions",
        "LLM SE",
        "AI playbook",
        "GenAI demos"
      ],
      "_research_method": "knowledge"
    },
    {
      "id": "junior_ux_ui_designer",
      "standardized_title": "Junior UX/UI Designer",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Entry-level designer responsible for creating user interfaces and supporting the UX process under guidance from senior designers. Works on wireframes, mockups, and UI components while learning to apply user-centered design principles across web and mobile products.",
      "core_responsibilities": [
        "Create UI mockups and prototypes that illustrate how products function and look",
        "Design graphic elements, icons, and visual components for web and mobile products",
        "Assist with wireframing, user flows, and sitemaps",
        "Gather and evaluate user requirements in collaboration with product managers and engineers",
        "Conduct layout adjustments based on user feedback and usability testing",
        "Contribute to maintaining the design system and component libraries",
        "Prepare and present design drafts to internal teams and stakeholders",
        "Stay current with design trends, tools, and emerging technologies"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Figma",
        "Adobe Creative Suite (Photoshop, Illustrator, XD)",
        "InVision",
        "Miro / FigJam",
        "Basic prototyping tools"
      ],
      "years_experience_typical": "1-3",
      "market_notes": {
        "israel": "Many Israeli startups combine UX and UI into a single designer role from the junior level. Standalone 'UX-only' or 'UI-only' junior positions are rare — companies expect full-stack design capabilities even at entry level. Design agencies and studios (e.g., Zemingo) offer a strong entry path with exposure to multiple product domains."
      }
    },
    {
      "id": "product_designer_ux_ui",
      "standardized_title": "Product Designer (UX/UI)",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Owns end-to-end design for product features and experiences, from user research and wireframing through high-fidelity UI and developer handoff. Works closely with product managers, engineers, and stakeholders to translate complex requirements into intuitive, well-crafted user experiences across web and mobile platforms.",
      "core_responsibilities": [
        "Lead the end-to-end design process for product features — research, ideation, wireframes, prototyping, visual design, usability testing, and developer handoff",
        "Collaborate cross-functionally with product managers, engineers, analysts, and customer-facing teams",
        "Translate complex workflows and data-heavy systems into clean, intuitive interfaces",
        "Conduct user research, analyze behavioral data, and gather feedback to iterate on designs",
        "Maintain and contribute to the product design system for consistency across platforms",
        "Advocate for user-centered design decisions in product discussions",
        "Design for both web and mobile platforms with attention to responsive and adaptive patterns",
        "Make data-driven design decisions using KPIs, A/B testing, and performance metrics",
        "Stay current with design trends, tools, and emerging technologies including AI-assisted design workflows"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Figma (components, auto-layout, prototyping)",
        "Adobe Creative Suite",
        "Miro / FigJam",
        "Prototyping tools (Principle, ProtoPie)",
        "Analytics platforms (Hotjar, FullStory, Amplitude)",
        "AI-assisted design tools (Figma Make, Claude, Cursor)"
      ],
      "years_experience_typical": "3-5",
      "market_notes": {
        "israel": "The most in-demand design role in the Israeli tech market. B2B SaaS and cybersecurity companies dominate hiring, creating strong demand for designers who can simplify complex, data-heavy systems. Proficiency in Figma is universally required. AI-assisted design workflows (Claude, Figma Make, Cursor) are increasingly listed as requirements, not just nice-to-haves. English fluency is expected, as most Israeli tech companies serve global markets."
      }
    },
    {
      "id": "senior_product_designer",
      "standardized_title": "Senior Product Designer",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Experienced product designer who owns design for significant product areas with high autonomy. Takes full accountability for design quality, drives complex projects from discovery to delivery, and influences product strategy. Mentors junior designers and contributes to design culture and processes across the organization.",
      "core_responsibilities": [
        "Own the full design lifecycle for major product areas — from discovery and research through pixel-perfect delivery",
        "Drive design strategy for complex, data-intensive products and enterprise workflows",
        "Lead cross-functional collaboration with product, engineering, data, and customer-facing teams",
        "Conduct and synthesize user research, usability testing, and behavioral analytics to inform design decisions",
        "Mentor and provide feedback to junior designers, elevating team-wide design quality",
        "Evolve and maintain design systems ensuring scalability and consistency across products",
        "Present design rationale to senior stakeholders and executive leadership",
        "Define and implement design processes and best practices",
        "Design for accessibility, performance, and inclusive user experiences",
        "Leverage AI tools to accelerate prototyping, research synthesis, and design-to-code workflows"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Figma (expert — components, variants, auto-layout, design tokens)",
        "Prototyping tools (Principle, ProtoPie, Framer)",
        "User research tools (Maze, UserTesting, Hotjar)",
        "Analytics platforms (Amplitude, Mixpanel, FullStory)",
        "AI-assisted tools (Figma Make, Claude, Cursor)",
        "Adobe Creative Suite",
        "Basic HTML/CSS understanding"
      ],
      "years_experience_typical": "5-7",
      "market_notes": {
        "israel": "Senior Product Designers in Israel are expected to operate with high independence and full ownership of their design domain. The cybersecurity and enterprise SaaS sectors create particularly strong demand for designers experienced with data-heavy dashboards, complex workflows, and data visualization. Companies increasingly expect senior designers to leverage AI tools as part of their standard workflow."
      }
    },
    {
      "id": "ux_researcher",
      "standardized_title": "UX Researcher",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Specializes in understanding user behaviors, needs, and motivations through qualitative and quantitative research methods. Plans and conducts user research studies, synthesizes findings into actionable insights, and partners with product and design teams to ensure user-centered decision-making across the product lifecycle.",
      "core_responsibilities": [
        "Plan, design, and conduct user research studies using qualitative and quantitative methods",
        "Perform usability testing, user interviews, contextual inquiries, and surveys",
        "Analyze research data to identify patterns, pain points, and opportunities",
        "Synthesize findings into actionable insights, personas, journey maps, and recommendations",
        "Collaborate with product designers, product managers, and engineers to integrate research into design decisions",
        "Advocate for the user perspective in product strategy and roadmap discussions",
        "Build and maintain research repositories and knowledge bases",
        "Design and analyze A/B tests and experiments",
        "Present research findings to stakeholders at all levels of the organization",
        "Establish research processes and methodologies across the design organization"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "User research platforms (UserTesting, Maze, Lookback)",
        "Survey tools (Typeform, SurveyMonkey, Qualtrics)",
        "Analytics platforms (Amplitude, Mixpanel, FullStory, Hotjar)",
        "Figma (for annotating and collaborating on designs)",
        "Miro / FigJam (for workshops and affinity mapping)",
        "Data analysis tools (Excel, Google Sheets, basic SQL)",
        "Session recording tools (Hotjar, FullStory)"
      ],
      "years_experience_typical": "3-5",
      "market_notes": {
        "israel": "Standalone UX Researcher roles are relatively uncommon in the Israeli market. Most companies embed research responsibilities within the Product Designer role — designers are expected to conduct their own user research, usability testing, and data analysis. Dedicated UX Research positions tend to appear at larger companies (Wix, Monday.com, Fiverr) or in organizations with mature design teams. This creates an opportunity for research-minded designers to differentiate themselves, but candidates should expect to find fewer dedicated research openings than in the US market."
      }
    },
    {
      "id": "design_system_lead",
      "standardized_title": "Design System Lead",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "Owns the creation, governance, and evolution of the organization's design system — the shared language of components, patterns, tokens, and guidelines that ensures consistency and efficiency across all products. Works at the intersection of design and engineering, collaborating closely with developers to ensure design system adoption and scalable implementation.",
      "core_responsibilities": [
        "Develop and maintain a comprehensive design system including components, patterns, tokens, and documentation",
        "Define design standards, guidelines, and UX/UI patterns across products and platforms",
        "Collaborate closely with product designers, engineers, and product managers to ensure consistency",
        "Build and manage component libraries in Figma with proper variants, auto-layout, and design tokens",
        "Ensure design-to-code fidelity by working with front-end developers on component implementation",
        "Provide guidance and mentorship to designers on design system usage and adherence",
        "Continuously improve and evolve the design system based on product needs and industry best practices",
        "Conduct audits of existing interfaces for design system compliance",
        "Document usage guidelines, interaction patterns, and accessibility requirements",
        "Drive adoption of the design system across teams and products"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Figma (expert — components, variants, design tokens, auto-layout, branching)",
        "Storybook",
        "Design token management tools (Style Dictionary, Tokens Studio)",
        "Documentation platforms (Zeroheight, Notion, Confluence)",
        "Version control (basic Git understanding)",
        "Front-end frameworks awareness (React component structure)",
        "Accessibility testing tools"
      ],
      "years_experience_typical": "5-7",
      "market_notes": {
        "israel": "Design System Lead is an emerging standalone role in the Israeli market, primarily found at mid-to-large companies with multiple product lines (BigID, Wix, Monday.com, Check Point). At smaller startups, design system responsibilities are typically distributed across senior designers. Companies scaling from 1-2 products to multi-product suites are the primary hiring market for this role."
      }
    },
    {
      "id": "design_lead_design_manager",
      "standardized_title": "Design Lead / Design Manager",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "A hybrid player-coach who leads a small-to-medium design team while remaining hands-on with high-impact design work. Balances people management, design process ownership, and individual contribution. Partners with product and engineering leadership to shape product strategy and ensure design quality across the team's output.",
      "core_responsibilities": [
        "Lead, mentor, and manage a team of product designers (typically 3-8 people)",
        "Directly own and execute major design projects as an individual contributor",
        "Partner with product management and engineering leadership to shape product strategy and define user experiences",
        "Establish and improve design processes, workflows, and methodologies across the team",
        "Conduct design reviews and provide constructive feedback to ensure high-quality outcomes",
        "Implement modern, AI-augmented design-to-development workflows",
        "Oversee professional development, growth plans, and career pathing for team members",
        "Maintain and evolve design systems to ensure quality and efficiency",
        "Recruit, interview, and onboard design talent",
        "Advocate for user-centered design principles at the organizational level",
        "Present design strategy and outcomes to senior leadership and stakeholders"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Figma (expert-level)",
        "Design management and collaboration tools",
        "Prototyping tools",
        "User research and analytics platforms",
        "AI-assisted design and development tools",
        "Project management tools (Jira, Linear, Asana)"
      ],
      "years_experience_typical": "7+",
      "market_notes": {
        "israel": "Design Lead/Manager roles in Israel are almost universally hybrid IC-manager positions — companies expect leaders to remain deeply hands-on while managing their team. Pure people-management design roles are rare outside of the largest companies. Strong market demand from B2B SaaS companies scaling their design teams. AI-augmented design workflows are increasingly expected — leaders are expected to implement AI tools that streamline the design-to-development pipeline."
      }
    },
    {
      "id": "head_of_design_vp_design",
      "standardized_title": "Head of Design / VP Design",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Executive design leader who owns the end-to-end product design vision and strategy for the organization. Reports to CPO, CEO, or VP Product. Manages design leads and individual contributors, sets the quality bar, builds design culture, and ensures design is a strategic function that drives business outcomes. May also own brand expression and marketing design functions.",
      "core_responsibilities": [
        "Own and drive the end-to-end product design vision across all user-facing experiences",
        "Inspire, coach, and manage a multidisciplinary design team including design leads and individual contributors",
        "Collaborate with product, engineering, and data leadership to shape product strategy",
        "Build and scale design systems, tooling, and processes for consistency, quality, and efficiency",
        "Champion the voice of the user across the organization — combining research, UX best practices, and business context",
        "Recruit, hire, and develop top-tier design talent",
        "Elevate design as a strategic function, articulating how product experiences drive business outcomes",
        "Establish AI-forward design workflows and practices across the design organization",
        "Own brand expression and visual identity across product and marketing surfaces",
        "Present design strategy to executive leadership, board, and external stakeholders",
        "Define and maintain cross-product UX patterns, navigation, and visual style guidelines"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Figma",
        "Design management and portfolio tools",
        "Presentation tools (Keynote, Google Slides)",
        "Analytics and research platforms",
        "AI tools for design acceleration",
        "Strategic planning tools"
      ],
      "years_experience_typical": "10+",
      "market_notes": {
        "israel": "Head of Design / VP Design roles in Israel typically require ownership of both product design and brand/marketing design functions. The role often reports to CPO or CEO. AI-first design vision is becoming a key requirement — leaders are expected to establish AI-forward design practices and workflows. Companies at Series B+ with 50-500 employees are the primary hiring market. The role is increasingly expected to own how the company communicates its story visually, not just how the product looks and works."
      }
    },
    {
      "id": "brand_marketing_designer",
      "standardized_title": "Brand / Marketing Designer",
      "role_family": "Design_UX",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Owns the visual identity and creative execution of a company's brand across marketing channels and touchpoints. Creates marketing campaigns, digital assets, sales materials, website graphics, social media content, and event branding. Combines strong visual craft with brand strategy thinking to ensure consistent, compelling brand expression that drives business goals.",
      "core_responsibilities": [
        "Define, maintain, and evolve the company's visual brand identity across all touchpoints",
        "Design marketing campaigns, digital ads, social media content, and email templates",
        "Create sales enablement materials including pitch decks, one-pagers, and presentations",
        "Design website pages, landing pages, and web graphics for conversion and engagement",
        "Produce branded materials for events, conferences, and exhibitions (booth graphics, swag, print)",
        "Create visual content for whitepapers, e-books, infographics, and blog posts",
        "Collaborate with marketing, growth, product marketing, and sales teams",
        "Build and maintain brand guidelines and visual systems for consistency at scale",
        "Use generative AI tools to accelerate creative production and enhance output quality",
        "Contribute to video and motion design assets when needed"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Figma",
        "Adobe Creative Suite (Photoshop, Illustrator, InDesign)",
        "After Effects / Premiere Pro (basic motion design)",
        "Generative AI tools (Midjourney, DALL·E, Adobe Firefly)",
        "Website builders (Webflow, Elementor)",
        "Presentation tools (Google Slides, Keynote, PowerPoint)",
        "Social media design tools (Canva for quick iterations)"
      ],
      "years_experience_typical": "3-5",
      "market_notes": {
        "israel": "Strong demand in the Israeli tech market, driven by B2B SaaS companies that need to communicate complex technical products through clear, compelling brand visuals. The role is distinct from Product Designer — it's marketing-facing rather than product-facing, with a focus on campaigns, sales materials, and brand consistency rather than product UX flows. Companies increasingly require proficiency in generative AI tools (Midjourney, Firefly) as a core competency, not just a nice-to-have. Motion design skills (After Effects) are a strong differentiator."
      }
    },
    {
      "id": "bdr_bd_associate",
      "standardized_title": "BDR / BD Associate",
      "role_family": "BD_Partnerships",
      "secondary_family": "Sales",
      "seniority": "Entry",
      "core_purpose": "Entry-level outbound sales development role focused on generating qualified pipeline for the sales team. Initiates contact with potential customers through cold calling, email outreach, and social selling. Qualifies inbound leads, conducts initial discovery conversations, and hands off qualified opportunities to Account Executives.",
      "core_responsibilities": [
        "Generate new business pipeline through outbound prospecting — cold calls, email sequences, and LinkedIn outreach",
        "Qualify inbound leads generated by marketing and convert interest into sales-ready meetings",
        "Conduct initial discovery calls to understand prospect pain points and assess fit",
        "Research target accounts and identify key decision-makers and stakeholders",
        "Coordinate with Account Executives on handoff and first-call preparation",
        "Maintain accurate activity tracking and contact information in CRM (Salesforce, HubSpot)",
        "Collaborate with marketing to refine targeting, messaging, and campaign effectiveness",
        "Meet or exceed activity and pipeline generation targets consistently",
        "Develop product knowledge to effectively communicate value propositions"
      ],
      "required_skills": [
        "outbound_prospecting",
        "discovery_calls",
        "customer_communication",
        "saas_sales",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "lead_qualification",
        "presentation_skills"
      ],
      "tools": [
        "Salesforce / HubSpot CRM",
        "Outreach / Salesloft (sales engagement)",
        "LinkedIn Sales Navigator",
        "ZoomInfo / Apollo (prospecting data)",
        "AI-powered outbound tools (Claude Code, LLM-based automation)",
        "Slack / Teams (internal collaboration)"
      ],
      "years_experience_typical": "0-2",
      "market_notes": {
        "israel": "Backgrounds: recent graduates from Reichman / IDC / TAU business programs, IDF veterans pivoting to commercial roles. Stack patterns: Salesforce + Outreach + LinkedIn Sales Navigator + ZoomInfo / Lusha. Hiring stage: BD-specific titles less common than SDR in Israeli tech — often interchangeable. Where distinct, BD focuses on partnership / channel outreach rather than direct sales prospecting. Common at cyber and B2B SaaS scale-ups with partner-led GTM."
      },
      "alternate_titles": [
        "BDR",
        "BD Associate",
        "Junior Business Development",
        "Partnerships Associate"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "business_development_representative",
        "sales_development_representative",
        "partnerships_associate"
      ]
    },
    {
      "id": "business_development_manager",
      "standardized_title": "Business Development Manager",
      "role_family": "BD_Partnerships",
      "secondary_family": "Sales",
      "seniority": "Mid",
      "core_purpose": "Drives net-new business growth by researching, pursuing, and developing new business relationships. Manages a portfolio of prospects and early-stage partnerships, negotiates commercial terms, and works cross-functionally to deliver on revenue targets. Combines outbound hunting with relationship management and data-driven decision-making.",
      "core_responsibilities": [
        "Research, identify, and develop new business opportunities and long-term relationships",
        "Manage a revenue portfolio and achieve business development targets",
        "Negotiate commercial terms using analytical data and market intelligence",
        "Lead the full business development cycle — from opportunity identification to deal closure",
        "Build relationships with key stakeholders and decision-makers at target organizations",
        "Advance and expand opportunities within existing relationships",
        "Conduct market research, competitive analysis, and gather customer insights",
        "Collaborate with marketing, product, and sales teams to align strategies",
        "Lead presentations, product demos, and business review meetings",
        "Manage CRM pipeline and provide accurate forecasting and reporting"
      ],
      "required_skills": [
        "channel_sales_strategy",
        "partner_relationship_management",
        "negotiation",
        "stakeholder_management",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "go_to_market_strategy",
        "competitive_analysis_product",
        "executive_presentation"
      ],
      "tools": [
        "Salesforce / HubSpot CRM",
        "LinkedIn Sales Navigator",
        "Excel / Google Sheets (financial modeling, ROI analysis)",
        "Outreach / Salesloft",
        "Presentation tools (Google Slides, PowerPoint)",
        "Data analytics tools (Looker, Tableau)"
      ],
      "years_experience_typical": "2-5",
      "market_notes": {
        "israel": "Backgrounds: BD / sales pivots, ex-consultants, MBA graduates with commercial focus. Stack patterns: Salesforce for pipeline + partner intelligence tools + heavy use of LinkedIn for prospecting + competitive intel (Klue / Crayon). Hiring stage: common at cyber (Wiz, Check Point, CyberArk, SentinelOne, Cybereason) and B2B SaaS with channel motion (JFrog, Snyk, Cloudinary). The BD function in Israeli companies often includes strategic partnerships, OEM deals, and ecosystem development."
      },
      "alternate_titles": [
        "BD Manager",
        "Business Development Lead",
        "Senior BD Manager"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "partnerships_manager",
        "account_executive",
        "channel_partner_manager"
      ]
    },
    {
      "id": "partnerships_manager",
      "standardized_title": "Partnerships Manager",
      "role_family": "BD_Partnerships",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Manages and grows an ecosystem of partners — channel partners, technology alliances, affiliates, or strategic integrators. Owns the partner lifecycle from onboarding through ongoing relationship management, joint business planning, and revenue optimization. Acts as the voice of the partner internally and ensures mutual value creation.",
      "core_responsibilities": [
        "Build and maintain strong, long-term relationships with new and existing partners",
        "Manage day-to-day partner relationships including commercial, technical, and operational aspects",
        "Develop and execute joint business plans with partners and ensure effective execution",
        "Identify and lead upsell and expansion opportunities within the partner ecosystem",
        "Onboard new partners and guide them through integration and activation processes",
        "Monitor partner performance, analyze data, and optimize partnership outcomes",
        "Communicate product updates and releases to partners, ensuring smooth adoption",
        "Collaborate cross-functionally with sales, product, marketing, and engineering teams",
        "Negotiate commercial terms, contracts, and partnership agreements",
        "Conduct quarterly business reviews and present performance insights to stakeholders",
        "Act as the partner advocate internally — communicating needs and feedback to product and leadership"
      ],
      "required_skills": [
        "partner_relationship_management",
        "negotiation",
        "stakeholder_management",
        "channel_sales_strategy",
        "go_to_market_strategy"
      ],
      "preferred_skills": [
        "analytical_thinking",
        "competitive_analysis_product"
      ],
      "tools": [
        "Salesforce / HubSpot CRM",
        "Partner management platforms",
        "Excel / Google Sheets (performance analysis, financial modeling)",
        "Presentation tools (Google Slides, PowerPoint)",
        "Project management tools (Asana, Monday.com)",
        "Analytics and BI tools"
      ],
      "years_experience_typical": "3-5",
      "market_notes": {
        "israel": "Backgrounds: senior BD / partner sales pivots, ex-consultants, account managers with strategic specialization. Stack patterns: Salesforce + PartnerStack / Impartner + Notion for partner enablement content + Asana / Monday for project work. Hiring stage: most common at cyber (Wiz, Check Point, CyberArk, SentinelOne, Cybereason, Aqua Security) and integration-heavy SaaS (JFrog, Snyk, Cloudinary, Cellebrite). Strong partnership-focused career path at companies with sizeable channel programs."
      },
      "alternate_titles": [
        "Senior Partnerships Manager",
        "Strategic Partnerships Manager"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "business_development_manager",
        "channel_partner_manager",
        "account_manager"
      ]
    },
    {
      "id": "senior_bd_manager_strategic_partnerships",
      "standardized_title": "Senior BD Manager / Strategic Partnerships Manager",
      "role_family": "BD_Partnerships",
      "secondary_family": "Sales",
      "seniority": "Senior",
      "core_purpose": "Leads high-value, complex business development and strategic partnership initiatives. Manages enterprise-level relationships, builds partner ecosystems, and drives significant revenue through strategic alliances and channel development. Operates at the intersection of business strategy, partner management, and cross-functional leadership.",
      "core_responsibilities": [
        "Develop and manage executive-level relationships with strategic partners, enterprise clients, and ecosystem players",
        "Lead complex, multi-stakeholder deals and partnership negotiations",
        "Build and scale partner ecosystems including channel partners, technology alliances, and strategic integrators",
        "Develop and execute go-to-market strategies, pricing models, and commercial frameworks",
        "Manage a high-value revenue portfolio and consistently exceed growth targets",
        "Create comprehensive joint business plans and co-selling initiatives with partners",
        "Assess and integrate technology vendors and platforms to facilitate growth",
        "Build partner enablement programs including sales training, technical positioning, and messaging",
        "Represent the company at industry conferences, executive briefings, and strategic events",
        "Collaborate cross-functionally with product, sales, marketing, finance, and legal teams",
        "Present business cases, budget projections, and strategic recommendations to leadership"
      ],
      "required_skills": [
        "channel_sales_strategy",
        "partner_relationship_management",
        "negotiation",
        "executive_relationships",
        "go_to_market_strategy"
      ],
      "preferred_skills": [
        "board_management",
        "competitive_positioning",
        "stakeholder_management"
      ],
      "tools": [
        "Salesforce CRM",
        "LinkedIn Sales Navigator",
        "Excel / Google Sheets (advanced financial modeling)",
        "BI and analytics tools (Tableau, Looker)",
        "Presentation tools",
        "Contract management tools",
        "Project management platforms"
      ],
      "years_experience_typical": "5-7",
      "market_notes": {
        "israel": "Backgrounds: senior BD professionals with 6-10 years experience including stints at larger Israeli or US tech companies. Stack patterns: Salesforce + executive relationship management; complex deal structuring; cross-border legal coordination (US / EMEA / APAC partnership contracts). Hiring stage: scale-ups and unicorns with substantial BD investment — Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, Cellebrite, Amdocs. Often manages OEM deals, technology partnerships, channel program design."
      },
      "alternate_titles": [
        "Senior BD Manager",
        "Strategic Partnerships Lead",
        "Director of Strategic Partnerships"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "business_development_manager",
        "partnerships_manager",
        "head_of_bd_head_of_partnerships"
      ]
    },
    {
      "id": "head_of_bd_head_of_partnerships",
      "standardized_title": "Head of BD / Head of Partnerships",
      "role_family": "BD_Partnerships",
      "secondary_family": "Leadership",
      "seniority": "Director_Head",
      "core_purpose": "Owns the business development or partnerships function for the organization. Designs and executes the BD/partnership strategy, builds and leads the team, and drives significant revenue through net-new business, partner ecosystems, and strategic alliances. Reports to VP Sales, CRO, or CEO. Responsible for pipeline generation, team performance, and cross-functional GTM alignment.",
      "core_responsibilities": [
        "Design and execute the company's business development or partnership strategy",
        "Build, lead, and scale a high-performing BD/SDR/partnerships team",
        "Own pipeline generation targets and consistently deliver against revenue objectives",
        "Develop and manage strategic partnerships with investors, accelerators, ecosystem players, and technology vendors",
        "Personally engage in key deals and high-value strategic relationships",
        "Establish and optimize outbound strategy — messaging, sequencing, targeting, and channels",
        "Implement performance management systems, coaching frameworks, and career development paths",
        "Partner with marketing on lead scoring, campaign attribution, and demand generation alignment",
        "Drive cross-functional alignment between sales, marketing, product, and customer success",
        "Recruit, onboard, and develop BD/partnerships talent",
        "Own CRM discipline, reporting, and forecasting accuracy",
        "Represent the company at industry events, conferences, and executive forums",
        "Own and grow referral partner channels and strategic vendor relationships"
      ],
      "required_skills": [
        "channel_sales_strategy",
        "executive_relationships",
        "negotiation",
        "go_to_market_strategy",
        "people_management"
      ],
      "preferred_skills": [
        "organizational_design",
        "board_management",
        "partner_relationship_management"
      ],
      "tools": [
        "Salesforce / HubSpot CRM",
        "Sales engagement platforms (Outreach, Salesloft)",
        "LinkedIn Sales Navigator",
        "ZoomInfo / Clay (prospecting intelligence)",
        "Analytics and BI tools",
        "AI-powered prospecting tools",
        "Revenue intelligence platforms"
      ],
      "years_experience_typical": "7-10",
      "market_notes": {
        "israel": "Backgrounds: senior BD manager promotion or external VP BD / Partnerships hire from larger Israeli or US tech companies. Stack patterns: org-level BD strategy, partner program design, executive-level commercial relationships. Hiring stage: at scale-ups and unicorns with sizable partnership functions — Wiz, Check Point, CyberArk, SentinelOne, JFrog, Cellebrite, Amdocs, NICE Systems, monday.com (smaller team). Reports to CRO or CEO depending on the strategic importance of partnerships."
      },
      "alternate_titles": [
        "VP Business Development",
        "Head of Partnerships",
        "VP Partnerships"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "vp_business_development",
        "vp_sales",
        "head_of_marketing"
      ]
    },
    {
      "id": "vp_business_development",
      "standardized_title": "VP Business Development",
      "role_family": "BD_Partnerships",
      "secondary_family": "Leadership",
      "seniority": "VP_Executive",
      "core_purpose": "Executive leader who owns the global business development, partnerships, and/or channel strategy for the organization. Defines and executes growth strategies across markets, builds and scales global partner ecosystems, and drives significant revenue impact. Reports to CEO, CRO, or President. Shapes company strategy at the executive level and represents the organization in high-stakes engagements.",
      "core_responsibilities": [
        "Define and lead global business development and partnership strategy aligned with company objectives",
        "Build and scale a global BD/partnerships organization across regions and markets",
        "Drive measurable growth in pipeline, bookings, and revenue across global markets",
        "Develop and manage executive-level relationships with strategic partners, vendors, and ecosystem players",
        "Lead complex, high-value deal negotiations and strategic partnership structuring",
        "Establish joint go-to-market strategies, co-selling initiatives, and channel programs",
        "Build partner enablement programs and scaling frameworks globally",
        "Participate in executive leadership discussions and influence strategic direction",
        "Drive cross-functional alignment across sales, marketing, product, and customer success globally",
        "Represent the company at major industry events, executive briefings, and board-level presentations",
        "Recruit and develop world-class BD and partnerships talent globally",
        "Own strategic forecasting and report to executive leadership with pipeline visibility"
      ],
      "required_skills": [
        "channel_sales_strategy",
        "executive_leadership",
        "negotiation",
        "go_to_market_strategy",
        "organizational_design"
      ],
      "preferred_skills": [
        "board_management",
        "executive_presentation"
      ],
      "tools": [
        "Salesforce CRM",
        "Executive dashboards and BI tools",
        "Revenue intelligence platforms",
        "Presentation tools (Keynote, Google Slides)",
        "Strategic planning tools",
        "Contract and deal management platforms"
      ],
      "years_experience_typical": "10+",
      "market_notes": {
        "israel": "Backgrounds: Head of BD promotion or external VP BD hire; often 12-18 years total experience including time at major US or Israeli enterprise software companies. Stack patterns: executive-level strategic partnership work, M&A scouting and execution, OEM deal structuring. Hiring stage: typically only at unicorns and mature companies with substantial partnership economics — Check Point, CyberArk, SentinelOne, Amdocs, NICE Systems, Cellebrite, JFrog. Less common at consumer-facing or product-led-growth Israeli companies."
      },
      "alternate_titles": [
        "VP BD",
        "Chief Business Development Officer",
        "Chief Partnerships Officer"
      ],
      "_research_method": "knowledge",
      "similar_roles": [
        "vp_sales",
        "head_of_bd_head_of_partnerships",
        "vp_marketing"
      ]
    },
    {
      "id": "junior_consultant_analyst",
      "standardized_title": "Junior Consultant / Analyst",
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Entry-level consulting role focused on research, data analysis, and supporting senior consultants on client engagements. Analysts gather information, build models, prepare deliverables, and begin developing client-facing skills. Common entry point from Big 4 firms (Deloitte, EY, KPMG, PwC) and strategy boutiques.",
      "core_responsibilities": [
        "Conduct market research, competitive analysis, and industry benchmarking to support engagement deliverables",
        "Gather, clean, and analyze data from financial reports, operational systems, and interviews",
        "Prepare presentations, reports, and client-ready documentation under senior guidance",
        "Support risk assessments, compliance reviews, and internal audit projects",
        "Participate in client workshops, interviews, and discovery sessions",
        "Assist in developing process flowcharts, risk matrices, and control documentation",
        "Contribute to proposal and pitch development for new engagements",
        "Document findings, maintain project files, and track action items"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Microsoft Excel (advanced)",
        "PowerPoint",
        "Word",
        "SQL (basic)",
        "Tableau / Power BI (basic)",
        "Salesforce / CRM systems",
        "Project management tools (Jira, Asana, Monday)"
      ],
      "keywords": [
        "analyst",
        "junior consultant",
        "big 4",
        "entry level consulting",
        "risk analyst",
        "strategy analyst",
        "audit"
      ],
      "market_notes": {
        "israel": "Strong entry-level pipeline from Reichman, TAU, HUJI, and Technion into Big 4 firms (Deloitte, EY, KPMG, PwC) and Israeli strategy boutiques (Shaldor, Tefen, Pareto). Many roles require a BA/BSc in economics, business administration, industrial engineering, or accounting. Big 4 firms often hire cohorts annually. CPA is a strong advantage for risk/audit tracks. 2-3 year tenure is standard before first exit opportunity."
      }
    },
    {
      "id": "consultant",
      "standardized_title": "Consultant",
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Mid-level consulting professional who owns workstreams within client engagements. Consultants lead specific analyses, manage day-to-day client interactions for their workstream, and begin developing expertise in a domain (strategy, risk, digital transformation, M&A). They translate complex problems into structured approaches and deliver actionable recommendations.",
      "core_responsibilities": [
        "Own and deliver complete workstreams within larger client engagements",
        "Conduct structured analyses including financial modeling, process mapping, and gap assessments",
        "Lead client interviews, workshops, and stakeholder alignment sessions",
        "Develop risk assessments, compliance frameworks, and remediation plans",
        "Prepare and present findings and recommendations to mid-level client stakeholders",
        "Mentor junior analysts and review their work product",
        "Contribute to business development through proposal writing and client relationship building",
        "Coordinate with cross-functional teams (finance, IT, legal) to ensure engagement success",
        "Develop expertise in a consulting domain: strategy, risk & compliance, digital transformation, or M&A"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Microsoft Excel (advanced modeling)",
        "PowerPoint",
        "SQL",
        "Tableau / Power BI",
        "ERP systems (SAP, NetSuite, Zuora)",
        "GRC platforms",
        "NIST CSF / ISO 27001 / COSO frameworks",
        "Project management tools"
      ],
      "keywords": [
        "consultant",
        "risk management",
        "compliance",
        "strategy",
        "due diligence",
        "financial consulting",
        "transformation"
      ],
      "market_notes": {
        "israel": "Mid-level consultants in Israel typically have 2-5 years of experience. Big 4 firms promote from Analyst to Consultant after 2-3 years. This is the most common exit point to tech companies — Israeli startups and scale-ups actively recruit from Big 4 consulting into operations, strategy, and product roles. M&A and financial due diligence consultants are in high demand given Israel's active tech M&A market. Hebrew and English fluency expected across all firms."
      }
    },
    {
      "id": "senior_consultant",
      "standardized_title": "Senior Consultant",
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Senior",
      "core_purpose": "Senior consulting professional who leads client engagements end-to-end, manages small teams, and serves as a trusted advisor to senior client stakeholders. Responsible for engagement scoping, delivery quality, and client relationship management. Develops deep domain expertise and begins contributing to practice development and business development.",
      "core_responsibilities": [
        "Lead end-to-end client engagements from scoping and proposal through delivery and closeout",
        "Manage engagement teams of 2-5 consultants and analysts",
        "Serve as primary client contact for engagement-level decisions and escalations",
        "Present complex findings and strategic recommendations to senior client leadership (VP, C-suite)",
        "Design and implement technology-driven solutions aligned with client business objectives",
        "Lead compliance reviews, risk assessments, maturity assessments, and transformation programs",
        "Drive business development: identify opportunities, develop proposals, support sales processes",
        "Develop reusable methodologies, frameworks, and intellectual property for the practice",
        "Manage engagement economics: scope, budget, timeline, and resource allocation"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "Advanced financial modeling (Excel)",
        "BI and analytics tools (Tableau, Power BI)",
        "ERP systems",
        "GRC and audit platforms",
        "CRM systems (Salesforce)",
        "Industry frameworks (NIST, ISO, COSO, SOX)",
        "Presentation and documentation tools",
        "AI-powered analysis tools"
      ],
      "keywords": [
        "senior consultant",
        "engagement lead",
        "trusted advisor",
        "digital transformation",
        "risk assessment",
        "client leadership",
        "business development"
      ],
      "market_notes": {
        "israel": "Senior Consultants in Israel typically have 5-8 years of experience. At Big 4 firms, this maps to Senior Associate or Manager level. Strong demand for senior consultants with technology transformation expertise, particularly in AI, cloud, and cybersecurity domains. Business development capability becomes essential at this level — firms expect senior consultants to contribute to pipeline. Exit into Israeli tech as Head of Ops, Chief of Staff, or VP-level roles is common. KPMG, Deloitte, and EY Israel all have active digital transformation practices at this level."
      }
    },
    {
      "id": "consulting_manager",
      "standardized_title": "Manager / Engagement Manager",
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "Manages multiple concurrent client engagements, leads teams, and drives practice growth. Engagement Managers are accountable for delivery quality across their portfolio, manage client relationships at the executive level, and play a significant role in business development and sales. They bridge the gap between delivery execution and practice strategy.",
      "core_responsibilities": [
        "Manage portfolio of 3-5 concurrent client engagements across team members",
        "Own client relationships at the C-suite and executive leadership level",
        "Drive the full sales cycle: identify opportunities, scope engagements, negotiate contracts, close deals",
        "Develop and mentor teams of consultants and analysts",
        "Ensure delivery quality, profitability, and client satisfaction across engagements",
        "Lead complex, multi-workstream transformation programs",
        "Develop new service offerings, methodologies, and go-to-market strategies for the practice",
        "Prepare and deliver Quarterly Business Reviews and executive briefings",
        "Represent the firm at industry events, conferences, and thought leadership forums",
        "Manage engagement P&L: pricing, utilization, margins, and resource planning"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "CRM and pipeline management (Salesforce)",
        "Financial modeling and analysis tools",
        "BI platforms (Tableau, Power BI)",
        "Project portfolio management tools",
        "ERP and enterprise systems",
        "Industry frameworks and audit methodologies",
        "Proposal and RFP response tools",
        "AI and automation tools for consulting delivery"
      ],
      "keywords": [
        "engagement manager",
        "consulting manager",
        "practice lead",
        "business development",
        "portfolio management",
        "client executive",
        "P&L management"
      ],
      "market_notes": {
        "israel": "Manager / Engagement Manager level typically requires 7-10+ years of experience. At Big 4 firms in Israel, this is the Senior Manager level. Business development becomes a core competency — managers are expected to sell and deliver. Strong exit path into VP-level roles at Israeli tech companies, particularly into operations, strategy, and professional services leadership. The Israeli market's relatively small size means managers often manage both local and international client portfolios. Fluency in Hebrew and English is mandatory; additional languages are an advantage for EMEA-facing engagements."
      }
    },
    {
      "id": "principal_director_consulting",
      "standardized_title": "Principal / Director of Consulting",
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Practice leader responsible for building and growing a consulting practice or domain. Principals and Directors own P&L for their practice area, set strategic direction, develop go-to-market strategy, and manage the most complex and high-value client relationships. They are the firm's external face in their domain and drive thought leadership.",
      "core_responsibilities": [
        "Own practice-level P&L: revenue targets, margins, utilization, and growth",
        "Set strategic direction for the consulting practice or domain",
        "Develop and execute go-to-market strategy for new service offerings",
        "Manage the firm's most strategic and complex client relationships",
        "Lead business development for large, high-value engagements and enterprise accounts",
        "Build, recruit, and develop consulting teams across seniority levels",
        "Drive thought leadership: publish research, speak at conferences, build market presence",
        "Negotiate complex partnership agreements and alliance structures",
        "Advise client C-suite on strategic, operational, and transformation decisions",
        "Represent the firm in market positioning, analyst relations, and industry forums"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "tools": [
        "CRM and enterprise sales tools (Salesforce)",
        "Financial planning and analysis tools",
        "BI and executive dashboarding",
        "Proposal and contract management tools",
        "Industry analyst platforms (Gartner, Forrester)",
        "AI strategy and governance frameworks"
      ],
      "keywords": [
        "principal consultant",
        "director of consulting",
        "partner",
        "practice leader",
        "managing consultant",
        "thought leader",
        "P&L owner"
      ],
      "market_notes": {
        "israel": "Principal / Director level at Big 4 firms in Israel is Partner or Associate Partner. The Israeli consulting market is concentrated — a small number of firms dominate, so principals at this level typically have strong personal networks across Israel's tech and finance ecosystems. Growing demand for practice leaders with AI, cybersecurity, and digital transformation expertise. Some firms (KPMG, Deloitte) are actively building AI consulting practices in Israel, creating new Director-level opportunities. International experience and global firm network access are significant differentiators."
      }
    },
    {
      "id": "solutions_engineer_junior",
      "standardized_title": "Junior Solutions Engineer",
      "role_family": "Solutions_Engineering",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Entry-level technical customer-facing role that supports the sales cycle and post-sale implementation by providing hands-on technical guidance, troubleshooting, and solution validation. Acts as the first line of technical engagement with customers, handling integrations, product configurations, and technical support escalations.",
      "required_skills": [
        "technical_troubleshooting",
        "api_integrations",
        "customer_communication",
        "sql",
        "databases"
      ],
      "preferred_skills": [
        "scripting_automation",
        "product_demonstration",
        "technical_discovery",
        "consultative_selling"
      ],
      "market_notes": {
        "israel": "Backgrounds: bootcamp graduates with strong communication skills, IDF veterans from technical units with customer-facing aptitude, or transitioning Support Engineers. Stack patterns: Salesforce, Postman, SQL clients, demo environments (Docker / cloud sandboxes), basic scripting. Hiring stage: relatively new in Israeli tech — most SaaS and cyber companies historically hired SEs at mid level with 3+ years. Recent investment in junior SE pipelines at scale-ups serving global accounts (monday.com, JFrog, Gong, Wiz, Orca Security). Concentrated in cyber (Wiz, CyberArk, Check Point, SentinelOne), SaaS (monday.com, JFrog, HiBob, Gong), and FinTech (Forter, Payoneer)."
      },
      "alternate_titles": [
        "Junior Solutions Engineer",
        "Junior Pre-Sales Engineer",
        "Associate SE"
      ],
      "core_responsibilities": [
        "Support senior SEs on technical discovery calls and demos — handle simpler customer questions and learn the product deeply",
        "Build and maintain demo environments and proof-of-concept setups for prospects",
        "Document technical Q&A, integration patterns, and competitive intel for the SE team's shared knowledge base",
        "Run technical onboarding sessions for new customers in partnership with Customer Success",
        "Triage technical questions from prospects and existing customers; escalate to engineering when needed",
        "Shadow account executive calls to learn the commercial side of pre-sales"
      ],
      "tools": [
        "Salesforce",
        "Slack",
        "Postman",
        "SQL clients",
        "Jira",
        "Demo environments (Docker / cloud sandboxes)"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Growth",
        "Scale"
      ],
      "typical_backgrounds": [
        "bootcamp_grad",
        "support_engineer_pivot",
        "cs_pivot",
        "swe_to_customer_facing"
      ],
      "years_experience_typical": "0-2",
      "next_roles": [
        "solutions_engineer"
      ],
      "similar_roles": [
        "customer_support_specialist",
        "technical_account_manager_junior"
      ],
      "not_to_confuse_with": [
        "Solutions Engineer",
        "Sales Development Representative"
      ],
      "keywords": [
        "pre-sales",
        "junior SE",
        "demos",
        "POC support",
        "technical Q&A"
      ],
      "_research_method": "web_search"
    },
    {
      "id": "solutions_engineer",
      "standardized_title": "Solutions Engineer",
      "role_family": "Solutions_Engineering",
      "secondary_family": "Sales",
      "seniority": "Mid",
      "core_purpose": "Core individual contributor who owns the technical relationship with customers throughout the sales cycle and beyond. Combines deep product knowledge with consultative selling skills to translate customer business problems into technical solutions, run POCs, lead technical discovery, and drive technical wins. Often the bridge between Sales, Product, and R&D.",
      "required_skills": [
        "technical_discovery",
        "solution_design_architecture",
        "product_demonstration",
        "api_integrations",
        "customer_relationship_management",
        "consultative_selling"
      ],
      "preferred_skills": [
        "competitive_positioning",
        "pre_sales_support",
        "sql",
        "executive_presentation"
      ],
      "market_notes": {
        "israel": "Backgrounds: ex-SWEs who like customer interaction, former support engineers who built strong technical depth, Customer Success professionals who developed technical specialty; 3-6 years typical. Stack patterns: Salesforce, demo environments, Postman, Notion, Loom; strong English communication for US executive conversations. Most SEs work US hours given that Israeli SaaS / cyber sells primarily into North American markets — Tel Aviv / Herzliya teams cover EMEA, US-based teams cover NA. Hiring stage: most B2B SaaS and cyber companies have a 2-5x ratio of AEs to SEs. Heavy concentration in cyber (Wiz, Check Point, CyberArk, SentinelOne, Cato Networks, Armis), SaaS (monday.com, JFrog, Gong, HiBob, Cloudinary), data infrastructure (Coralogix, Logz.io), and FinTech (Forter, Payoneer, Riskified)."
      },
      "alternate_titles": [
        "Solutions Engineer",
        "Pre-Sales Engineer",
        "Sales Engineer",
        "SE"
      ],
      "core_responsibilities": [
        "Own technical discovery and solution design for prospects — understand their stack, requirements, and constraints",
        "Run product demos tailored to each prospect's use case; build custom POCs when needed",
        "Partner with Account Executives throughout the sales cycle — joint discovery calls, pricing conversations, deal strategy",
        "Lead technical evaluation and proof-of-concept phases — define success criteria, run integrations, close technical gaps",
        "Handle technical objections — competitive positioning, security questions, integration concerns",
        "Hand off won deals to Customer Success / Implementation; remain on technical escalation for the first 30-90 days"
      ],
      "tools": [
        "Salesforce",
        "Slack",
        "Demo environments",
        "Postman",
        "Notion",
        "Loom",
        "Jira"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "swe_pivot_to_customer_facing",
        "ce_promotion",
        "external_se_hire"
      ],
      "years_experience_typical": "3-6",
      "next_roles": [
        "senior_solutions_engineer",
        "solutions_engineering_manager"
      ],
      "similar_roles": [
        "solutions_consultant",
        "technical_account_manager",
        "pre_sales_engineer"
      ],
      "not_to_confuse_with": [
        "Solutions Consultant",
        "Customer Success Manager",
        "Account Executive"
      ],
      "keywords": [
        "pre-sales",
        "technical discovery",
        "POC",
        "demos",
        "sales engineer",
        "deal support"
      ],
      "_research_method": "web_search"
    },
    {
      "id": "senior_solutions_engineer",
      "standardized_title": "Senior Solutions Engineer",
      "role_family": "Solutions_Engineering",
      "secondary_family": "Sales",
      "seniority": "Senior",
      "core_purpose": "Seasoned technical sales professional who handles the most complex, strategic, and high-value customer engagements. Combines deep domain expertise with advanced solution architecture skills to design enterprise-grade solutions, influence product roadmaps, and serve as a trusted advisor to senior technical and executive stakeholders. Often specializes in a technical domain (data/AI, security, networking, cloud infrastructure).",
      "required_skills": [
        "solution_design_architecture",
        "executive_presentation",
        "competitive_positioning",
        "enterprise_sales",
        "technical_discovery"
      ],
      "preferred_skills": [
        "mentoring",
        "consultative_selling",
        "partner_enablement",
        "stakeholder_management"
      ],
      "market_notes": {
        "israel": "Backgrounds: promoted from SE with strong customer-facing track record; external senior hires common at unicorns; many do multi-company stints across cyber and SaaS verticals. Stack patterns: Salesforce, Highspot, demo environments tailored for executive POCs; competitive battlecards; strong English plus presentation chops for US CTO / CISO / VPE conversations. Hiring stage: clusters at larger Israeli SaaS and cyber companies — Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, AppsFlyer, Gong. Many eventually fork to Solutions Engineering Management or Solutions Architecture (post-sale) rather than continuing as pure pre-sales ICs at the principal level."
      },
      "alternate_titles": [
        "Senior SE",
        "Senior Pre-Sales Engineer",
        "Staff Solutions Engineer",
        "Lead Solutions Engineer"
      ],
      "core_responsibilities": [
        "Own technical strategy for the largest, most strategic deals — enterprise customers, complex integrations, multi-product opportunities",
        "Lead executive-level technical discussions — CTO / CISO / VPE conversations as part of the sales process",
        "Drive competitive positioning and technical battlecards for the SE team and broader sales org",
        "Mentor mid and junior SEs — pair on calls, review POC plans, run internal product training",
        "Partner with Product on customer feedback loops — surface field intel that informs roadmap prioritization",
        "Represent the company at industry events, partner conferences, and major customer summits as the senior technical voice"
      ],
      "tools": [
        "Salesforce",
        "Slack",
        "Demo environments",
        "Highspot",
        "Notion",
        "Loom"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "solutions_engineer_promotion",
        "external_senior_se_hire"
      ],
      "years_experience_typical": "6-10",
      "next_roles": [
        "solutions_engineering_manager",
        "principal_solutions_engineer"
      ],
      "similar_roles": [
        "solutions_engineer",
        "technical_account_manager_senior"
      ],
      "not_to_confuse_with": [
        "Solutions Engineering Manager",
        "Solutions Architect"
      ],
      "keywords": [
        "senior pre-sales",
        "enterprise SE",
        "CTO conversations",
        "complex POCs",
        "competitive battlecards"
      ],
      "_research_method": "web_search"
    },
    {
      "id": "solutions_engineering_manager",
      "standardized_title": "Solutions Engineering Manager",
      "role_family": "Solutions_Engineering",
      "secondary_family": "Sales",
      "seniority": "Lead_Manager",
      "core_purpose": "First-line manager who leads a team of Solutions Engineers, owning delivery quality, team development, and process excellence. Balances hands-on involvement in strategic customer engagements with people management, hiring, and methodology development. Builds repeatable processes, playbooks, and success metrics while ensuring the team delivers consistent technical wins.",
      "required_skills": [
        "people_management",
        "process_design",
        "hiring_talent_acquisition",
        "technical_discovery",
        "solution_design_architecture"
      ],
      "preferred_skills": [
        "okr_framework",
        "performance_management",
        "stakeholder_management",
        "executive_presentation"
      ],
      "market_notes": {
        "israel": "Backgrounds: promoted from senior SE; some external SE manager hires. Often oversees dual-region teams (EMEA-based in Tel Aviv plus US-based reports covering NA). Stack patterns: Salesforce + Lattice + Highspot + Notion for management workflow; people management + technical depth + sales acumen as the dual-skill bar. Hiring stage: scale-up and unicorn B2B companies with 8+ SEs — Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, AppsFlyer, Gong, Forter. Smaller B2B startups (under 20 SEs) typically have one Head of SE managing all SEs directly. Strong overlap with sales leadership — career often forks to sales management or VP-level dual GTM roles."
      },
      "alternate_titles": [
        "SE Manager",
        "Pre-Sales Manager",
        "Solutions Engineering Team Lead",
        "Manager, Solutions Engineering"
      ],
      "core_responsibilities": [
        "Manage a team of 4-8 Solutions Engineers — hiring, 1:1s, performance reviews, career development",
        "Own SE team coverage, capacity planning, and deal-level prioritization across the sales pipeline",
        "Build and own the SE playbook — discovery frameworks, demo standards, POC methodology, technical objection handling",
        "Partner with the Sales Manager / Director on overall regional or segment strategy — joint forecasting, deal reviews",
        "Coach SEs on technical depth AND sales acumen — the dual-skill development that distinguishes SE management from engineering management",
        "Run cross-functional alignment with Product, Engineering, Customer Success on field intel, product gaps, and customer escalations"
      ],
      "tools": [
        "Salesforce",
        "Slack",
        "Lattice",
        "Highspot",
        "Notion",
        "Looker"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "senior_se_promotion",
        "external_se_manager_hire"
      ],
      "years_experience_typical": "8-12",
      "next_roles": [
        "head_of_solutions_engineering"
      ],
      "similar_roles": [
        "sales_manager",
        "engineering_manager",
        "head_of_solutions_engineering"
      ],
      "not_to_confuse_with": [
        "Head of Solutions Engineering",
        "Sales Manager"
      ],
      "keywords": [
        "SE management",
        "pre-sales leadership",
        "team coverage",
        "deal prioritization",
        "playbook"
      ],
      "_research_method": "web_search"
    },
    {
      "id": "head_of_solutions_engineering",
      "standardized_title": "Head of Solutions Engineering",
      "role_family": "Solutions_Engineering",
      "secondary_family": "Sales",
      "seniority": "Director_Head",
      "core_purpose": "Senior leader who owns the entire Solutions Engineering function, setting strategy, building the team, and ensuring the SE organization drives revenue, customer success, and product influence at scale. Partners with VP Sales, CTO, and Product leadership to align technical selling with company strategy. Responsible for hiring plans, delivery methodology, commercial models, and cross-geo coordination.",
      "required_skills": [
        "organizational_design",
        "executive_presentation",
        "people_management",
        "process_design",
        "consultative_selling"
      ],
      "preferred_skills": [
        "strategic_thinking",
        "partner_enablement",
        "revenue_operations",
        "stakeholder_management"
      ],
      "market_notes": {
        "israel": "Backgrounds: senior SE manager promotion, external Head of SE hire, or VP Sales fork; 12-18 years typical. Stack patterns: Salesforce + Looker for org-wide visibility; executive customer engagement; GTM strategy work alongside CRO / VP Sales. Hiring stage: scale-ups with 15+ SEs and all unicorns — Wiz, Check Point, CyberArk, SentinelOne, monday.com, JFrog, AppsFlyer, Gong, Forter, Payoneer. Reports to CRO or VP Sales in most cases; sometimes to CEO at SE-heavy companies (cyber especially). Career exit paths frequently include CRO, VP Sales, or moving to a startup as co-founder or first-GTM-hire."
      },
      "alternate_titles": [
        "VP Solutions Engineering",
        "Director of Solutions Engineering",
        "Head of Pre-Sales"
      ],
      "core_responsibilities": [
        "Own the entire Solutions Engineering function — strategy, structure, hiring, performance — across regions and segments",
        "Set the SE org's go-to-market strategy — segment-specific approaches, partner / channel strategy, technical positioning",
        "Build the SE leadership bench — develop SE Managers, hire senior SEs, design the career ladder",
        "Partner with the CRO / VP Sales on overall GTM strategy — joint planning, deal pursuit, account-based motion design",
        "Represent SE to the executive team — surface field intel, advocate for product investments, own SE budget and headcount",
        "Drive cross-functional alignment with Product, Engineering, and Customer Success on field-driven priorities"
      ],
      "tools": [
        "Salesforce",
        "Slack",
        "Lattice",
        "Highspot",
        "Looker"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "Direct",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "typical_backgrounds": [
        "se_manager_promotion",
        "external_head_of_se_hire",
        "vp_sales_fork"
      ],
      "years_experience_typical": "12-18",
      "next_roles": [
        "cro",
        "vp_sales",
        "chief_customer_officer"
      ],
      "similar_roles": [
        "vp_sales",
        "engineering_group_manager",
        "head_of_customer_success"
      ],
      "not_to_confuse_with": [
        "VP Sales",
        "CRO",
        "VP Customer Success"
      ],
      "keywords": [
        "head of pre-sales",
        "SE leadership",
        "GTM strategy",
        "executive",
        "global SE"
      ],
      "_research_method": "web_search"
    },
    {
      "id": "it_support_specialist",
      "standardized_title": "IT Support Specialist / Helpdesk",
      "role_family": "IT_Security",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "First point of contact for internal technical support, handling hardware, software, and network troubleshooting. Manages employee device setup, user account provisioning, onboarding/offboarding processes, and day-to-day IT operations. Maintains documentation and contributes to process improvements.",
      "core_responsibilities": [
        "Provide first-line technical support to employees via tickets, email, chat, and in-person",
        "Troubleshoot hardware, software, network, and VPN issues across Windows and macOS",
        "Set up and configure employee devices, peripherals, and business applications",
        "Manage user accounts, permissions, and access in identity platforms and productivity suites",
        "Execute onboarding and offboarding processes including equipment setup and retrieval",
        "Maintain and support meeting room technology and AV equipment",
        "Track IT assets and manage hardware inventory",
        "Document issues, solutions, and IT procedures to build internal knowledge bases",
        "Support ticketing system operations and ensure timely resolution of requests",
        "Follow and help enforce IT security policies and best practices"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Very high demand across Israeli tech. Most startups (50-300 employees) have 1-2 helpdesk roles. Military IT experience (signal corps, tech units) is commonly accepted in lieu of civilian experience. Hebrew and English fluency typically required. Many listings are hybrid or on-site 2-3 days. Companies like K Health, At-Bay, Paragon, VAST Data, and WINN.AI all actively hiring. Entry point is often 0-2 years experience, making it accessible for recent graduates and post-military candidates."
      }
    },
    {
      "id": "it_administrator_sysadmin",
      "standardized_title": "IT Administrator / SysAdmin",
      "role_family": "IT_Security",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Manages and maintains the organization's IT infrastructure, including identity and access management, endpoint management, SaaS administration, cloud platforms, and security compliance. Owns IT policies, procedures, and documentation. Serves as the primary IT operations owner, often as the sole or lead IT professional in startups and scale-ups.",
      "core_responsibilities": [
        "Administer identity and access management platforms (Okta, Entra ID, SSO/SAML/MFA)",
        "Manage endpoint devices across Windows, macOS, and Linux using MDM solutions",
        "Oversee SaaS tool administration, licenses, renewals, and vendor relationships",
        "Develop and enforce IT policies, security protocols, and compliance procedures",
        "Manage cloud platform administration (Azure, AWS, Google Cloud basics)",
        "Build and maintain employee lifecycle management processes (onboarding/offboarding)",
        "Own device procurement, hardware inventory, and IT asset management",
        "Implement and enforce security standards (ISO 27001, SOC 2 readiness)",
        "Create and maintain IT documentation, runbooks, and training materials",
        "Package and distribute software across operating systems",
        "Manage networking fundamentals: VPN, firewalls, DNS, DHCP",
        "Automate IT processes using scripting (PowerShell, Bash, Python)"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Core role in Israeli startups and scale-ups. Companies like Candex, Vetric, Dream, and Papaya Global hire for this profile. Typically requires 3-5 years experience. Many Israeli companies expect the SysAdmin to also handle basic security compliance (ISO 27001, SOC 2) since dedicated GRC hires come later. Scripting skills (PowerShell, Bash) increasingly expected. Zero Trust concepts appearing in requirements. Hebrew and English fluency standard. Cloud platform familiarity (especially Azure and AWS) is becoming a baseline expectation rather than a nice-to-have."
      }
    },
    {
      "id": "it_manager",
      "standardized_title": "IT Manager",
      "role_family": "IT_Security",
      "secondary_family": null,
      "seniority": "Lead_Manager",
      "core_purpose": "Owns and leads all IT operations in a growing organization, including infrastructure planning, security governance, endpoint management, vendor management, and budget oversight. Combines hands-on technical execution with strategic planning to support business growth. Often responsible for both IT operations and foundational security posture in mid-size companies.",
      "core_responsibilities": [
        "Build, scale, and manage the company's IT infrastructure and operations",
        "Own and optimize all internal information systems and platforms",
        "Define IT processes, SLAs, and operational standards",
        "Lead the company's security posture including policies, tools, and procedures",
        "Design and maintain business continuity and disaster recovery strategies",
        "Manage identity, endpoint, and access management systems across the organization",
        "Improve operational efficiency through automation and system integrations",
        "Manage IT vendors, procurement, and budget planning",
        "Ensure compliance with security and regulatory frameworks (ISO 27001, SOC 2)",
        "Support a global workforce by improving employee technology experience",
        "Manage IT equipment stock, purchasing, and asset lifecycle",
        "Work with security teams to ensure secure implementation of all IT processes",
        "Handle annual IT budget and ensure cost effectiveness"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "High demand in Israeli startups at the 50-200 employee stage where IT complexity outgrows the SysAdmin model. Companies like Bluewhite, Cye, Beamup, and eyesAtop hire for this profile. Typically requires 5-6+ years experience with strong hands-on capabilities. In Israel, the IT Manager often owns security compliance too (ISO 27001 especially common in defense-adjacent companies). BSc in Computer Science or Engineering frequently required. Budget management and vendor negotiation skills increasingly valued. AI tool evaluation and rollout emerging as a new responsibility — Beamup explicitly makes this a core part of the role."
      }
    },
    {
      "id": "security_analyst_soc",
      "standardized_title": "Security Analyst / SOC Analyst",
      "role_family": "IT_Security",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Investigates and responds to cybersecurity threats, performing threat analysis, incident response, and security monitoring. Analyzes attack patterns, phishing campaigns, malware behavior, and network anomalies using data analysis, OSINT, and security tooling. Develops detections, writes research reports, and collaborates with engineering teams to translate findings into product protections.",
      "core_responsibilities": [
        "Investigate security incidents and perform deep-dive forensic analysis",
        "Monitor security alerts and triage events based on severity and impact",
        "Analyze phishing campaigns, malware, social engineering, and attack infrastructure",
        "Develop and maintain threat detection rules and monitoring systems",
        "Query and analyze large-scale security datasets to identify patterns and anomalies",
        "Reverse-engineer malicious scripts, payloads, and obfuscation techniques",
        "Write detailed incident reports, attack briefs, and research findings",
        "Collaborate with engineering and product teams to improve security controls",
        "Use OSINT tools and threat intelligence sources to track threat actors",
        "Build automation for detection, alerting, and triage workflows",
        "Support incident response activities including containment and remediation",
        "Stay current on emerging threats, attack methodologies, and CVEs"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Very strong demand in the Israeli cybersecurity ecosystem. Companies like Guardio, Fireblocks, Check Point, Fortinet, Zero Networks, and GeoEdge actively hire. Unit 8200 and intelligence unit alumni are highly sought after — several listings explicitly mention this as a significant advantage. SQL proficiency is increasingly treated as a must-have, not a nice-to-have. AI/LLM tools for security analysis emerging as an expectation. Many SOC roles in Israel blend traditional monitoring with threat research and data analysis, reflecting the startup culture of wearing multiple hats. Python scripting skills expected for automation."
      }
    },
    {
      "id": "grc_analyst",
      "standardized_title": "GRC Analyst",
      "role_family": "IT_Security",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Manages governance, risk, and compliance activities to ensure organizational alignment with security frameworks and regulatory requirements. Leads audit preparation, maintains compliance documentation, conducts risk assessments, manages vendor security evaluations, and drives security awareness programs. Bridges the gap between technical security controls and business requirements.",
      "core_responsibilities": [
        "Manage and maintain compliance with security frameworks (SOC 2, ISO 27001, NIST CSF)",
        "Lead audit cycles including evidence collection, control testing, and remediation tracking",
        "Conduct security risk assessments and control gap analyses across departments",
        "Manage vendor risk: conduct third-party security assessments and maintain vendor inventory",
        "Develop, review, and maintain security policies, standards, and procedures",
        "Respond to customer security questionnaires and vendor due diligence requests",
        "Drive security awareness training programs across the organization",
        "Monitor regulatory changes and emerging compliance requirements",
        "Support incident response planning and investigations",
        "Manage GRC platform and ensure continuous monitoring and evidence collection",
        "Map technical findings to governance, risk, and control frameworks",
        "Collaborate with engineering, legal, and business teams on security requirements",
        "Prepare compliance reports and dashboards for management review"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Growing rapidly in the Israeli market as startups mature and pursue enterprise customers who require SOC 2 and ISO 27001 certification. Companies like Payoneer, Upwind, Zafran, Port.io, Wix, and Cye actively hiring. Entry-level GRC roles (1-2 years) exist — Cye and Akita hire junior cybersecurity architects/GRC specialists. The role often combines compliance management with hands-on security engineering in Israeli companies. AI governance (EU AI Act, NIST AI RMF, ISO/IEC 42001) emerging as a new domain — Payoneer explicitly requires this. FedRAMP experience becoming valuable for companies targeting US federal customers. CISSP, CISM, CISA certifications valued but not always required."
      }
    },
    {
      "id": "head_of_it",
      "standardized_title": "Head of IT",
      "role_family": "IT_Security",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Leads the organization's entire IT function, owning strategy, operations, security posture, vendor management, and budget. Serves as the senior escalation point for IT issues and the primary internal partner for security governance. Defines the IT and internal security roadmap, builds automation-first processes, and ensures the IT environment scales with business growth. Often manages both IT staff and external vendors.",
      "core_responsibilities": [
        "Own the organization's IT and internal security end-to-end: strategy, operations, and execution",
        "Define and execute the IT and security roadmap aligned with business growth",
        "Build automation-first processes and self-healing systems to reduce friction",
        "Lead incident response and act as escalation point for complex IT/security events",
        "Manage IT team members, external vendors, contractors, and service providers",
        "Own vendor relationships, tooling decisions, and IT/security budget with ROI focus",
        "Ensure compliance with standards (SOC 2, ISO 27001, GDPR) and audit readiness",
        "Partner with engineering, HR, legal, and finance to embed security and operational excellence",
        "Oversee identity and access management, endpoint management, and SaaS governance",
        "Drive security awareness and adoption of security best practices across the organization",
        "Lead security audits and certifications as primary contact for auditors",
        "Manage customer security questionnaires and security discussions",
        "Evaluate and implement emerging technologies including AI tools and automation"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Common in Israeli companies at the 100-500 employee stage. Guardio and Bringg both hire for this profile. In many Israeli companies this is a 'one-person army' role — strategic ownership combined with hands-on execution. The role increasingly includes internal security ownership, not just IT operations. AI adoption and security governance emerging as new responsibilities. Companies expect this person to manage external IT service providers while remaining deeply hands-on. Strong communication skills and cross-functional partnership ability are critical. Experience with SOC 2 and ISO 27001 typically required."
      }
    },
    {
      "id": "ciso_head_of_security",
      "standardized_title": "CISO / Head of Security",
      "role_family": "IT_Security",
      "secondary_family": null,
      "seniority": "VP_Executive",
      "core_purpose": "Leads the organization's entire information security program, spanning product security, cloud infrastructure, internal IT systems, and customer-facing security initiatives. Develops security strategy, manages risk, drives compliance and certification programs, and builds a security-conscious culture. Partners with executive leadership to align security with business objectives and serves as the primary security representative for customers, auditors, and regulators.",
      "core_responsibilities": [
        "Build, lead, and evolve the organization's information security strategy and roadmap",
        "Develop and maintain security policies, controls, and governance frameworks",
        "Own incident response program from preparedness to hands-on leadership during events",
        "Ensure compliance with standards (SOC 2, ISO 27001, GDPR) and maintain audit readiness",
        "Drive AI security practices and govern safe adoption of AI tools across the organization",
        "Manage security operations: threat detection, monitoring, and response",
        "Oversee penetration testing, vulnerability management, and third-party risk assessments",
        "Partner with R&D to embed secure development practices (SDLC) without slowing delivery",
        "Serve as primary security representative for customers, partners, auditors, and regulators",
        "Communicate security posture, risks, and initiatives at the executive and board level",
        "Hire, manage, and mentor security engineers and IT professionals",
        "Manage security and IT budget, vendors, and tooling with strategic focus",
        "Oversee the IT environment including endpoints, SaaS, cloud infrastructure, and identity systems",
        "Design and implement security controls for cloud and production environments"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Increasingly critical role in the Israeli ecosystem as companies scale internationally and face enterprise customer security requirements. Guardio and Guardz both actively hiring CISOs. In Israeli startups, the CISO often owns IT as well as security — the role combines strategic leadership with hands-on execution. IPO preparation experience valued as more Israeli companies go public. AI security governance emerging as a new domain. The role typically requires 5-7+ years of security experience with proven leadership. CISSP, CISM certifications valued. Strong demand for candidates who can serve as the external face of security for customer trust and sales enablement."
      }
    },
    {
      "id": "executive_assistant",
      "standardized_title": "Executive Assistant",
      "role_family": "Admin_GA",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Provides high-level administrative and operational support to C-level executives, managing complex calendars, coordinating travel, preparing for board and leadership meetings, and driving cross-organizational follow-ups. Serves as a strategic partner who understands business priorities and translates them into efficient scheduling and logistics. Often acts as a communication bridge between executives and internal/external stakeholders.",
      "core_responsibilities": [
        "Manage complex executive calendars with deep understanding of organizational priorities",
        "Coordinate domestic and international travel arrangements including flights, accommodation, and logistics",
        "Prepare materials and ensure readiness for board meetings, management meetings, and client engagements",
        "Track execution and drive cross-organizational tasks on behalf of leadership",
        "Draft and edit executive communications, announcements, and updates",
        "Coordinate with global teams across time zones for scheduling and logistics",
        "Manage meeting preparation, pre-alignment, and follow-up actions",
        "Handle confidential information with exceptional discretion and judgment",
        "Support recruiting efforts by coordinating interview scheduling",
        "Provide logistical support including expense management and procurement requests",
        "Liaise with vendors, suppliers, partners, and clients on behalf of leadership",
        "Lead ad-hoc projects and initiatives as directed by the CEO or executive team"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Very common role in Israeli tech companies, often combined with Office Manager responsibilities in startups under 100 employees. Companies like Alison.ai, McKinsey/Iguazio, Keshet International, and Voyantis actively hiring. Military HQ/operations experience (e.g., IDF adjutancy, unit-level operations roles) is frequently cited as an advantage and widely accepted as relevant experience. The role is often a career accelerator — several listings explicitly frame it as a path to Chief of Staff or operations leadership. Hebrew and English fluency standard. AI tool proficiency (ChatGPT, Gemini, Claude) emerging as an expectation in recent listings."
      }
    },
    {
      "id": "office_manager",
      "standardized_title": "Office Manager",
      "role_family": "Admin_GA",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Oversees the daily operations of the office environment, ensuring a smooth, welcoming, and well-functioning workplace. Manages facilities, vendor relationships, supply procurement, employee experience initiatives, and front desk operations. Often serves as the cultural anchor of the office, driving employee engagement activities, company events, and onboarding logistics.",
      "core_responsibilities": [
        "Oversee daily office operations including facilities, maintenance, supplies, and cleaning",
        "Manage front desk operations: greet employees, visitors, candidates, and vendors",
        "Coordinate with vendors and service providers for catering, security, equipment, and maintenance",
        "Plan and execute employee experience initiatives: events, happy hours, team-building, celebrations",
        "Support employee onboarding logistics including workspace setup, equipment, and welcome kits",
        "Manage office expenses, invoices, and billing processes",
        "Maintain a welcoming, organized, and inspiring workspace that reflects company culture",
        "Handle office layout planning, seating arrangements, and logistics for office moves",
        "Manage office supply inventory and procurement",
        "Coordinate company-wide travel logistics for employees and visitors",
        "Support HR team with administrative tasks and employee welfare programs",
        "Manage office budget and negotiate with suppliers for cost efficiency"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Extremely high demand across Israeli tech — virtually every company with a physical office hires for this role. Companies like Rubrik, Nexxen, Voyantis, Airis Labs, and Alison.ai actively hiring. The Israeli market strongly values the 'people-person' and culture-building aspects of the role, not just logistics. Part-time (60%) positions common in smaller startups. Often combined with Executive Assistant duties in companies under 80 employees. Entry point is typically 1-2 years of experience, making it accessible post-military. In-office presence 5 days/week is standard. Hebrew and English fluency required."
      }
    },
    {
      "id": "operations_coordinator",
      "standardized_title": "Operations Coordinator",
      "role_family": "Admin_GA",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Provides operational and administrative support to ensure smooth business workflows. Manages front desk duties, coordinates logistics, handles vendor relationships, supports internal processes, and assists with data entry and reporting. Serves as a cross-functional support role that keeps day-to-day operations running efficiently.",
      "core_responsibilities": [
        "Manage front desk duties including welcoming guests and handling visitors",
        "Coordinate meetings, calendars, and company events",
        "Provide administrative support to employees and management",
        "Manage and execute contracts and price negotiations with office vendors",
        "Handle travel coordination and logistics",
        "Manage end-to-end order processing, data entry, and tracking in internal systems",
        "Collect, consolidate, and monitor information from multiple internal systems",
        "Produce operational and tracking reports to support decision-making",
        "Collaborate with internal teams including Sales, HR, Finance, and Operations",
        "Maintain high attention to detail in documentation and data accuracy",
        "Support HR processes including onboarding coordination",
        "Anticipate and resolve operational problems proactively"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Common entry-level role in Israeli companies, frequently found at larger organizations like JFrog, KPMG, and Bynet. IDF administrative and national service experience widely accepted as relevant background. The role often serves as a launching pad into office management, HR, or business operations. Typically requires 1+ years of experience. Hebrew fluency required, English reading and writing expected. Strong overlap with receptionist duties in smaller companies. ERP system familiarity (especially Priority, which is prevalent in Israel) is an advantage."
      }
    },
    {
      "id": "procurement_specialist",
      "standardized_title": "Procurement / Vendor Management Specialist",
      "role_family": "Admin_GA",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Manages end-to-end procurement processes including supplier sourcing, RFQ management, contract negotiation, purchase order processing, and vendor relationship management. Drives cost optimization, ensures compliance with procurement policies, and collaborates across Finance, Legal, IT, and operational teams to secure optimal commercial outcomes.",
      "core_responsibilities": [
        "Manage the full procurement lifecycle: requirements gathering, RFQs, quote analysis, and negotiations",
        "Lead contract negotiations with vendors to secure advantageous pricing and terms",
        "Identify, evaluate, and onboard new suppliers through market research and benchmarking",
        "Oversee vendor performance, SLA adherence, and relationship management",
        "Manage purchase order processes and maintain accurate procurement documentation",
        "Ensure compliance with procurement policies and internal controls",
        "Drive cost-reduction initiatives and identify savings opportunities",
        "Collaborate with Finance, Legal, IT, and operational stakeholders on procurement needs",
        "Manage vendor database, ensuring compliance and data accuracy",
        "Track and report on procurement metrics and KPIs",
        "Leverage procurement tools, automation, and AI-powered insights for efficiency",
        "Support contract renewal processes and manage vendor risk"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Growing demand in Israeli tech as companies scale and formalize purchasing. Silverfort, ThetaRay, Kaltura, Infinidat, KPMG, and XTEND all actively hiring. Typically requires 2-4 years of experience. The Israeli market distinguishes between indirect procurement (SaaS, services, facilities — common in tech companies) and direct/technical procurement (electronic components, mechanical parts — common in hardware/defense companies like XTEND). Zip/ZipHQ emerging as the dominant procurement platform in Israeli tech. Hebrew and English fluency required for global vendor management. SAP experience valued at larger organizations. AI tools for sourcing and vendor evaluation appearing in recent listings."
      }
    },
    {
      "id": "facilities_manager",
      "standardized_title": "Facilities Manager",
      "role_family": "Admin_GA",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Manages the physical infrastructure, maintenance, and operational systems of the organization's facilities. Responsible for building systems (electrical, HVAC, water, backup power), vendor management for maintenance services, safety and regulatory compliance, and ensuring the reliability and availability of critical infrastructure. Combines technical expertise with operational management.",
      "core_responsibilities": [
        "Manage all facility operations including maintenance, cleaning, catering, parking, and security",
        "Ensure reliability and availability of critical building systems: electrical, HVAC, water, UPS, generators",
        "Define, plan, and manage preventive and routine maintenance programs across all infrastructure",
        "Manage and supervise vendors and service providers for facilities services",
        "Ensure compliance with safety regulations, building codes, and organizational standards (ISO)",
        "Develop and execute facilities work plans including budget planning and cost control",
        "Lead facility-related projects: construction, renovations, office moves, and expansions",
        "Manage building security, access control, and emergency preparedness",
        "Coordinate with regulatory authorities and ensure compliance with local requirements",
        "Maintain 24/7 availability for emergency facility situations",
        "Manage maintenance teams and subcontractors",
        "Support employee experience through facilities-related well-being initiatives"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Distinct role in larger Israeli organizations (500+ employees) and building management companies. Cal, CBRE, and MAX actively hiring. Licensed electrician certification (חשמלאי מוסמך/ראשי) is often mandatory — this is a regulated requirement in Israel. Experience managing buildings of 13,000+ sqm is a common baseline. Data Center infrastructure management increasingly relevant as Israeli tech companies grow their physical footprint. 24/7 availability for emergencies is standard. Hebrew fluency required; English less critical than in other tech roles. The role sits at the intersection of technical infrastructure management and HR/employee experience in some organizations (e.g., Cal positions it within the HR leadership team)."
      }
    },
    {
      "id": "head_of_admin_ga",
      "standardized_title": "Head of Admin / G&A Operations Manager",
      "role_family": "Admin_GA",
      "secondary_family": null,
      "seniority": "Director_Head",
      "core_purpose": "Leads the organization's administrative, operational, and employee experience functions end-to-end. Owns office operations, vendor ecosystems, procurement, employee welfare programs, and cross-functional operational processes. Combines strategic leadership with hands-on execution, managing budgets, teams, and global operations. Often serves as the operational backbone that enables the company to scale.",
      "core_responsibilities": [
        "Lead end-to-end office management, facilities, and administrative operations",
        "Own and execute annual employee welfare and experience programs",
        "Manage office and G&A budgets, including procurement and cost optimization",
        "Lead and develop administrative and operations team members",
        "Provide high-level operational support to senior leadership and executive team",
        "Manage global vendor ecosystems including contracts, SLAs, and relationship management",
        "Oversee employee onboarding, offboarding, and lifecycle operational processes",
        "Drive operational improvements and build scalable processes for company growth",
        "Coordinate cross-functional initiatives spanning HR, Finance, Legal, and IT",
        "Plan and produce large-scale company events and conferences",
        "Manage company-wide travel programs and logistics",
        "Manage payroll interfaces, benefits administration, and compliance across jurisdictions",
        "Build operational infrastructure to support international expansion"
      ],
      "required_skills": [],
      "preferred_skills": [],
      "market_notes": {
        "israel": "Growing role as Israeli tech companies scale past 100 employees and need consolidated G&A leadership. XTEND, Mesh Security, and Airis Labs represent the archetype. In the Israeli market, this role frequently combines office management, employee experience, procurement, and operational HR under one leader — reflecting the startup ethos of consolidated ownership. Global operations experience (managing US payroll, EOR structures, multi-country employment) increasingly valued as Israeli companies expand internationally. Experience with Deel and Remote (EOR platforms) is a strong differentiator. Typically requires 4-5+ years of experience. The role often reports to the COO, CEO, or VP HR. Hebrew and English fluency required."
      }
    },
    {
      "id": "customer_success_specialist",
      "standardized_title": "Customer Success Specialist",
      "alternate_titles": [
        "CS Specialist",
        "Junior Customer Success Manager",
        "CS Associate"
      ],
      "role_family": "Relationship_Growth",
      "secondary_family": null,
      "seniority": "Entry_Mid",
      "core_purpose": "Manage a portfolio of customer accounts, drive adoption and satisfaction, handle renewals and basic expansion.",
      "core_responsibilities": [
        "Manage day-to-day relationships with assigned customer accounts",
        "Drive product adoption and monitor customer health",
        "Handle basic renewals and identify upsell opportunities",
        "Coordinate with support and product teams to resolve issues",
        "Deliver QBRs and success plans for customer accounts"
      ],
      "required_skills": [
        "customer_communication",
        "customer_relationship_management",
        "product_adoption",
        "onboarding_strategy",
        "customer_retention"
      ],
      "preferred_skills": [
        "crm_management",
        "data_analysis",
        "stakeholder_management"
      ],
      "tools": [
        "CRM",
        "Gainsight",
        "email"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Onboarding",
        "Adoption",
        "Renewal"
      ],
      "next_roles": [
        "customer_success_manager"
      ],
      "similar_roles": [
        "customer_success_manager",
        "customer_support_specialist",
        "customer_onboarding_specialist"
      ],
      "keywords": [
        "customer success",
        "retention",
        "adoption",
        "renewal",
        "QBR"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates from business / liberal arts programs, support engineer pivots, hospitality / retail-to-tech transitions; strong English (often near-native) is essential. Stack patterns: Gainsight / Vitally / Catalyst + Zendesk / Intercom + Salesforce + Notion + Gong / Chorus for call review. Hiring stage: common at B2B SaaS scale-ups serving SMB / mid-market segments — monday.com, Wix, HiBob, Gong, Lemonade, AppsFlyer. Often a stepping stone to customer_success_manager within 12-18 months."
      }
    },
    {
      "id": "financial_analyst",
      "standardized_title": "Financial Analyst",
      "alternate_titles": [
        "Junior Financial Analyst",
        "Corporate Finance Analyst",
        "Business Finance Analyst"
      ],
      "role_family": "Finance",
      "secondary_family": null,
      "seniority": "Entry_Mid",
      "core_purpose": "Build financial models, analyze business performance, support budgeting and forecasting.",
      "core_responsibilities": [
        "Build and maintain financial models",
        "Analyze business performance and identify drivers",
        "Support budgeting, forecasting, and variance analysis",
        "Prepare financial reports and dashboards",
        "Partner with business units on financial planning"
      ],
      "required_skills": [
        "financial_modeling",
        "excel_advanced_finance",
        "data_analysis",
        "budget_forecasting",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "bva_analysis",
        "bi_tools"
      ],
      "tools": [
        "Excel",
        "ERP",
        "BI platforms"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Analysis",
      "lifecycle_stage": [],
      "next_roles": [
        "fpa_analyst",
        "senior_fpa_analyst"
      ],
      "similar_roles": [],
      "keywords": [
        "financial analysis",
        "modeling",
        "FP&A",
        "budget",
        "forecast",
        "variance"
      ]
    },
    {
      "id": "operations_analyst",
      "standardized_title": "Operations Analyst",
      "alternate_titles": [
        "Junior Business Analyst",
        "Operations Analyst",
        "Business Operations Analyst"
      ],
      "role_family": "Operations",
      "secondary_family": "Data",
      "seniority": "Entry_Mid",
      "core_purpose": "Analyze operational data, identify process improvements, support cross-functional operations.",
      "core_responsibilities": [
        "Analyze operational metrics and surface insights",
        "Build reports and dashboards for ops leadership",
        "Identify and document process improvement opportunities",
        "Support cross-functional operational initiatives",
        "Maintain operational tooling and workflows"
      ],
      "required_skills": [
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "analytical_thinking",
        "attention_to_detail"
      ],
      "preferred_skills": [
        "sql",
        "dashboarding"
      ],
      "tools": [
        "Excel",
        "BI tools",
        "SQL"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "business_ops_analyst",
        "business_ops_manager"
      ],
      "similar_roles": [
        "business_analyst",
        "business_ops_analyst",
        "revops_analyst"
      ],
      "keywords": [
        "operations",
        "analytics",
        "process",
        "dashboards",
        "reporting"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: industrial engineering, economics, or analytics graduates; some are former management consultants pivoting to in-house operations. Stack patterns: SQL + Looker / Mode + Excel + Salesforce; light Python for ad-hoc data work. Hiring stage: common at scale-ups and unicorns — monday.com, Wix, JFrog, Lemonade, Payoneer, AppsFlyer, HiBob, Forter, eToro. Often the start of a Revenue Operations or Business Operations career path."
      }
    },
    {
      "id": "hr_coordinator",
      "standardized_title": "HR Coordinator",
      "alternate_titles": [
        "People Operations Coordinator",
        "HR Associate"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Coordinate HR processes, manage employee records, support recruiting and onboarding logistics.",
      "core_responsibilities": [
        "Coordinate employee onboarding and offboarding logistics",
        "Maintain employee records in HRIS systems",
        "Support recruiting pipeline with candidate coordination",
        "Handle HR administrative tasks and inquiries",
        "Assist with benefits administration and employee documentation"
      ],
      "required_skills": [
        "employee_lifecycle_management",
        "organization",
        "cross_functional_collaboration",
        "attention_to_detail"
      ],
      "preferred_skills": [
        "hris_management",
        "talent_acquisition_recruiting"
      ],
      "tools": [
        "HRIS",
        "ATS"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "hr_generalist",
        "talent_acquisition_specialist"
      ],
      "similar_roles": [],
      "keywords": [
        "HR coordinator",
        "people operations",
        "onboarding",
        "HRIS"
      ]
    },
    {
      "id": "talent_acquisition_specialist",
      "standardized_title": "Talent Acquisition Specialist",
      "alternate_titles": [
        "Recruiter",
        "Technical Recruiter",
        "Senior Recruiter"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Source candidates, manage recruiting pipeline, conduct screenings, coordinate interviews.",
      "core_responsibilities": [
        "Source passive and active candidates via multiple channels",
        "Manage end-to-end recruiting pipeline",
        "Conduct candidate screening and initial interviews",
        "Partner with hiring managers on role requirements",
        "Maintain candidate data in ATS and report on funnel metrics"
      ],
      "required_skills": [
        "talent_acquisition_recruiting",
        "stakeholder_management",
        "customer_communication",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "employer_branding",
        "hr_data_analytics"
      ],
      "tools": [
        "LinkedIn Recruiter",
        "ATS",
        "Boolean search"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "talent_acquisition_manager"
      ],
      "similar_roles": [],
      "keywords": [
        "recruiting",
        "talent acquisition",
        "sourcing",
        "ATS",
        "pipeline"
      ]
    },
    {
      "id": "marketing_assistant",
      "standardized_title": "Marketing Assistant",
      "alternate_titles": [
        "Marketing Associate",
        "Junior Marketing Assistant"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support marketing campaigns, manage social media calendars, assist with content creation.",
      "core_responsibilities": [
        "Support execution of marketing campaigns across channels",
        "Maintain social media content calendars and schedules",
        "Assist with content creation and editing",
        "Track campaign metrics and prepare reports",
        "Coordinate marketing events and logistics"
      ],
      "required_skills": [
        "social_media_management",
        "content_strategy",
        "copywriting",
        "organization"
      ],
      "preferred_skills": [
        "canva_design_tools",
        "marketing_analytics"
      ],
      "tools": [
        "Canva",
        "Hootsuite",
        "Excel"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "marketing_coordinator",
        "social_media_coordinator"
      ],
      "similar_roles": [
        "marketing_coordinator",
        "marketing_intern",
        "social_media_coordinator"
      ],
      "keywords": [
        "marketing",
        "social media",
        "content",
        "campaigns"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates from Reichman / IDC / TAU / Hebrew University; some pivot from related fields (PR, communications, journalism). Stack patterns: HubSpot / Marketo + Canva + Google Workspace + light Salesforce; some exposure to Hootsuite / Buffer for social. Hiring stage: common at scale-ups and mid-sized Israeli tech companies — monday.com, Wix, JFrog, Fiverr, Lemonade, AppsFlyer, Cellebrite. Less common at very early-stage startups (under ~30 employees) which usually hire mid-level marketing managers directly."
      }
    },
    {
      "id": "sales_representative",
      "standardized_title": "Sales Representative",
      "alternate_titles": [
        "Inside Sales Rep",
        "Sales Specialist",
        "Account Specialist"
      ],
      "role_family": "Sales",
      "secondary_family": null,
      "seniority": "Entry_Mid",
      "core_purpose": "Manage full sales cycle from prospecting to closing for SMB accounts.",
      "core_responsibilities": [
        "Prospect and qualify new leads",
        "Run discovery calls and product demos",
        "Manage sales pipeline and opportunities",
        "Close SMB deals and hit quota",
        "Maintain CRM data and reporting"
      ],
      "required_skills": [
        "outbound_prospecting",
        "consultative_selling",
        "customer_communication",
        "pipeline_management",
        "crm_management"
      ],
      "preferred_skills": [
        "objection_handling",
        "discovery_calls"
      ],
      "tools": [
        "Salesforce",
        "HubSpot",
        "Outreach"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "Quota",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "account_executive",
        "senior_account_executive"
      ],
      "similar_roles": [
        "account_executive",
        "sales_associate"
      ],
      "keywords": [
        "sales",
        "quota",
        "pipeline",
        "closing",
        "prospecting"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: promoted SDRs ready for transactional / SMB selling, sometimes external hires with 1-3 years prior commercial experience. Stack patterns: Salesforce + Gong / Chorus for conversation intelligence + Outreach for cadence + DealHub / PandaDoc for CPQ. Hiring stage: common at SMB-focused SaaS and cyber companies — DealHub, Workiz, Cloudinary, monday.com (SMB segment), HiBob (SMB), AppsFlyer. The role is a stepping stone to account_executive within 12-18 months."
      }
    },
    {
      "id": "brand_manager",
      "standardized_title": "Brand Manager",
      "alternate_titles": [
        "Senior Brand Manager",
        "Brand Marketing Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own brand strategy, positioning, and messaging. Manage brand campaigns and ensure consistency.",
      "core_responsibilities": [
        "Develop and own brand strategy and positioning",
        "Manage brand campaigns across channels",
        "Ensure brand consistency in all marketing materials",
        "Partner with product and creative teams on messaging",
        "Lead rebranding or brand refresh initiatives"
      ],
      "required_skills": [
        "content_strategy",
        "marketing_analytics",
        "cross_functional_collaboration",
        "project_management"
      ],
      "preferred_skills": [
        "product_positioning",
        "copywriting"
      ],
      "tools": [
        "Brand platforms",
        "Adobe CC"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Strategy",
      "lifecycle_stage": [],
      "next_roles": [
        "head_of_marketing"
      ],
      "similar_roles": [
        "marketing_manager",
        "social_media_manager",
        "content_marketing_manager"
      ],
      "keywords": [
        "brand",
        "positioning",
        "messaging",
        "brand strategy"
      ],
      "years_experience_typical": "4-8",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: agency-to-in-house pivots, marketing manager promotion, former CPG brand managers transitioning to tech. Stack patterns: Figma / Canva / Adobe Creative Suite for brand asset oversight, Brandfolder / Frontify for brand systems, Notion for brand guidelines. Hiring stage: most common at consumer-facing scale-ups (Lemonade, Wix, Fiverr, Lightricks, Plarium, Playtika, eToro, Moovit), and at B2B SaaS investing in brand differentiation (monday.com, HiBob, Gong). Less common at cyber where brand work concentrates at the VP / CMO level."
      }
    },
    {
      "id": "event_coordinator",
      "standardized_title": "Event Coordinator",
      "alternate_titles": [
        "Junior Event Manager",
        "Event Operations Coordinator"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Entry_Mid",
      "core_purpose": "Plan and execute corporate events, conferences, webinars. Manage vendors, budgets, logistics.",
      "core_responsibilities": [
        "Plan and execute company events, conferences, and webinars",
        "Manage vendor relationships and event budgets",
        "Coordinate event logistics including venue, catering, A/V",
        "Promote events through marketing channels",
        "Measure event ROI and attendee engagement"
      ],
      "required_skills": [
        "event_marketing",
        "organization",
        "project_management",
        "customer_communication"
      ],
      "preferred_skills": [
        "marketing_analytics",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Event platforms",
        "Eventbrite",
        "Zoom"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "event_manager",
        "marketing_coordinator"
      ],
      "similar_roles": [
        "event_manager",
        "marketing_coordinator"
      ],
      "keywords": [
        "events",
        "webinars",
        "conferences",
        "event marketing"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: junior marketing or hospitality / events backgrounds; some come from in-house Israeli tech events (RecruitFest, MarTech Tel Aviv, OurCrowd Summit). Stack patterns: Cvent / Bizzabo / Hopin (event platforms), Asana / Monday for project work, Salesforce for attendee tracking. Hiring stage: scale-ups and unicorns with significant event marketing investment — monday.com, JFrog, Wiz, Cellebrite, HiBob, Lemonade, AppsFlyer. Often involves heavy logistics work for international conferences (Black Hat, RSA for cyber; SaaStr, INBOUND for B2B SaaS)."
      }
    },
    {
      "id": "partnerships_associate",
      "standardized_title": "Partnerships Associate",
      "alternate_titles": [
        "Partnerships Coordinator",
        "Junior Partnerships Manager"
      ],
      "role_family": "BD_Partnerships",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support partnership development, manage partner communications, track partnership metrics.",
      "core_responsibilities": [
        "Support partner outreach and qualification",
        "Manage partner communications and follow-ups",
        "Track partnership pipeline and metrics",
        "Coordinate partner onboarding and enablement",
        "Maintain partner CRM data"
      ],
      "required_skills": [
        "relationship_building",
        "customer_communication",
        "organization",
        "pipeline_management"
      ],
      "preferred_skills": [
        "partner_relationship_management",
        "outbound_prospecting"
      ],
      "tools": [
        "CRM",
        "Salesforce"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "partnerships_manager",
        "channel_partner_manager"
      ],
      "similar_roles": [
        "bdr_bd_associate",
        "business_development_representative"
      ],
      "keywords": [
        "partnerships",
        "partner management",
        "BD"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates with strong relationship-building skills, sometimes BD background. Stack patterns: Salesforce + PartnerStack + LinkedIn Sales Navigator + light project management. Hiring stage: less common in Israeli tech given the smaller scale of partnership functions at most companies. Most common at cyber companies with substantial channel motion (Wiz, Check Point, CyberArk, SentinelOne) and at integration-heavy SaaS (JFrog, Cloudinary, Snyk)."
      }
    },
    {
      "id": "junior_business_analyst",
      "standardized_title": "Junior Business Analyst",
      "alternate_titles": [
        "Junior BA",
        "Business Analyst (Entry)",
        "Operations Analyst"
      ],
      "role_family": "RevOps_BizOps",
      "secondary_family": "Data",
      "seniority": "Entry",
      "core_purpose": "Support business analysis, gather requirements, assist with reporting and process documentation.",
      "core_responsibilities": [
        "Gather and document business requirements",
        "Support data analysis and reporting",
        "Assist with process documentation and mapping",
        "Build and maintain dashboards",
        "Partner with senior BAs on projects"
      ],
      "required_skills": [
        "data_analysis",
        "excel_advanced_finance",
        "requirements_gathering",
        "attention_to_detail"
      ],
      "preferred_skills": [
        "sql",
        "dashboarding"
      ],
      "tools": [
        "Excel",
        "SQL",
        "BI"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "business_analyst"
      ],
      "similar_roles": [
        "business_analyst",
        "operations_analyst",
        "revenue_analyst"
      ],
      "keywords": [
        "business analysis",
        "reporting",
        "requirements"
      ],
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: industrial engineering, economics, or analytics graduates from Reichman / IDC / TAU / Technion. Stack patterns: SQL + Excel + Looker / Mode + Salesforce + light Python. Hiring stage: common at scale-ups and unicorns with mature operations functions — monday.com, Wix, JFrog, Lemonade, AppsFlyer, HiBob, Forter, Tipalti. Often the start of a Revenue Operations or Business Operations career path."
      }
    },
    {
      "id": "marketing_intern",
      "standardized_title": "Marketing Intern",
      "alternate_titles": [
        "Marketing Intern",
        "Junior Marketing Intern",
        "Marketing Trainee"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support marketing team with campaign execution, content drafting, social media posting, research tasks.",
      "core_responsibilities": [
        "Draft content for social media and blog posts",
        "Support campaign execution across channels",
        "Conduct market and competitor research",
        "Assist with administrative marketing tasks"
      ],
      "required_skills": [
        "copywriting",
        "social_media_management",
        "organization"
      ],
      "preferred_skills": [],
      "tools": [
        "Canva",
        "Google Docs"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "marketing_assistant",
        "marketing_coordinator"
      ],
      "similar_roles": [
        "marketing_assistant",
        "marketing_coordinator"
      ],
      "keywords": [
        "marketing intern",
        "social media",
        "content"
      ],
      "years_experience_typical": "0-1",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: undergraduate students at Reichman / IDC / TAU / Hebrew University / Technion, often through practicum programs (Reichman BBA practicum, IDC Honor's Program). Stack patterns: HubSpot / Marketo basics, Canva, Google Workspace, light Salesforce exposure. Hiring stage: paid internships at scale-ups (monday.com, Wix, JFrog, Lemonade, AppsFlyer) and unpaid / academic-credit at smaller startups. Often 3-6 month engagements during academic semesters or full-time summer programs."
      }
    },
    {
      "id": "hr_assistant",
      "standardized_title": "HR Assistant",
      "alternate_titles": [
        "People Ops Assistant",
        "HR Admin"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Provide administrative support to HR team, manage employee files, schedule interviews, handle HR inquiries.",
      "core_responsibilities": [
        "Maintain employee records and HR documentation",
        "Schedule interviews and manage candidate logistics",
        "Handle first-line HR inquiries from employees",
        "Support benefits administration and onboarding"
      ],
      "required_skills": [
        "organization",
        "attention_to_detail",
        "customer_communication"
      ],
      "preferred_skills": [
        "hris_management"
      ],
      "tools": [
        "HRIS",
        "ATS",
        "Calendar tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "hr_coordinator",
        "hr_generalist"
      ],
      "similar_roles": [],
      "keywords": [
        "HR",
        "administration",
        "employee support"
      ]
    },
    {
      "id": "sales_associate",
      "standardized_title": "Sales Associate",
      "alternate_titles": [
        "Junior Sales Associate",
        "Sales Coordinator",
        "Inside Sales Associate"
      ],
      "role_family": "Sales",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support sales team, handle inbound inquiries, assist with demos, manage CRM data entry.",
      "core_responsibilities": [
        "Handle inbound sales inquiries",
        "Support sales reps with demos and follow-ups",
        "Maintain CRM data hygiene",
        "Qualify inbound leads"
      ],
      "required_skills": [
        "customer_communication",
        "crm_management",
        "organization"
      ],
      "preferred_skills": [
        "lead_qualification",
        "sales_tools_proficiency"
      ],
      "tools": [
        "Salesforce",
        "HubSpot"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "sales_representative",
        "sales_development_representative"
      ],
      "similar_roles": [
        "sales_development_representative",
        "business_development_representative"
      ],
      "keywords": [
        "sales",
        "inbound",
        "CRM",
        "lead qualification"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates, IDF veterans, often Hebrew-speaking domestic-market roles or international entry-level pre-SDR. Stack patterns: Salesforce or HubSpot dominant; lighter tooling than SDR. Hiring stage: less common at international SaaS / cyber companies (those typically hire SDR / BDR directly). More common at domestic-market Israeli companies (insurance, banking SaaS, B2B services) and at some scale-ups in administrative / coordination capacities."
      }
    },
    {
      "id": "social_media_coordinator",
      "standardized_title": "Social Media Coordinator",
      "alternate_titles": [
        "Junior Social Media Manager",
        "Social Coordinator"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Execute social media calendar, create and schedule posts, monitor engagement, report on metrics.",
      "core_responsibilities": [
        "Create and schedule posts across social platforms",
        "Monitor engagement and respond to comments",
        "Track performance metrics and build reports",
        "Support community management efforts",
        "Partner with content team on creative assets"
      ],
      "required_skills": [
        "social_media_management",
        "content_strategy",
        "copywriting",
        "organization"
      ],
      "preferred_skills": [
        "canva_design_tools",
        "community_management"
      ],
      "tools": [
        "Hootsuite",
        "Canva",
        "Social analytics"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "social_media_manager"
      ],
      "similar_roles": [
        "social_media_manager",
        "content_marketing_manager",
        "marketing_coordinator"
      ],
      "keywords": [
        "social media",
        "community",
        "posts",
        "engagement"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates with social media side-projects, journalism / communications backgrounds. Stack patterns: native LinkedIn / Twitter / X / Instagram fluency; Hootsuite / Buffer / Sprout Social for scheduling; Canva / Figma for asset creation; Google Analytics and platform-native analytics. Hiring stage: common at consumer-facing Israeli companies (Wix, Fiverr, Lemonade, Lightricks, Plarium, Playtika), and at B2B companies investing in social / community (monday.com, HiBob, Gong, AppsFlyer)."
      }
    },
    {
      "id": "recruitment_coordinator",
      "standardized_title": "Recruitment Coordinator",
      "alternate_titles": [
        "Recruiting Coordinator",
        "TA Coordinator"
      ],
      "role_family": "HR_People",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Coordinate interview scheduling, manage candidate communication, maintain ATS, support recruiters.",
      "core_responsibilities": [
        "Schedule candidate interviews across multiple calendars",
        "Manage candidate communication throughout recruiting process",
        "Maintain ATS data and pipeline hygiene",
        "Support recruiters with admin and logistics",
        "Report on recruiting funnel metrics"
      ],
      "required_skills": [
        "organization",
        "customer_communication",
        "attention_to_detail"
      ],
      "preferred_skills": [
        "talent_acquisition_recruiting",
        "cross_functional_collaboration"
      ],
      "tools": [
        "ATS",
        "Calendar tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "talent_acquisition_specialist",
        "talent_acquisition_manager"
      ],
      "similar_roles": [],
      "keywords": [
        "recruiting",
        "scheduling",
        "ATS",
        "candidate coordination"
      ]
    },
    {
      "id": "business_operations_associate",
      "standardized_title": "Business Operations Associate",
      "alternate_titles": [
        "BizOps Associate",
        "Business Operations Coordinator",
        "Junior Operations Associate"
      ],
      "role_family": "RevOps_BizOps",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support day-to-day business operations, maintain internal tools and processes, assist with reporting.",
      "core_responsibilities": [
        "Support operational workflows and tooling",
        "Maintain internal documentation and processes",
        "Assist with operational reporting and analytics",
        "Coordinate cross-team operational requests"
      ],
      "required_skills": [
        "organization",
        "attention_to_detail",
        "process_improvement",
        "data_analysis"
      ],
      "preferred_skills": [
        "excel_advanced_finance",
        "cross_functional_collaboration"
      ],
      "tools": [
        "Excel",
        "Notion",
        "Google Workspace"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "business_ops_analyst",
        "operations_analyst"
      ],
      "similar_roles": [
        "operations_associate",
        "junior_business_analyst",
        "revenue_analyst"
      ],
      "keywords": [
        "business operations",
        "process",
        "operations"
      ],
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates with strong analytical and operational aptitude, sometimes ex-consultants at junior levels. Stack patterns: SQL + Excel / Sheets + Salesforce + Notion + Looker / Mode + Asana / Monday for project work. Hiring stage: common at scale-ups and unicorns with chief-of-staff-style functions — monday.com, Wix, JFrog, AppsFlyer, HiBob, Lemonade, Forter, Tipalti, Wiz. Career path forks to business_ops_analyst, revenue_analyst, or chief_of_staff."
      }
    },
    {
      "id": "strategy_analyst",
      "standardized_title": "Strategy Analyst",
      "alternate_titles": [
        "Corporate Strategy Analyst",
        "Business Strategy Analyst"
      ],
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Entry_Mid",
      "core_purpose": "Conduct market research, build strategic analyses, support strategy development for leadership.",
      "core_responsibilities": [
        "Conduct market and competitive research",
        "Build strategic analyses and business cases",
        "Develop frameworks and recommendations",
        "Prepare executive presentations",
        "Partner with leadership on strategic initiatives"
      ],
      "required_skills": [
        "analytical_thinking",
        "data_analysis",
        "excel_advanced_finance",
        "presentation_skills",
        "strategic_thinking"
      ],
      "preferred_skills": [
        "consulting_methodology",
        "financial_modeling"
      ],
      "tools": [
        "Excel",
        "PowerPoint",
        "BI tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Strategy",
      "lifecycle_stage": [],
      "next_roles": [
        "management_consultant",
        "consulting_manager"
      ],
      "similar_roles": [],
      "keywords": [
        "strategy",
        "research",
        "analysis",
        "consulting"
      ]
    },
    {
      "id": "management_consultant",
      "standardized_title": "Management Consultant",
      "alternate_titles": [
        "Strategy Consultant",
        "Senior Consultant"
      ],
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Lead client engagements, conduct analyses, develop recommendations, present findings to stakeholders.",
      "core_responsibilities": [
        "Lead workstreams within client engagements",
        "Conduct rigorous analyses and build recommendations",
        "Develop and deliver executive presentations",
        "Manage client relationships and day-to-day project delivery",
        "Mentor junior consultants"
      ],
      "required_skills": [
        "consulting_methodology",
        "analytical_thinking",
        "presentation_skills",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "preferred_skills": [
        "data_analysis",
        "financial_modeling"
      ],
      "tools": [
        "Excel",
        "PowerPoint"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Strategy",
      "lifecycle_stage": [],
      "next_roles": [
        "consulting_manager",
        "principal_director_consulting"
      ],
      "similar_roles": [],
      "keywords": [
        "consulting",
        "strategy",
        "client",
        "engagement"
      ]
    },
    {
      "id": "junior_consultant",
      "standardized_title": "Junior Consultant",
      "alternate_titles": [
        "Consulting Analyst",
        "Associate Consultant"
      ],
      "role_family": "Consulting",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support consulting engagements, conduct research, build slide decks, gather and analyze data.",
      "core_responsibilities": [
        "Conduct research and gather data for engagements",
        "Build models, analyses, and slide decks",
        "Support engagement workstreams under senior consultants",
        "Prepare client materials and meeting inputs"
      ],
      "required_skills": [
        "analytical_thinking",
        "excel_advanced_finance",
        "presentation_skills",
        "attention_to_detail"
      ],
      "preferred_skills": [
        "consulting_methodology",
        "data_analysis"
      ],
      "tools": [
        "Excel",
        "PowerPoint"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "management_consultant",
        "strategy_analyst"
      ],
      "similar_roles": [],
      "keywords": [
        "junior consulting",
        "analyst",
        "consulting"
      ]
    },
    {
      "id": "operations_associate",
      "standardized_title": "Operations Associate",
      "alternate_titles": [
        "Junior Operations Associate",
        "Operations Coordinator"
      ],
      "role_family": "Operations",
      "secondary_family": null,
      "seniority": "Entry",
      "core_purpose": "Support operational workflows, maintain documentation, coordinate cross-team logistics.",
      "core_responsibilities": [
        "Support daily operational workflows",
        "Maintain process documentation",
        "Coordinate cross-team requests and logistics",
        "Assist with operational reporting"
      ],
      "required_skills": [
        "organization",
        "attention_to_detail",
        "cross_functional_collaboration"
      ],
      "preferred_skills": [
        "process_improvement",
        "data_analysis"
      ],
      "tools": [
        "Notion",
        "Excel"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "operations_analyst",
        "business_operations_associate"
      ],
      "similar_roles": [
        "operations_analyst",
        "business_operations_associate",
        "junior_business_analyst"
      ],
      "keywords": [
        "operations",
        "admin",
        "coordination"
      ],
      "years_experience_typical": "0-2",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: recent graduates from industrial engineering, business administration, or related programs at Reichman / IDC / TAU / Technion. Stack patterns: Excel / Google Sheets heavy + Salesforce + Notion + light SQL exposure + Looker / Mode dashboards. Hiring stage: common across scale-ups and unicorns with structured operations functions — monday.com, Wix, JFrog, Lemonade, Payoneer, AppsFlyer, Forter, HiBob. Often a generalist role at smaller orgs; specializes by function (Sales Ops, Revenue Ops, People Ops) at larger orgs."
      }
    },
    {
      "id": "event_manager",
      "standardized_title": "Event Manager",
      "alternate_titles": [
        "Senior Event Manager",
        "Field Marketing Manager",
        "Event Marketing Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own end-to-end event strategy and execution, manage event budgets, lead event teams, measure ROI.",
      "core_responsibilities": [
        "Own event strategy and execution across the portfolio",
        "Manage event budgets and vendor negotiations",
        "Lead event teams and coordinate cross-functional partners",
        "Measure and report event ROI",
        "Scale event playbooks and operational processes"
      ],
      "required_skills": [
        "event_marketing",
        "project_management",
        "cross_functional_collaboration",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "marketing_analytics",
        "stakeholder_management"
      ],
      "tools": [
        "Event platforms",
        "Project management tools"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Strategy",
      "lifecycle_stage": [],
      "next_roles": [
        "head_of_marketing"
      ],
      "similar_roles": [
        "demand_generation_manager",
        "brand_manager",
        "event_coordinator"
      ],
      "keywords": [
        "event",
        "events",
        "conference",
        "event manager"
      ],
      "years_experience_typical": "4-8",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: event coordinator promotion, field marketing pivot, or hospitality / events industry transition. Stack patterns: Cvent / Bizzabo + Salesforce attribution + Splash / Hopin for digital + Asana / Monday for project work. Hiring stage: scale-ups and unicorns with substantial event marketing budgets — monday.com, JFrog, Wiz, Check Point, CyberArk, SentinelOne, Cellebrite, HiBob, Lemonade. Heavy international travel for major industry conferences."
      }
    },
    {
      "id": "technical_support_specialist",
      "standardized_title": "Technical Support Specialist",
      "alternate_titles": [
        "Junior Technical Support Engineer",
        "Tier 2 Technical Support"
      ],
      "role_family": "Support",
      "secondary_family": null,
      "seniority": "Entry_Mid",
      "core_purpose": "Provide technical troubleshooting and support, resolve customer technical issues, document solutions.",
      "core_responsibilities": [
        "Troubleshoot technical customer issues",
        "Diagnose and resolve complex application problems",
        "Document known issues and solutions",
        "Escalate bugs and feature requests",
        "Partner with engineering on complex issues"
      ],
      "required_skills": [
        "technical_troubleshooting",
        "customer_communication",
        "problem_solving",
        "technical_communication"
      ],
      "preferred_skills": [
        "debugging",
        "api_integrations"
      ],
      "tools": [
        "Ticketing",
        "Logging",
        "CRM"
      ],
      "technical_depth": "Medium",
      "customer_facing_level": "High",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "technical_support_engineer"
      ],
      "similar_roles": [
        "technical_support_engineer",
        "customer_support_specialist",
        "solutions_engineer_junior"
      ],
      "keywords": [
        "technical support",
        "troubleshooting",
        "T2",
        "application support"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: support specialist promotion with technical aptitude, bootcamp grads with customer-facing skills, IDF veterans from technical units pivoting to commercial roles. Stack patterns: Zendesk + JIRA for escalation tracking + Postman + basic SQL + Linux fundamentals + product-specific debugging tools. Hiring stage: common at technical / API-heavy SaaS — JFrog, Cloudinary, Coralogix, Logz.io, AppsFlyer, monday.com (developer-facing surfaces), Gong. Often a stepping stone to technical_support_engineer or solutions_engineer_junior."
      }
    },
    {
      "id": "solutions_consultant",
      "standardized_title": "Solutions Consultant",
      "alternate_titles": [
        "Senior Solutions Consultant",
        "Implementation Consultant",
        "Technical Consultant"
      ],
      "role_family": "Solutions_Engineering",
      "secondary_family": "Sales",
      "seniority": "Mid",
      "core_purpose": "Understand client needs, design solution proposals, support pre-sales with technical demos and POCs.",
      "core_responsibilities": [
        "Run technical discovery with prospects",
        "Design solution architectures tailored to customer needs",
        "Build and deliver product demonstrations",
        "Support sales with POCs and RFP responses",
        "Partner with engineering and product on customer requirements"
      ],
      "required_skills": [
        "technical_discovery",
        "solution_design_architecture",
        "product_demonstration",
        "customer_technical_relationship",
        "communication"
      ],
      "preferred_skills": [
        "poc_management",
        "technical_sales_acumen"
      ],
      "tools": [
        "CRM",
        "Demo environments"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Scale",
        "Mature"
      ],
      "next_roles": [
        "senior_solutions_engineer",
        "solutions_engineering_manager"
      ],
      "similar_roles": [
        "solutions_engineer",
        "pre_sales_engineer",
        "senior_solutions_engineer"
      ],
      "keywords": [
        "consulting",
        "implementation",
        "POC",
        "solution design",
        "client engagement"
      ],
      "years_experience_typical": "3-7",
      "not_to_confuse_with": [
        "Solutions Engineer",
        "Consultant",
        "Customer Success Manager"
      ],
      "typical_backgrounds": [
        "consulting_pivot_to_se",
        "solutions_engineer_pivot",
        "implementation_specialist_promotion"
      ],
      "market_notes": {
        "israel": "Backgrounds: consulting pivots to SE; SE pivots to more implementation-focused work; implementation specialist promotions. Stack patterns: similar to Solutions Engineer tooling but with more implementation oversight — Salesforce, Jira, Notion, demo environments, customer-specific configuration work. Hiring stage: less common than Solutions Engineer in Israeli tech — typically at enterprise SaaS companies with longer, more consultative sales cycles. Common at Amdocs, NICE Systems, Cellebrite, SAP / Salesforce / Oracle Israel offices, and at Israeli enterprise SaaS scale-ups (Sapiens, Earnix, Personetics, Novidea, AU10TIX). Often blurs into technical_account_manager territory at some companies."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "pre_sales_engineer",
      "standardized_title": "Pre-Sales Engineer",
      "alternate_titles": [
        "Sales Engineer",
        "Solutions Engineer",
        "Technical Sales Engineer"
      ],
      "role_family": "Solutions_Engineering",
      "secondary_family": "Sales",
      "seniority": "Mid",
      "core_purpose": "Support sales with technical expertise, run product demos, build POCs, answer technical RFPs.",
      "core_responsibilities": [
        "Run deep technical discovery with prospects",
        "Design and demo complex technical solutions",
        "Build POCs and technical proof artifacts",
        "Respond to technical RFPs and security questionnaires",
        "Partner with AEs on technical deal strategy"
      ],
      "required_skills": [
        "technical_discovery",
        "product_demonstration",
        "poc_management",
        "technical_sales_acumen",
        "api_design"
      ],
      "preferred_skills": [
        "solution_design_architecture",
        "rfp_response"
      ],
      "tools": [
        "Demo environments",
        "API tools"
      ],
      "technical_depth": "High",
      "customer_facing_level": "High",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical",
      "lifecycle_stage": [
        "Growth",
        "Scale",
        "Mature"
      ],
      "next_roles": [
        "senior_solutions_engineer",
        "solutions_engineering_manager"
      ],
      "similar_roles": [
        "solutions_engineer",
        "solutions_consultant",
        "senior_solutions_engineer"
      ],
      "keywords": [
        "pre-sales",
        "technical sales",
        "discovery",
        "demos",
        "POC"
      ],
      "years_experience_typical": "3-6",
      "not_to_confuse_with": [
        "Solutions Engineer",
        "Customer Success Manager"
      ],
      "typical_backgrounds": [
        "solutions_engineer_pivot",
        "consulting_pivot",
        "swe_to_customer_facing"
      ],
      "market_notes": {
        "israel": "Backgrounds: Solutions Engineer pivots (essentially the same role at many companies); consulting pivots; SWEs to customer-facing. Stack patterns: same as Solutions Engineer — Salesforce, demo environments, Postman, Notion, Loom, strong English. Hiring stage: at many Israeli companies the title is used interchangeably with Solutions Engineer — distinguished primarily by territory (EMEA / APAC pre-sales vs US-based SEs) or by reporting structure. Concentration matches Solutions Engineer at cyber (Wiz, Check Point, CyberArk, SentinelOne), SaaS (monday.com, JFrog, Gong, HiBob), and enterprise software (Amdocs, NICE, Cellebrite)."
      },
      "_research_method": "knowledge"
    },
    {
      "id": "growth_analyst",
      "standardized_title": "Growth Analyst",
      "alternate_titles": [
        "Junior Growth Analyst",
        "Growth Marketing Analyst"
      ],
      "role_family": "Marketing",
      "secondary_family": "Data",
      "seniority": "Entry_Mid",
      "core_purpose": "Analyze growth metrics, run experiments, identify acquisition and retention opportunities, support growth strategy.",
      "core_responsibilities": [
        "Analyze funnel metrics and identify growth opportunities",
        "Design and run growth experiments",
        "Track acquisition, activation, and retention metrics",
        "Build growth dashboards and insights",
        "Partner with growth team on strategic initiatives"
      ],
      "required_skills": [
        "data_analysis",
        "analytical_thinking",
        "marketing_experimentation",
        "funnel_optimization",
        "marketing_analytics"
      ],
      "preferred_skills": [
        "sql",
        "dashboarding"
      ],
      "tools": [
        "Amplitude",
        "Mixpanel",
        "GA4"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "growth_marketing_manager",
        "data_analyst"
      ],
      "similar_roles": [
        "data_analyst",
        "product_analyst",
        "performance_marketing_manager"
      ],
      "keywords": [
        "growth",
        "analytics",
        "experiments",
        "funnel"
      ],
      "years_experience_typical": "1-3",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: industrial engineering, economics, or analytics graduates; some are former data analysts pivoting to growth-specific work. Stack patterns: SQL + Looker / Mode + Amplitude / Mixpanel + Excel / Sheets; Google Analytics + Facebook Ads / Google Ads + Appsflyer mobile attribution. Hiring stage: common at consumer-facing companies with rich behavioral data (Lightricks, Plarium, Playtika, Gett, Moovit), B2B SaaS investing in PLG (monday.com, Wix, Fiverr, HiBob), and FinTech (Lemonade, Payoneer, eToro). Often a stepping stone to product_analyst or performance_marketing_manager."
      }
    },
    {
      "id": "revenue_analyst",
      "standardized_title": "Revenue Analyst",
      "alternate_titles": [
        "Revenue Operations Analyst",
        "Junior RevOps Analyst",
        "GTM Analyst"
      ],
      "role_family": "RevOps_BizOps",
      "secondary_family": "Data",
      "seniority": "Entry_Mid",
      "core_purpose": "Analyze revenue data, track pipeline metrics, support revenue forecasting, build revenue reports.",
      "core_responsibilities": [
        "Analyze revenue and pipeline metrics",
        "Support revenue forecasting and modeling",
        "Build revenue dashboards and reports",
        "Partner with sales and finance teams",
        "Identify revenue operations improvements"
      ],
      "required_skills": [
        "data_analysis",
        "excel_advanced_finance",
        "analytical_thinking",
        "saas_finance_metrics",
        "revops_commercial_analytics"
      ],
      "preferred_skills": [
        "sql",
        "dashboarding"
      ],
      "tools": [
        "Salesforce",
        "Excel",
        "BI"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "business_ops_analyst",
        "sales_operations_manager"
      ],
      "similar_roles": [
        "revops_analyst",
        "operations_analyst",
        "business_analyst"
      ],
      "keywords": [
        "revenue",
        "RevOps",
        "pipeline analytics",
        "forecasting"
      ],
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: industrial engineering, economics, or finance graduates; some former management consultants. Stack patterns: SQL + Salesforce administration + Looker / Mode + Excel financial modeling + Clari / Boostup for forecasting + heavy commercial reporting. Hiring stage: common at B2B SaaS and cyber scale-ups with structured RevOps functions — monday.com, JFrog, Gong, HiBob, AppsFlyer, Wiz, Forter, Tipalti, Lemonade, Payoneer."
      }
    },
    {
      "id": "demand_generation_manager",
      "standardized_title": "Demand Generation Manager",
      "alternate_titles": [
        "Demand Gen Manager",
        "Pipeline Marketing Manager",
        "Senior Demand Generation Manager"
      ],
      "role_family": "Marketing",
      "secondary_family": null,
      "seniority": "Mid",
      "core_purpose": "Own demand generation strategy, manage lead gen campaigns, optimize marketing funnel, track MQL/SQL metrics.",
      "core_responsibilities": [
        "Own demand generation strategy and campaign execution",
        "Manage lead gen campaigns across channels",
        "Optimize top-of-funnel conversion",
        "Track and report on MQL/SQL funnel metrics",
        "Partner with sales on pipeline and conversion"
      ],
      "required_skills": [
        "demand_generation",
        "marketing_analytics",
        "performance_marketing",
        "cross_functional_collaboration",
        "analytical_thinking"
      ],
      "preferred_skills": [
        "marketing_automation",
        "b2b_marketing"
      ],
      "tools": [
        "Marketo",
        "HubSpot",
        "Salesforce"
      ],
      "technical_depth": "Low",
      "customer_facing_level": "Low",
      "revenue_ownership": "Influence",
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "head_of_marketing",
        "growth_marketing_manager"
      ],
      "similar_roles": [
        "growth_marketing_manager",
        "performance_marketing_manager",
        "marketing_manager"
      ],
      "keywords": [
        "demand gen",
        "lead generation",
        "MQL",
        "pipeline marketing"
      ],
      "years_experience_typical": "4-8",
      "_research_method": "knowledge",
      "market_notes": {
        "israel": "Backgrounds: B2B marketing managers, growth marketers, ABM specialists. Stack patterns: HubSpot / Marketo + Salesforce + 6sense / Demandbase for ABM + LinkedIn Ads + paid social/search + Outreach / Salesloft alignment with sales. Hiring stage: critical role at B2B SaaS and cyber scale-ups — monday.com, JFrog, Gong, HiBob, AppsFlyer, Wiz, Check Point, CyberArk, SentinelOne, Forter. Heavily focused on pipeline generation for enterprise / mid-market segments selling into US."
      }
    }
  ]
} as const;
