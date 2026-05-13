export const onboardingInputMapping = {
  "name": "onboarding_input_mapping",
  "version": "v2",
  "last_updated": "2026-04-13",
  "onboarding_input_mapping": {
    "experience_data": {
      "experience.title": [
        "context",
        "domain_detection"
      ],
      "experience.company": [
        "context"
      ],
      "experience.responsibilities": [
        "proof_signals",
        "skill_inference",
        "fit_scoring",
        "domain_detection"
      ],
      "experience.tools_used": [
        "proof_signals",
        "skill_inference",
        "domain_detection"
      ],
      "experience.managed_people": [
        "proof_signals",
        "qualification_level",
        "tier_logic"
      ],
      "experience.cross_functional": [
        "proof_signals",
        "skill_inference",
        "adjacent_field_detection"
      ],
      "experience.type": [
        "qualification_level"
      ]
    },
    "cv_linkedin_data": {
      "cv.skills": [
        "skill_inference",
        "domain_detection"
      ],
      "cv.projects": [
        "proof_signals",
        "skill_inference",
        "adjacent_field_detection"
      ],
      "cv.certifications": [
        "proof_signals"
      ],
      "cv.education": [
        "qualification_level"
      ],
      "cv.summary": [
        "context",
        "domain_detection"
      ]
    },
    "declared_skills": {
      "userprofile.tools_software": [
        "declared_skills",
        "domain_detection"
      ],
      "userprofile.hard_skills": [
        "declared_skills",
        "domain_detection"
      ],
      "userprofile.technical_skills": [
        "declared_skills",
        "domain_detection"
      ],
      "userprofile.analytical_skills": [
        "declared_skills"
      ],
      "userprofile.communication_skills": [
        "declared_skills"
      ],
      "userprofile.leadership_skills": [
        "declared_skills"
      ]
    },
    "education_data": {
      "userprofile.education_level": [
        "qualification_level"
      ],
      "userprofile.field_of_study": [
        "context",
        "domain_detection"
      ],
      "userprofile.relevant_coursework": [
        "skill_inference",
        "domain_detection"
      ],
      "userprofile.academic_projects": [
        "proof_signals",
        "adjacent_field_detection"
      ]
    },
    "career_direction": {
      "userprofile.five_year_role": [
        "goal_alignment",
        "tier_logic"
      ],
      "userprofile.target_job_titles": [
        "goal_alignment",
        "tier_logic"
      ],
      "userprofile.target_industries": [
        "goal_alignment"
      ],
      "userprofile.work_environment": [
        "context"
      ],
      "userprofile.open_to_lateral": [
        "tier_logic_modifier",
        "goal_alignment_modifier"
      ],
      "userprofile.open_to_outside_degree": [
        "tier_logic_modifier",
        "goal_alignment_modifier"
      ]
    },
    "constraints": {
      "userprofile.location": [
        "filtering"
      ],
      "userprofile.work_type": [
        "filtering"
      ],
      "userprofile.available_start_date": [
        "filtering"
      ],
      "userprofile.salary_expectation": [
        "filtering"
      ]
    },
    "job_search_behavior": {
      "userprofile.employment_status": [
        "stage_awareness",
        "urgency_context",
        "positioning_context",
        "task_generation"
      ],
      "userprofile.biggest_challenge": [
        "task_generation",
        "agent_routing",
        "stage_awareness"
      ],
      "userprofile.cv_tailoring_strategy": [
        "task_generation",
        "application_agent",
        "stage_awareness"
      ],
      "userprofile.linkedin_outreach_strategy": [
        "task_generation",
        "networking_logic",
        "stage_awareness"
      ],
      "userprofile.role_clarity_score": [
        "career_agent",
        "task_generation",
        "stage_awareness"
      ],
      "userprofile.job_search_efforts": [
        "context",
        "task_generation",
        "stage_awareness"
      ],
      "userprofile.application_volume": [
        "stage_awareness",
        "task_generation"
      ],
      "userprofile.interview_progress": [
        "stage_awareness",
        "task_generation"
      ]
    },
    "derived_fields": {
      "derived.primary_domain": [
        "domain_detection",
        "goal_alignment",
        "tier_logic"
      ],
      "derived.adjacent_fields": [
        "adjacent_field_detection",
        "goal_alignment",
        "tier_logic"
      ],
      "derived.job_search_stage": [
        "stage_awareness",
        "task_generation",
        "agent_routing",
        "urgency_context"
      ]
    }
  }
} as const;
