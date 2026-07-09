// Auto-generated from supabase/functions/_shared/libraries/00_role_library.ts
// by scripts/regen-role-lookup.mjs. DO NOT EDIT BY HAND.
// Slim role lookup for client-side title resolution (src/lib/roleMatch.js).
// Regenerate with `node scripts/regen-role-lookup.mjs` after role-library edits;
// CI fails if this file is stale (see the role-mirror-staleness job).

export const ROLE_LOOKUP = [
  {
    "id": "customer_support_representative",
    "title": "Customer Support Representative",
    "alternate_titles": [
      "CS Representative",
      "Customer Service Representative",
      "Support Rep"
    ],
    "seniority": "Entry",
    "role_family": "Support"
  },
  {
    "id": "customer_support_specialist",
    "title": "Customer Support Specialist",
    "alternate_titles": [
      "Senior Customer Support Specialist",
      "Tier 2 Support Specialist",
      "Customer Support Lead"
    ],
    "seniority": "Entry",
    "role_family": "Support"
  },
  {
    "id": "technical_support_engineer",
    "title": "Technical Support Engineer",
    "alternate_titles": [
      "TSE",
      "Senior Technical Support Engineer",
      "Tier 3 Support Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Support"
  },
  {
    "id": "senior_support_engineer",
    "title": "Senior Support Engineer",
    "alternate_titles": [
      "Senior Technical Support Engineer",
      "Lead Support Engineer",
      "Principal TSE"
    ],
    "seniority": "Senior",
    "role_family": "Support"
  },
  {
    "id": "customer_onboarding_specialist",
    "title": "Customer Onboarding Specialist",
    "alternate_titles": [
      "Onboarding Manager",
      "Junior Implementation Specialist",
      "Onboarding Specialist"
    ],
    "seniority": "Entry",
    "role_family": "Onboarding_Implementation"
  },
  {
    "id": "customer_success_associate",
    "title": "Customer Success Associate",
    "alternate_titles": [
      "CS Associate",
      "Junior Customer Success Manager"
    ],
    "seniority": "Entry",
    "role_family": "Onboarding_Implementation"
  },
  {
    "id": "implementation_specialist",
    "title": "Implementation Specialist",
    "alternate_titles": [
      "Senior Implementation Specialist",
      "Implementation Consultant",
      "Onboarding Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Onboarding_Implementation"
  },
  {
    "id": "implementation_manager",
    "title": "Implementation Manager",
    "alternate_titles": [
      "Senior Implementation Manager",
      "Implementation Lead",
      "Customer Implementation Manager"
    ],
    "seniority": "Senior",
    "role_family": "Onboarding_Implementation"
  },
  {
    "id": "project_manager_customer_delivery",
    "title": "Project Manager (Customer Delivery)",
    "alternate_titles": [
      "Customer Delivery PM",
      "Implementation PM",
      "Senior Customer Delivery Manager"
    ],
    "seniority": "Senior",
    "role_family": "Onboarding_Implementation"
  },
  {
    "id": "customer_success_manager",
    "title": "Customer Success Manager",
    "alternate_titles": [
      "CSM",
      "Senior Customer Success Manager (SMB tier)",
      "Mid-Market CSM"
    ],
    "seniority": "Mid",
    "role_family": "Relationship_Growth"
  },
  {
    "id": "senior_customer_success_manager",
    "title": "Senior Customer Success Manager",
    "alternate_titles": [
      "Senior CSM",
      "Strategic CSM",
      "Enterprise Customer Success Manager",
      "Strategic Customer Success Manager"
    ],
    "seniority": "Senior",
    "role_family": "Relationship_Growth"
  },
  {
    "id": "technical_account_manager",
    "title": "Technical Account Manager",
    "alternate_titles": [
      "TAM",
      "Senior TAM",
      "Strategic TAM"
    ],
    "seniority": "Senior",
    "role_family": "Relationship_Growth"
  },
  {
    "id": "account_manager",
    "title": "Account Manager",
    "alternate_titles": [
      "Strategic Account Manager",
      "Senior Account Manager",
      "Customer Account Manager"
    ],
    "seniority": "Mid",
    "role_family": "Relationship_Growth"
  },
  {
    "id": "customer_experience_specialist",
    "title": "Customer Experience Specialist",
    "alternate_titles": [
      "CX Specialist",
      "Customer Experience Coordinator",
      "Junior CX Specialist"
    ],
    "seniority": "Entry",
    "role_family": "Customer_Experience"
  },
  {
    "id": "customer_experience_manager",
    "title": "Customer Experience Manager",
    "alternate_titles": [
      "Senior CX Manager",
      "Director of Customer Experience",
      "CX Operations Manager"
    ],
    "seniority": "Senior",
    "role_family": "Customer_Experience"
  },
  {
    "id": "sales_engineer",
    "title": "Sales Engineer",
    "alternate_titles": [
      "Customer-Facing Sales Engineer",
      "Technical AE"
    ],
    "seniority": "Mid",
    "role_family": "Relationship_Growth"
  },
  {
    "id": "support_team_lead",
    "title": "Support Team Lead",
    "alternate_titles": [
      "Support Manager (smaller orgs)",
      "Customer Support Lead",
      "Tier 2 Support Lead"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Leadership"
  },
  {
    "id": "customer_success_team_lead",
    "title": "Customer Success Team Lead",
    "alternate_titles": [
      "CS Team Lead",
      "CS Manager (player-coach)",
      "Senior CSM with team lead duties",
      "Customer Success Lead"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Leadership"
  },
  {
    "id": "director_customer_success",
    "title": "Director of Customer Success",
    "alternate_titles": [
      "Director of CS",
      "Head of Customer Success",
      "Senior Director of Customer Success"
    ],
    "seniority": "Director_Head",
    "role_family": "Leadership"
  },
  {
    "id": "director_customer_success_operations",
    "title": "Director of Customer Success Operations",
    "alternate_titles": [
      "Director of CS Ops",
      "Head of Customer Success Operations",
      "Senior CS Operations Manager"
    ],
    "seniority": "Director_Head",
    "role_family": "Operations"
  },
  {
    "id": "vp_customer_success",
    "title": "VP Customer Success",
    "alternate_titles": [
      "VP CS",
      "Chief Customer Officer",
      "Head of Customer Success"
    ],
    "seniority": "VP_Executive",
    "role_family": "Leadership"
  },
  {
    "id": "project_manager",
    "title": "Project Manager",
    "alternate_titles": [
      "PM (non-product)",
      "Senior Project Manager",
      "Operations Project Manager"
    ],
    "seniority": "Mid",
    "role_family": "Operations"
  },
  {
    "id": "technical_project_manager",
    "title": "Technical Project Manager",
    "alternate_titles": [
      "TPM",
      "Senior Technical Project Manager",
      "Engineering Program Manager"
    ],
    "seniority": "Senior",
    "role_family": "Operations"
  },
  {
    "id": "program_manager",
    "title": "Program Manager",
    "alternate_titles": [
      "Senior Program Manager",
      "Strategic Program Manager",
      "Engineering Program Manager"
    ],
    "seniority": "Senior",
    "role_family": "Operations"
  },
  {
    "id": "product_manager",
    "title": "Product Manager",
    "alternate_titles": [
      "PM",
      "Product Manager",
      "Senior Associate PM",
      "Product Owner",
      "Growth Product Manager"
    ],
    "seniority": "Mid",
    "role_family": "Product"
  },
  {
    "id": "technical_product_manager",
    "title": "Technical Product Manager",
    "alternate_titles": [
      "TPM",
      "Platform PM",
      "Infrastructure PM",
      "API Product Manager"
    ],
    "seniority": "Senior",
    "role_family": "Product"
  },
  {
    "id": "product_analyst",
    "title": "Product Analyst",
    "alternate_titles": [
      "Product Data Analyst",
      "Senior Product Analyst",
      "Growth Analyst"
    ],
    "seniority": "Mid",
    "role_family": "Product"
  },
  {
    "id": "sales_development_representative",
    "title": "Sales Development Representative",
    "alternate_titles": [
      "SDR",
      "Sales Development Rep",
      "Outbound SDR",
      "Inbound SDR"
    ],
    "seniority": "Entry",
    "role_family": "Sales"
  },
  {
    "id": "business_development_representative",
    "title": "Business Development Representative",
    "alternate_titles": [
      "BDR",
      "Business Development Rep",
      "BDR/SDR"
    ],
    "seniority": "Entry",
    "role_family": "Sales"
  },
  {
    "id": "account_executive",
    "title": "Account Executive",
    "alternate_titles": [
      "AE",
      "Mid-Market Account Executive",
      "SMB Account Executive"
    ],
    "seniority": "Mid",
    "role_family": "Sales"
  },
  {
    "id": "senior_account_executive",
    "title": "Senior Account Executive",
    "alternate_titles": [
      "Senior AE",
      "Strategic Account Executive",
      "Senior Sales Representative"
    ],
    "seniority": "Senior",
    "role_family": "Sales"
  },
  {
    "id": "enterprise_account_executive",
    "title": "Enterprise Account Executive",
    "alternate_titles": [
      "Enterprise AE",
      "Strategic AE",
      "Major Account Executive",
      "Global Account Executive"
    ],
    "seniority": "Senior",
    "role_family": "Sales"
  },
  {
    "id": "sales_manager",
    "title": "Sales Manager",
    "alternate_titles": [
      "Sales Team Lead",
      "Manager of Sales",
      "Regional Sales Manager"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Sales"
  },
  {
    "id": "sales_director",
    "title": "Sales Director",
    "alternate_titles": [
      "Director of Sales",
      "Regional Sales Director",
      "Senior Sales Director"
    ],
    "seniority": "Director_Head",
    "role_family": "Sales"
  },
  {
    "id": "vp_sales",
    "title": "VP of Sales",
    "alternate_titles": [
      "VP of Sales",
      "Chief Revenue Officer",
      "CRO",
      "Head of Sales"
    ],
    "seniority": "VP_Executive",
    "role_family": "Sales"
  },
  {
    "id": "sales_operations_manager",
    "title": "Sales Operations Manager",
    "alternate_titles": [
      "Sales Ops Manager",
      "Revenue Operations Manager",
      "Senior Sales Ops",
      "Sales Operations Analyst"
    ],
    "seniority": "Mid",
    "role_family": "Operations"
  },
  {
    "id": "channel_partner_manager",
    "title": "Channel Partner Manager",
    "alternate_titles": [
      "Channel Sales Manager",
      "Partner Sales Manager",
      "Channel Account Manager",
      "Channel Partnerships Manager"
    ],
    "seniority": "Mid",
    "role_family": "Sales"
  },
  {
    "id": "marketing_coordinator",
    "title": "Marketing Coordinator",
    "alternate_titles": [
      "Marketing Operations Coordinator",
      "Junior Marketing Coordinator"
    ],
    "seniority": "Entry",
    "role_family": "Marketing"
  },
  {
    "id": "marketing_manager",
    "title": "Marketing Manager",
    "alternate_titles": [
      "Marketing Lead",
      "Senior Marketing Manager",
      "Digital Marketing Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "growth_marketing_manager",
    "title": "Growth Marketing Manager",
    "alternate_titles": [
      "Growth Marketing Lead",
      "Senior Growth Marketing Manager",
      "Growth Lead"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "performance_marketing_manager",
    "title": "Performance Marketing Manager",
    "alternate_titles": [
      "Paid Media Manager",
      "Acquisition Marketing Manager",
      "User Acquisition Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "lifecycle_marketing_manager",
    "title": "Lifecycle Marketing Manager",
    "alternate_titles": [
      "CRM Marketing Manager",
      "Customer Lifecycle Marketing Manager",
      "Email Marketing Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "product_marketing_manager",
    "title": "Product Marketing Manager",
    "alternate_titles": [
      "PMM",
      "Senior Product Marketing Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "content_marketing_manager",
    "title": "Content Marketing Manager",
    "alternate_titles": [
      "Content Marketing Lead",
      "Senior Content Manager",
      "Editorial Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "seo_manager",
    "title": "SEO Manager",
    "alternate_titles": [
      "SEO Lead",
      "Senior SEO Manager",
      "Organic Growth Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "social_media_manager",
    "title": "Social Media Manager",
    "alternate_titles": [
      "Social Media Lead",
      "Senior Social Media Manager",
      "Community Manager"
    ],
    "seniority": "Entry",
    "role_family": "Marketing"
  },
  {
    "id": "head_of_marketing",
    "title": "Head of Marketing",
    "alternate_titles": [
      "Director of Marketing",
      "VP Marketing (smaller orgs)",
      "Senior Director of Marketing"
    ],
    "seniority": "Director_Head",
    "role_family": "Marketing"
  },
  {
    "id": "vp_marketing",
    "title": "VP of Marketing",
    "alternate_titles": [
      "VP of Marketing",
      "Chief Marketing Officer",
      "CMO"
    ],
    "seniority": "VP_Executive",
    "role_family": "Marketing"
  },
  {
    "id": "associate_product_manager",
    "title": "Associate Product Manager",
    "alternate_titles": [
      "APM",
      "Junior Product Manager",
      "Product Manager I",
      "Product Associate"
    ],
    "seniority": "Entry",
    "role_family": "Product"
  },
  {
    "id": "senior_product_manager",
    "title": "Senior Product Manager",
    "alternate_titles": [
      "Senior PM",
      "Lead Product Manager",
      "Senior Product Manager"
    ],
    "seniority": "Senior",
    "role_family": "Product"
  },
  {
    "id": "group_product_manager",
    "title": "Group Product Manager",
    "alternate_titles": [
      "GPM",
      "Group PM",
      "Senior Group Product Manager",
      "Lead PM"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Product"
  },
  {
    "id": "product_operations_manager",
    "title": "Product Operations Manager",
    "alternate_titles": [
      "ProductOps Manager",
      "Product Ops Lead",
      "Senior Product Operations Manager",
      "Product Operations Specialist"
    ],
    "seniority": "Mid",
    "role_family": "Product"
  },
  {
    "id": "head_of_product",
    "title": "Head of Product",
    "alternate_titles": [
      "VP Product",
      "Chief Product Officer",
      "VP of Product Management",
      "Director of Product"
    ],
    "seniority": "Director_Head",
    "role_family": "Product"
  },
  {
    "id": "data_analyst",
    "title": "Data Analyst",
    "alternate_titles": [
      "Business Analyst",
      "Senior Data Analyst",
      "Analytics Analyst"
    ],
    "seniority": "Mid",
    "role_family": "Data"
  },
  {
    "id": "business_intelligence_analyst",
    "title": "Business Intelligence Analyst",
    "alternate_titles": [
      "BI Analyst",
      "Senior BI Analyst",
      "BI Developer"
    ],
    "seniority": "Mid",
    "role_family": "Data"
  },
  {
    "id": "analytics_engineer",
    "title": "Analytics Engineer",
    "alternate_titles": [
      "Senior Analytics Engineer",
      "Data Modeling Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Data"
  },
  {
    "id": "data_engineer",
    "title": "Data Engineer",
    "alternate_titles": [
      "Senior Data Engineer",
      "Data Platform Engineer",
      "Big Data Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Data"
  },
  {
    "id": "data_scientist",
    "title": "Data Scientist",
    "alternate_titles": [
      "Senior Data Scientist",
      "Applied Scientist",
      "ML Data Scientist"
    ],
    "seniority": "Mid",
    "role_family": "Data"
  },
  {
    "id": "senior_data_analyst",
    "title": "Senior Data Analyst",
    "alternate_titles": [
      "Lead Data Analyst",
      "Principal Data Analyst",
      "Senior Business Analyst"
    ],
    "seniority": "Senior",
    "role_family": "Data"
  },
  {
    "id": "head_of_data",
    "title": "Head of Data & Analytics",
    "alternate_titles": [
      "VP Data",
      "Director of Data",
      "Head of Analytics",
      "Chief Data Officer"
    ],
    "seniority": "Director_Head",
    "role_family": "Data"
  },
  {
    "id": "fpa_analyst",
    "title": "FP&A Analyst",
    "alternate_titles": [
      "FP&A Analyst",
      "Senior FP&A Analyst",
      "Financial Planning Analyst"
    ],
    "seniority": "Mid",
    "role_family": "Finance"
  },
  {
    "id": "senior_fpa_analyst",
    "title": "Senior FP&A Analyst",
    "alternate_titles": [
      "Senior FP&A Manager",
      "FP&A Lead",
      "Strategic Finance Analyst"
    ],
    "seniority": "Senior",
    "role_family": "Finance"
  },
  {
    "id": "controller",
    "title": "Controller",
    "alternate_titles": [
      "Senior Controller",
      "Corporate Controller",
      "Group Controller"
    ],
    "seniority": "Mid",
    "role_family": "Finance"
  },
  {
    "id": "finance_manager",
    "title": "Finance Manager",
    "alternate_titles": [
      "Senior Finance Manager",
      "Director of Finance (smaller orgs)"
    ],
    "seniority": "Senior",
    "role_family": "Finance"
  },
  {
    "id": "vp_finance_cfo",
    "title": "VP Finance / CFO",
    "alternate_titles": [
      "CFO",
      "Chief Financial Officer",
      "VP of Finance"
    ],
    "seniority": "Director_Head",
    "role_family": "Finance"
  },
  {
    "id": "hr_generalist",
    "title": "HR Generalist",
    "alternate_titles": [
      "People Generalist",
      "Senior HR Generalist",
      "HR Business Partner (junior)"
    ],
    "seniority": "Entry_Mid",
    "role_family": "HR_People"
  },
  {
    "id": "hr_operations_manager",
    "title": "HR Operations Manager",
    "alternate_titles": [
      "People Operations Manager",
      "HR Ops Manager",
      "Senior HR Operations Manager"
    ],
    "seniority": "Mid",
    "role_family": "HR_People"
  },
  {
    "id": "ld_specialist",
    "title": "L&D Specialist",
    "alternate_titles": [
      "L&D Specialist",
      "Learning & Development Specialist",
      "Training Specialist"
    ],
    "seniority": "Mid",
    "role_family": "HR_People"
  },
  {
    "id": "hr_business_partner",
    "title": "HR Business Partner",
    "alternate_titles": [
      "HRBP",
      "Senior HR Business Partner",
      "People Business Partner"
    ],
    "seniority": "Senior",
    "role_family": "HR_People"
  },
  {
    "id": "compensation_benefits_specialist",
    "title": "Compensation & Benefits Specialist",
    "alternate_titles": [
      "C&B Specialist",
      "Total Rewards Specialist",
      "Compensation Analyst"
    ],
    "seniority": "Mid",
    "role_family": "HR_People"
  },
  {
    "id": "talent_acquisition_manager",
    "title": "Talent Acquisition Manager",
    "alternate_titles": [
      "TA Manager",
      "Senior TA Manager",
      "Head of Recruiting"
    ],
    "seniority": "Senior",
    "role_family": "HR_People"
  },
  {
    "id": "hr_manager",
    "title": "HR Manager",
    "alternate_titles": [
      "People Manager",
      "Senior HR Manager",
      "Director of HR (smaller orgs)"
    ],
    "seniority": "Senior",
    "role_family": "HR_People"
  },
  {
    "id": "head_of_hr_people",
    "title": "Head of HR / VP People",
    "alternate_titles": [
      "VP People",
      "VP HR",
      "Chief People Officer",
      "Head of People"
    ],
    "seniority": "Director_Head",
    "role_family": "HR_People"
  },
  {
    "id": "revops_analyst",
    "title": "Revenue Operations Analyst",
    "alternate_titles": [
      "Senior Revenue Operations Analyst",
      "RevOps Analyst",
      "GTM Analyst"
    ],
    "seniority": "Mid",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "revops_manager",
    "title": "Revenue Operations Manager",
    "alternate_titles": [
      "Senior Revenue Operations Manager",
      "RevOps Manager",
      "Head of Sales Ops"
    ],
    "seniority": "Senior",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "head_of_revops",
    "title": "Head of Revenue Operations / Senior RevOps Manager",
    "alternate_titles": [
      "VP Revenue Operations",
      "Head of RevOps",
      "Director of Revenue Operations"
    ],
    "seniority": "Director_Head",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "business_analyst",
    "title": "Business Analyst",
    "alternate_titles": [
      "Senior Business Analyst",
      "BizOps Analyst",
      "Business Operations Analyst"
    ],
    "seniority": "Mid",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "business_ops_analyst",
    "title": "Business Operations Analyst",
    "alternate_titles": [
      "BizOps Analyst",
      "Senior Business Operations Analyst",
      "Strategy Analyst"
    ],
    "seniority": "Mid",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "business_ops_manager",
    "title": "Business Operations Manager",
    "alternate_titles": [
      "BizOps Manager",
      "Senior Business Operations Manager",
      "Strategy & Operations Manager"
    ],
    "seniority": "Senior",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "strategy_ops_manager",
    "title": "Strategy & Operations Manager",
    "alternate_titles": [
      "Strategy Manager",
      "Senior Strategy Manager",
      "Strategy & Operations Manager",
      "Strategy Operations Manager"
    ],
    "seniority": "Senior",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "chief_of_staff",
    "title": "Chief of Staff",
    "alternate_titles": [
      "Senior Chief of Staff",
      "Chief of Staff to CEO",
      "Chief of Staff to CTO"
    ],
    "seniority": "Senior",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "vp_operations",
    "title": "VP / Head of Operations",
    "alternate_titles": [
      "VP of Operations",
      "Chief Operating Officer",
      "COO"
    ],
    "seniority": "VP_Executive",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "junior_software_engineer",
    "title": "Junior Software Engineer",
    "alternate_titles": [
      "Junior Developer",
      "Junior Programmer",
      "Software Engineer Intern",
      "Software Engineer Student",
      "Software Engineer - Technion Fair",
      "Software Engineering Student",
      "Verification Student",
      "Manual QA Tester",
      "Entry-Level Software Engineer",
      "Software Engineer I",
      "Associate Software Engineer",
      "Graduate Software Engineer"
    ],
    "seniority": "Entry",
    "role_family": "Engineering"
  },
  {
    "id": "software_engineer",
    "title": "Software Engineer",
    "alternate_titles": [
      "Backend Engineer",
      "Full-Stack Engineer",
      "Software Developer",
      "Backend Developer"
    ],
    "seniority": "Mid",
    "role_family": "Engineering"
  },
  {
    "id": "senior_software_engineer",
    "title": "Senior Software Engineer",
    "alternate_titles": [
      "Senior Backend Engineer",
      "Senior Full-Stack Engineer",
      "SWE III",
      "Software Engineer III"
    ],
    "seniority": "Senior",
    "role_family": "Engineering"
  },
  {
    "id": "staff_engineer",
    "title": "Staff Engineer",
    "alternate_titles": [
      "Principal Engineer",
      "Principal Software Engineer",
      "Staff Software Engineer"
    ],
    "seniority": "Senior",
    "role_family": "Engineering"
  },
  {
    "id": "tech_lead",
    "title": "Tech Lead",
    "alternate_titles": [
      "Engineering Tech Lead",
      "TL",
      "Technical Lead",
      "Lead Engineer"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Engineering"
  },
  {
    "id": "engineering_manager",
    "title": "Engineering Manager",
    "alternate_titles": [
      "EM",
      "Software Engineering Manager",
      "Manager of Engineering"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Engineering"
  },
  {
    "id": "senior_engineering_manager",
    "title": "Senior Engineering Manager / Director of Engineering",
    "alternate_titles": [
      "Senior EM",
      "Director of Engineering",
      "Senior Manager, Engineering"
    ],
    "seniority": "Director_Head",
    "role_family": "Engineering"
  },
  {
    "id": "vp_engineering",
    "title": "VP Engineering / Head of Engineering",
    "alternate_titles": [
      "VPE",
      "VP of Engineering",
      "Vice President, Engineering",
      "Head of Engineering"
    ],
    "seniority": "VP_Executive",
    "role_family": "Engineering"
  },
  {
    "id": "qa_engineer",
    "title": "QA Engineer",
    "alternate_titles": [
      "QA Automation Engineer",
      "Test Engineer",
      "Software Tester",
      "SDET"
    ],
    "seniority": "Mid",
    "role_family": "Engineering"
  },
  {
    "id": "devops_engineer",
    "title": "DevOps Engineer",
    "alternate_titles": [
      "Platform Engineer",
      "Infrastructure Engineer",
      "Cloud Engineer",
      "DevOps / Cloud Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Engineering"
  },
  {
    "id": "sre_engineer",
    "title": "SRE Engineer",
    "alternate_titles": [
      "Site Reliability Engineer",
      "Senior SRE",
      "Production Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Engineering"
  },
  {
    "id": "engineering_group_manager",
    "title": "Engineering Group Manager",
    "alternate_titles": [
      "Group EM",
      "Director of Engineering",
      "Group Engineering Manager",
      "Engineering Director"
    ],
    "seniority": "Director_Head",
    "role_family": "Engineering"
  },
  {
    "id": "junior_ai_ml_engineer",
    "title": "Junior AI/ML Engineer",
    "alternate_titles": [
      "Junior AI Engineer",
      "Junior ML Engineer",
      "AI/ML Engineer I",
      "Entry-Level AI Engineer"
    ],
    "seniority": "Entry",
    "role_family": "AI_ML"
  },
  {
    "id": "ai_engineer_mid",
    "title": "AI Engineer / GenAI Engineer",
    "alternate_titles": [
      "AI Engineer",
      "ML Engineer",
      "Applied AI Engineer",
      "GenAI Engineer"
    ],
    "seniority": "Mid",
    "role_family": "AI_ML"
  },
  {
    "id": "senior_ai_engineer",
    "title": "Senior AI Engineer",
    "alternate_titles": [
      "Staff AI Engineer",
      "Principal AI Engineer",
      "Senior ML Engineer",
      "Senior Applied AI Engineer"
    ],
    "seniority": "Senior",
    "role_family": "AI_ML"
  },
  {
    "id": "mlops_engineer",
    "title": "MLOps / ML Platform Engineer",
    "alternate_titles": [
      "ML Platform Engineer",
      "ML Infrastructure Engineer",
      "AI Platform Engineer"
    ],
    "seniority": "Senior",
    "role_family": "AI_ML"
  },
  {
    "id": "cv_edge_ai_engineer",
    "title": "Computer Vision / Edge AI Engineer",
    "alternate_titles": [
      "Computer Vision Engineer",
      "Edge AI Engineer",
      "Embedded ML Engineer",
      "CV Engineer"
    ],
    "seniority": "Senior",
    "role_family": "AI_ML"
  },
  {
    "id": "applied_ai_researcher",
    "title": "Applied AI Researcher",
    "alternate_titles": [
      "AI Research Scientist",
      "Applied Research Engineer",
      "ML Research Engineer",
      "Research Scientist"
    ],
    "seniority": "Senior",
    "role_family": "AI_ML"
  },
  {
    "id": "prompt_engineer",
    "title": "Prompt Engineer / Conversational AI Designer",
    "alternate_titles": [
      "Senior Prompt Engineer",
      "AI Prompt Engineer",
      "LLM Prompt Engineer",
      "Conversational AI Designer"
    ],
    "seniority": "Mid",
    "role_family": "AI_ML"
  },
  {
    "id": "ai_transformation_lead",
    "title": "AI Transformation Lead / AI Enablement Lead",
    "alternate_titles": [
      "AI Transformation Manager",
      "Head of AI Adoption",
      "AI Strategy Lead",
      "Enterprise AI Lead"
    ],
    "seniority": "Senior",
    "role_family": "AI_ML"
  },
  {
    "id": "head_of_ai",
    "title": "Head of AI / AI Lead",
    "alternate_titles": [
      "Head of AI",
      "Director of AI",
      "AI Lead",
      "Head of Machine Learning"
    ],
    "seniority": "Lead_Manager",
    "role_family": "AI_ML"
  },
  {
    "id": "vp_ai_chief_ai_officer",
    "title": "VP AI / Chief AI Officer",
    "alternate_titles": [
      "VP AI",
      "Chief AI Officer",
      "CAIO",
      "VP of Artificial Intelligence"
    ],
    "seniority": "VP_Executive",
    "role_family": "AI_ML"
  },
  {
    "id": "ai_solutions_engineering_manager",
    "title": "AI Solutions Engineering Manager",
    "alternate_titles": [
      "AI SE Manager",
      "AI Solutions Architect Lead",
      "Head of AI Solutions"
    ],
    "seniority": "Senior",
    "role_family": "AI_ML"
  },
  {
    "id": "junior_ux_ui_designer",
    "title": "Junior UX/UI Designer",
    "alternate_titles": [
      "Junior Product Designer",
      "UI/UX Designer (entry)",
      "Associate Designer"
    ],
    "seniority": "Entry",
    "role_family": "Design_UX"
  },
  {
    "id": "product_designer_ux_ui",
    "title": "Product Designer (UX/UI)",
    "alternate_titles": [
      "Product Designer",
      "UX/UI Designer",
      "Senior Product Designer (early)"
    ],
    "seniority": "Mid",
    "role_family": "Design_UX"
  },
  {
    "id": "senior_product_designer",
    "title": "Senior Product Designer",
    "alternate_titles": [
      "Staff Product Designer",
      "Principal Designer",
      "Lead Product Designer"
    ],
    "seniority": "Senior",
    "role_family": "Design_UX"
  },
  {
    "id": "ux_researcher",
    "title": "UX Researcher",
    "alternate_titles": [
      "UX Research Lead",
      "Senior UX Researcher",
      "User Researcher"
    ],
    "seniority": "Mid",
    "role_family": "Design_UX"
  },
  {
    "id": "design_system_lead",
    "title": "Design System Lead",
    "alternate_titles": [
      "Design Systems Manager",
      "Design Systems Lead",
      "Senior Design Systems Designer"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Design_UX"
  },
  {
    "id": "design_lead_design_manager",
    "title": "Design Lead / Design Manager",
    "alternate_titles": [
      "Design Manager",
      "Senior Design Manager",
      "Director of Design"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Design_UX"
  },
  {
    "id": "head_of_design_vp_design",
    "title": "Head of Design / VP Design",
    "alternate_titles": [
      "VP Design",
      "Chief Design Officer",
      "Head of Design"
    ],
    "seniority": "Director_Head",
    "role_family": "Design_UX"
  },
  {
    "id": "brand_marketing_designer",
    "title": "Brand / Marketing Designer",
    "alternate_titles": [
      "Brand Designer",
      "Marketing Designer",
      "Visual Designer"
    ],
    "seniority": "Mid",
    "role_family": "Design_UX"
  },
  {
    "id": "bdr_bd_associate",
    "title": "BDR / BD Associate",
    "alternate_titles": [
      "BDR",
      "BD Associate",
      "Junior Business Development",
      "Partnerships Associate"
    ],
    "seniority": "Entry",
    "role_family": "BD_Partnerships"
  },
  {
    "id": "business_development_manager",
    "title": "Business Development Manager",
    "alternate_titles": [
      "BD Manager",
      "Business Development Lead",
      "Senior BD Manager"
    ],
    "seniority": "Mid",
    "role_family": "BD_Partnerships"
  },
  {
    "id": "partnerships_manager",
    "title": "Partnerships Manager",
    "alternate_titles": [
      "Senior Partnerships Manager",
      "Strategic Partnerships Manager"
    ],
    "seniority": "Mid",
    "role_family": "BD_Partnerships"
  },
  {
    "id": "senior_bd_manager_strategic_partnerships",
    "title": "Senior BD Manager / Strategic Partnerships Manager",
    "alternate_titles": [
      "Senior BD Manager",
      "Strategic Partnerships Lead",
      "Director of Strategic Partnerships"
    ],
    "seniority": "Senior",
    "role_family": "BD_Partnerships"
  },
  {
    "id": "head_of_bd_head_of_partnerships",
    "title": "Head of BD / Head of Partnerships",
    "alternate_titles": [
      "VP Business Development",
      "Head of Partnerships",
      "VP Partnerships"
    ],
    "seniority": "Director_Head",
    "role_family": "BD_Partnerships"
  },
  {
    "id": "vp_business_development",
    "title": "VP Business Development",
    "alternate_titles": [
      "VP BD",
      "Chief Business Development Officer",
      "Chief Partnerships Officer"
    ],
    "seniority": "VP_Executive",
    "role_family": "BD_Partnerships"
  },
  {
    "id": "junior_consultant_analyst",
    "title": "Junior Consultant / Analyst",
    "alternate_titles": [
      "Analyst (consulting)",
      "Junior Business Analyst (consulting)"
    ],
    "seniority": "Entry",
    "role_family": "Consulting"
  },
  {
    "id": "consultant",
    "title": "Consultant",
    "alternate_titles": [
      "Senior Consultant",
      "Mid-Level Consultant",
      "Engagement Manager"
    ],
    "seniority": "Mid",
    "role_family": "Consulting"
  },
  {
    "id": "senior_consultant",
    "title": "Senior Consultant",
    "alternate_titles": [
      "Engagement Manager",
      "Project Leader",
      "Senior Manager (consulting)"
    ],
    "seniority": "Senior",
    "role_family": "Consulting"
  },
  {
    "id": "consulting_manager",
    "title": "Manager / Engagement Manager",
    "alternate_titles": [
      "Engagement Director",
      "Principal",
      "Senior Manager (consulting)"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Consulting"
  },
  {
    "id": "principal_director_consulting",
    "title": "Principal / Director of Consulting",
    "alternate_titles": [
      "Partner",
      "Principal",
      "Director (consulting)"
    ],
    "seniority": "Director_Head",
    "role_family": "Consulting"
  },
  {
    "id": "solutions_engineer_junior",
    "title": "Junior Solutions Engineer",
    "alternate_titles": [
      "Junior Solutions Engineer",
      "Junior Pre-Sales Engineer",
      "Associate SE"
    ],
    "seniority": "Entry",
    "role_family": "Solutions_Engineering"
  },
  {
    "id": "solutions_engineer",
    "title": "Solutions Engineer",
    "alternate_titles": [
      "Solutions Engineer",
      "Pre-Sales Engineer",
      "Sales Engineer",
      "SE"
    ],
    "seniority": "Mid",
    "role_family": "Solutions_Engineering"
  },
  {
    "id": "senior_solutions_engineer",
    "title": "Senior Solutions Engineer",
    "alternate_titles": [
      "Senior SE",
      "Senior Pre-Sales Engineer",
      "Staff Solutions Engineer",
      "Lead Solutions Engineer"
    ],
    "seniority": "Senior",
    "role_family": "Solutions_Engineering"
  },
  {
    "id": "solutions_engineering_manager",
    "title": "Solutions Engineering Manager",
    "alternate_titles": [
      "SE Manager",
      "Pre-Sales Manager",
      "Solutions Engineering Team Lead",
      "Manager, Solutions Engineering"
    ],
    "seniority": "Lead_Manager",
    "role_family": "Solutions_Engineering"
  },
  {
    "id": "head_of_solutions_engineering",
    "title": "Head of Solutions Engineering",
    "alternate_titles": [
      "VP Solutions Engineering",
      "Director of Solutions Engineering",
      "Head of Pre-Sales"
    ],
    "seniority": "Director_Head",
    "role_family": "Solutions_Engineering"
  },
  {
    "id": "it_support_specialist",
    "title": "IT Support Specialist / Helpdesk",
    "alternate_titles": [
      "IT Support Engineer",
      "Junior IT Specialist",
      "Help Desk Specialist"
    ],
    "seniority": "Entry",
    "role_family": "IT_Security"
  },
  {
    "id": "it_administrator_sysadmin",
    "title": "IT Administrator / SysAdmin",
    "alternate_titles": [
      "IT Administrator",
      "SysAdmin",
      "Senior IT Specialist",
      "IT Engineer"
    ],
    "seniority": "Mid",
    "role_family": "IT_Security"
  },
  {
    "id": "it_manager",
    "title": "IT Manager",
    "alternate_titles": [
      "Senior IT Manager",
      "IT Operations Manager",
      "Director of IT"
    ],
    "seniority": "Lead_Manager",
    "role_family": "IT_Security"
  },
  {
    "id": "security_analyst_soc",
    "title": "Security Analyst / SOC Analyst",
    "alternate_titles": [
      "Security Analyst",
      "SOC Analyst",
      "Tier 2 Security Analyst",
      "Senior Security Analyst"
    ],
    "seniority": "Mid",
    "role_family": "IT_Security"
  },
  {
    "id": "grc_analyst",
    "title": "GRC Analyst",
    "alternate_titles": [
      "GRC Specialist",
      "Security Compliance Analyst",
      "Risk Analyst"
    ],
    "seniority": "Mid",
    "role_family": "IT_Security"
  },
  {
    "id": "head_of_it",
    "title": "Head of IT",
    "alternate_titles": [
      "VP IT",
      "Director of IT",
      "CIO (smaller orgs)"
    ],
    "seniority": "Director_Head",
    "role_family": "IT_Security"
  },
  {
    "id": "ciso_head_of_security",
    "title": "CISO / Head of Security",
    "alternate_titles": [
      "CISO",
      "Chief Information Security Officer",
      "VP Security",
      "Head of Security"
    ],
    "seniority": "VP_Executive",
    "role_family": "IT_Security"
  },
  {
    "id": "executive_assistant",
    "title": "Executive Assistant",
    "alternate_titles": [
      "EA",
      "Senior Executive Assistant",
      "Chief of Staff (junior)"
    ],
    "seniority": "Mid",
    "role_family": "Admin_GA"
  },
  {
    "id": "office_manager",
    "title": "Office Manager",
    "alternate_titles": [
      "Senior Office Manager",
      "Workplace Manager",
      "Office Operations Manager"
    ],
    "seniority": "Mid",
    "role_family": "Admin_GA"
  },
  {
    "id": "operations_coordinator",
    "title": "Operations Coordinator",
    "alternate_titles": [
      "Junior Operations Coordinator",
      "Office Operations Coordinator"
    ],
    "seniority": "Entry",
    "role_family": "Admin_GA"
  },
  {
    "id": "procurement_specialist",
    "title": "Procurement / Vendor Management Specialist",
    "alternate_titles": [
      "Procurement Manager",
      "Senior Procurement Specialist",
      "Vendor Manager"
    ],
    "seniority": "Mid",
    "role_family": "Admin_GA"
  },
  {
    "id": "facilities_manager",
    "title": "Facilities Manager",
    "alternate_titles": [
      "Senior Facilities Manager",
      "Workplace Facilities Manager"
    ],
    "seniority": "Mid",
    "role_family": "Admin_GA"
  },
  {
    "id": "head_of_admin_ga",
    "title": "Head of Admin / G&A Operations Manager",
    "alternate_titles": [
      "Director of Administration",
      "Head of Workplace",
      "VP G&A"
    ],
    "seniority": "Director_Head",
    "role_family": "Admin_GA"
  },
  {
    "id": "customer_success_specialist",
    "title": "Customer Success Specialist",
    "alternate_titles": [
      "CS Specialist",
      "Junior Customer Success Manager",
      "CS Associate"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Relationship_Growth"
  },
  {
    "id": "financial_analyst",
    "title": "Financial Analyst",
    "alternate_titles": [
      "Junior Financial Analyst",
      "Finance Analyst",
      "Junior FP&A Analyst"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Finance"
  },
  {
    "id": "operations_analyst",
    "title": "Operations Analyst",
    "alternate_titles": [
      "Junior Business Analyst",
      "Operations Analyst",
      "Business Operations Analyst",
      "Operations Manager"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Operations"
  },
  {
    "id": "hr_coordinator",
    "title": "HR Coordinator",
    "alternate_titles": [
      "People Coordinator",
      "Junior HR Generalist",
      "HR Operations Coordinator"
    ],
    "seniority": "Entry",
    "role_family": "HR_People"
  },
  {
    "id": "talent_acquisition_specialist",
    "title": "Talent Acquisition Specialist",
    "alternate_titles": [
      "TA Specialist",
      "Senior Recruiter",
      "Technical Recruiter",
      "Recruiter"
    ],
    "seniority": "Mid",
    "role_family": "HR_People"
  },
  {
    "id": "marketing_assistant",
    "title": "Marketing Assistant",
    "alternate_titles": [
      "Marketing Associate",
      "Junior Marketing Assistant"
    ],
    "seniority": "Entry",
    "role_family": "Marketing"
  },
  {
    "id": "sales_representative",
    "title": "Sales Representative",
    "alternate_titles": [
      "Inside Sales Rep",
      "Sales Specialist",
      "Account Specialist",
      "Inside Sales Representative"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Sales"
  },
  {
    "id": "brand_manager",
    "title": "Brand Manager",
    "alternate_titles": [
      "Senior Brand Manager",
      "Brand Marketing Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "event_coordinator",
    "title": "Event Coordinator",
    "alternate_titles": [
      "Junior Event Manager",
      "Event Operations Coordinator"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Marketing"
  },
  {
    "id": "partnerships_associate",
    "title": "Partnerships Associate",
    "alternate_titles": [
      "Partnerships Coordinator",
      "Junior Partnerships Manager"
    ],
    "seniority": "Entry",
    "role_family": "BD_Partnerships"
  },
  {
    "id": "junior_business_analyst",
    "title": "Junior Business Analyst",
    "alternate_titles": [
      "Junior BA",
      "Business Analyst (Entry)",
      "Operations Analyst"
    ],
    "seniority": "Entry",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "marketing_intern",
    "title": "Marketing Intern",
    "alternate_titles": [
      "Marketing Intern",
      "Junior Marketing Intern",
      "Marketing Trainee"
    ],
    "seniority": "Entry",
    "role_family": "Marketing"
  },
  {
    "id": "hr_assistant",
    "title": "HR Assistant",
    "alternate_titles": [
      "HR Coordinator",
      "HR Associate",
      "People Assistant"
    ],
    "seniority": "Entry",
    "role_family": "HR_People"
  },
  {
    "id": "sales_associate",
    "title": "Sales Associate",
    "alternate_titles": [
      "Junior Sales Associate",
      "Sales Coordinator",
      "Inside Sales Associate"
    ],
    "seniority": "Entry",
    "role_family": "Sales"
  },
  {
    "id": "social_media_coordinator",
    "title": "Social Media Coordinator",
    "alternate_titles": [
      "Junior Social Media Manager",
      "Social Coordinator"
    ],
    "seniority": "Entry",
    "role_family": "Marketing"
  },
  {
    "id": "recruitment_coordinator",
    "title": "Recruitment Coordinator",
    "alternate_titles": [
      "TA Coordinator",
      "Talent Coordinator",
      "Hiring Coordinator"
    ],
    "seniority": "Entry",
    "role_family": "HR_People"
  },
  {
    "id": "business_operations_associate",
    "title": "Business Operations Associate",
    "alternate_titles": [
      "BizOps Associate",
      "Business Operations Coordinator",
      "Junior Operations Associate"
    ],
    "seniority": "Entry",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "strategy_analyst",
    "title": "Strategy Analyst",
    "alternate_titles": [
      "Strategy Associate",
      "Strategy & Operations Analyst",
      "Business Strategy Analyst"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Consulting"
  },
  {
    "id": "management_consultant",
    "title": "Management Consultant",
    "alternate_titles": [
      "Management Consultant",
      "Senior Management Consultant",
      "Strategy Consultant"
    ],
    "seniority": "Mid",
    "role_family": "Consulting"
  },
  {
    "id": "junior_consultant",
    "title": "Junior Consultant",
    "alternate_titles": [
      "Associate Consultant",
      "Junior Analyst (consulting)",
      "Business Analyst (consulting)"
    ],
    "seniority": "Entry",
    "role_family": "Consulting"
  },
  {
    "id": "operations_associate",
    "title": "Operations Associate",
    "alternate_titles": [
      "Junior Operations Associate",
      "Operations Coordinator"
    ],
    "seniority": "Entry",
    "role_family": "Operations"
  },
  {
    "id": "event_manager",
    "title": "Event Manager",
    "alternate_titles": [
      "Senior Event Manager",
      "Field Marketing Manager",
      "Event Marketing Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "technical_support_specialist",
    "title": "Technical Support Specialist",
    "alternate_titles": [
      "Junior Technical Support Engineer",
      "Tier 2 Technical Support"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Support"
  },
  {
    "id": "solutions_consultant",
    "title": "Solutions Consultant",
    "alternate_titles": [
      "Senior Solutions Consultant",
      "Implementation Consultant",
      "Technical Consultant"
    ],
    "seniority": "Mid",
    "role_family": "Solutions_Engineering"
  },
  {
    "id": "pre_sales_engineer",
    "title": "Pre-Sales Engineer",
    "alternate_titles": [
      "Sales Engineer",
      "Solutions Engineer",
      "Technical Sales Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Solutions_Engineering"
  },
  {
    "id": "growth_analyst",
    "title": "Growth Analyst",
    "alternate_titles": [
      "Junior Growth Analyst",
      "Growth Marketing Analyst",
      "Growth Associate"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Marketing"
  },
  {
    "id": "revenue_analyst",
    "title": "Revenue Analyst",
    "alternate_titles": [
      "Revenue Operations Analyst",
      "Junior RevOps Analyst",
      "GTM Analyst"
    ],
    "seniority": "Entry_Mid",
    "role_family": "RevOps_BizOps"
  },
  {
    "id": "demand_generation_manager",
    "title": "Demand Generation Manager",
    "alternate_titles": [
      "Demand Gen Manager",
      "Pipeline Marketing Manager",
      "Senior Demand Generation Manager"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "legal_counsel",
    "title": "Legal Counsel",
    "alternate_titles": [
      "In-House Counsel",
      "Corporate Counsel",
      "Commercial Counsel",
      "Senior Commercial Counsel",
      "VP Legal"
    ],
    "seniority": "Mid",
    "role_family": "Legal_Compliance"
  },
  {
    "id": "senior_legal_counsel",
    "title": "Senior Legal Counsel",
    "alternate_titles": [
      "Senior Commercial Counsel",
      "Senior Corporate Counsel",
      "Experienced Legal Counsel"
    ],
    "seniority": "Senior",
    "role_family": "Admin_GA"
  },
  {
    "id": "vp_legal",
    "title": "VP Legal",
    "alternate_titles": [
      "General Counsel",
      "Chief Legal Officer",
      "CLO",
      "Head of Legal"
    ],
    "seniority": "VP_Executive",
    "role_family": "Admin_GA"
  },
  {
    "id": "paralegal",
    "title": "Paralegal",
    "alternate_titles": [
      "Legal Specialist",
      "Legal Operations Specialist",
      "Insurance Litigation Paralegal"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Legal_Compliance"
  },
  {
    "id": "compliance_counsel",
    "title": "Compliance Counsel",
    "alternate_titles": [
      "Privacy Counsel",
      "Global Privacy Counsel",
      "Privacy & Compliance Counsel",
      "Regulatory Counsel",
      "Crypto Product Compliance Lead",
      "Compliance Communications Team Lead",
      "Compliance Lead"
    ],
    "seniority": "Mid",
    "role_family": "Legal_Compliance"
  },
  {
    "id": "bookkeeper",
    "title": "Bookkeeper",
    "alternate_titles": [
      "AP/AR Bookkeeper",
      "Junior Bookkeeper",
      "Bookkeeper / AP Accountant",
      "Subsidiaries Bookkeeper"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Finance"
  },
  {
    "id": "senior_bookkeeper",
    "title": "Senior Bookkeeper",
    "alternate_titles": [
      "Lead Bookkeeper",
      "Corporate Bookkeeper",
      "Senior AP/AR Bookkeeper"
    ],
    "seniority": "Senior",
    "role_family": "Finance"
  },
  {
    "id": "payroll_accountant",
    "title": "Payroll Accountant",
    "alternate_titles": [
      "Payroll Specialist",
      "Senior Payroll Accountant",
      "Global Payroll Accountant"
    ],
    "seniority": "Mid",
    "role_family": "Finance"
  },
  {
    "id": "ai_creative_specialist",
    "title": "AI Creative Specialist",
    "alternate_titles": [
      "AI Content Creator",
      "AI Creative Expert",
      "AI Video Creator",
      "Generative AI Technologist",
      "Visual GenAI Solutions Specialist",
      "AI-Native Product Builder"
    ],
    "seniority": "Mid",
    "role_family": "Marketing"
  },
  {
    "id": "threat_hunter",
    "title": "Threat Hunter",
    "alternate_titles": [
      "Threat Detection Researcher",
      "Vulnerability Researcher",
      "Threat Intelligence Analyst",
      "Security Researcher"
    ],
    "seniority": "Mid",
    "role_family": "IT_Security"
  },
  {
    "id": "devsecops_engineer",
    "title": "DevSecOps Engineer",
    "alternate_titles": [
      "DevSecOps",
      "Security DevOps Engineer",
      "Application Security Engineer",
      "Product Security Engineer"
    ],
    "seniority": "Mid",
    "role_family": "IT_Security"
  },
  {
    "id": "incident_response_engineer",
    "title": "Incident Response Engineer",
    "alternate_titles": [
      "Incident Response Expert",
      "IR Engineer",
      "Cyber Incident Responder",
      "DFIR Engineer"
    ],
    "seniority": "Mid",
    "role_family": "IT_Security"
  },
  {
    "id": "sales_enablement_manager",
    "title": "Sales Enablement Manager",
    "alternate_titles": [
      "Revenue Enablement Manager",
      "Sales Enablement Program Manager",
      "GTM Enablement Manager"
    ],
    "seniority": "Mid",
    "role_family": "Sales"
  },
  {
    "id": "customer_success_operations",
    "title": "Customer Success Operations Manager",
    "alternate_titles": [
      "CS Operations Manager",
      "CS Ops Manager",
      "Customer Success Operations",
      "Senior CS Operations Manager (manager-level)"
    ],
    "seniority": "Mid",
    "role_family": "Operations"
  },
  {
    "id": "renewals_manager",
    "title": "Renewals Manager",
    "alternate_titles": [
      "Customer Renewals Manager",
      "Renewals Specialist (senior)",
      "Retention Manager"
    ],
    "seniority": "Mid",
    "role_family": "Relationship_Growth"
  },
  {
    "id": "compliance_analyst",
    "title": "Compliance Analyst",
    "alternate_titles": [
      "KYC Analyst",
      "AML Analyst",
      "Compliance Specialist",
      "Regulatory Compliance Analyst"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Legal_Compliance"
  },
  {
    "id": "chief_compliance_officer",
    "title": "Chief Compliance Officer",
    "alternate_titles": [
      "CCO",
      "Head of Compliance",
      "VP Compliance",
      "Chief Compliance Officer, RHD"
    ],
    "seniority": "VP_Executive",
    "role_family": "Legal_Compliance"
  },
  {
    "id": "security_researcher",
    "title": "Security Researcher",
    "alternate_titles": [
      "Vulnerability Researcher",
      "Application Security Researcher",
      "iOS Vulnerability Researcher",
      "Android Security Researcher",
      "Threat Hunting Researcher",
      "Cyber ML Event",
      "Security Researcher Team Lead",
      "Research Team Lead",
      "Senior Product Security Low-Level Researcher",
      "Senior Product Security Researcher",
      "Senior Product Security Architect",
      "Applied Algorithms & Operational Researcher",
      "Technical Policy Researcher",
      "Android Security Research Team Lead"
    ],
    "seniority": "Mid",
    "role_family": "IT_Security"
  },
  {
    "id": "research_scientist",
    "title": "Research Scientist",
    "alternate_titles": [
      "Research Engineer",
      "Applied Research Scientist",
      "Senior Research Scientist",
      "Research Scientist - LTX Model Applications",
      "Research Scientist – LTX Model Evaluation",
      "Microbiology Research Lead",
      "Member of Technical Staff",
      "Head of Research",
      "Quantum Optics Student",
      "Photonic Architect Student",
      "Applied Physics and Electro-Optics Intern",
      "Physics student"
    ],
    "seniority": "Mid",
    "role_family": "Research_Science"
  },
  {
    "id": "medical_science_liaison",
    "title": "Medical Science Liaison",
    "alternate_titles": [
      "MSL",
      "Clinical Science Liaison",
      "Scientific Affairs Liaison",
      "CTA - Intern",
      "Clinical Trial Associate"
    ],
    "seniority": "Mid",
    "role_family": "Research_Science"
  },
  {
    "id": "process_engineer",
    "title": "Process Engineer",
    "alternate_titles": [
      "Manufacturing Process Engineer",
      "Production Process Engineer",
      "Industrial Process Engineer",
      "Industrial Engineer",
      "מהנדס/ת תהליך",
      "מהנדס/ת תהליך לאתר המגנזיום",
      "Communication Algorithms Engineer",
      "Process Engineer - Magnesium Site"
    ],
    "seniority": "Mid",
    "role_family": "Manufacturing_Operations"
  },
  {
    "id": "manufacturing_quality_engineer",
    "title": "Manufacturing Quality Engineer",
    "alternate_titles": [
      "Quality Engineer",
      "Design Assurance Engineer",
      "Class III Quality Engineer",
      "NPD Quality & Compliance Engineer",
      "Supplier Quality Engineer",
      "Production Quality Engineer",
      "Senior Manufacturing Quality Engineer",
      "QA Engineer (Manufacturing)",
      "Supplier quality engineer"
    ],
    "seniority": "Mid",
    "role_family": "Manufacturing_Operations"
  },
  {
    "id": "quality_control_technician",
    "title": "Quality Control Technician",
    "alternate_titles": [
      "QC Technician",
      "QA Technician",
      "QC Analyst",
      "QC Student",
      "QA LabOps Engineer",
      "Content QA Analyst",
      "Manual QA Tester",
      "Mid-level Manual SW/System tester",
      "QA Tester"
    ],
    "seniority": "Entry_Mid",
    "role_family": "Manufacturing_Operations"
  },
  {
    "id": "production_technician",
    "title": "Production Technician",
    "alternate_titles": [
      "Production Operator",
      "Manufacturing Technician",
      "Production Technician – Clean Room",
      "Aeronautics Structural Builder",
      "Wiring Technician",
      "Materials Project Engineer",
      "Electronic Engineering Technician",
      "מבנאי.ת",
      "חווט.ת",
      "מלחימ.ה",
      "מפעיל/ה",
      "מפעיל צמ\"כ חומר גלם",
      "מפעיל/ה צוות הכנות- ייצור סטרילי"
    ],
    "seniority": "Entry",
    "role_family": "Manufacturing_Operations"
  },
  {
    "id": "hardware_engineer",
    "title": "Hardware Engineer",
    "alternate_titles": [
      "Electrical Engineer",
      "Firmware Engineer",
      "Embedded Engineer",
      "FPGA Engineer",
      "ASIC Engineer",
      "Verification Engineer",
      "Silicon Engineer",
      "PHY System Engineer",
      "PHY System Team Leader",
      "Photonic Architect",
      "WiFi Firmware PHY Engineering Student",
      "Verification Student for the SoC group",
      "Software Verification Engineer, DOCA",
      "Senior Product Quality and Reliability Engineer"
    ],
    "seniority": "Mid",
    "role_family": "Engineering"
  }
];
