export const goalAlignmentLogic = {
  "name": "goal_alignment_logic",
  "version": "v2",
  "last_updated": "2026-04-12",
  "description": "Scores how well a candidate role aligns with the user's long-term goal, near-term targets, realistic transition path, and adjacent-field viability.",
  "core_principles": {
    "1": "Goal alignment is not just title similarity. It measures whether a role truthfully moves the user toward their stated future.",
    "2": "Indirect paths are valid only when supported by real transferable signals or common career progression logic.",
    "3": "User preference should be respected, but the system should still surface roles where the user is objectively stronger.",
    "4": "Adjacent-field transitions should only receive meaningful alignment boosts when strong supporting evidence exists."
  },
  "inputs": {
    "user_profile": [
      "five_year_role",
      "target_job_titles",
      "target_industries",
      "open_to_lateral",
      "open_to_outside_degree"
    ],
    "candidate_role": [
      "role_title",
      "role_family",
      "role_domain",
      "role_subdomain",
      "required_skills",
      "industry_fit",
      "common_next_steps"
    ],
    "profile_context": [
      "primary_domain",
      "adjacent_fields",
      "proof_signals",
      "readiness_score",
      "strongest_domains"
    ]
  },
  "alignment_components": {
    "destination_relevance": {
      "weight": 0.35,
      "description": "How closely the candidate role relates to the user's stated 5-year goal.",
      "rules": [
        "exact goal role family = very high",
        "earlier-stage version of goal role = high",
        "adjacent role with known progression path = medium",
        "unrelated role family = low"
      ]
    },
    "path_truthfulness": {
      "weight": 0.25,
      "description": "Whether this role is a real and believable path toward the goal, not just a hopeful one.",
      "rules": [
        "clear real-world stepping stone = high",
        "possible but indirect = medium",
        "weak or unlikely bridge = low"
      ]
    },
    "field_continuity": {
      "weight": 0.15,
      "description": "Whether the role fits the user's current domain or a strongly supported adjacent field.",
      "rules": [
        "matches primary domain = high",
        "matches adjacent field with strong support = medium-high",
        "outside both = low unless user openness and strong proof signals exist"
      ]
    },
    "user_stated_interest": {
      "weight": 0.15,
      "description": "Whether the role matches titles the user explicitly wants now.",
      "rules": [
        "exact target_job_titles match = high",
        "close variant = medium-high",
        "not listed but aligned = medium",
        "not listed and weakly aligned = low"
      ]
    },
    "industry_alignment": {
      "weight": 0.1,
      "description": "Whether the role fits the user's preferred industries.",
      "rules": [
        "target industry match = high",
        "industry neutral = medium",
        "non-preferred industry = low"
      ]
    }
  },
  "indirect_path_rules": {
    "allow_indirect_paths": true,
    "rule": "Indirect paths are only valid when there is credible skill overlap, adjacent-field support, or known progression logic.",
    "examples": [
      {
        "from": "Customer Success Manager",
        "to": "Product Manager",
        "valid_when": [
          "strong customer insight",
          "cross-functional collaboration",
          "ownership",
          "product-adjacent execution"
        ]
      },
      {
        "from": "Business Operations",
        "to": "Product Operations",
        "valid_when": [
          "process ownership",
          "stakeholder management",
          "tool fluency",
          "execution strength"
        ]
      }
    ]
  },
  "modifiers": {
    "open_to_lateral": {
      "if_true": 0.04,
      "if_false": 0.0
    },
    "open_to_outside_degree": {
      "if_true": 0.04,
      "if_false": 0.0
    },
    "adjacent_field_bonus": {
      "value": 0.08,
      "applies_when": [
        "role is not in primary domain",
        "role is in adjacent_fields",
        "strong supporting proof signals exist"
      ]
    },
    "user_interest_bonus": {
      "value": 0.06,
      "applies_when": [
        "role is explicitly listed in target_job_titles"
      ]
    },
    "truth_penalty_for_weak_bridge": {
      "value": -0.15,
      "applies_when": [
        "role appears aligned on paper",
        "but there is weak evidence it leads to the 5-year goal"
      ]
    },
    "sharp_detour_penalty": {
      "value": -0.18,
      "applies_when": [
        "role is viable now",
        "but clearly pulls user away from long-term direction"
      ]
    }
  },
  "adjacent_jump_guardrails": {
    "rule": "Adjacent-field jumps should only receive medium or high alignment when very strong signals exist.",
    "minimum_conditions": [
      "at least 2 strong transferable proof signals",
      "role exists in adjacent_fields or known transition paths",
      "candidate role does not require a full career reset"
    ]
  },
  "classification_rules": {
    "high_alignment": {
      "min_score": 0.75
    },
    "medium_alignment": {
      "min_score": 0.55,
      "max_score": 0.74
    },
    "low_alignment": {
      "max_score": 0.54
    }
  },
  "decision_logic": [
    "Step 1: Identify the user's 5-year goal role family.",
    "Step 2: Compare candidate role family to the goal role family.",
    "Step 3: Evaluate whether the candidate role is a truthful path to the goal.",
    "Step 4: Check whether the role matches the user's primary domain or supported adjacent fields.",
    "Step 5: Check explicit user interest from target_job_titles.",
    "Step 6: Check target industry fit.",
    "Step 7: Apply modifiers for openness and adjacent-field evidence.",
    "Step 8: Apply penalties for unrealistic bridges or distracting detours.",
    "Step 9: Return final goal_alignment_score from 0.0 to 1.0."
  ],
  "example_interpretations": [
    {
      "user_goal": "Product Manager",
      "candidate_role": "Product Operations Associate",
      "alignment": "high",
      "reason": "Strong goal relevance and truthful stepping-stone path."
    },
    {
      "user_goal": "Product Manager",
      "candidate_role": "Customer Success Manager",
      "alignment": "medium",
      "reason": "Can be a valid path, but only with strong product-adjacent signals."
    },
    {
      "user_goal": "Finance Manager",
      "candidate_role": "Marketing Coordinator",
      "alignment": "low",
      "reason": "Viable job, but weak path truthfulness toward the stated goal."
    }
  ],
  "output_structure": {
    "goal_alignment_score": "0.0-1.0",
    "alignment_label": "high_alignment | medium_alignment | low_alignment",
    "alignment_reasoning": {
      "destination_relevance": "string",
      "path_truthfulness": "string",
      "field_continuity": "string",
      "user_interest": "string",
      "industry_alignment": "string"
    }
  }
} as const;
