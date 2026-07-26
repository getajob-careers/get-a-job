import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { Loader2, Plus, Trash2, Upload, X, BookText, ExternalLink, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aggregateProfileSkills } from "@/lib/skillAggregation";
import { recomputeProfileSkillsCanonical } from "@/lib/recomputeProfileSkillsCanonical";
import { suggestSkillsFromUnmapped } from "@/lib/suggestSkillFromUnmapped";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useStoriesQuery } from "@/lib/queries/useStories";
import SkillTagInput from "@/components/onboarding/SkillTagInput";
import EducationTab from "@/components/profile/EducationTab";
import BulletsEditor from "@/components/profile/BulletsEditor";
import RdTabs from "@/components/redesign/RdTabs";
import { formatDateRange } from "../../supabase/functions/_shared/date-format.ts";
import { createPageUrl } from "@/utils";

// PR 3F — Profile restyled on rd-* tokens. Restyle-only on behavior;
// every write path, RLS guard, optimistic-update sequence, and the
// `recomputeProfileSkillsCanonical` invariant (PR #178 narrow-projection
// fix) are preserved verbatim. The 6 live tabs (Profile / Education /
// Goals / Self-assessment / Projects / Experience) all stay.
//
// PR 3G — profileStyles.js / PROFILE_CSS torn down. The carry-forward
// injection that lived here through PR 3F is gone now that StoryBank
// no longer consumes `.p-*` classes.
//
// Deferred (out of this PR — see tasks/redesign.md): 5-tab IA
// consolidation, Profile Strength card, standalone Languages tab.

const PRIMARY_DOMAIN_OPTIONS = [
  { value: "customer_success", label: "Customer Success" },
  { value: "customer_experience", label: "Customer Experience" },
  { value: "support", label: "Support" },
  { value: "product", label: "Product" },
  { value: "product_management", label: "Product Management" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "data", label: "Data" },
  { value: "analytics", label: "Analytics" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR" },
  { value: "people", label: "People" },
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
];

const QUALIFICATION_LEVEL_OPTIONS = [
  { value: "Junior", label: "Junior" },
  { value: "Mid-Level", label: "Mid-Level" },
  { value: "Senior", label: "Senior" },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "employed", label: "Employed" },
  { value: "looking_for_job", label: "Actively job-searching" },
  { value: "unemployed", label: "Unemployed (not actively searching)" },
];

const WORK_ENVIRONMENT_OPTIONS = ["Startup", "Scale-up", "Corporate", "Public sector", "Non-profit", "Agency"];
const WORK_TYPE_OPTIONS = ["Remote", "Hybrid", "On-site", "Full-time", "Part-time", "Contract", "Internship"];

const CHALLENGES = [
  "I don't know which roles to target",
  "I apply but get no responses",
  "I get interviews but no offers",
  "I don't know how to network effectively",
  "My CV doesn't stand out",
  "I don't know how to negotiate salary",
  "I'm not sure if my skills are relevant",
];

const CV_OPTIONS = [
  { value: "always", label: "Yes, I tailor it for most applications" },
  { value: "sometimes", label: "Sometimes, for roles I really want" },
  { value: "rarely", label: "Rarely - I mostly use one version" },
  { value: "never", label: "Never - I use the same CV for everything" },
];

const LINKEDIN_OPTIONS = [
  { value: "often", label: "Yes, often - I message recruiters or employees regularly" },
  { value: "sometimes", label: "Sometimes - I've tried it a few times" },
  { value: "rarely", label: "Rarely - I find it awkward" },
  { value: "never", label: "Never - I haven't tried" },
];

const CLARITY_OPTIONS = [
  { value: 1, label: "1 - No idea" },
  { value: 2, label: "2 - Vague idea" },
  { value: 3, label: "3 - Some clarity" },
  { value: 4, label: "4 - Fairly clear" },
  { value: 5, label: "5 - Very clear" },
];

const VALID_TABS = ["profile", "education", "goals", "self-assessment", "projects", "experience"];

// ─── rd-token class strings ────────────────────────────────────────────
// Centralised here so the same surface vocabulary is reused across every
// tab body. EducationTab + CertificationsSection + EntityCard mirror
// these in their own files.
const RD_CARD       = "rounded-[18px] border border-rd-border bg-rd-bg-card p-5 sm:p-6 shadow-rd";
const RD_CARD_LG    = "rounded-[18px] border border-rd-border bg-rd-bg-card p-6 sm:p-7 shadow-rd";
const RD_INPUT      = "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]";
const RD_LABEL      = "block text-[11px] font-display font-semibold text-rd-text mb-1.5";
const RD_EYEBROW    = "text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono";
const RD_BTN_PRIMARY = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_OUTLINE = "inline-flex items-center justify-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-3.5 py-2 transition-colors";
const RD_BTN_GHOST   = "inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rounded-full px-2.5 py-1.5 transition-colors";

// ─── Reusable controls (rd-token restyle) ──────────────────────────────

function TagEditor({ tags, onChange, placeholder }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v) return;
    if (tags.includes(v)) { setVal(""); return; }
    onChange([...tags, v]);
    setVal("");
  };
  const remove = (t) => onChange(tags.filter((x) => x !== t));
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || "Add and press Enter"}
          className={RD_INPUT}
        />
        <button
          type="button"
          onClick={add}
          className={RD_BTN_OUTLINE}
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rd-bg-soft border border-rd-border-subtle rounded-full text-[12px] text-rd-text-secondary"
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                className="text-rd-text-tertiary hover:text-rd-primary transition-colors"
                aria-label={`Remove ${t}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectTiles({ options, selected, onChange, exclusiveSubset = [] }) {
  const toggle = (val) => {
    const isOn = selected.includes(val);
    let next;
    if (isOn) {
      next = selected.filter((s) => s !== val);
    } else if (exclusiveSubset.includes(val)) {
      next = [...selected.filter((s) => !exclusiveSubset.includes(s)), val];
    } else {
      next = [...selected, val];
    }
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const value = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const isOn = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            aria-pressed={isOn}
            className={[
              "font-display font-semibold text-[12.5px] rounded-full px-3.5 py-1.5 transition-colors duration-150 whitespace-nowrap border",
              isOn
                ? "bg-rd-text text-white border-rd-text"
                : "bg-rd-bg-card text-rd-text-secondary border-rd-border hover:border-rd-border-hover hover:text-rd-text",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function StackedRadio({ options, value, onChange }) {
  const isCustom = value && !options.some((o) => o.value === value);
  const [custom, setCustom] = useState("");
  const commitCustom = () => {
    const v = custom.trim();
    if (!v) return;
    onChange(v);
    setCustom("");
  };
  return (
    <>
      <div className="space-y-2">
        {options.map((o) => {
          const isOn = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={isOn}
              className={[
                "block w-full text-left px-4 py-3 rounded-[14px] border text-[13.5px] transition-colors duration-150 cursor-pointer",
                isOn
                  ? "bg-rd-text text-white border-rd-text font-medium"
                  : "bg-rd-bg-card text-rd-text-secondary border-rd-border hover:border-rd-border-hover hover:text-rd-text",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {isCustom && (
        <div className="mt-2 inline-flex items-center gap-1.5 bg-rd-text text-white text-[12px] px-2.5 py-1 rounded-full">
          Your answer: {value}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="hover:text-rd-primary-tint"
            aria-label="Clear custom answer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="mt-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustom(); } }}
          placeholder="Or type your own answer"
          className={RD_INPUT}
        />
      </div>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

// Per-observer projection: only the experience link is needed for the
// count pills. Module-level so the select memo holds.
const selectStoryExperienceLinks = (rows) =>
  rows.map((s) => ({ id: s.id, experience_id: s.experience_id }));

export default function Profile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // PR-B2: page-only context so the agent knows the user is on Profile.
  // Depend on the STABLE setPageContext, not the whole agentDrawer object
  // (latent version of the S-B1 render-loop anti-pattern; kept consistent with
  // Home/Career/Calendar/Internship so it can never regress into the loop).
  const { setPageContext } = useAgentDrawer();
  useEffect(() => {
    setPageContext({ page: "Profile" });
    return () => setPageContext(null);
  }, [setPageContext]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  const expFormRef = React.useRef(null);

  // URL-driven tabs. Invalid ?tab values fall back to "profile" silently.
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : "profile";
  const setTab = (t) => {
    const next = new URLSearchParams(searchParams);
    if (t === "profile") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };
  // Backward compat: ?tab=certifications was a top-level tab in PR pre-
  // entity-IA-2. Certifications now live under Education. Use replace:
  // true so the back button doesn't loop the old URL.
  React.useEffect(() => {
    if (tabParam === "certifications") {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "education");
      setSearchParams(next, { replace: true });
    }
  }, [tabParam, searchParams, setSearchParams]);

  const { data: profile, isLoading: loadingProfile } = useProfileQuery(user?.id);


  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: experiences = [], isLoading: loadingExp } = useExperiencesQuery(user?.id);

  // Stories — only used here for the inline story-count pill per experience
  // and the Story Bank summary card. Create/edit/delete moved to /StoryBank.
  // Canonical hook + select option (client-side projection; never writes
  // the shared cache).
  const { data: stories = [] } = useStoriesQuery(
    user?.id,
    selectStoryExperienceLinks,
  );

  const storyCountByExperience = useMemo(() => {
    const m = new Map();
    for (const s of stories) {
      if (!s.experience_id) continue;
      m.set(s.experience_id, (m.get(s.experience_id) || 0) + 1);
    }
    return m;
  }, [stories]);


  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone_number: "",
    location: "",
    linkedin_url: "",
    summary: "",
    languages: [],
    skills: [],
    five_year_role: "",
    target_job_titles: [],
    target_industries: [],
    primary_domain: "",
    adjacent_fields: [],
    qualification_level: "",
    employment_status: [],
    work_environment: [],
    work_type: [],
    available_start_date: "",
    open_to_lateral: false,
    open_to_outside_degree: false,
    biggest_challenge: [],
    cv_tailoring_strategy: "",
    linkedin_outreach_strategy: "",
    role_clarity_score: null,
    job_search_efforts: "",
  });

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      full_name: profile.full_name || "",
      phone_number: profile.phone_number || "",
      location: profile.location || "",
      linkedin_url: profile.linkedin_url || "",
      summary: profile.summary || "",
      languages: Array.isArray(profile.languages) ? profile.languages : [],
      skills: profile.skills || [],
      five_year_role: profile.five_year_role || "",
      target_job_titles: Array.isArray(profile.target_job_titles) ? profile.target_job_titles : [],
      target_industries: Array.isArray(profile.target_industries) ? profile.target_industries : [],
      primary_domain: profile.primary_domain || "",
      adjacent_fields: Array.isArray(profile.adjacent_fields) ? profile.adjacent_fields : [],
      qualification_level: profile.qualification_level || "",
      employment_status: Array.isArray(profile.employment_status) ? profile.employment_status : [],
      work_environment: Array.isArray(profile.work_environment) ? profile.work_environment : [],
      work_type: Array.isArray(profile.work_type) ? profile.work_type : [],
      available_start_date: profile.available_start_date || "",
      open_to_lateral: !!profile.open_to_lateral,
      open_to_outside_degree: !!profile.open_to_outside_degree,
      biggest_challenge: Array.isArray(profile.biggest_challenge) ? profile.biggest_challenge : [],
      cv_tailoring_strategy: profile.cv_tailoring_strategy || "",
      linkedin_outreach_strategy: profile.linkedin_outreach_strategy || "",
      role_clarity_score: profile.role_clarity_score ?? null,
      job_search_efforts: profile.job_search_efforts || "",
    });
  }, [profile]);

  const [projectForm, setProjectForm] = useState({ name: "", description: "", skills: [], url: "" });
  const [expForm, setExpForm] = useState({
    id: null,
    title: "",
    company: "",
    type: "internship",
    start_date: "",
    end_date: "",
    is_current: false,
    responsibilities: "",
    skills: [],
  });

  const saveProfile = async () => {
    setSaving(true);
    // P1.3 read switch: single read against entity_spine (federation VIEW
    // with security_invoker preserving RLS) — replaces the 3 separate
    // entity queries. The spine surfaces each row's unified `skills`
    // column. Same PR #178 freshness pattern: re-fetch from DB rather
    // than use cached React state to dodge narrow-projection pollution.
    const { data: freshSpineRows } = await supabase
      .from("entity_spine")
      .select("skills")
      .eq("user_id", user.id);
    const { canonical: skills_canonical, unmapped: skills_unmapped } =
      aggregateProfileSkills({
        profileSkills: profileForm.skills || [],
        entitySpine: freshSpineRows || [],
      });
    const dbFields = {
      full_name: profileForm.full_name,
      phone_number: profileForm.phone_number,
      location: profileForm.location,
      linkedin_url: profileForm.linkedin_url,
      summary: profileForm.summary || null,
      languages: profileForm.languages,
      skills: profileForm.skills,
      skills_canonical,
      skills_unmapped,
      five_year_role: profileForm.five_year_role,
      target_job_titles: profileForm.target_job_titles,
      target_industries: profileForm.target_industries,
      primary_domain: profileForm.primary_domain || null,
      adjacent_fields: profileForm.adjacent_fields,
      qualification_level: profileForm.qualification_level || null,
      employment_status: profileForm.employment_status,
      work_environment: profileForm.work_environment,
      work_type: profileForm.work_type,
      available_start_date: profileForm.available_start_date || null,
      open_to_lateral: profileForm.open_to_lateral,
      open_to_outside_degree: profileForm.open_to_outside_degree,
      biggest_challenge: profileForm.biggest_challenge,
      cv_tailoring_strategy: profileForm.cv_tailoring_strategy || null,
      linkedin_outreach_strategy: profileForm.linkedin_outreach_strategy || null,
      role_clarity_score: profileForm.role_clarity_score,
      job_search_efforts: profileForm.job_search_efforts || null,
    };
    const { error } = profile
      ? await supabase.from("profiles").update(dbFields).eq("id", user.id)
      : await supabase.from("profiles").insert({ id: user.id, ...dbFields });
    if (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile: " + error.message);
      setSaving(false);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    toast.success("Profile saved.");
    setSaving(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/resume.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 315360000);

      const resumeUrl = signedData?.signedUrl || filePath;
      await supabase.from("profiles").update({ resume_url: resumeUrl }).eq("id", user.id);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      toast.success("Resume attached. Add your experience below so it powers your matches and CVs.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Resume upload error:", err);
      toast.error("Failed to upload resume: " + err.message);
    }
    setUploading(false);
  };

  const addProject = async () => {
    if (!projectForm.name) return;
    const { error } = await supabase.from("projects").insert({ ...projectForm, user_id: user.id });
    if (error) {
      console.error("Failed to add project:", error);
      toast.error("Failed to add project: " + error.message);
      return;
    }
    setProjectForm({ name: "", description: "", skills: [], url: "" });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Project added.");
  };

  const resetExpForm = () => setExpForm({
    id: null,
    title: "",
    company: "",
    type: "internship",
    start_date: "",
    end_date: "",
    is_current: false,
    responsibilities: "",
    skills: [],
  });

  const addExperience = async () => {
    if (!expForm.title || !expForm.company) return;
    const { id, ...payload } = expForm;
    const row = { ...payload, user_id: user.id };
    const { error } = id
      ? await supabase.from("experiences").update(row).eq("id", id).eq("user_id", user.id)
      : await supabase.from("experiences").insert(row);
    if (error) {
      console.error("Failed to save experience:", error);
      toast.error(`Failed to ${id ? "update" : "add"} experience: ${error.message}`);
      return;
    }
    const wasEdit = Boolean(id);
    resetExpForm();
    queryClient.invalidateQueries({ queryKey: ["experiences"] });

    // 2026-05-28 Eli-incident fix: per-experience edits MUST recompute
    // profiles.skills_canonical immediately so users editing skills_used /
    // tools_used per experience don't see their canonical set go stale
    // until the next explicit save. Shared helper fetches all 4 sources
    // FRESH from the DB — never reuse cached React state (which can be
    // a narrow projection per PR #178 pattern). Same helper is used by
    // EducationTab.handleSave.
    const recompute = await recomputeProfileSkillsCanonical(supabase, user.id);
    if (!recompute.ok) {
      console.error("Failed to recompute skills_canonical after experience save:", recompute.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }

    toast.success(wasEdit ? "Experience updated." : "Experience added.");
  };

  const isLoading = loadingProfile || loadingProjects || loadingExp;

  const SaveProfileButton = () => (
    <button type="button" onClick={saveProfile} disabled={saving} className={RD_BTN_PRIMARY}>
      {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : "Save profile"}
    </button>
  );

  const setField = (key, val) => setProfileForm((prev) => ({ ...prev, [key]: val }));

  const TABS = [
    { id: "profile",         label: "Profile" },
    { id: "education",       label: "Education" },
    { id: "goals",           label: "Goals & preferences" },
    { id: "self-assessment", label: "Self-assessment" },
    { id: "projects",        label: "Projects" },
    { id: "experience",      label: "Experience" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-7">
          <p className={RD_EYEBROW}>Profile</p>
          <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.08] tracking-tight text-rd-text mt-1">
            Your career foundation.
          </h1>
          <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-2xl">
            Identity, experience, education, skills. Every change retriggers career analysis.
          </p>
        </div>

        {/* Tab pill bar — pattern shared with Tracker/Roadmap/Jobs. */}
        <RdTabs
          tabs={TABS}
          value={activeTab}
          onChange={setTab}
          variant="pill"
          className="gap-2 mb-6 overflow-x-auto pb-1"
          aria-label="Profile sections"
        />

        {/* Tab body — skeleton while profile/related queries load,
            real content once data is in. Tab pills above stay
            clickable + URL-stateful throughout. */}
        {isLoading && <ProfileTabBodySkeleton />}

        {/* ── Profile tab ─────────────────────────────────────────── */}
        {!isLoading && activeTab === "profile" && (
          <div className={`${RD_CARD_LG} space-y-5`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={RD_LABEL}>Full name</label>
                <input value={profileForm.full_name} onChange={(e) => setField("full_name", e.target.value)} className={RD_INPUT} aria-label="Full name" />
              </div>
              <div>
                <label className={RD_LABEL}>Phone number</label>
                <input value={profileForm.phone_number} onChange={(e) => setField("phone_number", e.target.value)} className={RD_INPUT} placeholder="054-1234567 or +972 54 123 4567" />
              </div>
              <div>
                <label className={RD_LABEL}>Location</label>
                <input value={profileForm.location} onChange={(e) => setField("location", e.target.value)} className={RD_INPUT} placeholder="e.g. Berlin, Germany" />
              </div>
              <div>
                <label className={RD_LABEL}>LinkedIn URL</label>
                <input value={profileForm.linkedin_url} onChange={(e) => setField("linkedin_url", e.target.value)} className={RD_INPUT} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>

            <div>
              <label className={RD_LABEL}>Professional summary</label>
              <textarea
                value={profileForm.summary}
                onChange={(e) => setField("summary", e.target.value)}
                className={`${RD_INPUT} resize-y min-h-[110px]`}
                rows={4}
                placeholder="2–3 sentences. The CV generator uses this as the About Me anchor."
              />
            </div>

            <div>
              <SkillTagInput
                label="Skills"
                description="Search 595 standard skills or type your own."
                tags={profileForm.skills}
                onChange={(next) => setProfileForm({ ...profileForm, skills: next })}
                suggestionType="library_skills"
                placeholder="Search skills, or type and press Enter to add custom"
              />
            </div>

            <UnmappedSkillsSection
              profile={profile}
              profileForm={profileForm}
              setProfileForm={setProfileForm}
            />

            {/* Languages — person-level, used to live on Education tab.
                Moved up here per redesign because it sits with identity. */}
            <div>
              <label className={RD_LABEL}>Languages</label>
              <div className="space-y-2">
                {profileForm.languages.map((lang, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={lang.language || ""}
                      onChange={(e) => {
                        const next = [...profileForm.languages];
                        next[i] = { ...next[i], language: e.target.value };
                        setField("languages", next);
                      }}
                      placeholder="e.g. English"
                      className={`${RD_INPUT} flex-1`}
                    />
                    <Select
                      value={lang.proficiency || undefined}
                      onValueChange={(v) => {
                        const next = [...profileForm.languages];
                        next[i] = { ...next[i], proficiency: v };
                        setField("languages", next);
                      }}
                    >
                      <SelectTrigger className="text-sm w-40 border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text">
                        <SelectValue placeholder="Proficiency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Native">Native</SelectItem>
                        <SelectItem value="Fluent">Fluent</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Conversational">Conversational</SelectItem>
                        <SelectItem value="Basic">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => {
                        const next = profileForm.languages.filter((_, idx) => idx !== i);
                        setField("languages", next);
                      }}
                      className={RD_BTN_GHOST}
                      aria-label="Remove language"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setField("languages", [...profileForm.languages, { language: "", proficiency: "Fluent" }])}
                  className={RD_BTN_OUTLINE}
                >
                  <Plus className="w-3.5 h-3.5" /> Add language
                </button>
              </div>
            </div>

            <div>
              <label className={RD_LABEL}>Resume</label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className={`${RD_BTN_OUTLINE} cursor-pointer`}>
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Uploading…" : "Upload resume"}
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                </label>
                {profile?.resume_url && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-rd-teal-dark">
                    <Check className="w-3.5 h-3.5" /> Resume attached
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-rd-text-tertiary mt-2 leading-[1.5]">
                We keep this on file for CV generation. It does not auto-fill your
                experience; add that in the Experience tab below.
              </p>
            </div>

            <SaveProfileButton />
          </div>
        )}

        {/* ── Education tab ───────────────────────────────────────── */}
        {!isLoading && activeTab === "education" && (
          <EducationTab user={user} />
        )}

        {/* ── Goals & preferences tab ─────────────────────────────── */}
        {!isLoading && activeTab === "goals" && (
          <div className={`${RD_CARD_LG} space-y-5`}>
            <p className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-teal-tint border border-rd-teal/30 text-rd-text">
              These fields shape your career recommendations. When you update them, your saved applications will re-score against your new direction the next time you open them.
            </p>

            <div>
              <label className={RD_LABEL}>5-year target role</label>
              <input value={profileForm.five_year_role} onChange={(e) => setField("five_year_role", e.target.value)} className={RD_INPUT} placeholder="e.g. Product Manager, Senior Data Analyst" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={RD_LABEL}>Primary domain</label>
                <Select value={profileForm.primary_domain || "__none__"} onValueChange={(v) => setField("primary_domain", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text"><SelectValue placeholder="Select domain" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not set —</SelectItem>
                    {PRIMARY_DOMAIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-rd-text-tertiary mt-1.5">The role family that anchors your career story.</p>
              </div>
              <div>
                <label className={RD_LABEL}>Qualification level</label>
                <Select value={profileForm.qualification_level || "__none__"} onValueChange={(v) => setField("qualification_level", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not set (system will infer) —</SelectItem>
                    {QUALIFICATION_LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-rd-text-tertiary mt-1.5">Controls the seniority ceiling on track_1 recommendations.</p>
              </div>
            </div>

            <div>
              <label className={RD_LABEL}>Job titles you&apos;re targeting now</label>
              <TagEditor
                tags={profileForm.target_job_titles}
                onChange={(v) => setField("target_job_titles", v)}
                placeholder="e.g. Marketing Coordinator, Junior Product Analyst"
              />
            </div>

            <div>
              <label className={RD_LABEL}>Target industries</label>
              <TagEditor
                tags={profileForm.target_industries}
                onChange={(v) => setField("target_industries", v)}
                placeholder="e.g. Fintech, Healthcare, Cybersecurity"
              />
            </div>

            <div>
              <label className={RD_LABEL}>Adjacent fields</label>
              <TagEditor
                tags={profileForm.adjacent_fields}
                onChange={(v) => setField("adjacent_fields", v)}
                placeholder="Other domains relevant to your background"
              />
              <p className="text-[11px] text-rd-text-tertiary mt-1.5">Used by the roadmap to surface bridge roles between your current and target domain.</p>
            </div>

            <div>
              <label className={RD_LABEL}>Current employment status</label>
              <MultiSelectTiles
                options={EMPLOYMENT_STATUS_OPTIONS}
                selected={profileForm.employment_status}
                onChange={(v) => setField("employment_status", v)}
                exclusiveSubset={["looking_for_job", "employed", "unemployed"]}
              />
              <p className="text-[11px] text-rd-text-tertiary mt-1.5">If you select &quot;Student&quot;, track scoring caps recommendations at the level you can be hired into now.</p>
            </div>

            <div>
              <label className={RD_LABEL}>Preferred work environment</label>
              <MultiSelectTiles
                options={WORK_ENVIRONMENT_OPTIONS}
                selected={profileForm.work_environment}
                onChange={(v) => setField("work_environment", v)}
              />
            </div>

            <div>
              <label className={RD_LABEL}>Work arrangement</label>
              <MultiSelectTiles
                options={WORK_TYPE_OPTIONS}
                selected={profileForm.work_type}
                onChange={(v) => setField("work_type", v)}
              />
            </div>

            <div>
              <label className={RD_LABEL}>Earliest start date</label>
              <input
                type="date"
                value={profileForm.available_start_date}
                onChange={(e) => setField("available_start_date", e.target.value)}
                className={RD_INPUT}
              />
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profileForm.open_to_lateral}
                  onChange={(e) => setField("open_to_lateral", e.target.checked)}
                  className="rounded accent-rd-primary"
                />
                <div>
                  <p className="text-[13px] text-rd-text font-display font-semibold">Open to lateral roles</p>
                  <p className="text-[11.5px] text-rd-text-tertiary">Roles at the same level in a different function or industry.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profileForm.open_to_outside_degree}
                  onChange={(e) => setField("open_to_outside_degree", e.target.checked)}
                  className="rounded accent-rd-primary"
                />
                <div>
                  <p className="text-[13px] text-rd-text font-display font-semibold">Open to roles outside my degree field</p>
                  <p className="text-[11.5px] text-rd-text-tertiary">e.g. a Finance major applying to Operations or Product roles.</p>
                </div>
              </label>
            </div>

            <SaveProfileButton />
          </div>
        )}

        {/* ── Self-Assessment tab ─────────────────────────────────── */}
        {!isLoading && activeTab === "self-assessment" && (
          <div className={`${RD_CARD_LG} space-y-6`}>
            <p className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-teal-tint border border-rd-teal/30 text-rd-text">
              The same questions from onboarding. Update any of these as your situation changes - they
              feed the weekly task generator and the chat agents&apos; understanding of where you&apos;re stuck.
            </p>

            <div>
              <label className={RD_LABEL}>Biggest job-search challenges</label>
              <div className="grid grid-cols-1 gap-2">
                {CHALLENGES.map((c) => {
                  const isSelected = profileForm.biggest_challenge.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? profileForm.biggest_challenge.filter((x) => x !== c)
                          : [...profileForm.biggest_challenge, c];
                        setField("biggest_challenge", next);
                      }}
                      aria-pressed={isSelected}
                      className={[
                        "block w-full text-left px-4 py-3 rounded-[14px] border text-[13.5px] transition-colors duration-150 cursor-pointer",
                        isSelected
                          ? "bg-rd-text text-white border-rd-text font-medium"
                          : "bg-rd-bg-card text-rd-text-secondary border-rd-border hover:border-rd-border-hover hover:text-rd-text",
                      ].join(" ")}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {profileForm.biggest_challenge.filter((c) => !CHALLENGES.includes(c)).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profileForm.biggest_challenge.filter((c) => !CHALLENGES.includes(c)).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 bg-rd-text text-white text-[12px] px-2.5 py-1 rounded-full">
                      {c}
                      <button type="button" onClick={() => setField("biggest_challenge", profileForm.biggest_challenge.filter((x) => x !== c))} className="hover:text-rd-primary-tint" aria-label={`Remove ${c}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={RD_LABEL}>CV tailoring strategy</label>
              <StackedRadio
                options={CV_OPTIONS}
                value={profileForm.cv_tailoring_strategy}
                onChange={(v) => setField("cv_tailoring_strategy", v)}
              />
            </div>

            <div>
              <label className={RD_LABEL}>LinkedIn outreach strategy</label>
              <StackedRadio
                options={LINKEDIN_OPTIONS}
                value={profileForm.linkedin_outreach_strategy}
                onChange={(v) => setField("linkedin_outreach_strategy", v)}
              />
            </div>

            <div>
              <label className={RD_LABEL}>Role clarity (1–5)</label>
              <div className="flex gap-2 flex-wrap">
                {CLARITY_OPTIONS.map((o) => {
                  const isOn = profileForm.role_clarity_score === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setField("role_clarity_score", profileForm.role_clarity_score === o.value ? null : o.value)}
                      aria-pressed={isOn}
                      className={[
                        "font-display font-semibold text-[12.5px] rounded-full px-3.5 py-1.5 transition-colors duration-150 whitespace-nowrap border",
                        isOn
                          ? "bg-rd-text text-white border-rd-text"
                          : "bg-rd-bg-card text-rd-text-secondary border-rd-border hover:border-rd-border-hover hover:text-rd-text",
                      ].join(" ")}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-rd-text-tertiary mt-2">Click again to clear.</p>
            </div>

            <div>
              <label className={RD_LABEL}>Job-search efforts so far</label>
              <textarea
                value={profileForm.job_search_efforts}
                onChange={(e) => setField("job_search_efforts", e.target.value)}
                placeholder="e.g. Applied to 50+ roles, attended career fairs, updated my LinkedIn..."
                className={`${RD_INPUT} resize-y min-h-[110px]`}
                rows={4}
              />
            </div>

            <SaveProfileButton />
          </div>
        )}

        {/* Certifications now render under the Education tab via
            CertificationsSection (PR 2 of the entity IA). The old
            standalone certifications tab + URL redirect to ?tab=education
            above. */}

        {/* ── Projects tab ────────────────────────────────────────── */}
        {!isLoading && activeTab === "projects" && (
          <div className="space-y-4">
            <div className={`${RD_CARD_LG} space-y-4`}>
              <h3 className="font-display font-bold text-[14px] text-rd-text">Add project</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={RD_LABEL}>Project name</label>
                  <input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className={RD_INPUT} />
                </div>
                <div>
                  <label className={RD_LABEL}>URL</label>
                  <input value={projectForm.url} onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })} className={RD_INPUT} placeholder="https://github.com/..." />
                </div>
              </div>
              <div>
                <label className={RD_LABEL}>Description</label>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className={`${RD_INPUT} resize-y min-h-[90px]`} rows={3} />
              </div>
              <button type="button" onClick={addProject} className={RD_BTN_PRIMARY}>
                <Plus className="w-3.5 h-3.5" />Add project
              </button>
            </div>
            {projects.length > 0 && (
              <div className="space-y-2">
                <p className={RD_EYEBROW}>Your projects</p>
                {projects.map((p) => (
                  <div key={p.id} className={`${RD_CARD} flex items-center justify-between gap-3`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-display font-bold text-rd-text truncate">{p.name}</p>
                      <p className="text-[12px] text-rd-text-tertiary truncate">{p.description?.substring(0, 60)}{p.description?.length > 60 ? "..." : ""}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const { error } = await supabase.from("projects").delete().eq("id", p.id).eq("user_id", user.id);
                        if (error) { toast.error("Failed to delete project."); return; }
                        queryClient.invalidateQueries({ queryKey: ["projects"] });
                        toast.success("Project removed.");
                      }}
                      className={RD_BTN_GHOST}
                      aria-label="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Experience tab ──────────────────────────────────────── */}
        {!isLoading && activeTab === "experience" && (
          <div className="space-y-4">
            {/* Story Bank summary — links to /StoryBank for full management */}
            <div className={`${RD_CARD} flex items-center justify-between gap-3 flex-wrap`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-[12px] bg-rd-primary-tint flex items-center justify-center flex-shrink-0">
                  <BookText className="w-4 h-4 text-rd-primary-dark" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-display font-bold text-rd-text">
                    {stories.length === 0
                      ? "No stories captured yet."
                      : `${stories.length} ${stories.length === 1 ? "story" : "stories"} captured.`}
                  </p>
                  <p className="text-[12px] text-rd-text-secondary leading-[1.5]">
                    Story Bank stores STAR-format moments that feed CVs, LinkedIn posts, and interview prep.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(createPageUrl("StoryBank"))}
                className={`${RD_BTN_OUTLINE} flex-shrink-0`}
              >
                Open Story Bank<ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div ref={expFormRef} className={`${RD_CARD_LG} space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[14px] text-rd-text">
                  {expForm.id ? "Edit experience" : "Add experience"}
                </h3>
                {expForm.id && (
                  <button onClick={resetExpForm} className="text-[12px] text-rd-text-tertiary hover:text-rd-text underline">
                    Cancel edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={RD_LABEL}>Title</label>
                  <input value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} className={RD_INPUT} placeholder="e.g. Team Lead, Marketing Intern" />
                </div>
                <div>
                  <label className={RD_LABEL}>Company / organization</label>
                  <input value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} className={RD_INPUT} placeholder="e.g. Acme Corp, Google" />
                </div>
                <div>
                  <label className={RD_LABEL}>Start date</label>
                  <input value={expForm.start_date} onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })} className={RD_INPUT} placeholder="e.g. Oct 2025 or 2020" />
                </div>
                <div>
                  <label className={RD_LABEL}>End date</label>
                  <input
                    value={expForm.end_date}
                    onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value, is_current: e.target.value.toLowerCase() === "present" })}
                    className={RD_INPUT}
                    placeholder="e.g. Jul 2025 or Present"
                  />
                </div>
              </div>
              <div>
                <label className={RD_LABEL}>Type</label>
                <Select value={expForm.type} onValueChange={(v) => setExpForm({ ...expForm, type: v })}>
                  <SelectTrigger className="border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="founder">Founder / Self-employed</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="leadership">Leadership / Club</SelectItem>
                    <SelectItem value="military">Military Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={RD_LABEL}>Responsibilities</label>
                <textarea
                  value={expForm.responsibilities}
                  onChange={(e) => setExpForm({ ...expForm, responsibilities: e.target.value })}
                  className={`${RD_INPUT} resize-y min-h-[130px]`}
                  rows={5}
                  placeholder="One responsibility per line. Examples:&#10;Led a team of 5 engineers on the onboarding feature.&#10;Awarded Employee of the Quarter (Q3 2024)."
                />
              </div>
              <SkillTagInput
                label="Skills & tools"
                description="Skills you applied + software / platforms you used in this role - feeds CV bullet generation and skill-graph matching."
                tags={expForm.skills}
                onChange={(v) => setExpForm({ ...expForm, skills: v })}
                placeholder="e.g. customer success, stakeholder management, Salesforce, Python"
                suggestionType="library_skills"
              />
              <button type="button" onClick={addExperience} className={RD_BTN_PRIMARY}>
                {expForm.id ? "Update experience" : <><Plus className="w-3.5 h-3.5" />Add experience</>}
              </button>
            </div>

            {experiences.length > 0 && (
              <div className="space-y-2">
                <p className={RD_EYEBROW}>Your experience</p>
                {experiences.map((e) => {
                  const count = storyCountByExperience.get(e.id) || 0;
                  return (
                    <div
                      key={e.id}
                      data-app-id={e.id}
                      className={`${RD_CARD} hover:border-rd-border-hover transition-colors`}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-[14px] text-rd-text truncate">
                          {e.title} <span className="text-rd-text-tertiary font-normal">at</span> {e.company}
                        </p>
                        <p className="text-[12px] text-rd-text-tertiary mt-0.5">
                          {e.type?.replace("_", " ")}
                          {e.start_date || e.end_date || e.is_current
                            ? ` · ${formatDateRange(e.start_date, e.end_date, e.is_current)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(`${createPageUrl("StoryBank")}?filter=experience_id=${e.id}`)}
                          className={[
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-semibold text-[10.5px] tracking-[0.04em] transition-colors",
                            count > 0
                              ? "bg-rd-primary-tint text-rd-primary-dark hover:bg-rd-primary-tint/80"
                              : "bg-rd-bg-soft text-rd-text-tertiary hover:bg-rd-border",
                          ].join(" ")}
                          title={count > 0 ? "View stories in Story Bank" : "Capture a story for this experience"}
                        >
                          <BookText className="w-3 h-3" />
                          {count} {count === 1 ? "story" : "stories"}
                        </button>
                        <button
                          type="button"
                          data-exp-edit={e.id}
                          onClick={() => {
                            setExpForm({
                              id: e.id,
                              title: e.title || "",
                              company: e.company || "",
                              type: e.type || "internship",
                              start_date: e.start_date || "",
                              end_date: e.end_date || "",
                              is_current: !!e.is_current,
                              responsibilities: e.responsibilities || "",
                              skills: e.skills || [],
                            });
                            // Edit fills the form at the top of the tab; without
                            // this the populated form is a silent off-screen change
                            // when the edited row is lower down. Honor reduced motion.
                            expFormRef.current?.scrollIntoView({
                              behavior: window.matchMedia?.(
                                "(prefers-reduced-motion: reduce)",
                              )?.matches
                                ? "auto"
                                : "smooth",
                              block: "start",
                            });
                          }}
                          className={RD_BTN_GHOST}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const { error } = await supabase.from("experiences").delete().eq("id", e.id).eq("user_id", user.id);
                            if (error) { toast.error("Failed to delete experience."); return; }
                            queryClient.invalidateQueries({ queryKey: ["experiences"] });
                            if (expForm.id === e.id) resetExpForm();
                            toast.success("Experience removed.");
                          }}
                          className={RD_BTN_GHOST}
                          aria-label="Delete experience"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      </div>
                      <BulletsEditor
                        targetType="experience"
                        entity={e}
                        userId={user?.id}
                        onChanged={() =>
                          queryClient.invalidateQueries({ queryKey: ["experiences"] })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </div>
  );
}

// Profile tab body skeleton — renders in place of the active tab's
// form/list while profile-related queries are loading. Tab pills above
// stay visible so the user can navigate (URL `?tab=` switches but each
// tab will see the same skeleton until data arrives). 6 placeholder
// input rows in a 2-column grid mirror the typical Profile / Goals /
// Self-Assessment form shape.
function ProfileTabBodySkeleton() {
  return (
    <div className="rounded-[18px] border border-rd-border bg-rd-bg-card p-6 sm:p-7 shadow-rd space-y-5" aria-hidden="true">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
    </div>
  );
}

// Phase 0a — surface profiles.skills_unmapped for user remediation.
// Until this PR, unmapped skills were write-only debug telemetry — users
// had no way to see or fix labels the matcher couldn't recognise.
// Renders the section ONLY when there's at least one unmapped label that
// also lives in profileForm.skills (the catch-all). Per-entity unmapped
// (e.g. an experience.skills_used label) is out of scope for 0a — those
// need to be edited on the source entry. Tone: quiet, not alarming.
function UnmappedSkillsSection({ profile, profileForm, setProfileForm }) {
  const persistedUnmapped = Array.isArray(profile?.skills_unmapped) ? profile.skills_unmapped : [];
  const profileSkillsLower = useMemo(
    () => new Set((profileForm.skills || []).map((s) => String(s).toLowerCase().trim())),
    [profileForm.skills],
  );
  // Only show unmapped labels that are present in the user's catch-all
  // skills array (where this UI can actually fix them via setProfileForm).
  // The persisted skills_unmapped column unions all sources, so per-entity
  // labels appear there too — but editing those requires going to the
  // experience/education/project row.
  const fixable = useMemo(
    () => persistedUnmapped.filter((u) => profileSkillsLower.has(String(u).toLowerCase().trim())),
    [persistedUnmapped, profileSkillsLower],
  );

  if (fixable.length === 0) return null;

  const replaceLabel = (oldLabel, newLabel) => {
    const oldLower = String(oldLabel).toLowerCase().trim();
    const next = (profileForm.skills || []).map((s) =>
      String(s).toLowerCase().trim() === oldLower ? newLabel : s,
    );
    setProfileForm({ ...profileForm, skills: next });
  };

  const removeLabel = (label) => {
    const lower = String(label).toLowerCase().trim();
    const next = (profileForm.skills || []).filter(
      (s) => String(s).toLowerCase().trim() !== lower,
    );
    setProfileForm({ ...profileForm, skills: next });
  };

  return (
    <div className="rounded-[14px] border border-rd-golden/40 bg-rd-golden-tint/60 px-4 py-3.5">
      <p className="text-[12px] font-display font-bold text-rd-text mb-1">
        Skills we couldn&apos;t match ({fixable.length})
      </p>
      <p className="text-[11.5px] text-rd-text-secondary mb-3 leading-relaxed">
        These labels are in your skills but don&apos;t match a standard skill - so
        they won&apos;t count for job matching or CV tailoring. Pick a suggestion
        to replace, or remove. Changes save when you save the profile.
      </p>
      <div className="space-y-2">
        {fixable.map((label) => {
          const suggestions = suggestSkillsFromUnmapped(label);
          return (
            <div key={label} className="bg-rd-bg-card border border-rd-border rounded-[10px] px-3 py-2.5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <span className="text-[12.5px] text-rd-text font-display font-semibold">{label}</span>
                <button
                  type="button"
                  onClick={() => removeLabel(label)}
                  className="text-[11px] text-rd-text-tertiary hover:text-rd-primary-dark transition-colors"
                >
                  Remove
                </button>
              </div>
              {suggestions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-rd-text-tertiary self-center">Did you mean:</span>
                  {suggestions.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => replaceLabel(label, s.name)}
                      className="text-[11px] px-2.5 py-0.5 rounded-full border border-rd-border text-rd-text-secondary hover:border-rd-text hover:text-rd-text transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-rd-text-tertiary italic">
                  No close match in the standard library - remove or leave as-is.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
