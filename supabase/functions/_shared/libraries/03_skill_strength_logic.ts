export const skillStrengthLogic = {
  "skill_strength_logic": {
    "version": "v1_phase_simple",
    "description": "Determines skill strength based on number of mapped proof signals",
    "rules": {
      "missing": {
        "min_signals": 0,
        "max_signals": 0,
        "label": "missing"
      },
      "weak": {
        "min_signals": 1,
        "max_signals": 1,
        "label": "weak"
      },
      "medium": {
        "min_signals": 2,
        "max_signals": 3,
        "label": "medium"
      },
      "strong": {
        "min_signals": 4,
        "max_signals": 999,
        "label": "strong"
      }
    },
    "calculation_method": {
      "type": "count_based",
      "input": "number_of_proof_signals_per_skill",
      "output": "skill_strength_label"
    },
    "notes": [
      "Each proof signal mapped to a skill counts as 1",
      "Multiple occurrences of the same proof signal count as 1 (deduplicated)",
      "No weighting applied in this version",
      "No recency, ownership, or complexity factors included yet"
    ]
  }
} as const;
