export const roleLibrary = {
  "library_name": "get_a_job_role_library",
  "version": "1.1",
  "last_updated": "2026-04-15",
  "description": "Standardized role taxonomy for role matching, job classification, and career path logic across post-sale, operations, and product roles.",
  "role_families": [
    "Support",
    "Onboarding_Implementation",
    "Relationship_Growth",
    "Customer_Experience",
    "Leadership",
    "Operations",
    "Product"
  ],
  "seniority_levels": [
    "Entry",
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
        "Customer Service Representative",
        "CSR",
        "Customer Service Associate",
        "Customer Care Representative"
      ],
      "role_family": "Support",
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
        "Customer Support Specialist",
        "Customer Experience Representative"
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
      ]
    },
    {
      "id": "customer_support_specialist",
      "standardized_title": "Customer Support Specialist",
      "alternate_titles": [
        "Client Service Representative",
        "B2B Support Specialist",
        "SaaS Support Specialist"
      ],
      "role_family": "Support",
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
        "Customer Support Representative",
        "Technical Support Specialist"
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
      ]
    },
    {
      "id": "technical_support_engineer",
      "standardized_title": "Technical Support Engineer",
      "alternate_titles": [
        "Support Engineer",
        "Technical Support Specialist",
        "Customer Support Engineer"
      ],
      "role_family": "Support",
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
        "Technical Support Specialist",
        "Support Engineer"
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
      ]
    },
    {
      "id": "senior_support_engineer",
      "standardized_title": "Senior Support Engineer",
      "alternate_titles": [
        "Tier 2 Support Engineer",
        "Tier 3 Support Engineer",
        "Senior Technical Support Engineer"
      ],
      "role_family": "Support",
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
        "Technical Support Engineer"
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
      ]
    },
    {
      "id": "customer_onboarding_specialist",
      "standardized_title": "Customer Onboarding Specialist",
      "alternate_titles": [
        "Onboarding Specialist",
        "Customer Onboarding Manager",
        "Onboarding Associate"
      ],
      "role_family": "Onboarding_Implementation",
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
        "Implementation Specialist",
        "Customer Success Associate"
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
      ]
    },
    {
      "id": "customer_success_associate",
      "standardized_title": "Customer Success Associate",
      "alternate_titles": [
        "Customer Success Specialist",
        "Junior Customer Success Manager",
        "Client Success Associate"
      ],
      "role_family": "Onboarding_Implementation",
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
        "Customer Onboarding Specialist",
        "Customer Success Manager"
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
      ]
    },
    {
      "id": "implementation_specialist",
      "standardized_title": "Implementation Specialist",
      "alternate_titles": [
        "Implementation Consultant",
        "Customer Delivery Specialist",
        "Deployment Specialist"
      ],
      "role_family": "Onboarding_Implementation",
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
        "Customer Onboarding Specialist",
        "Implementation Manager"
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
      ]
    },
    {
      "id": "implementation_manager",
      "standardized_title": "Implementation Manager",
      "alternate_titles": [
        "Customer Delivery Manager",
        "Client Implementation Manager",
        "Delivery Manager"
      ],
      "role_family": "Onboarding_Implementation",
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
        "Customer Delivery Manager",
        "Project Manager"
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
      ]
    },
    {
      "id": "project_manager_customer_delivery",
      "standardized_title": "Project Manager (Customer Delivery)",
      "alternate_titles": [
        "Customer Deployment Project Manager",
        "Implementation Project Manager",
        "Customer Delivery Project Manager"
      ],
      "role_family": "Onboarding_Implementation",
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
        "Implementation Manager"
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
      ]
    },
    {
      "id": "customer_success_manager",
      "standardized_title": "Customer Success Manager",
      "alternate_titles": [
        "CSM",
        "Client Success Manager",
        "Customer Success Specialist"
      ],
      "role_family": "Relationship_Growth",
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
        "Account Manager",
        "Technical Account Manager"
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
      ]
    },
    {
      "id": "senior_customer_success_manager",
      "standardized_title": "Senior Customer Success Manager",
      "alternate_titles": [
        "Enterprise Customer Success Manager",
        "Strategic Customer Success Manager"
      ],
      "role_family": "Relationship_Growth",
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
        "Account Manager",
        "Technical Account Manager"
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
      ]
    },
    {
      "id": "technical_account_manager",
      "standardized_title": "Technical Account Manager",
      "alternate_titles": [
        "TAM"
      ],
      "role_family": "Relationship_Growth",
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
        "Customer Success Manager",
        "Solutions Engineer"
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
      ]
    },
    {
      "id": "account_manager",
      "standardized_title": "Account Manager",
      "alternate_titles": [
        "Strategic Account Manager",
        "Client Account Manager"
      ],
      "role_family": "Relationship_Growth",
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
        "Customer Success Manager"
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
      ]
    },
    {
      "id": "customer_experience_specialist",
      "standardized_title": "Customer Experience Specialist",
      "alternate_titles": [
        "CX Specialist",
        "Customer Experience Representative"
      ],
      "role_family": "Customer_Experience",
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
        "Customer Support Representative"
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
      ]
    },
    {
      "id": "customer_experience_manager",
      "standardized_title": "Customer Experience Manager",
      "alternate_titles": [
        "CX Manager"
      ],
      "role_family": "Customer_Experience",
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
        "Customer Experience Specialist"
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
      ]
    },
    {
      "id": "sales_engineer",
      "standardized_title": "Sales Engineer",
      "alternate_titles": [
        "Solutions Engineer",
        "Pre-Sales Engineer"
      ],
      "role_family": "Relationship_Growth",
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
        "Solutions Architect"
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
      ]
    },
    {
      "id": "support_team_lead",
      "standardized_title": "Support Team Lead",
      "alternate_titles": [
        "Customer Support Manager",
        "Technical Support Manager"
      ],
      "role_family": "Leadership",
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
        "Head of Customer Success Operations",
        "CS Ops Director"
      ],
      "role_family": "Operations",
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
        "Revenue Operations"
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
      ]
    },
    {
      "id": "vp_customer_success",
      "standardized_title": "VP Customer Success",
      "alternate_titles": [
        "Vice President of Customer Success"
      ],
      "role_family": "Leadership",
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
        "Project Lead",
        "Project Delivery Manager",
        "Implementation Project Manager"
      ],
      "role_family": "Operations",
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
        "Technical Project Manager",
        "Program Manager"
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
      ]
    },
    {
      "id": "technical_project_manager",
      "standardized_title": "Technical Project Manager",
      "alternate_titles": [
        "TPM",
        "Technology Project Manager",
        "Technical Project Owner"
      ],
      "role_family": "Operations",
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
        "Project Manager",
        "Program Manager"
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
      ]
    },
    {
      "id": "program_manager",
      "standardized_title": "Program Manager",
      "alternate_titles": [
        "Senior Program Manager",
        "Lead Program Manager",
        "Program Lead",
        "Technical Program Manager"
      ],
      "role_family": "Operations",
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
        "Technical Project Manager",
        "Project Manager"
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
      ]
    },
    {
      "id": "product_manager",
      "standardized_title": "Product Manager",
      "alternate_titles": [
        "PM",
        "Digital Product Manager",
        "Product Lead"
      ],
      "role_family": "Product",
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
        "roadmapping_prioritization",
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
      "customer_facing_level": "Medium_High",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Discovery",
        "Planning",
        "Launch",
        "Iteration"
      ],
      "typical_backgrounds": [
        "business_analysis",
        "project_management",
        "product_operations",
        "engineering"
      ],
      "next_roles": [
        "technical_product_manager",
        "product_operations_manager"
      ],
      "similar_roles": [
        "Technical Product Manager",
        "Product Owner"
      ],
      "not_to_confuse_with": [
        "Project Manager",
        "Program Manager",
        "Product Analyst",
        "Product Operations Manager"
      ],
      "keywords": [
        "roadmap",
        "discovery",
        "product strategy",
        "prioritization",
        "user needs",
        "requirements",
        "product lifecycle"
      ]
    },
    {
      "id": "technical_product_manager",
      "standardized_title": "Technical Product Manager",
      "alternate_titles": [
        "AI Product Manager",
        "Platform Product Manager",
        "Technical PM"
      ],
      "role_family": "Product",
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
        "roadmapping_prioritization",
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
      "customer_facing_level": "Medium_High",
      "revenue_ownership": "Influence",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Discovery",
        "Planning",
        "Launch",
        "Iteration"
      ],
      "typical_backgrounds": [
        "engineering",
        "product_management",
        "technical_project_management"
      ],
      "next_roles": [
        "product_manager"
      ],
      "similar_roles": [
        "Product Manager",
        "Technical Project Manager"
      ],
      "not_to_confuse_with": [
        "Project Manager",
        "Program Manager",
        "Product Analyst"
      ],
      "keywords": [
        "technical product",
        "platform",
        "apis",
        "systems",
        "architecture",
        "ai product",
        "technical roadmap"
      ]
    },
    {
      "id": "product_analyst",
      "standardized_title": "Product Analyst",
      "alternate_titles": [
        "Product Data Analyst",
        "Product & BI Analyst",
        "Growth Product Analyst"
      ],
      "role_family": "Product",
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
        "sql_analysis",
        "product_metrics_analysis",
        "ab_testing_experimentation",
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
      "technical_depth": "Medium_High",
      "customer_facing_level": "Low",
      "revenue_ownership": "Influence",
      "strategic_level": "Tactical_Strategic",
      "lifecycle_stage": [
        "Discovery",
        "Optimization",
        "Iteration"
      ],
      "typical_backgrounds": [
        "data_analysis",
        "business_intelligence",
        "analytics"
      ],
      "next_roles": [
        "product_manager"
      ],
      "similar_roles": [
        "Business Intelligence Analyst",
        "Data Analyst"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Product Operations Manager",
        "Project Manager"
      ],
      "keywords": [
        "funnels",
        "retention",
        "ab testing",
        "dashboards",
        "product metrics",
        "cohorts",
        "user behavior"
      ]
    },
    {
      "id": "sales_development_representative",
      "standardized_title": "Sales Development Representative",
      "alternate_titles": [
        "SDR",
        "Sales Development Rep",
        "Inside Sales Representative",
        "Outbound Sales Representative"
      ],
      "role_family": "Sales",
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
        "Business Development Representative",
        "Inside Sales Representative"
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
      ]
    },
    {
      "id": "business_development_representative",
      "standardized_title": "Business Development Representative",
      "alternate_titles": [
        "BDR",
        "Business Development Rep",
        "Outbound BDR"
      ],
      "role_family": "Sales",
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
        "Sales Development Representative",
        "Inside Sales Representative"
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
      ]
    },
    {
      "id": "account_executive",
      "standardized_title": "Account Executive",
      "alternate_titles": [
        "AE",
        "Sales Executive",
        "Account Manager \u2014 New Business",
        "Inside Sales Executive"
      ],
      "role_family": "Sales",
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
        "Sales Executive",
        "Inside Sales Executive"
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
      ]
    },
    {
      "id": "senior_account_executive",
      "standardized_title": "Senior Account Executive",
      "alternate_titles": [
        "Senior AE",
        "Senior Sales Executive",
        "Mid-Market AE",
        "Commercial AE"
      ],
      "role_family": "Sales",
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
        "Commercial Account Executive",
        "Mid-Market Account Executive"
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
      ]
    },
    {
      "id": "enterprise_account_executive",
      "standardized_title": "Enterprise Account Executive",
      "alternate_titles": [
        "Enterprise AE",
        "Named Account Executive",
        "Strategic Account Executive",
        "Enterprise Sales Executive"
      ],
      "role_family": "Sales",
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
        "Strategic Account Executive",
        "Named Account Executive"
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
      ]
    },
    {
      "id": "sales_manager",
      "standardized_title": "Sales Manager",
      "alternate_titles": [
        "Sales Team Manager",
        "Inside Sales Manager",
        "Regional Sales Manager"
      ],
      "role_family": "Sales",
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
        "Inside Sales Manager",
        "Revenue Manager"
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
      ]
    },
    {
      "id": "sales_director",
      "standardized_title": "Sales Director",
      "alternate_titles": [
        "Director of Sales",
        "Head of Sales",
        "Commercial Director",
        "Director of Revenue"
      ],
      "role_family": "Sales",
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
        "Head of Sales",
        "Commercial Director"
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
      ]
    },
    {
      "id": "vp_sales",
      "standardized_title": "VP of Sales",
      "alternate_titles": [
        "Vice President of Sales",
        "VP Sales",
        "Head of Global Sales",
        "Chief Revenue Officer"
      ],
      "role_family": "Sales",
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
        "Chief Revenue Officer",
        "Head of Global Sales"
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
      ]
    },
    {
      "id": "sales_operations_manager",
      "standardized_title": "Sales Operations Manager",
      "alternate_titles": [
        "RevOps Manager",
        "Revenue Operations Manager",
        "Sales Ops Manager",
        "GTM Operations Manager"
      ],
      "role_family": "Operations",
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
        "Revenue Operations Manager",
        "GTM Operations Manager"
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
      ]
    },
    {
      "id": "channel_partner_manager",
      "standardized_title": "Channel Partner Manager",
      "alternate_titles": [
        "Partner Manager",
        "Partner Success Manager",
        "Alliance Manager",
        "Partnerships Manager"
      ],
      "role_family": "Sales",
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
        "Alliance Manager",
        "Partner Success Manager"
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
      ]
    },
    {
      "id": "marketing_coordinator",
      "standardized_title": "Marketing Coordinator",
      "alternate_titles": [
        "Marketing Assistant",
        "Marketing Associate",
        "Junior Marketing Manager",
        "Marketing Project Coordinator"
      ],
      "role_family": "Marketing",
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
        "Marketing Associate",
        "Marketing Assistant"
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
      ]
    },
    {
      "id": "marketing_manager",
      "standardized_title": "Marketing Manager",
      "alternate_titles": [
        "Brand Marketing Manager",
        "Campaign Manager",
        "Marketing Team Lead"
      ],
      "role_family": "Marketing",
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
        "Brand Manager",
        "Campaign Manager"
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
      ]
    },
    {
      "id": "growth_marketing_manager",
      "standardized_title": "Growth Marketing Manager",
      "alternate_titles": [
        "Demand Generation Manager",
        "Growth Manager",
        "Growth Lead",
        "Marketing Growth Manager"
      ],
      "role_family": "Marketing",
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
        "Demand Generation Manager",
        "Growth Lead"
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
      ]
    },
    {
      "id": "performance_marketing_manager",
      "standardized_title": "Performance Marketing Manager",
      "alternate_titles": [
        "Paid Media Manager",
        "User Acquisition Manager",
        "Media Buyer",
        "Paid Marketing Manager"
      ],
      "role_family": "Marketing",
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
        "Paid Media Manager",
        "User Acquisition Manager",
        "Media Buyer"
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
      ]
    },
    {
      "id": "lifecycle_marketing_manager",
      "standardized_title": "Lifecycle Marketing Manager",
      "alternate_titles": [
        "CRM Manager",
        "Retention Marketing Manager",
        "Email Marketing Manager",
        "Customer Lifecycle Manager"
      ],
      "role_family": "Marketing",
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
        "CRM Manager",
        "Retention Marketing Manager"
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
      ]
    },
    {
      "id": "product_marketing_manager",
      "standardized_title": "Product Marketing Manager",
      "alternate_titles": [
        "PMM",
        "Senior Product Marketing Manager",
        "Product Marketer"
      ],
      "role_family": "Marketing",
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
        "Product Marketer",
        "Senior PMM"
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
      ]
    },
    {
      "id": "content_marketing_manager",
      "standardized_title": "Content Marketing Manager",
      "alternate_titles": [
        "Content Manager",
        "Content Lead",
        "Senior Content Manager",
        "Brand Content Manager"
      ],
      "role_family": "Marketing",
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
        "Content Lead",
        "Senior Content Writer"
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
      ]
    },
    {
      "id": "seo_manager",
      "standardized_title": "SEO Manager",
      "alternate_titles": [
        "SEO Lead",
        "SEO Specialist",
        "Head of SEO",
        "Organic Growth Manager",
        "SEO Team Lead"
      ],
      "role_family": "Marketing",
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
        "SEO Lead",
        "Organic Growth Manager"
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
      ]
    },
    {
      "id": "social_media_manager",
      "standardized_title": "Social Media Manager",
      "alternate_titles": [
        "Social Media Lead",
        "Community Manager",
        "Social Content Manager",
        "Digital Content Manager"
      ],
      "role_family": "Marketing",
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
        "Community Manager",
        "Digital Content Manager"
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
      ]
    },
    {
      "id": "head_of_marketing",
      "standardized_title": "Head of Marketing",
      "alternate_titles": [
        "Marketing Lead",
        "Director of Marketing",
        "VP Marketing (startup context)",
        "Chief Marketing Officer (early stage)"
      ],
      "role_family": "Marketing",
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
        "Director of Marketing",
        "VP Marketing (startup)"
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
      ]
    },
    {
      "id": "vp_marketing",
      "standardized_title": "VP of Marketing",
      "alternate_titles": [
        "Vice President of Marketing",
        "VP Marketing",
        "Chief Marketing Officer"
      ],
      "role_family": "Marketing",
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
        "Chief Marketing Officer",
        "Global VP Marketing"
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
      ]
    },
    {
      "id": "associate_product_manager",
      "standardized_title": "Associate Product Manager",
      "alternate_titles": [
        "APM",
        "Product Management Intern",
        "Junior Product Manager",
        "Product Management Associate"
      ],
      "role_family": "Product",
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
      "customer_facing_level": "Low-Medium",
      "revenue_ownership": "None",
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Discovery",
        "Delivery"
      ],
      "typical_backgrounds": [
        "cs_graduate",
        "engineering",
        "business_analysis",
        "customer_success",
        "product_analyst"
      ],
      "next_roles": [
        "product_manager",
        "product_analyst"
      ],
      "similar_roles": [
        "Product Management Intern",
        "Junior Product Manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Business Analyst"
      ],
      "market_note": "APM roles are rare in the Tel Aviv high-tech market. Most companies expect at least 2 years of experience for PM entry. The most common path into product is via Customer Success, Business Analysis, or Product Analyst roles first.",
      "keywords": [
        "APM",
        "product intern",
        "user stories",
        "specs",
        "discovery",
        "engineering collaboration",
        "AI tools",
        "junior PM"
      ]
    },
    {
      "id": "senior_product_manager",
      "standardized_title": "Senior Product Manager",
      "alternate_titles": [
        "Senior PM",
        "Lead Product Manager (IC context)",
        "Staff Product Manager"
      ],
      "role_family": "Product",
      "seniority": "Senior",
      "core_purpose": "Own complex, high-impact product domains with full autonomy \u2014 defining strategy, driving execution, and influencing product direction across the organization.",
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
      "technical_depth": "Medium-High",
      "customer_facing_level": "Medium-High",
      "revenue_ownership": "Indirect",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Discovery",
        "Delivery",
        "Growth",
        "Strategy"
      ],
      "typical_backgrounds": [
        "product_manager",
        "technical_product_manager",
        "software_engineer"
      ],
      "next_roles": [
        "group_product_manager",
        "head_of_product",
        "technical_product_manager"
      ],
      "similar_roles": [
        "Staff Product Manager",
        "Principal Product Manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Group Product Manager"
      ],
      "keywords": [
        "strategy",
        "roadmap",
        "discovery",
        "enterprise",
        "stakeholder",
        "A/B testing",
        "launch",
        "business case",
        "senior PM",
        "cross-functional",
        "AI",
        "cybersecurity",
        "B2B SaaS"
      ]
    },
    {
      "id": "group_product_manager",
      "standardized_title": "Group Product Manager",
      "alternate_titles": [
        "GPM",
        "PM Team Lead",
        "Lead Product Manager (people manager context)",
        "Product Management Team Lead"
      ],
      "role_family": "Product",
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
        "Operate in ambiguity \u2014 shape opportunities where requirements are not predefined"
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
      "customer_facing_level": "Medium-High",
      "revenue_ownership": "Indirect",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Strategy",
        "Discovery",
        "Delivery",
        "Growth"
      ],
      "typical_backgrounds": [
        "senior_product_manager",
        "product_manager"
      ],
      "next_roles": [
        "head_of_product",
        "vp_product"
      ],
      "similar_roles": [
        "PM Team Lead",
        "Lead Product Manager"
      ],
      "not_to_confuse_with": [
        "Senior Product Manager",
        "Head of Product"
      ],
      "keywords": [
        "team lead",
        "GPM",
        "PM leadership",
        "product strategy",
        "mentoring",
        "portfolio",
        "roadmap",
        "ambiguity",
        "enterprise",
        "cross-functional"
      ]
    },
    {
      "id": "product_operations_manager",
      "standardized_title": "Product Operations Manager",
      "alternate_titles": [
        "Product Ops Manager",
        "Customer Excellence Manager",
        "Strategic PMO",
        "Business Operations \u2014 Product"
      ],
      "role_family": "Product",
      "seniority": "Mid",
      "core_purpose": "Enable product and go-to-market teams to operate at scale by designing processes, tracking performance, and bridging strategy with operational execution.",
      "core_responsibilities": [
        "Take end-to-end ownership of key operational and strategic initiatives within the product org",
        "Design and implement scalable processes and workflows for product and GTM teams",
        "Define and track KPIs for product initiatives and operational programs",
        "Build dashboards that provide visibility into product performance and customer outcomes",
        "Act as an internal consultant \u2014 conduct root-cause analysis and propose solutions",
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
      "technical_depth": "Low-Medium",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Operations",
        "Delivery"
      ],
      "typical_backgrounds": [
        "project_manager",
        "business_analyst",
        "strategy_operations",
        "customer_success",
        "consulting"
      ],
      "next_roles": [
        "senior_product_manager",
        "director_product_operations",
        "head_of_product"
      ],
      "similar_roles": [
        "Strategic PMO",
        "Business Operations Manager",
        "Customer Excellence Manager"
      ],
      "not_to_confuse_with": [
        "Product Manager",
        "Project Manager",
        "Business Operations Manager"
      ],
      "keywords": [
        "product ops",
        "operations",
        "process",
        "KPIs",
        "dashboards",
        "GTM",
        "cross-functional",
        "PMO",
        "strategic initiatives",
        "scalable workflows"
      ]
    },
    {
      "id": "head_of_product",
      "standardized_title": "Head of Product",
      "alternate_titles": [
        "VP Product",
        "Chief Product Officer",
        "Director of Product",
        "VP of Product Management"
      ],
      "role_family": "Product",
      "seniority": "Director_Head",
      "core_purpose": "Own the entire product function \u2014 defining product vision, building the PM team, and driving product strategy that creates market-leading outcomes.",
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
      "revenue_ownership": "Indirect",
      "strategic_level": "Executive",
      "lifecycle_stage": [
        "Strategy",
        "Discovery",
        "Delivery",
        "Growth"
      ],
      "typical_backgrounds": [
        "group_product_manager",
        "senior_product_manager",
        "vp_product"
      ],
      "next_roles": [
        "chief_product_officer",
        "ceo"
      ],
      "similar_roles": [
        "VP Product",
        "Chief Product Officer",
        "Director of Product"
      ],
      "not_to_confuse_with": [
        "Group Product Manager",
        "Senior Product Manager"
      ],
      "keywords": [
        "product vision",
        "product strategy",
        "team leadership",
        "roadmap",
        "executive",
        "head of product",
        "VP product",
        "CPO",
        "product org",
        "product-market fit"
      ]
    },
    {
      "id": "data_analyst",
      "standardized_title": "Data Analyst",
      "alternate_titles": [
        "Business Analyst",
        "BI Analyst",
        "Product Analyst (data-focused)",
        "Sales Data Analyst",
        "Marketing Data Analyst"
      ],
      "role_family": "Data",
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
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Insights",
        "Optimization"
      ],
      "typical_backgrounds": [
        "industrial_engineering",
        "statistics",
        "economics",
        "mathematics",
        "cs",
        "business"
      ],
      "next_roles": [
        "senior_data_analyst",
        "analytics_engineer",
        "product_analyst",
        "data_scientist"
      ],
      "similar_roles": [
        "Business Analyst",
        "BI Analyst",
        "Product Data Analyst"
      ],
      "not_to_confuse_with": [
        "Data Engineer",
        "Data Scientist",
        "Product Analyst"
      ],
      "keywords": [
        "SQL",
        "dashboards",
        "KPIs",
        "analysis",
        "Tableau",
        "Looker",
        "A/B testing",
        "data-driven",
        "insights",
        "Snowflake",
        "BigQuery",
        "Python",
        "storytelling",
        "AI tools"
      ]
    },
    {
      "id": "business_intelligence_analyst",
      "standardized_title": "Business Intelligence Analyst",
      "alternate_titles": [
        "BI Analyst",
        "BI Developer",
        "Data & BI Analyst",
        "Reporting Analyst"
      ],
      "role_family": "Data",
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
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Reporting",
        "Insights"
      ],
      "typical_backgrounds": [
        "industrial_engineering",
        "information_systems",
        "statistics",
        "economics",
        "business"
      ],
      "next_roles": [
        "senior_data_analyst",
        "analytics_engineer",
        "head_of_data"
      ],
      "similar_roles": [
        "Reporting Analyst",
        "BI Developer"
      ],
      "not_to_confuse_with": [
        "Data Analyst",
        "Analytics Engineer",
        "Data Engineer"
      ],
      "keywords": [
        "BI",
        "dashboards",
        "reporting",
        "Tableau",
        "Looker",
        "Power BI",
        "data models",
        "KPIs",
        "source of truth",
        "SQL",
        "business intelligence"
      ]
    },
    {
      "id": "analytics_engineer",
      "standardized_title": "Analytics Engineer",
      "alternate_titles": [
        "Analytics Engineering",
        "Data Analytics Engineer",
        "BI Engineer"
      ],
      "role_family": "Data",
      "seniority": "Mid",
      "core_purpose": "Build the data foundation that enables reliable analytics \u2014 designing clean, well-structured data models and pipelines that power dashboards, product decisions, and business intelligence.",
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
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Data Infrastructure",
        "Insights"
      ],
      "typical_backgrounds": [
        "data_analyst",
        "software_engineer",
        "business_intelligence",
        "industrial_engineering"
      ],
      "next_roles": [
        "senior_analytics_engineer",
        "data_engineer",
        "head_of_data"
      ],
      "similar_roles": [
        "BI Engineer",
        "Data Analytics Engineer"
      ],
      "not_to_confuse_with": [
        "Data Engineer",
        "Data Analyst",
        "Business Intelligence Analyst"
      ],
      "keywords": [
        "analytics engineering",
        "dbt",
        "data modeling",
        "source of truth",
        "SQL",
        "Snowflake",
        "BigQuery",
        "pipelines",
        "data transformation",
        "metrics"
      ]
    },
    {
      "id": "data_engineer",
      "standardized_title": "Data Engineer",
      "alternate_titles": [
        "AI Data Engineer",
        "Data Platform Engineer",
        "Data Infrastructure Engineer"
      ],
      "role_family": "Data",
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
      "strategic_level": "Execution",
      "lifecycle_stage": [
        "Data Infrastructure"
      ],
      "typical_backgrounds": [
        "software_engineer",
        "backend_engineer",
        "data_analyst",
        "computer_science"
      ],
      "next_roles": [
        "senior_data_engineer",
        "analytics_engineer",
        "head_of_data"
      ],
      "similar_roles": [
        "AI Data Engineer",
        "Data Platform Engineer"
      ],
      "not_to_confuse_with": [
        "Analytics Engineer",
        "Data Scientist",
        "Backend Engineer"
      ],
      "keywords": [
        "ETL",
        "ELT",
        "pipelines",
        "Snowflake",
        "dbt",
        "Airflow",
        "Spark",
        "Python",
        "SQL",
        "data platform",
        "data infrastructure",
        "cloud",
        "streaming",
        "Kafka"
      ]
    },
    {
      "id": "data_scientist",
      "standardized_title": "Data Scientist",
      "alternate_titles": [
        "ML Engineer",
        "Applied Data Scientist",
        "Machine Learning Scientist"
      ],
      "role_family": "Data",
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
      "revenue_ownership": "None",
      "strategic_level": "Execution-Strategic",
      "lifecycle_stage": [
        "Modeling",
        "Insights",
        "Optimization"
      ],
      "typical_backgrounds": [
        "computer_science",
        "mathematics",
        "statistics",
        "physics",
        "engineering"
      ],
      "next_roles": [
        "senior_data_scientist",
        "ml_lead",
        "head_of_data"
      ],
      "similar_roles": [
        "ML Engineer",
        "Applied Scientist",
        "Machine Learning Scientist"
      ],
      "not_to_confuse_with": [
        "Data Analyst",
        "Data Engineer",
        "Analytics Engineer"
      ],
      "keywords": [
        "machine learning",
        "ML",
        "models",
        "Python",
        "PyTorch",
        "scikit-learn",
        "production",
        "A/B testing",
        "feature engineering",
        "deep learning",
        "LLM",
        "GenAI",
        "MLOps"
      ]
    },
    {
      "id": "senior_data_analyst",
      "standardized_title": "Senior Data Analyst",
      "alternate_titles": [
        "Senior BI Analyst",
        "Lead Data Analyst",
        "Principal Data Analyst",
        "Analytics Lead"
      ],
      "role_family": "Data",
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
      "technical_depth": "Medium-High",
      "customer_facing_level": "Low",
      "revenue_ownership": "None",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Insights",
        "Optimization",
        "Strategy"
      ],
      "typical_backgrounds": [
        "data_analyst",
        "business_analyst",
        "industrial_engineering",
        "statistics"
      ],
      "next_roles": [
        "head_of_data",
        "analytics_engineer",
        "data_scientist"
      ],
      "similar_roles": [
        "Lead Data Analyst",
        "Principal Analyst",
        "Analytics Lead"
      ],
      "not_to_confuse_with": [
        "Data Analyst",
        "Head of Data",
        "Data Scientist"
      ],
      "keywords": [
        "senior analyst",
        "SQL",
        "Snowflake",
        "Python",
        "A/B testing",
        "KPIs",
        "deep dive",
        "ownership",
        "dashboards",
        "data strategy",
        "Tableau",
        "Looker",
        "GenAI tools"
      ]
    },
    {
      "id": "head_of_data",
      "standardized_title": "Head of Data & Analytics",
      "alternate_titles": [
        "Head of Analytics",
        "Director of Data",
        "VP Data",
        "Analytics Guild Master",
        "Head of BI",
        "Data Team Lead"
      ],
      "role_family": "Data",
      "seniority": "Director_Head",
      "core_purpose": "Own the entire data and analytics function \u2014 defining data strategy, building the team, setting standards, and turning data into a company-wide competitive advantage.",
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
      "technical_depth": "Medium-High",
      "customer_facing_level": "Low",
      "revenue_ownership": "Indirect",
      "strategic_level": "Strategic",
      "lifecycle_stage": [
        "Strategy",
        "Insights",
        "Data Infrastructure"
      ],
      "typical_backgrounds": [
        "senior_data_analyst",
        "data_scientist",
        "analytics_engineer",
        "head_of_data"
      ],
      "next_roles": [
        "vp_data",
        "chief_data_officer",
        "vp_product"
      ],
      "similar_roles": [
        "Director of Analytics",
        "VP Data",
        "Analytics Lead"
      ],
      "not_to_confuse_with": [
        "Senior Data Analyst",
        "Data Scientist",
        "VP Engineering"
      ],
      "keywords": [
        "data strategy",
        "analytics leadership",
        "team building",
        "KPIs",
        "SQL",
        "Snowflake",
        "Python",
        "data culture",
        "experimentation",
        "head of data",
        "director",
        "BI",
        "ML"
      ]
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
      "seniority": "Senior",
      "core_purpose": "Drive financial planning and analysis at a senior level \u2014 owning complex models, leading business partnerships, and providing strategic insights that shape company decisions.",
      "core_responsibilities": [
        "Lead annual budgeting and rolling forecast cycles end-to-end",
        "Own complex financial models for strategic initiatives and scenario planning",
        "Deliver deep-dive BvA analysis with actionable management narratives",
        "Act as primary financial partner to senior leadership across departments",
        "Track and analyze SaaS metrics \u2014 ARR, NDR, churn, bookings, burn rate",
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
      "seniority": "Mid",
      "core_purpose": "Own the accounting function \u2014 ensuring accurate financial reporting, compliance, and controls while managing the month-end close and audit processes.",
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
      "market_note": "CPA certification is mandatory in the Israeli high-tech market. Big 4 internship experience is required or strongly preferred by most companies. Priority ERP is the dominant system in Israeli companies; NetSuite is common in US-facing or international entities.",
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
      ]
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
      "seniority": "Senior",
      "core_purpose": "Lead the company's finance function \u2014 combining accounting oversight with financial planning to support executive decision-making and business growth.",
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
      "seniority": "Director_Head",
      "core_purpose": "Own the company's entire financial function \u2014 setting financial strategy, leading the team, supporting fundraising, and serving as a strategic partner to the CEO and board.",
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
      "seniority": "Entry_Mid",
      "core_purpose": "Support the full range of HR functions across the employee lifecycle \u2014 from recruitment and onboarding to employee relations and compliance \u2014 in a generalist capacity.",
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
      "seniority": "Mid",
      "core_purpose": "Own the operational backbone of the HR function \u2014 building scalable processes, managing HRIS systems, ensuring data integrity, and enabling the People team to operate efficiently at scale.",
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
      "seniority": "Senior",
      "core_purpose": "Serve as a strategic and operational partner to business leaders \u2014 translating people strategy into practice, coaching managers, and driving organizational effectiveness.",
      "core_responsibilities": [
        "Partner with managers and leaders to support team performance and effectiveness",
        "Coach managers on people decisions including performance, compensation, and development",
        "Lead talent management activities \u2014 development, succession, and retention",
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
      "seniority": "Senior",
      "core_purpose": "Lead the talent acquisition function \u2014 building and managing recruiting teams, defining hiring strategy, and ensuring the organization attracts top talent at scale.",
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
      "seniority": "Senior",
      "core_purpose": "Own the HR function for a company or business unit \u2014 combining operational execution with strategic partnership to build a strong people foundation for growth.",
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
      "seniority": "Director_Head",
      "core_purpose": "Own the entire people function \u2014 setting HR strategy, building the team, shaping culture, and serving as a strategic partner to the CEO and leadership on all people-related matters.",
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
      "role_id": "revops_analyst",
      "title": "Revenue Operations Analyst",
      "sector": "RevOps / Business Ops",
      "seniority_level": "entry",
      "years_experience_typical": "1-3",
      "description": "Supports the revenue operations function by maintaining CRM data hygiene, building dashboards, managing lead routing, and ensuring data accuracy across the sales funnel. Acts as the operational backbone for GTM teams by identifying bottlenecks and implementing automated workflows.",
      "responsibilities": [
        "Maintain CRM data integrity and lead-to-cash process accuracy",
        "Build and maintain dashboards tracking pipeline health, sales velocity, and North Star metrics",
        "Administer tech stack integrations between CRM and third-party tools (Gong, ZoomInfo, Clay)",
        "Identify funnel bottlenecks through data analysis and implement automated workflows",
        "Deliver weekly reports on pipeline health, churn trends, and conversion metrics",
        "Support lead routing and database hygiene as the single source of truth",
        "Drive team adoption of tools and processes through training sessions and documentation"
      ],
      "tools_commonly_used": [
        "Salesforce / HubSpot",
        "Excel / Google Sheets",
        "Tableau / Power BI / Looker",
        "Gong",
        "ZoomInfo / Clay",
        "SQL"
      ],
      "career_path": {
        "next_roles": [
          "revops_manager"
        ],
        "lateral_moves": [
          "sales_ops_manager",
          "data_analyst",
          "bi_analyst"
        ]
      },
      "market_notes_israel": "Growing demand in Israeli SaaS companies. Many entry-level RevOps roles are titled 'Sales Operations Analyst' or 'GTM Operations Analyst.' Salesforce and HubSpot admin skills are table stakes. SQL is increasingly expected even at junior levels.",
      "role_family": "RevOps_BizOps",
      "seniority": "Mid"
    },
    {
      "role_id": "revops_manager",
      "title": "Revenue Operations Manager",
      "sector": "RevOps / Business Ops",
      "seniority_level": "mid",
      "years_experience_typical": "3-6",
      "description": "Owns the operational backbone for business development and account management teams \u2014 pipelines, forecasting, handoffs, and coverage models. Bridges business needs and execution by leading cross-functional projects that enhance GTM processes or introduce scalable solutions. Drives prioritization frameworks and ensures teams operate against them.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "Salesforce / HubSpot",
        "CPQ tools",
        "Mixpanel / SensorTower",
        "Monday.com / Asana",
        "Tableau / Looker / Power BI",
        "Excel / Google Sheets",
        "SQL"
      ],
      "career_path": {
        "next_roles": [
          "head_of_revops"
        ],
        "lateral_moves": [
          "strategy_ops_manager",
          "business_ops_manager",
          "sales_manager"
        ]
      },
      "market_notes_israel": "High demand across Israeli B2B SaaS companies, especially in growth-stage startups. Role often combines Sales Ops and Marketing Ops under one umbrella. Salesforce expertise and AI-driven process implementation (AI agents, automation workflows) are increasingly listed as advantages. Companies like Cato Networks, Appcharge, and Base44 actively hire for this role in Israel.",
      "role_family": "RevOps_BizOps",
      "seniority": "Senior"
    },
    {
      "role_id": "head_of_revops",
      "title": "Head of Revenue Operations / Senior RevOps Manager",
      "sector": "RevOps / Business Ops",
      "seniority_level": "senior",
      "years_experience_typical": "6-10",
      "description": "Leads the entire revenue operations function, owning the processes, data infrastructure, and insights that enable commercial teams to scale efficiently. Partners with revenue leadership on quarterly planning, headcount modeling, KPIs, and board-level reporting. Ensures operational predictability across the full customer lifecycle.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "Salesforce (advanced administration)",
        "BI tools (Tableau, Looker, Power BI)",
        "CPQ / billing platforms",
        "Data warehouses (BigQuery, Snowflake)",
        "Excel / Google Sheets (advanced modeling)",
        "SQL",
        "Monday.com / Asana / Jira"
      ],
      "career_path": {
        "next_roles": [
          "vp_operations"
        ],
        "lateral_moves": [
          "vp_sales",
          "vp_finance"
        ]
      },
      "market_notes_israel": "Found in growth-stage and late-stage Israeli tech companies. Some companies use 'Director of RevOps' or 'VP RevOps' depending on company size. The role increasingly requires AI fluency and experience implementing AI-driven workflows. Strong commercial acumen and ability to partner with C-suite are differentiators.",
      "role_family": "RevOps_BizOps",
      "seniority": "Director_Head"
    },
    {
      "role_id": "business_analyst",
      "title": "Business Analyst",
      "sector": "RevOps / Business Ops",
      "seniority_level": "entry-mid",
      "years_experience_typical": "1-4",
      "description": "Transforms data into actionable insights by analyzing business performance, building dashboards, and collaborating with stakeholders to support data-driven decision-making. May specialize in Salesforce business analysis, financial modeling, or operational analytics depending on the company.",
      "responsibilities": [
        "Collect, process, and analyze data from various sources to drive business performance",
        "Design and build interactive dashboards and reports (Power BI, Tableau, Looker)",
        "Collaborate with business stakeholders to understand data needs and translate them into analytical solutions",
        "Identify trends, correlations, and insights to inform strategic decisions",
        "Maintain and optimize data models, reporting pipelines, and documentation",
        "Gather, analyze, and document business requirements for system implementations",
        "Support user acceptance testing and rollout of new tools or processes",
        "Translate business requirements into technical designs for CRM and internal systems"
      ],
      "tools_commonly_used": [
        "Excel / Google Sheets (advanced)",
        "Power BI / Tableau / Looker",
        "SQL",
        "Salesforce",
        "PowerPoint",
        "Python (advantage)",
        "ERP systems (Priority, SAP)"
      ],
      "career_path": {
        "next_roles": [
          "business_ops_manager",
          "strategy_ops_manager",
          "revops_manager"
        ],
        "lateral_moves": [
          "data_analyst",
          "bi_analyst",
          "product_analyst"
        ]
      },
      "market_notes_israel": "Very common across Israeli tech \u2014 from fintechs (Nayax, Plus500) to gaming (Papaya, Playtika) to ad-tech. Two flavors dominate: (1) Salesforce Business Analyst focused on CRM processes and (2) Business Data Analyst focused on dashboards and reporting. SQL and BI tools are increasingly must-haves rather than nice-to-haves. Many listings accept fresh graduates with 1-2 years experience.",
      "role_family": "RevOps_BizOps",
      "seniority": "Mid"
    },
    {
      "role_id": "business_ops_analyst",
      "title": "Business Operations Analyst",
      "sector": "RevOps / Business Ops",
      "seniority_level": "entry",
      "years_experience_typical": "1-3",
      "description": "Supports the business operations function by handling day-to-day operational tasks, streamlining processes, and collaborating across teams. Focuses on invoicing, contract management, revenue tracking, and building automation to improve operational efficiency.",
      "responsibilities": [
        "Handle day-to-day operational tasks including customer communications and invoicing",
        "Assist in streamlining operational processes for efficiency",
        "Review client contracts and assess terms and requirements",
        "Compute revenue models and track payments",
        "Collaborate with cross-functional teams to build automation",
        "Issue invoices via ERP and procurement systems",
        "Support data tracking and reporting for operational KPIs",
        "Identify and address process gaps and underperformance"
      ],
      "tools_commonly_used": [
        "Excel / Google Sheets (advanced)",
        "ERP systems",
        "CRM (Salesforce / HubSpot)",
        "PowerPoint",
        "Procurement platforms",
        "Monday.com / Asana"
      ],
      "career_path": {
        "next_roles": [
          "business_ops_manager"
        ],
        "lateral_moves": [
          "revops_analyst",
          "business_analyst",
          "fpa_analyst"
        ]
      },
      "market_notes_israel": "Common in scaling fintech and SaaS companies. Often the first operations hire in a growing startup. Requires strong Excel skills and attention to detail. Companies like Candex hire for this role with 2 years experience. A good entry point for business graduates who want to move into operations leadership.",
      "role_family": "RevOps_BizOps",
      "seniority": "Mid"
    },
    {
      "role_id": "business_ops_manager",
      "title": "Business Operations Manager",
      "sector": "RevOps / Business Ops",
      "seniority_level": "mid",
      "years_experience_typical": "3-6",
      "description": "Operates and scales the company's execution engine by driving cross-functional coordination, managing OKR frameworks, and ensuring company priorities translate into structured action and measurable outcomes. Owns the operational rhythm including business reviews, planning cycles, and performance tracking.",
      "responsibilities": [
        "Own the end-to-end OKR framework and planning cycles to align company goals with team execution",
        "Drive monthly and quarterly business reviews tracking key initiatives and outcomes",
        "Structure leadership forums and data-driven materials to support executive decision-making",
        "Oversee high-impact cross-functional initiatives by identifying dependencies and resolving bottlenecks",
        "Standardize processes and templates to improve execution speed and knowledge sharing",
        "Lead transition and implementation processes for new customers or operational changes",
        "Coordinate across departments to identify and implement process improvements",
        "Track operational KPIs and provide data-driven insights to leadership"
      ],
      "tools_commonly_used": [
        "Monday.com / Asana / Jira",
        "Excel / Google Sheets",
        "Salesforce / HubSpot",
        "PowerPoint / Google Slides",
        "Notion / Confluence",
        "Power BI / Tableau / Looker",
        "OKR platforms (Lattice, Ally.io)"
      ],
      "career_path": {
        "next_roles": [
          "strategy_ops_manager",
          "vp_operations",
          "chief_of_staff"
        ],
        "lateral_moves": [
          "revops_manager",
          "product_ops_manager"
        ]
      },
      "market_notes_israel": "Found across Israeli tech companies from early-stage to scale-ups. Role scope varies significantly by company size \u2014 in smaller startups it can be a jack-of-all-trades role, while in larger companies it focuses on specific operational domains. Experience with OKR frameworks and cross-functional program management is increasingly expected. Companies like Daisy hire at the junior end (1-2 years) while others expect 3+ years.",
      "role_family": "RevOps_BizOps",
      "seniority": "Senior"
    },
    {
      "role_id": "strategy_ops_manager",
      "title": "Strategy & Operations Manager",
      "sector": "RevOps / Business Ops",
      "seniority_level": "mid-senior",
      "years_experience_typical": "4-8",
      "description": "Combines strategic thinking with operational execution to identify, build, and scale business initiatives. Analyzes performance of existing revenue streams, develops growth strategies, and leads cross-functional projects that drive business impact. Often serves as a bridge between executive leadership and operational teams.",
      "responsibilities": [
        "Identify and evaluate growth opportunities, new product ideas, and strategic initiatives",
        "Build business cases, financial models, and operational roadmaps for leadership decisions",
        "Lead development and rollout of key initiatives from pilot to full implementation",
        "Analyze performance of existing revenue streams and identify optimization opportunities",
        "Drive cross-company strategic projects ensuring alignment and execution across markets",
        "Act as key interface between leadership and functional teams (Marketing, Finance, RevOps, Legal)",
        "Define KPIs, track performance, and provide data-driven insights to leadership",
        "Support M&A analysis including target identification, valuation modeling, and integration planning"
      ],
      "tools_commonly_used": [
        "Excel / Google Sheets (advanced financial modeling)",
        "PowerPoint / Google Slides",
        "SQL",
        "Tableau / Looker / Power BI",
        "Salesforce",
        "Notion / Confluence",
        "Financial modeling tools"
      ],
      "career_path": {
        "next_roles": [
          "chief_of_staff",
          "vp_operations",
          "head_of_revops"
        ],
        "lateral_moves": [
          "product_manager",
          "vp_finance"
        ]
      },
      "market_notes_israel": "Common in growth-stage Israeli tech companies. Often filled by ex-consultants (McKinsey, BCG, Bain, Deloitte) or ex-investment banking professionals. Companies like Mindspace and Plus500 hire for this role. Strong financial modeling and business case development skills are differentiators. The role frequently evolves into a Chief of Staff position.",
      "role_family": "RevOps_BizOps",
      "seniority": "Senior"
    },
    {
      "role_id": "chief_of_staff",
      "title": "Chief of Staff",
      "sector": "RevOps / Business Ops",
      "seniority_level": "senior",
      "years_experience_typical": "5-10",
      "description": "Serves as a strategic execution partner and force multiplier for the CEO or C-suite executive. Drives clarity, alignment, and accountability across the leadership team. Translates strategy into action, anticipates issues, resolves misalignment, and ensures momentum on high-priority initiatives. A highly visible role with direct exposure to company-shaping decisions.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "PowerPoint / Google Slides",
        "Excel / Google Sheets (advanced)",
        "Notion / Confluence",
        "Monday.com / Asana",
        "Salesforce",
        "OKR platforms",
        "AI productivity tools"
      ],
      "career_path": {
        "next_roles": [
          "vp_operations",
          "vp_strategy",
          "general_manager"
        ],
        "lateral_moves": [
          "strategy_ops_manager",
          "head_of_revops"
        ]
      },
      "market_notes_israel": "Rapidly growing role in Israeli tech, especially in scale-ups and growth-stage companies. Companies like Hello Heart, Atera, MazeBolt, and Mindspace actively hire Chiefs of Staff in Tel Aviv. Most require 5-8+ years of experience. Management consulting or investment banking background is strongly preferred (McKinsey, BCG, Bain, TASC). MBA is often required or strongly preferred. AI fluency is becoming a must-have. The role typically requires non-standard hours to align with US-based executives and 20-40% international travel.",
      "role_family": "RevOps_BizOps",
      "seniority": "Senior"
    },
    {
      "role_id": "vp_operations",
      "title": "VP / Head of Operations",
      "sector": "RevOps / Business Ops",
      "seniority_level": "executive",
      "years_experience_typical": "8-15",
      "description": "Leads the company's global operations including service delivery, customer lifecycle management, and operational excellence. Builds scalable, tech-enabled processes that support growth across regions. Manages offshore and distributed teams, defines KPIs and performance frameworks, and partners with Product and Engineering to shape the platform roadmap.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "CRM platforms (Salesforce, HubSpot)",
        "ERP systems",
        "BI tools (Tableau, Power BI, Looker)",
        "Project management tools (Monday.com, Asana, Jira)",
        "Data warehouses (BigQuery, Snowflake)",
        "Workforce management tools",
        "AI/automation platforms"
      ],
      "career_path": {
        "next_roles": [
          "coo",
          "general_manager",
          "ceo"
        ],
        "lateral_moves": [
          "vp_customer_success",
          "vp_finance"
        ]
      },
      "market_notes_israel": "Found in established Israeli tech companies with global operations. Companies like Ship4wd and Helfy hire for this role. Often requires experience managing offshore teams (Philippines, Eastern Europe, India) and comfort operating across time zones. Deep domain expertise (logistics, fintech, SaaS) is usually required. MBA is often preferred. The role increasingly requires experience with tech-enabled operations and AI-driven process improvement.",
      "role_family": "RevOps_BizOps",
      "seniority": "VP_Executive"
    },
    {
      "role_id": "junior_software_engineer",
      "title": "Junior Software Engineer",
      "sector": "Engineering",
      "seniority_level": "entry",
      "description": "Entry-level software engineering role focused on learning production codebases, contributing to feature development, and building foundational engineering skills. Typically involves working under senior guidance across backend, frontend, or full-stack domains while gaining hands-on experience with real systems and development workflows.",
      "key_responsibilities": [
        "Contribute to feature development across backend and/or frontend systems under senior guidance",
        "Write clean, maintainable code following team coding standards and best practices",
        "Participate in code reviews, design discussions, and sprint ceremonies",
        "Debug and troubleshoot issues in existing systems",
        "Write and maintain unit and integration tests",
        "Learn and apply development workflows including Git, CI/CD, and deployment processes",
        "Collaborate with cross-functional team members including QA, product, and design"
      ],
      "required_skills": [
        "programming_fundamentals",
        "python_development",
        "git_version_control",
        "debugging",
        "data_structures_algorithms",
        "linux_fundamentals",
        "sql"
      ],
      "tools_technologies": [
        "Python",
        "JavaScript/TypeScript",
        "Git/GitHub",
        "Linux CLI",
        "SQL databases",
        "Docker (basic)",
        "IDE (VS Code, PyCharm)"
      ],
      "career_paths": {
        "next_roles": [
          "software_engineer"
        ],
        "lateral_moves": [
          "qa_engineer",
          "devops_engineer"
        ]
      },
      "market_notes_israel": "Strong entry pipeline in Israel through university programs, army tech units (8200, Mamram, etc.), and bootcamps. Many companies hire new grads with BSc in CS or equivalent military experience. Companies like VAST Data, XM Cyber, and Emerson actively recruit junior engineers in Tel Aviv. AI/ML bootcamp programs (fully funded, ~5 months) are emerging as an alternative entry path. GPA requirements (85+) and psychometric scores are common filters for structured programs.",
      "role_family": "Engineering",
      "seniority": "Entry"
    },
    {
      "role_id": "software_engineer",
      "title": "Software Engineer",
      "sector": "Engineering",
      "seniority_level": "mid",
      "description": "Mid-level individual contributor responsible for designing, building, and maintaining production software systems. Expected to own features end-to-end \u2014 from design through deployment \u2014 and work independently across backend, frontend, or full-stack domains. Operates within a team but with increasing autonomy on technical decisions.",
      "key_responsibilities": [
        "Design, develop, and maintain production-grade software systems end-to-end",
        "Own features from design through coding, testing, deployment, and monitoring",
        "Write scalable, maintainable code following engineering best practices",
        "Participate in architectural discussions and contribute to technical decision-making",
        "Conduct and participate in code reviews to maintain code quality",
        "Collaborate with product managers, designers, and other engineers to deliver solutions",
        "Debug complex issues across systems and contribute to incident resolution",
        "Write comprehensive tests and maintain CI/CD pipeline integrity"
      ],
      "required_skills": [
        "backend_development",
        "frontend_development",
        "system_design_basics",
        "python_development",
        "databases",
        "api_design",
        "testing_practices",
        "git_version_control",
        "cloud_fundamentals"
      ],
      "tools_technologies": [
        "Python",
        "Node.js/TypeScript",
        "React",
        "PostgreSQL/MySQL",
        "MongoDB",
        "Docker",
        "Kubernetes (basic)",
        "AWS/GCP/Azure",
        "Git/GitHub",
        "CI/CD tools"
      ],
      "career_paths": {
        "next_roles": [
          "senior_software_engineer",
          "tech_lead"
        ],
        "lateral_moves": [
          "devops_engineer",
          "sre_engineer",
          "data_engineer"
        ]
      },
      "market_notes_israel": "Core hiring target across Israeli startups and scale-ups. Typical requirements are 3-5 years of experience with strong backend skills. Python and Node.js/TypeScript dominate the stack in Tel Aviv. Companies like Venice, Oligo, Seal Security, and Simply actively hire at this level. Full-stack capability is increasingly expected even in 'backend' roles. Cybersecurity and SaaS companies form a large portion of the employer base. Microservices architecture experience is becoming a baseline expectation.",
      "role_family": "Engineering",
      "seniority": "Mid"
    },
    {
      "role_id": "senior_software_engineer",
      "title": "Senior Software Engineer",
      "sector": "Engineering",
      "seniority_level": "senior",
      "description": "Experienced individual contributor who drives significant technical initiatives, mentors junior engineers, and takes ownership of complex systems and features. Expected to make sound architectural decisions, lead technical discussions, and deliver high-impact work with minimal oversight. Often serves as a technical anchor within a product team.",
      "key_responsibilities": [
        "Lead design and implementation of complex features and systems end-to-end",
        "Make architectural and technical decisions that affect team and product direction",
        "Mentor junior and mid-level engineers through code reviews, pair programming, and coaching",
        "Drive technical excellence through best practices, testing strategies, and code quality standards",
        "Collaborate with product leadership to translate business requirements into technical solutions",
        "Identify and resolve performance bottlenecks and scalability challenges",
        "Lead incident response and root cause analysis for production issues",
        "Contribute to cross-team technical initiatives and platform improvements",
        "Evaluate and introduce new technologies, tools, and practices"
      ],
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
      "tools_technologies": [
        "Python",
        "Java/Go/TypeScript",
        "React/Vue/Angular",
        "PostgreSQL/MySQL",
        "MongoDB/Redis",
        "Kafka/RabbitMQ",
        "Docker/Kubernetes",
        "AWS/GCP/Azure",
        "Terraform",
        "CI/CD pipelines",
        "Monitoring tools (Datadog, Prometheus, Grafana)"
      ],
      "career_paths": {
        "next_roles": [
          "staff_engineer",
          "tech_lead",
          "engineering_manager"
        ],
        "lateral_moves": [
          "senior_data_engineer",
          "solutions_architect"
        ]
      },
      "market_notes_israel": "High-demand role across the Israeli market. Typical requirements are 5-8+ years of experience. Companies like Taboola, Sett, april, Apiiro, and WINN.AI hire aggressively at this level. End-to-end ownership is the consistent theme \u2014 companies expect senior engineers to ship features from design to production with full accountability. Big data experience (Kafka, Spark, distributed databases) is a strong differentiator at ad-tech and data-heavy companies. LLM/AI experience is emerging as a preferred qualification even for non-AI companies.",
      "role_family": "Engineering",
      "seniority": "Senior"
    },
    {
      "role_id": "staff_engineer",
      "title": "Staff Engineer",
      "sector": "Engineering",
      "seniority_level": "lead",
      "description": "Principal-level individual contributor who operates at the intersection of deep technical expertise and business strategy. Defines architectural vision for product domains, solves the hardest cross-cutting technical challenges, and acts as a force multiplier \u2014 elevating the skills, velocity, and quality of engineers across the organization. Maintains hands-on involvement while providing strategic technical leadership.",
      "key_responsibilities": [
        "Define and drive the architectural roadmap for one or more product domains",
        "Solve complex, cross-cutting technical challenges that span multiple teams or services",
        "Act as a force multiplier \u2014 mentor senior engineers and tech leads, introduce engineering patterns and practices that make the organization faster",
        "Partner with product directors and VPs to validate feasibility and translate business goals into technical strategies",
        "Lead major technical initiatives such as platform migrations, architecture modernizations, and new system designs",
        "Remain hands-on \u2014 code critical paths, prototype complex solutions, and set the standard for code quality",
        "Anticipate scaling bottlenecks and design resilient distributed systems",
        "Define and champion engineering best practices across the organization",
        "Evaluate and drive adoption of new technologies and AI-first development practices"
      ],
      "required_skills": [
        "system_architecture",
        "distributed_systems",
        "technical_leadership",
        "performance_optimization",
        "cross_team_collaboration",
        "mentoring",
        "strategic_thinking",
        "cloud_platforms",
        "backend_development",
        "ai_tool_fluency"
      ],
      "tools_technologies": [
        "Python/Go/Java/TypeScript",
        "React/Next.js",
        "Kafka/gRPC/event-driven architectures",
        "PostgreSQL/Redis/Elasticsearch",
        "Docker/Kubernetes",
        "AWS/GCP/Azure",
        "Terraform/IaC",
        "CI/CD pipelines",
        "AI dev tools (Cursor, Copilot, Claude)",
        "Monitoring/observability stacks"
      ],
      "career_paths": {
        "next_roles": [
          "principal_engineer",
          "vp_engineering"
        ],
        "lateral_moves": [
          "engineering_manager",
          "solutions_architect"
        ]
      },
      "market_notes_israel": "Emerging as a distinct and valued role in Israeli scale-ups. Companies like Tomorrow.io and Yotpo have clear Staff Engineer positions with explicit 'force multiplier' expectations. The role requires 8-10+ years of experience and architectural mastery. AI-first development practices (integrating AI tools like Cursor and Copilot into engineering workflows) are becoming a defining requirement at companies like Tomorrow.io. Full-stack fluency \u2014 deep understanding from database internals to frontend frameworks \u2014 is expected. This role is distinct from Engineering Manager: Staff Engineers lead through technical influence, not people management.",
      "role_family": "Engineering",
      "seniority": "Senior"
    },
    {
      "role_id": "tech_lead",
      "title": "Tech Lead",
      "sector": "Engineering",
      "seniority_level": "lead",
      "description": "Hands-on technical leader who combines active coding with team guidance, architectural ownership, and project leadership. Drives technical direction for a product team while remaining deeply involved in the codebase. Sets engineering standards, leads design reviews, mentors engineers, and ensures the team delivers reliable, scalable systems. Often the bridge between engineering execution and product/business needs.",
      "key_responsibilities": [
        "Write and review production code while setting the standard for code quality and best practices",
        "Lead technical design \u2014 define architecture, make trade-offs, and drive projects from proposal to production",
        "Mentor engineers through design reviews, code reviews, and pair programming",
        "Own the technical roadmap and align engineering execution with product goals",
        "Drive improvements in testing strategy, CI/CD, developer experience, and tooling",
        "Collaborate with product, infrastructure, and cross-functional teams to deliver features",
        "Make architectural decisions and guide the team through implementation and rollout",
        "Leverage AI/LLM tooling to accelerate development and improve engineering processes",
        "Support hiring and onboarding of new engineers"
      ],
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
      "tools_technologies": [
        "Python",
        "TypeScript/Node.js",
        "React/Next.js",
        "PostgreSQL/MySQL",
        "Redis/Elasticsearch",
        "Docker/Kubernetes",
        "AWS/GCP/Azure",
        "Git/GitHub Actions",
        "CI/CD pipelines",
        "AI dev tools (Cursor, Copilot, Claude Code)"
      ],
      "career_paths": {
        "next_roles": [
          "staff_engineer",
          "engineering_manager"
        ],
        "lateral_moves": [
          "senior_software_engineer",
          "solutions_architect"
        ]
      },
      "market_notes_israel": "One of the most common leadership roles in Israeli tech. Companies like monday.com, Antidote Health, Eyeviation, Scala Bio, Classiq, and EyeControl all actively hire Tech Leads. The consistent expectation is hands-on coding (often 50-70% of time) combined with technical leadership. Python is the dominant backend language for this role. AI/LLM integration into developer workflows is emerging as a key requirement \u2014 Classiq, EyeControl, and Scala Bio all explicitly mention AI tool fluency. Many Tech Lead roles in Israel are in early-stage startups where the TL is the first or second senior engineering hire.",
      "role_family": "Engineering",
      "seniority": "Lead_Manager"
    },
    {
      "role_id": "engineering_manager",
      "title": "Engineering Manager",
      "sector": "Engineering",
      "seniority_level": "manager",
      "description": "People leader who manages a team of engineers (typically 4-10), combining technical credibility with team development, delivery ownership, and cross-functional collaboration. Responsible for hiring, mentoring, performance management, and ensuring the team delivers high-quality work on time. Stays close to the technology \u2014 reviewing code, participating in architecture discussions, and jumping in hands-on when needed.",
      "key_responsibilities": [
        "Lead, mentor, and grow a team of engineers, ensuring professional development and high performance",
        "Drive delivery of complex projects \u2014 managing timelines, priorities, and cross-team dependencies",
        "Remain hands-on with code reviews, architecture discussions, and technical problem-solving",
        "Hire and onboard engineering talent aligned with team needs",
        "Conduct performance reviews, set goals, and coach team members",
        "Collaborate with product, QA, and design teams to deliver end-to-end solutions",
        "Drive technical decisions and ensure adherence to engineering best practices and SDLC",
        "Ensure CI/CD pipeline health, code quality standards, and deployment workflows",
        "Foster a culture of ownership, accountability, and continuous improvement"
      ],
      "required_skills": [
        "people_management",
        "technical_leadership",
        "backend_development",
        "system_design",
        "hiring_talent_acquisition",
        "performance_management",
        "agile_methodology",
        "cross_team_collaboration",
        "cloud_platforms",
        "ci_cd"
      ],
      "tools_technologies": [
        "Python/Java/TypeScript",
        "React/Angular",
        "PostgreSQL/MySQL/Redis",
        "Docker/Kubernetes",
        "AWS/GCP/Azure",
        "Spark/Databricks (data-heavy teams)",
        "CI/CD pipelines",
        "Jira/Linear",
        "Monitoring tools"
      ],
      "career_paths": {
        "next_roles": [
          "senior_engineering_manager",
          "engineering_group_manager"
        ],
        "lateral_moves": [
          "tech_lead",
          "staff_engineer",
          "product_manager"
        ]
      },
      "market_notes_israel": "Critical mid-management role across Israeli tech. Companies like Wenrix, GMT, and Cye actively hire Engineering Managers. The role requires a balance of technical depth and people leadership \u2014 most listings require 5-7+ years of engineering experience plus 2+ years of leadership. Hands-on capability is consistently expected: Israeli companies want managers who can review code, troubleshoot production issues, and participate in architecture discussions. Python and Java are the most common backend languages. Fintech (GMT) and cybersecurity (Cye) are major hiring sectors for this role in Israel.",
      "role_family": "Engineering",
      "seniority": "Lead_Manager"
    },
    {
      "role_id": "senior_engineering_manager",
      "title": "Senior Engineering Manager / Director of Engineering",
      "sector": "Engineering",
      "seniority_level": "director",
      "description": "Senior engineering leader who manages multiple teams or engineering managers, owns end-to-end engineering execution for a product domain, and drives architectural and organizational decisions at scale. Combines people leadership with technical ownership and strategic influence. Responsible for delivery quality, team scaling, process improvement, and cross-company technical initiatives.",
      "key_responsibilities": [
        "Lead multiple engineering teams through direct reports (engineering managers and/or team leads)",
        "Own engineering execution, delivery quality, and operational excellence across all teams",
        "Drive scalable engineering processes, methodologies, and best practices",
        "Partner closely with product, AI/ML, security, and business stakeholders",
        "Make architectural and technical decisions that balance speed, quality, and long-term maintainability",
        "Lead capacity planning, hiring strategy, onboarding, and performance management",
        "Translate high-level strategy into execution plans and measurable outcomes",
        "Ensure production stability, CI/CD excellence, system reliability, and security",
        "Foster a culture of ownership, accountability, and continuous improvement",
        "Drive adoption of AI-first approaches to building, testing, and maintaining systems"
      ],
      "required_skills": [
        "engineering_leadership",
        "people_management",
        "system_architecture",
        "strategic_thinking",
        "hiring_talent_acquisition",
        "cross_team_collaboration",
        "stakeholder_management",
        "distributed_systems",
        "cloud_platforms",
        "process_improvement"
      ],
      "tools_technologies": [
        "Cloud platforms (AWS/GCP/Azure)",
        "Kubernetes/Docker",
        "CI/CD pipelines",
        "Monitoring/observability stacks",
        "Data platforms",
        "Terraform/IaC",
        "Agile/Scrum tooling",
        "Engineering metrics tools"
      ],
      "career_paths": {
        "next_roles": [
          "vp_engineering"
        ],
        "lateral_moves": [
          "engineering_group_manager",
          "head_of_product"
        ]
      },
      "market_notes_israel": "Companies like Navina and SeeTrue hire at this level for leaders who manage multiple teams (typically 15-30+ engineers). Navina's Director of Engineering (Data Platform) role exemplifies the Israeli market expectation: end-to-end ownership of a critical platform domain, managing multiple teams, and serving as a key interface between engineering and the rest of the organization. Healthcare data and AI-driven products are growing sectors for this role. Experience managing managers is a hard requirement. AI-first mindset is increasingly expected \u2014 driving AI tool adoption across teams, not just personal use.",
      "role_family": "Engineering",
      "seniority": "Director_Head"
    },
    {
      "role_id": "vp_engineering",
      "title": "VP Engineering / Head of Engineering",
      "sector": "Engineering",
      "seniority_level": "executive",
      "description": "Executive engineering leader responsible for the entire engineering organization, technology strategy, and technical vision. Leads large engineering teams (20-100+), defines the engineering roadmap aligned with company strategy, and drives major initiatives including platform modernization, AI adoption, and organizational scaling. Reports to CEO/CPO and serves as part of the executive leadership team. Combines strategic leadership with deep technical credibility.",
      "key_responsibilities": [
        "Define and lead the long-term technology strategy and engineering roadmap",
        "Lead and scale the entire engineering organization through senior engineering leaders",
        "Drive major technical initiatives: platform modernization, AI adoption, architectural evolution",
        "Translate product and business roadmaps into multi-year engineering plans",
        "Oversee delivery across software, data, AI/ML, and infrastructure",
        "Drive talent strategy \u2014 hiring plans, performance management, retention, and leadership development",
        "Represent engineering at the executive level, communicating strategy, trade-offs, and progress",
        "Ensure high standards of reliability, performance, scalability, and security",
        "Foster engineering culture centered on technical excellence, quality, and innovation",
        "Manage engineering budgets and resource allocation"
      ],
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
      "tools_technologies": [
        "Cloud platforms (AWS/GCP/Azure)",
        "Distributed systems architectures",
        "Kubernetes/containerization",
        "CI/CD and DevOps practices",
        "AI/ML platforms and workflows",
        "Data infrastructure",
        "Engineering productivity tools",
        "Budget and resource planning tools"
      ],
      "career_paths": {
        "next_roles": [
          "cto",
          "svp_engineering"
        ],
        "lateral_moves": [
          "vp_product",
          "chief_of_staff"
        ]
      },
      "market_notes_israel": "Executive-level role with strong market signal across Israeli companies of all sizes. CrowdStrike, QEDMA, Lemonade, and multiple Israeli startups and scale-ups hire VP/Head of Engineering. Requirements typically include 10-15+ years of engineering experience with significant leadership tenure. The role spans a wide range: at startups like QEDMA (quantum computing), it involves managing 10-20 engineers and staying close to the technology; at scale-ups like Lemonade, it means leading 100+ engineers across multiple product lines. AI strategy and adoption is a consistent theme \u2014 companies expect VP Engineering to drive AI-first engineering practices. Cloud-native architecture, distributed systems, and experience scaling engineering organizations are universal requirements. In Israeli ad-tech and e-commerce, hands-on technical credibility is expected even at the VP level.",
      "role_family": "Engineering",
      "seniority": "VP_Executive"
    },
    {
      "role_id": "qa_engineer",
      "title": "QA Engineer",
      "sector": "Engineering",
      "seniority_level": "mid",
      "description": "Quality assurance professional responsible for ensuring software quality through manual testing, test planning, automation development, and cross-functional collaboration. Designs and executes test strategies, identifies and documents defects, and works closely with developers, product managers, and designers throughout the development lifecycle. Increasingly expected to build and maintain automated test suites and leverage AI tools to improve QA workflows.",
      "key_responsibilities": [
        "Design and execute comprehensive test plans for new features and releases",
        "Perform manual testing including functional, regression, exploratory, and UI/UX testing",
        "Develop and maintain automated test suites for APIs and end-to-end scenarios",
        "Identify, document, reproduce, and track bugs through resolution",
        "Collaborate with developers, product managers, and designers to ensure quality throughout the SDLC",
        "Serve as quality gatekeeper for releases \u2014 assess delivery readiness and standards compliance",
        "Perform root cause analysis on product quality issues",
        "Contribute to continuous improvement of QA methodologies and processes",
        "Leverage AI tools to enhance QA workflows and testing efficiency",
        "Maintain QA documentation including test cases, test results, and bug reports"
      ],
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
      "tools_technologies": [
        "Playwright",
        "Cypress",
        "Postman",
        "Jira",
        "Xray Test Management",
        "TypeScript/Python (for automation)",
        "SQL (basic)",
        "Git",
        "CI/CD tools",
        "AI testing tools"
      ],
      "career_paths": {
        "next_roles": [
          "senior_qa_engineer",
          "qa_lead",
          "qa_manager"
        ],
        "lateral_moves": [
          "software_engineer",
          "devops_engineer"
        ]
      },
      "market_notes_israel": "Active hiring across the Israeli market at all seniority levels, from entry-level (DealHub, inManage \u2014 often requiring QA course completion) through mid-level (Silverfort, Zemingo, Loox) to senior (Lemonade). Playwright is rapidly becoming the dominant automation framework, replacing Selenium. Companies like Loox and Zemingo explicitly require Playwright experience. AI tool fluency in QA workflows is becoming a differentiator \u2014 Lemonade, Loox, and Zemingo all mention leveraging AI tools. ISTQB certification is noted as an advantage but not required. Cybersecurity companies (Silverfort) need QA engineers comfortable with Windows/Linux environments and Active Directory. Web + mobile testing is common for consumer-facing companies. The shift-left testing philosophy is increasingly adopted \u2014 QA engineers are expected to engage developers in testing and automation earlier in the development cycle.",
      "role_family": "Engineering",
      "seniority": "Mid"
    },
    {
      "role_id": "devops_engineer",
      "title": "DevOps Engineer",
      "sector": "Engineering",
      "seniority_level": "mid",
      "description": "Infrastructure and automation specialist responsible for designing, building, and maintaining cloud infrastructure, CI/CD pipelines, and deployment systems. Owns infrastructure-as-code, container orchestration, monitoring, and operational tooling. Works closely with software engineers to enable fast, reliable, and secure software delivery. Increasingly expected to integrate AI tools into infrastructure workflows.",
      "key_responsibilities": [
        "Design, build, and maintain cloud infrastructure using Infrastructure as Code (Terraform, Pulumi, CloudFormation)",
        "Build and manage CI/CD pipelines for automated testing, building, and deployment",
        "Implement and maintain container orchestration (Docker, Kubernetes)",
        "Set up and manage monitoring, logging, and alerting systems",
        "Enforce cloud security best practices including IAM, networking, and access controls",
        "Automate operational tasks using Python, Bash, or similar scripting languages",
        "Optimize cloud resource utilization for cost efficiency and performance",
        "Support development teams with infrastructure needs and deployment workflows",
        "Manage multi-environment setups (development, staging, production)",
        "Integrate AI tools into infrastructure and operational workflows"
      ],
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
      "tools_technologies": [
        "AWS/GCP/Azure",
        "Terraform/Pulumi/CloudFormation",
        "Docker",
        "Kubernetes (EKS/GKE/AKS)",
        "GitHub Actions/Jenkins/ArgoCD",
        "Prometheus/Grafana/Datadog",
        "Python/Bash",
        "Helm",
        "Ansible",
        "Git"
      ],
      "career_paths": {
        "next_roles": [
          "senior_devops_engineer",
          "sre_engineer",
          "platform_engineer"
        ],
        "lateral_moves": [
          "software_engineer",
          "cloud_architect"
        ]
      },
      "market_notes_israel": "Strong and consistent demand across the Israeli market. Companies like DualBird, Volumez, VI, CET, Infini-T, and ZeroPort actively hire DevOps engineers. AWS is the dominant cloud platform, followed by GCP and Azure. Terraform is the most common IaC tool. Kubernetes experience is increasingly expected even at mid-level. The Israeli market has a strong DevOps consulting sector (Infini-T) offering varied project exposure. AI-driven automation is emerging as a key differentiator \u2014 Volumez explicitly requires daily use of AI tools (Copilot, ChatGPT, Cursor). Junior DevOps positions exist (CET) with emphasis on code-first mindset and willingness to learn. On-prem and air-gapped deployment experience is valued in defense-adjacent companies (ZeroPort). GitOps workflows (ArgoCD) and Kubernetes-native tooling are the growth direction.",
      "role_family": "Engineering",
      "seniority": "Mid"
    },
    {
      "role_id": "sre_engineer",
      "title": "SRE Engineer",
      "sector": "Engineering",
      "seniority_level": "mid",
      "description": "Site Reliability Engineer focused on ensuring the reliability, scalability, and performance of production systems. Owns observability, incident response, SLOs/SLIs, and automation of operational toil. Combines strong software engineering skills with deep systems knowledge to build tools and processes that keep production environments healthy. Works closely with engineering teams to improve deployment safety, system resilience, and mean time to recovery.",
      "key_responsibilities": [
        "Define SLIs and SLOs with engineering leaders \u2014 translate reliability goals into measurable objectives",
        "Build and maintain observability infrastructure: dashboards, alerts, logging, and monitoring",
        "Design and own on-call rotation, escalation policies, and incident response runbooks",
        "Lead incident response and post-mortem processes \u2014 drive root cause analysis and preventive action",
        "Automate operational toil \u2014 replace recurring manual work with intelligent automation",
        "Improve system reliability through performance optimization, load balancing, and capacity planning",
        "Contribute to CI/CD safety, deployment rollback mechanisms, and feature flag infrastructure",
        "Build AI-powered reliability tools for alert correlation, root cause analysis, and automated mitigation",
        "Collaborate with development teams to improve application reliability and implement SRE best practices",
        "Participate in on-call rotations to support critical production incidents"
      ],
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
      "tools_technologies": [
        "Prometheus/Grafana/Loki",
        "Datadog",
        "AWS/GCP/Azure",
        "Kubernetes (GKE/EKS)",
        "Docker",
        "Terraform/ArgoCD",
        "Python/Go/TypeScript/Bash",
        "Redis/MySQL/BigQuery/ClickHouse",
        "PagerDuty/OpsGenie",
        "ELK Stack (Elasticsearch, Logstash, Kibana)",
        "AI/LLM tools for automation"
      ],
      "career_paths": {
        "next_roles": [
          "senior_sre",
          "sre_manager",
          "platform_engineer"
        ],
        "lateral_moves": [
          "devops_engineer",
          "software_engineer",
          "cloud_architect"
        ]
      },
      "market_notes_israel": "Distinct and growing role in the Israeli market, separate from DevOps. Companies like Guardio, Optimove, AudioCodes, and Lemonade have dedicated SRE positions. The key differentiator from DevOps is the focus on production reliability, incident response, SLOs, and post-mortem culture rather than infrastructure provisioning. GCP is common for SRE roles alongside AWS. AI-native reliability tooling is a defining trend \u2014 Guardio explicitly seeks engineers who build AI-powered tools for alert correlation, root cause analysis, and automated incident mitigation using LLMs. On-call rotation is a standard requirement. Strong software engineering background is expected \u2014 SREs are builders, not just operators. The role requires 4+ years of experience in most Israeli companies. Cybersecurity (Guardio), marketing tech (Optimove), and insurance tech (Lemonade) are active hiring sectors for SRE in Israel.",
      "role_family": "Engineering",
      "seniority": "Mid"
    },
    {
      "role_id": "engineering_group_manager",
      "title": "Engineering Group Manager",
      "sector": "Engineering",
      "seniority_level": "senior_manager",
      "description": "Senior engineering leader who manages a group of multiple engineering teams (typically 15-25+ engineers) through team leads and engineering managers. Drives product engineering execution at scale, shapes technical vision, and builds high-performing engineering organizations. Operates at the intersection of technical leadership, people management, and product strategy. Closely partners with product leadership to execute on the engineering roadmap.",
      "key_responsibilities": [
        "Lead, scale, and mentor an engineering group of 15-25+ engineers across multiple teams",
        "Manage team leads and engineering managers \u2014 develop the next generation of engineering leaders",
        "Partner closely with product managers to define and execute the product roadmap",
        "Drive continuous improvement of R&D processes, team structure, and engineering culture",
        "Lead architecture reviews and stay close to the technology without necessarily coding daily",
        "Own cross-functional collaboration and synchronization between engineering and other departments",
        "Foster technical excellence and build a strong leadership pipeline",
        "Drive execution, quality, and operational excellence across all teams",
        "Design and operate large systems with emphasis on scalability, high availability, and performance",
        "Support organizational growth through hiring strategy, team structure, and leadership development"
      ],
      "required_skills": [
        "engineering_leadership",
        "people_management",
        "organizational_design",
        "system_architecture",
        "cross_team_collaboration",
        "stakeholder_management",
        "hiring_talent_acquisition",
        "strategic_thinking",
        "distributed_systems",
        "cloud_platforms"
      ],
      "tools_technologies": [
        "Python/Node.js",
        "Cloud services (AWS/Azure/GCP)",
        "Kubernetes/Docker",
        "Distributed systems architectures",
        "CI/CD pipelines",
        "Engineering productivity and planning tools",
        "Monitoring/observability platforms"
      ],
      "career_paths": {
        "next_roles": [
          "vp_engineering",
          "cto"
        ],
        "lateral_moves": [
          "senior_engineering_manager",
          "head_of_product"
        ]
      },
      "market_notes_israel": "Distinct role in Israeli scale-ups and growth-stage companies. Hyro's Engineering Group Manager role is the clearest example: managing 15-20 engineers, leading team leads, and driving AI product development at scale. The role requires 7+ years of engineering experience with at least 2 years managing at scale. Deep technical rooting is expected \u2014 ability to lead architecture reviews and stay close to technology without daily coding. Experience designing and operating large, scalable systems is a core requirement. Conversational AI, healthcare tech, and SaaS are active hiring sectors. Python and Node.js are the dominant technologies. The role reports to CTO/CPTO and is a key pipeline to VP Engineering.",
      "role_family": "Engineering",
      "seniority": "Director_Head"
    },
    {
      "role_id": "junior_ai_ml_engineer",
      "role_name": "Junior AI/ML Engineer",
      "sector": "ai_ml",
      "seniority": "entry",
      "description": "Entry-level engineer working on AI/ML features under close guidance. Contributes to building LLM-powered applications, data pipelines, model integration, and basic ML workflows. Focus is on learning production AI engineering practices while delivering small, well-scoped components within a larger AI system.",
      "typical_responsibilities": [
        "Implement backend services and integrate LLM APIs (OpenAI, Anthropic, etc.) under senior guidance",
        "Contribute to RAG pipelines: embedding generation, vector search, retrieval logic",
        "Write Python code for data preparation, feature engineering, and basic model pipelines",
        "Assist with prompt engineering and evaluation of model outputs",
        "Help build and maintain simple ML workflows and automation scripts",
        "Participate in code reviews, learn production engineering standards, and contribute to documentation",
        "Debug and troubleshoot issues in AI-powered features",
        "Explore and experiment with new AI tools and frameworks to bring ideas to the team"
      ],
      "career_path_next": [
        "ai_engineer_mid",
        "junior_software_engineer",
        "data_analyst"
      ],
      "typical_tools": [
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
      "market_notes_israel": "Direct Junior AI/ML Engineer roles at product companies are relatively rare in Israel. The most common entry paths are: (1) intensive bootcamp/training programs like Infinity Labs R&D (STEM graduates, 5-month hybrid programs with placement) or similar paid tracks that lead to junior placements at partner companies; (2) consulting firms like KPMG Associate GenAI Engineer which hire early-career engineers for client AI delivery; (3) conversion from Junior Software Engineer roles after self-study and internal project work. Candidates typically need a BSc in CS/STEM with strong GPA (80+) and psychometric scores above 680-700 for competitive programs. The market strongly prefers candidates who have built real AI projects (even side projects) over those with only coursework. Tel Aviv and Herzliya dominate; remote-first AI startups exist but rarely hire juniors remotely.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "ai_engineer_mid",
      "role_name": "AI Engineer / GenAI Engineer",
      "sector": "ai_ml",
      "seniority": "mid",
      "description": "Mid-level engineer who designs and builds production AI systems using LLMs, RAG pipelines, and agentic workflows. Owns features end-to-end \u2014 from problem definition through deployment and monitoring. Works closely with product and other engineers to translate business problems into AI-powered solutions that scale.",
      "typical_responsibilities": [
        "Design and build LLM-powered applications, AI agents, and RAG pipelines in production",
        "Implement and optimize prompt engineering strategies (few-shot, chain-of-thought, tool use)",
        "Build data pipelines for ingestion, processing, and embedding of structured and unstructured data",
        "Integrate AI capabilities with internal APIs, services, databases, and customer-facing products",
        "Develop evaluation frameworks and monitoring for model performance, accuracy, and cost",
        "Collaborate with product managers and domain experts to define high-value AI use cases",
        "Own the 'how' of AI: from idea to prototype to functional integration",
        "Stay current with emerging LLM capabilities, agent frameworks, and AI tooling",
        "Contribute to architectural decisions on AI infrastructure, model selection, and build-vs-buy tradeoffs",
        "Deploy and operate AI workloads on cloud platforms (AWS, GCP, Azure, Databricks)"
      ],
      "career_path_next": [
        "senior_ai_engineer",
        "mlops_engineer",
        "applied_ai_researcher"
      ],
      "typical_tools": [
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
      "market_notes_israel": "This is the highest-volume AI role in the Israeli market right now. Strong demand across cybersecurity (Act Security, Jazz DLP, Winn.ai, Check Point), fintech (Papaya, FlexFactor, One Zero), enterprise SaaS (SysAid, Connecteam), and horizontal AI platforms (Unframe, Latent AI, Sett, WIDER). The title varies considerably \u2014 'AI Engineer', 'GenAI Engineer', 'Applied AI Engineer', 'ML Engineer', 'LLM Engineer' are often interchangeable. Most roles require 2-4 years of experience with strong Python and production system experience. LLM API experience (OpenAI, Anthropic, Bedrock) is now table stakes; RAG pipeline experience is expected; agent framework experience (LangChain, LangGraph) is a strong differentiator. Israel has a higher concentration of AI engineering roles requiring cybersecurity domain knowledge than most global markets.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "senior_ai_engineer",
      "role_name": "Senior AI Engineer",
      "sector": "ai_ml",
      "seniority": "senior",
      "description": "Senior engineer responsible for architecting and delivering complex, production-scale AI systems. Makes core design decisions on model selection, system architecture, and engineering standards. Leads technical implementation of flagship AI features, mentors mid-level engineers, and operates across the full AI lifecycle from research to production.",
      "typical_responsibilities": [
        "Architect production-grade AI systems: LLM orchestration, agentic workflows, RAG infrastructure, vector search",
        "Drive technical direction on model selection, prompt strategies, evaluation methodologies, and system design",
        "Lead end-to-end delivery of major AI features from research through deployment, optimization, and maintenance",
        "Build and deploy classification, generation, and embedding models tailored to specific business use cases",
        "Design automated testing, evaluation, and monitoring systems to ensure model quality in production",
        "Solve hard problems in AI reliability: hallucination mitigation, cost optimization, latency reduction, caching strategies",
        "Mentor junior and mid-level AI engineers and contribute to engineering standards",
        "Collaborate with product, research, and platform teams to bridge research ideas and production systems",
        "Establish AI engineering best practices: prompt libraries, eval harnesses, observability, safety controls",
        "Take ownership of complex, ambiguous technical challenges and drive them to working solutions"
      ],
      "career_path_next": [
        "head_of_ai",
        "ml_platform_lead",
        "principal_ai_engineer"
      ],
      "typical_tools": [
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
      "market_notes_israel": "Strong demand for Senior AI Engineers across Israeli high-tech, particularly at Series B+ startups building AI-native products. Typical experience requirement is 4-6+ years, often with MSc or PhD preferred in technical or AI-adjacent fields. The role increasingly combines deep AI systems knowledge with strong backend engineering \u2014 companies like Winn.ai and Connecteam explicitly require 6-8+ years of full-stack or backend experience plus hands-on AI expertise. Cybersecurity-focused AI startups (Jazz, Act Security, Cymphony) particularly value candidates with security domain experience or 8200/military technical backgrounds. Compensation is among the highest in Israeli tech, with equity a significant component at early-stage companies.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "mlops_engineer",
      "role_name": "MLOps / ML Platform Engineer",
      "sector": "ai_ml",
      "seniority": "mid_to_senior",
      "description": "Engineer focused on the infrastructure, pipelines, and tooling that turn AI models into reliable, scalable production systems. Owns the machine learning lifecycle from data and training through deployment, monitoring, and retraining. Bridges AI researchers, data engineers, and platform/DevOps teams.",
      "typical_responsibilities": [
        "Design and build end-to-end MLOps pipelines: data \u2192 training \u2192 evaluation \u2192 deployment \u2192 monitoring",
        "Build and maintain training pipelines for large-scale AI models with experiment tracking and reproducibility",
        "Implement and manage model registries, versioning systems, and artifact management (MLflow, W&B, DVC)",
        "Deploy models to production: batch pipelines, real-time inference, cloud, on-prem, and edge-adjacent environments",
        "Work with distributed systems for large-scale training and inference (Kubernetes, Ray, Spark)",
        "Optimize workloads across CPU/GPU/memory for cost and performance efficiency",
        "Build model monitoring systems: performance metrics, data drift, quality checks, automated retraining",
        "Automate retraining workflows, evaluation pipelines, and deployment processes",
        "Collaborate with AI researchers, data engineers, and DevOps/platform engineers to move models from research to production",
        "Ensure models remain robust under changing real-world conditions with continuous evaluation pipelines"
      ],
      "career_path_next": [
        "senior_mlops_engineer",
        "ml_platform_lead",
        "head_of_ai"
      ],
      "typical_tools": [
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
      "market_notes_israel": "MLOps is emerging as a clearly distinct role from general AI/ML Engineering in Israel, with explicit titles at companies like Algolight, and embedded MLOps responsibilities at most AI-native startups. Typical experience is 3-5+ years with a mix of ML and infrastructure/DevOps backgrounds. Strong demand at companies dealing with large-scale data (satellite/geospatial like Algolight, financial modeling, healthcare AI), distributed training workloads, or real-time inference systems. Candidates with Kubernetes + Ray/Airflow experience plus strong Python and cloud platform knowledge are particularly sought after. GPU workload optimization and experience with feature stores are increasingly valued.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "cv_edge_ai_engineer",
      "role_name": "Computer Vision / Edge AI Engineer",
      "sector": "ai_ml",
      "seniority": "mid_to_senior",
      "description": "Specialist engineer building AI systems for computer vision, real-time inference, and deployment on edge devices. Works across the full stack \u2014 from model development to systems optimization, sensor integration, and deployment on resource-constrained hardware. Common in defense, autonomous systems, robotics, AR/VR, and physical AI applications.",
      "typical_responsibilities": [
        "Build computer vision models for detection, segmentation, tracking, and scene understanding",
        "Design and optimize real-time AI pipelines running on edge devices (Jetson-class hardware, embedded systems)",
        "Optimize inference pipelines for latency, memory, throughput, and power consumption",
        "Work under real-world constraints: noise, motion, instability, limited compute, degraded sensor data",
        "Integrate multi-sensor systems (RGB, thermal/IR, radar, lidar, depth) for fusion and ground truth transfer",
        "Combine classical computer vision algorithms with deep learning approaches",
        "Build pipelines for large-scale dataset generation, labeling, and synthetic data",
        "Work with CUDA/GPU programming for performance-critical components",
        "Take open-ended problems from concept to working prototype to deployed system",
        "Handle full-stack problems: data \u2192 models \u2192 systems \u2192 deployment"
      ],
      "career_path_next": [
        "senior_cv_engineer",
        "head_of_ai",
        "research_lead"
      ],
      "typical_tools": [
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
      "market_notes_israel": "Israel has a uniquely strong market for CV/Edge AI engineers driven by defense applications (multiple defense primes and startups), autonomous vehicles (Mobileye and its ecosystem), drone technology (Orca AI, defense drone startups), AR/VR (multiple startups), and industrial automation. Companies like Algolight explicitly seek full-stack CV engineers who can operate across sensors, algorithms, and deployment. 8200/military technical backgrounds (especially from image/signal intelligence units) are a significant advantage. The market values engineers who combine computer vision depth with systems-level thinking and ability to work with physics-based sensor data. CUDA/GPU programming experience is a strong differentiator. Companies increasingly demand experience with real-world degraded data rather than only clean benchmarks.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "applied_ai_researcher",
      "role_name": "Applied AI Researcher",
      "sector": "ai_ml",
      "seniority": "mid_to_senior",
      "description": "Research-oriented engineer who owns the full lifecycle of AI projects \u2014 from problem formulation and experimentation through production deployment. Bridges academic research and applied engineering, combining deep ML methodology with production systems thinking. Works on novel problems where off-the-shelf solutions don't exist.",
      "typical_responsibilities": [
        "Own full AI project lifecycle: problem definition, research, experimentation, production deployment, monitoring",
        "Design and build AI agents, RAG systems, and ML models across tabular, text, image, and multimodal data",
        "Apply ML algorithms (classical and transformer-based) to solve complex real-world problems",
        "Conduct structured experimentation: hypothesize, design, implement, and measure experiments",
        "Extract meaningful features and uncover hidden patterns in large datasets using statistical methodologies",
        "Develop evaluation frameworks and benchmarks to test AI capabilities before they reach production",
        "Stay current with academic literature and emerging research; translate papers into actionable solutions",
        "Collaborate with data engineering teams on development and deployment of AI pipelines",
        "Monitor production performance and business impact of deployed models",
        "Bring novel approaches and methodologies to problems where standard solutions don't work"
      ],
      "career_path_next": [
        "senior_applied_researcher",
        "research_lead",
        "head_of_ai"
      ],
      "typical_tools": [
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
      "market_notes_israel": "Applied AI Researcher roles in Israel typically require an advanced degree (MSc preferred, PhD often preferred at larger companies) in Computer Science, AI, Statistics, or related quantitative fields. Strong demand at companies with unique data assets or complex domain problems \u2014 Motiv8AI (behavioral finance), Nanit (pediatric multimodal data), consumer engagement platforms, cybersecurity AI startups. Distinct from pure 'AI Engineer' roles in expected depth of ML methodology, comfort with ambiguity, and ability to read/apply academic research. Distinct from 'Research Scientist' (pure research) roles at labs like AI21, NVIDIA Israel, or Meta Israel in that applied researchers are expected to own end-to-end production deployment, not just publish papers. Compensation tends to be strong with meaningful equity at early-stage companies.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "prompt_engineer",
      "role_name": "Prompt Engineer / Conversational AI Designer",
      "sector": "ai_ml",
      "seniority": "mid",
      "description": "Specialist focused on designing, optimizing, and maintaining prompts for LLM-based systems, with emphasis on conversational experiences, multi-turn dialogue, and consistent AI persona. Combines linguistic craft, AI engineering fundamentals, and rapid experimentation. Works closely with PMs and engineers to deliver natural, trustworthy AI interactions.",
      "typical_responsibilities": [
        "Design multi-turn dialogue flows for text and voice agents with context awareness and memory handling",
        "Define personalities, tone, and conversational style across products and AI agents",
        "Create multilingual prompt strategies and reusable templates/frameworks",
        "Apply prompt engineering techniques: few-shot learning, chain-of-thought, structured outputs, RAG integration",
        "Test prompts with recordings, transcripts, and simulations; iterate based on real-world performance",
        "Analyze live interactions to identify hallucinations, tone issues, dead ends, and token inefficiency",
        "Develop and maintain prompt libraries with flows, system prompts, and version history",
        "Partner with product managers on conversational requirements and with engineers on technical integration",
        "Set guidelines for tone, multilingual consistency, evaluation, and testing",
        "Support compliance and privacy standards in conversational AI design"
      ],
      "career_path_next": [
        "senior_prompt_engineer",
        "ai_engineer_mid",
        "conversational_ai_lead"
      ],
      "typical_tools": [
        "OpenAI/Anthropic APIs",
        "LangChain",
        "prompt management platforms (Promptfoo, LangSmith)",
        "Python (for testing/prototyping)",
        "Jupyter",
        "Git",
        "evaluation frameworks",
        "conversation analytics tools"
      ],
      "market_notes_israel": "Prompt Engineer is an emerging role in Israel, still relatively rare as a dedicated full-time position but growing. Found primarily at companies building conversational AI products (Sensi.AI, conversational agent startups, customer-service-focused AI companies) or at larger AI-native companies with dedicated AI UX teams. The role often attracts candidates with mixed backgrounds \u2014 linguistics, writing, UX, or junior AI engineering with strong communication skills. Some companies embed prompt engineering as part of AI Engineer roles rather than hiring a dedicated specialist. This role has one of the most accessible entry points for non-CS candidates in AI \u2014 strong writing, systematic thinking, and hands-on LLM experience can compensate for lighter engineering background. However, pure prompt engineering roles rarely survive seniority \u2014 career progression typically involves expanding into broader AI engineering or conversational design leadership.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "ai_transformation_lead",
      "role_name": "AI Transformation Lead / AI Enablement Lead",
      "sector": "ai_ml",
      "seniority": "mid_to_senior",
      "description": "Cross-functional leader responsible for driving AI adoption across the business \u2014 not building AI products for customers, but enabling internal teams to work with AI. Identifies high-value internal AI use cases, leads rollouts, builds playbooks and training, and measures ROI of AI transformation efforts. Sits at the intersection of AI, operations, change management, and business strategy.",
      "typical_responsibilities": [
        "Identify, validate, and prioritize AI use cases across business functions using impact, feasibility, and data readiness criteria",
        "Partner with business leaders to turn AI opportunities into governed, production solutions",
        "Lead the full lifecycle of AI tool rollouts: identification, business case, procurement, integration, enablement, change management",
        "Design AI-powered internal workflows using no-code/low-code tools (Zapier, Make, n8n) combined with LLM capabilities",
        "Become the internal expert on AI tools: run training sessions, create guides, enable adoption across teams",
        "Track and report on ROI and adoption of deployed AI tools; iterate based on usage data",
        "Establish practical playbooks for responsible AI: privacy, security, model-risk, governance, escalation",
        "Continuously evaluate emerging AI tools and platforms; recommend what the company should adopt",
        "Work cross-functionally with operations, engineering, product, risk, legal, security, and compliance",
        "Translate business needs into practical technology and process solutions",
        "Define KPIs for AI impact: productivity, cycle time, quality, cost savings, decision support quality"
      ],
      "career_path_next": [
        "head_of_ai_transformation",
        "chief_ai_officer",
        "chief_of_staff"
      ],
      "typical_tools": [
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
      "market_notes_israel": "AI Transformation Lead is a rapidly growing role category in Israel, particularly at (1) regulated industries (banking/fintech like One Zero, insurance, healthcare) where responsible AI adoption requires structured change management; (2) larger SaaS/enterprise companies with significant internal operations to automate (Beamup, Sapiens, inManage); (3) consulting/agency environments (Moburst) helping clients adopt AI. Distinct from Head of AI (who builds AI products) in that this role focuses on AI-as-tool-for-the-business, not AI-as-product. Typical background includes digital transformation, product operations, program management, or management consulting, combined with genuine hands-on AI passion and experience. 5+ years of cross-functional leadership experience is common. This is an excellent target role for business-school graduates with AI fluency and change management skills \u2014 one of the most accessible senior AI-adjacent roles for non-engineers.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "head_of_ai",
      "role_name": "Head of AI / AI Lead",
      "sector": "ai_ml",
      "seniority": "lead",
      "description": "Senior leader who owns AI strategy and execution for a product or business unit. Manages a team of AI engineers, researchers, and MLOps specialists. Drives the AI roadmap, makes build-vs-buy decisions, and is accountable for the quality, reliability, and evolution of AI capabilities in production. Reports to CTO, VP Engineering, or CEO at smaller startups.",
      "typical_responsibilities": [
        "Own AI strategy, roadmap, and execution across the product or business unit",
        "Lead and develop a team of AI engineers, researchers, and data scientists (typically 3-15 people)",
        "Make principled decisions on model selection, system architecture, and build-vs-partner-vs-buy tradeoffs",
        "Drive research and innovation across LLMs, generative AI, agents, and ML methodologies",
        "Establish architectural foundations, tooling, and engineering practices for AI development",
        "Take end-to-end responsibility for AI features from research through production and ongoing optimization",
        "Collaborate with product, engineering, and business leadership to align AI investments with business priorities",
        "Build and scale AI platforms: shared infrastructure for models, training, evaluations, and deployment",
        "Champion responsible AI practices: safety, ethics, model monitoring, bias mitigation",
        "Serve as technical voice for AI to customers, partners, and external stakeholders",
        "Stay at the forefront of AI research and translate emerging capabilities into competitive advantages",
        "Hire, mentor, and grow AI team members"
      ],
      "career_path_next": [
        "vp_ai",
        "chief_ai_officer",
        "cto"
      ],
      "typical_tools": [
        "Python (hands-on)",
        "all major LLM APIs and frameworks",
        "cloud AI platforms (AWS SageMaker, GCP Vertex, Azure ML)",
        "MLOps platforms",
        "team management tools",
        "product planning tools",
        "Jira/Linear",
        "strategic planning frameworks"
      ],
      "market_notes_israel": "Head of AI is one of the fastest-growing senior roles in Israeli tech, with strong demand at early-to-mid-stage startups where it's often the first dedicated AI leadership hire. Typical scope: 3-10 AI engineers and researchers, direct reporting to CTO or CEO at smaller companies. Compensation includes substantial equity (often 0.5-2%+ at seed/Series A). Required experience typically 7-10+ years in ML/AI engineering or research with proven leadership of technical teams. Advanced degree (MSc or PhD) is expected at most companies. This role demands a balance of hands-on depth (still writing code, reviewing architecture) and strategic thinking (roadmap, hiring, build/buy). At Israeli startups, Head of AI is frequently the most senior AI title (VP AI is rare below 100 employees). Strong markets: cybersecurity AI, financial AI, healthcare AI, agentic platforms. 8200 and military technical leadership backgrounds are common and valued.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "vp_ai_chief_ai_officer",
      "role_name": "VP AI / Chief AI Officer",
      "sector": "ai_ml",
      "seniority": "executive",
      "description": "Executive-level AI leader accountable for the entire AI function across the company \u2014 strategy, engineering, research, platform, and organizational AI adoption. Owns AI as a core business capability, drives cross-functional AI transformation, and represents AI externally to board, investors, customers, and the market. Typically found at larger AI-native companies or enterprises undergoing deep AI transformation.",
      "typical_responsibilities": [
        "Own and lead company-wide AI strategy, vision, and execution \u2014 from roadmap to real-world implementation",
        "Manage multiple AI teams: AI engineering, AI research, MLOps, AI platform, AI transformation",
        "Act as hands-on technical leader while operating at executive altitude \u2014 involved in tool selection, architecture, and key technical decisions",
        "Drive AI as a product, platform, and strategic capability across the business",
        "Manage expectations across leadership, board, and teams \u2014 communicating limitations, risks, and tradeoffs",
        "Design and lead AI transformation services, platforms, or strategic offerings",
        "Bridge technology, business goals, and market strategy to ensure AI delivers measurable impact",
        "Represent the company externally: investors, partners, customers, press, conferences, thought leadership",
        "Build and scale the AI organization: hiring executive-level AI leaders, defining org structure, setting culture",
        "Make major build-vs-buy-vs-partner decisions on AI capabilities and platforms",
        "Oversee AI governance, responsible AI practices, safety, and compliance at enterprise scale",
        "Continuously translate frontier AI advancements into competitive business advantage"
      ],
      "career_path_next": [
        "ceo",
        "cto",
        "board_director",
        "ai_investor_advisor"
      ],
      "typical_tools": [
        "executive strategy frameworks",
        "board-level communication tools",
        "AI platform overview (hands-on-adjacent)",
        "financial modeling for AI investment",
        "organizational design frameworks",
        "external communication platforms"
      ],
      "market_notes_israel": "VP AI and Chief AI Officer roles remain relatively rare in Israel compared to Head of AI \u2014 typically found at companies with 100+ employees, substantial AI investment, or AI as central to the product thesis. Examples of companies with this level: Nanit (Head of AI at VP-level scope), Moburst (VP of AI for agency services), Swimm (VP of Research for code AI), AI21, larger cybersecurity companies. Often the career progression is Senior AI Engineer \u2192 Head of AI \u2192 VP AI \u2192 Chief AI Officer, typically spanning 12-20+ years of AI/ML career. Required background: proven track record scaling AI teams (20+ engineers), multiple production AI systems deployed at scale, strategic business impact, ideally both IC excellence earlier in career and executive leadership experience later. Advanced degrees common (MSc/PhD). Compensation at the top of Israeli tech executive tier with significant equity. In non-product-AI companies undergoing AI transformation (banks, enterprises), the title is often 'Chief AI Officer' with stronger emphasis on transformation and governance over product development.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "ai_solutions_engineering_manager",
      "role_name": "AI Solutions Engineering Manager",
      "sector": "ai_ml",
      "seniority": "mid_to_senior",
      "description": "Hands-on leader managing a team of Solutions Engineers who implement AI-powered solutions for customers. Combines technical depth, customer-facing skills, and delivery operations. Owns delivery quality and customer outcomes, guides customers through complex AI transformations, and builds delivery processes and reusable assets. Sits between Engineering and Customer Success in many AI startups.",
      "typical_responsibilities": [
        "Lead, mentor, and grow a team of AI Solutions Engineers",
        "Own delivery quality and customer outcomes across multiple concurrent implementations",
        "Work closely with customers to understand their processes, challenges, and goals",
        "Help design AI-driven solutions, workflows, and agent systems tailored to customer needs",
        "Guide customers through transforming how their teams operate \u2014 not just implementing point solutions",
        "Step into complex or strategic customer engagements and drive them to success personally",
        "Set clear timelines, priorities, and delivery standards across projects",
        "Build and improve delivery processes, methodologies, best practices, and reusable assets",
        "Design internal tools, systems, and AI workflows that improve scalability and reduce manual delivery work",
        "Identify repeatable patterns and turn them into templates, reference architectures, and automations",
        "Act as escalation point for technical and customer-related challenges",
        "Collaborate closely with founders, product, and engineering to influence roadmap and product direction"
      ],
      "career_path_next": [
        "head_of_solutions_engineering",
        "vp_customer_success",
        "head_of_professional_services"
      ],
      "typical_tools": [
        "AI platforms (company-specific)",
        "LLM APIs",
        "agent frameworks",
        "project management tools (Asana, Jira, Linear)",
        "CRM systems",
        "customer analytics",
        "documentation platforms (Notion, Confluence)",
        "technical delivery tools"
      ],
      "market_notes_israel": "AI Solutions Engineering Manager is an emerging role category in Israel, found primarily at AI-native B2B startups that sell complex AI platforms to enterprise customers. The role is distinct from traditional Solutions Engineering Manager (pure pre-sales) in that AI Solutions Engineers often do significant post-sale implementation work as well \u2014 designing AI workflows, configuring agents, building customer-specific automations. Typical background: 5-8+ years in software engineering, solutions engineering, or technical delivery, with 2+ years leading teams. Strong candidates come from solutions engineering, technical account management, technical program management, or engineering management at SaaS companies. The role requires rare combination of hands-on technical ability (can still build when needed), customer-facing maturity, operational leadership, and interest in AI. Compensation strong with typically lower equity than pure engineering leadership but with performance/delivery bonuses. As the Israeli AI market matures and more AI platforms scale, this role is projected to grow significantly. Note: this role may eventually migrate to a dedicated Solutions Engineering sector when that is built.",
      "role_family": "AI_ML"
    },
    {
      "role_id": "junior_ux_ui_designer",
      "title": "Junior UX/UI Designer",
      "sector": "Design / UX",
      "seniority_level": "junior",
      "years_experience_typical": "1-3",
      "description": "Entry-level designer responsible for creating user interfaces and supporting the UX process under guidance from senior designers. Works on wireframes, mockups, and UI components while learning to apply user-centered design principles across web and mobile products.",
      "responsibilities": [
        "Create UI mockups and prototypes that illustrate how products function and look",
        "Design graphic elements, icons, and visual components for web and mobile products",
        "Assist with wireframing, user flows, and sitemaps",
        "Gather and evaluate user requirements in collaboration with product managers and engineers",
        "Conduct layout adjustments based on user feedback and usability testing",
        "Contribute to maintaining the design system and component libraries",
        "Prepare and present design drafts to internal teams and stakeholders",
        "Stay current with design trends, tools, and emerging technologies"
      ],
      "tools_commonly_used": [
        "Figma",
        "Adobe Creative Suite (Photoshop, Illustrator, XD)",
        "InVision",
        "Miro / FigJam",
        "Basic prototyping tools"
      ],
      "career_path": {
        "previous_roles": [
          "Design intern",
          "Visual design student",
          "Bootcamp graduate"
        ],
        "next_roles": [
          "Product Designer (UX/UI)",
          "UI Designer",
          "Brand / Marketing Designer"
        ]
      },
      "market_notes_israel": "Many Israeli startups combine UX and UI into a single designer role from the junior level. Standalone 'UX-only' or 'UI-only' junior positions are rare \u2014 companies expect full-stack design capabilities even at entry level. Design agencies and studios (e.g., Zemingo) offer a strong entry path with exposure to multiple product domains.",
      "role_family": "Design_UX",
      "seniority": "Entry"
    },
    {
      "role_id": "product_designer_ux_ui",
      "title": "Product Designer (UX/UI)",
      "sector": "Design / UX",
      "seniority_level": "mid",
      "years_experience_typical": "3-5",
      "description": "Owns end-to-end design for product features and experiences, from user research and wireframing through high-fidelity UI and developer handoff. Works closely with product managers, engineers, and stakeholders to translate complex requirements into intuitive, well-crafted user experiences across web and mobile platforms.",
      "responsibilities": [
        "Lead the end-to-end design process for product features \u2014 research, ideation, wireframes, prototyping, visual design, usability testing, and developer handoff",
        "Collaborate cross-functionally with product managers, engineers, analysts, and customer-facing teams",
        "Translate complex workflows and data-heavy systems into clean, intuitive interfaces",
        "Conduct user research, analyze behavioral data, and gather feedback to iterate on designs",
        "Maintain and contribute to the product design system for consistency across platforms",
        "Advocate for user-centered design decisions in product discussions",
        "Design for both web and mobile platforms with attention to responsive and adaptive patterns",
        "Make data-driven design decisions using KPIs, A/B testing, and performance metrics",
        "Stay current with design trends, tools, and emerging technologies including AI-assisted design workflows"
      ],
      "tools_commonly_used": [
        "Figma (components, auto-layout, prototyping)",
        "Adobe Creative Suite",
        "Miro / FigJam",
        "Prototyping tools (Principle, ProtoPie)",
        "Analytics platforms (Hotjar, FullStory, Amplitude)",
        "AI-assisted design tools (Figma Make, Claude, Cursor)"
      ],
      "career_path": {
        "previous_roles": [
          "Junior UX/UI Designer",
          "UI Designer",
          "Graphic Designer transitioning to product"
        ],
        "next_roles": [
          "Senior Product Designer",
          "Design System Lead",
          "UX Researcher (specialization)"
        ]
      },
      "market_notes_israel": "The most in-demand design role in the Israeli tech market. B2B SaaS and cybersecurity companies dominate hiring, creating strong demand for designers who can simplify complex, data-heavy systems. Proficiency in Figma is universally required. AI-assisted design workflows (Claude, Figma Make, Cursor) are increasingly listed as requirements, not just nice-to-haves. English fluency is expected, as most Israeli tech companies serve global markets.",
      "role_family": "Design_UX",
      "seniority": "Mid"
    },
    {
      "role_id": "senior_product_designer",
      "title": "Senior Product Designer",
      "sector": "Design / UX",
      "seniority_level": "senior",
      "years_experience_typical": "5-7",
      "description": "Experienced product designer who owns design for significant product areas with high autonomy. Takes full accountability for design quality, drives complex projects from discovery to delivery, and influences product strategy. Mentors junior designers and contributes to design culture and processes across the organization.",
      "responsibilities": [
        "Own the full design lifecycle for major product areas \u2014 from discovery and research through pixel-perfect delivery",
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
      "tools_commonly_used": [
        "Figma (expert \u2014 components, variants, auto-layout, design tokens)",
        "Prototyping tools (Principle, ProtoPie, Framer)",
        "User research tools (Maze, UserTesting, Hotjar)",
        "Analytics platforms (Amplitude, Mixpanel, FullStory)",
        "AI-assisted tools (Figma Make, Claude, Cursor)",
        "Adobe Creative Suite",
        "Basic HTML/CSS understanding"
      ],
      "career_path": {
        "previous_roles": [
          "Product Designer (UX/UI)",
          "UX Designer with 5+ years experience"
        ],
        "next_roles": [
          "Design Lead / Design Manager",
          "Design System Lead",
          "Head of Design / VP Design (in smaller companies)"
        ]
      },
      "market_notes_israel": "Senior Product Designers in Israel are expected to operate with high independence and full ownership of their design domain. The cybersecurity and enterprise SaaS sectors create particularly strong demand for designers experienced with data-heavy dashboards, complex workflows, and data visualization. Companies increasingly expect senior designers to leverage AI tools as part of their standard workflow.",
      "role_family": "Design_UX",
      "seniority": "Senior"
    },
    {
      "role_id": "ux_researcher",
      "title": "UX Researcher",
      "sector": "Design / UX",
      "seniority_level": "mid",
      "years_experience_typical": "3-5",
      "description": "Specializes in understanding user behaviors, needs, and motivations through qualitative and quantitative research methods. Plans and conducts user research studies, synthesizes findings into actionable insights, and partners with product and design teams to ensure user-centered decision-making across the product lifecycle.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "User research platforms (UserTesting, Maze, Lookback)",
        "Survey tools (Typeform, SurveyMonkey, Qualtrics)",
        "Analytics platforms (Amplitude, Mixpanel, FullStory, Hotjar)",
        "Figma (for annotating and collaborating on designs)",
        "Miro / FigJam (for workshops and affinity mapping)",
        "Data analysis tools (Excel, Google Sheets, basic SQL)",
        "Session recording tools (Hotjar, FullStory)"
      ],
      "career_path": {
        "previous_roles": [
          "Junior UX Researcher",
          "Product Designer with research focus",
          "Academic researcher (HCI, psychology, sociology) transitioning to industry"
        ],
        "next_roles": [
          "Senior UX Researcher",
          "Research Lead / Research Manager",
          "Head of UX Research",
          "Product Manager (research-driven transition)"
        ]
      },
      "market_notes_israel": "Standalone UX Researcher roles are relatively uncommon in the Israeli market. Most companies embed research responsibilities within the Product Designer role \u2014 designers are expected to conduct their own user research, usability testing, and data analysis. Dedicated UX Research positions tend to appear at larger companies (Wix, Monday.com, Fiverr) or in organizations with mature design teams. This creates an opportunity for research-minded designers to differentiate themselves, but candidates should expect to find fewer dedicated research openings than in the US market.",
      "role_family": "Design_UX",
      "seniority": "Mid"
    },
    {
      "role_id": "design_system_lead",
      "title": "Design System Lead",
      "sector": "Design / UX",
      "seniority_level": "senior",
      "years_experience_typical": "5-7",
      "description": "Owns the creation, governance, and evolution of the organization's design system \u2014 the shared language of components, patterns, tokens, and guidelines that ensures consistency and efficiency across all products. Works at the intersection of design and engineering, collaborating closely with developers to ensure design system adoption and scalable implementation.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "Figma (expert \u2014 components, variants, design tokens, auto-layout, branching)",
        "Storybook",
        "Design token management tools (Style Dictionary, Tokens Studio)",
        "Documentation platforms (Zeroheight, Notion, Confluence)",
        "Version control (basic Git understanding)",
        "Front-end frameworks awareness (React component structure)",
        "Accessibility testing tools"
      ],
      "career_path": {
        "previous_roles": [
          "Senior Product Designer with design system experience",
          "Product Designer with strong systems thinking",
          "Front-end developer transitioning to design"
        ],
        "next_roles": [
          "Design Lead / Design Manager",
          "Head of Design / VP Design",
          "Principal Designer"
        ]
      },
      "market_notes_israel": "Design System Lead is an emerging standalone role in the Israeli market, primarily found at mid-to-large companies with multiple product lines (BigID, Wix, Monday.com, Check Point). At smaller startups, design system responsibilities are typically distributed across senior designers. Companies scaling from 1-2 products to multi-product suites are the primary hiring market for this role.",
      "role_family": "Design_UX",
      "seniority": "Lead_Manager"
    },
    {
      "role_id": "design_lead_design_manager",
      "title": "Design Lead / Design Manager",
      "sector": "Design / UX",
      "seniority_level": "senior",
      "years_experience_typical": "7+",
      "description": "A hybrid player-coach who leads a small-to-medium design team while remaining hands-on with high-impact design work. Balances people management, design process ownership, and individual contribution. Partners with product and engineering leadership to shape product strategy and ensure design quality across the team's output.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "Figma (expert-level)",
        "Design management and collaboration tools",
        "Prototyping tools",
        "User research and analytics platforms",
        "AI-assisted design and development tools",
        "Project management tools (Jira, Linear, Asana)"
      ],
      "career_path": {
        "previous_roles": [
          "Senior Product Designer",
          "Design System Lead",
          "Staff Designer / Principal Designer"
        ],
        "next_roles": [
          "Head of Design / VP Design",
          "Director of Product Design",
          "CPO / VP Product (design-to-product leadership transition)"
        ]
      },
      "market_notes_israel": "Design Lead/Manager roles in Israel are almost universally hybrid IC-manager positions \u2014 companies expect leaders to remain deeply hands-on while managing their team. Pure people-management design roles are rare outside of the largest companies. Strong market demand from B2B SaaS companies scaling their design teams. AI-augmented design workflows are increasingly expected \u2014 leaders are expected to implement AI tools that streamline the design-to-development pipeline.",
      "role_family": "Design_UX",
      "seniority": "Lead_Manager"
    },
    {
      "role_id": "head_of_design_vp_design",
      "title": "Head of Design / VP Design",
      "sector": "Design / UX",
      "seniority_level": "executive",
      "years_experience_typical": "10+",
      "description": "Executive design leader who owns the end-to-end product design vision and strategy for the organization. Reports to CPO, CEO, or VP Product. Manages design leads and individual contributors, sets the quality bar, builds design culture, and ensures design is a strategic function that drives business outcomes. May also own brand expression and marketing design functions.",
      "responsibilities": [
        "Own and drive the end-to-end product design vision across all user-facing experiences",
        "Inspire, coach, and manage a multidisciplinary design team including design leads and individual contributors",
        "Collaborate with product, engineering, and data leadership to shape product strategy",
        "Build and scale design systems, tooling, and processes for consistency, quality, and efficiency",
        "Champion the voice of the user across the organization \u2014 combining research, UX best practices, and business context",
        "Recruit, hire, and develop top-tier design talent",
        "Elevate design as a strategic function, articulating how product experiences drive business outcomes",
        "Establish AI-forward design workflows and practices across the design organization",
        "Own brand expression and visual identity across product and marketing surfaces",
        "Present design strategy to executive leadership, board, and external stakeholders",
        "Define and maintain cross-product UX patterns, navigation, and visual style guidelines"
      ],
      "tools_commonly_used": [
        "Figma",
        "Design management and portfolio tools",
        "Presentation tools (Keynote, Google Slides)",
        "Analytics and research platforms",
        "AI tools for design acceleration",
        "Strategic planning tools"
      ],
      "career_path": {
        "previous_roles": [
          "Design Lead / Design Manager",
          "Director of Product Design",
          "Principal Designer / Staff Designer"
        ],
        "next_roles": [
          "CPO / Chief Product Officer",
          "VP Product",
          "CEO / Founder (design-led company)",
          "Design executive at larger organization"
        ]
      },
      "market_notes_israel": "Head of Design / VP Design roles in Israel typically require ownership of both product design and brand/marketing design functions. The role often reports to CPO or CEO. AI-first design vision is becoming a key requirement \u2014 leaders are expected to establish AI-forward design practices and workflows. Companies at Series B+ with 50-500 employees are the primary hiring market. The role is increasingly expected to own how the company communicates its story visually, not just how the product looks and works.",
      "role_family": "Design_UX",
      "seniority": "Director_Head"
    },
    {
      "role_id": "brand_marketing_designer",
      "title": "Brand / Marketing Designer",
      "sector": "Design / UX",
      "seniority_level": "mid",
      "years_experience_typical": "3-5",
      "description": "Owns the visual identity and creative execution of a company's brand across marketing channels and touchpoints. Creates marketing campaigns, digital assets, sales materials, website graphics, social media content, and event branding. Combines strong visual craft with brand strategy thinking to ensure consistent, compelling brand expression that drives business goals.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "Figma",
        "Adobe Creative Suite (Photoshop, Illustrator, InDesign)",
        "After Effects / Premiere Pro (basic motion design)",
        "Generative AI tools (Midjourney, DALL\u00b7E, Adobe Firefly)",
        "Website builders (Webflow, Elementor)",
        "Presentation tools (Google Slides, Keynote, PowerPoint)",
        "Social media design tools (Canva for quick iterations)"
      ],
      "career_path": {
        "previous_roles": [
          "Junior Graphic Designer",
          "Visual Designer",
          "Marketing Design intern"
        ],
        "next_roles": [
          "Senior Brand Designer",
          "Creative Lead / Art Director",
          "Marketing Design Team Lead",
          "Head of Brand / Creative Director"
        ]
      },
      "market_notes_israel": "Strong demand in the Israeli tech market, driven by B2B SaaS companies that need to communicate complex technical products through clear, compelling brand visuals. The role is distinct from Product Designer \u2014 it's marketing-facing rather than product-facing, with a focus on campaigns, sales materials, and brand consistency rather than product UX flows. Companies increasingly require proficiency in generative AI tools (Midjourney, Firefly) as a core competency, not just a nice-to-have. Motion design skills (After Effects) are a strong differentiator.",
      "role_family": "Design_UX",
      "seniority": "Mid"
    },
    {
      "role_id": "bdr_bd_associate",
      "title": "BDR / BD Associate",
      "sector": "Business Development / Partnerships",
      "seniority_level": "junior",
      "years_experience_typical": "0-2",
      "description": "Entry-level outbound sales development role focused on generating qualified pipeline for the sales team. Initiates contact with potential customers through cold calling, email outreach, and social selling. Qualifies inbound leads, conducts initial discovery conversations, and hands off qualified opportunities to Account Executives.",
      "responsibilities": [
        "Generate new business pipeline through outbound prospecting \u2014 cold calls, email sequences, and LinkedIn outreach",
        "Qualify inbound leads generated by marketing and convert interest into sales-ready meetings",
        "Conduct initial discovery calls to understand prospect pain points and assess fit",
        "Research target accounts and identify key decision-makers and stakeholders",
        "Coordinate with Account Executives on handoff and first-call preparation",
        "Maintain accurate activity tracking and contact information in CRM (Salesforce, HubSpot)",
        "Collaborate with marketing to refine targeting, messaging, and campaign effectiveness",
        "Meet or exceed activity and pipeline generation targets consistently",
        "Develop product knowledge to effectively communicate value propositions"
      ],
      "tools_commonly_used": [
        "Salesforce / HubSpot CRM",
        "Outreach / Salesloft (sales engagement)",
        "LinkedIn Sales Navigator",
        "ZoomInfo / Apollo (prospecting data)",
        "AI-powered outbound tools (Claude Code, LLM-based automation)",
        "Slack / Teams (internal collaboration)"
      ],
      "career_path": {
        "previous_roles": [
          "Sales intern",
          "Customer service representative",
          "University graduate (business, communications)"
        ],
        "next_roles": [
          "Business Development Manager",
          "Account Executive (Sales sector)",
          "Partnerships Manager"
        ]
      },
      "market_notes_israel": "BDR roles in Israel overwhelmingly serve US-market companies, requiring fluent English and willingness to work US hours. AI-powered outbound workflows (using Claude Code, LLM APIs for personalized sequencing) are increasingly listed as requirements, not just nice-to-haves. The role is a proven entry point into tech careers for Reichman business graduates, with clear progression paths into BD management, AE roles, or partnerships.",
      "role_family": "BD_Partnerships",
      "seniority": "Entry"
    },
    {
      "role_id": "business_development_manager",
      "title": "Business Development Manager",
      "sector": "Business Development / Partnerships",
      "seniority_level": "mid",
      "years_experience_typical": "2-5",
      "description": "Drives net-new business growth by researching, pursuing, and developing new business relationships. Manages a portfolio of prospects and early-stage partnerships, negotiates commercial terms, and works cross-functionally to deliver on revenue targets. Combines outbound hunting with relationship management and data-driven decision-making.",
      "responsibilities": [
        "Research, identify, and develop new business opportunities and long-term relationships",
        "Manage a revenue portfolio and achieve business development targets",
        "Negotiate commercial terms using analytical data and market intelligence",
        "Lead the full business development cycle \u2014 from opportunity identification to deal closure",
        "Build relationships with key stakeholders and decision-makers at target organizations",
        "Advance and expand opportunities within existing relationships",
        "Conduct market research, competitive analysis, and gather customer insights",
        "Collaborate with marketing, product, and sales teams to align strategies",
        "Lead presentations, product demos, and business review meetings",
        "Manage CRM pipeline and provide accurate forecasting and reporting"
      ],
      "tools_commonly_used": [
        "Salesforce / HubSpot CRM",
        "LinkedIn Sales Navigator",
        "Excel / Google Sheets (financial modeling, ROI analysis)",
        "Outreach / Salesloft",
        "Presentation tools (Google Slides, PowerPoint)",
        "Data analytics tools (Looker, Tableau)"
      ],
      "career_path": {
        "previous_roles": [
          "BDR / BD Associate",
          "Account Executive",
          "Sales Development Representative"
        ],
        "next_roles": [
          "Senior BD Manager / Strategic Partnerships Manager",
          "Partnerships Manager",
          "Head of BD / Head of Partnerships"
        ]
      },
      "market_notes_israel": "BD Manager roles in Israel span multiple industries \u2014 ad-tech, performance marketing, SaaS, cybersecurity, and fintech are the most active hiring segments. Many roles require managing global portfolios (US, Europe) and working across time zones. Data-driven decision-making and analytical skills are consistently emphasized alongside relationship-building abilities. Performance marketing and ad-tech companies often blend BD with account management responsibilities.",
      "role_family": "BD_Partnerships",
      "seniority": "Mid"
    },
    {
      "role_id": "partnerships_manager",
      "title": "Partnerships Manager",
      "sector": "Business Development / Partnerships",
      "seniority_level": "mid",
      "years_experience_typical": "3-5",
      "description": "Manages and grows an ecosystem of partners \u2014 channel partners, technology alliances, affiliates, or strategic integrators. Owns the partner lifecycle from onboarding through ongoing relationship management, joint business planning, and revenue optimization. Acts as the voice of the partner internally and ensures mutual value creation.",
      "responsibilities": [
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
        "Act as the partner advocate internally \u2014 communicating needs and feedback to product and leadership"
      ],
      "tools_commonly_used": [
        "Salesforce / HubSpot CRM",
        "Partner management platforms",
        "Excel / Google Sheets (performance analysis, financial modeling)",
        "Presentation tools (Google Slides, PowerPoint)",
        "Project management tools (Asana, Monday.com)",
        "Analytics and BI tools"
      ],
      "career_path": {
        "previous_roles": [
          "BDR / BD Associate",
          "Account Manager",
          "Business Development Manager",
          "Customer Success Manager"
        ],
        "next_roles": [
          "Senior BD Manager / Strategic Partnerships Manager",
          "Head of BD / Head of Partnerships",
          "Channel Sales Manager (Sales sector)"
        ]
      },
      "market_notes_israel": "Partnerships Manager is a growing role in the Israeli market, especially in SaaS companies building channel and ecosystem strategies. The role is distinct from BD Manager \u2014 focused on managing existing partner relationships and maximizing mutual value rather than hunting net-new business. Companies in IT management (Atera), mobile gaming (Sett), affiliate marketing, and fintech are active hirers. Partner management increasingly requires technical fluency to coordinate integrations and co-selling motions.",
      "role_family": "BD_Partnerships",
      "seniority": "Mid"
    },
    {
      "role_id": "senior_bd_manager_strategic_partnerships",
      "title": "Senior BD Manager / Strategic Partnerships Manager",
      "sector": "Business Development / Partnerships",
      "seniority_level": "senior",
      "years_experience_typical": "5-7",
      "description": "Leads high-value, complex business development and strategic partnership initiatives. Manages enterprise-level relationships, builds partner ecosystems, and drives significant revenue through strategic alliances and channel development. Operates at the intersection of business strategy, partner management, and cross-functional leadership.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "Salesforce CRM",
        "LinkedIn Sales Navigator",
        "Excel / Google Sheets (advanced financial modeling)",
        "BI and analytics tools (Tableau, Looker)",
        "Presentation tools",
        "Contract management tools",
        "Project management platforms"
      ],
      "career_path": {
        "previous_roles": [
          "Business Development Manager",
          "Partnerships Manager",
          "Account Executive / Senior AE"
        ],
        "next_roles": [
          "Head of BD / Head of Partnerships",
          "VP Business Development",
          "General Manager / Country Manager"
        ]
      },
      "market_notes_israel": "Senior BD and Strategic Partnerships roles in Israel increasingly require experience building partner ecosystems from the ground up, not just managing existing relationships. Cloud, SaaS, and cybersecurity companies are the most active hirers. The role often involves significant international travel and managing relationships across US and European markets. Companies expect a blend of strategic thinking and hands-on execution \u2014 pure strategy roles without deal-closing responsibility are rare.",
      "role_family": "BD_Partnerships",
      "seniority": "Senior"
    },
    {
      "role_id": "head_of_bd_head_of_partnerships",
      "title": "Head of BD / Head of Partnerships",
      "sector": "Business Development / Partnerships",
      "seniority_level": "senior",
      "years_experience_typical": "7-10",
      "description": "Owns the business development or partnerships function for the organization. Designs and executes the BD/partnership strategy, builds and leads the team, and drives significant revenue through net-new business, partner ecosystems, and strategic alliances. Reports to VP Sales, CRO, or CEO. Responsible for pipeline generation, team performance, and cross-functional GTM alignment.",
      "responsibilities": [
        "Design and execute the company's business development or partnership strategy",
        "Build, lead, and scale a high-performing BD/SDR/partnerships team",
        "Own pipeline generation targets and consistently deliver against revenue objectives",
        "Develop and manage strategic partnerships with investors, accelerators, ecosystem players, and technology vendors",
        "Personally engage in key deals and high-value strategic relationships",
        "Establish and optimize outbound strategy \u2014 messaging, sequencing, targeting, and channels",
        "Implement performance management systems, coaching frameworks, and career development paths",
        "Partner with marketing on lead scoring, campaign attribution, and demand generation alignment",
        "Drive cross-functional alignment between sales, marketing, product, and customer success",
        "Recruit, onboard, and develop BD/partnerships talent",
        "Own CRM discipline, reporting, and forecasting accuracy",
        "Represent the company at industry events, conferences, and executive forums",
        "Own and grow referral partner channels and strategic vendor relationships"
      ],
      "tools_commonly_used": [
        "Salesforce / HubSpot CRM",
        "Sales engagement platforms (Outreach, Salesloft)",
        "LinkedIn Sales Navigator",
        "ZoomInfo / Clay (prospecting intelligence)",
        "Analytics and BI tools",
        "AI-powered prospecting tools",
        "Revenue intelligence platforms"
      ],
      "career_path": {
        "previous_roles": [
          "Senior BD Manager / Strategic Partnerships Manager",
          "Director of Sales Development",
          "Director of Partnerships"
        ],
        "next_roles": [
          "VP Business Development",
          "VP Sales / CRO",
          "General Manager / Country Manager",
          "CEO / Founder"
        ]
      },
      "market_notes_israel": "Head of BD/Partnerships roles in Israel often combine two functions that larger US companies split: SDR/BDR team leadership and strategic partnership development. Companies expect leaders who can both build the outbound engine (hire, coach, set processes) and personally drive executive-level relationships. The role is a strong stepping stone to VP-level positions or general management. Ecosystem-building experience (VC relationships, accelerator partnerships, startup community engagement) is highly valued in the Israeli market.",
      "role_family": "BD_Partnerships",
      "seniority": "Director_Head"
    },
    {
      "role_id": "vp_business_development",
      "title": "VP Business Development",
      "sector": "Business Development / Partnerships",
      "seniority_level": "executive",
      "years_experience_typical": "10+",
      "description": "Executive leader who owns the global business development, partnerships, and/or channel strategy for the organization. Defines and executes growth strategies across markets, builds and scales global partner ecosystems, and drives significant revenue impact. Reports to CEO, CRO, or President. Shapes company strategy at the executive level and represents the organization in high-stakes engagements.",
      "responsibilities": [
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
      "tools_commonly_used": [
        "Salesforce CRM",
        "Executive dashboards and BI tools",
        "Revenue intelligence platforms",
        "Presentation tools (Keynote, Google Slides)",
        "Strategic planning tools",
        "Contract and deal management platforms"
      ],
      "career_path": {
        "previous_roles": [
          "Head of BD / Head of Partnerships",
          "Director of Strategic Partnerships",
          "VP Sales (transitioning to BD focus)",
          "Senior Director of Business Development"
        ],
        "next_roles": [
          "CRO / Chief Revenue Officer",
          "General Manager / President",
          "CEO / Founder",
          "Board Advisor"
        ]
      },
      "market_notes_israel": "VP BD roles in Israel are concentrated in growth-stage and late-stage companies (Series B+) with global ambitions. The role requires deep international experience \u2014 managing partnerships across US, European, and APAC markets. Cybersecurity, cloud infrastructure, SaaS, and defense technology companies are the primary hirers. Israeli companies increasingly expect VPs to have experience building channel programs and strategic alliances with major technology vendors (Cisco, AWS, Palo Alto Networks, etc.). Travel is typically 30-50% of the time.",
      "role_family": "BD_Partnerships",
      "seniority": "VP_Executive"
    },
    {
      "role_id": "junior_consultant_analyst",
      "title": "Junior Consultant / Analyst",
      "sector": "Consulting",
      "seniority_level": "junior",
      "description": "Entry-level consulting role focused on research, data analysis, and supporting senior consultants on client engagements. Analysts gather information, build models, prepare deliverables, and begin developing client-facing skills. Common entry point from Big 4 firms (Deloitte, EY, KPMG, PwC) and strategy boutiques.",
      "responsibilities": [
        "Conduct market research, competitive analysis, and industry benchmarking to support engagement deliverables",
        "Gather, clean, and analyze data from financial reports, operational systems, and interviews",
        "Prepare presentations, reports, and client-ready documentation under senior guidance",
        "Support risk assessments, compliance reviews, and internal audit projects",
        "Participate in client workshops, interviews, and discovery sessions",
        "Assist in developing process flowcharts, risk matrices, and control documentation",
        "Contribute to proposal and pitch development for new engagements",
        "Document findings, maintain project files, and track action items"
      ],
      "typical_tools": [
        "Microsoft Excel (advanced)",
        "PowerPoint",
        "Word",
        "SQL (basic)",
        "Tableau / Power BI (basic)",
        "Salesforce / CRM systems",
        "Project management tools (Jira, Asana, Monday)"
      ],
      "career_paths": {
        "next_in_track": [
          "consultant"
        ],
        "exit_opportunities": [
          "Business Analyst",
          "FP&A Analyst",
          "Operations Analyst / Coordinator",
          "Product Analyst",
          "RevOps Analyst",
          "Data Analyst",
          "Customer Success Associate",
          "HR Generalist"
        ]
      },
      "market_notes_israel": "Strong entry-level pipeline from Reichman, TAU, HUJI, and Technion into Big 4 firms (Deloitte, EY, KPMG, PwC) and Israeli strategy boutiques (Shaldor, Tefen, Pareto). Many roles require a BA/BSc in economics, business administration, industrial engineering, or accounting. Big 4 firms often hire cohorts annually. CPA is a strong advantage for risk/audit tracks. 2-3 year tenure is standard before first exit opportunity.",
      "keywords": [
        "analyst",
        "junior consultant",
        "big 4",
        "entry level consulting",
        "risk analyst",
        "strategy analyst",
        "audit"
      ],
      "role_family": "Consulting",
      "seniority": "Entry"
    },
    {
      "role_id": "consultant",
      "title": "Consultant",
      "sector": "Consulting",
      "seniority_level": "mid",
      "description": "Mid-level consulting professional who owns workstreams within client engagements. Consultants lead specific analyses, manage day-to-day client interactions for their workstream, and begin developing expertise in a domain (strategy, risk, digital transformation, M&A). They translate complex problems into structured approaches and deliver actionable recommendations.",
      "responsibilities": [
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
      "typical_tools": [
        "Microsoft Excel (advanced modeling)",
        "PowerPoint",
        "SQL",
        "Tableau / Power BI",
        "ERP systems (SAP, NetSuite, Zuora)",
        "GRC platforms",
        "NIST CSF / ISO 27001 / COSO frameworks",
        "Project management tools"
      ],
      "career_paths": {
        "next_in_track": [
          "senior_consultant"
        ],
        "exit_opportunities": [
          "Strategy & Operations Manager",
          "Business Operations Manager",
          "Product Manager",
          "Finance Manager",
          "Customer Success Manager",
          "RevOps Manager",
          "Chief of Staff (startup)",
          "HRBP"
        ]
      },
      "market_notes_israel": "Mid-level consultants in Israel typically have 2-5 years of experience. Big 4 firms promote from Analyst to Consultant after 2-3 years. This is the most common exit point to tech companies \u2014 Israeli startups and scale-ups actively recruit from Big 4 consulting into operations, strategy, and product roles. M&A and financial due diligence consultants are in high demand given Israel's active tech M&A market. Hebrew and English fluency expected across all firms.",
      "keywords": [
        "consultant",
        "risk management",
        "compliance",
        "strategy",
        "due diligence",
        "financial consulting",
        "transformation"
      ],
      "role_family": "Consulting",
      "seniority": "Mid"
    },
    {
      "role_id": "senior_consultant",
      "title": "Senior Consultant",
      "sector": "Consulting",
      "seniority_level": "senior",
      "description": "Senior consulting professional who leads client engagements end-to-end, manages small teams, and serves as a trusted advisor to senior client stakeholders. Responsible for engagement scoping, delivery quality, and client relationship management. Develops deep domain expertise and begins contributing to practice development and business development.",
      "responsibilities": [
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
      "typical_tools": [
        "Advanced financial modeling (Excel)",
        "BI and analytics tools (Tableau, Power BI)",
        "ERP systems",
        "GRC and audit platforms",
        "CRM systems (Salesforce)",
        "Industry frameworks (NIST, ISO, COSO, SOX)",
        "Presentation and documentation tools",
        "AI-powered analysis tools"
      ],
      "career_paths": {
        "next_in_track": [
          "consulting_manager"
        ],
        "exit_opportunities": [
          "Head of Operations",
          "VP Strategy",
          "Chief of Staff",
          "Director of Product",
          "VP Finance",
          "Head of RevOps",
          "Head of Business Development",
          "Startup founder / COO"
        ]
      },
      "market_notes_israel": "Senior Consultants in Israel typically have 5-8 years of experience. At Big 4 firms, this maps to Senior Associate or Manager level. Strong demand for senior consultants with technology transformation expertise, particularly in AI, cloud, and cybersecurity domains. Business development capability becomes essential at this level \u2014 firms expect senior consultants to contribute to pipeline. Exit into Israeli tech as Head of Ops, Chief of Staff, or VP-level roles is common. KPMG, Deloitte, and EY Israel all have active digital transformation practices at this level.",
      "keywords": [
        "senior consultant",
        "engagement lead",
        "trusted advisor",
        "digital transformation",
        "risk assessment",
        "client leadership",
        "business development"
      ],
      "role_family": "Consulting",
      "seniority": "Senior"
    },
    {
      "role_id": "consulting_manager",
      "title": "Manager / Engagement Manager",
      "sector": "Consulting",
      "seniority_level": "lead",
      "description": "Manages multiple concurrent client engagements, leads teams, and drives practice growth. Engagement Managers are accountable for delivery quality across their portfolio, manage client relationships at the executive level, and play a significant role in business development and sales. They bridge the gap between delivery execution and practice strategy.",
      "responsibilities": [
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
      "typical_tools": [
        "CRM and pipeline management (Salesforce)",
        "Financial modeling and analysis tools",
        "BI platforms (Tableau, Power BI)",
        "Project portfolio management tools",
        "ERP and enterprise systems",
        "Industry frameworks and audit methodologies",
        "Proposal and RFP response tools",
        "AI and automation tools for consulting delivery"
      ],
      "career_paths": {
        "next_in_track": [
          "principal_director_consulting"
        ],
        "exit_opportunities": [
          "VP Operations",
          "COO",
          "VP Strategy",
          "General Manager",
          "Head of Professional Services",
          "Managing Director (tech company)",
          "Startup CEO / Co-founder"
        ]
      },
      "market_notes_israel": "Manager / Engagement Manager level typically requires 7-10+ years of experience. At Big 4 firms in Israel, this is the Senior Manager level. Business development becomes a core competency \u2014 managers are expected to sell and deliver. Strong exit path into VP-level roles at Israeli tech companies, particularly into operations, strategy, and professional services leadership. The Israeli market's relatively small size means managers often manage both local and international client portfolios. Fluency in Hebrew and English is mandatory; additional languages are an advantage for EMEA-facing engagements.",
      "keywords": [
        "engagement manager",
        "consulting manager",
        "practice lead",
        "business development",
        "portfolio management",
        "client executive",
        "P&L management"
      ],
      "role_family": "Consulting",
      "seniority": "Lead_Manager"
    },
    {
      "role_id": "principal_director_consulting",
      "title": "Principal / Director of Consulting",
      "sector": "Consulting",
      "seniority_level": "director",
      "description": "Practice leader responsible for building and growing a consulting practice or domain. Principals and Directors own P&L for their practice area, set strategic direction, develop go-to-market strategy, and manage the most complex and high-value client relationships. They are the firm's external face in their domain and drive thought leadership.",
      "responsibilities": [
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
      "typical_tools": [
        "CRM and enterprise sales tools (Salesforce)",
        "Financial planning and analysis tools",
        "BI and executive dashboarding",
        "Proposal and contract management tools",
        "Industry analyst platforms (Gartner, Forrester)",
        "AI strategy and governance frameworks"
      ],
      "career_paths": {
        "next_in_track": [],
        "exit_opportunities": [
          "COO",
          "CEO",
          "Managing Partner",
          "Board advisor",
          "Chief Strategy Officer",
          "VP / SVP at enterprise tech company",
          "Startup founder"
        ]
      },
      "market_notes_israel": "Principal / Director level at Big 4 firms in Israel is Partner or Associate Partner. The Israeli consulting market is concentrated \u2014 a small number of firms dominate, so principals at this level typically have strong personal networks across Israel's tech and finance ecosystems. Growing demand for practice leaders with AI, cybersecurity, and digital transformation expertise. Some firms (KPMG, Deloitte) are actively building AI consulting practices in Israel, creating new Director-level opportunities. International experience and global firm network access are significant differentiators.",
      "keywords": [
        "principal consultant",
        "director of consulting",
        "partner",
        "practice leader",
        "managing consultant",
        "thought leader",
        "P&L owner"
      ],
      "role_family": "Consulting",
      "seniority": "Director_Head"
    },
    {
      "role_id": "solutions_engineer_junior",
      "title": "Junior Solutions Engineer",
      "alternative_titles": [
        "Associate Solutions Engineer",
        "Support Solutions Engineer",
        "Junior Pre-Sales Engineer",
        "Technical Solutions Associate",
        "Product Experience Engineer"
      ],
      "sector": "Solutions Engineering / Technical Pre-Sales",
      "seniority_level": "junior",
      "description": "Entry-level technical customer-facing role that supports the sales cycle and post-sale implementation by providing hands-on technical guidance, troubleshooting, and solution validation. Acts as the first line of technical engagement with customers, handling integrations, product configurations, and technical support escalations.",
      "key_responsibilities": [
        "Provide technical support and guidance during customer onboarding and implementation",
        "Troubleshoot product issues, investigate logs, and resolve technical problems",
        "Assist with API integrations and platform configurations for customers",
        "Support proof-of-concept (POC) execution and technical validation",
        "Create and maintain technical documentation, knowledge bases, and FAQs",
        "Develop custom scripts and workarounds to solve customer-specific challenges",
        "Collaborate with R&D, Product, and Support teams on issue resolution and feature requests",
        "Deliver basic product demos and technical walkthroughs to customers"
      ],
      "required_skills": [
        "Technical troubleshooting and debugging",
        "API integrations and technical documentation",
        "Customer-facing communication and relationship management",
        "Web technologies (JavaScript, HTML, CSS) or scripting languages",
        "SQL and database querying",
        "Problem-solving and root cause analysis"
      ],
      "common_tools": [
        "Postman",
        "JIRA",
        "Developer Tools (browser)",
        "SQL clients",
        "Git",
        "Zendesk/Freshdesk",
        "Salesforce",
        "Slack"
      ],
      "career_paths": {
        "next_roles": [
          "Solutions Engineer",
          "Technical Account Manager",
          "Customer Success Engineer"
        ],
        "lateral_moves": [
          "Junior Software Engineer",
          "QA Engineer",
          "Technical Support Lead",
          "Product Specialist"
        ],
        "long_term": [
          "Senior Solutions Engineer",
          "Solutions Engineering Manager",
          "Product Manager"
        ]
      },
      "typical_experience": "0-3 years in a technical customer-facing role or software development",
      "education": "Bachelor's degree in Computer Science, Information Systems, Industrial Engineering, or equivalent practical experience",
      "market_notes_israel": "Many Israeli companies (EasySend, WalkMe, Riskified) hire junior SEs under titles like 'Support Solutions Engineer', 'Product Experience Engineer', or 'Customer Success Engineer'. The role often blends technical support with light pre-sales. JavaScript/web proficiency is commonly required given the SaaS-heavy market. Defense/intelligence sector has its own pre-sales track with different requirements (security clearance, military background).",
      "role_family": "Solutions_Engineering",
      "seniority": "Entry"
    },
    {
      "role_id": "solutions_engineer",
      "title": "Solutions Engineer",
      "alternative_titles": [
        "Pre-Sales Engineer",
        "Sales Engineer",
        "Technical Solutions Consultant",
        "Solution Expert",
        "Customer Success Engineer",
        "Presales Engineer"
      ],
      "sector": "Solutions Engineering / Technical Pre-Sales",
      "seniority_level": "mid",
      "description": "Core individual contributor who owns the technical relationship with customers throughout the sales cycle and beyond. Combines deep product knowledge with consultative selling skills to translate customer business problems into technical solutions, run POCs, lead technical discovery, and drive technical wins. Often the bridge between Sales, Product, and R&D.",
      "key_responsibilities": [
        "Lead technical discovery sessions to understand customer environments, pain points, and requirements",
        "Design and present tailored solutions that map product capabilities to customer business outcomes",
        "Execute and manage proof-of-concept engagements and technical validations",
        "Deliver product demos, technical workshops, and whiteboarding sessions to technical and executive audiences",
        "Own the technical onboarding of new customers, including CRM integrations, API setups, and data workflows",
        "Act as the technical subject matter expert during the sales cycle, supporting Account Executives",
        "Troubleshoot complex technical issues and build custom implementations using APIs, webhooks, and middleware",
        "Provide internal feedback to Product and Engineering based on field requirements and customer pain points",
        "Respond to technical portions of RFIs, RFPs, and RFQs",
        "Build and maintain relationships with technical stakeholders at customer organizations"
      ],
      "required_skills": [
        "Technical discovery and consultative selling",
        "Solution design and architecture",
        "Product demonstration and presentation skills",
        "API and integration expertise",
        "Customer relationship management",
        "Cross-functional collaboration with Sales, Product, and R&D",
        "Project management and POC execution",
        "Written and verbal business communication"
      ],
      "common_tools": [
        "Postman",
        "Salesforce/HubSpot",
        "SQL clients",
        "Zapier/Make/Workato",
        "JIRA",
        "Confluence",
        "Slack",
        "Zoom/Teams",
        "Git",
        "Developer Tools"
      ],
      "career_paths": {
        "next_roles": [
          "Senior Solutions Engineer",
          "Solutions Engineering Manager",
          "Technical Account Manager (Senior)"
        ],
        "lateral_moves": [
          "Product Manager",
          "Customer Success Manager (Technical)",
          "Sales Operations Manager",
          "Business Development Manager"
        ],
        "long_term": [
          "Head of Solutions Engineering",
          "VP Solutions Engineering",
          "Field CTO",
          "VP Sales"
        ]
      },
      "typical_experience": "3-5 years in a customer-facing technical role (SE, pre-sales, sales engineering, TAM) or equivalent software engineering experience with customer exposure",
      "education": "Bachelor's degree in Computer Science, Engineering, Information Systems, or equivalent practical experience",
      "market_notes_israel": "The most common SE title in the Israeli market. Companies like Lusha, Entro, Riskified, and Logz.io all hire for this profile. Israeli SEs frequently cover both pre-sale and post-sale technical engagement (unlike the US where these are often split). Hebrew + English fluency typically required. Many roles blend SE with integration engineering \u2014 hands-on API work and middleware (Zapier, Workato) are common expectations. B2B SaaS dominates, with data/observability, cybersecurity, and fintech being the most active verticals.",
      "role_family": "Solutions_Engineering",
      "seniority": "Mid"
    },
    {
      "role_id": "senior_solutions_engineer",
      "title": "Senior Solutions Engineer",
      "alternative_titles": [
        "Senior Pre-Sales Engineer",
        "Senior Sales Engineer",
        "Principal Solutions Engineer",
        "Solutions Architect",
        "AI Solutions Director",
        "Senior Presales Systems Engineer"
      ],
      "sector": "Solutions Engineering / Technical Pre-Sales",
      "seniority_level": "senior",
      "description": "Seasoned technical sales professional who handles the most complex, strategic, and high-value customer engagements. Combines deep domain expertise with advanced solution architecture skills to design enterprise-grade solutions, influence product roadmaps, and serve as a trusted advisor to senior technical and executive stakeholders. Often specializes in a technical domain (data/AI, security, networking, cloud infrastructure).",
      "key_responsibilities": [
        "Own the technical engagement for enterprise and strategic accounts from discovery through deployment",
        "Design end-to-end solution architectures aligned to complex customer requirements",
        "Present technology vision and roadmap to C-level executives and senior technical leaders",
        "Lead complex, multi-stakeholder POCs and technical evaluations against competitors",
        "Create technical champions within customer organizations to drive deal progression",
        "Build reusable technical assets: reference architectures, demo applications, best practices guides",
        "Develop ROI-driven value propositions using performance metrics and business impact analysis",
        "Mentor junior and mid-level Solutions Engineers",
        "Represent the company at industry events, conferences, and technical workshops",
        "Influence product roadmap by communicating field requirements and competitive insights to Product and Engineering",
        "Articulate competitive differentiation against specific competitors in technical evaluations"
      ],
      "required_skills": [
        "Enterprise solution architecture and design",
        "Executive-level presentation and communication",
        "Deep domain expertise in a technical vertical",
        "Competitive analysis and positioning",
        "Complex sales cycle management",
        "Mentoring and knowledge transfer",
        "Technical content creation (reference architectures, whitepapers)",
        "Business value and ROI articulation"
      ],
      "common_tools": [
        "Postman",
        "Salesforce",
        "SQL/Python",
        "Cloud consoles (AWS/GCP/Azure)",
        "CI/CD tools",
        "JIRA/Confluence",
        "Presentation tools",
        "Monitoring/observability platforms",
        "Data platforms (Snowflake, Databricks, etc.)"
      ],
      "career_paths": {
        "next_roles": [
          "Solutions Engineering Manager",
          "Field CTO",
          "Principal Solutions Architect"
        ],
        "lateral_moves": [
          "Senior Product Manager",
          "Technical Program Manager",
          "Enterprise Account Executive",
          "Customer Engineering Lead"
        ],
        "long_term": [
          "Head of Solutions Engineering",
          "VP Solutions Engineering",
          "CTO",
          "VP Sales"
        ]
      },
      "typical_experience": "5-8+ years in solutions engineering, pre-sales, or technical customer-facing roles with domain specialization",
      "education": "Bachelor's degree in Computer Science, Engineering, or related field. Master's degree or relevant certifications (cloud, security, data) are advantageous.",
      "market_notes_israel": "Senior SE roles in Israel often carry global or regional (EMEA) scope. Companies like Snowflake, Databricks, Akamai, and HPE hire senior SEs in Israel with deep domain expertise (data platforms, networking, cybersecurity, zero trust). Hebrew fluency is typically required for Israel-focused territories. Many senior SEs specialize: data/analytics, security, networking, or AI/ML. The 'trusted advisor' expectation is strong \u2014 Israeli enterprise buyers expect SEs who can go deep technically and also speak business. Travel requirements (15-30%) are common for enterprise accounts.",
      "role_family": "Solutions_Engineering",
      "seniority": "Senior"
    },
    {
      "role_id": "solutions_engineering_manager",
      "title": "Solutions Engineering Manager",
      "alternative_titles": [
        "SE Team Lead",
        "Pre-Sales Team Lead",
        "Onboarding Team Lead",
        "Technical Account Management Team Lead",
        "Field Engineering Manager"
      ],
      "sector": "Solutions Engineering / Technical Pre-Sales",
      "seniority_level": "manager",
      "description": "First-line manager who leads a team of Solutions Engineers, owning delivery quality, team development, and process excellence. Balances hands-on involvement in strategic customer engagements with people management, hiring, and methodology development. Builds repeatable processes, playbooks, and success metrics while ensuring the team delivers consistent technical wins.",
      "key_responsibilities": [
        "Lead, mentor, and manage a team of Solutions Engineers or Technical Account Managers",
        "Define and track team KPIs: onboarding velocity, POC win rates, customer satisfaction, adoption metrics",
        "Step into complex or strategic customer engagements to drive them to success",
        "Build and improve delivery processes, playbooks, and onboarding methodologies",
        "Hire, onboard, and develop SE team members",
        "Partner with Sales leadership to align SE resources with revenue priorities",
        "Collaborate with Product and R&D to communicate customer needs and influence the roadmap",
        "Establish engineering best practices and quality standards for customer deliverables",
        "Distribute work, set priorities, and manage capacity across the team",
        "Create a culture of ownership, accountability, and continuous improvement"
      ],
      "required_skills": [
        "People management and team leadership",
        "Process design and operational excellence",
        "Technical depth sufficient to guide architectural decisions",
        "Hiring, coaching, and performance management",
        "Cross-functional collaboration with Sales, Product, and R&D",
        "KPI definition and data-driven decision making",
        "Customer escalation management",
        "Strategic thinking and resource planning"
      ],
      "common_tools": [
        "Salesforce",
        "JIRA/Confluence",
        "Slack",
        "Google Workspace",
        "BI/analytics dashboards",
        "Project management tools (Asana, Monday)",
        "HR tools"
      ],
      "career_paths": {
        "next_roles": [
          "Head of Solutions Engineering",
          "Senior Engineering Manager",
          "Director of Customer Engineering"
        ],
        "lateral_moves": [
          "Customer Success Director",
          "Sales Director",
          "Product Director",
          "Professional Services Manager"
        ],
        "long_term": [
          "VP Solutions Engineering",
          "VP Customer Engineering",
          "VP Sales",
          "CTO"
        ]
      },
      "typical_experience": "5-8+ years total, with 2+ years in a team lead or management role. Strong individual SE background required.",
      "education": "Bachelor's degree in Computer Science, Engineering, or related field. MBA or relevant leadership training is advantageous.",
      "market_notes_israel": "SE manager roles in Israel often combine pre-sales and post-sale team leadership \u2014 the same manager may own both the POC team and the onboarding/implementation team. Companies like Nominal, Coralogix, and mid-stage startups commonly hire for this hybrid profile. The role frequently includes hands-on customer work alongside management responsibilities, especially at companies with <200 employees. Strong process-building skills are valued because many Israeli startups are formalizing their SE function for the first time as they scale.",
      "role_family": "Solutions_Engineering",
      "seniority": "Lead_Manager"
    },
    {
      "role_id": "head_of_solutions_engineering",
      "title": "Head of Solutions Engineering",
      "alternative_titles": [
        "VP Solutions Engineering",
        "VP Pre-Sales",
        "Director of Solutions Engineering",
        "Head of Field Engineering",
        "Head of Customer Engineering",
        "VP Technical Sales"
      ],
      "sector": "Solutions Engineering / Technical Pre-Sales",
      "seniority_level": "director_plus",
      "description": "Senior leader who owns the entire Solutions Engineering function, setting strategy, building the team, and ensuring the SE organization drives revenue, customer success, and product influence at scale. Partners with VP Sales, CTO, and Product leadership to align technical selling with company strategy. Responsible for hiring plans, delivery methodology, commercial models, and cross-geo coordination.",
      "key_responsibilities": [
        "Define and execute the SE organization strategy aligned with company revenue and growth targets",
        "Hire, mentor, and scale the SE team across regions and domains",
        "Build a motivated, collaborative culture within the SE organization",
        "Own delivery methodology: project frameworks, QA standards, launch readiness, and escalation paths",
        "Manage commercial aspects: scoping, effort estimation, SOWs, and delivery margins",
        "Engage with key customer executives to build and strengthen strategic partnerships",
        "Ensure alignment with Sales, Customer Success, Partners, and Professional Services",
        "Drive cross-geo coordination and consistency in SE practices",
        "Influence product roadmap and prioritization through structured field feedback",
        "Build and enable partner/SI delivery programs to extend capacity",
        "Own key metrics: SE involvement ROI, time-to-value, POC conversion rates, customer satisfaction",
        "Represent the company at executive level in industry events and strategic customer meetings"
      ],
      "required_skills": [
        "Organizational leadership and team scaling",
        "Strategic planning and executive communication",
        "Revenue alignment and commercial acumen",
        "Delivery methodology and process excellence at scale",
        "Partner and SI ecosystem management",
        "Cross-geo team coordination",
        "Executive customer relationship management",
        "Budget and resource management",
        "Technical credibility across multiple domains"
      ],
      "common_tools": [
        "Salesforce",
        "BI/analytics platforms",
        "Executive dashboards",
        "JIRA/Confluence",
        "Google Workspace",
        "Presentation tools",
        "Financial planning tools"
      ],
      "career_paths": {
        "next_roles": [
          "CTO",
          "VP Sales",
          "Chief Revenue Officer",
          "General Manager"
        ],
        "lateral_moves": [
          "VP Customer Success",
          "VP Professional Services",
          "VP Product",
          "VP Engineering"
        ],
        "long_term": [
          "CRO",
          "COO",
          "CEO"
        ]
      },
      "typical_experience": "8-15+ years total, with 3-5+ years leading SE or technical delivery teams",
      "education": "Bachelor's degree in Computer Science, Engineering, or related field. MBA or executive education is common at this level.",
      "market_notes_israel": "Head of SE / VP SE roles in Israel often carry EMEA or global scope, especially at companies like Databricks, NVIDIA, and enterprise SaaS vendors with Israel R&D centers. The role frequently includes building the SE function from scratch for the Israel/EMEA region. At startups (Insait, early-stage AI companies), this role may report directly to the CEO and own the full customer delivery lifecycle including professional services. Enterprise companies expect consumption-based business model experience. Hebrew native + English fluency is standard. The role is increasingly expected to incorporate AI into delivery processes and team operations.",
      "role_family": "Solutions_Engineering",
      "seniority": "Director_Head"
    },
    {
      "role_id": "it_support_specialist",
      "title": "IT Support Specialist / Helpdesk",
      "sector": "IT / Security",
      "seniority_level": "entry",
      "description": "First point of contact for internal technical support, handling hardware, software, and network troubleshooting. Manages employee device setup, user account provisioning, onboarding/offboarding processes, and day-to-day IT operations. Maintains documentation and contributes to process improvements.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Google Workspace",
        "Microsoft 365",
        "Okta / JumpCloud",
        "Jamf / Intune / SCCM",
        "Slack / Zoom",
        "Jira / Confluence",
        "Active Directory",
        "Ticketing systems (ServiceNow, Freshdesk)",
        "Remote support tools"
      ],
      "career_paths": {
        "next_roles": [
          "IT Administrator / SysAdmin",
          "Security Analyst / SOC Analyst"
        ],
        "lateral_moves": [
          "Technical Support Engineer",
          "Operations Coordinator"
        ],
        "long_term": [
          "IT Manager",
          "Head of IT"
        ]
      },
      "market_notes_israel": "Very high demand across Israeli tech. Most startups (50-300 employees) have 1-2 helpdesk roles. Military IT experience (signal corps, tech units) is commonly accepted in lieu of civilian experience. Hebrew and English fluency typically required. Many listings are hybrid or on-site 2-3 days. Companies like K Health, At-Bay, Paragon, VAST Data, and WINN.AI all actively hiring. Entry point is often 0-2 years experience, making it accessible for recent graduates and post-military candidates.",
      "role_family": "IT_Security",
      "seniority": "Entry"
    },
    {
      "role_id": "it_administrator_sysadmin",
      "title": "IT Administrator / SysAdmin",
      "sector": "IT / Security",
      "seniority_level": "mid",
      "description": "Manages and maintains the organization's IT infrastructure, including identity and access management, endpoint management, SaaS administration, cloud platforms, and security compliance. Owns IT policies, procedures, and documentation. Serves as the primary IT operations owner, often as the sole or lead IT professional in startups and scale-ups.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Okta / Entra ID / JumpCloud",
        "Microsoft Intune / Jamf / Kandji",
        "Microsoft 365 / Google Workspace",
        "Azure / AWS / GCP (basic administration)",
        "Active Directory / Azure AD",
        "FortiGate / firewall solutions",
        "Slack / Zoom / Jira / Confluence",
        "ITSM tools (ServiceNow, Freshdesk)",
        "Vanta / Drata (compliance automation)",
        "PowerShell / Bash / Python",
        "Snipe-IT / asset management tools"
      ],
      "career_paths": {
        "next_roles": [
          "IT Manager",
          "Security Analyst / SOC Analyst"
        ],
        "lateral_moves": [
          "DevOps Engineer",
          "Cloud / Infrastructure Engineer"
        ],
        "long_term": [
          "Head of IT",
          "CISO / Head of Security"
        ]
      },
      "market_notes_israel": "Core role in Israeli startups and scale-ups. Companies like Candex, Vetric, Dream, and Papaya Global hire for this profile. Typically requires 3-5 years experience. Many Israeli companies expect the SysAdmin to also handle basic security compliance (ISO 27001, SOC 2) since dedicated GRC hires come later. Scripting skills (PowerShell, Bash) increasingly expected. Zero Trust concepts appearing in requirements. Hebrew and English fluency standard. Cloud platform familiarity (especially Azure and AWS) is becoming a baseline expectation rather than a nice-to-have.",
      "role_family": "IT_Security",
      "seniority": "Mid"
    },
    {
      "role_id": "it_manager",
      "title": "IT Manager",
      "sector": "IT / Security",
      "seniority_level": "mid-senior",
      "description": "Owns and leads all IT operations in a growing organization, including infrastructure planning, security governance, endpoint management, vendor management, and budget oversight. Combines hands-on technical execution with strategic planning to support business growth. Often responsible for both IT operations and foundational security posture in mid-size companies.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Azure / AWS / GCP",
        "Microsoft 365 / Google Workspace",
        "Okta / Entra ID",
        "Microsoft Intune / Jamf",
        "FortiGate / firewall solutions",
        "VPN / switches / network equipment",
        "SIEM / NAC / security monitoring tools",
        "Backup solutions (Metallic, Commvault)",
        "VMware / hypervisors",
        "HiBob / HRIS integrations",
        "PowerShell / Bash / Python"
      ],
      "career_paths": {
        "next_roles": [
          "Head of IT",
          "CISO / Head of Security"
        ],
        "lateral_moves": [
          "Security Operations Manager",
          "DevOps Manager"
        ],
        "long_term": [
          "VP IT / CTO",
          "CISO"
        ]
      },
      "market_notes_israel": "High demand in Israeli startups at the 50-200 employee stage where IT complexity outgrows the SysAdmin model. Companies like Bluewhite, Cye, Beamup, and eyesAtop hire for this profile. Typically requires 5-6+ years experience with strong hands-on capabilities. In Israel, the IT Manager often owns security compliance too (ISO 27001 especially common in defense-adjacent companies). BSc in Computer Science or Engineering frequently required. Budget management and vendor negotiation skills increasingly valued. AI tool evaluation and rollout emerging as a new responsibility \u2014 Beamup explicitly makes this a core part of the role.",
      "role_family": "IT_Security",
      "seniority": "Lead_Manager"
    },
    {
      "role_id": "security_analyst_soc",
      "title": "Security Analyst / SOC Analyst",
      "sector": "IT / Security",
      "seniority_level": "mid",
      "description": "Investigates and responds to cybersecurity threats, performing threat analysis, incident response, and security monitoring. Analyzes attack patterns, phishing campaigns, malware behavior, and network anomalies using data analysis, OSINT, and security tooling. Develops detections, writes research reports, and collaborates with engineering teams to translate findings into product protections.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "SIEM platforms (Splunk, QRadar, Sentinel, ELK)",
        "BigQuery / SQL / Pandas",
        "VirusTotal / URLScan / Shodan",
        "Burp Suite / Chrome DevTools",
        "Python / JavaScript / Bash",
        "OSINT tools and frameworks",
        "CloudTrail / GuardDuty / Security Command Center",
        "Endpoint detection platforms (CrowdStrike, SentinelOne, Defender)",
        "Email security analysis (SMTP, SPF/DKIM/DMARC)",
        "Ticketing / case management systems"
      ],
      "career_paths": {
        "next_roles": [
          "Senior Security Analyst",
          "Security Engineer",
          "GRC Analyst"
        ],
        "lateral_moves": [
          "Data Analyst",
          "Threat Intelligence Analyst"
        ],
        "long_term": [
          "Head of Security Operations",
          "CISO / Head of Security"
        ]
      },
      "market_notes_israel": "Very strong demand in the Israeli cybersecurity ecosystem. Companies like Guardio, Fireblocks, Check Point, Fortinet, Zero Networks, and GeoEdge actively hire. Unit 8200 and intelligence unit alumni are highly sought after \u2014 several listings explicitly mention this as a significant advantage. SQL proficiency is increasingly treated as a must-have, not a nice-to-have. AI/LLM tools for security analysis emerging as an expectation. Many SOC roles in Israel blend traditional monitoring with threat research and data analysis, reflecting the startup culture of wearing multiple hats. Python scripting skills expected for automation.",
      "role_family": "IT_Security",
      "seniority": "Mid"
    },
    {
      "role_id": "grc_analyst",
      "title": "GRC Analyst",
      "sector": "IT / Security",
      "seniority_level": "mid",
      "description": "Manages governance, risk, and compliance activities to ensure organizational alignment with security frameworks and regulatory requirements. Leads audit preparation, maintains compliance documentation, conducts risk assessments, manages vendor security evaluations, and drives security awareness programs. Bridges the gap between technical security controls and business requirements.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Vanta / Drata / OneTrust / Anecdotes",
        "SOC 2 / ISO 27001 / NIST CSF / PCI-DSS frameworks",
        "GDPR / EU AI Act compliance tools",
        "Risk registers and control frameworks",
        "Security questionnaire platforms",
        "Jira / project management tools",
        "Cloud security platforms (AWS / Azure / GCP security consoles)",
        "Documentation tools (Confluence, SharePoint)"
      ],
      "career_paths": {
        "next_roles": [
          "Senior GRC Analyst",
          "Security Operations Manager",
          "Head of Security"
        ],
        "lateral_moves": [
          "Compliance Manager",
          "Internal Auditor",
          "Risk Manager"
        ],
        "long_term": [
          "CISO / Head of Security",
          "VP Security"
        ]
      },
      "market_notes_israel": "Growing rapidly in the Israeli market as startups mature and pursue enterprise customers who require SOC 2 and ISO 27001 certification. Companies like Payoneer, Upwind, Zafran, Port.io, Wix, and Cye actively hiring. Entry-level GRC roles (1-2 years) exist \u2014 Cye and Akita hire junior cybersecurity architects/GRC specialists. The role often combines compliance management with hands-on security engineering in Israeli companies. AI governance (EU AI Act, NIST AI RMF, ISO/IEC 42001) emerging as a new domain \u2014 Payoneer explicitly requires this. FedRAMP experience becoming valuable for companies targeting US federal customers. CISSP, CISM, CISA certifications valued but not always required.",
      "role_family": "IT_Security",
      "seniority": "Mid"
    },
    {
      "role_id": "head_of_it",
      "title": "Head of IT",
      "sector": "IT / Security",
      "seniority_level": "senior",
      "description": "Leads the organization's entire IT function, owning strategy, operations, security posture, vendor management, and budget. Serves as the senior escalation point for IT issues and the primary internal partner for security governance. Defines the IT and internal security roadmap, builds automation-first processes, and ensures the IT environment scales with business growth. Often manages both IT staff and external vendors.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Okta / Entra ID / identity platforms",
        "Google Workspace / Microsoft 365",
        "MDM platforms (Intune, Jamf, Kandji)",
        "Cloud platforms (AWS, GCP, Azure)",
        "SIEM / security monitoring tools",
        "GRC platforms (Vanta, Drata)",
        "Firewall / VPN / network infrastructure",
        "Budget and vendor management tools",
        "Automation and scripting tools"
      ],
      "career_paths": {
        "next_roles": [
          "VP IT",
          "CISO / Head of Security"
        ],
        "lateral_moves": [
          "VP Engineering",
          "Head of Security Operations"
        ],
        "long_term": [
          "CTO",
          "CISO"
        ]
      },
      "market_notes_israel": "Common in Israeli companies at the 100-500 employee stage. Guardio and Bringg both hire for this profile. In many Israeli companies this is a 'one-person army' role \u2014 strategic ownership combined with hands-on execution. The role increasingly includes internal security ownership, not just IT operations. AI adoption and security governance emerging as new responsibilities. Companies expect this person to manage external IT service providers while remaining deeply hands-on. Strong communication skills and cross-functional partnership ability are critical. Experience with SOC 2 and ISO 27001 typically required.",
      "role_family": "IT_Security",
      "seniority": "Director_Head"
    },
    {
      "role_id": "ciso_head_of_security",
      "title": "CISO / Head of Security",
      "sector": "IT / Security",
      "seniority_level": "executive",
      "description": "Leads the organization's entire information security program, spanning product security, cloud infrastructure, internal IT systems, and customer-facing security initiatives. Develops security strategy, manages risk, drives compliance and certification programs, and builds a security-conscious culture. Partners with executive leadership to align security with business objectives and serves as the primary security representative for customers, auditors, and regulators.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "SIEM platforms (Splunk, Sentinel, ELK)",
        "Cloud security (AWS, GCP, Azure security consoles)",
        "GRC platforms (Vanta, Drata, OneTrust)",
        "Endpoint protection (CrowdStrike, SentinelOne, Defender)",
        "Identity platforms (Okta, Entra ID)",
        "Penetration testing and vulnerability management tools",
        "SOC 2 / ISO 27001 / NIST / GDPR frameworks",
        "Incident response and forensics tools",
        "Security awareness training platforms"
      ],
      "career_paths": {
        "next_roles": [
          "VP Security",
          "Chief Security Officer"
        ],
        "lateral_moves": [
          "VP Engineering",
          "CTO"
        ],
        "long_term": [
          "CTO",
          "COO",
          "Board Advisory"
        ]
      },
      "market_notes_israel": "Increasingly critical role in the Israeli ecosystem as companies scale internationally and face enterprise customer security requirements. Guardio and Guardz both actively hiring CISOs. In Israeli startups, the CISO often owns IT as well as security \u2014 the role combines strategic leadership with hands-on execution. IPO preparation experience valued as more Israeli companies go public. AI security governance emerging as a new domain. The role typically requires 5-7+ years of security experience with proven leadership. CISSP, CISM certifications valued. Strong demand for candidates who can serve as the external face of security for customer trust and sales enablement.",
      "role_family": "IT_Security",
      "seniority": "VP_Executive"
    },
    {
      "role_id": "executive_assistant",
      "title": "Executive Assistant",
      "sector": "Admin / G&A",
      "seniority_level": "mid",
      "description": "Provides high-level administrative and operational support to C-level executives, managing complex calendars, coordinating travel, preparing for board and leadership meetings, and driving cross-organizational follow-ups. Serves as a strategic partner who understands business priorities and translates them into efficient scheduling and logistics. Often acts as a communication bridge between executives and internal/external stakeholders.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Google Workspace (Calendar, Docs, Sheets, Slides)",
        "Microsoft Office (Outlook, Word, Excel, PowerPoint)",
        "Zoom / Teams / video conferencing",
        "Travel management systems (Mesh, TripActions)",
        "CRM systems (Salesforce, HubSpot)",
        "Expense management tools",
        "AI productivity tools (ChatGPT, Claude, Gemini)"
      ],
      "career_paths": {
        "next_roles": [
          "Chief of Staff",
          "Head of Admin / G&A Operations Manager"
        ],
        "lateral_moves": [
          "Office Manager",
          "Operations Coordinator",
          "HR Operations"
        ],
        "long_term": [
          "Chief of Staff",
          "VP Operations",
          "Head of People Operations"
        ]
      },
      "market_notes_israel": "Very common role in Israeli tech companies, often combined with Office Manager responsibilities in startups under 100 employees. Companies like Alison.ai, McKinsey/Iguazio, Keshet International, and Voyantis actively hiring. Military HQ/operations experience (e.g., IDF adjutancy, unit-level operations roles) is frequently cited as an advantage and widely accepted as relevant experience. The role is often a career accelerator \u2014 several listings explicitly frame it as a path to Chief of Staff or operations leadership. Hebrew and English fluency standard. AI tool proficiency (ChatGPT, Gemini, Claude) emerging as an expectation in recent listings.",
      "role_family": "Admin_GA",
      "seniority": "Mid"
    },
    {
      "role_id": "office_manager",
      "title": "Office Manager",
      "sector": "Admin / G&A",
      "seniority_level": "entry-mid",
      "description": "Oversees the daily operations of the office environment, ensuring a smooth, welcoming, and well-functioning workplace. Manages facilities, vendor relationships, supply procurement, employee experience initiatives, and front desk operations. Often serves as the cultural anchor of the office, driving employee engagement activities, company events, and onboarding logistics.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Google Workspace / Microsoft Office",
        "Canva (presentations, internal communications)",
        "Travel and expense management systems",
        "Office supply and procurement platforms",
        "HRIS systems (HiBob, BambooHR)",
        "Event management tools",
        "Communication platforms (Slack, Teams)"
      ],
      "career_paths": {
        "next_roles": [
          "Head of Admin / G&A Operations Manager",
          "Executive Assistant"
        ],
        "lateral_moves": [
          "Operations Coordinator",
          "HR Coordinator",
          "Employee Experience Manager"
        ],
        "long_term": [
          "Head of Admin / G&A Operations Manager",
          "VP Operations",
          "Head of People Operations"
        ]
      },
      "market_notes_israel": "Extremely high demand across Israeli tech \u2014 virtually every company with a physical office hires for this role. Companies like Rubrik, Nexxen, Voyantis, Airis Labs, and Alison.ai actively hiring. The Israeli market strongly values the 'people-person' and culture-building aspects of the role, not just logistics. Part-time (60%) positions common in smaller startups. Often combined with Executive Assistant duties in companies under 80 employees. Entry point is typically 1-2 years of experience, making it accessible post-military. In-office presence 5 days/week is standard. Hebrew and English fluency required.",
      "role_family": "Admin_GA",
      "seniority": "Mid"
    },
    {
      "role_id": "operations_coordinator",
      "title": "Operations Coordinator",
      "sector": "Admin / G&A",
      "seniority_level": "entry",
      "description": "Provides operational and administrative support to ensure smooth business workflows. Manages front desk duties, coordinates logistics, handles vendor relationships, supports internal processes, and assists with data entry and reporting. Serves as a cross-functional support role that keeps day-to-day operations running efficiently.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Google Workspace (Drive, Sheets, Docs, Gmail)",
        "Microsoft Office (Excel, Outlook, Word)",
        "ERP systems (Priority, NetSuite, SAP)",
        "CRM systems (Salesforce, HubSpot)",
        "Internal information and ticketing systems",
        "Travel management tools"
      ],
      "career_paths": {
        "next_roles": [
          "Office Manager",
          "Executive Assistant",
          "Business Operations Analyst"
        ],
        "lateral_moves": [
          "HR Coordinator",
          "Sales Operations",
          "Customer Success Associate"
        ],
        "long_term": [
          "Operations Manager",
          "Head of Admin / G&A Operations Manager"
        ]
      },
      "market_notes_israel": "Common entry-level role in Israeli companies, frequently found at larger organizations like JFrog, KPMG, and Bynet. IDF administrative and national service experience widely accepted as relevant background. The role often serves as a launching pad into office management, HR, or business operations. Typically requires 1+ years of experience. Hebrew fluency required, English reading and writing expected. Strong overlap with receptionist duties in smaller companies. ERP system familiarity (especially Priority, which is prevalent in Israel) is an advantage.",
      "role_family": "Admin_GA",
      "seniority": "Entry"
    },
    {
      "role_id": "procurement_specialist",
      "title": "Procurement / Vendor Management Specialist",
      "sector": "Admin / G&A",
      "seniority_level": "mid",
      "description": "Manages end-to-end procurement processes including supplier sourcing, RFQ management, contract negotiation, purchase order processing, and vendor relationship management. Drives cost optimization, ensures compliance with procurement policies, and collaborates across Finance, Legal, IT, and operational teams to secure optimal commercial outcomes.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Procurement platforms (Zip/ZipHQ, Coupa)",
        "ERP systems (NetSuite, SAP, Priority, Intacct)",
        "Microsoft Excel (advanced: pivot tables, data analysis)",
        "Contract management tools",
        "Spend analytics platforms",
        "AI-powered procurement tools",
        "Microsoft Office / Google Workspace"
      ],
      "career_paths": {
        "next_roles": [
          "Senior Procurement Specialist",
          "Procurement Manager"
        ],
        "lateral_moves": [
          "Finance Analyst",
          "Operations Manager",
          "Vendor Management"
        ],
        "long_term": [
          "Head of Procurement",
          "VP Operations",
          "Head of Admin / G&A Operations Manager"
        ]
      },
      "market_notes_israel": "Growing demand in Israeli tech as companies scale and formalize purchasing. Silverfort, ThetaRay, Kaltura, Infinidat, KPMG, and XTEND all actively hiring. Typically requires 2-4 years of experience. The Israeli market distinguishes between indirect procurement (SaaS, services, facilities \u2014 common in tech companies) and direct/technical procurement (electronic components, mechanical parts \u2014 common in hardware/defense companies like XTEND). Zip/ZipHQ emerging as the dominant procurement platform in Israeli tech. Hebrew and English fluency required for global vendor management. SAP experience valued at larger organizations. AI tools for sourcing and vendor evaluation appearing in recent listings.",
      "role_family": "Admin_GA",
      "seniority": "Mid"
    },
    {
      "role_id": "facilities_manager",
      "title": "Facilities Manager",
      "sector": "Admin / G&A",
      "seniority_level": "mid-senior",
      "description": "Manages the physical infrastructure, maintenance, and operational systems of the organization's facilities. Responsible for building systems (electrical, HVAC, water, backup power), vendor management for maintenance services, safety and regulatory compliance, and ensuring the reliability and availability of critical infrastructure. Combines technical expertise with operational management.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "Building Management Systems (BMS)",
        "HVAC and electrical monitoring systems",
        "Computerized Maintenance Management Systems (CMMS)",
        "Safety and compliance management tools",
        "Budget and procurement management tools",
        "Microsoft Office / Google Workspace",
        "Data Center infrastructure monitoring"
      ],
      "career_paths": {
        "next_roles": [
          "Head of Facilities",
          "Head of Admin / G&A Operations Manager"
        ],
        "lateral_moves": [
          "Operations Manager",
          "Project Manager (Construction/Infrastructure)"
        ],
        "long_term": [
          "VP Operations",
          "Head of Admin / G&A Operations Manager",
          "COO"
        ]
      },
      "market_notes_israel": "Distinct role in larger Israeli organizations (500+ employees) and building management companies. Cal, CBRE, and MAX actively hiring. Licensed electrician certification (\u05d7\u05e9\u05de\u05dc\u05d0\u05d9 \u05de\u05d5\u05e1\u05de\u05da/\u05e8\u05d0\u05e9\u05d9) is often mandatory \u2014 this is a regulated requirement in Israel. Experience managing buildings of 13,000+ sqm is a common baseline. Data Center infrastructure management increasingly relevant as Israeli tech companies grow their physical footprint. 24/7 availability for emergencies is standard. Hebrew fluency required; English less critical than in other tech roles. The role sits at the intersection of technical infrastructure management and HR/employee experience in some organizations (e.g., Cal positions it within the HR leadership team).",
      "role_family": "Admin_GA",
      "seniority": "Mid"
    },
    {
      "role_id": "head_of_admin_ga",
      "title": "Head of Admin / G&A Operations Manager",
      "sector": "Admin / G&A",
      "seniority_level": "senior",
      "description": "Leads the organization's administrative, operational, and employee experience functions end-to-end. Owns office operations, vendor ecosystems, procurement, employee welfare programs, and cross-functional operational processes. Combines strategic leadership with hands-on execution, managing budgets, teams, and global operations. Often serves as the operational backbone that enables the company to scale.",
      "responsibilities": [
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
      "tools_and_platforms": [
        "HRIS systems (HiBob, BambooHR, Workday)",
        "ERP systems (NetSuite, Priority, SAP)",
        "Procurement platforms (Zip, Coupa)",
        "Payroll and benefits platforms (Deel, Remote, Papaya Global)",
        "Equity administration (Carta)",
        "Google Workspace / Microsoft Office",
        "Budget management and reporting tools",
        "Event management platforms",
        "AI productivity and automation tools"
      ],
      "career_paths": {
        "next_roles": [
          "VP Operations",
          "Chief of Staff"
        ],
        "lateral_moves": [
          "Head of People Operations",
          "Head of HR"
        ],
        "long_term": [
          "VP Operations",
          "COO",
          "Chief of Staff"
        ]
      },
      "market_notes_israel": "Growing role as Israeli tech companies scale past 100 employees and need consolidated G&A leadership. XTEND, Mesh Security, and Airis Labs represent the archetype. In the Israeli market, this role frequently combines office management, employee experience, procurement, and operational HR under one leader \u2014 reflecting the startup ethos of consolidated ownership. Global operations experience (managing US payroll, EOR structures, multi-country employment) increasingly valued as Israeli companies expand internationally. Experience with Deel and Remote (EOR platforms) is a strong differentiator. Typically requires 4-5+ years of experience. The role often reports to the COO, CEO, or VP HR. Hebrew and English fluency required.",
      "role_family": "Admin_GA",
      "seniority": "Director_Head"
    },
    {
      "id": "customer_success_specialist",
      "standardized_title": "Customer Success Specialist",
      "alternate_titles": [
        "CS Specialist",
        "Customer Experience Specialist",
        "Client Success Specialist"
      ],
      "role_family": "Relationship_Growth",
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
        "Customer Success Manager",
        "Account Manager"
      ],
      "keywords": [
        "customer success",
        "retention",
        "adoption",
        "renewal",
        "QBR"
      ],
      "sector": "Post-sale / CS / Operations"
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
      ],
      "sector": "Finance"
    },
    {
      "id": "operations_analyst",
      "standardized_title": "Operations Analyst",
      "alternate_titles": [
        "Business Operations Analyst",
        "Ops Analyst"
      ],
      "role_family": "Operations",
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
      "similar_roles": [],
      "keywords": [
        "operations",
        "analytics",
        "process",
        "dashboards",
        "reporting"
      ],
      "sector": "RevOps / Business Ops"
    },
    {
      "id": "hr_coordinator",
      "standardized_title": "HR Coordinator",
      "alternate_titles": [
        "People Operations Coordinator",
        "HR Associate"
      ],
      "role_family": "HR_People",
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
      ],
      "sector": "HR / People"
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
      ],
      "sector": "HR / People"
    },
    {
      "id": "marketing_assistant",
      "standardized_title": "Marketing Assistant",
      "alternate_titles": [
        "Junior Marketing Associate",
        "Marketing Admin"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "marketing",
        "social media",
        "content",
        "campaigns"
      ],
      "sector": "Marketing"
    },
    {
      "id": "sales_representative",
      "standardized_title": "Sales Representative",
      "alternate_titles": [
        "SMB Sales Rep",
        "Inside Sales Rep"
      ],
      "role_family": "Sales",
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
      "similar_roles": [],
      "keywords": [
        "sales",
        "quota",
        "pipeline",
        "closing",
        "prospecting"
      ],
      "sector": "Sales"
    },
    {
      "id": "brand_manager",
      "standardized_title": "Brand Manager",
      "alternate_titles": [
        "Brand Strategy Manager",
        "Brand Marketing Manager"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "brand",
        "positioning",
        "messaging",
        "brand strategy"
      ],
      "sector": "Marketing"
    },
    {
      "id": "event_coordinator",
      "standardized_title": "Event Coordinator",
      "alternate_titles": [
        "Events Associate",
        "Marketing Events Coordinator"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "events",
        "webinars",
        "conferences",
        "event marketing"
      ],
      "sector": "Marketing"
    },
    {
      "id": "partnerships_associate",
      "standardized_title": "Partnerships Associate",
      "alternate_titles": [
        "Partner Operations Associate",
        "Partnership Development Associate"
      ],
      "role_family": "BD_Partnerships",
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
        "crm_management",
        "cross_team_collaboration"
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
      "similar_roles": [],
      "keywords": [
        "partnerships",
        "partner management",
        "BD"
      ],
      "sector": "Business Development / Partnerships"
    },
    {
      "id": "junior_business_analyst",
      "standardized_title": "Junior Business Analyst",
      "alternate_titles": [
        "Business Analyst I",
        "Business Analytics Associate"
      ],
      "role_family": "RevOps_BizOps",
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
      "similar_roles": [],
      "keywords": [
        "business analysis",
        "reporting",
        "requirements"
      ],
      "sector": "RevOps / Business Ops"
    },
    {
      "id": "marketing_intern",
      "standardized_title": "Marketing Intern",
      "alternate_titles": [
        "Marketing Trainee"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "marketing intern",
        "social media",
        "content"
      ],
      "sector": "Marketing"
    },
    {
      "id": "hr_assistant",
      "standardized_title": "HR Assistant",
      "alternate_titles": [
        "People Ops Assistant",
        "HR Admin"
      ],
      "role_family": "HR_People",
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
      ],
      "sector": "HR / People"
    },
    {
      "id": "sales_associate",
      "standardized_title": "Sales Associate",
      "alternate_titles": [
        "Inside Sales Associate",
        "Junior Sales Rep"
      ],
      "role_family": "Sales",
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
      "similar_roles": [],
      "keywords": [
        "sales",
        "inbound",
        "CRM",
        "lead qualification"
      ],
      "sector": "Sales"
    },
    {
      "id": "social_media_coordinator",
      "standardized_title": "Social Media Coordinator",
      "alternate_titles": [
        "Social Media Specialist",
        "Community Coordinator"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "social media",
        "community",
        "posts",
        "engagement"
      ],
      "sector": "Marketing"
    },
    {
      "id": "recruitment_coordinator",
      "standardized_title": "Recruitment Coordinator",
      "alternate_titles": [
        "Recruiting Coordinator",
        "TA Coordinator"
      ],
      "role_family": "HR_People",
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
      ],
      "sector": "HR / People"
    },
    {
      "id": "business_operations_associate",
      "standardized_title": "Business Operations Associate",
      "alternate_titles": [
        "BizOps Associate",
        "Ops Associate"
      ],
      "role_family": "RevOps_BizOps",
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
      "similar_roles": [],
      "keywords": [
        "business operations",
        "process",
        "operations"
      ],
      "sector": "RevOps / Business Ops"
    },
    {
      "id": "strategy_analyst",
      "standardized_title": "Strategy Analyst",
      "alternate_titles": [
        "Corporate Strategy Analyst",
        "Business Strategy Analyst"
      ],
      "role_family": "Consulting",
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
      ],
      "sector": "Consulting"
    },
    {
      "id": "management_consultant",
      "standardized_title": "Management Consultant",
      "alternate_titles": [
        "Strategy Consultant",
        "Senior Consultant"
      ],
      "role_family": "Consulting",
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
      ],
      "sector": "Consulting"
    },
    {
      "id": "junior_consultant",
      "standardized_title": "Junior Consultant",
      "alternate_titles": [
        "Consulting Analyst",
        "Associate Consultant"
      ],
      "role_family": "Consulting",
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
      ],
      "sector": "Consulting"
    },
    {
      "id": "operations_associate",
      "standardized_title": "Operations Associate",
      "alternate_titles": [
        "Ops Associate",
        "Business Ops Associate"
      ],
      "role_family": "Operations",
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
      "similar_roles": [],
      "keywords": [
        "operations",
        "admin",
        "coordination"
      ],
      "sector": "RevOps / Business Ops"
    },
    {
      "id": "event_manager",
      "standardized_title": "Event Manager",
      "alternate_titles": [
        "Senior Events Manager",
        "Head of Events"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "event",
        "events",
        "conference",
        "event manager"
      ],
      "sector": "Marketing"
    },
    {
      "id": "technical_support_specialist",
      "standardized_title": "Technical Support Specialist",
      "alternate_titles": [
        "Tier 2 Support",
        "Application Support Specialist"
      ],
      "role_family": "Support",
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
      "similar_roles": [],
      "keywords": [
        "technical support",
        "troubleshooting",
        "T2",
        "application support"
      ],
      "sector": "Post-sale / CS / Operations"
    },
    {
      "id": "solutions_consultant",
      "standardized_title": "Solutions Consultant",
      "alternate_titles": [
        "Solutions Advisor",
        "Implementation Consultant"
      ],
      "role_family": "Solutions_Engineering",
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
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "senior_solutions_engineer",
        "solutions_engineering_manager"
      ],
      "similar_roles": [],
      "keywords": [
        "solutions consulting",
        "pre-sales",
        "technical demo",
        "POC"
      ],
      "sector": "Solutions Engineering"
    },
    {
      "id": "pre_sales_engineer",
      "standardized_title": "Pre-Sales Engineer",
      "alternate_titles": [
        "Sales Engineer",
        "Presales Engineer"
      ],
      "role_family": "Solutions_Engineering",
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
      "strategic_level": "Execution",
      "lifecycle_stage": [],
      "next_roles": [
        "senior_solutions_engineer",
        "solutions_engineering_manager"
      ],
      "similar_roles": [],
      "keywords": [
        "pre-sales",
        "sales engineering",
        "technical demo",
        "POC",
        "RFP"
      ],
      "sector": "Solutions Engineering"
    },
    {
      "id": "growth_analyst",
      "standardized_title": "Growth Analyst",
      "alternate_titles": [
        "Growth Data Analyst",
        "Growth Marketing Analyst"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "growth",
        "analytics",
        "experiments",
        "funnel"
      ],
      "sector": "Marketing / Data"
    },
    {
      "id": "revenue_analyst",
      "standardized_title": "Revenue Analyst",
      "alternate_titles": [
        "Revenue Operations Analyst",
        "RevOps Analyst"
      ],
      "role_family": "RevOps_BizOps",
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
      "similar_roles": [],
      "keywords": [
        "revenue",
        "RevOps",
        "pipeline analytics",
        "forecasting"
      ],
      "sector": "RevOps / Business Ops"
    },
    {
      "id": "demand_generation_manager",
      "standardized_title": "Demand Generation Manager",
      "alternate_titles": [
        "Demand Gen Manager",
        "Lead Gen Manager"
      ],
      "role_family": "Marketing",
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
      "similar_roles": [],
      "keywords": [
        "demand gen",
        "lead generation",
        "MQL",
        "pipeline marketing"
      ],
      "sector": "Marketing"
    }
  ],
  "classification_logic": {
    "core_rule": "Do not classify based on title alone. Classify using responsibilities, keywords, tools, ownership signals, and seniority signals.",
    "role_family_rules": {
      "Support": [
        "tickets",
        "troubleshooting",
        "debugging",
        "sla",
        "logs",
        "escalation",
        "support queue"
      ],
      "Onboarding_Implementation": [
        "onboarding",
        "implementation",
        "go live",
        "rollout",
        "requirements gathering",
        "setup",
        "configuration",
        "delivery"
      ],
      "Relationship_Growth": [
        "retention",
        "adoption",
        "renewals",
        "upsell",
        "cross sell",
        "customer health",
        "stakeholder management"
      ],
      "Customer_Experience": [
        "customer journey",
        "nps",
        "csat",
        "touchpoints",
        "experience strategy",
        "loyalty"
      ],
      "Leadership": [
        "lead team",
        "manage team",
        "coach",
        "build strategy",
        "own function",
        "global org"
      ],
      "Operations": [
        "playbooks",
        "dashboards",
        "health scoring",
        "automation",
        "process compliance",
        "operating model",
        "timeline",
        "milestones",
        "execution",
        "delivery",
        "dependencies",
        "program",
        "governance",
        "implementation",
        "workflow",
        "release process",
        "operating cadence"
      ],
      "Product": [
        "roadmap",
        "product roadmap",
        "prioritization",
        "feature prioritization",
        "Discovery",
        "product strategy",
        "user needs",
        "requirements",
        "feature definition",
        "go to market",
        "product metrics",
        "ab testing"
      ]
    },
    "seniority_rules": {
      "Entry": [
        "associate",
        "junior",
        "0-2 years"
      ],
      "Mid": [
        "2-4 years",
        "own customers",
        "manage tasks independently"
      ],
      "Senior": [
        "5+ years",
        "complex accounts",
        "strategic customers",
        "escalations"
      ],
      "Lead_Manager": [
        "lead team",
        "mentor",
        "manager",
        "people leadership"
      ],
      "Director_Head": [
        "own function",
        "define playbooks",
        "build department",
        "manage managers"
      ],
      "VP_Executive": [
        "executive",
        "global",
        "revenue accountability",
        "org leadership"
      ]
    },
    "attribute_rules": {
      "technical_depth_high": [
        "api",
        "sql",
        "logs",
        "debugging",
        "integrations",
        "kubernetes",
        "networking"
      ],
      "customer_facing_high": [
        "client meetings",
        "customer calls",
        "stakeholders",
        "trusted advisor",
        "account ownership"
      ],
      "revenue_direct": [
        "renewals",
        "upsell",
        "cross sell",
        "expansion",
        "revenue growth"
      ],
      "strategic_high": [
        "strategy",
        "playbooks",
        "operating model",
        "customer journey",
        "global org",
        "roadmap",
        "product strategy",
        "prioritization"
      ]
    }
  }
} as const;
