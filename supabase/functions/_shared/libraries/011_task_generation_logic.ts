export const taskGenerationLogic = {
  "name": "task_generation_logic",
  "version": "v1",
  "last_updated": "2026-04-13",
  "description": "Generates personalized, practical, stage-aware career tasks designed to help users get jobs, close skill gaps, and progress toward their goals.",
  "core_principles": {
    "1": "Tasks must be real, actionable steps the user can take immediately.",
    "2": "Tasks must be personalized based on user profile, behavior, and gaps.",
    "3": "Tasks should create clarity and structure, not overwhelm.",
    "4": "Tasks should combine quick wins and high-impact actions.",
    "5": "Tasks should adapt dynamically based on user progress and stage."
  },
  "inputs": {
    "profile_inputs": [
      "primary_domain",
      "adjacent_fields",
      "proof_signals",
      "skill_gaps",
      "readiness_score",
      "goal_alignment_score"
    ],
    "user_inputs": [
      "five_year_role",
      "target_job_titles",
      "employment_status",
      "biggest_challenge",
      "role_clarity_score",
      "job_search_efforts",
      "cv_tailoring_strategy",
      "linkedin_outreach_strategy"
    ],
    "system_inputs": [
      "job_search_stage",
      "application_tracker_data",
      "interview_progress"
    ]
  },
  "task_objectives": {
    "primary_goals": [
      "get interviews",
      "close skill gaps",
      "improve positioning",
      "increase clarity",
      "build momentum"
    ],
    "priority_rule": "Tasks should focus on what is most blocking the user right now."
  },
  "stage_awareness": {
    "stages": [
      "not_started",
      "early_search",
      "applying_no_response",
      "interview_stage_blocked",
      "late_stage_no_offer",
      "transitioning_while_employed"
    ],
    "stage_task_focus": {
      "not_started": [
        "clarity",
        "cv_creation",
        "role_definition"
      ],
      "early_search": [
        "applications",
        "cv_tailoring",
        "basic_networking"
      ],
      "applying_no_response": [
        "cv_improvement",
        "positioning",
        "targeting_roles",
        "networking"
      ],
      "interview_stage_blocked": [
        "interview_prep",
        "storytelling",
        "experience framing"
      ],
      "late_stage_no_offer": [
        "closing_skills",
        "offer_strategy",
        "advanced_interviewing"
      ],
      "transitioning_while_employed": [
        "efficient_search",
        "targeted_applications",
        "strategic_networking"
      ]
    }
  },
  "task_categories": [
    "applications",
    "networking",
    "cv",
    "linkedin",
    "interview_prep",
    "skills",
    "portfolio",
    "clarity_positioning"
  ],
  "task_generation_rules": {
    "personalization": [
      "Tasks must reflect user's biggest challenge",
      "Tasks must reflect detected skill gaps",
      "Tasks must reflect job search stage",
      "Tasks must reflect domain and target roles"
    ],
    "task_structure": {
      "format": {
        "task_title": "short actionable task",
        "task_description": "what to do",
        "suggested_specific_action": "example of how to do it",
        "reason": "why this matters now",
        "category": "task category",
        "priority": "urgent_now | this_week | longer_term"
      }
    },
    "specificity_rule": "Tasks can be generalized but must include a concrete suggested action example.",
    "priority_rules": {
      "urgent_now": [
        "blocking job search",
        "critical for next step",
        "time-sensitive"
      ],
      "this_week": [
        "important but not blocking",
        "momentum-building"
      ],
      "longer_term": [
        "skill building",
        "strategic positioning"
      ]
    }
  },
  "dynamic_update_rules": {
    "application_tracker_integration": [
      "if user applies \u2192 reduce application tasks slightly",
      "if no responses \u2192 increase CV + positioning tasks",
      "if interviews increase \u2192 shift toward interview prep",
      "if offers near \u2192 shift toward closing strategy"
    ],
    "task_lifecycle": {
      "remove_tasks_when": [
        "task is completed",
        "task is no longer relevant"
      ],
      "deprioritize_tasks_when": [
        "user progresses past that stage",
        "task is less urgent"
      ]
    }
  },
  "overwhelm_handling": {
    "rule": "If user shows overwhelm signals, reduce number of tasks and prioritize highest-leverage actions.",
    "signals": [
      "low clarity score",
      "user reports overwhelm",
      "low job search activity"
    ],
    "output_adjustment": [
      "limit to top 2-3 tasks",
      "focus on quick wins",
      "remove complexity"
    ]
  },
  "task_selection_logic": [
    "Step 1: Identify job_search_stage",
    "Step 2: Identify biggest blocking factor",
    "Step 3: Identify skill gaps and readiness gaps",
    "Step 4: Map tasks to stage + gaps",
    "Step 5: Assign priority levels",
    "Step 6: Filter tasks based on overwhelm level",
    "Step 7: Return variable number of high-quality tasks"
  ],
  "difficulty_balancing": {
    "rule": "Mix quick wins with higher-impact tasks",
    "types": {
      "quick_wins": [
        "apply to roles",
        "send outreach messages",
        "fix CV bullet"
      ],
      "high_impact": [
        "build project",
        "reposition profile",
        "deep networking"
      ]
    }
  },
  "output_structure": {
    "tasks": [
      {
        "task_title": "string",
        "task_description": "string",
        "suggested_specific_action": "string",
        "reason": "string",
        "category": "string",
        "priority": "urgent_now | this_week | longer_term"
      }
    ]
  }
} as const;
