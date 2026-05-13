export const proofSignalExtractionLogic = {
  "name": "proof_signal_extraction_logic",
  "version": "v4",
  "last_updated": "2026-04-12",
  "description": "Extracts proof signals from CVs, onboarding text, LinkedIn, and experience entries using action, ownership depth, impact, scale, growth velocity, environment, domain detection, adjacent-field potential, and structure quality.",
  "strength_rules": {
    "strong": [
      "led",
      "owned",
      "managed",
      "built",
      "created",
      "launched",
      "implemented",
      "developed",
      "delivered",
      "designed and executed"
    ],
    "medium": [
      "worked with",
      "responsible for",
      "handled",
      "contributed to",
      "participated in",
      "coordinated",
      "supported end-to-end"
    ],
    "weak": [
      "assisted",
      "helped",
      "supported"
    ],
    "very_weak": [
      "familiar with",
      "exposed to",
      "learned about"
    ]
  },
  "ownership_depth_rules": {
    "high": [
      "end-to-end",
      "from start to finish",
      "from ideation to launch",
      "from initialization to MVP",
      "owned",
      "independently",
      "solely responsible"
    ],
    "medium": [
      "managed",
      "coordinated",
      "executed",
      "delivered"
    ],
    "low": [
      "supported",
      "assisted",
      "helped"
    ]
  },
  "priority_signal_groups": {
    "high_priority": [
      "ownership",
      "execution",
      "responsibility",
      "domain_detection",
      "adjacent_field_potential",
      "impact",
      "scale",
      "real_world_application"
    ],
    "medium_priority": [
      "complexity",
      "cross_functional_work",
      "tools_usage",
      "project_involvement",
      "technical_skills",
      "environment",
      "growth_velocity"
    ],
    "low_priority": [
      "generic_soft_skills"
    ]
  },
  "pattern_detection": {
    "ownership": {
      "keywords": [
        "led",
        "managed",
        "owned",
        "head of",
        "responsible for"
      ],
      "maps_to_signals": [
        "leadership",
        "ownership"
      ]
    },
    "execution": {
      "keywords": [
        "built",
        "created",
        "launched",
        "implemented",
        "developed",
        "executed",
        "delivered"
      ],
      "maps_to_signals": [
        "execution",
        "initiative"
      ]
    },
    "initiative": {
      "keywords": [
        "initiated",
        "founded",
        "created from scratch",
        "built independently",
        "self-started",
        "launched own",
        "side project"
      ],
      "maps_to_signals": [
        "initiative",
        "ownership"
      ]
    },
    "customer_work": {
      "keywords": [
        "customer",
        "client",
        "user",
        "onboarding",
        "support",
        "retention",
        "success",
        "account"
      ],
      "maps_to_signals": [
        "customer_communication",
        "customer_relationship_management"
      ]
    },
    "cross_functional": {
      "keywords": [
        "cross-functional",
        "collaborated",
        "worked with product",
        "worked with engineering",
        "worked with design",
        "stakeholders"
      ],
      "maps_to_signals": [
        "cross_functional_collaboration",
        "stakeholder_management"
      ]
    },
    "tools_usage": {
      "keywords": [
        "salesforce",
        "excel",
        "sql",
        "python",
        "hubspot",
        "tableau",
        "zendesk",
        "matlab",
        "power bi",
        "jira",
        "figma"
      ],
      "maps_to_signals": [
        "tools_usage",
        "technical_application"
      ]
    },
    "technical_work": {
      "keywords": [
        "api",
        "backend",
        "frontend",
        "data analysis",
        "machine learning",
        "system design",
        "pipeline",
        "automation",
        "embedded"
      ],
      "maps_to_signals": [
        "technical_skills",
        "problem_solving"
      ]
    },
    "project_execution": {
      "keywords": [
        "project",
        "program",
        "initiative",
        "rollout",
        "implementation"
      ],
      "maps_to_signals": [
        "project_management",
        "execution"
      ]
    },
    "impact": {
      "keywords": [
        "improved",
        "increased",
        "reduced",
        "grew",
        "boosted",
        "%",
        "efficiency",
        "accuracy",
        "performance",
        "users",
        "revenue"
      ],
      "maps_to_signals": [
        "impact",
        "performance_improvement"
      ]
    },
    "complexity": {
      "keywords": [
        "algorithm",
        "signal processing",
        "architecture",
        "embedded systems",
        "optimization",
        "analysis pipeline",
        "multi-step"
      ],
      "maps_to_signals": [
        "complex_problem_solving",
        "advanced_execution"
      ]
    },
    "environment": {
      "keywords": [
        "real-time",
        "production",
        "live environment",
        "alerts",
        "threat",
        "risk",
        "high-volume",
        "mission-critical"
      ],
      "maps_to_signals": [
        "high_stakes_environment",
        "operational_readiness"
      ]
    },
    "scale_detection": {
      "keywords": [
        "team of",
        "users",
        "customers",
        "$",
        "million",
        "thousand",
        "100k",
        "5+ teams",
        "global",
        "large-scale"
      ],
      "maps_to_signals": [
        "scale",
        "impact_scope"
      ]
    },
    "growth_velocity": {
      "keywords": [
        "promoted",
        "within",
        "quickly",
        "fast-track",
        "accelerated",
        "rapidly"
      ],
      "maps_to_signals": [
        "high_performance",
        "growth_speed"
      ]
    },
    "elite_environment": {
      "keywords": [
        "commander",
        "combat",
        "war",
        "intelligence",
        "captain",
        "unit 8200",
        "mission-critical operations"
      ],
      "maps_to_signals": [
        "high_pressure_leadership",
        "elite_training"
      ]
    }
  },
  "domain_detection": {
    "primary_domain_rules": {
      "software_engineering": [
        "backend",
        "frontend",
        "api",
        "software engineer",
        "developer",
        "system design",
        "production systems"
      ],
      "data_analytics": [
        "sql",
        "tableau",
        "power bi",
        "data analysis",
        "forecasting",
        "reporting",
        "dashboards"
      ],
      "cybersecurity": [
        "siem",
        "soc",
        "threat",
        "security",
        "incident",
        "risk monitoring"
      ],
      "product": [
        "product",
        "roadmap",
        "feature",
        "user research",
        "prioritization",
        "requirements"
      ],
      "project_management": [
        "project management",
        "delivery",
        "coordination",
        "timeline",
        "stakeholders",
        "implementation"
      ],
      "business_operations": [
        "operations",
        "process improvement",
        "workflow",
        "business analysis",
        "strategy",
        "execution"
      ],
      "customer_success": [
        "onboarding",
        "retention",
        "adoption",
        "renewals",
        "customer success",
        "account management"
      ],
      "sales": [
        "pipeline",
        "prospecting",
        "sales development",
        "closing",
        "outreach",
        "revenue"
      ],
      "marketing": [
        "campaign",
        "growth",
        "content",
        "seo",
        "brand",
        "acquisition",
        "community"
      ],
      "finance": [
        "financial analysis",
        "valuation",
        "budgeting",
        "forecasting",
        "p&l",
        "investment"
      ],
      "ux_design": [
        "wireframes",
        "user flows",
        "prototyping",
        "figma",
        "usability",
        "design systems"
      ]
    },
    "classification_rules": {
      "minimum_keyword_matches_for_primary_domain": 2,
      "experience_title_match_boost": 0.2,
      "tools_match_boost": 0.15,
      "project_match_boost": 0.1
    }
  },
  "adjacent_field_potential": {
    "description": "Detects fields the user could plausibly transition into based on transferable signals.",
    "rules": [
      {
        "if_signals_present": [
          "cross_functional_collaboration",
          "execution",
          "stakeholder_management"
        ],
        "possible_fields": [
          "project_management",
          "business_operations",
          "product_operations"
        ]
      },
      {
        "if_signals_present": [
          "customer_communication",
          "ownership",
          "customer_relationship_management"
        ],
        "possible_fields": [
          "customer_success",
          "account_management",
          "implementation"
        ]
      },
      {
        "if_signals_present": [
          "data_analysis",
          "tools_usage",
          "problem_solving"
        ],
        "possible_fields": [
          "data_analytics",
          "business_operations",
          "product_analytics"
        ]
      },
      {
        "if_signals_present": [
          "technical_skills",
          "execution",
          "initiative"
        ],
        "possible_fields": [
          "software_engineering",
          "solutions_engineering",
          "technical_product"
        ]
      },
      {
        "if_signals_present": [
          "initiative",
          "project_management",
          "customer_communication"
        ],
        "possible_fields": [
          "product",
          "product_operations",
          "founder_associate"
        ]
      }
    ]
  },
  "tool_depth_rules": {
    "single_tool_mention": {
      "confidence_modifier": 0.0
    },
    "multiple_tools_3_plus": {
      "confidence_modifier": 0.1
    },
    "multiple_tools_5_plus": {
      "confidence_modifier": 0.2
    },
    "tools_used_in_experience_section": {
      "confidence_modifier": 0.15
    }
  },
  "impact_rules": {
    "quantified_metric_detected": {
      "examples": [
        "25%",
        "60,000 users",
        "reduced time",
        "increased output",
        "improved accuracy"
      ],
      "confidence_modifier": 0.2
    },
    "unquantified_positive_impact": {
      "examples": [
        "improved process",
        "increased efficiency",
        "enhanced workflow"
      ],
      "confidence_modifier": 0.1
    },
    "activity_only": {
      "examples": [
        "conducted",
        "performed",
        "participated"
      ],
      "confidence_modifier": 0.0
    }
  },
  "scale_rules": {
    "small_scope": {
      "examples": [
        "team of 2-5",
        "dozens",
        "small client base"
      ],
      "confidence_modifier": 0.05
    },
    "medium_scope": {
      "examples": [
        "team of 6-20",
        "hundreds of users",
        "department-wide"
      ],
      "confidence_modifier": 0.1
    },
    "large_scope": {
      "examples": [
        "60 soldiers",
        "100k users",
        "$1.2m raised",
        "multi-team",
        "company-wide"
      ],
      "confidence_modifier": 0.2
    }
  },
  "growth_velocity_rules": {
    "promotion_or_fast_growth_detected": {
      "examples": [
        "promoted in 2 months",
        "rapid progression",
        "fast-tracked"
      ],
      "confidence_modifier": 0.15
    }
  },
  "environment_rules": {
    "elite_or_high_pressure_environment": {
      "examples": [
        "combat command",
        "intelligence unit",
        "mission-critical",
        "war logistics"
      ],
      "confidence_modifier": 0.15
    }
  },
  "structure_quality": {
    "well_structured": {
      "confidence_modifier": 0.05
    },
    "unclear_structure": {
      "confidence_modifier": -0.05
    },
    "rule": "Lower confidence slightly when CV structure is messy, but do not suppress valid detected signals."
  },
  "source_weighting": {
    "experience": 1.0,
    "cv_bullet": 0.9,
    "project": 0.8,
    "certification": 0.4,
    "declared_skill": 0.3
  },
  "scoring_logic": {
    "strong": 1.0,
    "medium": 0.6,
    "weak": 0.3,
    "very_weak": 0.1
  },
  "deduplication_rules": [
    "same signal detected multiple times counts once for strength but increases confidence",
    "signals from experience override declared skills",
    "quantified impact raises confidence, not base strength alone",
    "domain detection uses both title and bullet evidence",
    "adjacent field potential expands possibilities but does not override primary domain",
    "scale and elite environment increase level interpretation, not raw skill count alone"
  ],
  "output_structure": {
    "proof_signal": "string",
    "source": "experience | cv | project | certification | declared_skill",
    "strength": "strong | medium | weak | very_weak",
    "confidence_score": "0-1",
    "mapped_skills": [
      "array of skill_ids"
    ],
    "supporting_evidence": [
      "array of matched phrases"
    ],
    "primary_domain": "string",
    "adjacent_fields": [
      "array of domain_ids"
    ],
    "level_modifiers": {
      "scale": "none | small | medium | large",
      "growth_velocity": "none | present",
      "environment": "standard | high_pressure | elite"
    }
  }
} as const;
