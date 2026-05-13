export const courseRecommendationLogic = {
  "name": "course_recommendation_logic",
  "version": "v1",
  "last_updated": "2026-04-13",
  "description": "Recommends courses and projects to help users close structured skill gaps, improve readiness, and progress toward their target roles without replacing real job-search action.",
  "core_principles": {
    "1": "Courses are recommended only for structured skills (technical, tools, frameworks).",
    "2": "Behavioral or strategic gaps should be solved with tasks, not courses.",
    "3": "Courses should support job readiness, not delay action.",
    "4": "Projects should be recommended alongside courses when practical application is needed.",
    "5": "Recommendations should feel real, relevant, and personalized."
  },
  "inputs": {
    "profile_inputs": [
      "primary_domain",
      "target_job_titles",
      "skill_gaps",
      "readiness_score",
      "proof_signals"
    ],
    "user_inputs": [
      "employment_status",
      "five_year_role"
    ],
    "system_inputs": [
      "job_search_stage"
    ]
  },
  "skill_gap_classification": {
    "structured_skills": [
      "technical_skills",
      "tools_usage",
      "data_skills",
      "engineering_skills",
      "analytics",
      "frameworks",
      "certifications"
    ],
    "non_structured_skills": [
      "networking",
      "storytelling",
      "positioning",
      "confidence",
      "job_search_strategy"
    ],
    "rule": "Only structured skills trigger course recommendations."
  },
  "recommendation_types": {
    "course_only": {
      "when": [
        "clear structured skill gap exists",
        "skill can be learned via course alone"
      ]
    },
    "course_plus_project": {
      "when": [
        "skill requires demonstration",
        "user needs proof (portfolio/project)",
        "gap is blocking Tier 1 readiness"
      ]
    },
    "project_only": {
      "when": [
        "user is unemployed",
        "user needs fast proof of ability",
        "course alone is insufficient"
      ]
    }
  },
  "stage_adaptation": {
    "not_started": {
      "focus": [
        "foundational courses",
        "clarity-building learning"
      ]
    },
    "early_search": {
      "focus": [
        "light skill improvement",
        "support applications"
      ]
    },
    "applying_no_response": {
      "focus": [
        "skill gaps affecting CV strength",
        "portfolio projects"
      ]
    },
    "interview_stage_blocked": {
      "focus": [
        "interview-specific knowledge",
        "case practice"
      ]
    },
    "late_stage_no_offer": {
      "focus": [
        "advanced domain knowledge",
        "closing gaps"
      ]
    },
    "transitioning_while_employed": {
      "focus": [
        "certifications",
        "structured upskilling"
      ]
    }
  },
  "employment_context_rules": {
    "unemployed": {
      "priority": [
        "projects",
        "job readiness",
        "fast skill acquisition"
      ],
      "rule": "Prioritize projects and practical output over long courses."
    },
    "employed": {
      "priority": [
        "certifications",
        "deep learning",
        "gradual transition"
      ],
      "rule": "User has time to invest in structured courses."
    }
  },
  "course_selection_criteria": {
    "match_to_skill_gap": "must directly map to missing skill",
    "level_match": "beginner | intermediate | advanced based on user readiness",
    "duration_preference": "short to medium unless deep skill required",
    "language": "english",
    "certificate": "optional",
    "relevance_score": "based on role alignment"
  },
  "course_sources": [
    "udemy",
    "coursera",
    "udacity",
    "edx",
    "google_certificates",
    "alison",
    "linkedin_learning"
  ],
  "filtering_preferences": {
    "price": "both free and paid",
    "duration": "both short and long",
    "level": "match user level",
    "language": "english",
    "certificate": "optional"
  },
  "anti_overlearning_rules": {
    "rule": "Do not over-recommend courses when action is more important.",
    "limits": [
      "max 1-2 course recommendations at a time",
      "prioritize tasks if user lacks execution",
      "avoid stacking multiple long courses"
    ]
  },
  "project_generation_rules": {
    "rule": "When skill requires proof, suggest a project alongside or instead of a course.",
    "examples": [
      "build a dashboard using real dataset",
      "create a product case study",
      "analyze dataset and present insights",
      "build a small app or feature"
    ]
  },
  "selection_logic": [
    "Step 1: Identify structured skill gaps",
    "Step 2: Filter out non-structured gaps",
    "Step 3: Check if gap blocks Tier 1 readiness",
    "Step 4: Determine recommendation type (course, project, or both)",
    "Step 5: Adjust based on job_search_stage",
    "Step 6: Adjust based on employment_status",
    "Step 7: Apply anti-overlearning rules",
    "Step 8: Return minimal high-impact recommendations"
  ],
  "output_structure": {
    "recommendations": [
      {
        "type": "course | project | course_plus_project",
        "title": "string",
        "provider": "string",
        "skills_targeted": [
          "array"
        ],
        "level": "beginner | intermediate | advanced",
        "duration": "string",
        "reason": "why this is recommended",
        "priority": "high | medium | low"
      }
    ]
  }
} as const;
