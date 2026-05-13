export const agentDecisionLogic = {
  "name": "agent_decision_logic",
  "version": "v1",
  "last_updated": "2026-04-12",
  "description": "Determines Tier 1, Tier 2, and Tier 3 role recommendations by combining readiness, goal alignment, user preference, adjacent-field viability, and role quality thresholds.",
  "core_tier_definitions": {
    "tier_1": "Best immediate next move: strong enough fit now and strongest alignment to the 5-year goal.",
    "tier_2": "Viable now, but less aligned path.",
    "tier_3": "More aligned to the long-term goal, but usually one step ahead of current readiness."
  },
  "decision_inputs": {
    "user_inputs": [
      "five_year_role",
      "target_job_titles",
      "target_industries",
      "open_to_lateral",
      "open_to_outside_degree"
    ],
    "profile_inputs": [
      "primary_domain",
      "adjacent_fields",
      "proof_signals",
      "readiness_score",
      "goal_alignment_score",
      "strongest_domains",
      "field_jump_readiness"
    ],
    "candidate_role_inputs": [
      "role_title",
      "role_family",
      "role_domain",
      "role_required_skills",
      "role_readiness_score",
      "role_goal_alignment_score",
      "role_is_user_preference",
      "role_is_best_fit",
      "role_is_adjacent_jump",
      "role_jump_comfort_level"
    ]
  },
  "weights": {
    "tier_1_formula": {
      "readiness": 0.6,
      "goal_alignment": 0.4
    },
    "tier_2_formula": {
      "readiness": 0.7,
      "goal_alignment": 0.3
    },
    "tier_3_formula": {
      "goal_alignment": 0.65,
      "readiness": 0.35
    }
  },
  "tier_rules": {
    "tier_1": {
      "requirements": [
        "role_readiness_score must be high enough for realistic immediate placement",
        "role_goal_alignment_score must be among the strongest available options",
        "role must be realistically gettable now",
        "small stretch roles are not allowed in Tier 1"
      ],
      "disqualifiers": [
        "if role is clearly one step ahead of readiness",
        "if role requires uncomfortable field jump",
        "if role is viable but not among strongest goal-aligned options"
      ]
    },
    "tier_2": {
      "requirements": [
        "role is viable now",
        "role has lower long-term alignment than Tier 1 options",
        "role may reflect a safe or practical path rather than the best future path"
      ],
      "use_case": "Roles the user could reasonably land now, but which are less directionally strong."
    },
    "tier_3": {
      "requirements": [
        "role has strong long-term alignment",
        "role is not fully realistic right now",
        "role is usually one step ahead of current readiness"
      ],
      "rule": "If a role is highly aligned but the user is not properly ready yet, it stays Tier 3."
    }
  },
  "user_preference_logic": {
    "rule": "If the user's preferred role is still viable, include it in recommendations even if another role is objectively stronger.",
    "priority_order": [
      "best-fit reality should be shown",
      "user-preferred viable roles should also be shown",
      "do not force user preference above truth if it is not viable"
    ]
  },
  "adjacent_field_logic": {
    "rule": "Adjacent-field roles are allowed only when the user can comfortably make the jump.",
    "minimum_conditions": [
      "strong transferable proof signals",
      "supported adjacent field from proof_signal_extraction_logic",
      "no full career reset required",
      "role_jump_comfort_level = comfortable"
    ],
    "disqualifiers": [
      "weak transferable evidence",
      "high uncertainty",
      "requires starting over",
      "user does not appear comfortably ready for the transition"
    ]
  },
  "selection_logic": {
    "step_1": "Score all candidate roles for readiness and goal alignment.",
    "step_2": "Remove roles that fail minimum viability thresholds.",
    "step_3": "Assign Tier 1 to roles with strong immediate readiness and strongest long-term alignment.",
    "step_4": "Assign Tier 2 to roles that are viable now but less aligned than Tier 1.",
    "step_5": "Assign Tier 3 to roles that are more aligned to the future but are not fully realistic yet.",
    "step_6": "Apply user preference logic so viable preferred roles are retained.",
    "step_7": "Apply adjacent-field guardrails before allowing cross-field recommendations.",
    "step_8": "Return variable number of roles per tier based on quality, not fixed count."
  },
  "quality_thresholds": {
    "tier_1_min_readiness": 0.72,
    "tier_1_min_alignment": 0.68,
    "tier_2_min_readiness": 0.62,
    "tier_3_min_alignment": 0.72,
    "note": "Thresholds can be tuned later using real user outcomes."
  },
  "variable_output_rules": {
    "rule": "Each tier can return 0 to N roles depending on quality.",
    "guidelines": [
      "do not force low-quality roles into a tier",
      "it is acceptable for a tier to have only 1 strong role",
      "it is acceptable for a tier to be empty if no role meets threshold"
    ]
  },
  "conflict_resolution_rules": [
    "If a role is highly aligned but not truly gettable now, place it in Tier 3.",
    "If a role is highly gettable now but weakly aligned, place it in Tier 2.",
    "If a role is both highly gettable now and strongly aligned, place it in Tier 1.",
    "If user preference conflicts with strongest-fit role, show both when the preferred role is still viable.",
    "If adjacent-field role is attractive but not comfortable, do not elevate it."
  ],
  "output_structure": {
    "tier_1_roles": [
      {
        "role_title": "string",
        "decision_score": "0.0-1.0",
        "why_tier_1": "string"
      }
    ],
    "tier_2_roles": [
      {
        "role_title": "string",
        "decision_score": "0.0-1.0",
        "why_tier_2": "string"
      }
    ],
    "tier_3_roles": [
      {
        "role_title": "string",
        "decision_score": "0.0-1.0",
        "why_tier_3": "string"
      }
    ]
  }
} as const;
