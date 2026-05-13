export const skillTransferMap = {
  "name": "skill_transfer_map",
  "version": "v1",
  "last_updated": "2026-04-21",
  "description": "Compact version of the skill transfer map optimized for edge function deployment. Removes redundant fields (titles, sectors, function layers, coverage breakdowns, role_transfer_index) that can be looked up from other library files at runtime. Keeps shared skill lists and core gap skills for direct use in recommendations.",
  "methodology": {
    "scoring": {
      "description": "For each source\u2192target pair, compute what percentage of the target role's core/secondary/differentiator skills the source role already provides. Apply same weights as fit_scoring_logic (core: 0.6, secondary: 0.3, differentiator: 0.1).",
      "weights": {
        "core": 0.6,
        "secondary": 0.3,
        "differentiator": 0.1
      }
    },
    "transfer_types": {
      "natural": "Score >= 0.70 (or curated boost). High skill overlap, common career move. Minimal gap-filling needed.",
      "stretch": "Score 0.50-0.69 (or curated boost). Moderate overlap, requires intentional skill-building. Achievable with focused effort.",
      "pivot": "Score 0.35-0.49. Low overlap, significant reskilling required. Major career change."
    },
    "adjustments": [
      "Cross-layer transfers (e.g., Analyzer\u2192Influencer) are downgraded from natural to stretch unless score >= 0.80",
      "Seniority jumps of 2+ levels downgrade transfer type by one step",
      "Minimum 2 shared skills required for inclusion",
      "Curated career transfers can boost transfer type based on known real-world transition patterns"
    ],
    "gap_difficulty": {
      "none": "0 missing core skills for the target role",
      "low": "1 missing core skill",
      "medium": "2-3 missing core skills",
      "high": "4+ missing core skills"
    },
    "curated_transfers": {
      "description": "Known real-world career transitions that are common in the Israeli tech market, validated against career path data and hiring patterns. These can boost transfer type classification above what pure skill overlap would suggest.",
      "count": 20
    },
    "skill_equivalencies": {
      "description": "Semantic skill equivalencies that bridge sector-specific skill IDs representing the same underlying capability. For example, 'executive_presentation' (Consulting) and 'bizops_executive_communication' (RevOps/BizOps) represent the same skill. Source role skills are expanded using these equivalencies before computing coverage of target role requirements.",
      "total_rules": 41,
      "total_skills_covered": 78,
      "equivalency_map": {
        "executive_presentation": [
          "bizops_executive_communication"
        ],
        "client_engagement_delivery": [
          "bizops_cross_functional_execution",
          "project_management"
        ],
        "consulting_frameworks": [
          "bizops_business_case_development",
          "consulting_methodology"
        ],
        "client_advisory": [
          "customer_communication",
          "relationship_building"
        ],
        "proposal_development": [
          "rfp_response"
        ],
        "risk_compliance_consulting": [
          "audit_management",
          "risk_assessment_management"
        ],
        "financial_due_diligence": [
          "excel_advanced_finance",
          "saas_finance_metrics"
        ],
        "bizops_cross_functional_execution": [
          "client_engagement_delivery",
          "cross_functional_collaboration",
          "cross_team_collaboration"
        ],
        "bizops_executive_communication": [
          "executive_presentation",
          "technical_communication"
        ],
        "bizops_business_case_development": [
          "consulting_frameworks",
          "data_analysis"
        ],
        "bizops_okr_framework": [
          "product_roadmapping"
        ],
        "bizops_process_automation": [
          "process_improvement",
          "workflow_automation"
        ],
        "bizops_enablement_training": [
          "onboarding_training"
        ],
        "revops_commercial_analytics": [
          "campaign_analytics_attribution",
          "data_analysis"
        ],
        "revops_pipeline_management": [
          "sales_pipeline_management"
        ],
        "revops_crm_administration": [
          "crm_management",
          "salesforce"
        ],
        "revops_gtm_process_design": [
          "process_improvement"
        ],
        "revops_tech_stack_integration": [
          "saas_administration"
        ],
        "system_design": [
          "ml_systems_thinking",
          "system_architecture"
        ],
        "cloud_platforms": [
          "cloud_platforms_devops"
        ],
        "cloud_platforms_devops": [
          "cloud_platforms"
        ],
        "user_research": [
          "customer_discovery",
          "ux_research"
        ],
        "design_thinking": [
          "product_discovery"
        ],
        "employee_experience": [
          "onboarding_offboarding_ops"
        ],
        "technical_discovery": [
          "consulting_frameworks",
          "customer_communication"
        ],
        "poc_management": [
          "client_engagement_delivery"
        ],
        "competitive_positioning": [
          "market_research"
        ],
        "delivery_methodology": [
          "client_engagement_delivery"
        ],
        "solution_design": [
          "system_design",
          "technical_product_management"
        ],
        "project_management": [
          "client_engagement_delivery",
          "delivery_execution"
        ],
        "program_management": [
          "bizops_cross_functional_execution",
          "client_engagement_delivery"
        ],
        "technical_project_delivery": [
          "requirements_gathering",
          "technical_communication"
        ],
        "delivery_execution": [
          "project_management"
        ],
        "leadership": [
          "ai_team_leadership",
          "data_team_leadership",
          "engineering_leadership",
          "people_management",
          "pm_team_leadership",
          "se_team_leadership",
          "technical_leadership"
        ],
        "executive_leadership": [
          "ai_strategy_roadmap",
          "engineering_leadership"
        ],
        "people_management": [
          "leadership"
        ],
        "hiring_talent_acquisition": [
          "ai_hiring_talent"
        ],
        "analytical_thinking": [
          "data_analysis"
        ],
        "data_analysis": [
          "analytical_thinking",
          "dashboarding"
        ],
        "communication": [
          "customer_communication",
          "technical_communication"
        ],
        "technical_communication": [
          "bizops_executive_communication",
          "communication",
          "executive_presentation"
        ]
      }
    }
  },
  "function_layer_taxonomy": {
    "Builder": {
      "sectors": [
        "Engineering",
        "Product",
        "AI / ML",
        "Design / UX"
      ],
      "description": "Creates products, systems, and experiences"
    },
    "Analyzer": {
      "sectors": [
        "Data / Analytics",
        "Finance",
        "Consulting"
      ],
      "description": "Extracts insights, models decisions, evaluates risk"
    },
    "Operator": {
      "sectors": [
        "HR / People",
        "RevOps / Business Ops",
        "Admin / G&A"
      ],
      "description": "Runs processes, manages people, keeps the organization functioning"
    },
    "Influencer": {
      "sectors": [
        "Sales",
        "Marketing",
        "Business Development / Partnerships"
      ],
      "description": "Drives revenue, shapes perception, builds market presence"
    },
    "Enabler": {
      "sectors": [
        "Post-sale / CS / Operations",
        "Solutions Engineering"
      ],
      "description": "Helps customers succeed, bridges product and user"
    },
    "Protector": {
      "sectors": [
        "IT / Security"
      ],
      "description": "Secures systems, manages infrastructure, ensures compliance"
    }
  },
  "stats": {
    "total_roles_with_mappings": 142,
    "total_transfer_pairs": 1707,
    "by_type": {
      "natural": 178,
      "stretch": 465,
      "pivot": 1064
    },
    "same_sector_pairs": 677,
    "cross_sector_pairs": 1030,
    "curated_transfers": 20
  },
  "transfers": [
    {
      "s": "business_development_manager",
      "t": "bdr_bd_associate",
      "score": 1.0,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_powered_sales_tools",
        "analytical_thinking",
        "communication",
        "crm_management",
        "lead_qualification",
        "market_research_bd",
        "outbound_prospecting",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "sales_engagement_tools"
      ],
      "gaps": [],
      "gap_n": 0
    },
    {
      "s": "senior_consultant",
      "t": "consultant",
      "score": 1.0,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 0
    },
    {
      "s": "senior_product_designer",
      "t": "design_system_lead",
      "score": 1.0,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_handoff",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "strategic_thinking",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 0
    },
    {
      "s": "senior_product_designer",
      "t": "product_designer_ux_ui",
      "score": 1.0,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_handoff",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "information_architecture",
        "interaction_design",
        "mobile_design",
        "prototyping",
        "ui_visual_design",
        "usability_testing",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 0
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "vp_business_development",
      "score": 0.975,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_powered_sales_tools",
        "bd_team_leadership",
        "channel_sales_strategy",
        "commercial_negotiation",
        "ecosystem_development",
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "joint_business_planning",
        "partner_enablement",
        "partnership_development",
        "people_management",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "senior_engineering_manager",
      "t": "engineering_group_manager",
      "score": 0.975,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "organizational_design",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "sales_development_representative",
      "t": "business_development_representative",
      "score": 0.967,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cold_calling",
        "crm_management",
        "customer_communication",
        "lead_qualification",
        "linkedin_outreach",
        "market_research",
        "organization",
        "outbound_prospecting",
        "product_knowledge",
        "sales_tools_proficiency"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "senior_data_analyst",
      "t": "data_analyst",
      "score": 0.967,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "senior_fpa_analyst",
      "t": "fpa_analyst",
      "score": 0.967,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "budget_forecasting",
        "bva_analysis",
        "dashboarding",
        "data_analysis",
        "epm_planning_tools",
        "erp_systems_finance",
        "excel_advanced_finance",
        "finance_business_partnering",
        "financial_modeling",
        "presentation_skills",
        "saas_finance_metrics"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "solutions_engineer",
      "t": "solutions_engineer_junior",
      "score": 0.95,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "cloud_platforms",
        "communication",
        "crm_management",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "debugging",
        "integration_middleware",
        "poc_management",
        "product_demonstration",
        "sql",
        "technical_content_creation",
        "technical_discovery",
        "technical_onboarding_implementation"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "engineering_group_manager",
      "t": "senior_engineering_manager",
      "score": 0.94,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "organizational_design",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "senior_product_designer",
      "t": "design_lead_design_manager",
      "score": 0.94,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_critique",
        "design_for_complex_systems",
        "design_handoff",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "strategic_thinking",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "product_designer_ux_ui",
      "t": "senior_product_designer",
      "score": 0.934,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_handoff",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "information_architecture",
        "interaction_design",
        "mobile_design",
        "prototyping",
        "ui_visual_design",
        "usability_testing",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "business_intelligence_analyst",
      "t": "analytics_engineer",
      "score": 0.933,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_engineering_pipelines",
        "data_modeling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "consultant",
      "t": "senior_consultant",
      "score": 0.933,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "consulting_manager",
      "t": "senior_consultant",
      "score": 0.933,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "leadership",
        "process_improvement",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "engineering_group_manager",
      "t": "vp_engineering",
      "score": 0.933,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "performance_optimization",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "marketing_coordinator",
      "t": "social_media_manager",
      "score": 0.933,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "canva_design_tools",
        "community_management",
        "content_strategy",
        "copywriting",
        "customer_communication",
        "influencer_marketing",
        "marketing_analytics",
        "organization",
        "social_media_management"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "senior_data_analyst",
      "t": "business_intelligence_analyst",
      "score": 0.933,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "data_modeling",
        "data_storytelling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "senior_engineering_manager",
      "t": "vp_engineering",
      "score": 0.933,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "design_lead_design_manager",
      "t": "design_system_lead",
      "score": 0.93,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_handoff",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "strategic_thinking",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "business_development_representative",
      "t": "sales_development_representative",
      "score": 0.925,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cold_calling",
        "crm_management",
        "customer_communication",
        "lead_qualification",
        "linkedin_outreach",
        "market_research",
        "organization",
        "outbound_prospecting",
        "product_knowledge",
        "sales_tools_proficiency"
      ],
      "gaps": [],
      "gap_n": 1
    },
    {
      "s": "senior_bd_manager_strategic_partnerships",
      "t": "vp_business_development",
      "score": 0.925,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "ai_powered_sales_tools",
        "bd_team_leadership",
        "channel_sales_strategy",
        "commercial_negotiation",
        "ecosystem_development",
        "executive_leadership",
        "gtm_strategy",
        "joint_business_planning",
        "market_research_bd",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "vp_business_development",
      "t": "head_of_bd_head_of_partnerships",
      "score": 0.925,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_powered_sales_tools",
        "bd_team_leadership",
        "channel_sales_strategy",
        "commercial_negotiation",
        "ecosystem_development",
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "joint_business_planning",
        "partner_enablement",
        "partnership_development",
        "people_management",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "senior_consultant",
      "t": "consulting_manager",
      "score": 0.917,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "leadership",
        "process_improvement",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "program_manager",
      "t": "technical_project_manager",
      "score": 0.915,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "domain_expertise",
        "process_improvement",
        "project_management",
        "requirements_gathering",
        "risk_management",
        "stakeholder_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "vp_business_development",
      "t": "senior_bd_manager_strategic_partnerships",
      "score": 0.914,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "ai_powered_sales_tools",
        "bd_team_leadership",
        "channel_sales_strategy",
        "commercial_negotiation",
        "ecosystem_development",
        "executive_leadership",
        "gtm_strategy",
        "joint_business_planning",
        "market_research_bd",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "product_designer_ux_ui",
      "t": "design_system_lead",
      "score": 0.91,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_for_complex_systems",
        "design_handoff",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "analytics_engineer",
      "t": "business_intelligence_analyst",
      "score": 0.907,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "data_engineering_pipelines",
        "data_modeling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "senior_account_executive",
      "t": "enterprise_account_executive",
      "score": 0.907,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "consultative_selling",
        "crm_management",
        "deal_closing",
        "enterprise_sales",
        "executive_relationships",
        "negotiation",
        "outbound_prospecting",
        "pipeline_management",
        "saas_sales",
        "sales_forecasting",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "technical_project_manager",
      "t": "project_manager",
      "score": 0.907,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "agile_methodology",
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "vp_finance_cfo",
      "t": "finance_manager",
      "score": 0.907,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "cpa_accounting",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "financial_reporting",
        "gaap_ifrs",
        "investor_relations_finance",
        "people_management",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "data_analyst",
      "t": "senior_data_analyst",
      "score": 0.9,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "design_lead_design_manager",
      "t": "head_of_design_vp_design",
      "score": 0.894,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "social_media_manager",
      "t": "marketing_coordinator",
      "score": 0.892,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "canva_design_tools",
        "community_management",
        "content_strategy",
        "copywriting",
        "customer_communication",
        "influencer_marketing",
        "marketing_analytics",
        "organization",
        "social_media_management"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "consulting_manager",
      "t": "principal_director_consulting",
      "score": 0.883,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "emotional_intelligence",
        "executive_presentation",
        "financial_due_diligence",
        "hiring_talent_acquisition",
        "leadership",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership"
      ],
      "gap_n": 2
    },
    {
      "s": "finance_manager",
      "t": "vp_finance_cfo",
      "score": 0.883,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "cpa_accounting",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "financial_reporting",
        "gaap_ifrs",
        "investor_relations_finance",
        "people_management",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "head_of_design_vp_design",
      "t": "design_lead_design_manager",
      "score": 0.881,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "consultant",
      "t": "junior_consultant_analyst",
      "score": 0.88,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 1
    },
    {
      "s": "consulting_manager",
      "t": "consultant",
      "score": 0.88,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "communication"
      ],
      "gap_n": 2
    },
    {
      "s": "head_of_product",
      "t": "group_product_manager",
      "score": 0.88,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "organizational_design",
        "people_management",
        "pm_team_leadership",
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "it_manager",
      "t": "it_administrator_sysadmin",
      "score": 0.88,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "employee_lifecycle_it",
        "endpoint_management",
        "identity_access_management",
        "it_infrastructure_networking",
        "it_security_compliance",
        "saas_administration",
        "scripting_automation"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "senior_bd_manager_strategic_partnerships",
      "t": "partnerships_manager",
      "score": 0.88,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "channel_sales_strategy",
        "commercial_negotiation",
        "cross_team_collaboration",
        "gtm_strategy",
        "joint_business_planning",
        "market_research_bd",
        "partner_enablement",
        "partner_relationship_management",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "senior_consultant",
      "t": "junior_consultant_analyst",
      "score": 0.88,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 1
    },
    {
      "s": "vp_marketing",
      "t": "head_of_marketing",
      "score": 0.88,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "account_based_marketing",
        "ai_tools_marketing",
        "brand_management",
        "commercial_mindset",
        "demand_generation",
        "go_to_market_strategy",
        "marketing_analytics",
        "organizational_design",
        "people_management",
        "performance_marketing",
        "product_positioning"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "project_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.875,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "technical_project_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.875,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "vp_customer_success",
      "t": "director_customer_success",
      "score": 0.875,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "cross_functional_alignment",
        "customer_success_strategy",
        "executive_relationships",
        "expansion_strategy",
        "leadership",
        "operational_management",
        "organizational_design",
        "retention_strategy"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "group_product_manager",
      "t": "head_of_product",
      "score": 0.873,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "organizational_design",
        "people_management",
        "pm_team_leadership",
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "senior_bd_manager_strategic_partnerships",
      "score": 0.871,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_powered_sales_tools",
        "bd_team_leadership",
        "channel_sales_strategy",
        "commercial_negotiation",
        "ecosystem_development",
        "executive_leadership",
        "gtm_strategy",
        "joint_business_planning",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "chief_of_staff",
      "t": "business_ops_manager",
      "score": 0.867,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "design_system_lead",
      "t": "design_lead_design_manager",
      "score": 0.864,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_handoff",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "strategic_thinking",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "chief_of_staff",
      "t": "program_manager",
      "score": 0.855,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "cross_team_collaboration",
        "delivery_execution",
        "leadership",
        "process_improvement",
        "program_management",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_project_delivery"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "customer_support_specialist",
      "t": "customer_support_representative",
      "score": 0.85,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "executive_assistant",
      "t": "operations_coordinator",
      "score": 0.85,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "attention_to_detail",
        "communication",
        "office_operations",
        "travel_logistics_coordination"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "head_of_revops",
      "t": "vp_operations",
      "score": 0.85,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "bizops_process_automation",
        "leadership",
        "revops_commercial_analytics",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "it_administrator_sysadmin",
      "t": "it_support_specialist",
      "score": 0.85,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "employee_lifecycle_it",
        "endpoint_management",
        "helpdesk_support",
        "identity_access_management",
        "it_documentation_process",
        "it_infrastructure_networking",
        "scripting_automation"
      ],
      "gaps": [
        "communication"
      ],
      "gap_n": 1
    },
    {
      "s": "office_manager",
      "t": "operations_coordinator",
      "score": 0.85,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "communication",
        "office_operations",
        "travel_logistics_coordination",
        "vendor_procurement_management"
      ],
      "gaps": [],
      "gap_n": 2
    },
    {
      "s": "principal_director_consulting",
      "t": "consulting_manager",
      "score": 0.85,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "emotional_intelligence",
        "executive_presentation",
        "financial_due_diligence",
        "hiring_talent_acquisition",
        "leadership",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "senior_bd_manager_strategic_partnerships",
      "t": "head_of_bd_head_of_partnerships",
      "score": 0.85,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_powered_sales_tools",
        "bd_team_leadership",
        "channel_sales_strategy",
        "commercial_negotiation",
        "ecosystem_development",
        "executive_leadership",
        "gtm_strategy",
        "joint_business_planning",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "strategy_ops_manager",
      "t": "chief_of_staff",
      "score": 0.85,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "consulting_methodology",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "business_analyst",
      "t": "revops_analyst",
      "score": 0.847,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "sql",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "business_intelligence_analyst",
      "t": "data_analyst",
      "score": 0.847,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "data_storytelling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "revops_analyst",
      "t": "business_analyst",
      "score": 0.847,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "sql",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "senior_data_analyst",
      "t": "analytics_engineer",
      "score": 0.847,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_modeling",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "data_engineering_pipelines"
      ],
      "gap_n": 2
    },
    {
      "s": "senior_data_analyst",
      "t": "data_scientist",
      "score": 0.847,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_storytelling",
        "experimentation_framework",
        "machine_learning",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "enterprise_account_executive",
      "t": "senior_account_executive",
      "score": 0.84,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "consultative_selling",
        "crm_management",
        "deal_closing",
        "enterprise_sales",
        "executive_relationships",
        "negotiation",
        "outbound_prospecting",
        "pipeline_management",
        "saas_sales",
        "sales_forecasting",
        "stakeholder_management"
      ],
      "gaps": [
        "quota_attainment"
      ],
      "gap_n": 2
    },
    {
      "s": "senior_product_manager",
      "t": "product_manager",
      "score": 0.84,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "cross_functional_collaboration",
        "customer_discovery_interviews",
        "data_analysis",
        "go_to_market_product",
        "prd_writing",
        "product_discovery",
        "product_metrics",
        "roadmap_prioritization",
        "ux_product_design_sense"
      ],
      "gaps": [
        "product_lifecycle_management"
      ],
      "gap_n": 2
    },
    {
      "s": "design_lead_design_manager",
      "t": "senior_product_designer",
      "score": 0.836,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_critique",
        "design_for_complex_systems",
        "design_handoff",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "strategic_thinking",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "data_scientist",
      "t": "senior_data_analyst",
      "score": 0.833,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "machine_learning",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "bi_tools"
      ],
      "gap_n": 3
    },
    {
      "s": "senior_product_designer",
      "t": "ux_researcher",
      "score": 0.833,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "figma_mastery",
        "information_architecture",
        "prototyping",
        "strategic_thinking",
        "usability_testing",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "analytical_thinking"
      ],
      "gap_n": 2
    },
    {
      "s": "senior_product_designer",
      "t": "head_of_design_vp_design",
      "score": 0.831,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "strategic_thinking",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "chief_of_staff",
      "t": "strategy_ops_manager",
      "score": 0.825,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "consulting_methodology",
        "data_analysis",
        "project_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "chief_of_staff",
      "t": "vp_operations",
      "score": 0.825,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "bizops_process_automation",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "consultant",
      "t": "strategy_ops_manager",
      "score": 0.825,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "consulting_methodology",
        "data_analysis",
        "excel_advanced_finance",
        "project_management",
        "saas_finance_metrics",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5,
      "curated": true,
      "curated_note": "One of the most common consulting exit paths in Israel. Consulting frameworks + client delivery translate directly to strategy & ops."
    },
    {
      "s": "consulting_manager",
      "t": "strategy_ops_manager",
      "score": 0.825,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "consulting_methodology",
        "data_analysis",
        "excel_advanced_finance",
        "project_management",
        "saas_finance_metrics",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "data_engineer",
      "t": "analytics_engineer",
      "score": 0.825,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_engineering_pipelines",
        "data_modeling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "implementation_specialist",
      "t": "implementation_manager",
      "score": 0.825,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "api_integrations",
        "customer_communication",
        "delivery_execution",
        "implementation_management",
        "problem_solving",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "senior_consultant",
      "t": "strategy_ops_manager",
      "score": 0.825,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "consulting_methodology",
        "data_analysis",
        "excel_advanced_finance",
        "project_management",
        "saas_finance_metrics",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "senior_solutions_engineer",
      "t": "solutions_engineer",
      "score": 0.823,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "cloud_platforms",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "integration_middleware",
        "poc_management",
        "product_demonstration",
        "relationship_building",
        "rfp_response",
        "solution_design_architecture",
        "sql",
        "stakeholder_management",
        "technical_content_creation",
        "technical_discovery",
        "technical_sales_acumen"
      ],
      "gaps": [
        "communication"
      ],
      "gap_n": 4
    },
    {
      "s": "design_system_lead",
      "t": "senior_product_designer",
      "score": 0.821,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_handoff",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "strategic_thinking",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 6
    },
    {
      "s": "head_of_revops",
      "t": "revops_manager",
      "score": 0.817,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management",
        "revops_tech_stack_integration"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "product_designer_ux_ui",
      "t": "ux_researcher",
      "score": 0.817,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "figma_mastery",
        "information_architecture",
        "prototyping",
        "usability_testing",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "analytical_thinking"
      ],
      "gap_n": 3
    },
    {
      "s": "business_intelligence_analyst",
      "t": "senior_data_analyst",
      "score": 0.813,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_modeling",
        "data_storytelling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "controller",
      "t": "finance_manager",
      "score": 0.813,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "audit_management",
        "budget_forecasting",
        "cash_flow_management",
        "cpa_accounting",
        "erp_systems_finance",
        "financial_modeling",
        "financial_reporting",
        "gaap_ifrs",
        "people_management",
        "process_improvement"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "data_analyst",
      "t": "business_intelligence_analyst",
      "score": 0.813,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "data_storytelling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "data_modeling"
      ],
      "gap_n": 3
    },
    {
      "s": "data_scientist",
      "t": "data_analyst",
      "score": 0.813,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "bi_tools"
      ],
      "gap_n": 3
    },
    {
      "s": "fpa_analyst",
      "t": "senior_fpa_analyst",
      "score": 0.813,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "budget_forecasting",
        "bva_analysis",
        "data_analysis",
        "epm_planning_tools",
        "erp_systems_finance",
        "excel_advanced_finance",
        "finance_business_partnering",
        "financial_modeling",
        "presentation_skills",
        "saas_finance_metrics"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "program_manager",
      "t": "project_manager",
      "score": 0.813,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "staff_engineer",
      "t": "vp_engineering",
      "score": 0.813,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "performance_optimization",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "talent_strategy"
      ],
      "gap_n": 3
    },
    {
      "s": "head_of_ai",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.812,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_governance_compliance",
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "applied_ai_research",
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "ml_systems_thinking",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "head_of_marketing",
      "t": "vp_marketing",
      "score": 0.807,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "account_based_marketing",
        "ai_tools_marketing",
        "brand_management",
        "commercial_mindset",
        "demand_generation",
        "go_to_market_strategy",
        "marketing_analytics",
        "organizational_design",
        "people_management",
        "performance_marketing",
        "product_positioning"
      ],
      "gaps": [
        "executive_leadership"
      ],
      "gap_n": 3
    },
    {
      "s": "it_manager",
      "t": "head_of_it",
      "score": 0.805,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "identity_access_management",
        "it_infrastructure_networking",
        "it_operations_leadership",
        "it_security_compliance",
        "leadership",
        "security_program_leadership",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "solutions_engineer",
      "t": "senior_solutions_engineer",
      "score": 0.801,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "cloud_platforms",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "integration_middleware",
        "poc_management",
        "product_demonstration",
        "relationship_building",
        "rfp_response",
        "solution_design_architecture",
        "sql",
        "stakeholder_management",
        "technical_content_creation",
        "technical_discovery",
        "technical_sales_acumen"
      ],
      "gaps": [
        "domain_expertise"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_specialist",
      "t": "customer_support_representative",
      "score": 0.8,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_orientation",
        "customer_support_operations",
        "organization",
        "problem_solving"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "partnerships_manager",
      "t": "senior_bd_manager_strategic_partnerships",
      "score": 0.8,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "channel_sales_strategy",
        "commercial_negotiation",
        "cross_team_collaboration",
        "gtm_strategy",
        "joint_business_planning",
        "market_research_bd",
        "partner_enablement",
        "partner_relationship_management",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 5
    },
    {
      "s": "program_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.8,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "vp_operations",
      "t": "strategy_ops_manager",
      "score": 0.8,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "data_analysis",
        "revops_commercial_analytics",
        "saas_finance_metrics",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "project_manager",
      "t": "technical_project_manager",
      "score": 0.795,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "agile_methodology",
        "ai_tool_fluency",
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "technical_project_delivery"
      ],
      "gap_n": 3
    },
    {
      "s": "staff_engineer",
      "t": "engineering_group_manager",
      "score": 0.795,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "performance_optimization",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "people_management"
      ],
      "gap_n": 3
    },
    {
      "s": "head_of_it",
      "t": "ciso_head_of_security",
      "score": 0.794,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "executive_leadership",
        "grc_frameworks",
        "incident_response_forensics",
        "it_operations_leadership",
        "leadership",
        "security_program_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "vendor_third_party_risk"
      ],
      "gaps": [
        "risk_assessment_management"
      ],
      "gap_n": 3
    },
    {
      "s": "business_development_manager",
      "t": "senior_bd_manager_strategic_partnerships",
      "score": 0.791,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "ai_powered_sales_tools",
        "commercial_negotiation",
        "cross_team_collaboration",
        "gtm_strategy",
        "market_research_bd",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 7
    },
    {
      "s": "analytics_engineer",
      "t": "data_analyst",
      "score": 0.787,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "data_storytelling"
      ],
      "gap_n": 3
    },
    {
      "s": "business_ops_analyst",
      "t": "business_analyst",
      "score": 0.787,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "problem_solving",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "head_of_data",
      "t": "data_analyst",
      "score": 0.787,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "dashboarding",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "head_of_hr_people",
      "t": "hr_manager",
      "score": 0.787,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "compensation_benefits",
        "employer_branding",
        "hr_business_partnering",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "organizational_development",
        "people_management",
        "systems_thinking",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "employee_lifecycle_management"
      ],
      "gap_n": 3
    },
    {
      "s": "hr_manager",
      "t": "head_of_hr_people",
      "score": 0.787,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "compensation_benefits",
        "employer_branding",
        "hr_business_partnering",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "organizational_development",
        "people_management",
        "systems_thinking",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "stakeholder_management"
      ],
      "gap_n": 3
    },
    {
      "s": "revops_manager",
      "t": "product_operations_manager",
      "score": 0.787,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "workflow_automation"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 3
    },
    {
      "s": "revops_manager",
      "t": "revops_analyst",
      "score": 0.787,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management",
        "revops_tech_stack_integration",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 3
    },
    {
      "s": "principal_director_consulting",
      "t": "senior_consultant",
      "score": 0.783,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "leadership",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "consultant",
      "t": "consulting_manager",
      "score": 0.781,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "chief_of_staff",
      "score": 0.78,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "consulting_methodology",
        "emotional_intelligence",
        "leadership",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 4
    },
    {
      "s": "junior_consultant_analyst",
      "t": "business_ops_analyst",
      "score": 0.78,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "attention_to_detail",
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "project_management",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "senior_software_engineer",
      "t": "staff_engineer",
      "score": 0.78,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "mentoring",
        "performance_optimization",
        "system_architecture",
        "technical_leadership"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 5
    },
    {
      "s": "ai_engineer_mid",
      "t": "senior_ai_engineer",
      "score": 0.775,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_agent_development",
        "ai_cost_optimization",
        "ai_safety_responsible_ai",
        "backend_development",
        "domain_expertise",
        "llm_api_integration",
        "llm_evaluation",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "rag_systems",
        "system_design"
      ],
      "gaps": [],
      "gap_n": 7
    },
    {
      "s": "ciso_head_of_security",
      "t": "grc_analyst",
      "score": 0.775,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -4,
      "shared": [
        "ai_tool_fluency",
        "cloud_security_posture",
        "grc_frameworks",
        "risk_assessment_management",
        "security_policy_development",
        "stakeholder_management",
        "strategic_thinking",
        "vendor_third_party_risk"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "solutions_engineering_manager",
      "t": "head_of_solutions_engineering",
      "score": 0.775,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "change_management",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "delivery_methodology",
        "domain_expertise",
        "hiring_talent_acquisition",
        "se_team_leadership",
        "solution_design_architecture",
        "stakeholder_management",
        "strategic_thinking",
        "technical_content_creation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "executive_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "vp_sales",
      "t": "vp_customer_success",
      "score": 0.775,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "executive_relationships",
        "expansion_strategy",
        "leadership",
        "organizational_design",
        "retention_strategy"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "analytics_engineer",
      "t": "senior_data_analyst",
      "score": 0.773,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_modeling",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "data_storytelling"
      ],
      "gap_n": 4
    },
    {
      "s": "bdr_bd_associate",
      "t": "business_development_manager",
      "score": 0.77,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_powered_sales_tools",
        "analytical_thinking",
        "communication",
        "crm_management",
        "lead_qualification",
        "market_research_bd",
        "outbound_prospecting",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "sales_engagement_tools"
      ],
      "gaps": [
        "commercial_negotiation"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_software_engineer",
      "t": "tech_lead",
      "score": 0.77,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "code_review_practices",
        "cross_team_collaboration",
        "mentoring",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "sre_engineer",
      "t": "devops_engineer",
      "score": 0.77,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "ci_cd",
        "cloud_platforms_devops",
        "containerization",
        "distributed_systems",
        "linux_administration",
        "monitoring_observability",
        "networking_fundamentals",
        "scripting_automation",
        "security_best_practices"
      ],
      "gaps": [
        "infrastructure_as_code"
      ],
      "gap_n": 4
    },
    {
      "s": "design_system_lead",
      "t": "head_of_design_vp_design",
      "score": 0.769,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "strategic_thinking",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 7
    },
    {
      "s": "solutions_engineer_junior",
      "t": "solutions_engineer",
      "score": 0.768,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "cloud_platforms",
        "communication",
        "crm_management",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "debugging",
        "integration_middleware",
        "poc_management",
        "product_demonstration",
        "sql",
        "technical_content_creation",
        "technical_discovery",
        "technical_onboarding_implementation"
      ],
      "gaps": [
        "solution_design_architecture"
      ],
      "gap_n": 6
    },
    {
      "s": "product_manager",
      "t": "senior_product_manager",
      "score": 0.767,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_product_management",
        "analytical_thinking",
        "b2b_product_management",
        "competitive_analysis_product",
        "cross_functional_collaboration",
        "customer_discovery_interviews",
        "go_to_market_product",
        "prd_writing",
        "product_discovery",
        "product_metrics",
        "roadmap_prioritization",
        "ux_product_design_sense"
      ],
      "gaps": [
        "product_strategy",
        "stakeholder_management"
      ],
      "gap_n": 3
    },
    {
      "s": "senior_consultant",
      "t": "principal_director_consulting",
      "score": 0.767,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "leadership",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "product_designer_ux_ui",
      "t": "junior_ux_ui_designer",
      "score": 0.765,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "prototyping",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "wireframing"
      ],
      "gap_n": 3
    },
    {
      "s": "senior_product_designer",
      "t": "junior_ux_ui_designer",
      "score": 0.765,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "prototyping",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "wireframing"
      ],
      "gap_n": 3
    },
    {
      "s": "it_administrator_sysadmin",
      "t": "it_manager",
      "score": 0.763,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "employee_lifecycle_it",
        "endpoint_management",
        "identity_access_management",
        "it_infrastructure_networking",
        "it_security_compliance",
        "saas_administration",
        "scripting_automation"
      ],
      "gaps": [
        "it_operations_leadership"
      ],
      "gap_n": 4
    },
    {
      "s": "junior_ux_ui_designer",
      "t": "product_designer_ux_ui",
      "score": 0.762,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 1,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "prototyping",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [],
      "gap_n": 8
    },
    {
      "s": "business_development_manager",
      "t": "partnerships_manager",
      "score": 0.76,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "commercial_negotiation",
        "communication",
        "crm_management",
        "cross_team_collaboration",
        "gtm_strategy",
        "market_research_bd",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "partner_relationship_management"
      ],
      "gap_n": 4
    },
    {
      "s": "vp_sales",
      "t": "sales_director",
      "score": 0.76,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "enterprise_sales",
        "executive_relationships",
        "expansion_strategy",
        "go_to_market_strategy",
        "organizational_design",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "head_of_revops",
      "t": "chief_of_staff",
      "score": 0.755,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "bizops_process_automation",
        "leadership",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "principal_director_consulting",
      "t": "chief_of_staff",
      "score": 0.755,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "consulting_methodology",
        "emotional_intelligence",
        "leadership",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "chief_of_staff",
      "score": 0.755,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "consulting_methodology",
        "leadership",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 4
    },
    {
      "s": "vp_operations",
      "t": "chief_of_staff",
      "score": 0.755,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "bizops_process_automation",
        "leadership",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "business_ops_manager",
      "t": "product_operations_manager",
      "score": 0.753,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "workflow_automation"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "customer_experience_manager",
      "t": "product_operations_manager",
      "score": 0.753,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "delivery_execution",
        "process_design",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "hr_business_partner",
      "t": "hr_manager",
      "score": 0.753,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "employee_lifecycle_management",
        "hr_business_partnering",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "organizational_development",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "people_management"
      ],
      "gap_n": 4
    },
    {
      "s": "analytics_engineer",
      "t": "data_engineer",
      "score": 0.75,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_engineering_pipelines",
        "data_modeling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "business_intelligence_analyst",
      "t": "data_engineer",
      "score": 0.75,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_engineering_pipelines",
        "data_modeling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "customer_support_representative",
      "t": "customer_support_specialist",
      "score": 0.75,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "facilities_manager",
      "t": "office_manager",
      "score": 0.75,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "administrative_operations",
        "budget_cost_management",
        "communication",
        "employee_experience_welfare",
        "office_operations",
        "vendor_procurement_management"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "head_of_revops",
      "t": "strategy_ops_manager",
      "score": 0.75,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "data_analysis",
        "revops_commercial_analytics",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 6
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "principal_director_consulting",
      "score": 0.75,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "domain_expertise",
        "executive_leadership",
        "executive_presentation",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "proposal_development"
      ],
      "gap_n": 6
    },
    {
      "s": "office_manager",
      "t": "executive_assistant",
      "score": 0.75,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "communication",
        "executive_support",
        "office_operations",
        "travel_logistics_coordination"
      ],
      "gaps": [],
      "gap_n": 3
    },
    {
      "s": "sales_operations_manager",
      "t": "director_customer_success_operations",
      "score": 0.75,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 3,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_design",
        "process_improvement",
        "salesforce",
        "systems_thinking"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "solutions_engineering_manager",
      "t": "senior_solutions_engineer",
      "score": 0.748,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "domain_expertise",
        "poc_management",
        "product_demonstration",
        "solution_design_architecture",
        "stakeholder_management",
        "strategic_thinking",
        "technical_content_creation",
        "technical_discovery",
        "technical_sales_acumen"
      ],
      "gaps": [],
      "gap_n": 11
    },
    {
      "s": "finance_manager",
      "t": "controller",
      "score": 0.747,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "audit_management",
        "budget_forecasting",
        "cash_flow_management",
        "cpa_accounting",
        "erp_systems_finance",
        "financial_modeling",
        "financial_reporting",
        "gaap_ifrs",
        "people_management",
        "process_improvement"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 4
    },
    {
      "s": "revops_analyst",
      "t": "revops_manager",
      "score": 0.747,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management",
        "revops_tech_stack_integration",
        "sql"
      ],
      "gaps": [
        "bizops_cross_functional_execution"
      ],
      "gap_n": 4
    },
    {
      "s": "junior_consultant_analyst",
      "t": "consultant",
      "score": 0.74,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory"
      ],
      "gap_n": 5
    },
    {
      "s": "partnerships_manager",
      "t": "business_development_manager",
      "score": 0.74,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "commercial_negotiation",
        "communication",
        "crm_management",
        "cross_team_collaboration",
        "gtm_strategy",
        "market_research_bd",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "outbound_prospecting"
      ],
      "gap_n": 5
    },
    {
      "s": "design_lead_design_manager",
      "t": "product_designer_ux_ui",
      "score": 0.735,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_handoff",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "prototyping"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "program_manager",
      "score": 0.735,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "customer_communication",
        "domain_expertise",
        "leadership",
        "process_improvement",
        "program_management",
        "project_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration"
      ],
      "gap_n": 4
    },
    {
      "s": "staff_engineer",
      "t": "senior_engineering_manager",
      "score": 0.735,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "people_management"
      ],
      "gap_n": 4
    },
    {
      "s": "senior_solutions_engineer",
      "t": "senior_consultant",
      "score": 0.733,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "proposal_development",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [],
      "gap_n": 8
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "ai_transformation_lead",
      "score": 0.73,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "llm_api_integration",
        "no_code_ai_automation",
        "process_improvement",
        "prompt_engineering",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "change_management"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_it",
      "t": "it_manager",
      "score": 0.73,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "identity_access_management",
        "it_infrastructure_networking",
        "it_operations_leadership",
        "it_security_compliance",
        "leadership",
        "security_program_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "endpoint_management"
      ],
      "gap_n": 4
    },
    {
      "s": "hr_manager",
      "t": "hr_operations_manager",
      "score": 0.73,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "data_analysis",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "hris_management",
        "israeli_labor_law",
        "organizational_development",
        "systems_thinking"
      ],
      "gaps": [
        "process_improvement"
      ],
      "gap_n": 3
    },
    {
      "s": "strategy_ops_manager",
      "t": "business_ops_manager",
      "score": 0.73,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "process_improvement"
      ],
      "gap_n": 4
    },
    {
      "s": "business_ops_analyst",
      "t": "revops_analyst",
      "score": 0.727,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "sql"
      ],
      "gap_n": 4
    },
    {
      "s": "consulting_manager",
      "t": "junior_consultant_analyst",
      "score": 0.727,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "communication"
      ],
      "gap_n": 3
    },
    {
      "s": "data_analyst",
      "t": "analytics_engineer",
      "score": 0.727,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "data_engineering_pipelines",
        "data_modeling"
      ],
      "gap_n": 3
    },
    {
      "s": "data_analyst",
      "t": "data_scientist",
      "score": 0.727,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_storytelling",
        "experimentation_framework",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "machine_learning"
      ],
      "gap_n": 4
    },
    {
      "s": "product_operations_manager",
      "t": "sales_operations_manager",
      "score": 0.727,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_design",
        "process_improvement",
        "systems_thinking",
        "workflow_automation"
      ],
      "gaps": [
        "revenue_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "revops_manager",
      "t": "sales_operations_manager",
      "score": 0.727,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "salesforce",
        "sql",
        "workflow_automation"
      ],
      "gaps": [
        "revenue_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "senior_account_executive",
      "t": "account_executive",
      "score": 0.727,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "consultative_selling",
        "crm_management",
        "customer_communication",
        "deal_closing",
        "negotiation",
        "outbound_prospecting",
        "pipeline_management",
        "quota_attainment",
        "saas_sales"
      ],
      "gaps": [
        "discovery_calls"
      ],
      "gap_n": 4
    },
    {
      "s": "implementation_specialist",
      "t": "project_manager_customer_delivery",
      "score": 0.725,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "implementation_management",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 3
    },
    {
      "s": "content_marketing_manager",
      "t": "seo_manager",
      "score": 0.72,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "content_strategy",
        "data_analysis",
        "marketing_analytics",
        "seo_management",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 6
    },
    {
      "s": "engineering_manager",
      "t": "engineering_group_manager",
      "score": 0.72,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "organizational_design",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_data",
      "t": "business_intelligence_analyst",
      "score": 0.72,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "dashboarding",
        "data_analysis",
        "data_storytelling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_modeling"
      ],
      "gap_n": 5
    },
    {
      "s": "hr_business_partner",
      "t": "head_of_hr_people",
      "score": 0.72,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "compensation_benefits",
        "hr_business_partnering",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "organizational_development",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "people_management"
      ],
      "gap_n": 5
    },
    {
      "s": "principal_director_consulting",
      "t": "consultant",
      "score": 0.72,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "communication"
      ],
      "gap_n": 4
    },
    {
      "s": "senior_ai_engineer",
      "t": "senior_software_engineer",
      "score": 0.72,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "backend_development",
        "distributed_systems",
        "mentoring",
        "performance_optimization",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [],
      "gap_n": 7
    },
    {
      "s": "design_system_lead",
      "t": "product_designer_ux_ui",
      "score": 0.718,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_for_complex_systems",
        "design_handoff",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [
        "prototyping"
      ],
      "gap_n": 6
    },
    {
      "s": "ux_researcher",
      "t": "product_designer_ux_ui",
      "score": 0.718,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "figma_mastery",
        "information_architecture",
        "prototyping",
        "usability_testing",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "ui_visual_design"
      ],
      "gap_n": 6
    },
    {
      "s": "principal_director_consulting",
      "t": "head_of_solutions_engineering",
      "score": 0.717,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "change_management",
        "delivery_methodology",
        "domain_expertise",
        "executive_leadership",
        "executive_presentation",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "people_management",
        "relationship_building",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "technical_sales_acumen"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineering_manager",
      "t": "solutions_engineer",
      "score": 0.714,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "poc_management",
        "product_demonstration",
        "solution_design_architecture",
        "stakeholder_management",
        "technical_content_creation",
        "technical_discovery",
        "technical_onboarding_implementation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "api_design"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_data",
      "t": "senior_data_analyst",
      "score": 0.713,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "machine_learning",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "statistical_analysis"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "solutions_engineering_manager",
      "score": 0.713,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "change_management",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "delivery_methodology",
        "domain_expertise",
        "hiring_talent_acquisition",
        "se_team_leadership",
        "solution_design_architecture",
        "stakeholder_management",
        "strategic_thinking",
        "technical_content_creation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "communication"
      ],
      "gap_n": 6
    },
    {
      "s": "product_operations_manager",
      "t": "revops_manager",
      "score": 0.713,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_pipeline_management"
      ],
      "gap_n": 5
    },
    {
      "s": "sales_director",
      "t": "vp_sales",
      "score": 0.713,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "enterprise_sales",
        "executive_relationships",
        "expansion_strategy",
        "go_to_market_strategy",
        "organizational_design",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gaps": [
        "executive_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "program_manager",
      "score": 0.71,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "cross_team_collaboration",
        "customer_communication",
        "domain_expertise",
        "leadership",
        "process_improvement",
        "program_management",
        "project_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration"
      ],
      "gap_n": 5
    },
    {
      "s": "devops_engineer",
      "t": "sre_engineer",
      "score": 0.71,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "ci_cd",
        "cloud_platforms_devops",
        "containerization",
        "distributed_systems",
        "linux_administration",
        "monitoring_observability",
        "networking_fundamentals",
        "scripting_automation",
        "security_best_practices"
      ],
      "gaps": [
        "incident_management",
        "production_systems"
      ],
      "gap_n": 4
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "partnerships_manager",
      "score": 0.71,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "channel_sales_strategy",
        "commercial_negotiation",
        "crm_management",
        "gtm_strategy",
        "joint_business_planning",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "partner_relationship_management"
      ],
      "gap_n": 5
    },
    {
      "s": "it_support_specialist",
      "t": "it_administrator_sysadmin",
      "score": 0.71,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "employee_lifecycle_it",
        "endpoint_management",
        "helpdesk_support",
        "identity_access_management",
        "it_documentation_process",
        "it_infrastructure_networking",
        "scripting_automation"
      ],
      "gaps": [
        "saas_administration"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "technical_project_manager",
      "score": 0.71,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "cross_functional_collaboration"
      ],
      "gap_n": 5
    },
    {
      "s": "staff_engineer",
      "t": "senior_software_engineer",
      "score": 0.71,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "mentoring",
        "performance_optimization",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "python_development"
      ],
      "gap_n": 5
    },
    {
      "s": "vp_operations",
      "t": "business_ops_manager",
      "score": 0.71,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_enablement_training",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 3
    },
    {
      "s": "ux_researcher",
      "t": "senior_product_designer",
      "score": 0.707,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "figma_mastery",
        "information_architecture",
        "prototyping",
        "strategic_thinking",
        "usability_testing",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "ui_visual_design"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_manager",
      "t": "chief_of_staff",
      "score": 0.705,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_manager",
      "t": "junior_consultant_analyst",
      "score": 0.705,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_manager",
      "t": "strategy_ops_manager",
      "score": 0.705,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "consultant",
      "t": "chief_of_staff",
      "score": 0.705,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "consulting_methodology",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "Classic consulting exit \u2014 structured thinking, executive communication, and cross-functional delivery map directly to CoS."
    },
    {
      "s": "junior_consultant_analyst",
      "t": "strategy_ops_manager",
      "score": 0.705,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "consulting_methodology",
        "data_analysis",
        "excel_advanced_finance",
        "project_management",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "principal_director_consulting",
      "t": "strategy_ops_manager",
      "score": 0.705,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "consulting_methodology",
        "excel_advanced_finance",
        "project_management",
        "saas_finance_metrics",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "data_analysis"
      ],
      "gap_n": 6
    },
    {
      "s": "strategy_ops_manager",
      "t": "vp_operations",
      "score": 0.705,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "revops_commercial_analytics",
        "saas_finance_metrics",
        "strategic_thinking"
      ],
      "gaps": [
        "leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_specialist",
      "t": "customer_support_specialist",
      "score": 0.7,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_orientation",
        "customer_support_operations",
        "escalation_handling",
        "problem_solving"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "customer_support_specialist",
      "t": "customer_experience_specialist",
      "score": 0.7,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_orientation",
        "customer_support_operations",
        "escalation_handling",
        "problem_solving"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "director_customer_success",
      "t": "vp_customer_success",
      "score": 0.7,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_alignment",
        "customer_success_strategy",
        "executive_relationships",
        "expansion_strategy",
        "leadership",
        "operational_management",
        "organizational_design",
        "retention_strategy"
      ],
      "gaps": [
        "cross_functional_exec_presence",
        "executive_leadership"
      ],
      "gap_n": 2
    },
    {
      "s": "facilities_manager",
      "t": "operations_coordinator",
      "score": 0.7,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "administrative_operations",
        "communication",
        "office_operations",
        "vendor_procurement_management"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "head_of_admin_ga",
      "t": "office_manager",
      "score": 0.7,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "budget_cost_management",
        "employee_experience_welfare",
        "executive_support",
        "office_operations",
        "onboarding_offboarding_ops",
        "vendor_procurement_management"
      ],
      "gaps": [
        "communication"
      ],
      "gap_n": 3
    },
    {
      "s": "operations_coordinator",
      "t": "executive_assistant",
      "score": 0.7,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "attention_to_detail",
        "communication",
        "office_operations",
        "travel_logistics_coordination"
      ],
      "gaps": [
        "executive_support"
      ],
      "gap_n": 3
    },
    {
      "s": "procurement_specialist",
      "t": "operations_coordinator",
      "score": 0.7,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "vendor_procurement_management"
      ],
      "gaps": [
        "office_operations"
      ],
      "gap_n": 2
    },
    {
      "s": "vp_engineering",
      "t": "engineering_group_manager",
      "score": 0.7,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "performance_optimization",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gaps": [
        "cross_team_collaboration",
        "people_management"
      ],
      "gap_n": 3
    },
    {
      "s": "vp_engineering",
      "t": "senior_engineering_manager",
      "score": 0.7,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "distributed_systems",
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gaps": [
        "cross_team_collaboration",
        "people_management"
      ],
      "gap_n": 3
    },
    {
      "s": "consultant",
      "t": "business_ops_manager",
      "score": 0.697,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "business_ops_manager",
      "score": 0.697,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 5
    },
    {
      "s": "junior_consultant_analyst",
      "t": "business_ops_manager",
      "score": 0.697,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 5
    },
    {
      "s": "revops_manager",
      "t": "business_ops_manager",
      "score": 0.697,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "business_ops_manager",
      "score": 0.697,
      "type": "natural",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "Senior consultants frequently exit into operations leadership at tech companies."
    },
    {
      "s": "business_analyst",
      "t": "business_ops_analyst",
      "score": 0.693,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "problem_solving",
        "process_improvement",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 5
    },
    {
      "s": "customer_experience_manager",
      "t": "project_manager",
      "score": 0.693,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 5
    },
    {
      "s": "data_engineer",
      "t": "business_intelligence_analyst",
      "score": 0.693,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_engineering_pipelines",
        "data_modeling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "bi_tools"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "project_manager",
      "score": 0.693,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration"
      ],
      "gap_n": 5
    },
    {
      "s": "business_development_manager",
      "t": "head_of_bd_head_of_partnerships",
      "score": 0.688,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 3,
      "shared": [
        "ai_powered_sales_tools",
        "commercial_negotiation",
        "crm_management",
        "gtm_strategy",
        "outbound_prospecting",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "bd_team_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_manager",
      "t": "technical_project_manager",
      "score": 0.685,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "chief_of_staff",
      "t": "technical_project_manager",
      "score": 0.685,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "consulting_manager",
      "t": "senior_engineering_manager",
      "score": 0.685,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "engineering_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 6
    },
    {
      "s": "engineering_manager",
      "t": "senior_engineering_manager",
      "score": 0.685,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "organizational_design",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "tech_lead",
      "t": "engineering_manager",
      "score": 0.685,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "agile_methodology",
        "ai_tool_fluency",
        "backend_development",
        "ci_cd",
        "cloud_platforms",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "people_management",
        "performance_management"
      ],
      "gap_n": 5
    },
    {
      "s": "product_designer_ux_ui",
      "t": "design_lead_design_manager",
      "score": 0.684,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "accessibility_design",
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_handoff",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "design_critique",
        "design_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "design_system_lead",
      "t": "junior_ux_ui_designer",
      "score": 0.68,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [
        "wireframing"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_design_vp_design",
      "t": "design_system_lead",
      "score": 0.68,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "strategic_thinking",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [
        "figma_mastery"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager",
      "t": "business_ops_manager",
      "score": 0.68,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "problem_solving",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_consultant",
      "t": "vp_operations",
      "score": 0.68,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "domain_expertise",
        "leadership",
        "saas_finance_metrics",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_operational_scaling"
      ],
      "gap_n": 6
    },
    {
      "s": "seo_manager",
      "t": "product_analyst",
      "score": 0.68,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "product_metrics",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "ab_testing"
      ],
      "gap_n": 6
    },
    {
      "s": "vp_business_development",
      "t": "partnerships_manager",
      "score": 0.68,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "channel_sales_strategy",
        "commercial_negotiation",
        "gtm_strategy",
        "joint_business_planning",
        "market_research_bd",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "partner_relationship_management"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "solutions_engineering_manager",
      "score": 0.679,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "cross_team_collaboration",
        "delivery_methodology",
        "domain_expertise",
        "poc_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "customer_technical_relationship"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.675,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "implementation_manager",
      "t": "implementation_specialist",
      "score": 0.675,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "api_integrations",
        "customer_communication",
        "implementation_management",
        "problem_solving",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "requirements_gathering"
      ],
      "gap_n": 4
    },
    {
      "s": "office_manager",
      "t": "facilities_manager",
      "score": 0.675,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "administrative_operations",
        "budget_cost_management",
        "communication",
        "employee_experience_welfare",
        "office_operations",
        "vendor_procurement_management"
      ],
      "gaps": [
        "facilities_infrastructure"
      ],
      "gap_n": 3
    },
    {
      "s": "product_operations_manager",
      "t": "director_customer_success_operations",
      "score": 0.675,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 3,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_design",
        "process_improvement",
        "project_management",
        "systems_thinking"
      ],
      "gaps": [
        "salesforce"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "implementation_manager",
      "score": 0.675,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "implementation_management",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [],
      "gap_n": 5
    },
    {
      "s": "solutions_engineer",
      "t": "solutions_engineering_manager",
      "score": 0.675,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "poc_management",
        "product_demonstration",
        "solution_design_architecture",
        "stakeholder_management",
        "technical_content_creation",
        "technical_discovery",
        "technical_onboarding_implementation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_operations",
      "t": "head_of_revops",
      "score": 0.675,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "bizops_process_automation",
        "leadership",
        "revops_commercial_analytics",
        "strategic_thinking"
      ],
      "gaps": [
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 5
    },
    {
      "s": "account_executive",
      "t": "senior_account_executive",
      "score": 0.673,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "consultative_selling",
        "crm_management",
        "customer_communication",
        "deal_closing",
        "negotiation",
        "outbound_prospecting",
        "pipeline_management",
        "quota_attainment",
        "saas_sales"
      ],
      "gaps": [
        "enterprise_sales",
        "stakeholder_management"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_data_analyst",
      "t": "head_of_data",
      "score": 0.673,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "machine_learning",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_team_leadership",
        "people_management"
      ],
      "gap_n": 5
    },
    {
      "s": "brand_marketing_designer",
      "t": "design_system_lead",
      "score": 0.67,
      "type": "pivot",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [],
      "gap_n": 9
    },
    {
      "s": "head_of_design_vp_design",
      "t": "senior_product_designer",
      "score": 0.67,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_critique",
        "design_for_complex_systems",
        "design_leadership",
        "design_stakeholder_communication",
        "design_system_management",
        "strategic_thinking",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "figma_mastery"
      ],
      "gap_n": 9
    },
    {
      "s": "business_analyst",
      "t": "sales_operations_manager",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "salesforce",
        "sql",
        "workflow_automation"
      ],
      "gaps": [
        "revenue_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_manager",
      "t": "project_manager",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "cross_functional_collaboration",
        "delivery_execution",
        "problem_solving",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 5
    },
    {
      "s": "consultant",
      "t": "principal_director_consulting",
      "score": 0.667,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "proposal_development",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "content_marketing_manager",
      "t": "marketing_manager",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "demand_generation",
        "marketing_analytics",
        "product_positioning",
        "project_management",
        "social_media_management"
      ],
      "gaps": [
        "cross_functional_collaboration"
      ],
      "gap_n": 5
    },
    {
      "s": "director_customer_success_operations",
      "t": "sales_operations_manager",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "process_design",
        "process_improvement",
        "salesforce",
        "systems_thinking"
      ],
      "gaps": [
        "revenue_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "principal_director_consulting",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy",
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "change_management",
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking"
      ],
      "gap_n": 8
    },
    {
      "s": "prompt_engineer",
      "t": "junior_ai_ml_engineer",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_agent_development",
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "llm_api_integration",
        "llm_fundamentals",
        "prompt_engineering",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "machine_learning_fundamentals"
      ],
      "gap_n": 6
    },
    {
      "s": "revops_analyst",
      "t": "business_ops_analyst",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 5
    },
    {
      "s": "revops_analyst",
      "t": "sales_operations_manager",
      "score": 0.667,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "salesforce",
        "sql",
        "workflow_automation"
      ],
      "gaps": [
        "revenue_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "consulting_manager",
      "score": 0.664,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "proposal_development"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_analyst",
      "t": "junior_consultant_analyst",
      "score": 0.663,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "attention_to_detail",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "consulting_frameworks"
      ],
      "gap_n": 5
    },
    {
      "s": "hr_generalist",
      "t": "hr_operations_manager",
      "score": 0.663,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "hris_management",
        "israeli_labor_law"
      ],
      "gaps": [
        "process_improvement"
      ],
      "gap_n": 5
    },
    {
      "s": "hr_manager",
      "t": "talent_acquisition_manager",
      "score": 0.663,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "employer_branding",
        "hr_data_analytics",
        "organizational_development",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "stakeholder_management"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager",
      "t": "junior_consultant_analyst",
      "score": 0.663,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks"
      ],
      "gap_n": 5
    },
    {
      "s": "technical_project_manager",
      "t": "business_ops_manager",
      "score": 0.663,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 6
    },
    {
      "s": "consultant",
      "t": "business_ops_analyst",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "project_management",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 6
    },
    {
      "s": "consulting_manager",
      "t": "business_ops_analyst",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "project_management",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "business_development_manager",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "ai_powered_sales_tools",
        "commercial_negotiation",
        "crm_management",
        "gtm_strategy",
        "outbound_prospecting",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "market_research_bd"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_revops",
      "t": "business_ops_manager",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager",
      "t": "business_ops_analyst",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "attention_to_detail",
        "bizops_process_automation",
        "data_analysis",
        "problem_solving",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "project_manager",
      "t": "product_operations_manager",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_bd_manager_strategic_partnerships",
      "t": "business_development_manager",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_powered_sales_tools",
        "commercial_negotiation",
        "cross_team_collaboration",
        "gtm_strategy",
        "market_research_bd",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "outbound_prospecting"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_consultant",
      "t": "business_ops_analyst",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "project_management",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 6
    },
    {
      "s": "strategy_ops_manager",
      "t": "business_analyst",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": -2,
      "shared": [
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "sql",
        "technical_communication"
      ],
      "gaps": [],
      "gap_n": 7
    },
    {
      "s": "strategy_ops_manager",
      "t": "program_manager",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "cross_team_collaboration",
        "delivery_execution",
        "program_management",
        "project_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_project_manager",
      "t": "consultant",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "domain_expertise",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_project_manager",
      "t": "product_operations_manager",
      "score": 0.66,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "consulting_manager",
      "t": "vp_operations",
      "score": 0.655,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "domain_expertise",
        "leadership",
        "saas_finance_metrics",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_operational_scaling"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Consulting managers with portfolio and P&L experience move into VP Ops roles."
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "hr_operations_manager",
      "score": 0.652,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "compensation_benefits",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "hris_management",
        "process_improvement"
      ],
      "gaps": [
        "employee_lifecycle_management",
        "israeli_labor_law"
      ],
      "gap_n": 4
    },
    {
      "s": "data_scientist",
      "t": "analytics_engineer",
      "score": 0.652,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "data_engineering_pipelines",
        "data_modeling"
      ],
      "gap_n": 4
    },
    {
      "s": "head_of_hr_people",
      "t": "hr_business_partner",
      "score": 0.652,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "compensation_benefits",
        "hr_business_partnering",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "organizational_development",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "coaching",
        "performance_management"
      ],
      "gap_n": 4
    },
    {
      "s": "hr_operations_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.652,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "compensation_benefits",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "hris_management",
        "process_improvement"
      ],
      "gaps": [
        "excel_advanced_finance",
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "program_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_team_collaboration",
        "customer_communication",
        "delivery_execution",
        "domain_expertise",
        "leadership",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management"
      ],
      "gap_n": 5
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "business_ops_manager",
      "t": "program_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "cross_team_collaboration",
        "delivery_execution",
        "process_improvement",
        "program_management",
        "project_management",
        "stakeholder_management",
        "technical_project_delivery"
      ],
      "gaps": [
        "leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "consultant",
      "t": "project_manager_customer_delivery",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "consulting_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "customer_support_representative",
      "t": "customer_experience_specialist",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_orientation",
        "customer_support_operations",
        "organization",
        "problem_solving"
      ],
      "gaps": [],
      "gap_n": 4
    },
    {
      "s": "engineering_manager",
      "t": "staff_engineer",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "organizational_design",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring"
      ],
      "gap_n": 5
    },
    {
      "s": "facilities_manager",
      "t": "head_of_admin_ga",
      "score": 0.65,
      "type": "pivot",
      "gap_d": "none",
      "sen_gap": 2,
      "shared": [
        "budget_cost_management",
        "employee_experience_welfare",
        "leadership",
        "office_operations",
        "strategic_thinking",
        "vendor_procurement_management"
      ],
      "gaps": [],
      "gap_n": 7
    },
    {
      "s": "head_of_admin_ga",
      "t": "facilities_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "budget_cost_management",
        "employee_experience_welfare",
        "leadership",
        "office_operations",
        "strategic_thinking",
        "vendor_procurement_management"
      ],
      "gaps": [
        "facilities_infrastructure"
      ],
      "gap_n": 3
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "engineering_group_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "senior_engineering_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_consultant_analyst",
      "t": "project_manager_customer_delivery",
      "score": 0.65,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "mlops_engineer",
      "t": "devops_engineer",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ci_cd",
        "cloud_platforms_devops",
        "containerization",
        "databases",
        "linux_administration",
        "monitoring_observability",
        "python_development",
        "scripting_automation"
      ],
      "gaps": [
        "infrastructure_as_code"
      ],
      "gap_n": 6
    },
    {
      "s": "operations_coordinator",
      "t": "office_manager",
      "score": 0.65,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "communication",
        "office_operations",
        "travel_logistics_coordination",
        "vendor_procurement_management"
      ],
      "gaps": [
        "employee_experience_welfare"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager",
      "t": "customer_experience_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_journey_management"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager",
      "t": "implementation_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "problem_solving",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 4
    },
    {
      "s": "revops_manager",
      "t": "program_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "cross_team_collaboration",
        "delivery_execution",
        "process_improvement",
        "program_management",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_consultant",
      "t": "project_manager_customer_delivery",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "technical_project_manager",
      "t": "customer_experience_manager",
      "score": 0.65,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_journey_management"
      ],
      "gap_n": 4
    },
    {
      "s": "customer_experience_manager",
      "t": "business_ops_manager",
      "score": 0.647,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 6
    },
    {
      "s": "product_operations_manager",
      "t": "business_ops_manager",
      "score": 0.647,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_operations_manager",
      "t": "revops_manager",
      "score": 0.647,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "sql"
      ],
      "gaps": [
        "revops_pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_product_manager",
      "t": "head_of_product",
      "score": 0.647,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "product_led_growth",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gaps": [
        "people_management",
        "pm_team_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_manager",
      "t": "revops_manager",
      "score": 0.643,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 5
    },
    {
      "s": "ciso_head_of_security",
      "t": "head_of_it",
      "score": 0.64,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "executive_leadership",
        "grc_frameworks",
        "incident_response_forensics",
        "it_operations_leadership",
        "leadership",
        "security_program_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "vendor_third_party_risk"
      ],
      "gaps": [
        "identity_access_management",
        "it_infrastructure_networking",
        "it_security_compliance"
      ],
      "gap_n": 3
    },
    {
      "s": "data_analyst",
      "t": "head_of_data",
      "score": 0.64,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_team_leadership",
        "people_management"
      ],
      "gap_n": 6
    },
    {
      "s": "engineering_group_manager",
      "t": "staff_engineer",
      "score": 0.64,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "executive_leadership",
        "organizational_design",
        "performance_optimization",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "mentoring",
        "technical_leadership"
      ],
      "gap_n": 4
    },
    {
      "s": "hr_manager",
      "t": "hr_business_partner",
      "score": 0.64,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "employee_lifecycle_management",
        "hr_business_partnering",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "organizational_development",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "coaching",
        "performance_management",
        "stakeholder_management"
      ],
      "gap_n": 3
    },
    {
      "s": "junior_ux_ui_designer",
      "t": "design_system_lead",
      "score": 0.64,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 3,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "ui_visual_design",
        "ux_design_process"
      ],
      "gaps": [
        "design_system_management"
      ],
      "gap_n": 7
    },
    {
      "s": "ld_specialist",
      "t": "talent_acquisition_manager",
      "score": 0.64,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "coaching",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "organizational_development",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 3
    },
    {
      "s": "sales_operations_manager",
      "t": "product_operations_manager",
      "score": 0.64,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_design",
        "process_improvement",
        "systems_thinking",
        "workflow_automation"
      ],
      "gaps": [
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "technical_project_manager",
      "t": "program_manager",
      "score": 0.64,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "domain_expertise",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management",
        "technical_project_delivery"
      ],
      "gaps": [
        "leadership",
        "program_management"
      ],
      "gap_n": 4
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "head_of_ai",
      "score": 0.637,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_governance_compliance",
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "applied_ai_research",
        "domain_expertise",
        "executive_leadership",
        "ml_systems_thinking",
        "stakeholder_management",
        "strategic_thinking",
        "system_design"
      ],
      "gaps": [
        "people_management",
        "python_development",
        "technical_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_engineer_mid",
      "t": "junior_ai_ml_engineer",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_agent_development",
        "api_design",
        "debugging",
        "llm_api_integration",
        "machine_learning_fundamentals",
        "prompt_engineering",
        "python_development",
        "rag_systems",
        "vector_databases"
      ],
      "gaps": [
        "analytical_thinking",
        "llm_fundamentals"
      ],
      "gap_n": 6
    },
    {
      "s": "analytics_engineer",
      "t": "data_scientist",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "product_analytics_expertise",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "machine_learning"
      ],
      "gap_n": 6
    },
    {
      "s": "associate_product_manager",
      "t": "technical_product_manager",
      "score": 0.633,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "agile_scrum",
        "analytical_thinking",
        "cross_functional_collaboration",
        "prd_writing",
        "product_metrics",
        "technical_communication",
        "technical_product_management"
      ],
      "gaps": [
        "product_lifecycle_management"
      ],
      "gap_n": 6
    },
    {
      "s": "business_development_representative",
      "t": "bdr_bd_associate",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "crm_management",
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gaps": [],
      "gap_n": 6
    },
    {
      "s": "business_intelligence_analyst",
      "t": "data_scientist",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_storytelling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "machine_learning"
      ],
      "gap_n": 6
    },
    {
      "s": "chief_of_staff",
      "t": "project_manager",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "chief_of_staff",
      "t": "senior_consultant",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "cross_team_collaboration",
        "executive_presentation",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development"
      ],
      "gap_n": 8
    },
    {
      "s": "data_scientist",
      "t": "business_intelligence_analyst",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_storytelling",
        "python_data",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_data",
      "t": "data_scientist",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "data_storytelling",
        "experimentation_framework",
        "machine_learning",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "statistical_analysis"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_revops",
      "t": "revops_analyst",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management",
        "revops_tech_stack_integration",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "sql"
      ],
      "gap_n": 5
    },
    {
      "s": "implementation_manager",
      "t": "project_manager",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "problem_solving",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "seo_manager",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "marketing_analytics",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "content_strategy",
        "seo_management"
      ],
      "gap_n": 5
    },
    {
      "s": "product_manager",
      "t": "technical_product_manager",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "agile_scrum",
        "ai_product_management",
        "analytical_thinking",
        "cross_functional_collaboration",
        "prd_writing",
        "product_lifecycle_management",
        "product_metrics"
      ],
      "gaps": [
        "technical_product_management"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_development_representative",
      "t": "bdr_bd_associate",
      "score": 0.633,
      "type": "natural",
      "gap_d": "none",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "crm_management",
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gaps": [],
      "gap_n": 6,
      "curated": true,
      "curated_note": "SDR skills overlap almost entirely with BD associate roles."
    },
    {
      "s": "sales_manager",
      "t": "sales_director",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "enterprise_sales",
        "negotiation",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gaps": [
        "go_to_market_strategy"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_operations_manager",
      "t": "revops_analyst",
      "score": 0.633,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_solutions_engineer",
      "t": "consulting_manager",
      "score": 0.631,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "proposal_development",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "customer_success_associate",
      "t": "customer_success_manager",
      "score": 0.63,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "customer_health_monitoring",
        "customer_retention",
        "data_analysis",
        "product_adoption",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_relationship_management"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_hr_people",
      "t": "talent_acquisition_manager",
      "score": 0.63,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "employer_branding",
        "hr_data_analytics",
        "organizational_development",
        "people_management",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "analytical_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "office_manager",
      "t": "head_of_admin_ga",
      "score": 0.63,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "budget_cost_management",
        "employee_experience_welfare",
        "executive_support",
        "office_operations",
        "onboarding_offboarding_ops",
        "vendor_procurement_management"
      ],
      "gaps": [
        "leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_data_analyst",
      "t": "data_engineer",
      "score": 0.63,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_modeling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_engineering_pipelines"
      ],
      "gap_n": 6
    },
    {
      "s": "ai_transformation_lead",
      "t": "ai_solutions_engineering_manager",
      "score": 0.629,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "llm_api_integration",
        "no_code_ai_automation",
        "process_improvement",
        "prompt_engineering",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "customer_facing_ai_delivery",
        "people_management",
        "technical_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "chief_of_staff",
      "t": "consulting_manager",
      "score": 0.629,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "emotional_intelligence",
        "executive_presentation",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.629,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy",
        "ai_strategy_roadmap",
        "change_management",
        "cross_team_collaboration",
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_team_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "applied_ai_researcher",
      "t": "cv_edge_ai_engineer",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "applied_ai_research",
        "computer_vision",
        "deep_learning",
        "domain_expertise",
        "machine_learning_fundamentals",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "debugging",
        "edge_ai_deployment",
        "performance_optimization"
      ],
      "gap_n": 7
    },
    {
      "s": "consulting_manager",
      "t": "engineering_group_manager",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "engineering_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_admin_ga",
      "t": "procurement_specialist",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "budget_cost_management",
        "contract_negotiation",
        "global_operations_compliance",
        "stakeholder_management",
        "vendor_procurement_management"
      ],
      "gaps": [
        "analytical_thinking"
      ],
      "gap_n": 4
    },
    {
      "s": "head_of_ai",
      "t": "senior_engineering_manager",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "cross_team_collaboration"
      ],
      "gap_n": 7
    },
    {
      "s": "implementation_specialist",
      "t": "technical_project_manager",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "requirements_gathering",
        "stakeholder_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "principal_director_consulting",
      "t": "program_manager",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "domain_expertise",
        "leadership",
        "program_management",
        "project_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "implementation_specialist",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "requirements_gathering",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "implementation_specialist",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "implementation_management",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "requirements_gathering"
      ],
      "gap_n": 4
    },
    {
      "s": "senior_ai_engineer",
      "t": "ai_engineer_mid",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_agent_development",
        "ai_cost_optimization",
        "ai_safety_responsible_ai",
        "backend_development",
        "domain_expertise",
        "llm_api_integration",
        "llm_evaluation",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "prompt_engineering",
        "vector_databases"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_ai_engineer",
      "t": "staff_engineer",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "backend_development",
        "distributed_systems",
        "executive_leadership",
        "mentoring",
        "performance_optimization",
        "system_architecture",
        "technical_leadership"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_solutions_engineer",
      "t": "solutions_engineer_junior",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "cloud_platforms",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "integration_middleware",
        "poc_management",
        "product_demonstration",
        "sql",
        "technical_content_creation",
        "technical_discovery"
      ],
      "gaps": [
        "communication",
        "debugging",
        "technical_onboarding_implementation"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_support_engineer",
      "t": "technical_support_engineer",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "api_integrations",
        "cloud_tools",
        "cross_functional_collaboration",
        "customer_communication",
        "technical_documentation",
        "technical_troubleshooting"
      ],
      "gaps": [
        "debugging",
        "problem_solving"
      ],
      "gap_n": 3
    },
    {
      "s": "technical_project_manager",
      "t": "implementation_specialist",
      "score": 0.625,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "requirements_gathering",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 4
    },
    {
      "s": "business_ops_manager",
      "t": "consultant",
      "score": 0.62,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory"
      ],
      "gap_n": 9
    },
    {
      "s": "design_lead_design_manager",
      "t": "junior_ux_ui_designer",
      "score": 0.62,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "wireframing"
      ],
      "gap_n": 6
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "consultant",
      "score": 0.62,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_solutions_engineer",
      "t": "consultant",
      "score": 0.62,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "domain_expertise",
        "executive_presentation",
        "proposal_development",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "communication"
      ],
      "gap_n": 7
    },
    {
      "s": "chief_of_staff",
      "t": "junior_consultant_analyst",
      "score": 0.618,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail"
      ],
      "gap_n": 5
    },
    {
      "s": "cv_edge_ai_engineer",
      "t": "applied_ai_researcher",
      "score": 0.618,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "applied_ai_research",
        "computer_vision",
        "deep_learning",
        "domain_expertise",
        "machine_learning_fundamentals",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development"
      ],
      "gaps": [
        "llm_evaluation"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_data",
      "t": "analytics_engineer",
      "score": 0.618,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "data_analysis",
        "python_data",
        "sql_advanced",
        "systems_thinking"
      ],
      "gaps": [
        "data_engineering_pipelines",
        "data_modeling"
      ],
      "gap_n": 5
    },
    {
      "s": "hr_business_partner",
      "t": "talent_acquisition_manager",
      "score": 0.618,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "coaching",
        "data_analysis",
        "hr_data_analytics",
        "organizational_development",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "employer_branding",
        "people_management"
      ],
      "gap_n": 5
    },
    {
      "s": "technical_project_manager",
      "t": "junior_consultant_analyst",
      "score": 0.618,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "consulting_frameworks"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "head_of_solutions_engineering",
      "score": 0.617,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "change_management",
        "cross_team_collaboration",
        "delivery_methodology",
        "domain_expertise",
        "executive_presentation",
        "hiring_talent_acquisition",
        "people_management",
        "relationship_building",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_product",
      "t": "senior_product_manager",
      "score": 0.617,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "product_led_growth",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gaps": [
        "prd_writing",
        "product_metrics"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_consultant_analyst",
      "t": "senior_consultant",
      "score": 0.617,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineer",
      "t": "senior_consultant",
      "score": 0.617,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "cross_team_collaboration",
        "proposal_development",
        "stakeholder_management"
      ],
      "gaps": [
        "executive_presentation"
      ],
      "gap_n": 10
    },
    {
      "s": "engineering_manager",
      "t": "tech_lead",
      "score": 0.615,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "agile_methodology",
        "ai_tool_fluency",
        "backend_development",
        "ci_cd",
        "cloud_platforms",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "code_review_practices",
        "python_development"
      ],
      "gap_n": 5
    },
    {
      "s": "tech_lead",
      "t": "senior_software_engineer",
      "score": 0.615,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "code_review_practices",
        "cross_team_collaboration",
        "mentoring",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "performance_optimization"
      ],
      "gap_n": 5
    },
    {
      "s": "data_scientist",
      "t": "head_of_data",
      "score": 0.613,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "data_analysis",
        "data_storytelling",
        "experimentation_framework",
        "machine_learning",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_team_leadership",
        "people_management"
      ],
      "gap_n": 6
    },
    {
      "s": "finance_manager",
      "t": "senior_fpa_analyst",
      "score": 0.613,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "investor_relations_finance",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [
        "bva_analysis",
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_solutions_engineer",
      "t": "head_of_solutions_engineering",
      "score": 0.613,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "domain_expertise",
        "executive_presentation",
        "gtm_strategy",
        "relationship_building",
        "solution_design_architecture",
        "stakeholder_management",
        "strategic_thinking",
        "technical_content_creation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "delivery_methodology",
        "executive_leadership",
        "se_team_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_finance_cfo",
      "t": "senior_fpa_analyst",
      "score": 0.613,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "investor_relations_finance",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [
        "bva_analysis",
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "applied_ai_researcher",
      "t": "senior_ai_engineer",
      "score": 0.612,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_agent_development",
        "applied_ai_research",
        "deep_learning",
        "domain_expertise",
        "llm_evaluation",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "rag_systems",
        "system_design"
      ],
      "gaps": [
        "backend_development",
        "llm_api_integration"
      ],
      "gap_n": 9
    },
    {
      "s": "hr_manager",
      "t": "hr_generalist",
      "score": 0.61,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "employee_lifecycle_management",
        "employer_branding",
        "hr_data_analytics",
        "hris_management",
        "israeli_labor_law",
        "learning_development",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "organization"
      ],
      "gap_n": 4
    },
    {
      "s": "talent_acquisition_manager",
      "t": "ld_specialist",
      "score": 0.61,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "coaching",
        "cross_functional_collaboration",
        "hr_data_analytics",
        "organizational_development",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "learning_development",
        "program_management"
      ],
      "gap_n": 4
    },
    {
      "s": "vp_business_development",
      "t": "business_development_manager",
      "score": 0.61,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -4,
      "shared": [
        "ai_powered_sales_tools",
        "commercial_negotiation",
        "gtm_strategy",
        "market_research_bd",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "outbound_prospecting"
      ],
      "gap_n": 7
    },
    {
      "s": "business_ops_analyst",
      "t": "sales_operations_manager",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "salesforce",
        "workflow_automation"
      ],
      "gaps": [
        "revenue_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_manager",
      "t": "business_analyst",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "problem_solving",
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_manager",
      "t": "business_ops_analyst",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "problem_solving",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance"
      ],
      "gap_n": 5
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "business_analyst",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "technical_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "director_customer_success_operations",
      "t": "product_operations_manager",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "delivery_execution",
        "process_design",
        "process_improvement",
        "project_management",
        "systems_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "hr_generalist",
      "t": "hr_manager",
      "score": 0.607,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "employee_lifecycle_management",
        "employer_branding",
        "hr_data_analytics",
        "hris_management",
        "israeli_labor_law",
        "learning_development",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "hr_business_partnering",
        "people_management"
      ],
      "gap_n": 5
    },
    {
      "s": "junior_consultant_analyst",
      "t": "project_manager",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management"
      ],
      "gap_n": 5
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "growth_marketing_manager",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ab_testing_marketing",
        "ai_tools_marketing",
        "b2b_marketing",
        "marketing_analytics",
        "marketing_automation",
        "sales_collaboration",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "demand_generation",
        "performance_marketing"
      ],
      "gap_n": 5
    },
    {
      "s": "marketing_manager",
      "t": "content_marketing_manager",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "demand_generation",
        "marketing_analytics",
        "product_positioning",
        "project_management",
        "social_media_management"
      ],
      "gaps": [
        "analytical_thinking",
        "copywriting",
        "seo_management"
      ],
      "gap_n": 4
    },
    {
      "s": "senior_product_manager",
      "t": "group_product_manager",
      "score": 0.607,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gaps": [
        "people_management",
        "pm_team_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "chief_of_staff",
      "score": 0.605,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 8
    },
    {
      "s": "principal_director_consulting",
      "t": "vp_operations",
      "score": 0.605,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "domain_expertise",
        "leadership",
        "saas_finance_metrics",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_operational_scaling"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_ai_engineer",
      "t": "applied_ai_researcher",
      "score": 0.604,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_agent_development",
        "applied_ai_research",
        "deep_learning",
        "domain_expertise",
        "llm_evaluation",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "analytical_thinking",
        "machine_learning_fundamentals"
      ],
      "gap_n": 9
    },
    {
      "s": "business_ops_manager",
      "t": "senior_consultant",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "cross_team_collaboration",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development"
      ],
      "gap_n": 10
    },
    {
      "s": "chief_of_staff",
      "t": "consultant",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "client_advisory"
      ],
      "gap_n": 8
    },
    {
      "s": "chief_of_staff",
      "t": "senior_engineering_manager",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 8
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "product_operations_manager",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "consulting_manager",
      "t": "solutions_engineering_manager",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "change_management",
        "cross_team_collaboration",
        "delivery_methodology",
        "domain_expertise",
        "hiring_talent_acquisition",
        "poc_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "communication",
        "customer_technical_relationship"
      ],
      "gap_n": 9
    },
    {
      "s": "customer_success_manager",
      "t": "customer_success_associate",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "customer_health_monitoring",
        "customer_retention",
        "data_analysis",
        "product_adoption",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "relationship_building"
      ],
      "gap_n": 3
    },
    {
      "s": "customer_support_specialist",
      "t": "technical_support_engineer",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "problem_solving",
        "technical_documentation",
        "technical_troubleshooting"
      ],
      "gaps": [
        "debugging"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "senior_consultant",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "consulting_frameworks",
        "proposal_development"
      ],
      "gap_n": 8
    },
    {
      "s": "implementation_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "implementation_management",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 5
    },
    {
      "s": "it_manager",
      "t": "it_support_specialist",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "employee_lifecycle_it",
        "endpoint_management",
        "identity_access_management",
        "it_infrastructure_networking",
        "scripting_automation"
      ],
      "gaps": [
        "communication",
        "helpdesk_support"
      ],
      "gap_n": 3
    },
    {
      "s": "marketing_manager",
      "t": "growth_marketing_manager",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "marketing_automation",
        "performance_marketing"
      ],
      "gaps": [
        "ab_testing_marketing"
      ],
      "gap_n": 7
    },
    {
      "s": "marketing_manager",
      "t": "head_of_marketing",
      "score": 0.6,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "brand_management",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing",
        "product_positioning"
      ],
      "gaps": [
        "go_to_market_strategy",
        "people_management"
      ],
      "gap_n": 6
    },
    {
      "s": "program_manager",
      "t": "senior_engineering_manager",
      "score": 0.6,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 8
    },
    {
      "s": "revops_manager",
      "t": "head_of_revops",
      "score": 0.6,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management",
        "revops_tech_stack_integration"
      ],
      "gaps": [
        "bizops_executive_communication",
        "leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_consultant",
      "t": "senior_engineering_manager",
      "score": 0.6,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 8
    },
    {
      "s": "solutions_engineering_manager",
      "t": "senior_consultant",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineering_manager",
      "t": "solutions_engineer_junior",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "poc_management",
        "product_demonstration",
        "technical_content_creation",
        "technical_discovery",
        "technical_onboarding_implementation"
      ],
      "gaps": [
        "api_design",
        "debugging",
        "sql"
      ],
      "gap_n": 6
    },
    {
      "s": "strategy_ops_manager",
      "t": "product_operations_manager",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "strategy_ops_manager",
      "t": "revops_analyst",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "revops_crm_administration"
      ],
      "gap_n": 7
    },
    {
      "s": "talent_acquisition_manager",
      "t": "product_operations_manager",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "tech_lead",
      "t": "staff_engineer",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "mentoring",
        "system_architecture",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "strategic_thinking"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_transformation_lead",
      "t": "prompt_engineer",
      "score": 0.593,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "llm_api_integration",
        "prompt_engineering"
      ],
      "gaps": [
        "conversational_ai_design",
        "llm_evaluation",
        "llm_fundamentals"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_analyst",
      "t": "revops_manager",
      "score": 0.593,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "revops_pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_manager",
      "t": "revops_manager",
      "score": 0.593,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "partnerships_manager",
      "t": "bdr_bd_associate",
      "score": 0.592,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "communication",
        "crm_management",
        "market_research_bd",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gap_n": 4
    },
    {
      "s": "business_ops_analyst",
      "t": "business_ops_manager",
      "score": 0.59,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_enablement_training",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "problem_solving",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_okr_framework",
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager",
      "t": "program_manager",
      "score": 0.59,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "program_management"
      ],
      "gap_n": 6
    },
    {
      "s": "partnerships_manager",
      "t": "head_of_bd_head_of_partnerships",
      "score": 0.588,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "channel_sales_strategy",
        "commercial_negotiation",
        "crm_management",
        "gtm_strategy",
        "joint_business_planning",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "bd_team_leadership",
        "strategic_thinking"
      ],
      "gap_n": 8
    },
    {
      "s": "solutions_engineering_manager",
      "t": "junior_consultant_analyst",
      "score": 0.588,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 6
    },
    {
      "s": "vp_finance_cfo",
      "t": "controller",
      "score": 0.587,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "cpa_accounting",
        "erp_systems_finance",
        "financial_modeling",
        "financial_reporting",
        "gaap_ifrs",
        "people_management"
      ],
      "gaps": [
        "audit_management",
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "senior_solutions_engineer",
      "score": 0.585,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "domain_expertise",
        "executive_presentation",
        "gtm_strategy",
        "relationship_building",
        "solution_design_architecture",
        "stakeholder_management",
        "strategic_thinking",
        "technical_content_creation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "poc_management",
        "product_demonstration",
        "technical_discovery"
      ],
      "gap_n": 11
    },
    {
      "s": "junior_consultant_analyst",
      "t": "chief_of_staff",
      "score": 0.585,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "consulting_methodology",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "junior_consultant_analyst",
      "score": 0.585,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "consulting_frameworks"
      ],
      "gap_n": 6
    },
    {
      "s": "controller",
      "t": "vp_finance_cfo",
      "score": 0.583,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "cpa_accounting",
        "erp_systems_finance",
        "financial_modeling",
        "financial_reporting",
        "gaap_ifrs",
        "people_management"
      ],
      "gaps": [
        "investor_relations_finance",
        "saas_finance_metrics"
      ],
      "gap_n": 7
    },
    {
      "s": "group_product_manager",
      "t": "senior_product_manager",
      "score": 0.583,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gaps": [
        "prd_writing",
        "product_metrics"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_fpa_analyst",
      "t": "vp_finance_cfo",
      "score": 0.583,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "investor_relations_finance",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [
        "financial_reporting",
        "people_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_solutions_engineer",
      "t": "principal_director_consulting",
      "score": 0.583,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "domain_expertise",
        "executive_presentation",
        "gtm_strategy",
        "proposal_development",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "leadership"
      ],
      "gap_n": 9
    },
    {
      "s": "technical_project_manager",
      "t": "senior_consultant",
      "score": 0.583,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "domain_expertise",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "proposal_development"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "business_ops_manager",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 8
    },
    {
      "s": "business_intelligence_analyst",
      "t": "head_of_data",
      "score": 0.58,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "data_analysis",
        "data_storytelling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_team_leadership",
        "people_management"
      ],
      "gap_n": 7
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "product_analyst",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "business_ops_manager",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_engineering_manager",
      "t": "staff_engineer",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "executive_leadership",
        "organizational_design",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "mentoring",
        "technical_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "solutions_engineering_manager",
      "t": "consultant",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "domain_expertise",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_product_manager",
      "t": "associate_product_manager",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "agile_scrum",
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "prd_writing",
        "product_metrics",
        "technical_communication",
        "technical_product_management"
      ],
      "gaps": [
        "organization",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "technical_product_manager",
      "t": "product_manager",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "agile_scrum",
        "ai_product_management",
        "cross_functional_collaboration",
        "data_analysis",
        "prd_writing",
        "product_lifecycle_management",
        "product_metrics"
      ],
      "gaps": [
        "product_discovery",
        "roadmap_prioritization"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_engineering",
      "t": "staff_engineer",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_strategy",
        "cloud_platforms",
        "distributed_systems",
        "executive_leadership",
        "organizational_design",
        "performance_optimization",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "mentoring",
        "technical_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "vp_marketing",
      "t": "vp_sales",
      "score": 0.58,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "cross_functional_exec_presence",
        "executive_leadership",
        "expansion_strategy",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "junior_ux_ui_designer",
      "t": "senior_product_designer",
      "score": 0.579,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "interaction_design",
        "mobile_design",
        "prototyping",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "design_for_complex_systems",
        "design_stakeholder_communication"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_consultant",
      "t": "head_of_solutions_engineering",
      "score": 0.579,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "change_management",
        "cross_team_collaboration",
        "delivery_methodology",
        "domain_expertise",
        "executive_presentation",
        "people_management",
        "relationship_building",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 9
    },
    {
      "s": "data_scientist",
      "t": "data_engineer",
      "score": 0.577,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "llm_genai_data",
        "mlops",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_engineering_pipelines",
        "data_modeling"
      ],
      "gap_n": 5
    },
    {
      "s": "hr_business_partner",
      "t": "hr_generalist",
      "score": 0.577,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "performance_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "organization"
      ],
      "gap_n": 5
    },
    {
      "s": "hr_business_partner",
      "t": "hr_operations_manager",
      "score": 0.577,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "data_analysis",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "israeli_labor_law",
        "organizational_development"
      ],
      "gaps": [
        "hris_management",
        "process_improvement"
      ],
      "gap_n": 5
    },
    {
      "s": "solutions_engineering_manager",
      "t": "consulting_manager",
      "score": 0.576,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "change_management",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 9
    },
    {
      "s": "business_ops_manager",
      "t": "implementation_manager",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "problem_solving",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "chief_of_staff",
      "t": "head_of_revops",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "bizops_process_automation",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_manager",
      "t": "implementation_manager",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 5
    },
    {
      "s": "operations_coordinator",
      "t": "procurement_specialist",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "vendor_procurement_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation"
      ],
      "gap_n": 4
    },
    {
      "s": "product_operations_manager",
      "t": "customer_experience_manager",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_design",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 4
    },
    {
      "s": "product_operations_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "program_manager",
      "t": "implementation_manager",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 5
    },
    {
      "s": "revops_analyst",
      "t": "head_of_revops",
      "score": 0.575,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_executive_communication",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management",
        "revops_tech_stack_integration"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "revops_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "risk_management"
      ],
      "gap_n": 4
    },
    {
      "s": "senior_customer_success_manager",
      "t": "customer_experience_manager",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_advocacy",
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "technical_project_manager",
      "t": "implementation_manager",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 5
    },
    {
      "s": "vp_marketing",
      "t": "vp_customer_success",
      "score": 0.575,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "expansion_strategy",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "retention_strategy"
      ],
      "gap_n": 5
    },
    {
      "s": "chief_of_staff",
      "t": "product_operations_manager",
      "score": 0.573,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "workflow_automation"
      ],
      "gaps": [
        "analytical_thinking",
        "product_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "data_engineer",
      "t": "data_scientist",
      "score": 0.573,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "llm_genai_data",
        "mlops",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "machine_learning",
        "statistical_analysis"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_ai",
      "t": "vp_engineering",
      "score": 0.573,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "talent_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "implementation_specialist",
      "t": "project_manager",
      "score": 0.573,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "communication",
        "customer_communication",
        "delivery_execution",
        "problem_solving",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "product_operations_manager",
      "score": 0.573,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_manager",
      "t": "senior_account_executive",
      "score": 0.573,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "consultative_selling",
        "crm_management",
        "customer_communication",
        "enterprise_sales",
        "negotiation",
        "pipeline_management",
        "sales_forecasting"
      ],
      "gaps": [
        "deal_closing",
        "quota_attainment",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "head_of_hr_people",
      "score": 0.573,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "employer_branding",
        "hr_data_analytics",
        "organizational_development",
        "people_management",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "hr_business_partnering"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_solutions_engineer",
      "t": "solutions_engineering_manager",
      "score": 0.571,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "domain_expertise",
        "poc_management",
        "product_demonstration",
        "solution_design_architecture",
        "stakeholder_management",
        "strategic_thinking",
        "technical_content_creation",
        "technical_discovery",
        "technical_sales_acumen"
      ],
      "gaps": [
        "communication",
        "delivery_methodology",
        "se_team_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "ai_transformation_lead",
      "score": 0.57,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_governance_compliance",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "ai_transformation_change_mgmt",
        "change_management",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "llm_api_integration",
        "no_code_ai_automation",
        "prompt_engineering"
      ],
      "gap_n": 8
    },
    {
      "s": "applied_ai_researcher",
      "t": "junior_ai_ml_engineer",
      "score": 0.567,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_agent_development",
        "analytical_thinking",
        "communication",
        "deep_learning",
        "llm_fundamentals",
        "machine_learning_fundamentals",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "llm_api_integration",
        "prompt_engineering"
      ],
      "gap_n": 7
    },
    {
      "s": "strategy_ops_manager",
      "t": "senior_consultant",
      "score": 0.567,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "executive_presentation",
        "financial_due_diligence",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_ai",
      "t": "engineering_group_manager",
      "score": 0.565,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "cross_team_collaboration",
        "organizational_design"
      ],
      "gap_n": 7
    },
    {
      "s": "mlops_engineer",
      "t": "sre_engineer",
      "score": 0.565,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ci_cd",
        "cloud_platforms_devops",
        "containerization",
        "linux_administration",
        "monitoring_observability",
        "performance_optimization",
        "scripting_automation"
      ],
      "gaps": [
        "incident_management",
        "production_systems"
      ],
      "gap_n": 7
    },
    {
      "s": "design_lead_design_manager",
      "t": "ux_researcher",
      "score": 0.563,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "figma_mastery",
        "strategic_thinking",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "analytical_thinking",
        "usability_testing"
      ],
      "gap_n": 5
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "ai_engineer_mid",
      "score": 0.562,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_agent_development",
        "api_design",
        "debugging",
        "llm_api_integration",
        "machine_learning_fundamentals",
        "prompt_engineering",
        "python_development",
        "rag_systems",
        "vector_databases"
      ],
      "gaps": [
        "backend_development",
        "ml_systems_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_ai_engineer",
      "t": "head_of_ai",
      "score": 0.562,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_agent_development",
        "ai_safety_responsible_ai",
        "ai_strategy_roadmap",
        "applied_ai_research",
        "deep_learning",
        "domain_expertise",
        "executive_leadership",
        "mentoring",
        "ml_systems_thinking",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_team_leadership",
        "people_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_engineer_mid",
      "t": "prompt_engineer",
      "score": 0.56,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "domain_expertise",
        "llm_api_integration",
        "llm_evaluation",
        "prompt_engineering",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "communication",
        "conversational_ai_design",
        "llm_fundamentals"
      ],
      "gap_n": 7
    },
    {
      "s": "business_development_manager",
      "t": "vp_business_development",
      "score": 0.56,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 4,
      "shared": [
        "ai_powered_sales_tools",
        "commercial_negotiation",
        "gtm_strategy",
        "market_research_bd",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "bd_team_leadership",
        "executive_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_analyst",
      "t": "strategy_ops_manager",
      "score": 0.56,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_executive_communication",
        "data_analysis",
        "excel_advanced_finance",
        "project_management",
        "revops_commercial_analytics",
        "saas_finance_metrics"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "strategic_thinking"
      ],
      "gap_n": 8
    },
    {
      "s": "consultant",
      "t": "vp_operations",
      "score": 0.56,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 4,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "domain_expertise",
        "saas_finance_metrics",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_operational_scaling",
        "leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "prompt_engineer",
      "score": 0.56,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_agent_development",
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "llm_api_integration",
        "llm_fundamentals",
        "prompt_engineering",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "ai_product_thinking",
        "conversational_ai_design",
        "llm_evaluation"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "chief_of_staff",
      "score": 0.56,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 7
    },
    {
      "s": "engineering_group_manager",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.558,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy",
        "ai_strategy_roadmap",
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_team_leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_engineering_manager",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.558,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy",
        "ai_strategy_roadmap",
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_team_leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "consultant",
      "t": "program_manager",
      "score": 0.555,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "customer_communication",
        "domain_expertise",
        "process_improvement",
        "program_management",
        "project_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "grc_analyst",
      "t": "ciso_head_of_security",
      "score": 0.555,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 4,
      "shared": [
        "ai_tool_fluency",
        "cloud_security_posture",
        "grc_frameworks",
        "risk_assessment_management",
        "security_policy_development",
        "stakeholder_management",
        "strategic_thinking",
        "vendor_third_party_risk"
      ],
      "gaps": [
        "incident_response_forensics",
        "security_program_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_solutions_engineer",
      "t": "chief_of_staff",
      "score": 0.555,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 9
    },
    {
      "s": "seo_manager",
      "t": "strategy_ops_manager",
      "score": 0.555,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "ux_researcher",
      "t": "design_lead_design_manager",
      "score": 0.555,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "data_visualization_design",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "figma_mastery",
        "strategic_thinking",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "design_critique",
        "design_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_operations",
      "t": "program_manager",
      "score": 0.555,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "cross_team_collaboration",
        "domain_expertise",
        "leadership",
        "process_improvement",
        "program_management",
        "strategic_thinking"
      ],
      "gaps": [
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "consulting_manager",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.554,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy",
        "ai_team_leadership",
        "change_management",
        "cross_team_collaboration",
        "domain_expertise",
        "engineering_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_strategy_roadmap",
        "executive_leadership"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_ai",
      "t": "ai_solutions_engineering_manager",
      "score": 0.554,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "domain_expertise",
        "hiring_talent_acquisition",
        "mentoring",
        "people_management",
        "python_development",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "communication",
        "customer_facing_ai_delivery",
        "llm_api_integration"
      ],
      "gap_n": 9
    },
    {
      "s": "sales_director",
      "t": "enterprise_account_executive",
      "score": 0.553,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "enterprise_sales",
        "executive_relationships",
        "negotiation",
        "sales_forecasting",
        "stakeholder_management"
      ],
      "gaps": [
        "consultative_selling",
        "deal_closing"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "head_of_ai",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_agent_development",
        "ai_hiring_talent",
        "ai_product_thinking",
        "domain_expertise",
        "mentoring",
        "people_management",
        "python_development",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "ml_systems_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "business_ops_manager",
      "t": "head_of_revops",
      "score": 0.55,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_onboarding_specialist",
      "t": "customer_success_associate",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "onboarding_training",
        "product_adoption"
      ],
      "gaps": [
        "relationship_building"
      ],
      "gap_n": 5
    },
    {
      "s": "executive_assistant",
      "t": "office_manager",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "communication",
        "executive_support",
        "office_operations",
        "travel_logistics_coordination"
      ],
      "gaps": [
        "employee_experience_welfare",
        "vendor_procurement_management"
      ],
      "gap_n": 4
    },
    {
      "s": "head_of_it",
      "t": "grc_analyst",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "cloud_security_posture",
        "grc_frameworks",
        "it_security_compliance",
        "stakeholder_management",
        "strategic_thinking",
        "vendor_third_party_risk"
      ],
      "gaps": [
        "risk_assessment_management",
        "security_policy_development"
      ],
      "gap_n": 4
    },
    {
      "s": "procurement_specialist",
      "t": "executive_assistant",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "attention_to_detail",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 4
    },
    {
      "s": "procurement_specialist",
      "t": "facilities_manager",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "administrative_operations",
        "budget_cost_management",
        "communication",
        "vendor_procurement_management"
      ],
      "gaps": [
        "facilities_infrastructure"
      ],
      "gap_n": 5
    },
    {
      "s": "program_manager",
      "t": "senior_consultant",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "consulting_frameworks",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager",
      "t": "implementation_specialist",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "problem_solving",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 4
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "senior_consultant",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_consultant",
      "t": "head_of_revops",
      "score": 0.55,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "leadership",
        "revops_gtm_process_design",
        "strategic_thinking"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "support_team_lead",
      "t": "customer_success_team_lead",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "coaching",
        "cross_functional_collaboration",
        "customer_success_metrics",
        "people_management",
        "process_improvement"
      ],
      "gaps": [
        "customer_retention"
      ],
      "gap_n": 5
    },
    {
      "s": "technical_support_engineer",
      "t": "senior_support_engineer",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "api_integrations",
        "cloud_tools",
        "cross_functional_collaboration",
        "customer_communication",
        "technical_documentation",
        "technical_troubleshooting"
      ],
      "gaps": [
        "advanced_debugging",
        "incident_management",
        "technical_leadership"
      ],
      "gap_n": 3
    },
    {
      "s": "business_ops_analyst",
      "t": "product_operations_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "workflow_automation"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 5
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "fpa_analyst",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "budget_forecasting",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "financial_modeling"
      ],
      "gaps": [
        "bva_analysis"
      ],
      "gap_n": 7
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "revops_analyst",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 6
    },
    {
      "s": "consultant",
      "t": "project_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "enterprise_account_executive",
      "t": "account_executive",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "consultative_selling",
        "crm_management",
        "deal_closing",
        "negotiation",
        "outbound_prospecting",
        "pipeline_management",
        "saas_sales"
      ],
      "gaps": [
        "discovery_calls",
        "quota_attainment"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_design_vp_design",
      "t": "ux_researcher",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_for_complex_systems",
        "design_portfolio",
        "design_stakeholder_communication",
        "strategic_thinking",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "analytical_thinking",
        "usability_testing"
      ],
      "gap_n": 6
    },
    {
      "s": "hr_operations_manager",
      "t": "hr_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "hris_management",
        "israeli_labor_law",
        "organizational_development",
        "systems_thinking"
      ],
      "gaps": [
        "hr_business_partnering",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 5
    },
    {
      "s": "product_analyst",
      "t": "seo_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "product_metrics",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 5
    },
    {
      "s": "product_manager",
      "t": "associate_product_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "agile_scrum",
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_discovery_interviews",
        "data_analysis",
        "prd_writing",
        "product_metrics",
        "ux_product_design_sense"
      ],
      "gaps": [
        "organization",
        "problem_solving",
        "technical_communication"
      ],
      "gap_n": 5
    },
    {
      "s": "revops_manager",
      "t": "business_analyst",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "revops_manager",
      "t": "project_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "communication",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_director",
      "t": "sales_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "enterprise_sales",
        "negotiation",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gaps": [
        "coaching",
        "pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_operations_manager",
      "t": "business_analyst",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_account_executive",
      "t": "channel_partner_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "customer_communication",
        "negotiation",
        "pipeline_management",
        "saas_sales",
        "stakeholder_management"
      ],
      "gaps": [
        "channel_partner_management",
        "relationship_building"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_account_executive",
      "t": "sales_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "consultative_selling",
        "crm_management",
        "customer_communication",
        "enterprise_sales",
        "negotiation",
        "pipeline_management",
        "sales_forecasting"
      ],
      "gaps": [
        "coaching",
        "people_management",
        "sales_team_leadership"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "project_manager",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "vp_operations",
      "t": "business_ops_analyst",
      "score": 0.547,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "program_manager",
      "t": "consulting_manager",
      "score": 0.545,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "cross_team_collaboration",
        "domain_expertise",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "ai_transformation_lead",
      "t": "junior_consultant_analyst",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "consulting_frameworks",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "client_engagement_delivery"
      ],
      "gap_n": 6
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "revops_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "content_marketing_manager",
      "t": "marketing_coordinator",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "copywriting",
        "marketing_analytics",
        "social_media_management"
      ],
      "gaps": [
        "customer_communication",
        "organization"
      ],
      "gap_n": 6
    },
    {
      "s": "director_customer_success_operations",
      "t": "revops_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_business_case_development",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_business_partner",
      "t": "ld_specialist",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "coaching",
        "hr_data_analytics",
        "learning_development",
        "organizational_development",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management"
      ],
      "gap_n": 6
    },
    {
      "s": "hr_generalist",
      "t": "talent_acquisition_manager",
      "score": 0.543,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "employer_branding",
        "hr_data_analytics",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "people_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "hr_operations_manager",
      "t": "hr_generalist",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "hris_management",
        "israeli_labor_law"
      ],
      "gaps": [
        "organization",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_specialist",
      "t": "business_ops_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_executive_communication",
        "bizops_process_automation",
        "problem_solving",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_okr_framework"
      ],
      "gap_n": 7
    },
    {
      "s": "ld_specialist",
      "t": "hr_business_partner",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "coaching",
        "hr_data_analytics",
        "learning_development",
        "organizational_development",
        "stakeholder_management"
      ],
      "gaps": [
        "hr_business_partnering",
        "performance_management"
      ],
      "gap_n": 6
    },
    {
      "s": "product_marketing_manager",
      "t": "content_marketing_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "b2b_marketing",
        "content_strategy",
        "copywriting",
        "product_positioning"
      ],
      "gaps": [
        "project_management",
        "seo_management"
      ],
      "gap_n": 6
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "business_ops_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_okr_framework"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_manager",
      "t": "junior_consultant_analyst",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "communication"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_customer_success_manager",
      "t": "customer_success_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_advocacy",
        "customer_communication",
        "customer_relationship_management",
        "data_analysis",
        "renewal_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_retention",
        "product_adoption"
      ],
      "gap_n": 6
    },
    {
      "s": "seo_manager",
      "t": "content_marketing_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "content_strategy",
        "marketing_analytics",
        "seo_management",
        "technical_communication"
      ],
      "gaps": [
        "copywriting",
        "project_management"
      ],
      "gap_n": 6
    },
    {
      "s": "strategy_ops_manager",
      "t": "junior_consultant_analyst",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "financial_due_diligence",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "communication"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "hr_business_partner",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "coaching",
        "hr_data_analytics",
        "organizational_development",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "hr_business_partnering",
        "performance_management"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "revops_manager",
      "score": 0.543,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_engineer_mid",
      "t": "senior_software_engineer",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "api_design",
        "backend_development",
        "cloud_platforms",
        "databases",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "distributed_systems",
        "performance_optimization"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_engineer_mid",
      "t": "software_engineer",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "api_design",
        "backend_development",
        "databases",
        "debugging",
        "python_development"
      ],
      "gaps": [
        "git_version_control"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "project_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "communication",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "senior_engineering_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "people_management",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "engineering_leadership",
        "system_architecture"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_transformation_lead",
      "t": "consultant",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "consulting_frameworks",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "executive_presentation"
      ],
      "gap_n": 7
    },
    {
      "s": "associate_product_manager",
      "t": "business_analyst",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "dashboarding",
        "data_analysis",
        "problem_solving",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 8
    },
    {
      "s": "associate_product_manager",
      "t": "product_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "agile_scrum",
        "cross_functional_collaboration",
        "customer_discovery_interviews",
        "data_analysis",
        "prd_writing",
        "product_metrics",
        "ux_product_design_sense"
      ],
      "gaps": [
        "product_discovery",
        "product_lifecycle_management",
        "roadmap_prioritization"
      ],
      "gap_n": 7
    },
    {
      "s": "chief_of_staff",
      "t": "engineering_group_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design"
      ],
      "gap_n": 9
    },
    {
      "s": "controller",
      "t": "fpa_analyst",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "budget_forecasting",
        "bva_analysis",
        "erp_systems_finance",
        "excel_advanced_finance",
        "financial_modeling"
      ],
      "gaps": [
        "analytical_thinking"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_admin_ga",
      "t": "engineering_group_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_admin_ga",
      "t": "senior_engineering_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_marketing",
      "t": "growth_marketing_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "account_based_marketing",
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing"
      ],
      "gaps": [
        "ab_testing_marketing",
        "marketing_automation"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_revops",
      "t": "senior_engineering_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "hr_operations_manager",
      "t": "product_operations_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "systems_thinking"
      ],
      "gaps": [
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "sales_operations_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "systems_thinking"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "ld_specialist",
      "t": "product_operations_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "marketing_coordinator",
      "t": "content_marketing_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "copywriting",
        "marketing_analytics",
        "social_media_management"
      ],
      "gaps": [
        "analytical_thinking",
        "project_management",
        "seo_management"
      ],
      "gap_n": 6
    },
    {
      "s": "program_manager",
      "t": "engineering_group_manager",
      "score": 0.54,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design"
      ],
      "gap_n": 9
    },
    {
      "s": "project_manager",
      "t": "consultant",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 9
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "business_ops_analyst",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_crm_administration",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance"
      ],
      "gap_n": 7
    },
    {
      "s": "sales_operations_manager",
      "t": "seo_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "marketing_analytics",
        "sql"
      ],
      "gaps": [
        "content_strategy",
        "seo_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_ai_engineer",
      "t": "tech_lead",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "backend_development",
        "mentoring",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "code_review_practices"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_consultant",
      "t": "engineering_group_manager",
      "score": 0.54,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 2,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design"
      ],
      "gap_n": 9
    },
    {
      "s": "seo_manager",
      "t": "business_analyst",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 8
    },
    {
      "s": "solutions_engineer",
      "t": "consultant",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "proposal_development",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "executive_presentation"
      ],
      "gap_n": 9
    },
    {
      "s": "strategy_ops_manager",
      "t": "consultant",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "financial_due_diligence",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "communication"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_operations",
      "t": "senior_engineering_manager",
      "score": 0.54,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_design_vp_design",
      "t": "product_designer_ux_ui",
      "score": 0.539,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "design_system_management",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "figma_mastery",
        "prototyping"
      ],
      "gap_n": 9
    },
    {
      "s": "prompt_engineer",
      "t": "ai_transformation_lead",
      "score": 0.538,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "llm_api_integration",
        "prompt_engineering"
      ],
      "gaps": [
        "ai_transformation_change_mgmt",
        "change_management",
        "no_code_ai_automation",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "principal_director_consulting",
      "t": "head_of_ai",
      "score": 0.537,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "domain_expertise",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ml_systems_thinking",
        "python_development"
      ],
      "gap_n": 11
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "chief_of_staff",
      "score": 0.535,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 8
    },
    {
      "s": "revops_manager",
      "t": "strategy_ops_manager",
      "score": 0.535,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "sql",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 8
    },
    {
      "s": "software_engineer",
      "t": "junior_software_engineer",
      "score": 0.535,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cloud_fundamentals",
        "debugging",
        "frontend_development",
        "git_version_control",
        "python_development",
        "testing_practices"
      ],
      "gaps": [
        "data_structures_algorithms",
        "programming_fundamentals"
      ],
      "gap_n": 5
    },
    {
      "s": "ai_transformation_lead",
      "t": "senior_consultant",
      "score": 0.533,
      "type": "stretch",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 8
    },
    {
      "s": "principal_director_consulting",
      "t": "junior_consultant_analyst",
      "score": 0.532,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "executive_presentation",
        "financial_due_diligence",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gap_n": 5
    },
    {
      "s": "associate_product_manager",
      "t": "strategy_ops_manager",
      "score": 0.53,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "customer_experience_manager",
      "t": "technical_project_manager",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_ai",
      "t": "staff_engineer",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "executive_leadership",
        "mentoring",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_revops",
      "t": "program_manager",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "cross_functional_collaboration",
        "cross_team_collaboration",
        "leadership",
        "process_improvement",
        "program_management",
        "strategic_thinking"
      ],
      "gaps": [
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "vp_operations",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "domain_expertise",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_operational_scaling"
      ],
      "gap_n": 9
    },
    {
      "s": "principal_director_consulting",
      "t": "engineering_group_manager",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "organizational_design"
      ],
      "gap_n": 7
    },
    {
      "s": "principal_director_consulting",
      "t": "senior_engineering_manager",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_manager",
      "t": "technical_project_manager",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_software_engineer",
      "t": "software_engineer",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "backend_development",
        "databases",
        "distributed_systems",
        "python_development"
      ],
      "gaps": [
        "git_version_control"
      ],
      "gap_n": 8
    },
    {
      "s": "staff_engineer",
      "t": "tech_lead",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "mentoring",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "code_review_practices",
        "python_development"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "engineering_group_manager",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design",
        "people_management"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "senior_engineering_manager",
      "score": 0.53,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "people_management",
        "system_architecture"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_engineer_mid",
      "t": "applied_ai_researcher",
      "score": 0.529,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_agent_development",
        "domain_expertise",
        "llm_evaluation",
        "machine_learning_fundamentals",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "analytical_thinking",
        "applied_ai_research",
        "deep_learning"
      ],
      "gap_n": 10
    },
    {
      "s": "business_analyst",
      "t": "revops_manager",
      "score": 0.527,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "sql"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "business_ops_manager",
      "score": 0.527,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "talent_acquisition_manager",
      "t": "business_ops_manager",
      "score": 0.527,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_sales",
      "t": "vp_marketing",
      "score": 0.527,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "cross_functional_exec_presence",
        "executive_leadership",
        "expansion_strategy",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "brand_management",
        "demand_generation"
      ],
      "gap_n": 7
    },
    {
      "s": "ux_researcher",
      "t": "head_of_design_vp_design",
      "score": 0.526,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_for_complex_systems",
        "design_portfolio",
        "design_stakeholder_communication",
        "strategic_thinking",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "design_critique",
        "design_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_operations",
      "t": "consulting_manager",
      "score": 0.526,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "leadership",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "account_executive",
      "t": "bdr_bd_associate",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "communication",
        "crm_management",
        "outbound_prospecting",
        "pipeline_management"
      ],
      "gaps": [
        "lead_qualification"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "implementation_manager",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_analyst",
      "t": "director_customer_success_operations",
      "score": 0.525,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_improvement",
        "project_management",
        "salesforce"
      ],
      "gaps": [
        "process_design",
        "systems_thinking"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "head_of_revops",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "leadership",
        "revops_gtm_process_design",
        "strategic_thinking"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_ai",
      "t": "senior_ai_engineer",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "ai_agent_development",
        "ai_safety_responsible_ai",
        "ai_strategy_roadmap",
        "applied_ai_research",
        "deep_learning",
        "domain_expertise",
        "mentoring",
        "ml_systems_thinking",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "backend_development",
        "llm_api_integration",
        "llm_evaluation",
        "rag_systems"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_product",
      "t": "vp_customer_success",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "retention_strategy"
      ],
      "gap_n": 6
    },
    {
      "s": "mlops_engineer",
      "t": "cv_edge_ai_engineer",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "cuda_gpu_programming",
        "data_pipeline_ml",
        "deep_learning",
        "linux_administration",
        "ml_systems_thinking",
        "model_deployment_serving",
        "performance_optimization",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "analytical_thinking",
        "computer_vision",
        "debugging",
        "edge_ai_deployment"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_manager",
      "t": "director_customer_success_operations",
      "score": 0.525,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_improvement",
        "project_management",
        "salesforce"
      ],
      "gaps": [
        "process_design",
        "systems_thinking"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_account_executive",
      "t": "bdr_bd_associate",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "communication",
        "crm_management",
        "outbound_prospecting",
        "pipeline_management"
      ],
      "gaps": [
        "lead_qualification"
      ],
      "gap_n": 7
    },
    {
      "s": "strategy_ops_manager",
      "t": "head_of_revops",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "revops_commercial_analytics",
        "strategic_thinking"
      ],
      "gaps": [
        "leadership",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_finance_cfo",
      "t": "vp_customer_success",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "retention_strategy"
      ],
      "gap_n": 6
    },
    {
      "s": "vp_operations",
      "t": "customer_experience_manager",
      "score": 0.525,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "cross_functional_collaboration",
        "customer_journey_management",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "customer_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "solutions_engineer_junior",
      "t": "solutions_engineering_manager",
      "score": 0.521,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "poc_management",
        "product_demonstration",
        "technical_content_creation",
        "technical_discovery",
        "technical_onboarding_implementation"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "business_intelligence_analyst",
      "t": "business_analyst",
      "score": 0.52,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "python_data",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_manager",
      "t": "consultant",
      "score": 0.52,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 10
    },
    {
      "s": "growth_marketing_manager",
      "t": "lifecycle_marketing_manager",
      "score": 0.52,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ab_testing_marketing",
        "ai_tools_marketing",
        "b2b_marketing",
        "marketing_analytics",
        "marketing_automation",
        "sales_collaboration",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "customer_retention",
        "data_analysis",
        "lifecycle_marketing"
      ],
      "gap_n": 5
    },
    {
      "s": "implementation_specialist",
      "t": "consultant",
      "score": 0.52,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "consulting_frameworks"
      ],
      "gap_n": 10
    },
    {
      "s": "program_manager",
      "t": "consultant",
      "score": 0.52,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "bdr_bd_associate",
      "score": 0.517,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "ai_powered_sales_tools",
        "crm_management",
        "outbound_prospecting",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "communication",
        "lead_qualification"
      ],
      "gap_n": 5
    },
    {
      "s": "vp_operations",
      "t": "senior_consultant",
      "score": 0.517,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "leadership",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "applied_ai_researcher",
      "score": 0.514,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_agent_development",
        "analytical_thinking",
        "communication",
        "deep_learning",
        "llm_fundamentals",
        "machine_learning_fundamentals",
        "python_development",
        "rag_systems",
        "technical_communication"
      ],
      "gaps": [
        "applied_ai_research",
        "llm_evaluation",
        "ml_systems_thinking",
        "model_training_finetuning"
      ],
      "gap_n": 10
    },
    {
      "s": "account_executive",
      "t": "enterprise_account_executive",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "consultative_selling",
        "crm_management",
        "deal_closing",
        "negotiation",
        "outbound_prospecting",
        "pipeline_management",
        "saas_sales"
      ],
      "gaps": [
        "enterprise_sales",
        "executive_relationships",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "analytics_engineer",
      "t": "head_of_data",
      "score": 0.513,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cloud_data_platforms",
        "data_analysis",
        "python_data",
        "sql_advanced",
        "systems_thinking"
      ],
      "gaps": [
        "data_storytelling",
        "data_team_leadership",
        "people_management"
      ],
      "gap_n": 7
    },
    {
      "s": "business_analyst",
      "t": "business_intelligence_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "python_data"
      ],
      "gaps": [
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 7
    },
    {
      "s": "business_ops_manager",
      "t": "associate_product_manager",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "organization"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_manager",
      "t": "sales_operations_manager",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "workflow_automation"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "business_intelligence_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "sales_operations_manager",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_design",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "data_engineer",
      "t": "data_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "bi_tools",
        "data_storytelling"
      ],
      "gap_n": 7
    },
    {
      "s": "data_engineer",
      "t": "senior_data_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "data_analysis",
        "data_modeling",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "bi_tools",
        "data_storytelling",
        "statistical_analysis"
      ],
      "gap_n": 7
    },
    {
      "s": "director_customer_success_operations",
      "t": "revops_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "sql"
      ],
      "gap_n": 7
    },
    {
      "s": "enterprise_account_executive",
      "t": "sales_director",
      "score": 0.513,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "enterprise_sales",
        "executive_relationships",
        "negotiation",
        "sales_forecasting",
        "stakeholder_management"
      ],
      "gaps": [
        "go_to_market_strategy",
        "people_management",
        "sales_team_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_marketing",
      "t": "marketing_manager",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "brand_management",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing",
        "product_positioning"
      ],
      "gaps": [
        "content_strategy",
        "cross_functional_collaboration",
        "project_management"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_revops",
      "t": "business_ops_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "vp_engineering",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_business_partner",
      "t": "compensation_benefits_specialist",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "data_analysis",
        "hr_data_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "excel_advanced_finance"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "business_intelligence_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 7
    },
    {
      "s": "principal_director_consulting",
      "t": "vp_engineering",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "product_manager",
      "t": "product_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "competitive_analysis_product",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "product_discovery",
        "product_metrics"
      ],
      "gaps": [
        "ab_testing",
        "sql",
        "user_behavior_analysis"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "project_manager",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "communication",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "revops_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "sql"
      ],
      "gap_n": 7
    },
    {
      "s": "project_manager",
      "t": "associate_product_manager",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "organization"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_manager",
      "t": "enterprise_account_executive",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "consultative_selling",
        "crm_management",
        "enterprise_sales",
        "negotiation",
        "pipeline_management",
        "sales_forecasting"
      ],
      "gaps": [
        "deal_closing",
        "executive_relationships",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_account_executive",
      "t": "sales_director",
      "score": 0.513,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "enterprise_sales",
        "executive_relationships",
        "negotiation",
        "sales_forecasting",
        "stakeholder_management"
      ],
      "gaps": [
        "go_to_market_strategy",
        "people_management",
        "sales_team_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "solutions_engineer_junior",
      "t": "junior_consultant_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks"
      ],
      "gaps": [
        "attention_to_detail"
      ],
      "gap_n": 7
    },
    {
      "s": "strategy_ops_manager",
      "t": "business_ops_analyst",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "data_analysis",
        "excel_advanced_finance",
        "project_management",
        "revops_commercial_analytics",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "process_improvement"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_support_engineer",
      "t": "associate_product_manager",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "organization"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "vp_engineering",
      "score": 0.513,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "account_manager",
      "t": "customer_success_manager",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_relationship_management",
        "data_analysis",
        "renewal_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_retention",
        "product_adoption"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "prompt_engineer",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "llm_api_integration",
        "prompt_engineering",
        "python_development"
      ],
      "gaps": [
        "conversational_ai_design",
        "llm_evaluation",
        "llm_fundamentals"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_transformation_lead",
      "t": "business_ops_manager",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management"
      ],
      "gap_n": 8
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "strategy_ops_manager",
      "score": 0.51,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "content_marketing_manager",
      "t": "social_media_manager",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tools_marketing",
        "content_strategy",
        "copywriting",
        "marketing_analytics",
        "social_media_management"
      ],
      "gaps": [
        "community_management",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "junior_consultant_analyst",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "strategy_ops_manager",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "data_analyst",
      "t": "data_engineer",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "cross_functional_collaboration",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_engineering_pipelines",
        "data_modeling"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_generalist",
      "t": "ld_specialist",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "employee_experience",
        "hr_data_analytics",
        "learning_development"
      ],
      "gaps": [
        "organizational_development",
        "program_management"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "strategy_ops_manager",
      "score": 0.51,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "strategy_ops_manager",
      "t": "consulting_manager",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "executive_presentation",
        "financial_due_diligence",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "leadership",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "technical_project_manager",
      "t": "chief_of_staff",
      "score": 0.51,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 8
    },
    {
      "s": "consultant",
      "t": "revops_manager",
      "score": 0.507,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_consultant_analyst",
      "t": "revops_manager",
      "score": 0.507,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_consultant",
      "t": "revops_manager",
      "score": 0.507,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_fpa_analyst",
      "t": "finance_manager",
      "score": 0.507,
      "type": "stretch",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "budget_forecasting",
        "cash_flow_management",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "investor_relations_finance",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [
        "cpa_accounting",
        "financial_reporting",
        "gaap_ifrs",
        "people_management"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_consultant",
      "t": "ai_transformation_lead",
      "score": 0.506,
      "type": "stretch",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "consulting_methodology",
        "cross_team_collaboration",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "llm_api_integration",
        "no_code_ai_automation",
        "prompt_engineering"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_manager",
      "t": "program_manager",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "program_management"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_hr_people",
      "t": "engineering_group_manager",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_product",
      "t": "engineering_group_manager",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration"
      ],
      "gap_n": 9
    },
    {
      "s": "junior_software_engineer",
      "t": "software_engineer",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cloud_fundamentals",
        "debugging",
        "frontend_development",
        "git_version_control",
        "python_development",
        "testing_practices"
      ],
      "gaps": [
        "api_design",
        "backend_development",
        "databases"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "technical_project_manager",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 8
    },
    {
      "s": "software_engineer",
      "t": "senior_software_engineer",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "backend_development",
        "databases",
        "distributed_systems",
        "python_development"
      ],
      "gaps": [
        "performance_optimization",
        "system_design"
      ],
      "gap_n": 8
    },
    {
      "s": "strategy_ops_manager",
      "t": "technical_project_manager",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_product_manager",
      "t": "technical_project_manager",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_finance_cfo",
      "t": "engineering_group_manager",
      "score": 0.505,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration"
      ],
      "gap_n": 9
    },
    {
      "s": "ld_specialist",
      "t": "compensation_benefits_specialist",
      "score": 0.502,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "partnerships_manager",
      "t": "vp_business_development",
      "score": 0.502,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "channel_sales_strategy",
        "commercial_negotiation",
        "gtm_strategy",
        "joint_business_planning",
        "market_research_bd",
        "partner_enablement",
        "partnership_development",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "bd_team_leadership",
        "executive_leadership",
        "strategic_thinking"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_fpa_analyst",
      "t": "compensation_benefits_specialist",
      "score": 0.502,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "budget_forecasting",
        "data_analysis",
        "excel_advanced_finance",
        "financial_modeling",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.502,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance"
      ],
      "gap_n": 6
    },
    {
      "s": "ai_transformation_lead",
      "t": "project_manager_customer_delivery",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "process_improvement",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_manager",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "channel_partner_manager",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "channel_partner_manager",
      "t": "customer_success_associate",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "crm_management",
        "customer_communication",
        "data_analysis",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 4
    },
    {
      "s": "chief_of_staff",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "chief_of_staff",
      "t": "implementation_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 6
    },
    {
      "s": "chief_of_staff",
      "t": "principal_director_consulting",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "emotional_intelligence",
        "executive_presentation",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_leadership",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "chief_of_staff",
      "t": "project_manager_customer_delivery",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "risk_management"
      ],
      "gap_n": 5
    },
    {
      "s": "consultant",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "customer_onboarding_specialist",
      "t": "customer_support_representative",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "customer_orientation",
        "organization"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 4
    },
    {
      "s": "customer_success_associate",
      "t": "customer_onboarding_specialist",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "onboarding_training",
        "product_adoption"
      ],
      "gaps": [
        "product_knowledge"
      ],
      "gap_n": 5
    },
    {
      "s": "customer_success_team_lead",
      "t": "support_team_lead",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "coaching",
        "cross_functional_collaboration",
        "customer_success_metrics",
        "people_management",
        "process_improvement"
      ],
      "gaps": [
        "customer_support_operations",
        "incident_management"
      ],
      "gap_n": 5
    },
    {
      "s": "implementation_specialist",
      "t": "senior_consultant",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "junior_consultant_analyst",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "office_manager",
      "t": "procurement_specialist",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "budget_cost_management",
        "communication",
        "vendor_procurement_management"
      ],
      "gaps": [
        "analytical_thinking",
        "contract_negotiation"
      ],
      "gap_n": 5
    },
    {
      "s": "principal_director_consulting",
      "t": "project_manager_customer_delivery",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "procurement_specialist",
      "t": "office_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "budget_cost_management",
        "communication",
        "vendor_procurement_management"
      ],
      "gaps": [
        "employee_experience_welfare",
        "office_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "product_operations_manager",
      "t": "implementation_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 6
    },
    {
      "s": "program_manager",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_journey_management",
        "data_analysis"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager",
      "t": "customer_experience_specialist",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager",
      "t": "technical_support_engineer",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "prompt_engineer",
      "t": "ai_engineer_mid",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "domain_expertise",
        "llm_api_integration",
        "llm_evaluation",
        "prompt_engineering",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "backend_development",
        "ml_systems_thinking",
        "vector_databases"
      ],
      "gap_n": 11
    },
    {
      "s": "revops_manager",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "revops_manager",
      "t": "implementation_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_director",
      "t": "director_customer_success",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_alignment",
        "executive_relationships",
        "expansion_strategy",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "customer_success_strategy",
        "operational_management"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_ai_engineer",
      "t": "cv_edge_ai_engineer",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "applied_ai_research",
        "deep_learning",
        "domain_expertise",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "performance_optimization",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "analytical_thinking",
        "computer_vision",
        "debugging",
        "edge_ai_deployment"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_consultant",
      "t": "customer_experience_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "strategy_ops_manager",
      "t": "implementation_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management"
      ],
      "gap_n": 6
    },
    {
      "s": "strategy_ops_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "delivery_execution",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "risk_management"
      ],
      "gap_n": 5
    },
    {
      "s": "support_team_lead",
      "t": "customer_experience_specialist",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "cross_functional_collaboration",
        "customer_support_operations",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "customer_communication",
        "customer_orientation"
      ],
      "gap_n": 5
    },
    {
      "s": "technical_support_engineer",
      "t": "customer_support_specialist",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "problem_solving",
        "technical_documentation",
        "technical_troubleshooting"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "account_executive",
      "t": "sales_development_representative",
      "score": 0.498,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "crm_management",
        "customer_communication",
        "objection_handling",
        "outbound_prospecting",
        "product_knowledge",
        "sales_tools_proficiency"
      ],
      "gaps": [
        "cold_calling",
        "lead_qualification",
        "organization"
      ],
      "gap_n": 6
    },
    {
      "s": "ld_specialist",
      "t": "hr_operations_manager",
      "score": 0.498,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "organizational_development",
        "process_improvement"
      ],
      "gaps": [
        "employee_lifecycle_management",
        "hris_management",
        "israeli_labor_law"
      ],
      "gap_n": 6
    },
    {
      "s": "marketing_manager",
      "t": "marketing_coordinator",
      "score": 0.498,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "event_marketing",
        "marketing_analytics",
        "social_media_management"
      ],
      "gaps": [
        "copywriting",
        "customer_communication",
        "organization"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "hr_operations_manager",
      "score": 0.498,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "organizational_development",
        "process_improvement"
      ],
      "gaps": [
        "employee_lifecycle_management",
        "hris_management",
        "israeli_labor_law"
      ],
      "gap_n": 6
    },
    {
      "s": "engineering_group_manager",
      "t": "engineering_manager",
      "score": 0.495,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "organizational_design",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_design"
      ],
      "gaps": [
        "agile_methodology",
        "performance_management",
        "technical_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_engineering_manager",
      "t": "engineering_manager",
      "score": 0.495,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "organizational_design",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_design"
      ],
      "gaps": [
        "agile_methodology",
        "performance_management",
        "technical_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "solutions_engineer_junior",
      "t": "senior_solutions_engineer",
      "score": 0.495,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "cloud_platforms",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "integration_middleware",
        "poc_management",
        "product_demonstration",
        "sql",
        "technical_content_creation",
        "technical_discovery"
      ],
      "gaps": [
        "competitive_positioning",
        "domain_expertise",
        "solution_design_architecture",
        "technical_sales_acumen"
      ],
      "gap_n": 13
    },
    {
      "s": "ux_researcher",
      "t": "junior_ux_ui_designer",
      "score": 0.495,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_portfolio",
        "figma_mastery",
        "prototyping",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "ui_visual_design",
        "wireframing"
      ],
      "gap_n": 6
    },
    {
      "s": "business_intelligence_analyst",
      "t": "revops_manager",
      "score": 0.493,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "controller",
      "t": "senior_fpa_analyst",
      "score": 0.493,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "budget_forecasting",
        "bva_analysis",
        "cash_flow_management",
        "erp_systems_finance",
        "excel_advanced_finance",
        "financial_modeling"
      ],
      "gaps": [
        "finance_business_partnering",
        "saas_finance_metrics"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_revops",
      "t": "consulting_manager",
      "score": 0.493,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "executive_presentation",
        "leadership",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development",
        "stakeholder_management"
      ],
      "gap_n": 12
    },
    {
      "s": "hr_operations_manager",
      "t": "revops_manager",
      "score": 0.493,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "it_support_specialist",
      "t": "it_manager",
      "score": 0.493,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "employee_lifecycle_it",
        "endpoint_management",
        "identity_access_management",
        "it_infrastructure_networking",
        "scripting_automation"
      ],
      "gaps": [
        "it_operations_leadership",
        "it_security_compliance"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_manager",
      "t": "vp_operations",
      "score": 0.49,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_enablement_training",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_process_automation",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_operational_scaling",
        "leadership",
        "strategic_thinking"
      ],
      "gap_n": 7
    },
    {
      "s": "business_ops_analyst",
      "t": "project_manager",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "delivery_execution",
        "problem_solving",
        "process_improvement",
        "project_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_manager",
      "t": "revops_analyst",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 6
    },
    {
      "s": "director_customer_success_operations",
      "t": "business_analyst",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 7
    },
    {
      "s": "enterprise_account_executive",
      "t": "channel_partner_manager",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "negotiation",
        "pipeline_management",
        "saas_sales",
        "stakeholder_management"
      ],
      "gaps": [
        "channel_partner_management",
        "relationship_building"
      ],
      "gap_n": 7
    },
    {
      "s": "enterprise_account_executive",
      "t": "sales_manager",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "consultative_selling",
        "crm_management",
        "enterprise_sales",
        "negotiation",
        "pipeline_management",
        "sales_forecasting"
      ],
      "gaps": [
        "coaching",
        "people_management",
        "sales_team_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_revops",
      "t": "business_analyst",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "excel_advanced_finance"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_revops",
      "t": "sales_operations_manager",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "crm_management",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "salesforce",
        "workflow_automation"
      ],
      "gaps": [
        "analytical_thinking",
        "revenue_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_generalist",
      "t": "hr_business_partner",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "israeli_labor_law",
        "learning_development",
        "performance_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "coaching",
        "hr_business_partnering",
        "organizational_development",
        "stakeholder_management"
      ],
      "gap_n": 5
    },
    {
      "s": "hr_operations_manager",
      "t": "business_analyst",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "business_analyst",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "solutions_engineering_manager",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "customer_technical_relationship",
        "delivery_methodology"
      ],
      "gap_n": 12
    },
    {
      "s": "revops_manager",
      "t": "business_ops_analyst",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_product_manager",
      "t": "associate_product_manager",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_discovery_interviews",
        "data_analysis",
        "prd_writing",
        "product_metrics",
        "ux_product_design_sense"
      ],
      "gaps": [
        "organization",
        "problem_solving",
        "technical_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_product_manager",
      "t": "product_analyst",
      "score": 0.487,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "competitive_analysis_product",
        "cross_functional_collaboration",
        "data_analysis",
        "product_discovery",
        "product_led_growth",
        "product_metrics"
      ],
      "gaps": [
        "ab_testing",
        "sql",
        "user_behavior_analysis"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_transformation_lead",
      "t": "chief_of_staff",
      "score": 0.485,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "consulting_methodology",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 8
    },
    {
      "s": "business_analyst",
      "t": "strategy_ops_manager",
      "score": 0.485,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_executive_communication",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_analyst",
      "t": "strategy_ops_manager",
      "score": 0.485,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_executive_communication",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineering_manager",
      "t": "chief_of_staff",
      "score": 0.485,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 9
    },
    {
      "s": "account_manager",
      "t": "senior_customer_success_manager",
      "score": 0.483,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "customer_communication",
        "customer_relationship_management",
        "data_analysis",
        "renewal_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_health_management",
        "executive_relationships",
        "retention_strategy"
      ],
      "gap_n": 5
    },
    {
      "s": "ai_transformation_lead",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.483,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_governance_compliance",
        "ai_product_thinking",
        "ai_safety_responsible_ai",
        "ai_transformation_change_mgmt",
        "change_management",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "engineering_leadership",
        "executive_leadership"
      ],
      "gap_n": 9
    },
    {
      "s": "channel_partner_manager",
      "t": "bdr_bd_associate",
      "score": 0.483,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "crm_management",
        "pipeline_management",
        "relationship_building"
      ],
      "gaps": [
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_revops",
      "t": "senior_consultant",
      "score": 0.483,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "executive_presentation",
        "leadership",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "proposal_development",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "program_manager",
      "t": "ai_solutions_engineering_manager",
      "score": 0.483,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "people_management",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_agent_development",
        "ai_product_thinking",
        "customer_facing_ai_delivery",
        "llm_api_integration"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_consultant",
      "t": "ai_solutions_engineering_manager",
      "score": 0.483,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "people_management",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_agent_development",
        "ai_product_thinking",
        "customer_facing_ai_delivery",
        "llm_api_integration"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "principal_director_consulting",
      "score": 0.483,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "change_management",
        "domain_expertise",
        "executive_leadership",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "engineering_group_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "engineering_leadership",
        "organizational_design"
      ],
      "gap_n": 9
    },
    {
      "s": "business_intelligence_analyst",
      "t": "product_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "business_intelligence_analyst",
      "t": "sales_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_analyst",
      "t": "consultant",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "client_advisory",
        "consulting_frameworks"
      ],
      "gap_n": 10
    },
    {
      "s": "chief_of_staff",
      "t": "business_ops_analyst",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance"
      ],
      "gap_n": 8
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "sales_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "consultant",
      "t": "product_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "consulting_manager",
      "t": "product_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "content_marketing_manager",
      "t": "product_marketing_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "b2b_marketing",
        "content_strategy",
        "copywriting",
        "product_positioning"
      ],
      "gaps": [
        "go_to_market_strategy",
        "market_research",
        "sales_enablement"
      ],
      "gap_n": 7
    },
    {
      "s": "fpa_analyst",
      "t": "business_analyst",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_design_vp_design",
      "t": "brand_marketing_designer",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_design_tools",
        "brand_identity_design",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_portfolio",
        "design_stakeholder_communication",
        "design_system_management",
        "ui_visual_design"
      ],
      "gaps": [
        "adobe_creative_suite",
        "marketing_campaign_design"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "consultant",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "change_management",
        "client_advisory",
        "client_engagement_delivery",
        "domain_expertise",
        "executive_presentation",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "communication",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "implementation_manager",
      "t": "program_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "program_management"
      ],
      "gap_n": 9
    },
    {
      "s": "junior_consultant_analyst",
      "t": "product_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "sales_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "marketing_analytics",
        "sql"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "mlops_engineer",
      "t": "senior_software_engineer",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cloud_platforms",
        "databases",
        "performance_optimization",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "backend_development",
        "distributed_systems"
      ],
      "gap_n": 9
    },
    {
      "s": "product_marketing_manager",
      "t": "seo_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "content_strategy",
        "cross_functional_collaboration",
        "data_analysis"
      ],
      "gaps": [
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "program_manager",
      "t": "product_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "sales_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_consultant",
      "t": "product_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_customer_success_manager",
      "t": "product_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_fpa_analyst",
      "t": "business_analyst",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_solutions_engineer",
      "t": "senior_engineering_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership",
        "people_management"
      ],
      "gap_n": 9
    },
    {
      "s": "seo_manager",
      "t": "revops_analyst",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration"
      ],
      "gap_n": 8
    },
    {
      "s": "seo_manager",
      "t": "sales_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "marketing_analytics",
        "sql"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "strategy_ops_manager",
      "t": "seo_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 7
    },
    {
      "s": "talent_acquisition_manager",
      "t": "sales_operations_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_project_manager",
      "t": "business_ops_analyst",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_marketing",
      "t": "growth_marketing_manager",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "account_based_marketing",
        "ai_tools_marketing",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing"
      ],
      "gaps": [
        "ab_testing_marketing",
        "marketing_automation"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_operations",
      "t": "consultant",
      "score": 0.48,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "consulting_frameworks",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "client_advisory",
        "communication"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.479,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "engineering_leadership",
        "executive_leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "brand_marketing_designer",
      "t": "product_designer_ux_ui",
      "score": 0.479,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "prototyping",
        "ux_design_process"
      ],
      "gap_n": 11
    },
    {
      "s": "consultant",
      "t": "solutions_engineering_manager",
      "score": 0.479,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "delivery_methodology",
        "domain_expertise",
        "poc_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "cross_team_collaboration",
        "customer_technical_relationship",
        "se_team_leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "it_administrator_sysadmin",
      "t": "head_of_it",
      "score": 0.479,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "identity_access_management",
        "it_infrastructure_networking",
        "it_security_compliance"
      ],
      "gaps": [
        "it_operations_leadership",
        "security_program_leadership"
      ],
      "gap_n": 9
    },
    {
      "s": "principal_director_consulting",
      "t": "business_ops_manager",
      "score": 0.477,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework",
        "process_improvement"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "consulting_manager",
      "score": 0.476,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "client_engagement_delivery",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "implementation_specialist",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_analyst",
      "t": "project_manager_customer_delivery",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 4
    },
    {
      "s": "channel_partner_manager",
      "t": "account_manager",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "customer_communication",
        "data_analysis",
        "negotiation",
        "stakeholder_management"
      ],
      "gaps": [
        "account_management",
        "customer_relationship_management",
        "upselling_cross_selling"
      ],
      "gap_n": 4
    },
    {
      "s": "consultant",
      "t": "implementation_specialist",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "implementation_specialist",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 5
    },
    {
      "s": "customer_success_manager",
      "t": "customer_experience_manager",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_advocacy",
        "customer_communication",
        "customer_health_monitoring",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 5
    },
    {
      "s": "junior_consultant_analyst",
      "t": "implementation_specialist",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "implementation_specialist",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_customer_success_manager",
      "t": "account_manager",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "customer_communication",
        "customer_relationship_management",
        "data_analysis",
        "renewal_management",
        "stakeholder_management"
      ],
      "gaps": [
        "account_management",
        "negotiation",
        "upselling_cross_selling"
      ],
      "gap_n": 4
    },
    {
      "s": "talent_acquisition_manager",
      "t": "head_of_revops",
      "score": 0.475,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "applied_ai_researcher",
      "t": "prompt_engineer",
      "score": 0.474,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_agent_development",
        "analytical_thinking",
        "communication",
        "domain_expertise",
        "llm_evaluation",
        "llm_fundamentals",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "ai_product_thinking",
        "conversational_ai_design",
        "llm_api_integration",
        "prompt_engineering"
      ],
      "gap_n": 8
    },
    {
      "s": "consulting_manager",
      "t": "revops_manager",
      "score": 0.473,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "project_manager",
      "t": "revops_manager",
      "score": 0.473,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_project_manager",
      "t": "revops_manager",
      "score": 0.473,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "vp_business_development",
      "score": 0.472,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "people_management",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "bd_team_leadership",
        "partnership_development"
      ],
      "gap_n": 11
    },
    {
      "s": "principal_director_consulting",
      "t": "vp_business_development",
      "score": 0.472,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "people_management",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "bd_team_leadership",
        "partnership_development"
      ],
      "gap_n": 11
    },
    {
      "s": "product_designer_ux_ui",
      "t": "head_of_design_vp_design",
      "score": 0.471,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "design_system_management",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "design_critique",
        "design_leadership",
        "strategic_thinking"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "engineering_manager",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "technical_project_manager",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "domain_expertise",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 7
    },
    {
      "s": "brand_marketing_designer",
      "t": "junior_ux_ui_designer",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "adobe_creative_suite",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_portfolio",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "ux_design_process",
        "wireframing"
      ],
      "gap_n": 7
    },
    {
      "s": "consulting_manager",
      "t": "engineering_manager",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_ai",
      "t": "engineering_manager",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "junior_consultant_analyst",
      "t": "program_manager",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "customer_communication",
        "process_improvement",
        "program_management",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "program_manager",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "risk_management",
        "stakeholder_management",
        "technical_project_delivery"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "leadership",
        "program_management"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineering_manager",
      "t": "program_manager",
      "score": 0.47,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "customer_communication",
        "domain_expertise",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "bdr_bd_associate",
      "t": "business_development_representative",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gaps": [
        "linkedin_outreach",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "bdr_bd_associate",
      "t": "sales_development_representative",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gaps": [
        "cold_calling",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "business_development_manager",
      "t": "business_development_representative",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gaps": [
        "linkedin_outreach",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "business_development_manager",
      "t": "sales_development_representative",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gaps": [
        "cold_calling",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "business_ops_manager",
      "t": "ld_specialist",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "process_improvement",
        "program_management",
        "stakeholder_management"
      ],
      "gaps": [
        "learning_development",
        "organizational_development"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "data_analysis",
        "hr_data_analytics",
        "hris_management"
      ],
      "gaps": [
        "excel_advanced_finance",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "ld_specialist",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "hr_data_analytics",
        "organizational_development",
        "process_improvement"
      ],
      "gaps": [
        "learning_development",
        "program_management"
      ],
      "gap_n": 7
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "junior_software_engineer",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "debugging",
        "git_version_control",
        "python_development"
      ],
      "gaps": [
        "data_structures_algorithms",
        "programming_fundamentals"
      ],
      "gap_n": 7
    },
    {
      "s": "procurement_specialist",
      "t": "junior_consultant_analyst",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_manager",
      "t": "ld_specialist",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "process_improvement",
        "program_management",
        "stakeholder_management"
      ],
      "gaps": [
        "learning_development",
        "organizational_development"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineer",
      "t": "junior_consultant_analyst",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail"
      ],
      "gap_n": 7
    },
    {
      "s": "strategy_ops_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.468,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "excel_advanced_finance",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "principal_director_consulting",
      "score": 0.467,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "client_advisory",
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "project_manager",
      "t": "senior_consultant",
      "score": 0.467,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "revops_manager",
      "t": "senior_consultant",
      "score": 0.467,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "solutions_engineering_manager",
      "t": "principal_director_consulting",
      "score": 0.467,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "change_management",
        "client_engagement_delivery",
        "consulting_frameworks",
        "domain_expertise",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_leadership",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_business_development",
      "t": "principal_director_consulting",
      "score": 0.467,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "client_advisory",
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "brand_marketing_designer",
      "t": "senior_product_designer",
      "score": 0.466,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "design_for_complex_systems",
        "ux_design_process"
      ],
      "gap_n": 14
    },
    {
      "s": "implementation_specialist",
      "t": "junior_consultant_analyst",
      "score": 0.465,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail",
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "social_media_manager",
      "t": "content_marketing_manager",
      "score": 0.465,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tools_marketing",
        "content_strategy",
        "copywriting",
        "marketing_analytics",
        "social_media_management"
      ],
      "gaps": [
        "analytical_thinking",
        "project_management",
        "seo_management"
      ],
      "gap_n": 7
    },
    {
      "s": "prompt_engineer",
      "t": "applied_ai_researcher",
      "score": 0.464,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_agent_development",
        "analytical_thinking",
        "communication",
        "domain_expertise",
        "llm_evaluation",
        "llm_fundamentals",
        "python_development",
        "rag_systems",
        "technical_communication"
      ],
      "gaps": [
        "applied_ai_research",
        "deep_learning",
        "machine_learning_fundamentals",
        "ml_systems_thinking",
        "model_training_finetuning"
      ],
      "gap_n": 10
    },
    {
      "s": "consultant",
      "t": "ai_transformation_lead",
      "score": 0.463,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "consulting_methodology",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "llm_api_integration",
        "no_code_ai_automation",
        "prompt_engineering"
      ],
      "gap_n": 9
    },
    {
      "s": "applied_ai_researcher",
      "t": "ai_engineer_mid",
      "score": 0.462,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_agent_development",
        "domain_expertise",
        "llm_evaluation",
        "machine_learning_fundamentals",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "backend_development",
        "llm_api_integration",
        "prompt_engineering",
        "vector_databases"
      ],
      "gap_n": 11
    },
    {
      "s": "principal_director_consulting",
      "t": "solutions_engineering_manager",
      "score": 0.462,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "change_management",
        "delivery_methodology",
        "domain_expertise",
        "hiring_talent_acquisition",
        "poc_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "communication",
        "cross_team_collaboration",
        "customer_technical_relationship"
      ],
      "gap_n": 11
    },
    {
      "s": "consultant",
      "t": "technical_project_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "customer_communication",
        "domain_expertise",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 6
    },
    {
      "s": "devops_engineer",
      "t": "software_engineer",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "ci_cd",
        "containerization",
        "databases",
        "distributed_systems",
        "git_version_control",
        "python_development"
      ],
      "gaps": [
        "api_design",
        "backend_development"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_it",
      "t": "it_administrator_sysadmin",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "identity_access_management",
        "it_infrastructure_networking",
        "it_security_compliance"
      ],
      "gaps": [
        "employee_lifecycle_it",
        "endpoint_management",
        "saas_administration"
      ],
      "gap_n": 6
    },
    {
      "s": "ld_specialist",
      "t": "business_ops_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "program_manager",
      "t": "vp_operations",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "domain_expertise",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 9
    },
    {
      "s": "sales_manager",
      "t": "vp_sales",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "commercial_mindset",
        "enterprise_sales",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gaps": [
        "executive_leadership",
        "go_to_market_strategy"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_consultant",
      "t": "technical_project_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "customer_communication",
        "domain_expertise",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_customer_success_manager",
      "t": "strategy_ops_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "staff_engineer",
      "t": "engineering_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "organizational_design",
        "stakeholder_management",
        "strategic_thinking",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "people_management",
        "performance_management"
      ],
      "gap_n": 5
    },
    {
      "s": "talent_acquisition_manager",
      "t": "strategy_ops_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "technical_product_manager",
      "t": "product_analyst",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "product_metrics",
        "sql"
      ],
      "gaps": [
        "ab_testing",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "technical_project_manager",
      "t": "consulting_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "domain_expertise",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 12
    },
    {
      "s": "technical_project_manager",
      "t": "strategy_ops_manager",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "data_analysis",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_business_case_development",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "ux_researcher",
      "t": "design_system_lead",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_for_complex_systems",
        "design_stakeholder_communication",
        "figma_mastery",
        "strategic_thinking",
        "ux_design_process"
      ],
      "gaps": [
        "design_system_management",
        "ui_visual_design"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "chief_of_staff",
      "score": 0.46,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_cross_functional_execution",
        "leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 10
    },
    {
      "s": "business_ops_manager",
      "t": "consulting_manager",
      "score": 0.457,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory",
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 12
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "talent_acquisition_manager",
      "score": 0.457,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_consultant_analyst",
      "t": "consulting_manager",
      "score": 0.457,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "digital_transformation_consulting",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory",
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "strategy_ops_manager",
      "t": "revops_manager",
      "score": 0.457,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "project_management",
        "revops_commercial_analytics",
        "sql",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_operations",
      "t": "junior_consultant_analyst",
      "score": 0.457,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -5,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gap_n": 6
    },
    {
      "s": "vp_operations",
      "t": "revops_manager",
      "score": 0.457,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "analytics_engineer",
      "t": "business_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "python_data",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "associate_product_manager",
      "t": "seo_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "product_metrics",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 7
    },
    {
      "s": "business_analyst",
      "t": "data_analyst",
      "score": 0.453,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "python_data"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced"
      ],
      "gap_n": 8,
      "curated": true,
      "curated_note": "Business analysts with SQL and data skills move into dedicated data analyst roles."
    },
    {
      "s": "channel_partner_manager",
      "t": "product_operations_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "cross_functional_collaboration",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "channel_partner_manager",
      "t": "project_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 8
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "business_ops_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "attention_to_detail",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "data_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_success_associate",
      "t": "revops_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_enablement_training",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "excel_advanced_finance",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "data_analyst",
      "t": "business_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "python_data",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "director_customer_success_operations",
      "t": "business_ops_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 7
    },
    {
      "s": "growth_marketing_manager",
      "t": "head_of_marketing",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "account_based_marketing",
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing"
      ],
      "gaps": [
        "brand_management",
        "go_to_market_strategy",
        "people_management"
      ],
      "gap_n": 7
    },
    {
      "s": "growth_marketing_manager",
      "t": "marketing_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "marketing_automation",
        "performance_marketing"
      ],
      "gaps": [
        "content_strategy",
        "cross_functional_collaboration",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_data",
      "t": "business_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "python_data",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "hr_operations_manager",
      "t": "data_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "marketing_coordinator",
      "t": "marketing_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "event_marketing",
        "marketing_analytics",
        "social_media_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "demand_generation",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "business_ops_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_analyst",
      "t": "business_intelligence_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_manager",
      "t": "channel_partner_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "cross_functional_collaboration",
        "customer_communication",
        "negotiation",
        "pipeline_management"
      ],
      "gaps": [
        "channel_partner_management",
        "relationship_building",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_customer_success_manager",
      "t": "project_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_data_analyst",
      "t": "business_analyst",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "python_data",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "strategy_ops_manager",
      "t": "project_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "communication",
        "risk_management"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_product_manager",
      "t": "project_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management"
      ],
      "gaps": [
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_product_manager",
      "t": "seo_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "product_metrics",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_marketing",
      "t": "marketing_manager",
      "score": 0.453,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "ai_tools_marketing",
        "brand_management",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing",
        "product_positioning"
      ],
      "gaps": [
        "content_strategy",
        "cross_functional_collaboration",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_engineer_mid",
      "t": "cv_edge_ai_engineer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "debugging",
        "domain_expertise",
        "machine_learning_fundamentals",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "analytical_thinking",
        "computer_vision",
        "deep_learning",
        "edge_ai_deployment",
        "performance_optimization"
      ],
      "gap_n": 10
    },
    {
      "s": "bdr_bd_associate",
      "t": "customer_success_associate",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "data_analysis",
        "relationship_building"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "business_analyst",
      "t": "director_customer_success_operations",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_improvement",
        "salesforce"
      ],
      "gaps": [
        "process_design",
        "systems_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "business_development_manager",
      "t": "customer_success_associate",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "crm_management",
        "customer_communication",
        "data_analysis",
        "relationship_building"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "business_development_representative",
      "t": "customer_onboarding_specialist",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "organization",
        "product_knowledge"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "business_development_representative",
      "t": "customer_support_representative",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "organization"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 4
    },
    {
      "s": "chief_of_staff",
      "t": "ai_solutions_engineering_manager",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "communication",
        "cross_team_collaboration",
        "people_management",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_agent_development",
        "ai_product_thinking",
        "customer_facing_ai_delivery",
        "llm_api_integration"
      ],
      "gap_n": 11
    },
    {
      "s": "ciso_head_of_security",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_product_thinking"
      ],
      "gap_n": 13
    },
    {
      "s": "consultant",
      "t": "head_of_revops",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "revops_gtm_process_design",
        "strategic_thinking"
      ],
      "gaps": [
        "leadership",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "customer_experience_manager",
      "t": "director_customer_success_operations",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "data_analysis",
        "process_design",
        "process_improvement",
        "project_management"
      ],
      "gaps": [
        "salesforce",
        "systems_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_manager",
      "t": "senior_consultant",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "customer_experience_specialist",
      "t": "customer_experience_manager",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "cross_functional_collaboration",
        "customer_advocacy",
        "customer_communication",
        "process_improvement"
      ],
      "gaps": [
        "customer_journey_management",
        "data_analysis"
      ],
      "gap_n": 6
    },
    {
      "s": "engineering_manager",
      "t": "head_of_ai",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ml_systems_thinking",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "python_development"
      ],
      "gap_n": 13
    },
    {
      "s": "facilities_manager",
      "t": "executive_assistant",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "administrative_operations",
        "communication",
        "office_operations",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "facilities_manager",
      "t": "procurement_specialist",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "administrative_operations",
        "budget_cost_management",
        "communication",
        "vendor_procurement_management"
      ],
      "gaps": [
        "analytical_thinking",
        "contract_negotiation"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_admin_ga",
      "t": "executive_assistant",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "executive_support",
        "office_operations",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "communication",
        "travel_logistics_coordination"
      ],
      "gap_n": 4
    },
    {
      "s": "head_of_it",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_product_thinking"
      ],
      "gap_n": 13
    },
    {
      "s": "head_of_revops",
      "t": "director_customer_success_operations",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_improvement",
        "salesforce"
      ],
      "gaps": [
        "process_design",
        "systems_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_specialist",
      "t": "technical_support_engineer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "api_integrations",
        "customer_communication",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "technical_support_engineer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "debugging",
        "technical_communication"
      ],
      "gaps": [
        "problem_solving",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "partnerships_manager",
      "t": "customer_success_associate",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "crm_management",
        "customer_communication",
        "data_analysis",
        "relationship_building"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "product_marketing_manager",
      "t": "sales_engineer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "customer_discovery",
        "presentation_skills",
        "product_knowledge"
      ],
      "gaps": [
        "technical_explanation"
      ],
      "gap_n": 7
    },
    {
      "s": "project_manager",
      "t": "customer_support_representative",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "customer_support_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "revops_analyst",
      "t": "director_customer_success_operations",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_improvement",
        "salesforce"
      ],
      "gaps": [
        "process_design",
        "systems_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_development_representative",
      "t": "customer_onboarding_specialist",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "organization",
        "product_knowledge"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "sales_development_representative",
      "t": "customer_support_representative",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "organization"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 4
    },
    {
      "s": "sales_operations_manager",
      "t": "customer_experience_manager",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_design",
        "process_improvement"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_account_executive",
      "t": "senior_customer_success_manager",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "customer_communication",
        "executive_relationships",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_health_management",
        "retention_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_support_engineer",
      "t": "customer_experience_manager",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "data_analysis"
      ],
      "gaps": [
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineer",
      "t": "customer_success_associate",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "crm_management",
        "customer_communication",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "solutions_engineer_junior",
      "t": "technical_support_engineer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "debugging",
        "technical_communication"
      ],
      "gaps": [
        "problem_solving",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "staff_engineer",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_strategy",
        "ai_strategy_roadmap",
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_team_leadership"
      ],
      "gap_n": 12
    },
    {
      "s": "technical_support_engineer",
      "t": "customer_experience_manager",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "data_analysis"
      ],
      "gaps": [
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_support_engineer",
      "t": "customer_support_representative",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "customer_support_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "vp_sales",
      "t": "senior_customer_success_manager",
      "score": 0.45,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "commercial_mindset",
        "executive_relationships",
        "retention_strategy"
      ],
      "gaps": [
        "customer_health_management"
      ],
      "gap_n": 8
    },
    {
      "s": "channel_partner_manager",
      "t": "senior_account_executive",
      "score": 0.447,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "customer_communication",
        "negotiation",
        "pipeline_management",
        "saas_sales",
        "stakeholder_management"
      ],
      "gaps": [
        "consultative_selling",
        "deal_closing",
        "enterprise_sales",
        "quota_attainment"
      ],
      "gap_n": 7
    },
    {
      "s": "sales_director",
      "t": "senior_account_executive",
      "score": 0.447,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "enterprise_sales",
        "executive_relationships",
        "negotiation",
        "sales_forecasting",
        "stakeholder_management"
      ],
      "gaps": [
        "consultative_selling",
        "deal_closing",
        "pipeline_management",
        "quota_attainment"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_customer_success",
      "t": "vp_sales",
      "score": 0.447,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "executive_relationships",
        "expansion_strategy",
        "organizational_design",
        "people_management",
        "retention_strategy"
      ],
      "gaps": [
        "commercial_mindset",
        "go_to_market_strategy",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "prompt_engineer",
      "t": "ai_solutions_engineering_manager",
      "score": 0.446,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "llm_api_integration",
        "prompt_engineering",
        "python_development"
      ],
      "gaps": [
        "customer_facing_ai_delivery",
        "people_management",
        "stakeholder_management",
        "technical_leadership"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_consultant",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.446,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "ai_team_leadership",
        "change_management",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "engineering_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_strategy_roadmap",
        "executive_leadership"
      ],
      "gap_n": 11
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "head_of_solutions_engineering",
      "score": 0.446,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "change_management",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_leadership",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 12
    },
    {
      "s": "vp_engineering",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.446,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "ai_strategy_roadmap",
        "domain_expertise",
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_team_leadership"
      ],
      "gap_n": 12
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "staff_engineer",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "mentoring",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "business_ops_analyst",
      "t": "technical_project_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "ciso_head_of_security",
      "t": "engineering_group_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "organizational_design"
      ],
      "gap_n": 9
    },
    {
      "s": "ciso_head_of_security",
      "t": "senior_engineering_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "engineering_group_manager",
      "t": "senior_software_engineer",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "performance_optimization",
        "system_design"
      ],
      "gaps": [
        "backend_development",
        "python_development"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_ai",
      "t": "tech_lead",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "hiring_talent_acquisition",
        "mentoring",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "backend_development",
        "code_review_practices"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "senior_engineering_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_design_vp_design",
      "t": "senior_engineering_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_it",
      "t": "engineering_group_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "organizational_design"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_it",
      "t": "senior_engineering_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "implementation_manager",
      "t": "technical_project_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 9
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "software_engineer",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "api_design",
        "debugging",
        "git_version_control",
        "python_development"
      ],
      "gaps": [
        "backend_development",
        "databases"
      ],
      "gap_n": 9
    },
    {
      "s": "product_operations_manager",
      "t": "program_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "program_management"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_solutions_engineer",
      "t": "staff_engineer",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cloud_platforms",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "technical_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "sre_engineer",
      "t": "senior_software_engineer",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "distributed_systems",
        "performance_optimization"
      ],
      "gaps": [
        "python_development",
        "system_design"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "program_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "cross_team_collaboration",
        "customer_communication",
        "domain_expertise",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_business_development",
      "t": "senior_engineering_manager",
      "score": 0.445,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "consulting_manager",
      "score": 0.443,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 13
    },
    {
      "s": "solutions_engineer",
      "t": "consulting_manager",
      "score": 0.443,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "proposal_development",
        "stakeholder_management"
      ],
      "gaps": [
        "executive_presentation",
        "leadership",
        "strategic_thinking"
      ],
      "gap_n": 13
    },
    {
      "s": "consultant",
      "t": "grc_analyst",
      "score": 0.442,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "risk_assessment_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "grc_frameworks",
        "security_policy_development",
        "vendor_third_party_risk"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "ai_solutions_engineering_manager",
      "score": 0.442,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "people_management",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_agent_development",
        "ai_product_thinking",
        "communication",
        "customer_facing_ai_delivery",
        "llm_api_integration"
      ],
      "gap_n": 10
    },
    {
      "s": "sales_engineer",
      "t": "technical_account_manager",
      "score": 0.442,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "api_integrations",
        "business_understanding",
        "product_knowledge",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_relationship_management",
        "technical_problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_consultant",
      "t": "grc_analyst",
      "score": 0.442,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "risk_assessment_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "grc_frameworks",
        "security_policy_development",
        "vendor_third_party_risk"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_revops",
      "t": "consultant",
      "score": 0.44,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "process_improvement",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "client_advisory",
        "communication"
      ],
      "gap_n": 10
    },
    {
      "s": "junior_ux_ui_designer",
      "t": "brand_marketing_designer",
      "score": 0.44,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "adobe_creative_suite",
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_portfolio",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "brand_identity_design",
        "marketing_campaign_design"
      ],
      "gap_n": 9
    },
    {
      "s": "marketing_manager",
      "t": "vp_marketing",
      "score": 0.44,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 4,
      "shared": [
        "ai_tools_marketing",
        "brand_management",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing",
        "product_positioning"
      ],
      "gaps": [
        "executive_leadership",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gap_n": 8
    },
    {
      "s": "procurement_specialist",
      "t": "head_of_admin_ga",
      "score": 0.44,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "budget_cost_management",
        "contract_negotiation",
        "global_operations_compliance",
        "stakeholder_management",
        "vendor_procurement_management"
      ],
      "gaps": [
        "employee_experience_welfare",
        "leadership",
        "office_operations"
      ],
      "gap_n": 7
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "revops_manager",
      "score": 0.44,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "revops_manager",
      "t": "consultant",
      "score": 0.44,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory",
        "communication",
        "executive_presentation"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_fpa_analyst",
      "t": "strategy_ops_manager",
      "score": 0.44,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "saas_finance_metrics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_transformation_lead",
      "t": "consulting_manager",
      "score": 0.438,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "change_management",
        "consulting_frameworks",
        "cross_team_collaboration",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "executive_presentation",
        "leadership",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "ciso_head_of_security",
      "t": "head_of_ai",
      "score": 0.438,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ml_systems_thinking",
        "python_development"
      ],
      "gap_n": 13
    },
    {
      "s": "consulting_manager",
      "t": "head_of_ai",
      "score": 0.438,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ai_team_leadership",
        "domain_expertise",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_strategy_roadmap",
        "ml_systems_thinking",
        "python_development"
      ],
      "gap_n": 13
    },
    {
      "s": "head_of_it",
      "t": "head_of_ai",
      "score": 0.438,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ml_systems_thinking",
        "python_development"
      ],
      "gap_n": 13
    },
    {
      "s": "prompt_engineer",
      "t": "senior_ai_engineer",
      "score": 0.438,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_agent_development",
        "ai_safety_responsible_ai",
        "domain_expertise",
        "llm_api_integration",
        "llm_evaluation",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "backend_development",
        "ml_systems_thinking",
        "system_design"
      ],
      "gap_n": 13
    },
    {
      "s": "senior_software_engineer",
      "t": "senior_ai_engineer",
      "score": 0.438,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "backend_development",
        "distributed_systems",
        "mentoring",
        "ml_systems_thinking",
        "performance_optimization",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "ai_agent_development",
        "llm_api_integration",
        "llm_evaluation",
        "rag_systems"
      ],
      "gap_n": 12
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "vp_operations",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "domain_expertise",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_transformation_lead",
      "t": "strategy_ops_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "consulting_methodology",
        "data_analysis",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_business_case_development",
        "bizops_executive_communication"
      ],
      "gap_n": 10
    },
    {
      "s": "consulting_manager",
      "t": "technical_project_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "domain_expertise",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 7
    },
    {
      "s": "content_marketing_manager",
      "t": "junior_consultant_analyst",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "executive_presentation"
      ],
      "gaps": [
        "attention_to_detail",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "engineering_manager",
      "t": "chief_of_staff",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_admin_ga",
      "t": "chief_of_staff",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_data",
      "t": "data_engineer",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_engineering_pipelines",
        "data_modeling"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_design_vp_design",
      "t": "junior_ux_ui_designer",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_portfolio",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "figma_mastery",
        "wireframing"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_manager",
      "t": "ld_specialist",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "hr_data_analytics",
        "learning_development",
        "organizational_development"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management"
      ],
      "gap_n": 8
    },
    {
      "s": "junior_consultant_analyst",
      "t": "technical_project_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 7
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "strategy_ops_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "product_analyst",
      "t": "strategy_ops_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "sales_operations_manager",
      "t": "strategy_ops_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_engineering_manager",
      "t": "chief_of_staff",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_solutions_engineer",
      "t": "strategy_ops_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "sql",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_business_case_development",
        "data_analysis"
      ],
      "gap_n": 10
    },
    {
      "s": "staff_engineer",
      "t": "chief_of_staff",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 10
    },
    {
      "s": "strategy_ops_manager",
      "t": "ld_specialist",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "program_management",
        "stakeholder_management"
      ],
      "gaps": [
        "learning_development",
        "organizational_development"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_product_manager",
      "t": "strategy_ops_manager",
      "score": 0.435,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "data_analysis",
        "project_management",
        "sql"
      ],
      "gaps": [
        "bizops_business_case_development",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "senior_consultant",
      "score": 0.433,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "client_engagement_delivery",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "consulting_frameworks",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 10
    },
    {
      "s": "chief_of_staff",
      "t": "solutions_engineering_manager",
      "score": 0.433,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "cross_team_collaboration",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "customer_technical_relationship",
        "delivery_methodology"
      ],
      "gap_n": 14
    },
    {
      "s": "ciso_head_of_security",
      "t": "head_of_solutions_engineering",
      "score": 0.433,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "executive_leadership",
        "people_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "technical_sales_acumen"
      ],
      "gap_n": 14
    },
    {
      "s": "head_of_it",
      "t": "head_of_solutions_engineering",
      "score": 0.433,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "executive_leadership",
        "people_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "technical_sales_acumen"
      ],
      "gap_n": 14
    },
    {
      "s": "vp_operations",
      "t": "principal_director_consulting",
      "score": 0.433,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "domain_expertise",
        "executive_presentation",
        "financial_due_diligence",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_leadership",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "solutions_engineering_manager",
      "t": "ai_transformation_lead",
      "score": 0.43,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "llm_api_integration",
        "no_code_ai_automation",
        "prompt_engineering"
      ],
      "gap_n": 10
    },
    {
      "s": "brand_marketing_designer",
      "t": "head_of_design_vp_design",
      "score": 0.429,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_design_tools",
        "brand_identity_design",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_portfolio",
        "design_stakeholder_communication",
        "design_system_management",
        "ui_visual_design"
      ],
      "gaps": [
        "design_critique",
        "design_leadership",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "junior_consultant_analyst",
      "t": "solutions_engineering_manager",
      "score": 0.429,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "delivery_methodology",
        "poc_management",
        "stakeholder_management",
        "technical_discovery"
      ],
      "gaps": [
        "cross_team_collaboration",
        "customer_technical_relationship",
        "se_team_leadership"
      ],
      "gap_n": 13
    },
    {
      "s": "junior_ux_ui_designer",
      "t": "design_lead_design_manager",
      "score": 0.428,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_handoff",
        "figma_mastery",
        "ui_visual_design",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "design_critique",
        "design_leadership",
        "design_stakeholder_communication"
      ],
      "gap_n": 11
    },
    {
      "s": "account_manager",
      "t": "channel_partner_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "commercial_mindset",
        "crm_management",
        "customer_communication",
        "negotiation",
        "stakeholder_management"
      ],
      "gaps": [
        "channel_partner_management",
        "pipeline_management",
        "relationship_building"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_transformation_lead",
      "t": "project_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "customer_communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "business_analyst",
      "t": "product_operations_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "workflow_automation"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "business_intelligence_analyst",
      "t": "revops_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 7
    },
    {
      "s": "business_ops_analyst",
      "t": "fpa_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "erp_systems_finance",
        "excel_advanced_finance",
        "saas_finance_metrics"
      ],
      "gaps": [
        "budget_forecasting",
        "bva_analysis",
        "financial_modeling"
      ],
      "gap_n": 7
    },
    {
      "s": "consultant",
      "t": "business_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "revops_commercial_analytics"
      ],
      "gap_n": 8
    },
    {
      "s": "consultant",
      "t": "compensation_benefits_specialist",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "consulting_manager",
      "t": "business_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "revops_commercial_analytics"
      ],
      "gap_n": 8
    },
    {
      "s": "consulting_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "consulting_manager",
      "t": "talent_acquisition_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "people_management",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "consulting_manager",
      "t": "vp_engineering",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_strategy",
        "domain_expertise",
        "engineering_leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "business_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "growth_marketing_manager",
      "t": "seo_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "marketing_analytics",
        "product_metrics",
        "seo_management",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "analytical_thinking",
        "content_strategy",
        "data_analysis"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "revops_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bi_tools",
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 7
    },
    {
      "s": "junior_consultant_analyst",
      "t": "business_analyst",
      "score": 0.427,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "revops_commercial_analytics"
      ],
      "gap_n": 8,
      "curated": true,
      "curated_note": "Natural lateral move. Consulting analyst skills (frameworks, data analysis, structured thinking) are the core of BA roles."
    },
    {
      "s": "junior_consultant_analyst",
      "t": "compensation_benefits_specialist",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "procurement_specialist",
      "t": "project_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_analyst",
      "t": "product_operations_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "process_improvement",
        "workflow_automation"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_consultant",
      "t": "business_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "revops_commercial_analytics"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_consultant",
      "t": "compensation_benefits_specialist",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_consultant",
      "t": "talent_acquisition_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "people_management",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "seo_manager",
      "t": "associate_product_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "product_metrics",
        "technical_communication"
      ],
      "gaps": [
        "organization",
        "problem_solving"
      ],
      "gap_n": 8
    },
    {
      "s": "talent_acquisition_manager",
      "t": "business_analyst",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "talent_acquisition_manager",
      "t": "hr_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "employer_branding",
        "hr_data_analytics",
        "organizational_development",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "employee_lifecycle_management",
        "hr_business_partnering",
        "israeli_labor_law"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_sales",
      "t": "sales_manager",
      "score": 0.427,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "commercial_mindset",
        "enterprise_sales",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gaps": [
        "coaching",
        "pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "it_manager",
      "t": "ciso_head_of_security",
      "score": 0.426,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "it_operations_leadership",
        "leadership",
        "security_program_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "grc_frameworks",
        "incident_response_forensics",
        "risk_assessment_management"
      ],
      "gap_n": 8
    },
    {
      "s": "account_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "ai_transformation_lead",
      "t": "customer_experience_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "business_analyst",
      "t": "head_of_revops",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_executive_communication",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "business_development_representative",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_analyst",
      "t": "head_of_revops",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_executive_communication",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "channel_partner_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "ciso_head_of_security",
      "t": "security_analyst_soc",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "ai_tool_fluency",
        "cloud_security_posture",
        "incident_response_forensics",
        "security_monitoring_detection"
      ],
      "gaps": [
        "security_data_analysis",
        "threat_analysis_investigation"
      ],
      "gap_n": 6
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "customer_experience_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "consultant",
      "t": "head_of_solutions_engineering",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "change_management",
        "delivery_methodology",
        "domain_expertise",
        "executive_presentation",
        "relationship_building",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "se_team_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 12
    },
    {
      "s": "customer_experience_manager",
      "t": "implementation_specialist",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_onboarding_specialist",
      "t": "implementation_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "product_adoption",
        "project_management"
      ],
      "gaps": [
        "implementation_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_onboarding_specialist",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "crm_management",
        "customer_communication",
        "delivery_execution",
        "project_management"
      ],
      "gaps": [
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_success_associate",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_success_manager",
      "t": "account_manager",
      "score": 0.425,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_relationship_management",
        "data_analysis",
        "renewal_management",
        "stakeholder_management"
      ],
      "gaps": [
        "account_management",
        "negotiation",
        "upselling_cross_selling"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "CSM and AM are adjacent relationship management roles \u2014 customer-facing, retention/growth focused, high skill overlap in practice"
    },
    {
      "s": "cv_edge_ai_engineer",
      "t": "senior_ai_engineer",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "applied_ai_research",
        "deep_learning",
        "domain_expertise",
        "ml_systems_thinking",
        "model_deployment_serving",
        "model_training_finetuning",
        "performance_optimization",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "ai_agent_development",
        "backend_development",
        "llm_api_integration",
        "llm_evaluation",
        "rag_systems"
      ],
      "gap_n": 11
    },
    {
      "s": "devops_engineer",
      "t": "mlops_engineer",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ci_cd",
        "cloud_platforms",
        "containerization",
        "databases",
        "linux_administration",
        "monitoring_observability",
        "python_development",
        "scripting_automation"
      ],
      "gaps": [
        "ai_experiment_tracking",
        "mlops_pipelines",
        "model_deployment_serving",
        "model_monitoring_drift"
      ],
      "gap_n": 12
    },
    {
      "s": "director_customer_success",
      "t": "customer_success_team_lead",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "customer_success_metrics",
        "expansion_strategy",
        "people_management"
      ],
      "gaps": [
        "coaching",
        "customer_retention"
      ],
      "gap_n": 6
    },
    {
      "s": "director_customer_success_operations",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "delivery_execution",
        "process_improvement",
        "project_management"
      ],
      "gaps": [
        "customer_communication",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 5
    },
    {
      "s": "grc_analyst",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_manager",
      "t": "customer_experience_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_journey_management",
        "data_analysis"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_manager",
      "t": "technical_support_engineer",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "api_integrations",
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_consultant_analyst",
      "t": "procurement_specialist",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 5
    },
    {
      "s": "ld_specialist",
      "t": "customer_experience_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "operations_coordinator",
      "t": "facilities_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "administrative_operations",
        "communication",
        "office_operations",
        "vendor_procurement_management"
      ],
      "gaps": [
        "budget_cost_management",
        "facilities_infrastructure"
      ],
      "gap_n": 5
    },
    {
      "s": "principal_director_consulting",
      "t": "implementation_specialist",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "customer_communication",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 6
    },
    {
      "s": "procurement_specialist",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "product_operations_manager",
      "t": "head_of_revops",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "project_manager",
      "t": "procurement_specialist",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 5
    },
    {
      "s": "sales_manager",
      "t": "support_team_lead",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "coaching",
        "cross_functional_collaboration",
        "people_management",
        "process_improvement"
      ],
      "gaps": [
        "customer_support_operations",
        "incident_management"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_operations_manager",
      "t": "head_of_revops",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_account_executive",
      "t": "account_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "customer_communication",
        "negotiation",
        "stakeholder_management"
      ],
      "gaps": [
        "account_management",
        "customer_relationship_management",
        "upselling_cross_selling"
      ],
      "gap_n": 5
    },
    {
      "s": "solutions_engineering_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "strategy_ops_manager",
      "t": "customer_experience_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "support_team_lead",
      "t": "senior_support_engineer",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "incident_management",
        "technical_documentation",
        "technical_leadership"
      ],
      "gaps": [
        "advanced_debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "customer_experience_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "support_team_lead",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "coaching",
        "cross_functional_collaboration",
        "people_management",
        "process_improvement"
      ],
      "gaps": [
        "customer_support_operations",
        "incident_management"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_account_manager",
      "t": "implementation_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "api_integrations",
        "cross_functional_collaboration",
        "implementation_management",
        "stakeholder_management"
      ],
      "gaps": [
        "delivery_execution",
        "project_management"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_product_manager",
      "t": "implementation_manager",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "api_integrations",
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management"
      ],
      "gaps": [
        "implementation_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "vp_sales",
      "t": "director_customer_success",
      "score": 0.425,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "executive_relationships",
        "expansion_strategy",
        "leadership",
        "organizational_design",
        "retention_strategy"
      ],
      "gaps": [
        "cross_functional_alignment",
        "customer_success_strategy",
        "operational_management"
      ],
      "gap_n": 5
    },
    {
      "s": "account_executive",
      "t": "business_development_representative",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "crm_management",
        "customer_communication",
        "outbound_prospecting",
        "product_knowledge",
        "sales_tools_proficiency"
      ],
      "gaps": [
        "lead_qualification",
        "linkedin_outreach",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_transformation_lead",
      "t": "revops_manager",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "business_analyst",
      "t": "junior_consultant_analyst",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "attention_to_detail",
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "ld_specialist",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "hr_data_analytics",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "learning_development",
        "organizational_development",
        "program_management"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "customer_success_manager",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_advocacy",
        "customer_communication",
        "customer_health_monitoring",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_relationship_management",
        "customer_retention",
        "product_adoption"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_success_associate",
      "t": "revops_manager",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_enablement_training",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "grc_analyst",
      "t": "junior_consultant_analyst",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "risk_compliance_consulting",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_revops",
      "t": "junior_consultant_analyst",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "process_improvement"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_generalist",
      "t": "compensation_benefits_specialist",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "hris_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "marketing_manager",
      "t": "social_media_manager",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tools_marketing",
        "content_strategy",
        "marketing_analytics",
        "performance_marketing",
        "social_media_management"
      ],
      "gaps": [
        "community_management",
        "copywriting",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "junior_consultant_analyst",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail",
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "revops_manager",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "revops_analyst",
      "t": "junior_consultant_analyst",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "communication",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "attention_to_detail",
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_solutions_engineer",
      "t": "junior_consultant_analyst",
      "score": 0.423,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gap_n": 7
    },
    {
      "s": "account_manager",
      "t": "business_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "account_manager",
      "t": "revops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "excel_advanced_finance",
        "sql"
      ],
      "gap_n": 9
    },
    {
      "s": "account_manager",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_engineer_mid",
      "t": "tech_lead",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "backend_development",
        "cloud_platforms",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "code_review_practices",
        "technical_leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_transformation_lead",
      "t": "business_ops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_transformation_lead",
      "t": "product_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "analytics_engineer",
      "t": "product_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "systems_thinking"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "analytics_engineer",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "systems_thinking"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "associate_product_manager",
      "t": "product_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "product_metrics"
      ],
      "gaps": [
        "ab_testing",
        "sql",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "business_analyst",
      "t": "business_ops_manager",
      "score": 0.42,
      "type": "stretch",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "problem_solving",
        "process_improvement",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_okr_framework",
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 6,
      "curated": true,
      "curated_note": "Common ops career path \u2014 BAs bring analytical skills and process understanding, need people/operational ownership."
    },
    {
      "s": "business_analyst",
      "t": "seo_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_manager",
      "t": "seo_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "channel_partner_manager",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "cross_functional_collaboration",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "ciso_head_of_security",
      "t": "vp_engineering",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 9
    },
    {
      "s": "content_marketing_manager",
      "t": "growth_marketing_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "seo_management"
      ],
      "gaps": [
        "ab_testing_marketing",
        "marketing_automation",
        "performance_marketing"
      ],
      "gap_n": 8
    },
    {
      "s": "content_marketing_manager",
      "t": "head_of_marketing",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "product_positioning"
      ],
      "gaps": [
        "brand_management",
        "go_to_market_strategy",
        "people_management"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_success_associate",
      "t": "business_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "customer_success_associate",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "data_analyst",
      "t": "product_analyst",
      "score": 0.42,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ab_testing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "product_metrics",
        "sql",
        "user_behavior_analysis"
      ],
      "gap_n": 9,
      "curated": true,
      "curated_note": "Data analysts with product domain knowledge move into product analytics."
    },
    {
      "s": "data_engineer",
      "t": "head_of_data",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "analytical_thinking",
        "cloud_data_platforms",
        "data_analysis",
        "python_data",
        "sql_advanced"
      ],
      "gaps": [
        "data_storytelling",
        "data_team_leadership",
        "people_management"
      ],
      "gap_n": 9
    },
    {
      "s": "engineering_manager",
      "t": "vp_engineering",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "cloud_platforms",
        "organizational_design",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership",
        "executive_leadership",
        "talent_strategy"
      ],
      "gap_n": 8
    },
    {
      "s": "finance_manager",
      "t": "fpa_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "budget_forecasting",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "saas_finance_metrics"
      ],
      "gaps": [
        "analytical_thinking",
        "bva_analysis",
        "excel_advanced_finance"
      ],
      "gap_n": 8
    },
    {
      "s": "fpa_analyst",
      "t": "business_intelligence_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "sql_advanced"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling"
      ],
      "gap_n": 9
    },
    {
      "s": "fpa_analyst",
      "t": "revops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_it",
      "t": "vp_engineering",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_revops",
      "t": "engineering_group_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "implementation_specialist",
      "t": "business_ops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "problem_solving",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "data_analysis",
        "excel_advanced_finance"
      ],
      "gap_n": 8
    },
    {
      "s": "ld_specialist",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "business_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "revops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration"
      ],
      "gap_n": 9
    },
    {
      "s": "product_analyst",
      "t": "business_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "product_analyst",
      "t": "revops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration"
      ],
      "gap_n": 9
    },
    {
      "s": "product_analyst",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_analyst",
      "t": "business_ops_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_enablement_training",
        "bizops_executive_communication",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_okr_framework",
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "revops_analyst",
      "t": "seo_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "revops_manager",
      "t": "product_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_manager",
      "t": "seo_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_operations_manager",
      "t": "product_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_consultant",
      "t": "senior_solutions_engineer",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "poc_management",
        "relationship_building",
        "rfp_response",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "competitive_positioning",
        "customer_technical_relationship",
        "product_demonstration",
        "solution_design_architecture",
        "technical_sales_acumen"
      ],
      "gap_n": 14
    },
    {
      "s": "senior_fpa_analyst",
      "t": "revops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_product_manager",
      "t": "product_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_solutions_engineer",
      "t": "engineering_group_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership",
        "organizational_design",
        "people_management"
      ],
      "gap_n": 9
    },
    {
      "s": "seo_manager",
      "t": "marketing_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "content_strategy",
        "cross_functional_collaboration",
        "marketing_analytics"
      ],
      "gaps": [
        "demand_generation",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "social_media_manager",
      "t": "growth_marketing_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ab_testing_marketing",
        "ai_tools_marketing",
        "marketing_analytics",
        "performance_marketing"
      ],
      "gaps": [
        "demand_generation",
        "marketing_automation"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineer_junior",
      "t": "consultant",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation"
      ],
      "gap_n": 11
    },
    {
      "s": "solutions_engineer_junior",
      "t": "revops_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "data_analysis",
        "revops_crm_administration",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineer_junior",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "strategy_ops_manager",
      "t": "product_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "strategy_ops_manager",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "talent_acquisition_manager",
      "t": "seo_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_account_manager",
      "t": "technical_project_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "stakeholder_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 10
    },
    {
      "s": "technical_product_manager",
      "t": "product_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "delivery_execution",
        "project_management"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_project_manager",
      "t": "sales_operations_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_engineering",
      "t": "senior_software_engineer",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "cloud_platforms",
        "distributed_systems",
        "performance_optimization",
        "system_design"
      ],
      "gaps": [
        "backend_development",
        "python_development"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_finance_cfo",
      "t": "fpa_analyst",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "budget_forecasting",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "saas_finance_metrics"
      ],
      "gaps": [
        "analytical_thinking",
        "bva_analysis",
        "excel_advanced_finance"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_operations",
      "t": "engineering_group_manager",
      "score": 0.42,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "organizational_design",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_transformation_lead",
      "t": "junior_ai_ml_engineer",
      "score": 0.417,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_agent_development",
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "llm_api_integration",
        "prompt_engineering"
      ],
      "gaps": [
        "llm_fundamentals",
        "machine_learning_fundamentals",
        "python_development"
      ],
      "gap_n": 9
    },
    {
      "s": "engineering_group_manager",
      "t": "principal_director_consulting",
      "score": 0.417,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "executive_leadership",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "head_of_ai",
      "t": "principal_director_consulting",
      "score": 0.417,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "domain_expertise",
        "executive_leadership",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "program_manager",
      "t": "principal_director_consulting",
      "score": 0.417,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "domain_expertise",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "senior_engineering_manager",
      "t": "principal_director_consulting",
      "score": 0.417,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "executive_leadership",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "junior_consultant_analyst",
      "t": "vp_operations",
      "score": 0.415,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 5,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "saas_finance_metrics"
      ],
      "gaps": [
        "bizops_operational_scaling",
        "leadership",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "product_manager",
      "t": "head_of_product",
      "score": 0.413,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "roadmap_prioritization"
      ],
      "gaps": [
        "people_management",
        "pm_team_leadership",
        "product_strategy",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_fpa_analyst",
      "t": "controller",
      "score": 0.413,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "budget_forecasting",
        "bva_analysis",
        "cash_flow_management",
        "erp_systems_finance",
        "excel_advanced_finance",
        "financial_modeling"
      ],
      "gaps": [
        "audit_management",
        "cpa_accounting",
        "financial_reporting",
        "gaap_ifrs"
      ],
      "gap_n": 8
    },
    {
      "s": "hr_operations_manager",
      "t": "talent_acquisition_manager",
      "score": 0.412,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "hr_data_analytics",
        "organizational_development",
        "process_improvement"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 6
    },
    {
      "s": "analytics_engineer",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "business_intelligence_analyst",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "data_analyst",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "engineering_group_manager",
      "t": "chief_of_staff",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_cross_functional_execution",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm"
      ],
      "gap_n": 11
    },
    {
      "s": "engineering_manager",
      "t": "senior_software_engineer",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "performance_optimization",
        "python_development"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "program_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "domain_expertise",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_business_case_development",
        "data_analysis"
      ],
      "gap_n": 11
    },
    {
      "s": "hr_operations_manager",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "implementation_manager",
      "t": "business_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "problem_solving",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework",
        "process_improvement"
      ],
      "gap_n": 10
    },
    {
      "s": "implementation_specialist",
      "t": "program_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_project_delivery"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "leadership",
        "program_management"
      ],
      "gap_n": 8
    },
    {
      "s": "performance_marketing_manager",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_business_case_development",
        "bizops_executive_communication"
      ],
      "gap_n": 11
    },
    {
      "s": "principal_director_consulting",
      "t": "engineering_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "performance_management"
      ],
      "gap_n": 9
    },
    {
      "s": "product_manager",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "sales_manager",
      "t": "revops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_data_analyst",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_engineering_manager",
      "t": "business_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_engineering_manager",
      "t": "vp_operations",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_solutions_engineer",
      "t": "vp_operations",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "domain_expertise",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_operational_scaling",
        "leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "software_engineer",
      "t": "tech_lead",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "ci_cd",
        "frontend_development",
        "python_development",
        "testing_practices"
      ],
      "gaps": [
        "code_review_practices",
        "system_design",
        "technical_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "solutions_engineering_manager",
      "t": "strategy_ops_manager",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "data_analysis",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_business_case_development",
        "bizops_executive_communication"
      ],
      "gap_n": 11
    },
    {
      "s": "solutions_engineering_manager",
      "t": "vp_operations",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "domain_expertise",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 10
    },
    {
      "s": "tech_lead",
      "t": "software_engineer",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "ci_cd",
        "frontend_development",
        "python_development",
        "testing_practices"
      ],
      "gaps": [
        "api_design",
        "databases",
        "git_version_control"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_account_manager",
      "t": "chief_of_staff",
      "score": 0.41,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "chief_of_staff",
      "t": "head_of_solutions_engineering",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "executive_presentation",
        "people_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "executive_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 13
    },
    {
      "s": "customer_success_associate",
      "t": "bdr_bd_associate",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "crm_management",
        "relationship_building"
      ],
      "gaps": [
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gap_n": 7
    },
    {
      "s": "engineering_group_manager",
      "t": "head_of_solutions_engineering",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 13
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_team_leadership",
        "stakeholder_management"
      ],
      "gap_n": 13
    },
    {
      "s": "head_of_design_vp_design",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_team_leadership",
        "stakeholder_management"
      ],
      "gap_n": 13
    },
    {
      "s": "junior_consultant_analyst",
      "t": "grc_analyst",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "risk_assessment_management",
        "stakeholder_management"
      ],
      "gaps": [
        "grc_frameworks",
        "security_policy_development",
        "vendor_third_party_risk"
      ],
      "gap_n": 6
    },
    {
      "s": "program_manager",
      "t": "head_of_solutions_engineering",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "domain_expertise",
        "people_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "executive_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 13
    },
    {
      "s": "program_manager",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "ai_team_leadership",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "engineering_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_strategy_roadmap",
        "executive_leadership"
      ],
      "gap_n": 12
    },
    {
      "s": "senior_engineering_manager",
      "t": "head_of_solutions_engineering",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 13
    },
    {
      "s": "vp_business_development",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.408,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_team_leadership",
        "stakeholder_management"
      ],
      "gap_n": 13
    },
    {
      "s": "business_intelligence_analyst",
      "t": "business_ops_manager",
      "score": 0.407,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "director_customer_success_operations",
      "t": "business_ops_manager",
      "score": 0.407,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_business_case_development",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_okr_framework",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "hr_operations_manager",
      "t": "business_ops_manager",
      "score": 0.407,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_operations_manager",
      "t": "business_ops_manager",
      "score": 0.407,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_okr_framework",
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "consulting_manager",
      "score": 0.407,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "ai_strategy",
        "change_management",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 11
    },
    {
      "s": "consulting_manager",
      "t": "senior_solutions_engineer",
      "score": 0.406,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "cross_team_collaboration",
        "domain_expertise",
        "executive_presentation",
        "poc_management",
        "relationship_building",
        "rfp_response",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "competitive_positioning",
        "customer_technical_relationship",
        "product_demonstration",
        "solution_design_architecture",
        "technical_sales_acumen"
      ],
      "gap_n": 15
    },
    {
      "s": "ai_transformation_lead",
      "t": "solutions_engineering_manager",
      "score": 0.404,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "change_management",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "customer_technical_relationship",
        "delivery_methodology",
        "se_team_leadership"
      ],
      "gap_n": 12
    },
    {
      "s": "solutions_engineering_manager",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.404,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_hiring_talent",
        "change_management",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "engineering_leadership",
        "executive_leadership"
      ],
      "gap_n": 11
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "ai_solutions_engineering_manager",
      "score": 0.404,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_agent_development",
        "customer_facing_ai_delivery",
        "llm_api_integration",
        "people_management",
        "technical_leadership"
      ],
      "gap_n": 11
    },
    {
      "s": "brand_marketing_designer",
      "t": "design_lead_design_manager",
      "score": 0.402,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "design_critique",
        "design_leadership",
        "ux_design_process"
      ],
      "gap_n": 11
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "consultant",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "client_engagement_delivery",
        "communication",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "analytical_thinking",
        "client_advisory",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 10
    },
    {
      "s": "business_ops_manager",
      "t": "implementation_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "problem_solving",
        "process_improvement",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "implementation_management",
        "requirements_gathering"
      ],
      "gap_n": 5
    },
    {
      "s": "consultant",
      "t": "customer_success_associate",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "customer_success_associate",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "customer_communication",
        "data_analysis",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "consulting_manager",
      "t": "head_of_data",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "data_team_leadership",
        "people_management"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced"
      ],
      "gap_n": 10
    },
    {
      "s": "content_marketing_manager",
      "t": "consultant",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "executive_presentation"
      ],
      "gaps": [
        "client_advisory",
        "consulting_frameworks"
      ],
      "gap_n": 12
    },
    {
      "s": "customer_experience_manager",
      "t": "customer_experience_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_functional_collaboration",
        "customer_advocacy",
        "customer_communication",
        "process_improvement"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "customer_onboarding_specialist",
      "t": "customer_support_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "customer_orientation"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_success_associate",
      "t": "customer_experience_manager",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "customer_communication",
        "customer_health_monitoring",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_support_representative",
      "t": "customer_onboarding_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "customer_orientation",
        "organization"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption",
        "product_knowledge"
      ],
      "gap_n": 5
    },
    {
      "s": "data_engineer",
      "t": "technical_support_engineer",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "api_integrations",
        "cloud_tools",
        "cross_functional_collaboration",
        "debugging"
      ],
      "gaps": [
        "customer_communication",
        "problem_solving",
        "technical_troubleshooting"
      ],
      "gap_n": 5
    },
    {
      "s": "engineering_group_manager",
      "t": "head_of_ai",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_design"
      ],
      "gaps": [
        "ai_team_leadership",
        "ml_systems_thinking",
        "python_development",
        "technical_leadership"
      ],
      "gap_n": 13
    },
    {
      "s": "grc_analyst",
      "t": "consultant",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_revops",
      "t": "principal_director_consulting",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_leadership",
        "proposal_development"
      ],
      "gap_n": 13
    },
    {
      "s": "implementation_manager",
      "t": "customer_experience_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_manager",
      "t": "customer_onboarding_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "product_adoption",
        "project_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_knowledge"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_manager",
      "t": "customer_support_representative",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "customer_support_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_specialist",
      "t": "customer_experience_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_specialist",
      "t": "customer_support_representative",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "customer_support_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_consultant_analyst",
      "t": "executive_assistant",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "attention_to_detail",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "junior_consultant_analyst",
      "t": "head_of_revops",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 4,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "leadership",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "junior_consultant_analyst",
      "t": "operations_coordinator",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "administrative_operations",
        "office_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "principal_director_consulting",
      "t": "head_of_revops",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "program_manager",
      "t": "head_of_revops",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "revops_gtm_process_design",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 10
    },
    {
      "s": "project_manager",
      "t": "executive_assistant",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "attention_to_detail",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager",
      "t": "operations_coordinator",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "administrative_operations",
        "office_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "prompt_engineer",
      "t": "operations_coordinator",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "administrative_operations",
        "office_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "qa_engineer",
      "t": "operations_coordinator",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "administrative_operations",
        "office_operations"
      ],
      "gap_n": 4
    },
    {
      "s": "sales_director",
      "t": "vp_customer_success",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_alignment",
        "executive_relationships",
        "expansion_strategy",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "retention_strategy"
      ],
      "gap_n": 5
    },
    {
      "s": "sales_manager",
      "t": "customer_success_team_lead",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "coaching",
        "cross_functional_collaboration",
        "people_management",
        "process_improvement"
      ],
      "gaps": [
        "customer_retention",
        "customer_success_metrics"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_consultant",
      "t": "customer_success_associate",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "data_analysis",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "head_of_data",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "data_team_leadership",
        "people_management"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_engineering_manager",
      "t": "head_of_ai",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "system_design"
      ],
      "gaps": [
        "ai_team_leadership",
        "ml_systems_thinking",
        "python_development",
        "technical_leadership"
      ],
      "gap_n": 13
    },
    {
      "s": "software_engineer",
      "t": "devops_engineer",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "ci_cd",
        "containerization",
        "databases",
        "distributed_systems",
        "git_version_control",
        "python_development"
      ],
      "gaps": [
        "cloud_platforms_devops",
        "infrastructure_as_code",
        "linux_administration"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineer",
      "t": "head_of_solutions_engineering",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "relationship_building",
        "solution_design_architecture",
        "stakeholder_management",
        "technical_content_creation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "delivery_methodology",
        "executive_leadership",
        "se_team_leadership",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "solutions_engineer",
      "t": "project_manager_customer_delivery",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "crm_management",
        "customer_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 6
    },
    {
      "s": "support_team_lead",
      "t": "customer_support_representative",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "low",
      "sen_gap": -3,
      "shared": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gaps": [
        "customer_communication"
      ],
      "gap_n": 6
    },
    {
      "s": "talent_acquisition_manager",
      "t": "customer_success_team_lead",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "coaching",
        "cross_functional_collaboration",
        "people_management",
        "process_improvement"
      ],
      "gaps": [
        "customer_retention",
        "customer_success_metrics"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_account_manager",
      "t": "sales_engineer",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "api_integrations",
        "business_understanding",
        "product_knowledge",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_discovery",
        "presentation_skills",
        "technical_explanation"
      ],
      "gap_n": 5
    },
    {
      "s": "technical_support_engineer",
      "t": "consultant",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "executive_presentation"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 12
    },
    {
      "s": "technical_support_engineer",
      "t": "customer_experience_specialist",
      "score": 0.4,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "account_executive",
      "t": "channel_partner_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "negotiation",
        "pipeline_management",
        "saas_sales"
      ],
      "gaps": [
        "channel_partner_management",
        "relationship_building",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "account_manager",
      "t": "product_operations_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "bdr_bd_associate",
      "t": "channel_partner_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "pipeline_management",
        "relationship_building"
      ],
      "gaps": [
        "channel_partner_management",
        "negotiation",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "business_analyst",
      "t": "associate_product_manager",
      "score": 0.393,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "organization"
      ],
      "gap_n": 9,
      "curated": true,
      "curated_note": "BA\u2192PM is a common stepping stone path, especially with analytical and stakeholder management skills."
    },
    {
      "s": "business_development_manager",
      "t": "channel_partner_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "pipeline_management",
        "relationship_building"
      ],
      "gaps": [
        "channel_partner_management",
        "negotiation",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "business_ops_analyst",
      "t": "associate_product_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "organization"
      ],
      "gap_n": 9
    },
    {
      "s": "business_ops_manager",
      "t": "business_intelligence_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "channel_partner_manager",
      "t": "sales_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "cross_functional_collaboration",
        "customer_communication",
        "negotiation",
        "pipeline_management"
      ],
      "gaps": [
        "coaching",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "senior_fpa_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "budget_forecasting",
        "data_analysis",
        "excel_advanced_finance",
        "financial_modeling",
        "stakeholder_management"
      ],
      "gaps": [
        "bva_analysis",
        "finance_business_partnering",
        "saas_finance_metrics"
      ],
      "gap_n": 9
    },
    {
      "s": "consultant",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "consulting_manager",
      "t": "project_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "communication",
        "cross_functional_collaboration",
        "risk_management"
      ],
      "gap_n": 8
    },
    {
      "s": "consulting_manager",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_manager",
      "t": "business_intelligence_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_manager",
      "t": "business_ops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_manager",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_specialist",
      "t": "project_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_success_associate",
      "t": "channel_partner_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "channel_partner_management",
        "negotiation",
        "pipeline_management"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_success_associate",
      "t": "product_operations_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "dashboarding",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_support_representative",
      "t": "associate_product_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "organization",
        "problem_solving"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "executive_assistant",
      "t": "project_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "attention_to_detail",
        "communication",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "project_management",
        "risk_management"
      ],
      "gap_n": 8
    },
    {
      "s": "fpa_analyst",
      "t": "data_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "sql_advanced"
      ],
      "gaps": [
        "bi_tools",
        "data_storytelling"
      ],
      "gap_n": 9
    },
    {
      "s": "hr_generalist",
      "t": "associate_product_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "organization"
      ],
      "gaps": [
        "problem_solving",
        "technical_communication"
      ],
      "gap_n": 9
    },
    {
      "s": "implementation_specialist",
      "t": "consulting_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "executive_presentation",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 14
    },
    {
      "s": "junior_consultant_analyst",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 8,
      "curated": true,
      "curated_note": "Analytical consulting skills transfer well to RevOps data work."
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "marketing_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "cross_functional_collaboration",
        "marketing_analytics",
        "marketing_automation"
      ],
      "gaps": [
        "content_strategy",
        "demand_generation",
        "project_management"
      ],
      "gap_n": 8
    },
    {
      "s": "operations_coordinator",
      "t": "junior_consultant_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "partnerships_manager",
      "t": "channel_partner_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "pipeline_management",
        "relationship_building"
      ],
      "gaps": [
        "channel_partner_management",
        "negotiation",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "product_analyst",
      "t": "product_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "competitive_analysis_product",
        "cross_functional_collaboration",
        "data_analysis",
        "product_discovery",
        "product_metrics"
      ],
      "gaps": [
        "prd_writing",
        "product_lifecycle_management",
        "roadmap_prioritization"
      ],
      "gap_n": 9
    },
    {
      "s": "product_manager",
      "t": "seo_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "product_metrics"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "product_marketing_manager",
      "t": "marketing_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "cross_functional_collaboration",
        "product_positioning"
      ],
      "gaps": [
        "demand_generation",
        "marketing_analytics",
        "project_management"
      ],
      "gap_n": 8
    },
    {
      "s": "product_operations_manager",
      "t": "business_intelligence_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "prompt_engineer",
      "t": "junior_consultant_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "qa_engineer",
      "t": "junior_consultant_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "revops_analyst",
      "t": "data_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_manager",
      "t": "business_intelligence_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_director",
      "t": "channel_partner_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "go_to_market_strategy",
        "negotiation",
        "stakeholder_management"
      ],
      "gaps": [
        "channel_partner_management",
        "pipeline_management",
        "relationship_building"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_manager",
      "t": "account_executive",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "consultative_selling",
        "crm_management",
        "customer_communication",
        "negotiation",
        "pipeline_management"
      ],
      "gaps": [
        "deal_closing",
        "discovery_calls",
        "quota_attainment"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_operations_manager",
      "t": "business_intelligence_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_operations_manager",
      "t": "business_ops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "process_improvement",
        "revops_commercial_analytics",
        "revops_crm_administration"
      ],
      "gaps": [
        "attention_to_detail",
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_consultant",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_product_manager",
      "t": "technical_product_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_product_management",
        "analytical_thinking",
        "cross_functional_collaboration",
        "prd_writing",
        "product_metrics"
      ],
      "gaps": [
        "agile_scrum",
        "product_lifecycle_management",
        "technical_product_management"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_solutions_engineer",
      "t": "vp_engineering",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "cloud_platforms",
        "domain_expertise",
        "stakeholder_management",
        "strategic_thinking",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership",
        "executive_leadership",
        "talent_strategy"
      ],
      "gap_n": 8
    },
    {
      "s": "seo_manager",
      "t": "lifecycle_marketing_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "cross_functional_collaboration",
        "data_analysis",
        "marketing_analytics",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "ab_testing_marketing",
        "customer_retention",
        "lifecycle_marketing",
        "marketing_automation"
      ],
      "gap_n": 7
    },
    {
      "s": "social_media_manager",
      "t": "marketing_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tools_marketing",
        "content_strategy",
        "marketing_analytics",
        "performance_marketing",
        "social_media_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "demand_generation",
        "project_management"
      ],
      "gap_n": 8
    },
    {
      "s": "strategy_ops_manager",
      "t": "associate_product_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "organization",
        "problem_solving"
      ],
      "gap_n": 9
    },
    {
      "s": "talent_acquisition_manager",
      "t": "business_intelligence_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "talent_acquisition_manager",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_project_manager",
      "t": "associate_product_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "organization",
        "problem_solving"
      ],
      "gap_n": 9
    },
    {
      "s": "technical_support_engineer",
      "t": "seo_manager",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "technical_communication",
        "technical_troubleshooting"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 8
    },
    {
      "s": "vp_customer_success",
      "t": "vp_marketing",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "expansion_strategy",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "brand_management",
        "demand_generation",
        "go_to_market_strategy"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_operations",
      "t": "business_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "excel_advanced_finance"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_operations",
      "t": "revops_analyst",
      "score": 0.393,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "bizops_enablement_training",
        "bizops_process_automation",
        "data_analysis",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_ai",
      "t": "head_of_solutions_engineering",
      "score": 0.392,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "domain_expertise",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 14
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "junior_consultant_analyst",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "client_engagement_delivery",
        "communication",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "attention_to_detail",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "revops_manager",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "project_management",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "bdr_bd_associate",
      "t": "partnerships_manager",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "communication",
        "crm_management",
        "market_research_bd",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "commercial_negotiation",
        "partner_relationship_management",
        "partnership_development"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_success_team_lead",
      "t": "customer_success_manager",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_health_monitoring",
        "customer_relationship_management",
        "customer_retention",
        "renewal_management"
      ],
      "gaps": [
        "customer_communication",
        "product_adoption",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "fpa_analyst",
      "t": "strategy_ops_manager",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "saas_finance_metrics"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_hr_people",
      "t": "ld_specialist",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "hr_data_analytics",
        "learning_development",
        "organizational_development",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "program_management"
      ],
      "gap_n": 8
    },
    {
      "s": "ld_specialist",
      "t": "junior_consultant_analyst",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "communication",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "ld_specialist",
      "t": "revops_manager",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "revops_gtm_process_design",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "customer_success_manager",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_retention",
        "data_analysis",
        "product_adoption",
        "sales_collaboration"
      ],
      "gaps": [
        "customer_communication",
        "customer_relationship_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "product_operations_manager",
      "t": "junior_consultant_analyst",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "attention_to_detail",
        "communication",
        "consulting_frameworks"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager",
      "t": "chief_of_staff",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_manager",
      "t": "chief_of_staff",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_engineering_manager",
      "t": "consulting_manager",
      "score": 0.39,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "consulting_manager",
      "t": "ai_transformation_lead",
      "score": 0.388,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "change_management",
        "consulting_methodology",
        "cross_team_collaboration",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "communication",
        "llm_api_integration",
        "no_code_ai_automation",
        "prompt_engineering"
      ],
      "gap_n": 10
    },
    {
      "s": "cv_edge_ai_engineer",
      "t": "mlops_engineer",
      "score": 0.388,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "cuda_gpu_programming",
        "data_pipeline_ml",
        "deep_learning",
        "linux_administration",
        "ml_systems_thinking",
        "model_deployment_serving",
        "performance_optimization",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "ai_experiment_tracking",
        "ci_cd",
        "cloud_platforms",
        "containerization",
        "mlops_pipelines",
        "model_monitoring_drift"
      ],
      "gap_n": 11
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "head_of_ai",
      "score": 0.388,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "domain_expertise",
        "executive_leadership",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_team_leadership",
        "ml_systems_thinking",
        "python_development",
        "technical_leadership"
      ],
      "gap_n": 13
    },
    {
      "s": "senior_ai_engineer",
      "t": "prompt_engineer",
      "score": 0.388,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_agent_development",
        "ai_safety_responsible_ai",
        "domain_expertise",
        "llm_api_integration",
        "llm_evaluation",
        "python_development",
        "rag_systems"
      ],
      "gaps": [
        "ai_product_thinking",
        "communication",
        "conversational_ai_design",
        "llm_fundamentals",
        "prompt_engineering"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "solutions_engineering_manager",
      "score": 0.388,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "change_management",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "customer_technical_relationship",
        "delivery_methodology",
        "se_team_leadership"
      ],
      "gap_n": 13
    },
    {
      "s": "channel_partner_manager",
      "t": "enterprise_account_executive",
      "score": 0.387,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "negotiation",
        "pipeline_management",
        "saas_sales",
        "stakeholder_management"
      ],
      "gaps": [
        "consultative_selling",
        "deal_closing",
        "enterprise_sales",
        "executive_relationships"
      ],
      "gap_n": 8
    },
    {
      "s": "chief_of_staff",
      "t": "revops_manager",
      "score": 0.387,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "data_analysis",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 7
    },
    {
      "s": "consultant",
      "t": "senior_solutions_engineer",
      "score": 0.387,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "domain_expertise",
        "executive_presentation",
        "poc_management",
        "relationship_building",
        "rfp_response",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "competitive_positioning",
        "customer_technical_relationship",
        "product_demonstration",
        "solution_design_architecture",
        "technical_sales_acumen"
      ],
      "gap_n": 15
    },
    {
      "s": "principal_director_consulting",
      "t": "senior_solutions_engineer",
      "score": 0.387,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "domain_expertise",
        "executive_presentation",
        "gtm_strategy",
        "poc_management",
        "relationship_building",
        "rfp_response",
        "stakeholder_management",
        "strategic_thinking",
        "technical_discovery"
      ],
      "gaps": [
        "competitive_positioning",
        "customer_technical_relationship",
        "product_demonstration",
        "solution_design_architecture",
        "technical_sales_acumen"
      ],
      "gap_n": 15
    },
    {
      "s": "chief_of_staff",
      "t": "staff_engineer",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "content_marketing_manager",
      "t": "technical_project_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "delivery_execution",
        "project_management",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "devops_engineer",
      "t": "senior_software_engineer",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cloud_platforms",
        "databases",
        "distributed_systems",
        "python_development"
      ],
      "gaps": [
        "backend_development",
        "performance_optimization",
        "system_design"
      ],
      "gap_n": 9
    },
    {
      "s": "engineering_manager",
      "t": "program_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "engineering_manager",
      "t": "vp_operations",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 11
    },
    {
      "s": "head_of_admin_ga",
      "t": "program_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_admin_ga",
      "t": "staff_engineer",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_admin_ga",
      "t": "vp_operations",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 11
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "engineering_group_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "organizational_design",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_design_vp_design",
      "t": "engineering_group_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "organizational_design",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "ld_specialist",
      "t": "program_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "process_improvement",
        "program_management",
        "stakeholder_management"
      ],
      "gaps": [
        "leadership",
        "project_management"
      ],
      "gap_n": 10
    },
    {
      "s": "program_manager",
      "t": "staff_engineer",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_bd_manager_strategic_partnerships",
      "t": "senior_engineering_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "engineering_leadership",
        "executive_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "people_management",
        "system_architecture"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_consultant",
      "t": "staff_engineer",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_engineering_manager",
      "t": "program_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_team_collaboration",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_software_engineer",
      "t": "engineering_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "cross_team_collaboration",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "people_management",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_software_engineer",
      "t": "vp_operations",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "leadership"
      ],
      "gaps": [
        "bizops_operational_scaling",
        "strategic_thinking"
      ],
      "gap_n": 11
    },
    {
      "s": "staff_engineer",
      "t": "program_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "staff_engineer",
      "t": "vp_operations",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 11
    },
    {
      "s": "talent_acquisition_manager",
      "t": "program_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "leadership",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "program_management",
        "project_management"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "vp_operations",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "domain_expertise",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 11
    },
    {
      "s": "vp_business_development",
      "t": "engineering_group_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "hiring_talent_acquisition",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "organizational_design",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_customer_success",
      "t": "engineering_group_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_marketing",
      "t": "engineering_group_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_sales",
      "t": "engineering_group_manager",
      "score": 0.385,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "junior_ai_ml_engineer",
      "score": 0.383,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_agent_development",
        "communication",
        "llm_api_integration",
        "prompt_engineering",
        "python_development"
      ],
      "gaps": [
        "analytical_thinking",
        "llm_fundamentals",
        "machine_learning_fundamentals"
      ],
      "gap_n": 10
    },
    {
      "s": "associate_product_manager",
      "t": "senior_product_manager",
      "score": 0.383,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_discovery_interviews",
        "prd_writing",
        "product_metrics",
        "ux_product_design_sense"
      ],
      "gaps": [
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "cv_edge_ai_engineer",
      "t": "junior_ai_ml_engineer",
      "score": 0.383,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "debugging",
        "deep_learning",
        "machine_learning_fundamentals",
        "python_development"
      ],
      "gaps": [
        "llm_api_integration",
        "llm_fundamentals",
        "prompt_engineering"
      ],
      "gap_n": 10
    },
    {
      "s": "fpa_analyst",
      "t": "vp_finance_cfo",
      "score": 0.383,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "budget_forecasting",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "saas_finance_metrics"
      ],
      "gaps": [
        "financial_reporting",
        "investor_relations_finance",
        "people_management"
      ],
      "gap_n": 10
    },
    {
      "s": "product_analyst",
      "t": "senior_product_manager",
      "score": 0.383,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "competitive_analysis_product",
        "cross_functional_collaboration",
        "product_discovery",
        "product_led_growth",
        "product_metrics"
      ],
      "gaps": [
        "prd_writing",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_engineering",
      "t": "principal_director_consulting",
      "score": 0.383,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "domain_expertise",
        "executive_leadership",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "business_analyst",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "business_ops_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "business_ops_manager",
      "t": "talent_acquisition_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "chief_of_staff",
      "t": "talent_acquisition_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "people_management",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "employer_branding",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "talent_acquisition_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "fpa_analyst",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "budget_forecasting",
        "data_analysis",
        "excel_advanced_finance",
        "financial_modeling"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_hr_people",
      "t": "hr_operations_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "compensation_benefits",
        "hr_data_analytics",
        "israeli_labor_law",
        "organizational_development",
        "systems_thinking"
      ],
      "gaps": [
        "employee_lifecycle_management",
        "hris_management",
        "process_improvement"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "product_operations_manager",
      "t": "talent_acquisition_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "project_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "project_manager",
      "t": "talent_acquisition_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_analyst",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "data_analysis",
        "excel_advanced_finance",
        "process_improvement"
      ],
      "gaps": [
        "compensation_benefits",
        "hr_data_analytics",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "revops_manager",
      "t": "talent_acquisition_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_consultant",
      "t": "solutions_engineer",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "cross_team_collaboration",
        "poc_management",
        "relationship_building",
        "rfp_response",
        "stakeholder_management",
        "technical_discovery"
      ],
      "gaps": [
        "api_design",
        "customer_technical_relationship",
        "product_demonstration",
        "solution_design_architecture"
      ],
      "gap_n": 13
    },
    {
      "s": "talent_acquisition_manager",
      "t": "hr_generalist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "employer_branding",
        "hr_data_analytics",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "employee_lifecycle_management",
        "israeli_labor_law",
        "organization"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_project_manager",
      "t": "compensation_benefits_specialist",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "compensation_benefits",
        "excel_advanced_finance",
        "hr_data_analytics"
      ],
      "gap_n": 7
    },
    {
      "s": "technical_project_manager",
      "t": "talent_acquisition_manager",
      "score": 0.382,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "employer_branding",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 7
    },
    {
      "s": "business_analyst",
      "t": "consultant",
      "score": 0.38,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 11
    },
    {
      "s": "junior_ux_ui_designer",
      "t": "ux_researcher",
      "score": 0.38,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_design_tools",
        "cross_functional_design_collaboration",
        "design_portfolio",
        "figma_mastery",
        "prototyping",
        "user_research",
        "ux_design_process"
      ],
      "gaps": [
        "analytical_thinking",
        "design_stakeholder_communication",
        "usability_testing"
      ],
      "gap_n": 8
    },
    {
      "s": "ld_specialist",
      "t": "product_analyst",
      "score": 0.38,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "presentation_skills"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "sql",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "product_marketing_manager",
      "t": "product_analyst",
      "score": 0.38,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "presentation_skills"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "sql",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_analyst",
      "t": "consultant",
      "score": 0.38,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks"
      ],
      "gap_n": 11
    },
    {
      "s": "talent_acquisition_manager",
      "t": "product_analyst",
      "score": 0.38,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "sql",
        "user_behavior_analysis"
      ],
      "gap_n": 9
    },
    {
      "s": "business_intelligence_analyst",
      "t": "hr_operations_manager",
      "score": 0.378,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "employee_lifecycle_management",
        "hr_data_analytics",
        "hris_management",
        "israeli_labor_law"
      ],
      "gap_n": 7
    },
    {
      "s": "growth_marketing_manager",
      "t": "content_marketing_manager",
      "score": 0.378,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "seo_management"
      ],
      "gaps": [
        "analytical_thinking",
        "content_strategy",
        "copywriting",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "analytics_engineer",
      "score": 0.378,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "data_analysis",
        "systems_thinking"
      ],
      "gaps": [
        "cloud_data_platforms",
        "data_engineering_pipelines",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 7
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "revops_gtm_process_design",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "ai_transformation_lead",
      "t": "program_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "customer_communication",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "leadership",
        "program_management",
        "project_management"
      ],
      "gap_n": 7
    },
    {
      "s": "applied_ai_researcher",
      "t": "mlops_engineer",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_experiment_tracking",
        "deep_learning",
        "distributed_training",
        "ml_systems_thinking",
        "model_deployment_serving",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "ci_cd",
        "cloud_platforms",
        "containerization",
        "mlops_pipelines",
        "model_monitoring_drift"
      ],
      "gap_n": 13
    },
    {
      "s": "business_intelligence_analyst",
      "t": "customer_experience_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "business_intelligence_analyst",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "business_ops_analyst",
      "t": "implementation_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "delivery_execution",
        "problem_solving",
        "project_management"
      ],
      "gaps": [
        "implementation_management",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "chief_of_staff",
      "t": "engineering_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "chief_of_staff",
      "t": "vp_ai_chief_ai_officer",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_team_leadership",
        "communication",
        "cross_team_collaboration",
        "engineering_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_product_thinking",
        "ai_strategy_roadmap",
        "executive_leadership"
      ],
      "gap_n": 13
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "consultant",
      "t": "implementation_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "delivery_execution",
        "implementation_management"
      ],
      "gap_n": 7
    },
    {
      "s": "consulting_manager",
      "t": "implementation_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "delivery_execution",
        "implementation_management"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_experience_manager",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "customer_success_manager",
      "t": "customer_success_team_lead",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "customer_health_monitoring",
        "customer_relationship_management",
        "customer_retention",
        "renewal_management"
      ],
      "gaps": [
        "coaching",
        "customer_success_metrics",
        "people_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_success_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_support_representative",
      "t": "technical_support_engineer",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 7
    },
    {
      "s": "director_customer_success_operations",
      "t": "customer_experience_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "data_analysis",
        "process_design",
        "process_improvement",
        "project_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 6
    },
    {
      "s": "director_customer_success_operations",
      "t": "director_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_alignment",
        "customer_success_metrics",
        "operational_management"
      ],
      "gaps": [
        "customer_success_strategy",
        "leadership"
      ],
      "gap_n": 7
    },
    {
      "s": "engineering_group_manager",
      "t": "vp_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "executive_leadership",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "cross_functional_exec_presence",
        "retention_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "enterprise_account_executive",
      "t": "bdr_bd_associate",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "crm_management",
        "outbound_prospecting",
        "pipeline_management"
      ],
      "gaps": [
        "communication",
        "lead_qualification"
      ],
      "gap_n": 8
    },
    {
      "s": "enterprise_account_executive",
      "t": "senior_customer_success_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "executive_relationships",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_health_management",
        "retention_strategy"
      ],
      "gap_n": 8
    },
    {
      "s": "group_product_manager",
      "t": "director_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_alignment",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "customer_success_strategy",
        "operational_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_admin_ga",
      "t": "engineering_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_data",
      "t": "director_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_alignment",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "customer_success_strategy",
        "operational_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_hr_people",
      "t": "vp_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "executive_leadership",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "cross_functional_exec_presence",
        "retention_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_marketing",
      "t": "director_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_alignment",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "customer_success_strategy",
        "operational_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_revops",
      "t": "customer_experience_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "engineering_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "people_management",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "agile_methodology",
        "performance_management",
        "technical_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "hr_operations_manager",
      "t": "customer_experience_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "director_customer_success_operations",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "data_analysis",
        "process_improvement",
        "systems_thinking"
      ],
      "gaps": [
        "process_design",
        "salesforce"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "revops_commercial_analytics",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "leadership",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "solutions_engineer_junior",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "api_design",
        "communication",
        "debugging"
      ],
      "gaps": [
        "customer_technical_relationship",
        "sql",
        "technical_onboarding_implementation"
      ],
      "gap_n": 11
    },
    {
      "s": "junior_consultant_analyst",
      "t": "implementation_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "customer_communication",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "delivery_execution",
        "implementation_management"
      ],
      "gap_n": 7
    },
    {
      "s": "junior_software_engineer",
      "t": "technical_support_engineer",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "debugging",
        "technical_communication"
      ],
      "gaps": [
        "problem_solving",
        "technical_troubleshooting"
      ],
      "gap_n": 7
    },
    {
      "s": "mlops_engineer",
      "t": "senior_ai_engineer",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_cost_optimization",
        "deep_learning",
        "ml_systems_thinking",
        "model_deployment_serving",
        "performance_optimization",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "ai_agent_development",
        "backend_development",
        "llm_api_integration",
        "llm_evaluation",
        "rag_systems"
      ],
      "gap_n": 13
    },
    {
      "s": "principal_director_consulting",
      "t": "implementation_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "delivery_execution",
        "implementation_management"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "engineering_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "director_customer_success_operations",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "crm_management",
        "data_analysis",
        "process_improvement",
        "project_management"
      ],
      "gaps": [
        "process_design",
        "salesforce",
        "systems_thinking"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_director",
      "t": "senior_customer_success_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "commercial_mindset",
        "executive_relationships",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_health_management",
        "retention_strategy"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_manager",
      "t": "bdr_bd_associate",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "communication",
        "crm_management",
        "pipeline_management"
      ],
      "gaps": [
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_manager",
      "t": "customer_experience_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "process_improvement"
      ],
      "gaps": [
        "customer_journey_management",
        "data_analysis"
      ],
      "gap_n": 7
    },
    {
      "s": "sales_manager",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "bizops_executive_communication",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_consultant",
      "t": "engineering_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "performance_management"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_consultant",
      "t": "implementation_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "delivery_execution",
        "implementation_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_customer_success_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_engineering_manager",
      "t": "head_of_revops",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "revops_gtm_process_design",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "senior_engineering_manager",
      "t": "vp_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "executive_leadership",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "cross_functional_exec_presence",
        "retention_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineer",
      "t": "bdr_bd_associate",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "communication",
        "crm_management",
        "relationship_building"
      ],
      "gaps": [
        "lead_qualification",
        "outbound_prospecting"
      ],
      "gap_n": 8
    },
    {
      "s": "solutions_engineer",
      "t": "technical_support_engineer",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "debugging",
        "technical_communication"
      ],
      "gaps": [
        "problem_solving",
        "technical_troubleshooting"
      ],
      "gap_n": 7
    },
    {
      "s": "staff_engineer",
      "t": "vp_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "executive_leadership",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "cross_functional_exec_presence",
        "retention_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "tech_lead",
      "t": "head_of_ai",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_hiring_talent",
        "mentoring",
        "ml_systems_thinking",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "ai_strategy_roadmap",
        "ai_team_leadership",
        "people_management",
        "stakeholder_management"
      ],
      "gap_n": 14
    },
    {
      "s": "tech_lead",
      "t": "senior_ai_engineer",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "backend_development",
        "mentoring",
        "ml_systems_thinking",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "ai_agent_development",
        "llm_api_integration",
        "llm_evaluation",
        "rag_systems"
      ],
      "gap_n": 14
    },
    {
      "s": "technical_product_manager",
      "t": "customer_experience_manager",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "project_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_engineering",
      "t": "vp_customer_success",
      "score": 0.375,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "executive_leadership",
        "leadership",
        "organizational_design"
      ],
      "gaps": [
        "cross_functional_exec_presence",
        "retention_strategy"
      ],
      "gap_n": 7
    },
    {
      "s": "account_manager",
      "t": "revops_manager",
      "score": 0.373,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "data_analysis",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_customer_success_manager",
      "t": "revops_manager",
      "score": 0.373,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "technical_product_manager",
      "t": "business_ops_manager",
      "score": 0.373,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "data_analysis",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework",
        "process_improvement",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "bdr_bd_associate",
      "t": "head_of_bd_head_of_partnerships",
      "score": 0.372,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 4,
      "shared": [
        "ai_powered_sales_tools",
        "crm_management",
        "outbound_prospecting",
        "pipeline_management",
        "presentation_skills_bd",
        "relationship_building"
      ],
      "gaps": [
        "bd_team_leadership",
        "partnership_development",
        "strategic_thinking"
      ],
      "gap_n": 12
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "head_of_bd_head_of_partnerships",
      "score": 0.372,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "people_management",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "bd_team_leadership",
        "partnership_development",
        "pipeline_management"
      ],
      "gap_n": 12
    },
    {
      "s": "principal_director_consulting",
      "t": "head_of_bd_head_of_partnerships",
      "score": 0.372,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "executive_leadership",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "people_management",
        "relationship_building",
        "strategic_thinking"
      ],
      "gaps": [
        "bd_team_leadership",
        "partnership_development",
        "pipeline_management"
      ],
      "gap_n": 12
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "solutions_engineering_manager",
      "score": 0.371,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "customer_technical_relationship",
        "delivery_methodology",
        "se_team_leadership"
      ],
      "gap_n": 14
    },
    {
      "s": "head_of_admin_ga",
      "t": "head_of_solutions_engineering",
      "score": 0.371,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "people_management",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "executive_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 14
    },
    {
      "s": "revops_manager",
      "t": "consulting_manager",
      "score": 0.371,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "consulting_frameworks",
        "cross_team_collaboration",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 13
    },
    {
      "s": "staff_engineer",
      "t": "head_of_solutions_engineering",
      "score": 0.371,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "ai_tool_fluency",
        "cross_team_collaboration",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 14
    },
    {
      "s": "associate_product_manager",
      "t": "business_ops_manager",
      "score": 0.37,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "data_analysis",
        "problem_solving",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "bizops_okr_framework",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "ciso_head_of_security",
      "t": "it_manager",
      "score": 0.37,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "business_continuity_dr",
        "cloud_security_posture",
        "it_operations_leadership",
        "leadership",
        "security_program_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "endpoint_management",
        "identity_access_management",
        "it_infrastructure_networking",
        "it_security_compliance"
      ],
      "gap_n": 7
    },
    {
      "s": "hr_operations_manager",
      "t": "hr_business_partner",
      "score": 0.37,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "compensation_benefits",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "israeli_labor_law",
        "organizational_development"
      ],
      "gaps": [
        "coaching",
        "hr_business_partnering",
        "performance_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_ai",
      "t": "applied_ai_researcher",
      "score": 0.368,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "ai_agent_development",
        "applied_ai_research",
        "deep_learning",
        "domain_expertise",
        "ml_systems_thinking",
        "python_development"
      ],
      "gaps": [
        "analytical_thinking",
        "llm_evaluation",
        "machine_learning_fundamentals",
        "model_training_finetuning"
      ],
      "gap_n": 13
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "principal_director_consulting",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "client_engagement_delivery",
        "domain_expertise",
        "hiring_talent_acquisition",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_leadership",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "business_ops_analyst",
      "t": "senior_consultant",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "executive_presentation",
        "financial_due_diligence",
        "process_improvement"
      ],
      "gaps": [
        "client_advisory",
        "consulting_frameworks",
        "proposal_development",
        "stakeholder_management"
      ],
      "gap_n": 12
    },
    {
      "s": "channel_partner_manager",
      "t": "senior_customer_success_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "cross_functional_collaboration",
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_health_management",
        "executive_relationships",
        "retention_strategy"
      ],
      "gap_n": 6
    },
    {
      "s": "ciso_head_of_security",
      "t": "principal_director_consulting",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "executive_leadership",
        "leadership",
        "risk_compliance_consulting",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 13
    },
    {
      "s": "customer_success_manager",
      "t": "senior_customer_success_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "customer_advocacy",
        "customer_communication",
        "customer_relationship_management",
        "data_analysis",
        "renewal_management",
        "stakeholder_management"
      ],
      "gaps": [
        "commercial_mindset",
        "customer_health_management",
        "executive_relationships",
        "retention_strategy"
      ],
      "gap_n": 5
    },
    {
      "s": "fpa_analyst",
      "t": "business_ops_analyst",
      "score": 0.367,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "data_analysis",
        "erp_systems_finance",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "saas_finance_metrics"
      ],
      "gaps": [
        "attention_to_detail",
        "process_improvement",
        "technical_communication"
      ],
      "gap_n": 8,
      "curated": true,
      "curated_note": "FP&A analysts with process and cross-functional skills move into business operations."
    },
    {
      "s": "grc_analyst",
      "t": "project_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "project_management",
        "risk_management"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_marketing",
      "t": "sales_director",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "cross_functional_alignment",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "enterprise_sales",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_revops",
      "t": "product_operations_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "crm_management",
        "cross_functional_collaboration",
        "data_analysis",
        "process_improvement",
        "workflow_automation"
      ],
      "gaps": [
        "analytical_thinking",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "principal_director_consulting",
      "t": "ai_solutions_engineering_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "domain_expertise",
        "hiring_talent_acquisition",
        "people_management",
        "project_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_agent_development",
        "ai_product_thinking",
        "communication",
        "customer_facing_ai_delivery",
        "llm_api_integration"
      ],
      "gap_n": 12
    },
    {
      "s": "product_analyst",
      "t": "data_analyst",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ab_testing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_storytelling",
        "sql_advanced"
      ],
      "gap_n": 8
    },
    {
      "s": "product_manager",
      "t": "group_product_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "roadmap_prioritization"
      ],
      "gaps": [
        "people_management",
        "pm_team_leadership",
        "product_strategy",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "vp_engineering",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "domain_expertise",
        "engineering_leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager",
      "t": "business_analyst",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "problem_solving",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gap_n": 8
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "business_analyst",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "revops_crm_administration",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gap_n": 8
    },
    {
      "s": "qa_engineer",
      "t": "project_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "agile_methodology",
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication",
        "customer_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "sales_director",
      "t": "head_of_marketing",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "commercial_mindset",
        "cross_functional_alignment",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "brand_management",
        "demand_generation",
        "marketing_analytics"
      ],
      "gap_n": 8
    },
    {
      "s": "sales_director",
      "t": "vp_marketing",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "expansion_strategy",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "brand_management",
        "demand_generation",
        "executive_leadership"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_ai_engineer",
      "t": "vp_engineering",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "distributed_systems",
        "domain_expertise",
        "executive_leadership",
        "performance_optimization",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership",
        "strategic_thinking",
        "talent_strategy"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_consultant",
      "t": "vp_engineering",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "domain_expertise",
        "engineering_leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "executive_leadership",
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_fpa_analyst",
      "t": "business_ops_analyst",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "data_analysis",
        "erp_systems_finance",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "saas_finance_metrics"
      ],
      "gaps": [
        "attention_to_detail",
        "process_improvement",
        "technical_communication"
      ],
      "gap_n": 8
    },
    {
      "s": "solutions_engineer_junior",
      "t": "senior_consultant",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "client_engagement_delivery",
        "communication",
        "consulting_frameworks",
        "cross_team_collaboration"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development",
        "stakeholder_management"
      ],
      "gap_n": 12
    },
    {
      "s": "solutions_engineering_manager",
      "t": "project_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "project_management",
        "risk_management"
      ],
      "gap_n": 8
    },
    {
      "s": "staff_engineer",
      "t": "principal_director_consulting",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_strategy",
        "executive_leadership",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 13
    },
    {
      "s": "strategy_ops_manager",
      "t": "fpa_analyst",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "saas_finance_metrics"
      ],
      "gaps": [
        "budget_forecasting",
        "bva_analysis",
        "financial_modeling"
      ],
      "gap_n": 8
    },
    {
      "s": "strategy_ops_manager",
      "t": "principal_director_consulting",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation",
        "financial_due_diligence",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_leadership",
        "leadership",
        "proposal_development"
      ],
      "gap_n": 12
    },
    {
      "s": "technical_project_manager",
      "t": "business_analyst",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "requirements_gathering",
        "revops_gtm_process_design",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gap_n": 8
    },
    {
      "s": "technical_support_engineer",
      "t": "project_manager",
      "score": 0.367,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_manager",
      "t": "chief_of_staff",
      "score": 0.365,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "implementation_specialist",
      "t": "chief_of_staff",
      "score": 0.365,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_executive_communication",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "product_operations_manager",
      "t": "chief_of_staff",
      "score": 0.365,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "chief_of_staff",
      "score": 0.365,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_executive_communication",
        "bizops_process_automation",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "bizops_cross_functional_execution",
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_software_engineer",
      "t": "chief_of_staff",
      "score": 0.365,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "leadership",
        "technical_communication"
      ],
      "gaps": [
        "bizops_executive_operating_rhythm",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "talent_acquisition_manager",
      "t": "chief_of_staff",
      "score": 0.365,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "talent_acquisition_manager",
      "t": "vp_operations",
      "score": 0.365,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_process_automation",
        "leadership",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "ai_engineer_mid",
      "score": 0.362,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "ai_agent_development",
        "ai_product_thinking",
        "domain_expertise",
        "llm_api_integration",
        "prompt_engineering",
        "python_development"
      ],
      "gaps": [
        "backend_development",
        "ml_systems_thinking",
        "rag_systems",
        "vector_databases"
      ],
      "gap_n": 14
    },
    {
      "s": "program_manager",
      "t": "head_of_ai",
      "score": 0.362,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_team_leadership",
        "domain_expertise",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "ml_systems_thinking",
        "python_development"
      ],
      "gap_n": 14
    },
    {
      "s": "senior_consultant",
      "t": "head_of_ai",
      "score": 0.362,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_team_leadership",
        "domain_expertise",
        "people_management",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_strategy_roadmap",
        "ml_systems_thinking",
        "python_development"
      ],
      "gap_n": 14
    },
    {
      "s": "sre_engineer",
      "t": "mlops_engineer",
      "score": 0.362,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ci_cd",
        "cloud_platforms",
        "containerization",
        "linux_administration",
        "monitoring_observability",
        "performance_optimization",
        "scripting_automation"
      ],
      "gaps": [
        "ai_experiment_tracking",
        "mlops_pipelines",
        "model_deployment_serving",
        "model_monitoring_drift",
        "python_development"
      ],
      "gap_n": 13
    },
    {
      "s": "staff_engineer",
      "t": "head_of_ai",
      "score": 0.362,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_strategy_roadmap",
        "executive_leadership",
        "mentoring",
        "stakeholder_management",
        "strategic_thinking",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "ai_hiring_talent",
        "ai_team_leadership",
        "ml_systems_thinking",
        "people_management",
        "python_development"
      ],
      "gap_n": 13
    },
    {
      "s": "account_executive",
      "t": "sales_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "consultative_selling",
        "crm_management",
        "customer_communication",
        "negotiation",
        "pipeline_management"
      ],
      "gaps": [
        "coaching",
        "people_management",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "account_manager",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "business_ops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "bizops_process_automation",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "data_analysis",
        "excel_advanced_finance"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_transformation_lead",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "ai_transformation_lead",
      "t": "senior_engineering_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "engineering_leadership",
        "people_management",
        "system_architecture"
      ],
      "gap_n": 10
    },
    {
      "s": "analytics_engineer",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "associate_product_manager",
      "t": "business_intelligence_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "associate_product_manager",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "associate_product_manager",
      "t": "revops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 9
    },
    {
      "s": "associate_product_manager",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "bdr_bd_associate",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "business_analyst",
      "t": "product_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "user_behavior_analysis"
      ],
      "gap_n": 10
    },
    {
      "s": "business_analyst",
      "t": "senior_data_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "data_analysis",
        "python_data"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gap_n": 10
    },
    {
      "s": "business_development_manager",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "strategic_thinking"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "business_development_manager",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "business_development_manager",
      "t": "strategy_ops_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_cross_functional_execution",
        "data_analysis",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_business_case_development",
        "bizops_executive_communication"
      ],
      "gap_n": 12
    },
    {
      "s": "business_development_representative",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "business_development_representative",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "business_intelligence_analyst",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "business_ops_analyst",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "business_ops_manager",
      "t": "performance_marketing_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "campaign_analytics_attribution",
        "communication",
        "cross_team_collaboration"
      ],
      "gaps": [
        "media_planning_buying",
        "paid_search_advertising",
        "paid_social_advertising"
      ],
      "gap_n": 9
    },
    {
      "s": "channel_partner_manager",
      "t": "business_development_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "communication",
        "crm_management",
        "pipeline_management",
        "relationship_building"
      ],
      "gaps": [
        "commercial_negotiation",
        "market_research_bd",
        "outbound_prospecting"
      ],
      "gap_n": 11
    },
    {
      "s": "channel_partner_manager",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "channel_partner_manager",
      "t": "product_marketing_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "go_to_market_strategy",
        "sales_enablement"
      ],
      "gaps": [
        "copywriting",
        "market_research",
        "product_positioning"
      ],
      "gap_n": 9
    },
    {
      "s": "chief_of_staff",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "ciso_head_of_security",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "ciso_head_of_security",
      "t": "head_of_product",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "executive_leadership",
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "senior_data_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "data_analysis"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gap_n": 10
    },
    {
      "s": "compensation_benefits_specialist",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "consultant",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "consulting_manager",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "consulting_manager",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "customer_experience_manager",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "customer_experience_specialist",
      "t": "associate_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "organization",
        "problem_solving"
      ],
      "gaps": [
        "analytical_thinking",
        "technical_communication"
      ],
      "gap_n": 10
    },
    {
      "s": "customer_onboarding_specialist",
      "t": "project_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "communication",
        "customer_communication",
        "delivery_execution",
        "project_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "customer_success_associate",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "customer_success_manager",
      "t": "business_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 10
    },
    {
      "s": "customer_success_manager",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "customer_success_manager",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 9,
      "curated": true,
      "curated_note": "Customer success experience translates to product ops \u2014 understanding customer needs, process management, cross-team coordination."
    },
    {
      "s": "customer_support_representative",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "customer_support_specialist",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "cv_edge_ai_engineer",
      "t": "senior_software_engineer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "performance_optimization",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "backend_development",
        "distributed_systems"
      ],
      "gap_n": 11
    },
    {
      "s": "data_analyst",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "data_analyst",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "data_analyst",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "design_lead_design_manager",
      "t": "brand_marketing_designer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "adobe_creative_suite",
        "brand_identity_design",
        "marketing_campaign_design"
      ],
      "gap_n": 8
    },
    {
      "s": "director_customer_success",
      "t": "engineering_group_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "stakeholder_management"
      ],
      "gap_n": 11
    },
    {
      "s": "engineering_group_manager",
      "t": "program_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_team_collaboration",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 10
    },
    {
      "s": "engineering_group_manager",
      "t": "vp_operations",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_cross_functional_execution",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_executive_communication",
        "bizops_operational_scaling"
      ],
      "gap_n": 12
    },
    {
      "s": "facilities_manager",
      "t": "senior_engineering_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "engineering_leadership",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 11
    },
    {
      "s": "group_product_manager",
      "t": "engineering_group_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "engineering_leadership"
      ],
      "gap_n": 11
    },
    {
      "s": "group_product_manager",
      "t": "product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -2,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "roadmap_prioritization"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "prd_writing",
        "product_lifecycle_management",
        "product_metrics"
      ],
      "gap_n": 8
    },
    {
      "s": "growth_marketing_manager",
      "t": "product_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "product_metrics",
        "sql",
        "user_behavior_analysis"
      ],
      "gaps": [
        "ab_testing",
        "analytical_thinking",
        "data_analysis"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_admin_ga",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_ai",
      "t": "senior_software_engineer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "mentoring",
        "python_development",
        "system_design",
        "technical_leadership"
      ],
      "gaps": [
        "backend_development",
        "distributed_systems",
        "performance_optimization"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_bd_head_of_partnerships",
      "t": "vp_engineering",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_data",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "systems_thinking"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_design_vp_design",
      "t": "vp_engineering",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_hr_people",
      "t": "compensation_benefits_specialist",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "compensation_benefits",
        "hr_data_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "excel_advanced_finance"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_hr_people",
      "t": "vp_engineering",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "stakeholder_management"
      ],
      "gaps": [
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_it",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_it",
      "t": "head_of_product",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "executive_leadership",
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_marketing",
      "t": "product_marketing_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "go_to_market_strategy",
        "product_positioning"
      ],
      "gaps": [
        "copywriting",
        "market_research",
        "sales_enablement"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_marketing",
      "t": "vp_sales",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "commercial_mindset",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "executive_leadership",
        "sales_forecasting",
        "sales_team_leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_product",
      "t": "product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -3,
      "shared": [
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "go_to_market_product",
        "product_discovery",
        "roadmap_prioritization"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "prd_writing",
        "product_lifecycle_management",
        "product_metrics"
      ],
      "gap_n": 8
    },
    {
      "s": "head_of_product",
      "t": "vp_engineering",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "stakeholder_management"
      ],
      "gaps": [
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_product",
      "t": "vp_marketing",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "brand_management",
        "demand_generation",
        "go_to_market_strategy"
      ],
      "gap_n": 10
    },
    {
      "s": "head_of_revops",
      "t": "staff_engineer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 10
    },
    {
      "s": "hr_operations_manager",
      "t": "senior_data_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "bi_tools",
        "cross_functional_collaboration",
        "data_analysis"
      ],
      "gaps": [
        "data_storytelling",
        "sql_advanced",
        "statistical_analysis"
      ],
      "gap_n": 10
    },
    {
      "s": "hr_operations_manager",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "implementation_manager",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "implementation_manager",
      "t": "customer_success_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "product_adoption",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_relationship_management",
        "customer_retention"
      ],
      "gap_n": 9
    },
    {
      "s": "implementation_manager",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "implementation_specialist",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "delivery_execution",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "product_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "it_manager",
      "t": "senior_engineering_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "engineering_leadership",
        "people_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_team_collaboration",
        "system_architecture"
      ],
      "gap_n": 11
    },
    {
      "s": "junior_consultant_analyst",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "ld_specialist",
      "t": "head_of_hr_people",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "hr_data_analytics",
        "learning_development",
        "organizational_development",
        "stakeholder_management"
      ],
      "gaps": [
        "hr_business_partnering",
        "people_management",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 9
    },
    {
      "s": "ld_specialist",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "business_intelligence_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "marketing_manager",
      "t": "product_marketing_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "cross_functional_collaboration",
        "product_positioning"
      ],
      "gaps": [
        "copywriting",
        "go_to_market_strategy",
        "market_research",
        "sales_enablement"
      ],
      "gap_n": 8
    },
    {
      "s": "marketing_manager",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "content_strategy",
        "cross_functional_collaboration",
        "marketing_analytics"
      ],
      "gaps": [
        "analytical_thinking",
        "data_analysis",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "mlops_engineer",
      "t": "tech_lead",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ci_cd",
        "cloud_platforms",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "backend_development",
        "code_review_practices",
        "technical_leadership"
      ],
      "gap_n": 10
    },
    {
      "s": "operations_coordinator",
      "t": "business_ops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "attention_to_detail",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "process_improvement"
      ],
      "gap_n": 10
    },
    {
      "s": "partnerships_manager",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "performance_marketing_manager",
      "t": "business_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "data_analysis",
        "revops_commercial_analytics",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "excel_advanced_finance"
      ],
      "gap_n": 10
    },
    {
      "s": "principal_director_consulting",
      "t": "business_ops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "excel_advanced_finance",
        "project_management",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "data_analysis",
        "process_improvement"
      ],
      "gap_n": 9
    },
    {
      "s": "principal_director_consulting",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "principal_director_consulting",
      "t": "head_of_product",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "executive_leadership",
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "procurement_specialist",
      "t": "business_ops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "attention_to_detail",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "process_improvement"
      ],
      "gap_n": 10
    },
    {
      "s": "product_analyst",
      "t": "business_intelligence_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "product_analyst",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "product_designer_ux_ui",
      "t": "brand_marketing_designer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "adobe_creative_suite",
        "brand_identity_design",
        "marketing_campaign_design"
      ],
      "gap_n": 8
    },
    {
      "s": "product_manager",
      "t": "business_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 10
    },
    {
      "s": "product_manager",
      "t": "business_intelligence_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "product_manager",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "product_manager",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "product_operations_manager",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "program_manager",
      "t": "business_ops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "bizops_process_automation",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "attention_to_detail",
        "data_analysis",
        "excel_advanced_finance"
      ],
      "gap_n": 9
    },
    {
      "s": "program_manager",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "project_manager",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "prompt_engineer",
      "t": "business_ops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "attention_to_detail",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "process_improvement"
      ],
      "gap_n": 10
    },
    {
      "s": "qa_engineer",
      "t": "business_ops_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "attention_to_detail",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "excel_advanced_finance",
        "process_improvement"
      ],
      "gap_n": 10
    },
    {
      "s": "qa_engineer",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "revops_analyst",
      "t": "product_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "ab_testing",
        "product_metrics",
        "user_behavior_analysis"
      ],
      "gap_n": 10
    },
    {
      "s": "sales_development_representative",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "sales_director",
      "t": "engineering_group_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "engineering_leadership"
      ],
      "gap_n": 11
    },
    {
      "s": "sales_manager",
      "t": "project_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "process_improvement"
      ],
      "gaps": [
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "security_analyst_soc",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_bd_manager_strategic_partnerships",
      "t": "vp_engineering",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_consultant",
      "t": "group_product_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "people_management",
        "pm_team_leadership",
        "stakeholder_management"
      ],
      "gaps": [
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_consultant",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "process_improvement"
      ],
      "gaps": [
        "crm_management",
        "revenue_operations"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_customer_success_manager",
      "t": "business_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "dashboarding",
        "data_analysis",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "excel_advanced_finance",
        "technical_communication"
      ],
      "gap_n": 10
    },
    {
      "s": "senior_customer_success_manager",
      "t": "business_intelligence_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_customer_success_manager",
      "t": "consultant",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "client_engagement_delivery",
        "consulting_frameworks",
        "executive_presentation"
      ],
      "gap_n": 12
    },
    {
      "s": "senior_customer_success_manager",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_customer_success_manager",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_data_analyst",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_data_analyst",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_data_analyst",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_fpa_analyst",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "process_improvement",
        "product_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "senior_product_designer",
      "t": "brand_marketing_designer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_design_tools",
        "conversion_optimization_design",
        "cross_functional_design_collaboration",
        "design_stakeholder_communication",
        "design_system_management",
        "figma_mastery",
        "ui_visual_design"
      ],
      "gaps": [
        "adobe_creative_suite",
        "brand_identity_design",
        "marketing_campaign_design"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_software_engineer",
      "t": "senior_engineering_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "distributed_systems",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership",
        "people_management",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "seo_manager",
      "t": "business_intelligence_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "seo_manager",
      "t": "product_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "process_improvement",
        "product_operations",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineer",
      "t": "channel_partner_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "channel_partner_management",
        "negotiation",
        "pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineer_junior",
      "t": "business_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "data_analysis",
        "revops_crm_administration",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "dashboarding",
        "excel_advanced_finance",
        "revops_commercial_analytics"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineer_junior",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineering_manager",
      "t": "engineering_group_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "engineering_leadership",
        "organizational_design",
        "people_management"
      ],
      "gap_n": 10
    },
    {
      "s": "solutions_engineering_manager",
      "t": "senior_engineering_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "engineering_leadership",
        "people_management",
        "system_architecture"
      ],
      "gap_n": 10
    },
    {
      "s": "sre_engineer",
      "t": "staff_engineer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "backend_development",
        "cloud_platforms",
        "distributed_systems",
        "performance_optimization"
      ],
      "gaps": [
        "mentoring",
        "strategic_thinking",
        "system_architecture",
        "technical_leadership"
      ],
      "gap_n": 9
    },
    {
      "s": "strategy_ops_manager",
      "t": "business_intelligence_analyst",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "dashboarding",
        "data_analysis"
      ],
      "gaps": [
        "bi_tools",
        "data_modeling",
        "sql_advanced"
      ],
      "gap_n": 9
    },
    {
      "s": "tech_lead",
      "t": "senior_engineering_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cloud_platforms",
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "system_architecture"
      ],
      "gaps": [
        "engineering_leadership",
        "people_management",
        "strategic_thinking"
      ],
      "gap_n": 10
    },
    {
      "s": "technical_account_manager",
      "t": "project_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "communication",
        "cross_functional_collaboration",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 10
    },
    {
      "s": "technical_product_manager",
      "t": "sales_operations_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "crm_management",
        "process_improvement",
        "revenue_operations"
      ],
      "gap_n": 9
    },
    {
      "s": "technical_project_manager",
      "t": "seo_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "data_analysis",
        "technical_communication"
      ],
      "gaps": [
        "content_strategy",
        "marketing_analytics",
        "seo_management"
      ],
      "gap_n": 9
    },
    {
      "s": "technical_support_engineer",
      "t": "strategy_ops_manager",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "data_analysis"
      ],
      "gaps": [
        "bizops_business_case_development",
        "strategic_thinking"
      ],
      "gap_n": 12
    },
    {
      "s": "vp_business_development",
      "t": "vp_engineering",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_finance_cfo",
      "t": "vp_engineering",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "stakeholder_management"
      ],
      "gaps": [
        "strategic_thinking",
        "system_architecture",
        "talent_strategy"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_finance_cfo",
      "t": "vp_marketing",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "organizational_design",
        "people_management"
      ],
      "gaps": [
        "brand_management",
        "demand_generation",
        "go_to_market_strategy"
      ],
      "gap_n": 10
    },
    {
      "s": "vp_operations",
      "t": "staff_engineer",
      "score": 0.36,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 10
    },
    {
      "s": "grc_analyst",
      "t": "head_of_it",
      "score": 0.358,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "cloud_security_posture",
        "grc_frameworks",
        "it_security_compliance",
        "stakeholder_management",
        "strategic_thinking",
        "vendor_third_party_risk"
      ],
      "gaps": [
        "identity_access_management",
        "it_infrastructure_networking",
        "it_operations_leadership",
        "security_program_leadership"
      ],
      "gap_n": 8
    },
    {
      "s": "customer_experience_manager",
      "t": "consulting_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "executive_presentation",
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 14
    },
    {
      "s": "lifecycle_marketing_manager",
      "t": "revops_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "product_analyst",
      "t": "revops_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "project_manager",
      "t": "consulting_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "client_advisory",
        "client_engagement_delivery",
        "process_improvement",
        "stakeholder_management"
      ],
      "gaps": [
        "executive_presentation",
        "leadership",
        "proposal_development",
        "strategic_thinking"
      ],
      "gap_n": 14
    },
    {
      "s": "senior_customer_success_manager",
      "t": "business_ops_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "stakeholder_management"
      ],
      "gaps": [
        "bizops_okr_framework",
        "process_improvement",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "seo_manager",
      "t": "revops_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_commercial_analytics",
        "sql"
      ],
      "gaps": [
        "revops_crm_administration",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineer",
      "t": "revops_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "revops_crm_administration",
        "sql",
        "stakeholder_management"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "solutions_engineer_junior",
      "t": "revops_manager",
      "score": 0.357,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "data_analysis",
        "revops_crm_administration",
        "sql"
      ],
      "gaps": [
        "revops_commercial_analytics",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 9
    },
    {
      "s": "chief_of_staff",
      "t": "ai_transformation_lead",
      "score": 0.355,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "consulting_methodology",
        "cross_team_collaboration",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "change_management",
        "llm_api_integration",
        "no_code_ai_automation",
        "prompt_engineering"
      ],
      "gap_n": 11
    },
    {
      "s": "program_manager",
      "t": "ai_transformation_lead",
      "score": 0.355,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "cross_team_collaboration",
        "domain_expertise",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "change_management",
        "llm_api_integration",
        "no_code_ai_automation",
        "prompt_engineering"
      ],
      "gap_n": 11
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "ai_transformation_lead",
      "score": 0.354,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "ai_agent_development",
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "llm_api_integration",
        "prompt_engineering"
      ],
      "gaps": [
        "ai_product_thinking",
        "ai_transformation_change_mgmt",
        "change_management",
        "no_code_ai_automation",
        "stakeholder_management"
      ],
      "gap_n": 12
    },
    {
      "s": "vp_engineering",
      "t": "head_of_solutions_engineering",
      "score": 0.354,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_strategy",
        "domain_expertise",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "delivery_methodology",
        "se_team_leadership",
        "technical_sales_acumen"
      ],
      "gap_n": 15
    },
    {
      "s": "fpa_analyst",
      "t": "controller",
      "score": 0.353,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "budget_forecasting",
        "bva_analysis",
        "erp_systems_finance",
        "excel_advanced_finance",
        "financial_modeling"
      ],
      "gaps": [
        "audit_management",
        "cpa_accounting",
        "financial_reporting",
        "gaap_ifrs"
      ],
      "gap_n": 9
    },
    {
      "s": "fpa_analyst",
      "t": "finance_manager",
      "score": 0.353,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "budget_forecasting",
        "erp_systems_finance",
        "finance_business_partnering",
        "financial_modeling",
        "saas_finance_metrics"
      ],
      "gaps": [
        "cpa_accounting",
        "financial_reporting",
        "gaap_ifrs",
        "people_management"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_customer_success",
      "t": "head_of_product",
      "score": 0.353,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -1,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "pm_team_leadership"
      ],
      "gaps": [
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_finance_cfo",
      "t": "head_of_product",
      "score": 0.353,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "cross_functional_exec_presence",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "pm_team_leadership",
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_sales",
      "t": "enterprise_account_executive",
      "score": 0.353,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -3,
      "shared": [
        "business_understanding",
        "commercial_mindset",
        "enterprise_sales",
        "executive_relationships",
        "sales_forecasting"
      ],
      "gaps": [
        "consultative_selling",
        "deal_closing",
        "negotiation",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_solutions_engineering",
      "t": "solutions_engineer",
      "score": 0.351,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": -3,
      "shared": [
        "ai_tool_fluency",
        "competitive_positioning",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "relationship_building",
        "solution_design_architecture",
        "stakeholder_management",
        "technical_content_creation",
        "technical_sales_acumen"
      ],
      "gaps": [
        "api_design",
        "communication",
        "poc_management",
        "product_demonstration",
        "technical_discovery"
      ],
      "gap_n": 12
    },
    {
      "s": "account_executive",
      "t": "customer_onboarding_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "crm_management",
        "customer_communication",
        "product_knowledge"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 6
    },
    {
      "s": "account_manager",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "account_manager",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "crm_management",
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption",
        "relationship_building"
      ],
      "gap_n": 5
    },
    {
      "s": "account_manager",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "ai_engineer_mid",
      "t": "mlops_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 1,
      "shared": [
        "ai_cost_optimization",
        "cloud_platforms",
        "databases",
        "ml_systems_thinking",
        "model_deployment_serving",
        "python_development",
        "system_design"
      ],
      "gaps": [
        "ai_experiment_tracking",
        "ci_cd",
        "containerization",
        "mlops_pipelines",
        "model_monitoring_drift"
      ],
      "gap_n": 13
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management",
        "data_analysis"
      ],
      "gap_n": 6
    },
    {
      "s": "ai_solutions_engineering_manager",
      "t": "tech_lead",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_team_collaboration",
        "hiring_talent_acquisition",
        "mentoring",
        "python_development",
        "technical_leadership"
      ],
      "gaps": [
        "backend_development",
        "code_review_practices",
        "system_design"
      ],
      "gap_n": 9
    },
    {
      "s": "ai_transformation_lead",
      "t": "executive_assistant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "ai_transformation_lead",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "associate_product_manager",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "organization",
        "problem_solving"
      ],
      "gaps": [
        "customer_communication",
        "customer_support_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "associate_product_manager",
      "t": "head_of_revops",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 4,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "leadership",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 12
    },
    {
      "s": "associate_product_manager",
      "t": "technical_support_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "bdr_bd_associate",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "business_analyst",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "problem_solving"
      ],
      "gaps": [
        "customer_communication",
        "customer_support_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "business_development_manager",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "business_development_representative",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "business_development_representative",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption",
        "relationship_building"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_analyst",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "problem_solving"
      ],
      "gaps": [
        "customer_communication",
        "customer_support_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_analyst",
      "t": "operations_coordinator",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "administrative_operations",
        "office_operations"
      ],
      "gap_n": 5
    },
    {
      "s": "business_ops_manager",
      "t": "customer_experience_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_functional_collaboration",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "customer_communication",
        "customer_orientation",
        "customer_support_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "business_ops_manager",
      "t": "technical_support_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "channel_partner_manager",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "chief_of_staff",
      "t": "executive_assistant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "ciso_head_of_security",
      "t": "staff_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "consultant",
      "t": "executive_assistant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "consultant",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "consulting_manager",
      "t": "staff_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_strategy",
        "cross_team_collaboration",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "content_marketing_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "delivery_execution",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_manager",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "customer_health_monitoring",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption",
        "relationship_building"
      ],
      "gap_n": 5
    },
    {
      "s": "customer_experience_specialist",
      "t": "customer_onboarding_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_orientation",
        "organization"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption",
        "product_knowledge"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_specialist",
      "t": "support_team_lead",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "cross_functional_collaboration",
        "customer_support_operations",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "coaching",
        "incident_management",
        "people_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_experience_specialist",
      "t": "technical_support_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "debugging",
        "technical_troubleshooting"
      ],
      "gap_n": 7
    },
    {
      "s": "customer_onboarding_specialist",
      "t": "customer_experience_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "customer_orientation",
        "organization"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_success_associate",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "customer_success_manager",
      "t": "customer_onboarding_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "onboarding_strategy",
        "product_adoption"
      ],
      "gaps": [
        "onboarding_training",
        "product_knowledge"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_success_team_lead",
      "t": "director_customer_success",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "customer_success_metrics",
        "expansion_strategy",
        "leadership"
      ],
      "gaps": [
        "cross_functional_alignment",
        "customer_success_strategy",
        "operational_management"
      ],
      "gap_n": 6
    },
    {
      "s": "customer_support_specialist",
      "t": "senior_support_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "technical_documentation",
        "technical_troubleshooting"
      ],
      "gaps": [
        "advanced_debugging",
        "incident_management",
        "technical_leadership"
      ],
      "gap_n": 6
    },
    {
      "s": "enterprise_account_executive",
      "t": "account_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "negotiation",
        "stakeholder_management"
      ],
      "gaps": [
        "account_management",
        "customer_relationship_management",
        "upselling_cross_selling"
      ],
      "gap_n": 6
    },
    {
      "s": "executive_assistant",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "administrative_operations",
        "ai_tool_fluency",
        "attention_to_detail",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "analytical_thinking",
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 5
    },
    {
      "s": "executive_assistant",
      "t": "project_manager_customer_delivery",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "grc_analyst",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "grc_analyst",
      "t": "executive_assistant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "grc_analyst",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "head_of_admin_ga",
      "t": "operations_coordinator",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "ai_tool_fluency",
        "office_operations",
        "vendor_procurement_management"
      ],
      "gaps": [
        "administrative_operations",
        "communication"
      ],
      "gap_n": 5
    },
    {
      "s": "head_of_data",
      "t": "director_customer_success_operations",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_alignment",
        "data_analysis",
        "systems_thinking"
      ],
      "gaps": [
        "process_design",
        "salesforce"
      ],
      "gap_n": 7
    },
    {
      "s": "head_of_design_vp_design",
      "t": "principal_director_consulting",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "executive_leadership",
        "hiring_talent_acquisition",
        "leadership",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 14
    },
    {
      "s": "head_of_hr_people",
      "t": "senior_engineering_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "strategic_thinking",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_it",
      "t": "principal_director_consulting",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "executive_leadership",
        "leadership",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "client_advisory",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 14
    },
    {
      "s": "head_of_it",
      "t": "staff_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "executive_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "distributed_systems",
        "mentoring",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_product",
      "t": "senior_engineering_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "strategic_thinking",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "head_of_revops",
      "t": "engineering_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "people_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "performance_management"
      ],
      "gap_n": 9
    },
    {
      "s": "implementation_manager",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "product_adoption",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "relationship_building"
      ],
      "gap_n": 6
    },
    {
      "s": "implementation_manager",
      "t": "senior_consultant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "consulting_frameworks",
        "executive_presentation",
        "proposal_development"
      ],
      "gap_n": 14
    },
    {
      "s": "implementation_specialist",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "process_improvement",
        "project_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management",
        "data_analysis"
      ],
      "gap_n": 6
    },
    {
      "s": "junior_ai_ml_engineer",
      "t": "cv_edge_ai_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "debugging",
        "deep_learning",
        "machine_learning_fundamentals",
        "python_development"
      ],
      "gaps": [
        "computer_vision",
        "edge_ai_deployment",
        "ml_systems_thinking",
        "performance_optimization"
      ],
      "gap_n": 13
    },
    {
      "s": "marketing_manager",
      "t": "implementation_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "delivery_execution",
        "project_management"
      ],
      "gaps": [
        "implementation_management",
        "stakeholder_management"
      ],
      "gap_n": 7
    },
    {
      "s": "partnerships_manager",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "principal_director_consulting",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -4,
      "shared": [
        "customer_communication",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 6
    },
    {
      "s": "principal_director_consulting",
      "t": "technical_project_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "domain_expertise",
        "project_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "risk_management",
        "technical_project_delivery"
      ],
      "gap_n": 9
    },
    {
      "s": "procurement_specialist",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "program_manager",
      "t": "customer_experience_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "process_improvement"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "program_manager",
      "t": "executive_assistant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager",
      "t": "customer_support_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "problem_solving"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations"
      ],
      "gap_n": 6
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "crm_management",
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption",
        "relationship_building"
      ],
      "gap_n": 5
    },
    {
      "s": "project_manager_customer_delivery",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "prompt_engineer",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "qa_engineer",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "attention_to_detail",
        "communication"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "revops_manager",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "crm_management",
        "data_analysis",
        "onboarding_training",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "product_adoption",
        "relationship_building"
      ],
      "gap_n": 5
    },
    {
      "s": "sales_director",
      "t": "account_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "negotiation",
        "stakeholder_management"
      ],
      "gaps": [
        "account_management",
        "customer_relationship_management",
        "upselling_cross_selling"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_manager",
      "t": "account_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "commercial_mindset",
        "crm_management",
        "customer_communication",
        "negotiation"
      ],
      "gaps": [
        "account_management",
        "customer_relationship_management",
        "upselling_cross_selling"
      ],
      "gap_n": 6
    },
    {
      "s": "sales_manager",
      "t": "customer_experience_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "process_improvement"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_account_executive",
      "t": "project_manager_customer_delivery",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "crm_management",
        "customer_communication",
        "stakeholder_management"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_consultant",
      "t": "executive_assistant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "senior_consultant",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_product_manager",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "cross_functional_collaboration",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_communication",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_solutions_engineer",
      "t": "customer_success_associate",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "customer_communication",
        "relationship_building",
        "stakeholder_management"
      ],
      "gaps": [
        "onboarding_training",
        "product_adoption"
      ],
      "gap_n": 6
    },
    {
      "s": "senior_solutions_engineer",
      "t": "program_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "customer_communication",
        "domain_expertise",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "leadership",
        "program_management",
        "project_management"
      ],
      "gap_n": 8
    },
    {
      "s": "senior_solutions_engineer",
      "t": "project_manager_customer_delivery",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "senior_support_engineer",
      "t": "customer_support_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "analytical_thinking",
        "customer_communication",
        "technical_documentation",
        "technical_troubleshooting"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "seo_manager",
      "t": "head_of_revops",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 3,
      "shared": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "revops_commercial_analytics"
      ],
      "gaps": [
        "leadership",
        "revops_gtm_process_design",
        "revops_pipeline_management"
      ],
      "gap_n": 12
    },
    {
      "s": "seo_manager",
      "t": "technical_support_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "technical_communication",
        "technical_troubleshooting"
      ],
      "gaps": [
        "customer_communication",
        "debugging",
        "problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "solutions_engineer",
      "t": "principal_director_consulting",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 3,
      "shared": [
        "client_advisory",
        "client_engagement_delivery",
        "consulting_frameworks",
        "proposal_development",
        "stakeholder_management"
      ],
      "gaps": [
        "executive_leadership",
        "executive_presentation",
        "leadership",
        "strategic_thinking"
      ],
      "gap_n": 13
    },
    {
      "s": "solutions_engineer_junior",
      "t": "customer_support_representative",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 5
    },
    {
      "s": "solutions_engineering_manager",
      "t": "customer_experience_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "customer_communication",
        "data_analysis",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "customer_journey_management"
      ],
      "gap_n": 7
    },
    {
      "s": "solutions_engineering_manager",
      "t": "executive_assistant",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "communication",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "executive_support",
        "travel_logistics_coordination"
      ],
      "gap_n": 5
    },
    {
      "s": "solutions_engineering_manager",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "support_team_lead",
      "t": "customer_support_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "customer_support_operations",
        "problem_solving",
        "technical_documentation"
      ],
      "gaps": [
        "customer_communication",
        "customer_orientation"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_account_manager",
      "t": "implementation_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "api_integrations",
        "implementation_management",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "project_management",
        "requirements_gathering"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_account_manager",
      "t": "technical_support_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "api_integrations",
        "cross_functional_collaboration",
        "technical_communication",
        "technical_troubleshooting"
      ],
      "gaps": [
        "customer_communication",
        "debugging",
        "problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_product_manager",
      "t": "project_manager_customer_delivery",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "delivery_execution",
        "project_management",
        "technical_communication"
      ],
      "gaps": [
        "customer_communication",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_product_manager",
      "t": "senior_product_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "high",
      "sen_gap": 0,
      "shared": [
        "ai_product_management",
        "analytical_thinking",
        "cross_functional_collaboration",
        "prd_writing",
        "product_metrics"
      ],
      "gaps": [
        "product_discovery",
        "product_strategy",
        "roadmap_prioritization",
        "stakeholder_management"
      ],
      "gap_n": 10
    },
    {
      "s": "technical_project_manager",
      "t": "customer_experience_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "process_improvement"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_project_manager",
      "t": "head_of_revops",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "ai_tool_fluency",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_process_automation",
        "revops_gtm_process_design"
      ],
      "gaps": [
        "leadership",
        "revops_commercial_analytics",
        "revops_pipeline_management"
      ],
      "gap_n": 11
    },
    {
      "s": "technical_project_manager",
      "t": "procurement_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "ai_tool_fluency",
        "analytical_thinking",
        "communication",
        "stakeholder_management"
      ],
      "gaps": [
        "budget_cost_management",
        "contract_negotiation",
        "vendor_procurement_management"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_project_manager",
      "t": "technical_support_engineer",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_communication",
        "technical_communication"
      ],
      "gaps": [
        "debugging",
        "problem_solving",
        "technical_troubleshooting"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_support_engineer",
      "t": "implementation_specialist",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "api_integrations",
        "customer_communication",
        "problem_solving",
        "technical_communication"
      ],
      "gaps": [
        "implementation_management",
        "project_management",
        "requirements_gathering"
      ],
      "gap_n": 6
    },
    {
      "s": "technical_support_engineer",
      "t": "technical_project_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_communication",
        "technical_communication",
        "technical_project_delivery"
      ],
      "gaps": [
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_ai_chief_ai_officer",
      "t": "project_manager_customer_delivery",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "customer_communication",
        "stakeholder_management",
        "technical_communication"
      ],
      "gaps": [
        "project_management",
        "risk_management"
      ],
      "gap_n": 7
    },
    {
      "s": "vp_engineering",
      "t": "program_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -3,
      "shared": [
        "domain_expertise",
        "leadership",
        "process_improvement",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "program_management",
        "project_management"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_finance_cfo",
      "t": "senior_engineering_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "engineering_leadership",
        "executive_leadership",
        "organizational_design",
        "people_management",
        "stakeholder_management"
      ],
      "gaps": [
        "cross_team_collaboration",
        "strategic_thinking",
        "system_architecture"
      ],
      "gap_n": 9
    },
    {
      "s": "vp_operations",
      "t": "engineering_manager",
      "score": 0.35,
      "type": "pivot",
      "gap_d": "medium",
      "sen_gap": -2,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "people_management",
        "strategic_thinking",
        "technical_leadership"
      ],
      "gaps": [
        "agile_methodology",
        "hiring_talent_acquisition",
        "performance_management"
      ],
      "gap_n": 9
    },
    {
      "s": "junior_consultant_analyst",
      "t": "fpa_analyst",
      "score": 0.333,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "data_analysis",
        "excel_advanced_finance",
        "saas_finance_metrics"
      ],
      "gaps": [
        "budget_forecasting",
        "bva_analysis",
        "financial_modeling"
      ],
      "gap_n": 9,
      "curated": true,
      "curated_note": "Common exit from Big 4 risk/audit consulting into corporate FP&A, especially with CPA background."
    },
    {
      "s": "sales_development_representative",
      "t": "account_executive",
      "score": 0.333,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "crm_management",
        "customer_communication",
        "objection_handling",
        "outbound_prospecting",
        "product_knowledge",
        "sales_tools_proficiency"
      ],
      "gaps": [
        "consultative_selling",
        "deal_closing",
        "discovery_calls",
        "pipeline_management",
        "quota_attainment"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "SDR\u2192AE is the standard sales career progression."
    },
    {
      "s": "marketing_coordinator",
      "t": "customer_experience_specialist",
      "score": 0.2,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication",
        "organization"
      ],
      "gaps": [
        "customer_orientation",
        "customer_support_operations",
        "problem_solving"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Marketing coordinators with communication and organizational skills move into CX."
    },
    {
      "s": "customer_success_manager",
      "t": "associate_product_manager",
      "score": 0.153,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "analytical_thinking",
        "data_analysis"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "organization",
        "problem_solving",
        "technical_communication"
      ],
      "gap_n": 11,
      "curated": true,
      "curated_note": "CSM\u2192PM is a known path when strong product-adjacent signals exist (customer insight, cross-functional work, ownership)."
    },
    {
      "s": "implementation_specialist",
      "t": "solutions_engineer_junior",
      "score": 0.15,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "communication",
        "technical_discovery"
      ],
      "gaps": [
        "api_design",
        "customer_technical_relationship",
        "debugging",
        "sql",
        "technical_onboarding_implementation"
      ],
      "gap_n": 14,
      "curated": true,
      "curated_note": "Implementation experience gives strong technical + customer-facing foundation for SE roles."
    },
    {
      "s": "account_executive",
      "t": "customer_success_manager",
      "score": 0.12,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "customer_communication"
      ],
      "gaps": [
        "customer_relationship_management",
        "customer_retention",
        "product_adoption",
        "stakeholder_management"
      ],
      "gap_n": 11,
      "curated": true,
      "curated_note": "AEs with relationship management skills move into CSM roles, especially in mid-market."
    },
    {
      "s": "consultant",
      "t": "product_manager",
      "score": 0.06,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "data_analysis"
      ],
      "gaps": [
        "cross_functional_collaboration",
        "prd_writing",
        "product_discovery",
        "product_lifecycle_management",
        "product_metrics",
        "roadmap_prioritization"
      ],
      "gap_n": 13,
      "curated": true,
      "curated_note": "Common exit path from consulting to product, especially with analytical and stakeholder management background."
    },
    {
      "s": "hr_generalist",
      "t": "operations_coordinator",
      "score": 0.05,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking"
      ],
      "gaps": [
        "administrative_operations",
        "communication",
        "office_operations"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "HR generalists with organizational and process skills can move into general operations."
    },
    {
      "s": "customer_success_manager",
      "t": "product_manager",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 0,
      "shared": [
        "data_analysis"
      ],
      "gaps": [
        "agile_scrum",
        "ai_product_management",
        "b2b_product_management",
        "competitive_analysis_product",
        "cross_functional_collaboration",
        "customer_discovery_interviews",
        "go_to_market_product",
        "prd_writing",
        "product_discovery",
        "product_lifecycle_management",
        "product_metrics",
        "roadmap_prioritization",
        "ux_product_design_sense"
      ],
      "gap_n": 13,
      "curated": true,
      "curated_note": "One of the most common career pivots in tech. CSMs bring customer empathy, product knowledge, and stakeholder management. Gap: technical product skills, roadmapping, prioritization frameworks."
    },
    {
      "s": "sales_development_representative",
      "t": "account_manager",
      "score": 0.65,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "crm_management",
        "customer_communication"
      ],
      "gaps": [
        "account_management",
        "commercial_mindset",
        "customer_relationship_management",
        "data_analysis",
        "negotiation",
        "renewal_management",
        "stakeholder_management",
        "upselling_cross_selling"
      ],
      "gap_n": 8,
      "curated": true,
      "curated_note": "Standard sales career progression. SDRs already have prospecting, pipeline, CRM, and customer communication skills."
    },
    {
      "s": "marketing_coordinator",
      "t": "growth_marketing_manager",
      "score": 0.6,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [],
      "gaps": [
        "ai_tool_fluency",
        "analytical_thinking",
        "campaign_analytics_attribution",
        "communication",
        "conversion_rate_optimization",
        "creative_strategy_performance",
        "cross_team_collaboration",
        "engagement_personalization_tools",
        "funnel_optimization",
        "marketing_experimentation",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gap_n": 12,
      "curated": true,
      "curated_note": "Standard marketing progression. Coordinators already execute campaigns; growth managers own strategy and metrics."
    },
    {
      "s": "sales_development_representative",
      "t": "customer_success_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "customer_communication"
      ],
      "gaps": [
        "customer_advocacy",
        "customer_health_monitoring",
        "customer_relationship_management",
        "customer_retention",
        "data_analysis",
        "onboarding_strategy",
        "product_adoption",
        "renewal_management",
        "sales_collaboration",
        "stakeholder_management",
        "value_realization"
      ],
      "gap_n": 11,
      "curated": true,
      "curated_note": "Very common pivot from sales to CS. SDRs bring communication, CRM, and customer-facing skills. Gap: relationship management depth, retention strategy, product knowledge."
    },
    {
      "s": "customer_success_specialist",
      "t": "customer_success_manager",
      "score": 0.8,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "customer_communication",
        "customer_relationship_management",
        "customer_retention",
        "data_analysis",
        "onboarding_strategy",
        "product_adoption",
        "stakeholder_management"
      ],
      "gaps": [
        "customer_advocacy",
        "customer_health_monitoring",
        "renewal_management",
        "sales_collaboration",
        "value_realization"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "Direct career progression \u2014 same track, next seniority level."
    },
    {
      "s": "marketing_assistant",
      "t": "marketing_coordinator",
      "score": 0.8,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "canva_design_tools",
        "content_strategy",
        "copywriting",
        "event_marketing",
        "marketing_analytics",
        "organization",
        "social_media_management"
      ],
      "gaps": [
        "b2b_marketing",
        "community_management",
        "customer_communication",
        "influencer_marketing"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Direct progression."
    },
    {
      "s": "marketing_intern",
      "t": "marketing_assistant",
      "score": 0.8,
      "type": "natural",
      "gap_d": "small",
      "sen_gap": 0,
      "shared": [
        "canva_design_tools",
        "content_strategy",
        "copywriting",
        "marketing_analytics",
        "organization",
        "social_media_management"
      ],
      "gaps": [
        "ai_tools_marketing",
        "event_marketing"
      ],
      "gap_n": 2,
      "curated": true,
      "curated_note": "Direct progression from intern."
    },
    {
      "s": "hr_assistant",
      "t": "hr_coordinator",
      "score": 0.8,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "attention_to_detail",
        "cross_functional_collaboration",
        "customer_communication",
        "employee_lifecycle_management",
        "hris_management",
        "organization"
      ],
      "gaps": [
        "employee_experience",
        "hr_data_analytics",
        "problem_solving",
        "talent_acquisition_recruiting"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Direct progression."
    },
    {
      "s": "hr_coordinator",
      "t": "hr_generalist",
      "score": 0.7,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "cross_functional_collaboration",
        "employee_experience",
        "employee_lifecycle_management",
        "hr_data_analytics",
        "hris_management",
        "organization",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "analytical_thinking",
        "employer_branding",
        "israeli_labor_law",
        "learning_development",
        "performance_management"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "Common HR career path."
    },
    {
      "s": "hr_coordinator",
      "t": "talent_acquisition_specialist",
      "score": 0.65,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "cross_functional_collaboration",
        "customer_communication",
        "hr_data_analytics",
        "organization",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "ai_tools_marketing",
        "analytical_thinking",
        "employer_branding",
        "process_improvement",
        "stakeholder_management"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "Lateral into recruiting track."
    },
    {
      "s": "recruitment_coordinator",
      "t": "talent_acquisition_specialist",
      "score": 0.75,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "customer_communication",
        "hr_data_analytics",
        "organization",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "ai_tools_marketing",
        "employer_branding",
        "process_improvement",
        "stakeholder_management"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Direct progression in recruiting."
    },
    {
      "s": "sales_associate",
      "t": "sales_representative",
      "score": 0.75,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "crm_management",
        "customer_communication",
        "outbound_prospecting",
        "sales_tools_proficiency"
      ],
      "gaps": [
        "consultative_selling",
        "deal_closing",
        "discovery_calls",
        "objection_handling",
        "pipeline_management",
        "product_knowledge"
      ],
      "gap_n": 6,
      "curated": true,
      "curated_note": "Direct sales progression."
    },
    {
      "s": "sales_representative",
      "t": "account_executive",
      "score": 0.75,
      "type": "natural",
      "gap_d": "small",
      "sen_gap": 1,
      "shared": [
        "consultative_selling",
        "crm_management",
        "customer_communication",
        "deal_closing",
        "discovery_calls",
        "objection_handling",
        "outbound_prospecting",
        "pipeline_management",
        "product_knowledge",
        "sales_tools_proficiency"
      ],
      "gaps": [
        "negotiation",
        "quota_attainment",
        "saas_sales"
      ],
      "gap_n": 3,
      "curated": true,
      "curated_note": "Standard sales progression."
    },
    {
      "s": "operations_associate",
      "t": "operations_analyst",
      "score": 0.75,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "attention_to_detail",
        "data_analysis",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "analytical_thinking",
        "bizops_process_automation",
        "dashboarding",
        "excel_advanced_finance",
        "requirements_gathering",
        "revops_crm_administration",
        "sql"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Direct progression."
    },
    {
      "s": "operations_analyst",
      "t": "business_ops_analyst",
      "score": 0.7,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "attention_to_detail",
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "problem_solving",
        "process_improvement",
        "revops_crm_administration"
      ],
      "gaps": [
        "bizops_enablement_training",
        "erp_systems_finance",
        "project_management",
        "revops_commercial_analytics",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gap_n": 6,
      "curated": true,
      "curated_note": "Closely related operations track."
    },
    {
      "s": "junior_business_analyst",
      "t": "business_analyst",
      "score": 0.8,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "bi_tools",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "problem_solving",
        "requirements_gathering",
        "sql",
        "technical_communication"
      ],
      "gaps": [
        "bizops_process_automation",
        "python_data",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "revops_gtm_process_design"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "Direct seniority progression."
    },
    {
      "s": "business_operations_associate",
      "t": "business_ops_analyst",
      "score": 0.75,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "attention_to_detail",
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "bizops_enablement_training",
        "erp_systems_finance",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Direct progression."
    },
    {
      "s": "junior_consultant",
      "t": "management_consultant",
      "score": 0.8,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "consulting_methodology",
        "data_analysis",
        "presentation_skills",
        "strategic_thinking"
      ],
      "gaps": [
        "coaching",
        "cross_functional_collaboration",
        "domain_expertise",
        "financial_modeling",
        "problem_solving",
        "stakeholder_management"
      ],
      "gap_n": 6,
      "curated": true,
      "curated_note": "Direct consulting progression."
    },
    {
      "s": "strategy_analyst",
      "t": "management_consultant",
      "score": 0.7,
      "type": "natural",
      "gap_d": "small",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "consulting_methodology",
        "cross_functional_collaboration",
        "data_analysis",
        "domain_expertise",
        "financial_modeling",
        "presentation_skills",
        "problem_solving",
        "strategic_thinking"
      ],
      "gaps": [
        "coaching",
        "stakeholder_management"
      ],
      "gap_n": 2,
      "curated": true,
      "curated_note": "Common strategy-to-consulting path."
    },
    {
      "s": "partnerships_associate",
      "t": "channel_partner_manager",
      "score": 0.65,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "commercial_mindset",
        "crm_management",
        "customer_communication",
        "pipeline_management",
        "relationship_building"
      ],
      "gaps": [
        "channel_partner_management",
        "cross_functional_collaboration",
        "go_to_market_strategy",
        "negotiation",
        "saas_sales",
        "sales_enablement",
        "stakeholder_management"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Common BD progression."
    },
    {
      "s": "social_media_coordinator",
      "t": "social_media_manager",
      "score": 0.8,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "canva_design_tools",
        "community_management",
        "content_strategy",
        "copywriting",
        "marketing_analytics",
        "organization",
        "social_media_management"
      ],
      "gaps": [
        "ab_testing_marketing",
        "customer_communication",
        "influencer_marketing",
        "performance_marketing"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Direct progression."
    },
    {
      "s": "event_coordinator",
      "t": "event_manager",
      "score": 0.8,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "content_strategy",
        "cross_functional_collaboration",
        "event_marketing",
        "marketing_analytics",
        "project_management"
      ],
      "gaps": [
        "analytical_thinking",
        "demand_generation",
        "performance_marketing",
        "stakeholder_management"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Direct progression."
    },
    {
      "s": "financial_analyst",
      "t": "fpa_analyst",
      "score": 0.75,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "budget_forecasting",
        "bva_analysis",
        "dashboarding",
        "data_analysis",
        "excel_advanced_finance",
        "financial_modeling",
        "presentation_skills",
        "saas_finance_metrics"
      ],
      "gaps": [
        "epm_planning_tools",
        "erp_systems_finance",
        "finance_business_partnering",
        "sql_advanced"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Common finance track."
    },
    {
      "s": "financial_analyst",
      "t": "senior_fpa_analyst",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "budget_forecasting",
        "bva_analysis",
        "data_analysis",
        "excel_advanced_finance",
        "financial_modeling",
        "presentation_skills",
        "saas_finance_metrics"
      ],
      "gaps": [
        "cash_flow_management",
        "coaching",
        "epm_planning_tools",
        "erp_systems_finance",
        "finance_business_partnering",
        "investor_relations_finance",
        "stakeholder_management"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Stretch to senior within same track."
    },
    {
      "s": "growth_analyst",
      "t": "growth_marketing_manager",
      "score": 0.65,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "conversion_rate_optimization",
        "funnel_optimization",
        "marketing_experimentation"
      ],
      "gaps": [
        "ai_tool_fluency",
        "campaign_analytics_attribution",
        "communication",
        "creative_strategy_performance",
        "cross_team_collaboration",
        "engagement_personalization_tools",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gap_n": 8,
      "curated": true,
      "curated_note": "Standard growth career path."
    },
    {
      "s": "revenue_analyst",
      "t": "sales_operations_manager",
      "score": 0.65,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "sql"
      ],
      "gaps": [
        "crm_management",
        "cross_functional_collaboration",
        "marketing_analytics",
        "process_design",
        "process_improvement",
        "revenue_operations",
        "salesforce",
        "systems_thinking",
        "workflow_automation"
      ],
      "gap_n": 9,
      "curated": true,
      "curated_note": "Revenue analytics to ops management."
    },
    {
      "s": "demand_generation_manager",
      "t": "head_of_marketing",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 3,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "demand_generation",
        "marketing_analytics",
        "performance_marketing",
        "product_positioning"
      ],
      "gaps": [
        "account_based_marketing",
        "brand_management",
        "commercial_mindset",
        "cross_functional_alignment",
        "go_to_market_strategy",
        "organizational_design",
        "people_management"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Mid to senior marketing leadership."
    },
    {
      "s": "technical_support_specialist",
      "t": "technical_support_engineer",
      "score": 0.75,
      "type": "natural",
      "gap_d": "small",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "api_integrations",
        "customer_communication",
        "debugging",
        "problem_solving",
        "technical_communication",
        "technical_documentation",
        "technical_troubleshooting"
      ],
      "gaps": [
        "cloud_tools",
        "cross_functional_collaboration"
      ],
      "gap_n": 2,
      "curated": true,
      "curated_note": "Direct progression."
    },
    {
      "s": "solutions_consultant",
      "t": "head_of_solutions_engineering",
      "score": 0.45,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 3,
      "shared": [
        "ai_tool_fluency",
        "cross_team_collaboration",
        "customer_technical_relationship",
        "solution_design_architecture",
        "technical_sales_acumen"
      ],
      "gaps": [
        "ai_strategy",
        "change_management",
        "competitive_positioning",
        "delivery_methodology",
        "domain_expertise",
        "executive_leadership",
        "executive_presentation",
        "gtm_strategy",
        "hiring_talent_acquisition",
        "people_management",
        "relationship_building",
        "se_team_leadership",
        "stakeholder_management",
        "strategic_thinking",
        "technical_content_creation"
      ],
      "gap_n": 15,
      "curated": true,
      "curated_note": "Large seniority gap but adjacent skills."
    },
    {
      "s": "pre_sales_engineer",
      "t": "solutions_consultant",
      "score": 0.75,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 0,
      "shared": [
        "ai_tool_fluency",
        "poc_management",
        "product_demonstration",
        "solution_design_architecture",
        "sql",
        "technical_discovery",
        "technical_sales_acumen"
      ],
      "gaps": [
        "communication",
        "crm_management",
        "cross_team_collaboration",
        "customer_technical_relationship"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Lateral within solutions engineering."
    },
    {
      "s": "customer_success_specialist",
      "t": "account_manager",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "crm_management",
        "customer_communication",
        "customer_relationship_management",
        "data_analysis",
        "stakeholder_management",
        "upselling_cross_selling"
      ],
      "gaps": [
        "account_management",
        "commercial_mindset",
        "negotiation",
        "renewal_management"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Both are customer-facing relationship roles with CRM and communication overlap."
    },
    {
      "s": "sales_representative",
      "t": "customer_success_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "customer_communication"
      ],
      "gaps": [
        "customer_advocacy",
        "customer_health_monitoring",
        "customer_relationship_management",
        "customer_retention",
        "data_analysis",
        "onboarding_strategy",
        "product_adoption",
        "renewal_management",
        "sales_collaboration",
        "stakeholder_management",
        "value_realization"
      ],
      "gap_n": 11,
      "curated": true,
      "curated_note": "Common pivot \u2014 sales reps bring communication and CRM but need retention depth."
    },
    {
      "s": "operations_analyst",
      "t": "project_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "analytical_thinking",
        "attention_to_detail",
        "problem_solving",
        "process_improvement"
      ],
      "gaps": [
        "agile_methodology",
        "ai_tool_fluency",
        "communication",
        "cross_functional_collaboration",
        "customer_communication",
        "delivery_execution",
        "project_management",
        "risk_management",
        "stakeholder_management"
      ],
      "gap_n": 9,
      "curated": true,
      "curated_note": "Both involve process and cross-functional coordination; PM adds execution ownership."
    },
    {
      "s": "financial_analyst",
      "t": "business_ops_analyst",
      "score": 0.6,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "data_analysis",
        "excel_advanced_finance",
        "saas_finance_metrics"
      ],
      "gaps": [
        "attention_to_detail",
        "bizops_enablement_training",
        "bizops_process_automation",
        "erp_systems_finance",
        "problem_solving",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "technical_communication"
      ],
      "gap_n": 10,
      "curated": true,
      "curated_note": "Close track \u2014 both finance-adjacent analytical roles."
    },
    {
      "s": "strategy_analyst",
      "t": "business_ops_analyst",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "data_analysis",
        "excel_advanced_finance",
        "problem_solving"
      ],
      "gaps": [
        "attention_to_detail",
        "bizops_enablement_training",
        "bizops_process_automation",
        "erp_systems_finance",
        "process_improvement",
        "project_management",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "saas_finance_metrics",
        "technical_communication"
      ],
      "gap_n": 10,
      "curated": true,
      "curated_note": "Strategy analysts bring analytical skills; BizOps adds operational execution."
    },
    {
      "s": "marketing_assistant",
      "t": "social_media_coordinator",
      "score": 0.65,
      "type": "natural",
      "gap_d": "small",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "canva_design_tools",
        "content_strategy",
        "copywriting",
        "marketing_analytics",
        "organization",
        "social_media_management"
      ],
      "gaps": [
        "community_management"
      ],
      "gap_n": 1,
      "curated": true,
      "curated_note": "Natural lateral in early marketing career."
    },
    {
      "s": "brand_manager",
      "t": "product_marketing_manager",
      "score": 0.6,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 0,
      "shared": [
        "ai_tools_marketing",
        "b2b_marketing",
        "content_strategy",
        "copywriting",
        "cross_functional_collaboration",
        "product_positioning"
      ],
      "gaps": [
        "analytical_thinking",
        "customer_discovery",
        "go_to_market_strategy",
        "market_research",
        "presentation_skills",
        "product_knowledge",
        "sales_enablement"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Adjacent marketing disciplines \u2014 brand to product marketing."
    },
    {
      "s": "event_coordinator",
      "t": "marketing_coordinator",
      "score": 0.6,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": -1,
      "shared": [
        "content_strategy",
        "copywriting",
        "customer_communication",
        "event_marketing",
        "marketing_analytics",
        "organization",
        "social_media_management"
      ],
      "gaps": [
        "ai_tools_marketing",
        "b2b_marketing",
        "canva_design_tools",
        "community_management",
        "influencer_marketing"
      ],
      "gap_n": 5,
      "curated": true,
      "curated_note": "Close marketing roles with overlapping skill set."
    },
    {
      "s": "management_consultant",
      "t": "strategy_ops_manager",
      "score": 0.6,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "consulting_methodology",
        "data_analysis",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gaps": [
        "bizops_business_case_development",
        "bizops_cross_functional_execution",
        "bizops_executive_communication",
        "bizops_executive_operating_rhythm",
        "bizops_okr_framework",
        "bizops_operational_scaling",
        "excel_advanced_finance",
        "project_management",
        "revops_commercial_analytics",
        "saas_finance_metrics",
        "sql"
      ],
      "gap_n": 11,
      "curated": true,
      "curated_note": "Classic consulting exit path into strategy/operations."
    },
    {
      "s": "growth_analyst",
      "t": "data_analyst",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "ab_testing",
        "analytical_thinking",
        "dashboarding",
        "data_analysis",
        "statistical_analysis"
      ],
      "gaps": [
        "bi_tools",
        "cloud_data_platforms",
        "data_storytelling",
        "experimentation_framework",
        "product_analytics_expertise",
        "python_data",
        "requirements_gathering",
        "sql_advanced"
      ],
      "gap_n": 8,
      "curated": true,
      "curated_note": "Growth analysts have analytical skills; data analyst is a pure analytics track."
    },
    {
      "s": "revenue_analyst",
      "t": "business_ops_analyst",
      "score": 0.7,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 1,
      "shared": [
        "bizops_process_automation",
        "data_analysis",
        "excel_advanced_finance",
        "revops_commercial_analytics",
        "revops_crm_administration",
        "saas_finance_metrics"
      ],
      "gaps": [
        "attention_to_detail",
        "bizops_enablement_training",
        "erp_systems_finance",
        "problem_solving",
        "process_improvement",
        "project_management",
        "technical_communication"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Overlapping analytical/operations skill sets."
    },
    {
      "s": "demand_generation_manager",
      "t": "growth_marketing_manager",
      "score": 0.7,
      "type": "natural",
      "gap_d": "large",
      "sen_gap": 0,
      "shared": [
        "analytical_thinking",
        "campaign_analytics_attribution"
      ],
      "gaps": [
        "ai_tool_fluency",
        "communication",
        "conversion_rate_optimization",
        "creative_strategy_performance",
        "cross_team_collaboration",
        "engagement_personalization_tools",
        "funnel_optimization",
        "marketing_experimentation",
        "stakeholder_management",
        "strategic_thinking"
      ],
      "gap_n": 10,
      "curated": true,
      "curated_note": "Close marketing disciplines \u2014 demand gen and growth share core methods."
    },
    {
      "s": "solutions_consultant",
      "t": "customer_success_manager",
      "score": 0.5,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 0,
      "shared": [],
      "gaps": [
        "customer_advocacy",
        "customer_communication",
        "customer_health_monitoring",
        "customer_relationship_management",
        "customer_retention",
        "data_analysis",
        "onboarding_strategy",
        "product_adoption",
        "renewal_management",
        "sales_collaboration",
        "stakeholder_management",
        "value_realization"
      ],
      "gap_n": 12,
      "curated": true,
      "curated_note": "Technical consulting and CS both involve customer relationship and adoption work."
    },
    {
      "s": "talent_acquisition_specialist",
      "t": "talent_acquisition_manager",
      "score": 0.7,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "ai_tools_marketing",
        "analytical_thinking",
        "cross_functional_collaboration",
        "employer_branding",
        "hr_data_analytics",
        "process_improvement",
        "stakeholder_management",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "coaching",
        "data_analysis",
        "organizational_development",
        "people_management"
      ],
      "gap_n": 4,
      "curated": true,
      "curated_note": "Direct progression within TA track \u2014 IC to manager."
    },
    {
      "s": "talent_acquisition_specialist",
      "t": "hr_generalist",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "medium",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "cross_functional_collaboration",
        "employer_branding",
        "hr_data_analytics",
        "organization",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "employee_experience",
        "employee_lifecycle_management",
        "hris_management",
        "israeli_labor_law",
        "learning_development",
        "performance_management"
      ],
      "gap_n": 6,
      "curated": true,
      "curated_note": "Lateral across HR disciplines with overlapping skill set."
    },
    {
      "s": "talent_acquisition_specialist",
      "t": "hr_manager",
      "score": 0.45,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "employer_branding",
        "hr_data_analytics",
        "talent_acquisition_recruiting"
      ],
      "gaps": [
        "compensation_benefits",
        "employee_lifecycle_management",
        "hr_business_partnering",
        "hris_management",
        "israeli_labor_law",
        "learning_development",
        "organizational_development",
        "people_management",
        "systems_thinking"
      ],
      "gap_n": 9,
      "curated": true,
      "curated_note": "Senior move across HR disciplines \u2014 needs broader HR leadership."
    },
    {
      "s": "event_manager",
      "t": "marketing_manager",
      "score": 0.6,
      "type": "natural",
      "gap_d": "medium",
      "sen_gap": 1,
      "shared": [
        "content_strategy",
        "cross_functional_collaboration",
        "demand_generation",
        "event_marketing",
        "marketing_analytics",
        "performance_marketing",
        "project_management"
      ],
      "gaps": [
        "ai_tools_marketing",
        "b2b_marketing",
        "brand_management",
        "marketing_automation",
        "product_positioning",
        "social_media_management"
      ],
      "gap_n": 6,
      "curated": true,
      "curated_note": "Event management sits within marketing org; natural progression into broader marketing leadership."
    },
    {
      "s": "event_manager",
      "t": "head_of_marketing",
      "score": 0.4,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "demand_generation",
        "marketing_analytics",
        "performance_marketing"
      ],
      "gaps": [
        "account_based_marketing",
        "ai_tools_marketing",
        "b2b_marketing",
        "brand_management",
        "commercial_mindset",
        "cross_functional_alignment",
        "go_to_market_strategy",
        "organizational_design",
        "people_management",
        "product_positioning"
      ],
      "gap_n": 10,
      "curated": true,
      "curated_note": "Senior stretch within marketing track."
    },
    {
      "s": "event_manager",
      "t": "content_marketing_manager",
      "score": 0.55,
      "type": "stretch",
      "gap_d": "large",
      "sen_gap": 2,
      "shared": [
        "analytical_thinking",
        "content_strategy",
        "demand_generation",
        "marketing_analytics",
        "project_management"
      ],
      "gaps": [
        "ai_tools_marketing",
        "b2b_marketing",
        "copywriting",
        "product_positioning",
        "seo_management",
        "social_media_management",
        "technical_communication"
      ],
      "gap_n": 7,
      "curated": true,
      "curated_note": "Adjacent marketing role."
    }
  ]
} as const;
