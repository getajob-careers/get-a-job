export const jobSearchStageLogic = {
  "name": "job_search_stage_logic",
  "version": "v1",
  "last_updated": "2026-04-13",
  "description": "Determines the user's live job search stage using onboarding inputs, tracker activity, interview progress, and employment context.",
  "core_principles": {
    "1": "Job search stage and employment context are separate.",
    "2": "A user can be a student, employed, unemployed, part-time, or in another context while also being in any search stage.",
    "3": "Onboarding sets the initial stage, but real tracker and interview activity should override it over time.",
    "4": "Actual user behavior matters more than static self-report when meaningful activity exists.",
    "5": "Stage should update automatically when tracker or interview data changes."
  },
  "inputs": {
    "onboarding_inputs": [
      "employment_status",
      "is_student",
      "job_search_efforts",
      "biggest_challenge",
      "role_clarity_score",
      "interview_progress",
      "application_volume"
    ],
    "tracker_inputs": [
      "applications_count",
      "applications_in_last_30_days",
      "applications_with_no_response",
      "applications_in_interview_stage",
      "late_stage_applications",
      "offers_count",
      "rejections_count",
      "last_application_date"
    ],
    "agent_inputs": [
      "career_agent_reality_check",
      "interview_coach_updates",
      "application_cv_success_agent_updates"
    ]
  },
  "parallel_context_fields": {
    "employment_context": [
      "employed_full_time",
      "employed_part_time",
      "unemployed",
      "student",
      "student_and_employed",
      "freelance",
      "between_roles"
    ],
    "rule": "Employment context shapes urgency and strategy, but does not define job search stage by itself."
  },
  "job_search_stages": [
    "not_started",
    "early_search",
    "applying_no_response",
    "interviewing_not_advancing",
    "late_stage_no_offer",
    "active_interviewing",
    "transitioning_while_employed"
  ],
  "stage_definitions": {
    "not_started": {
      "description": "User has little or no active search behavior yet.",
      "signals": [
        "0 applications",
        "low job search effort",
        "low clarity or still defining direction"
      ]
    },
    "early_search": {
      "description": "User has started exploring or applying, but search activity is still early or light.",
      "signals": [
        "some applications submitted",
        "basic outreach or role exploration",
        "limited interview activity"
      ]
    },
    "applying_no_response": {
      "description": "User is applying but getting little or no traction.",
      "signals": [
        "multiple applications submitted",
        "few or no responses",
        "no meaningful interview progress"
      ]
    },
    "active_interviewing": {
      "description": "User is actively moving through interview processes.",
      "signals": [
        "one or more live interview processes",
        "recent interview activity",
        "pipeline movement beyond application stage"
      ]
    },
    "interviewing_not_advancing": {
      "description": "User is getting interviews but not progressing well.",
      "signals": [
        "interviews happening",
        "stalled progression",
        "repeated early-round exits"
      ]
    },
    "late_stage_no_offer": {
      "description": "User is reaching final or near-final stages but not converting to offers.",
      "signals": [
        "late-stage interviews",
        "final rounds",
        "no offer outcomes"
      ]
    },
    "transitioning_while_employed": {
      "description": "User is employed and actively searching in a more selective transition mode.",
      "signals": [
        "employment_context includes employed",
        "active applications or interviews",
        "search is real but not urgent-unemployed behavior"
      ]
    }
  },
  "precedence_rules": {
    "1": "Real tracker and interview activity overrides onboarding self-report when enough evidence exists.",
    "2": "Interview activity overrides general application stage.",
    "3": "Late-stage signals override all earlier stages.",
    "4": "Employment context modifies stage interpretation but does not replace actual search behavior.",
    "5": "If employed and actively interviewing, use live behavior plus employment context to classify as transitioning_while_employed or active_interviewing."
  },
  "automatic_update_rules": {
    "rule": "Stage should refresh automatically whenever meaningful tracker or interview activity changes.",
    "update_triggers": [
      "new application added",
      "application status changed",
      "interview scheduled",
      "interview outcome updated",
      "offer added",
      "rejection added",
      "employment status changed"
    ]
  },
  "classification_logic": [
    "Step 1: Determine employment_context separately.",
    "Step 2: Use onboarding data to assign an initial stage if no tracker data exists.",
    "Step 3: Check live tracker activity for stronger evidence.",
    "Step 4: Check interview progression and override earlier-stage classifications where relevant.",
    "Step 5: If user is employed and actively searching, classify with transition-aware logic.",
    "Step 6: Return current job_search_stage and employment_context."
  ],
  "example_interpretations": [
    {
      "case": "Student with no applications yet",
      "employment_context": "student",
      "job_search_stage": "not_started"
    },
    {
      "case": "Employed user with several applications and active interviews",
      "employment_context": "employed_full_time",
      "job_search_stage": "transitioning_while_employed"
    },
    {
      "case": "Unemployed user with 25 applications and no responses",
      "employment_context": "unemployed",
      "job_search_stage": "applying_no_response"
    },
    {
      "case": "User reaching final rounds but not getting offers",
      "employment_context": "unemployed",
      "job_search_stage": "late_stage_no_offer"
    }
  ],
  "output_structure": {
    "employment_context": "string",
    "job_search_stage": "string",
    "stage_confidence": "0.0-1.0",
    "stage_reasoning": [
      "array of evidence strings"
    ]
  }
} as const;
