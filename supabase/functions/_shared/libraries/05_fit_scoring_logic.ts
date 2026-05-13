export const fitScoringLogic = {
  "fit_scoring_logic": {
    "version": "v1_weighted_simple",
    "skill_weights": {
      "core": 0.6,
      "secondary": 0.3,
      "differentiator": 0.1
    },
    "skill_strength_scores": {
      "strong": 1.0,
      "medium": 0.6,
      "weak": 0.3,
      "missing": 0.0
    },
    "calculation": {
      "step_1": "For each role, group skills into core, secondary, differentiator",
      "step_2": "For each skill, assign score based on skill_strength_scores",
      "step_3": "Calculate average score per group",
      "step_4": "Multiply each group average by its weight",
      "step_5": "Sum all weighted scores",
      "step_6": "Multiply final score by 100 to get percentage"
    },
    "output": {
      "fit_score_range": "0-100",
      "fit_labels": {
        "80_100": "strong_match",
        "60_79": "good_match",
        "40_59": "stretch",
        "0_39": "low_match"
      }
    },
    "notes": [
      "All core skills should be evaluated for every role",
      "Missing core skills significantly reduce final score",
      "Differentiator skills should not heavily penalize the score",
      "This is a simple version with no weighting for recency, ownership, or complexity yet"
    ]
  }
} as const;
