export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      account_deletions: {
        Row: {
          deleted_at: string;
          email: string | null;
          id: string;
          user_id_was: string | null;
        };
        Insert: {
          deleted_at?: string;
          email?: string | null;
          id?: string;
          user_id_was?: string | null;
        };
        Update: {
          deleted_at?: string;
          email?: string | null;
          id?: string;
          user_id_was?: string | null;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          added_at: string;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          notes?: string | null;
          user_id: string;
        };
        Update: {
          added_at?: string;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      application_cvs: {
        Row: {
          application_id: string | null;
          created_at: string;
          cv_data: Json;
          cv_url: string | null;
          generated_cv_data: Json | null;
          id: string;
          is_master: boolean;
          source_jd: string | null;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          application_id?: string | null;
          created_at?: string;
          cv_data: Json;
          cv_url?: string | null;
          generated_cv_data?: Json | null;
          id?: string;
          is_master?: boolean;
          source_jd?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          application_id?: string | null;
          created_at?: string;
          cv_data?: Json;
          cv_url?: string | null;
          generated_cv_data?: Json | null;
          id?: string;
          is_master?: boolean;
          source_jd?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "application_cvs_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          applied_date: string | null;
          ats_source: string | null;
          checklist: Json;
          company: string;
          created_at: string;
          cv_skills_emphasized: string[] | null;
          cv_status: string | null;
          cv_template_id: string | null;
          cv_url: string | null;
          cv_version_name: string | null;
          cv_version_used: string | null;
          external_id: string | null;
          follow_up: Json | null;
          found_via_alumni: boolean | null;
          found_via_connection: boolean | null;
          goal_alignment_score: number | null;
          id: string;
          interview_prep: Json | null;
          interview_stage: string | null;
          job_description: string | null;
          job_description_pre_strip: string | null;
          location: string | null;
          networking_contacts: Json | null;
          notes: string | null;
          outcome_notes: string | null;
          projects_proof: Json | null;
          qualification_score: number | null;
          referral_attached: boolean | null;
          req_snapshot: Json | null;
          required_seniority: string | null;
          role_title: string;
          salary_range: string | null;
          score_source: string | null;
          skills_required: Json | null;
          source: string | null;
          status: string;
          track: string | null;
          track_scoring_failed_at: string | null;
          updated_at: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          applied_date?: string | null;
          ats_source?: string | null;
          checklist?: Json;
          company: string;
          created_at?: string;
          cv_skills_emphasized?: string[] | null;
          cv_status?: string | null;
          cv_template_id?: string | null;
          cv_url?: string | null;
          cv_version_name?: string | null;
          cv_version_used?: string | null;
          external_id?: string | null;
          follow_up?: Json | null;
          found_via_alumni?: boolean | null;
          found_via_connection?: boolean | null;
          goal_alignment_score?: number | null;
          id?: string;
          interview_prep?: Json | null;
          interview_stage?: string | null;
          job_description?: string | null;
          job_description_pre_strip?: string | null;
          location?: string | null;
          networking_contacts?: Json | null;
          notes?: string | null;
          outcome_notes?: string | null;
          projects_proof?: Json | null;
          qualification_score?: number | null;
          referral_attached?: boolean | null;
          req_snapshot?: Json | null;
          required_seniority?: string | null;
          role_title: string;
          salary_range?: string | null;
          score_source?: string | null;
          skills_required?: Json | null;
          source?: string | null;
          status?: string;
          track?: string | null;
          track_scoring_failed_at?: string | null;
          updated_at?: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          applied_date?: string | null;
          ats_source?: string | null;
          checklist?: Json;
          company?: string;
          created_at?: string;
          cv_skills_emphasized?: string[] | null;
          cv_status?: string | null;
          cv_template_id?: string | null;
          cv_url?: string | null;
          cv_version_name?: string | null;
          cv_version_used?: string | null;
          external_id?: string | null;
          follow_up?: Json | null;
          found_via_alumni?: boolean | null;
          found_via_connection?: boolean | null;
          goal_alignment_score?: number | null;
          id?: string;
          interview_prep?: Json | null;
          interview_stage?: string | null;
          job_description?: string | null;
          job_description_pre_strip?: string | null;
          location?: string | null;
          networking_contacts?: Json | null;
          notes?: string | null;
          outcome_notes?: string | null;
          projects_proof?: Json | null;
          qualification_score?: number | null;
          referral_attached?: boolean | null;
          req_snapshot?: Json | null;
          required_seniority?: string | null;
          role_title?: string;
          salary_range?: string | null;
          score_source?: string | null;
          skills_required?: Json | null;
          source?: string | null;
          status?: string;
          track?: string | null;
          track_scoring_failed_at?: string | null;
          updated_at?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      bakeoff_results: {
        Row: {
          arm: string;
          created_at: string | null;
          cv_json: Json | null;
          dropped_strong: boolean | null;
          fabrication: boolean | null;
          http_status: number | null;
          id: string;
          jd_ref: string | null;
          judge_note: string | null;
          latency_ms: number | null;
          pair_id: string;
          pair_type: string | null;
          phase: string | null;
          profile_user_id: string | null;
          rank: number | null;
          run_id: string;
          score_clarity: number | null;
          score_concreteness: number | null;
          score_relevance: number | null;
          score_retention: number | null;
          score_thin_framing: number | null;
          tokens_out: number | null;
        };
        Insert: {
          arm: string;
          created_at?: string | null;
          cv_json?: Json | null;
          dropped_strong?: boolean | null;
          fabrication?: boolean | null;
          http_status?: number | null;
          id?: string;
          jd_ref?: string | null;
          judge_note?: string | null;
          latency_ms?: number | null;
          pair_id: string;
          pair_type?: string | null;
          phase?: string | null;
          profile_user_id?: string | null;
          rank?: number | null;
          run_id: string;
          score_clarity?: number | null;
          score_concreteness?: number | null;
          score_relevance?: number | null;
          score_retention?: number | null;
          score_thin_framing?: number | null;
          tokens_out?: number | null;
        };
        Update: {
          arm?: string;
          created_at?: string | null;
          cv_json?: Json | null;
          dropped_strong?: boolean | null;
          fabrication?: boolean | null;
          http_status?: number | null;
          id?: string;
          jd_ref?: string | null;
          judge_note?: string | null;
          latency_ms?: number | null;
          pair_id?: string;
          pair_type?: string | null;
          phase?: string | null;
          profile_user_id?: string | null;
          rank?: number | null;
          run_id?: string;
          score_clarity?: number | null;
          score_concreteness?: number | null;
          score_relevance?: number | null;
          score_retention?: number | null;
          score_thin_framing?: number | null;
          tokens_out?: number | null;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          all_day: boolean;
          application_id: string | null;
          created_at: string;
          description: string | null;
          end_date: string | null;
          event_type: string;
          id: string;
          location: string | null;
          reminder_minutes: number | null;
          start_date: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          all_day?: boolean;
          application_id?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          event_type?: string;
          id?: string;
          location?: string | null;
          reminder_minutes?: number | null;
          start_date: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          all_day?: boolean;
          application_id?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          event_type?: string;
          id?: string;
          location?: string | null;
          reminder_minutes?: number | null;
          start_date?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      career_roles: {
        Row: {
          action_items: string[] | null;
          alignment_reason: string | null;
          alignment_to_goal: string | null;
          created_at: string;
          goal_alignment_score: number | null;
          id: string;
          match_score: number | null;
          matched_skills: string[] | null;
          missing_skills: string[] | null;
          readiness_score: number | null;
          reasoning: string | null;
          skill_coverage_ratio: number | null;
          skills_gap: string[] | null;
          title: string;
          track: string | null;
          user_id: string;
        };
        Insert: {
          action_items?: string[] | null;
          alignment_reason?: string | null;
          alignment_to_goal?: string | null;
          created_at?: string;
          goal_alignment_score?: number | null;
          id?: string;
          match_score?: number | null;
          matched_skills?: string[] | null;
          missing_skills?: string[] | null;
          readiness_score?: number | null;
          reasoning?: string | null;
          skill_coverage_ratio?: number | null;
          skills_gap?: string[] | null;
          title: string;
          track?: string | null;
          user_id: string;
        };
        Update: {
          action_items?: string[] | null;
          alignment_reason?: string | null;
          alignment_to_goal?: string | null;
          created_at?: string;
          goal_alignment_score?: number | null;
          id?: string;
          match_score?: number | null;
          matched_skills?: string[] | null;
          missing_skills?: string[] | null;
          readiness_score?: number | null;
          reasoning?: string | null;
          skill_coverage_ratio?: number | null;
          skills_gap?: string[] | null;
          title?: string;
          track?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      certifications: {
        Row: {
          created_at: string;
          date_earned: string | null;
          description: string | null;
          id: string;
          is_current: boolean | null;
          issuer: string | null;
          name: string;
          skills: string[] | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date_earned?: string | null;
          description?: string | null;
          id?: string;
          is_current?: boolean | null;
          issuer?: string | null;
          name: string;
          skills?: string[] | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date_earned?: string | null;
          description?: string | null;
          id?: string;
          is_current?: boolean | null;
          issuer?: string | null;
          name?: string;
          skills?: string[] | null;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          is_error: boolean | null;
          original_user_message: string | null;
          role: string;
          suggested_agent: Json | null;
          suggested_application_actions: Json | null;
          suggested_company_target_actions: Json | null;
          suggested_cv_generation: Json | null;
          suggested_roadmap_changes: Json | null;
          suggested_tasks: Json | null;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          is_error?: boolean | null;
          original_user_message?: string | null;
          role: string;
          suggested_agent?: Json | null;
          suggested_application_actions?: Json | null;
          suggested_company_target_actions?: Json | null;
          suggested_cv_generation?: Json | null;
          suggested_roadmap_changes?: Json | null;
          suggested_tasks?: Json | null;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          is_error?: boolean | null;
          original_user_message?: string | null;
          role?: string;
          suggested_agent?: Json | null;
          suggested_application_actions?: Json | null;
          suggested_company_target_actions?: Json | null;
          suggested_cv_generation?: Json | null;
          suggested_roadmap_changes?: Json | null;
          suggested_tasks?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          api_url: string | null;
          ats: string | null;
          ats_slug: string | null;
          careers_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          domain: string | null;
          employee_count_range: string | null;
          enriched_at: string | null;
          enrichment_model: string | null;
          enrichment_sources: Json | null;
          founded_year: number | null;
          hq_city: string | null;
          hq_country: string | null;
          id: string;
          industry: string | null;
          name: string;
          origin: string | null;
          sector: string | null;
          source: string;
          stage: string | null;
          updated_at: string;
          verified: boolean | null;
        };
        Insert: {
          api_url?: string | null;
          ats?: string | null;
          ats_slug?: string | null;
          careers_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          domain?: string | null;
          employee_count_range?: string | null;
          enriched_at?: string | null;
          enrichment_model?: string | null;
          enrichment_sources?: Json | null;
          founded_year?: number | null;
          hq_city?: string | null;
          hq_country?: string | null;
          id?: string;
          industry?: string | null;
          name: string;
          origin?: string | null;
          sector?: string | null;
          source: string;
          stage?: string | null;
          updated_at?: string;
          verified?: boolean | null;
        };
        Update: {
          api_url?: string | null;
          ats?: string | null;
          ats_slug?: string | null;
          careers_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          domain?: string | null;
          employee_count_range?: string | null;
          enriched_at?: string | null;
          enrichment_model?: string | null;
          enrichment_sources?: Json | null;
          founded_year?: number | null;
          hq_city?: string | null;
          hq_country?: string | null;
          id?: string;
          industry?: string | null;
          name?: string;
          origin?: string | null;
          sector?: string | null;
          source?: string;
          stage?: string | null;
          updated_at?: string;
          verified?: boolean | null;
        };
        Relationships: [];
      };
      company_target_status_changes: {
        Row: {
          changed_at: string;
          id: string;
          new_status: string;
          note: string | null;
          old_status: string | null;
          target_id: string;
          user_id: string;
        };
        Insert: {
          changed_at?: string;
          id?: string;
          new_status: string;
          note?: string | null;
          old_status?: string | null;
          target_id: string;
          user_id: string;
        };
        Update: {
          changed_at?: string;
          id?: string;
          new_status?: string;
          note?: string | null;
          old_status?: string | null;
          target_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_target_status_changes_target_id_fkey";
            columns: ["target_id"];
            isOneToOne: false;
            referencedRelation: "company_targets";
            referencedColumns: ["id"];
          },
        ];
      };
      company_targets: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          match_rationale: string | null;
          match_score: number | null;
          notes: string | null;
          pitch_rationale: string | null;
          pitched_role: string | null;
          skill_gaps_this_fills: string[] | null;
          source: string;
          status: string;
          updated_at: string;
          user_id: string;
          who_to_contact: string[];
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          match_rationale?: string | null;
          match_score?: number | null;
          notes?: string | null;
          pitch_rationale?: string | null;
          pitched_role?: string | null;
          skill_gaps_this_fills?: string[] | null;
          source: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          who_to_contact?: string[];
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          match_rationale?: string | null;
          match_score?: number | null;
          notes?: string | null;
          pitch_rationale?: string | null;
          pitched_role?: string | null;
          skill_gaps_this_fills?: string[] | null;
          source?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          who_to_contact?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "company_targets_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          agent: string;
          application_id: string | null;
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          agent: string;
          application_id?: string | null;
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          agent?: string;
          application_id?: string | null;
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_actions: {
        Row: {
          action_type: string;
          completed_at: string | null;
          estimated_minutes: number | null;
          for_date: string;
          generated_at: string;
          id: string;
          pick_score: number | null;
          rationale: string;
          source_id: string | null;
          source_table: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
          user_notes: string | null;
        };
        Insert: {
          action_type: string;
          completed_at?: string | null;
          estimated_minutes?: number | null;
          for_date: string;
          generated_at?: string;
          id?: string;
          pick_score?: number | null;
          rationale: string;
          source_id?: string | null;
          source_table?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
          user_notes?: string | null;
        };
        Update: {
          action_type?: string;
          completed_at?: string | null;
          estimated_minutes?: number | null;
          for_date?: string;
          generated_at?: string;
          id?: string;
          pick_score?: number | null;
          rationale?: string;
          source_id?: string | null;
          source_table?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          user_notes?: string | null;
        };
        Relationships: [];
      };
      education: {
        Row: {
          academic_projects: string[];
          bullets: string[];
          created_at: string;
          degree_type: string | null;
          display_order: number | null;
          education_level: string | null;
          end_date: string | null;
          field_of_study: string | null;
          gpa: string | null;
          honors: string[];
          id: string;
          institution: string | null;
          is_current: boolean;
          location: string | null;
          relevant_coursework: string[];
          skills: string[] | null;
          start_date: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          academic_projects?: string[];
          bullets?: string[];
          created_at?: string;
          degree_type?: string | null;
          display_order?: number | null;
          education_level?: string | null;
          end_date?: string | null;
          field_of_study?: string | null;
          gpa?: string | null;
          honors?: string[];
          id?: string;
          institution?: string | null;
          is_current?: boolean;
          location?: string | null;
          relevant_coursework?: string[];
          skills?: string[] | null;
          start_date?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          academic_projects?: string[];
          bullets?: string[];
          created_at?: string;
          degree_type?: string | null;
          display_order?: number | null;
          education_level?: string | null;
          end_date?: string | null;
          field_of_study?: string | null;
          gpa?: string | null;
          honors?: string[];
          id?: string;
          institution?: string | null;
          is_current?: boolean;
          location?: string | null;
          relevant_coursework?: string[];
          skills?: string[] | null;
          start_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "education_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      error_logs: {
        Row: {
          created_at: string | null;
          error_details: Json | null;
          error_message: string;
          function_name: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          error_details?: Json | null;
          error_message: string;
          function_name: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          error_details?: Json | null;
          error_message?: string;
          function_name?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      experiences: {
        Row: {
          awards: string[];
          bullets: string[];
          commitment: string | null;
          company: string;
          created_at: string;
          cross_functional: boolean;
          display_order: number | null;
          end_date: string | null;
          id: string;
          is_current: boolean | null;
          location: string | null;
          managed_people: boolean;
          responsibilities: string | null;
          skills: string[] | null;
          start_date: string | null;
          title: string;
          type: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          awards?: string[];
          bullets?: string[];
          commitment?: string | null;
          company: string;
          created_at?: string;
          cross_functional?: boolean;
          display_order?: number | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean | null;
          location?: string | null;
          managed_people?: boolean;
          responsibilities?: string | null;
          skills?: string[] | null;
          start_date?: string | null;
          title: string;
          type?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          awards?: string[];
          bullets?: string[];
          commitment?: string | null;
          company?: string;
          created_at?: string;
          cross_functional?: boolean;
          display_order?: number | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean | null;
          location?: string | null;
          managed_people?: boolean;
          responsibilities?: string | null;
          skills?: string[] | null;
          start_date?: string | null;
          title?: string;
          type?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          category: string;
          context: Json | null;
          created_at: string;
          id: string;
          message: string;
          route: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          category: string;
          context?: Json | null;
          created_at?: string;
          id?: string;
          message: string;
          route?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          category?: string;
          context?: Json | null;
          created_at?: string;
          id?: string;
          message?: string;
          route?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      function_cache: {
        Row: {
          cached_at: string;
          function_name: string;
          input_hash: string;
          user_id: string;
        };
        Insert: {
          cached_at?: string;
          function_name: string;
          input_hash: string;
          user_id: string;
        };
        Update: {
          cached_at?: string;
          function_name?: string;
          input_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "function_cache_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      function_metrics: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          error_code: string | null;
          function_name: string;
          http_status: number | null;
          id: string;
          latency_ms: number;
          model_used: string | null;
          ok: boolean;
          tokens_in: number | null;
          tokens_out: number | null;
          user_id: string | null;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          error_code?: string | null;
          function_name: string;
          http_status?: number | null;
          id?: string;
          latency_ms: number;
          model_used?: string | null;
          ok: boolean;
          tokens_in?: number | null;
          tokens_out?: number | null;
          user_id?: string | null;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          error_code?: string | null;
          function_name?: string;
          http_status?: number | null;
          id?: string;
          latency_ms?: number;
          model_used?: string | null;
          ok?: boolean;
          tokens_in?: number | null;
          tokens_out?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      internship_pitches: {
        Row: {
          cached_at: string;
          company_id: string;
          input_hash: string;
          pitch: Json;
          user_id: string;
        };
        Insert: {
          cached_at?: string;
          company_id: string;
          input_hash: string;
          pitch: Json;
          user_id: string;
        };
        Update: {
          cached_at?: string;
          company_id?: string;
          input_hash?: string;
          pitch?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_pitches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_pitches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_profiles: {
        Row: {
          career_compound_rationale: string | null;
          created_at: string;
          generated_from_career_roles_at: string | null;
          pitch_anti_patterns: string[];
          pitch_strength_signals: string[];
          pitchable_role_archetypes: string[];
          rationale: string | null;
          realistic_company_stages: string[];
          realistic_sectors: string[];
          realistic_signal_filters: string[];
          realistic_team_size_range: string | null;
          skill_gaps_to_close: string[];
          track_1_role_alignment: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          career_compound_rationale?: string | null;
          created_at?: string;
          generated_from_career_roles_at?: string | null;
          pitch_anti_patterns?: string[];
          pitch_strength_signals?: string[];
          pitchable_role_archetypes?: string[];
          rationale?: string | null;
          realistic_company_stages?: string[];
          realistic_sectors?: string[];
          realistic_signal_filters?: string[];
          realistic_team_size_range?: string | null;
          skill_gaps_to_close?: string[];
          track_1_role_alignment?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          career_compound_rationale?: string | null;
          created_at?: string;
          generated_from_career_roles_at?: string | null;
          pitch_anti_patterns?: string[];
          pitch_strength_signals?: string[];
          pitchable_role_archetypes?: string[];
          rationale?: string | null;
          realistic_company_stages?: string[];
          realistic_sectors?: string[];
          realistic_signal_filters?: string[];
          realistic_team_size_range?: string | null;
          skill_gaps_to_close?: string[];
          track_1_role_alignment?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      invite_codes: {
        Row: {
          code: string;
          cohort_label: string;
          created_at: string;
          current_uses: number;
          id: string;
          is_active: boolean;
          max_uses: number | null;
        };
        Insert: {
          code: string;
          cohort_label: string;
          created_at?: string;
          current_uses?: number;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
        };
        Update: {
          code?: string;
          cohort_label?: string;
          created_at?: string;
          current_uses?: number;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
        };
        Relationships: [];
      };
      jd_unmapped_skill_counts: {
        Row: {
          example_job_id: string | null;
          first_seen: string;
          job_count: number;
          last_seen: string;
          promoted_at: string | null;
          promoted_to_library: boolean;
          promoted_to_skill_id: string | null;
          skill_phrase: string;
        };
        Insert: {
          example_job_id?: string | null;
          first_seen?: string;
          job_count?: number;
          last_seen?: string;
          promoted_at?: string | null;
          promoted_to_library?: boolean;
          promoted_to_skill_id?: string | null;
          skill_phrase: string;
        };
        Update: {
          example_job_id?: string | null;
          first_seen?: string;
          job_count?: number;
          last_seen?: string;
          promoted_at?: string | null;
          promoted_to_library?: boolean;
          promoted_to_skill_id?: string | null;
          skill_phrase?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          application_extras: string[] | null;
          apply_url: string;
          ats_source: string;
          benefits: string[] | null;
          benefits_struct: Json | null;
          bonus_mentioned: boolean | null;
          company_name: string;
          company_size_employees: number | null;
          company_slug: string;
          company_stage: string | null;
          customer_type: string[] | null;
          date_posted: string | null;
          days_in_office: number | null;
          description: string | null;
          description_hash: string | null;
          description_pre_strip: string | null;
          direct_reports_max: number | null;
          direct_reports_min: number | null;
          eligibility_constraints: Json | null;
          equity_mentioned: boolean | null;
          equity_struct: Json | null;
          external_id: string;
          extracted_at: string | null;
          extraction_confidence: number | null;
          extraction_freeform_signals: Json | null;
          extraction_model: string | null;
          extraction_schema_version: number | null;
          extraction_unmapped_skills: string[] | null;
          fetched_at: string;
          first_seen_at: string;
          founded_year: number | null;
          function_family: string | null;
          funding_signals: Json | null;
          id: string;
          il_benefits: Json | null;
          industry: string | null;
          industry_vertical: string[] | null;
          interview_process: Json | null;
          is_active: boolean;
          is_agency: boolean;
          is_il: boolean;
          is_remote: boolean;
          jd_language: string | null;
          last_seen_at: string;
          local_office_city: string | null;
          location_city: string | null;
          location_raw: string | null;
          methodology: string[] | null;
          notable_customers: string[] | null;
          office_policy: Json | null;
          on_call_expected: string | null;
          raw_payload: Json | null;
          rd_local_headcount: number | null;
          reports_to: string | null;
          reports_to_struct: Json | null;
          req_ai_tooling: Json | null;
          req_education_fields: string[] | null;
          req_education_levels: string[] | null;
          req_education_strict: boolean | null;
          req_languages: Json | null;
          req_seniority: string | null;
          req_skill_years: Json | null;
          req_skills_core: string[] | null;
          req_skills_core_raw: string[] | null;
          req_skills_must_have: string[] | null;
          req_skills_must_have_raw: string[] | null;
          req_skills_nice: string[] | null;
          req_skills_nice_raw: string[] | null;
          req_visa_constraint: string | null;
          req_years_max: number | null;
          req_years_min: number | null;
          responsibility_keywords: string[] | null;
          salary_cadence: string | null;
          salary_currency: string | null;
          salary_max: number | null;
          salary_min: number | null;
          scale_signals: Json | null;
          seniority: string;
          skill_coverage_ratio: number | null;
          team_size: number | null;
          tech_stack: string[] | null;
          title: string;
          track: string | null;
          travel_percentage: string | null;
          travel_struct: Json | null;
          years_experience_max: number | null;
          years_experience_min: number | null;
        };
        Insert: {
          application_extras?: string[] | null;
          apply_url: string;
          ats_source: string;
          benefits?: string[] | null;
          benefits_struct?: Json | null;
          bonus_mentioned?: boolean | null;
          company_name: string;
          company_size_employees?: number | null;
          company_slug: string;
          company_stage?: string | null;
          customer_type?: string[] | null;
          date_posted?: string | null;
          days_in_office?: number | null;
          description?: string | null;
          description_hash?: string | null;
          description_pre_strip?: string | null;
          direct_reports_max?: number | null;
          direct_reports_min?: number | null;
          eligibility_constraints?: Json | null;
          equity_mentioned?: boolean | null;
          equity_struct?: Json | null;
          external_id: string;
          extracted_at?: string | null;
          extraction_confidence?: number | null;
          extraction_freeform_signals?: Json | null;
          extraction_model?: string | null;
          extraction_schema_version?: number | null;
          extraction_unmapped_skills?: string[] | null;
          fetched_at?: string;
          first_seen_at?: string;
          founded_year?: number | null;
          function_family?: string | null;
          funding_signals?: Json | null;
          id?: string;
          il_benefits?: Json | null;
          industry?: string | null;
          industry_vertical?: string[] | null;
          interview_process?: Json | null;
          is_active?: boolean;
          is_agency?: boolean;
          is_il?: boolean;
          is_remote?: boolean;
          jd_language?: string | null;
          last_seen_at?: string;
          local_office_city?: string | null;
          location_city?: string | null;
          location_raw?: string | null;
          methodology?: string[] | null;
          notable_customers?: string[] | null;
          office_policy?: Json | null;
          on_call_expected?: string | null;
          raw_payload?: Json | null;
          rd_local_headcount?: number | null;
          reports_to?: string | null;
          reports_to_struct?: Json | null;
          req_ai_tooling?: Json | null;
          req_education_fields?: string[] | null;
          req_education_levels?: string[] | null;
          req_education_strict?: boolean | null;
          req_languages?: Json | null;
          req_seniority?: string | null;
          req_skill_years?: Json | null;
          req_skills_core?: string[] | null;
          req_skills_core_raw?: string[] | null;
          req_skills_must_have?: string[] | null;
          req_skills_must_have_raw?: string[] | null;
          req_skills_nice?: string[] | null;
          req_skills_nice_raw?: string[] | null;
          req_visa_constraint?: string | null;
          req_years_max?: number | null;
          req_years_min?: number | null;
          responsibility_keywords?: string[] | null;
          salary_cadence?: string | null;
          salary_currency?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          scale_signals?: Json | null;
          seniority: string;
          skill_coverage_ratio?: number | null;
          team_size?: number | null;
          tech_stack?: string[] | null;
          title: string;
          track?: string | null;
          travel_percentage?: string | null;
          travel_struct?: Json | null;
          years_experience_max?: number | null;
          years_experience_min?: number | null;
        };
        Update: {
          application_extras?: string[] | null;
          apply_url?: string;
          ats_source?: string;
          benefits?: string[] | null;
          benefits_struct?: Json | null;
          bonus_mentioned?: boolean | null;
          company_name?: string;
          company_size_employees?: number | null;
          company_slug?: string;
          company_stage?: string | null;
          customer_type?: string[] | null;
          date_posted?: string | null;
          days_in_office?: number | null;
          description?: string | null;
          description_hash?: string | null;
          description_pre_strip?: string | null;
          direct_reports_max?: number | null;
          direct_reports_min?: number | null;
          eligibility_constraints?: Json | null;
          equity_mentioned?: boolean | null;
          equity_struct?: Json | null;
          external_id?: string;
          extracted_at?: string | null;
          extraction_confidence?: number | null;
          extraction_freeform_signals?: Json | null;
          extraction_model?: string | null;
          extraction_schema_version?: number | null;
          extraction_unmapped_skills?: string[] | null;
          fetched_at?: string;
          first_seen_at?: string;
          founded_year?: number | null;
          function_family?: string | null;
          funding_signals?: Json | null;
          id?: string;
          il_benefits?: Json | null;
          industry?: string | null;
          industry_vertical?: string[] | null;
          interview_process?: Json | null;
          is_active?: boolean;
          is_agency?: boolean;
          is_il?: boolean;
          is_remote?: boolean;
          jd_language?: string | null;
          last_seen_at?: string;
          local_office_city?: string | null;
          location_city?: string | null;
          location_raw?: string | null;
          methodology?: string[] | null;
          notable_customers?: string[] | null;
          office_policy?: Json | null;
          on_call_expected?: string | null;
          raw_payload?: Json | null;
          rd_local_headcount?: number | null;
          reports_to?: string | null;
          reports_to_struct?: Json | null;
          req_ai_tooling?: Json | null;
          req_education_fields?: string[] | null;
          req_education_levels?: string[] | null;
          req_education_strict?: boolean | null;
          req_languages?: Json | null;
          req_seniority?: string | null;
          req_skill_years?: Json | null;
          req_skills_core?: string[] | null;
          req_skills_core_raw?: string[] | null;
          req_skills_must_have?: string[] | null;
          req_skills_must_have_raw?: string[] | null;
          req_skills_nice?: string[] | null;
          req_skills_nice_raw?: string[] | null;
          req_visa_constraint?: string | null;
          req_years_max?: number | null;
          req_years_min?: number | null;
          responsibility_keywords?: string[] | null;
          salary_cadence?: string | null;
          salary_currency?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          scale_signals?: Json | null;
          seniority?: string;
          skill_coverage_ratio?: number | null;
          team_size?: number | null;
          tech_stack?: string[] | null;
          title?: string;
          track?: string | null;
          travel_percentage?: string | null;
          travel_struct?: Json | null;
          years_experience_max?: number | null;
          years_experience_min?: number | null;
        };
        Relationships: [];
      };
      landing_stats: {
        Row: {
          companies_hiring_count: number;
          id: number;
          live_roles_count: number;
          updated_at: string;
        };
        Insert: {
          companies_hiring_count: number;
          id?: number;
          live_roles_count: number;
          updated_at?: string;
        };
        Update: {
          companies_hiring_count?: number;
          id?: number;
          live_roles_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      linkedin_optimizations: {
        Row: {
          baseline_data: Json | null;
          baseline_imported_at: string | null;
          baseline_source: string | null;
          created_at: string;
          generated_at: string | null;
          generated_data: Json | null;
          id: string;
          per_section_updated_at: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          baseline_data?: Json | null;
          baseline_imported_at?: string | null;
          baseline_source?: string | null;
          created_at?: string;
          generated_at?: string | null;
          generated_data?: Json | null;
          id?: string;
          per_section_updated_at?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          baseline_data?: Json | null;
          baseline_imported_at?: string | null;
          baseline_source?: string | null;
          created_at?: string;
          generated_at?: string | null;
          generated_data?: Json | null;
          id?: string;
          per_section_updated_at?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      linkedin_outreach_conversations: {
        Row: {
          created_at: string;
          goal: string;
          id: string;
          message_thread: Json;
          status: string;
          target_person: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          goal: string;
          id?: string;
          message_thread?: Json;
          status?: string;
          target_person: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          goal?: string;
          id?: string;
          message_thread?: Json;
          status?: string;
          target_person?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      linkedin_posts: {
        Row: {
          created_at: string;
          edited_text: string | null;
          generated_data: Json;
          id: string;
          image_url: string | null;
          inputs: Json | null;
          post_type: string;
          story_id: string | null;
          updated_at: string;
          user_id: string;
          user_published_at: string | null;
        };
        Insert: {
          created_at?: string;
          edited_text?: string | null;
          generated_data: Json;
          id?: string;
          image_url?: string | null;
          inputs?: Json | null;
          post_type: string;
          story_id?: string | null;
          updated_at?: string;
          user_id: string;
          user_published_at?: string | null;
        };
        Update: {
          created_at?: string;
          edited_text?: string | null;
          generated_data?: Json;
          id?: string;
          image_url?: string | null;
          inputs?: Json | null;
          post_type?: string;
          story_id?: string | null;
          updated_at?: string;
          user_id?: string;
          user_published_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "linkedin_posts_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_events: {
        Row: {
          created_at: string;
          detail: Json | null;
          error_code: string | null;
          event: string;
          id: string;
          step: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          detail?: Json | null;
          error_code?: string | null;
          event: string;
          id?: string;
          step?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          detail?: Json | null;
          error_code?: string | null;
          event?: string;
          id?: string;
          step?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_edits: {
        Row: {
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          field: string;
          id: string;
          new_value: Json | null;
          prior_value: Json | null;
          source: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          field: string;
          id?: string;
          new_value?: Json | null;
          prior_value?: Json | null;
          source: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          field?: string;
          id?: string;
          new_value?: Json | null;
          prior_value?: Json | null;
          source?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          adjacent_fields: Json | null;
          available_start_date: string | null;
          biggest_challenge: string[] | null;
          cohort_label: string | null;
          created_at: string;
          current_employment_status: string | null;
          cv_tailoring_strategy: string | null;
          degree: string | null;
          education_dates: string | null;
          education_institution: string | null;
          education_level: string | null;
          employment_status: string[] | null;
          field_of_study: string | null;
          five_year_goal_role_id: string | null;
          five_year_role: string | null;
          full_name: string | null;
          gpa: string | null;
          has_seen_onboarding_tutorial: boolean;
          headline: string | null;
          honors: string[] | null;
          id: string;
          invite_code: string | null;
          job_search_efforts: string | null;
          languages: Json | null;
          last_reality_check_date: string | null;
          linkedin_outreach_strategy: string | null;
          linkedin_url: string | null;
          location: string | null;
          onboarding_complete: boolean | null;
          onboarding_step: number | null;
          open_to_lateral: boolean | null;
          open_to_outside_degree: boolean | null;
          overall_assessment: string | null;
          phone_number: string | null;
          practicum_cohort: string | null;
          practicum_path: string | null;
          practicum_status: string | null;
          primary_domain: string | null;
          proof_signals: Json | null;
          qualification_level: string | null;
          referral_source: string | null;
          relevant_coursework: string[] | null;
          resume_url: string | null;
          role_clarity_score: number | null;
          salary_expectation: string | null;
          secondary_education: Json | null;
          skill_gaps: string[] | null;
          skills: string[] | null;
          skills_canonical: string[] | null;
          skills_unmapped: string[] | null;
          summary: string | null;
          target_industries: string[] | null;
          target_job_titles: string[] | null;
          updated_at: string;
          work_environment: string[] | null;
          work_type: string[] | null;
        };
        Insert: {
          adjacent_fields?: Json | null;
          available_start_date?: string | null;
          biggest_challenge?: string[] | null;
          cohort_label?: string | null;
          created_at?: string;
          current_employment_status?: string | null;
          cv_tailoring_strategy?: string | null;
          degree?: string | null;
          education_dates?: string | null;
          education_institution?: string | null;
          education_level?: string | null;
          employment_status?: string[] | null;
          field_of_study?: string | null;
          five_year_goal_role_id?: string | null;
          five_year_role?: string | null;
          full_name?: string | null;
          gpa?: string | null;
          has_seen_onboarding_tutorial?: boolean;
          headline?: string | null;
          honors?: string[] | null;
          id: string;
          invite_code?: string | null;
          job_search_efforts?: string | null;
          languages?: Json | null;
          last_reality_check_date?: string | null;
          linkedin_outreach_strategy?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          onboarding_complete?: boolean | null;
          onboarding_step?: number | null;
          open_to_lateral?: boolean | null;
          open_to_outside_degree?: boolean | null;
          overall_assessment?: string | null;
          phone_number?: string | null;
          practicum_cohort?: string | null;
          practicum_path?: string | null;
          practicum_status?: string | null;
          primary_domain?: string | null;
          proof_signals?: Json | null;
          qualification_level?: string | null;
          referral_source?: string | null;
          relevant_coursework?: string[] | null;
          resume_url?: string | null;
          role_clarity_score?: number | null;
          salary_expectation?: string | null;
          secondary_education?: Json | null;
          skill_gaps?: string[] | null;
          skills?: string[] | null;
          skills_canonical?: string[] | null;
          skills_unmapped?: string[] | null;
          summary?: string | null;
          target_industries?: string[] | null;
          target_job_titles?: string[] | null;
          updated_at?: string;
          work_environment?: string[] | null;
          work_type?: string[] | null;
        };
        Update: {
          adjacent_fields?: Json | null;
          available_start_date?: string | null;
          biggest_challenge?: string[] | null;
          cohort_label?: string | null;
          created_at?: string;
          current_employment_status?: string | null;
          cv_tailoring_strategy?: string | null;
          degree?: string | null;
          education_dates?: string | null;
          education_institution?: string | null;
          education_level?: string | null;
          employment_status?: string[] | null;
          field_of_study?: string | null;
          five_year_goal_role_id?: string | null;
          five_year_role?: string | null;
          full_name?: string | null;
          gpa?: string | null;
          has_seen_onboarding_tutorial?: boolean;
          headline?: string | null;
          honors?: string[] | null;
          id?: string;
          invite_code?: string | null;
          job_search_efforts?: string | null;
          languages?: Json | null;
          last_reality_check_date?: string | null;
          linkedin_outreach_strategy?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          onboarding_complete?: boolean | null;
          onboarding_step?: number | null;
          open_to_lateral?: boolean | null;
          open_to_outside_degree?: boolean | null;
          overall_assessment?: string | null;
          phone_number?: string | null;
          practicum_cohort?: string | null;
          practicum_path?: string | null;
          practicum_status?: string | null;
          primary_domain?: string | null;
          proof_signals?: Json | null;
          qualification_level?: string | null;
          referral_source?: string | null;
          relevant_coursework?: string[] | null;
          resume_url?: string | null;
          role_clarity_score?: number | null;
          salary_expectation?: string | null;
          secondary_education?: Json | null;
          skill_gaps?: string[] | null;
          skills?: string[] | null;
          skills_canonical?: string[] | null;
          skills_unmapped?: string[] | null;
          summary?: string | null;
          target_industries?: string[] | null;
          target_job_titles?: string[] | null;
          updated_at?: string;
          work_environment?: string[] | null;
          work_type?: string[] | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          is_current: boolean | null;
          name: string;
          skills: string[] | null;
          start_date: string | null;
          url: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean | null;
          name: string;
          skills?: string[] | null;
          start_date?: string | null;
          url?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean | null;
          name?: string;
          skills?: string[] | null;
          start_date?: string | null;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          call_count: number;
          function_name: string;
          user_id: string;
          window_start: string;
        };
        Insert: {
          call_count?: number;
          function_name: string;
          user_id: string;
          window_start: string;
        };
        Update: {
          call_count?: number;
          function_name?: string;
          user_id?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      refine_rebake_results: {
        Row: {
          antifab_refine_count: number | null;
          antifab_scratch_count: number | null;
          created_at: string;
          dropped_strong_bullet: string | null;
          errored: boolean;
          id: string;
          jd_ref: string | null;
          judge_quote: string | null;
          judge_winner: string | null;
          pair_id: string;
          pair_type: string | null;
          profile_user_id: string | null;
          refine_coverage: number | null;
          refine_http_status: number | null;
          run_id: string;
          scratch_coverage: number | null;
          scratch_http_status: number | null;
        };
        Insert: {
          antifab_refine_count?: number | null;
          antifab_scratch_count?: number | null;
          created_at?: string;
          dropped_strong_bullet?: string | null;
          errored?: boolean;
          id?: string;
          jd_ref?: string | null;
          judge_quote?: string | null;
          judge_winner?: string | null;
          pair_id: string;
          pair_type?: string | null;
          profile_user_id?: string | null;
          refine_coverage?: number | null;
          refine_http_status?: number | null;
          run_id: string;
          scratch_coverage?: number | null;
          scratch_http_status?: number | null;
        };
        Update: {
          antifab_refine_count?: number | null;
          antifab_scratch_count?: number | null;
          created_at?: string;
          dropped_strong_bullet?: string | null;
          errored?: boolean;
          id?: string;
          jd_ref?: string | null;
          judge_quote?: string | null;
          judge_winner?: string | null;
          pair_id?: string;
          pair_type?: string | null;
          profile_user_id?: string | null;
          refine_coverage?: number | null;
          refine_http_status?: number | null;
          run_id?: string;
          scratch_coverage?: number | null;
          scratch_http_status?: number | null;
        };
        Relationships: [];
      };
      status_changes: {
        Row: {
          application_id: string;
          changed_at: string;
          id: string;
          new_status: string;
          old_status: string | null;
          user_id: string;
        };
        Insert: {
          application_id: string;
          changed_at?: string;
          id?: string;
          new_status: string;
          old_status?: string | null;
          user_id: string;
        };
        Update: {
          application_id?: string;
          changed_at?: string;
          id?: string;
          new_status?: string;
          old_status?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "status_changes_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          action: string | null;
          conversation_id: string | null;
          created_at: string;
          experience_id: string | null;
          id: string;
          metrics: string[];
          relevance_tags: string[];
          result: string | null;
          situation: string | null;
          skills_demonstrated: string[];
          source: string;
          task: string | null;
          title: string;
          tools_used: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          experience_id?: string | null;
          id?: string;
          metrics?: string[];
          relevance_tags?: string[];
          result?: string | null;
          situation?: string | null;
          skills_demonstrated?: string[];
          source: string;
          task?: string | null;
          title: string;
          tools_used?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          experience_id?: string | null;
          id?: string;
          metrics?: string[];
          relevance_tags?: string[];
          result?: string | null;
          situation?: string | null;
          skills_demonstrated?: string[];
          source?: string;
          task?: string | null;
          title?: string;
          tools_used?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_experience_id_fkey";
            columns: ["experience_id"];
            isOneToOne: false;
            referencedRelation: "experiences";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          is_complete: boolean | null;
          priority: string | null;
          role_title: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_complete?: boolean | null;
          priority?: string | null;
          role_title?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_complete?: boolean | null;
          priority?: string | null;
          role_title?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      entity_spine: {
        Row: {
          created_at: string | null;
          display_title: string | null;
          end_date: string | null;
          entity_type: string | null;
          id: string | null;
          is_current: boolean | null;
          skills: string[] | null;
          start_date: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_activation_funnel: {
        Args: never;
        Returns: {
          count: number;
          ord: number;
          stage: string;
        }[];
      };
      admin_chat_messages: {
        Args: { p_limit?: number; p_user_id: string };
        Returns: {
          agent: string;
          application_id: string;
          content: string;
          conversation_id: string;
          conversation_title: string;
          created_at: string;
          id: string;
          is_error: boolean;
          original_user_message: string;
          role: string;
          suggested_agent: Json;
          suggested_application_actions: Json;
          suggested_company_target_actions: Json;
          suggested_cv_generation: Json;
          suggested_roadmap_changes: Json;
          suggested_tasks: Json;
        }[];
      };
      admin_cost_trend: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          total_calls: number;
          total_cost: number;
          total_failures: number;
        }[];
      };
      admin_function_volume: {
        Args: never;
        Returns: {
          avg_latency_ms: number;
          calls: number;
          failures: number;
          function_name: string;
          total_cost: number;
        }[];
      };
      admin_funnel: {
        Args: never;
        Returns: {
          count: number;
          ord: number;
          stage: string;
        }[];
      };
      admin_list_students: {
        Args: never;
        Returns: {
          full_name: string;
          signed_up_at: string;
          user_id: string;
        }[];
      };
      admin_stories_browse: {
        Args: { p_limit?: number; p_user_id?: string };
        Returns: {
          action: string;
          conversation_id: string;
          created_at: string;
          full_name: string;
          metrics: string[];
          raw_source_text: string;
          relevance_tags: string[];
          result: string;
          situation: string;
          skills_demonstrated: string[];
          source: string;
          story_id: string;
          task: string;
          title: string;
          tools_used: string[];
          user_id: string;
        }[];
      };
      admin_student_engagement: {
        Args: never;
        Returns: {
          applications_7d: number;
          full_name: string;
          function_calls_7d: number;
          last_application_at: string;
          onboarding_complete: boolean;
          signed_up_at: string;
          total_applications: number;
          total_cost_usd: number;
          total_stories: number;
          user_id: string;
        }[];
      };
      admin_user_counts: {
        Args: never;
        Returns: {
          onboarded: number;
          started_onboarding: number;
          visited: number;
        }[];
      };
      check_rate_limit: {
        Args: {
          p_function_name: string;
          p_max_calls: number;
          p_user_id: string;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      count_active_jobs_by_role_titles: {
        Args: {
          p_max_seniority?: string[];
          p_role_titles: string[];
          p_similarity_threshold?: number;
          p_work_types?: string[];
        };
        Returns: number;
      };
      is_admin: { Args: never; Returns: boolean };
      is_internal_user: { Args: { p_user_id: string }; Returns: boolean };
      jd_unmapped_skill_bump: {
        Args: { p_job_id: string; p_phrase: string };
        Returns: undefined;
      };
      log_error: {
        Args: {
          p_error_details?: Json;
          p_error_message: string;
          p_function_name: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      log_onboarding_event: {
        Args: {
          p_detail?: Json;
          p_error_code?: string;
          p_event: string;
          p_step: number;
        };
        Returns: undefined;
      };
      redeem_invite_code: { Args: { p_code: string }; Returns: Json };
      replace_career_roles:
        | { Args: { p_roles: Json; p_user_id: string }; Returns: undefined }
        | {
            Args: { p_input_hash?: string; p_roles: Json; p_user_id: string };
            Returns: undefined;
          };
      reset_user_data: { Args: { p_user_id: string }; Returns: Json };
      search_jobs_by_role_titles:
        | {
            Args: {
              p_limit?: number;
              p_offset?: number;
              p_role_titles: string[];
              p_similarity_threshold?: number;
            };
            Returns: {
              application_extras: string[] | null;
              apply_url: string;
              ats_source: string;
              benefits: string[] | null;
              benefits_struct: Json | null;
              bonus_mentioned: boolean | null;
              company_name: string;
              company_size_employees: number | null;
              company_slug: string;
              company_stage: string | null;
              customer_type: string[] | null;
              date_posted: string | null;
              days_in_office: number | null;
              description: string | null;
              description_hash: string | null;
              description_pre_strip: string | null;
              direct_reports_max: number | null;
              direct_reports_min: number | null;
              eligibility_constraints: Json | null;
              equity_mentioned: boolean | null;
              equity_struct: Json | null;
              external_id: string;
              extracted_at: string | null;
              extraction_confidence: number | null;
              extraction_freeform_signals: Json | null;
              extraction_model: string | null;
              extraction_schema_version: number | null;
              extraction_unmapped_skills: string[] | null;
              fetched_at: string;
              first_seen_at: string;
              founded_year: number | null;
              function_family: string | null;
              funding_signals: Json | null;
              id: string;
              il_benefits: Json | null;
              industry: string | null;
              industry_vertical: string[] | null;
              interview_process: Json | null;
              is_active: boolean;
              is_agency: boolean;
              is_il: boolean;
              is_remote: boolean;
              jd_language: string | null;
              last_seen_at: string;
              local_office_city: string | null;
              location_city: string | null;
              location_raw: string | null;
              methodology: string[] | null;
              notable_customers: string[] | null;
              office_policy: Json | null;
              on_call_expected: string | null;
              raw_payload: Json | null;
              rd_local_headcount: number | null;
              reports_to: string | null;
              reports_to_struct: Json | null;
              req_ai_tooling: Json | null;
              req_education_fields: string[] | null;
              req_education_levels: string[] | null;
              req_education_strict: boolean | null;
              req_languages: Json | null;
              req_seniority: string | null;
              req_skill_years: Json | null;
              req_skills_core: string[] | null;
              req_skills_core_raw: string[] | null;
              req_skills_must_have: string[] | null;
              req_skills_must_have_raw: string[] | null;
              req_skills_nice: string[] | null;
              req_skills_nice_raw: string[] | null;
              req_visa_constraint: string | null;
              req_years_max: number | null;
              req_years_min: number | null;
              responsibility_keywords: string[] | null;
              salary_cadence: string | null;
              salary_currency: string | null;
              salary_max: number | null;
              salary_min: number | null;
              scale_signals: Json | null;
              seniority: string;
              skill_coverage_ratio: number | null;
              team_size: number | null;
              tech_stack: string[] | null;
              title: string;
              track: string | null;
              travel_percentage: string | null;
              travel_struct: Json | null;
              years_experience_max: number | null;
              years_experience_min: number | null;
            }[];
            SetofOptions: {
              from: "*";
              to: "jobs";
              isOneToOne: false;
              isSetofReturn: true;
            };
          }
        | {
            Args: {
              p_limit?: number;
              p_max_seniority?: string[];
              p_offset?: number;
              p_role_titles: string[];
              p_similarity_threshold?: number;
            };
            Returns: {
              application_extras: string[] | null;
              apply_url: string;
              ats_source: string;
              benefits: string[] | null;
              benefits_struct: Json | null;
              bonus_mentioned: boolean | null;
              company_name: string;
              company_size_employees: number | null;
              company_slug: string;
              company_stage: string | null;
              customer_type: string[] | null;
              date_posted: string | null;
              days_in_office: number | null;
              description: string | null;
              description_hash: string | null;
              description_pre_strip: string | null;
              direct_reports_max: number | null;
              direct_reports_min: number | null;
              eligibility_constraints: Json | null;
              equity_mentioned: boolean | null;
              equity_struct: Json | null;
              external_id: string;
              extracted_at: string | null;
              extraction_confidence: number | null;
              extraction_freeform_signals: Json | null;
              extraction_model: string | null;
              extraction_schema_version: number | null;
              extraction_unmapped_skills: string[] | null;
              fetched_at: string;
              first_seen_at: string;
              founded_year: number | null;
              function_family: string | null;
              funding_signals: Json | null;
              id: string;
              il_benefits: Json | null;
              industry: string | null;
              industry_vertical: string[] | null;
              interview_process: Json | null;
              is_active: boolean;
              is_agency: boolean;
              is_il: boolean;
              is_remote: boolean;
              jd_language: string | null;
              last_seen_at: string;
              local_office_city: string | null;
              location_city: string | null;
              location_raw: string | null;
              methodology: string[] | null;
              notable_customers: string[] | null;
              office_policy: Json | null;
              on_call_expected: string | null;
              raw_payload: Json | null;
              rd_local_headcount: number | null;
              reports_to: string | null;
              reports_to_struct: Json | null;
              req_ai_tooling: Json | null;
              req_education_fields: string[] | null;
              req_education_levels: string[] | null;
              req_education_strict: boolean | null;
              req_languages: Json | null;
              req_seniority: string | null;
              req_skill_years: Json | null;
              req_skills_core: string[] | null;
              req_skills_core_raw: string[] | null;
              req_skills_must_have: string[] | null;
              req_skills_must_have_raw: string[] | null;
              req_skills_nice: string[] | null;
              req_skills_nice_raw: string[] | null;
              req_visa_constraint: string | null;
              req_years_max: number | null;
              req_years_min: number | null;
              responsibility_keywords: string[] | null;
              salary_cadence: string | null;
              salary_currency: string | null;
              salary_max: number | null;
              salary_min: number | null;
              scale_signals: Json | null;
              seniority: string;
              skill_coverage_ratio: number | null;
              team_size: number | null;
              tech_stack: string[] | null;
              title: string;
              track: string | null;
              travel_percentage: string | null;
              travel_struct: Json | null;
              years_experience_max: number | null;
              years_experience_min: number | null;
            }[];
            SetofOptions: {
              from: "*";
              to: "jobs";
              isOneToOne: false;
              isSetofReturn: true;
            };
          }
        | {
            Args: {
              p_limit?: number;
              p_max_seniority?: string[];
              p_offset?: number;
              p_role_titles: string[];
              p_similarity_threshold?: number;
              p_work_types?: string[];
            };
            Returns: {
              application_extras: string[] | null;
              apply_url: string;
              ats_source: string;
              benefits: string[] | null;
              benefits_struct: Json | null;
              bonus_mentioned: boolean | null;
              company_name: string;
              company_size_employees: number | null;
              company_slug: string;
              company_stage: string | null;
              customer_type: string[] | null;
              date_posted: string | null;
              days_in_office: number | null;
              description: string | null;
              description_hash: string | null;
              description_pre_strip: string | null;
              direct_reports_max: number | null;
              direct_reports_min: number | null;
              eligibility_constraints: Json | null;
              equity_mentioned: boolean | null;
              equity_struct: Json | null;
              external_id: string;
              extracted_at: string | null;
              extraction_confidence: number | null;
              extraction_freeform_signals: Json | null;
              extraction_model: string | null;
              extraction_schema_version: number | null;
              extraction_unmapped_skills: string[] | null;
              fetched_at: string;
              first_seen_at: string;
              founded_year: number | null;
              function_family: string | null;
              funding_signals: Json | null;
              id: string;
              il_benefits: Json | null;
              industry: string | null;
              industry_vertical: string[] | null;
              interview_process: Json | null;
              is_active: boolean;
              is_agency: boolean;
              is_il: boolean;
              is_remote: boolean;
              jd_language: string | null;
              last_seen_at: string;
              local_office_city: string | null;
              location_city: string | null;
              location_raw: string | null;
              methodology: string[] | null;
              notable_customers: string[] | null;
              office_policy: Json | null;
              on_call_expected: string | null;
              raw_payload: Json | null;
              rd_local_headcount: number | null;
              reports_to: string | null;
              reports_to_struct: Json | null;
              req_ai_tooling: Json | null;
              req_education_fields: string[] | null;
              req_education_levels: string[] | null;
              req_education_strict: boolean | null;
              req_languages: Json | null;
              req_seniority: string | null;
              req_skill_years: Json | null;
              req_skills_core: string[] | null;
              req_skills_core_raw: string[] | null;
              req_skills_must_have: string[] | null;
              req_skills_must_have_raw: string[] | null;
              req_skills_nice: string[] | null;
              req_skills_nice_raw: string[] | null;
              req_visa_constraint: string | null;
              req_years_max: number | null;
              req_years_min: number | null;
              responsibility_keywords: string[] | null;
              salary_cadence: string | null;
              salary_currency: string | null;
              salary_max: number | null;
              salary_min: number | null;
              scale_signals: Json | null;
              seniority: string;
              skill_coverage_ratio: number | null;
              team_size: number | null;
              tech_stack: string[] | null;
              title: string;
              track: string | null;
              travel_percentage: string | null;
              travel_struct: Json | null;
              years_experience_max: number | null;
              years_experience_min: number | null;
            }[];
            SetofOptions: {
              from: "*";
              to: "jobs";
              isOneToOne: false;
              isSetofReturn: true;
            };
          };
      search_new_jobs_by_role_titles: {
        Args: {
          p_limit?: number;
          p_max_seniority?: string[];
          p_offset?: number;
          p_role_titles: string[];
          p_similarity_threshold?: number;
          p_since: string;
          p_work_types?: string[];
        };
        Returns: {
          application_extras: string[] | null;
          apply_url: string;
          ats_source: string;
          benefits: string[] | null;
          benefits_struct: Json | null;
          bonus_mentioned: boolean | null;
          company_name: string;
          company_size_employees: number | null;
          company_slug: string;
          company_stage: string | null;
          customer_type: string[] | null;
          date_posted: string | null;
          days_in_office: number | null;
          description: string | null;
          description_hash: string | null;
          description_pre_strip: string | null;
          direct_reports_max: number | null;
          direct_reports_min: number | null;
          eligibility_constraints: Json | null;
          equity_mentioned: boolean | null;
          equity_struct: Json | null;
          external_id: string;
          extracted_at: string | null;
          extraction_confidence: number | null;
          extraction_freeform_signals: Json | null;
          extraction_model: string | null;
          extraction_schema_version: number | null;
          extraction_unmapped_skills: string[] | null;
          fetched_at: string;
          first_seen_at: string;
          founded_year: number | null;
          function_family: string | null;
          funding_signals: Json | null;
          id: string;
          il_benefits: Json | null;
          industry: string | null;
          industry_vertical: string[] | null;
          interview_process: Json | null;
          is_active: boolean;
          is_agency: boolean;
          is_il: boolean;
          is_remote: boolean;
          jd_language: string | null;
          last_seen_at: string;
          local_office_city: string | null;
          location_city: string | null;
          location_raw: string | null;
          methodology: string[] | null;
          notable_customers: string[] | null;
          office_policy: Json | null;
          on_call_expected: string | null;
          raw_payload: Json | null;
          rd_local_headcount: number | null;
          reports_to: string | null;
          reports_to_struct: Json | null;
          req_ai_tooling: Json | null;
          req_education_fields: string[] | null;
          req_education_levels: string[] | null;
          req_education_strict: boolean | null;
          req_languages: Json | null;
          req_seniority: string | null;
          req_skill_years: Json | null;
          req_skills_core: string[] | null;
          req_skills_core_raw: string[] | null;
          req_skills_must_have: string[] | null;
          req_skills_must_have_raw: string[] | null;
          req_skills_nice: string[] | null;
          req_skills_nice_raw: string[] | null;
          req_visa_constraint: string | null;
          req_years_max: number | null;
          req_years_min: number | null;
          responsibility_keywords: string[] | null;
          salary_cadence: string | null;
          salary_currency: string | null;
          salary_max: number | null;
          salary_min: number | null;
          scale_signals: Json | null;
          seniority: string;
          skill_coverage_ratio: number | null;
          team_size: number | null;
          tech_stack: string[] | null;
          title: string;
          track: string | null;
          travel_percentage: string | null;
          travel_struct: Json | null;
          years_experience_max: number | null;
          years_experience_min: number | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "jobs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
