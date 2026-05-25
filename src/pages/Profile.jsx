import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Upload, X, BookText, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aggregateProfileSkills } from "@/lib/skillAggregation";
import SkillTagInput from "@/components/onboarding/SkillTagInput";
import EducationTab from "@/components/profile/EducationTab";
import { PROFILE_CSS } from "@/components/profile/profileStyles";
import { createPageUrl } from "@/utils";

// Profile — Direction 3. Tabs URL-driven via ?tab=. Story Bank lives at
// /StoryBank now; this page shows a summary card linking out, plus
// inline story-count pills on each experience row.

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
  { value: "rarely", label: "Rarely — I mostly use one version" },
  { value: "never", label: "Never — I use the same CV for everything" },
];

const LINKEDIN_OPTIONS = [
  { value: "often", label: "Yes, often — I message recruiters or employees regularly" },
  { value: "sometimes", label: "Sometimes — I've tried it a few times" },
  { value: "rarely", label: "Rarely — I find it awkward" },
  { value: "never", label: "Never — I haven't tried" },
];

const CLARITY_OPTIONS = [
  { value: 1, label: "1 — No idea" },
  { value: 2, label: "2 — Vague idea" },
  { value: 3, label: "3 — Some clarity" },
  { value: 4, label: "4 — Fairly clear" },
  { value: 5, label: "5 — Very clear" },
];

const VALID_TABS = ["profile", "education", "goals", "self-assessment", "certifications", "projects", "experience"];

// ─── Reusable controls (Direction 3) ───────────────────────────────────

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
          className="p-input"
        />
        <button type="button" onClick={add} className="p-btn p-btn-outline p-btn-sm">Add</button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span key={i} className="p-chip">
              {t}
              <button onClick={() => remove(t)}><Trash2 className="w-3 h-3" /></button>
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
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className="p-tile"
            data-selected={selected.includes(value)}
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
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="p-stack-option"
            data-selected={value === o.value}
          >
            {o.label}
          </button>
        ))}
      </div>
      {isCustom && (
        <div className="mt-2 inline-flex items-center gap-1 bg-[#0E1014] text-[#F4F4F2] text-xs px-2.5 py-1 rounded-md">
          Your answer: {value}
          <button type="button" onClick={() => onChange(null)} className="hover:text-[#FDE7E3]">
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
          className="p-input"
        />
      </div>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function Profile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  // URL-driven tabs. Invalid ?tab values fall back to "profile" silently.
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : "profile";
  const setTab = (t) => {
    const next = new URLSearchParams(searchParams);
    if (t === "profile") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  const { data: profiles, isLoading: loadingProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: certifications, isLoading: loadingCerts } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("certifications").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: experiences, isLoading: loadingExp } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("experiences").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    initialData: [],
  });

  // Stories — only used here for the inline story-count pill per experience
  // and the Story Bank summary card. Create/edit/delete moved to /StoryBank.
  const { data: stories = [] } = useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("stories")
        .select("id, experience_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const storyCountByExperience = useMemo(() => {
    const m = new Map();
    for (const s of stories) {
      if (!s.experience_id) continue;
      m.set(s.experience_id, (m.get(s.experience_id) || 0) + 1);
    }
    return m;
  }, [stories]);

  const profile = profiles?.[0] || null;

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
    salary_expectation: "",
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
      salary_expectation: profile.salary_expectation || "",
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

  const [certForm, setCertForm] = useState({ name: "", issuer: "" });
  const [projectForm, setProjectForm] = useState({ name: "", description: "", skills_demonstrated: [], url: "" });
  const [expForm, setExpForm] = useState({
    id: null,
    title: "",
    company: "",
    type: "internship",
    start_date: "",
    end_date: "",
    is_current: false,
    responsibilities: "",
    skills_used: [],
    tools_used: [],
  });

  const saveProfile = async () => {
    setSaving(true);
    // Aggregate skills_canonical from EVERY source: catch-all profile.skills,
    // per-experience skills_used + tools_used, per-education skills_developed,
    // per-project skills_demonstrated. Same union as Onboarding's
    // cleanProfilePayload so both surfaces produce consistent IDs for
    // scoreJobFit. Per-object edits (addExperience, EducationTab save, etc.)
    // don't auto-recompute today — stale until next saveProfile or page reload.
    // Acceptable v1 limitation; if it bites, add a small recomputeSkillsCanonical
    // helper called after each per-object write.
    const { data: educationsRows } = await supabase
      .from("education").select("skills_developed").eq("user_id", user.id);
    const { canonical: skills_canonical, unmapped: skills_unmapped } =
      aggregateProfileSkills({
        profileSkills: profileForm.skills || [],
        experiences: experiences || [],
        educations: educationsRows || [],
        projects: projects || [],
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
      salary_expectation: profileForm.salary_expectation || null,
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
      toast.success("Resume uploaded successfully!");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Resume upload error:", err);
      toast.error("Failed to upload resume: " + err.message);
    }
    setUploading(false);
  };

  const addCert = async () => {
    if (!certForm.name) return;
    const { error } = await supabase.from("certifications").insert({
      name: certForm.name,
      issuer: certForm.issuer,
      user_id: user.id,
    });
    if (error) {
      console.error("Failed to add certification:", error);
      toast.error("Failed to add certification: " + error.message);
      return;
    }
    setCertForm({ name: "", issuer: "" });
    queryClient.invalidateQueries({ queryKey: ["certifications"] });
    toast.success("Certification added.");
  };

  const addProject = async () => {
    if (!projectForm.name) return;
    const { error } = await supabase.from("projects").insert({ ...projectForm, user_id: user.id });
    if (error) {
      console.error("Failed to add project:", error);
      toast.error("Failed to add project: " + error.message);
      return;
    }
    setProjectForm({ name: "", description: "", skills_demonstrated: [], url: "" });
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
    skills_used: [],
    tools_used: [],
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
    toast.success(wasEdit ? "Experience updated." : "Experience added.");
  };

  const isLoading = loadingProfile || loadingCerts || loadingProjects || loadingExp;

  if (isLoading) {
    return (
      <>
        <style>{PROFILE_CSS}</style>
        <div className="profile flex items-center justify-center min-h-screen">
          <Loader2 className="w-5 h-5 animate-spin text-[#52545A]" />
        </div>
      </>
    );
  }

  const SaveProfileButton = () => (
    <button type="button" onClick={saveProfile} disabled={saving} className="p-btn p-btn-primary">
      {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : "Save profile"}
    </button>
  );

  const setField = (key, val) => setProfileForm((prev) => ({ ...prev, [key]: val }));

  const TABS = [
    { id: "profile",         label: "Profile" },
    { id: "education",       label: "Education" },
    { id: "goals",           label: "Goals & preferences" },
    { id: "self-assessment", label: "Self-assessment" },
    { id: "certifications",  label: "Certifications" },
    { id: "projects",        label: "Projects" },
    { id: "experience",      label: "Experience" },
  ];

  return (
    <>
      <style>{PROFILE_CSS}</style>
      <div className="profile">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-7">
            <p className="p-eyebrow">Profile</p>
            <h1 className="p-h1 mt-1.5">Your career foundation.</h1>
            <p className="p-sub">
              Identity, experience, education, skills. Every change retriggers career analysis.
            </p>
          </div>

          {/* Tab pill bar */}
          <div className="p-tabs mb-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setTab(t.id)}
                className="p-tab"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Profile tab ─────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="p-card p-card-lg space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="p-label">Full name</label>
                  <input value={profileForm.full_name} onChange={(e) => setField("full_name", e.target.value)} className="p-input" />
                </div>
                <div>
                  <label className="p-label">Phone number</label>
                  <input value={profileForm.phone_number} onChange={(e) => setField("phone_number", e.target.value)} className="p-input" placeholder="054-1234567 or +972 54 123 4567" />
                </div>
                <div>
                  <label className="p-label">Location</label>
                  <input value={profileForm.location} onChange={(e) => setField("location", e.target.value)} className="p-input" placeholder="e.g. Tel Aviv, Israel" />
                </div>
                <div>
                  <label className="p-label">LinkedIn URL</label>
                  <input value={profileForm.linkedin_url} onChange={(e) => setField("linkedin_url", e.target.value)} className="p-input" placeholder="https://linkedin.com/in/..." />
                </div>
              </div>

              <div>
                <label className="p-label">Professional summary</label>
                <textarea
                  value={profileForm.summary}
                  onChange={(e) => setField("summary", e.target.value)}
                  className="p-input"
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

              {/* Languages — person-level, used to live on Education tab.
                  Moved up here per redesign because it sits with identity. */}
              <div>
                <label className="p-label">Languages</label>
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
                        className="p-input flex-1"
                      />
                      <Select
                        value={lang.proficiency || undefined}
                        onValueChange={(v) => {
                          const next = [...profileForm.languages];
                          next[i] = { ...next[i], proficiency: v };
                          setField("languages", next);
                        }}
                      >
                        <SelectTrigger className="text-sm w-40 border-[#DDDDDB]">
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
                        className="p-btn p-btn-ghost p-btn-sm"
                        aria-label="Remove language"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setField("languages", [...profileForm.languages, { language: "", proficiency: "Fluent" }])}
                    className="p-btn p-btn-outline p-btn-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add language
                  </button>
                </div>
              </div>

              <div>
                <label className="p-label">Resume</label>
                <div className="flex items-center gap-3">
                  <label className="p-btn p-btn-outline p-btn-sm cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Uploading…" : "Upload resume"}
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                  </label>
                  {profile?.resume_url && <span className="text-xs text-[#1D7556]">Resume uploaded</span>}
                </div>
              </div>

              <SaveProfileButton />
            </div>
          )}

          {/* ── Education tab ───────────────────────────────────────── */}
          {activeTab === "education" && (
            <EducationTab user={user} />
          )}

          {/* ── Goals & preferences tab ─────────────────────────────── */}
          {activeTab === "goals" && (
            <div className="p-card p-card-lg space-y-5">
              <p className="p-banner p-banner-info">
                These fields shape your career recommendations. When you update them, your saved applications will re-score against your new direction the next time you open them.
              </p>

              <div>
                <label className="p-label">5-year target role</label>
                <input value={profileForm.five_year_role} onChange={(e) => setField("five_year_role", e.target.value)} className="p-input" placeholder="e.g. Product Manager, Senior Data Analyst" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="p-label">Primary domain</label>
                  <Select value={profileForm.primary_domain || "__none__"} onValueChange={(v) => setField("primary_domain", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="border-[#DDDDDB]"><SelectValue placeholder="Select domain" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not set —</SelectItem>
                      {PRIMARY_DOMAIN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[#9C9DA1] mt-1">The role family that anchors your career story.</p>
                </div>
                <div>
                  <label className="p-label">Qualification level</label>
                  <Select value={profileForm.qualification_level || "__none__"} onValueChange={(v) => setField("qualification_level", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="border-[#DDDDDB]"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not set (system will infer) —</SelectItem>
                      {QUALIFICATION_LEVEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[#9C9DA1] mt-1">Controls the seniority ceiling on track_1 recommendations.</p>
                </div>
              </div>

              <div>
                <label className="p-label">Job titles you&apos;re targeting now</label>
                <TagEditor
                  tags={profileForm.target_job_titles}
                  onChange={(v) => setField("target_job_titles", v)}
                  placeholder="e.g. Marketing Coordinator, Junior Product Analyst"
                />
              </div>

              <div>
                <label className="p-label">Target industries</label>
                <TagEditor
                  tags={profileForm.target_industries}
                  onChange={(v) => setField("target_industries", v)}
                  placeholder="e.g. Fintech, Healthcare, Cybersecurity"
                />
              </div>

              <div>
                <label className="p-label">Adjacent fields</label>
                <TagEditor
                  tags={profileForm.adjacent_fields}
                  onChange={(v) => setField("adjacent_fields", v)}
                  placeholder="Other domains relevant to your background"
                />
                <p className="text-[11px] text-[#9C9DA1] mt-1">Used by the roadmap to surface bridge roles between your current and target domain.</p>
              </div>

              <div>
                <label className="p-label">Current employment status</label>
                <MultiSelectTiles
                  options={EMPLOYMENT_STATUS_OPTIONS}
                  selected={profileForm.employment_status}
                  onChange={(v) => setField("employment_status", v)}
                  exclusiveSubset={["looking_for_job", "employed", "unemployed"]}
                />
                <p className="text-[11px] text-[#9C9DA1] mt-1">If you select &quot;Student&quot;, track scoring caps recommendations at the level you can be hired into now.</p>
              </div>

              <div>
                <label className="p-label">Preferred work environment</label>
                <MultiSelectTiles
                  options={WORK_ENVIRONMENT_OPTIONS}
                  selected={profileForm.work_environment}
                  onChange={(v) => setField("work_environment", v)}
                />
              </div>

              <div>
                <label className="p-label">Work arrangement</label>
                <MultiSelectTiles
                  options={WORK_TYPE_OPTIONS}
                  selected={profileForm.work_type}
                  onChange={(v) => setField("work_type", v)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="p-label">Salary expectation (optional)</label>
                  <input value={profileForm.salary_expectation} onChange={(e) => setField("salary_expectation", e.target.value)} className="p-input" placeholder="e.g. ₪12,000 - ₪15,000 / month" />
                </div>
                <div>
                  <label className="p-label">Earliest start date</label>
                  <input
                    type="date"
                    value={profileForm.available_start_date}
                    onChange={(e) => setField("available_start_date", e.target.value)}
                    className="p-input"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.open_to_lateral}
                    onChange={(e) => setField("open_to_lateral", e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm text-[#0E1014] font-medium">Open to lateral roles</p>
                    <p className="text-xs text-[#9C9DA1]">Roles at the same level in a different function or industry.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.open_to_outside_degree}
                    onChange={(e) => setField("open_to_outside_degree", e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm text-[#0E1014] font-medium">Open to roles outside my degree field</p>
                    <p className="text-xs text-[#9C9DA1]">e.g. a Finance major applying to Operations or Product roles.</p>
                  </div>
                </label>
              </div>

              <SaveProfileButton />
            </div>
          )}

          {/* ── Self-Assessment tab ─────────────────────────────────── */}
          {activeTab === "self-assessment" && (
            <div className="p-card p-card-lg space-y-6">
              <p className="p-banner p-banner-info">
                The same questions from onboarding. Update any of these as your situation changes — they
                feed the weekly task generator and the chat agents&apos; understanding of where you&apos;re stuck.
              </p>

              <div>
                <label className="p-label">Biggest job-search challenges</label>
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
                        className="p-stack-option"
                        data-selected={isSelected}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {profileForm.biggest_challenge.filter((c) => !CHALLENGES.includes(c)).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profileForm.biggest_challenge.filter((c) => !CHALLENGES.includes(c)).map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 bg-[#0E1014] text-[#F4F4F2] text-xs px-2.5 py-1 rounded-md">
                        {c}
                        <button type="button" onClick={() => setField("biggest_challenge", profileForm.biggest_challenge.filter((x) => x !== c))} className="hover:text-[#FDE7E3]">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="p-label">CV tailoring strategy</label>
                <StackedRadio
                  options={CV_OPTIONS}
                  value={profileForm.cv_tailoring_strategy}
                  onChange={(v) => setField("cv_tailoring_strategy", v)}
                />
              </div>

              <div>
                <label className="p-label">LinkedIn outreach strategy</label>
                <StackedRadio
                  options={LINKEDIN_OPTIONS}
                  value={profileForm.linkedin_outreach_strategy}
                  onChange={(v) => setField("linkedin_outreach_strategy", v)}
                />
              </div>

              <div>
                <label className="p-label">Role clarity (1–5)</label>
                <div className="flex gap-2 flex-wrap">
                  {CLARITY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setField("role_clarity_score", profileForm.role_clarity_score === o.value ? null : o.value)}
                      className="p-tile"
                      data-selected={profileForm.role_clarity_score === o.value}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#9C9DA1] mt-2">Click again to clear.</p>
              </div>

              <div>
                <label className="p-label">Job-search efforts so far</label>
                <textarea
                  value={profileForm.job_search_efforts}
                  onChange={(e) => setField("job_search_efforts", e.target.value)}
                  placeholder="e.g. Applied to 50+ roles, attended career fairs, updated my LinkedIn..."
                  className="p-input"
                  rows={4}
                />
              </div>

              <SaveProfileButton />
            </div>
          )}

          {/* ── Certifications tab ──────────────────────────────────── */}
          {activeTab === "certifications" && (
            <div className="space-y-4">
              <div className="p-card p-card-lg space-y-4">
                <h3 className="text-sm font-semibold text-[#0E1014]">Add certification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="p-label">Certification name</label>
                    <input value={certForm.name} onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} className="p-input" />
                  </div>
                  <div>
                    <label className="p-label">Issuer</label>
                    <input value={certForm.issuer} onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })} className="p-input" placeholder="e.g. AWS, Google" />
                  </div>
                </div>
                <button type="button" onClick={addCert} className="p-btn p-btn-primary">
                  <Plus className="w-3.5 h-3.5" />Add certification
                </button>
              </div>
              {certifications.length > 0 && (
                <div className="space-y-2">
                  <p className="p-eyebrow">Your certifications</p>
                  {certifications.map((c) => (
                    <div key={c.id} className="p-card flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#0E1014]">{c.name}</p>
                        <p className="text-xs text-[#9C9DA1]">{c.issuer}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const { error } = await supabase.from("certifications").delete().eq("id", c.id).eq("user_id", user.id);
                          if (error) { toast.error("Failed to delete certification."); return; }
                          queryClient.invalidateQueries({ queryKey: ["certifications"] });
                          toast.success("Certification removed.");
                        }}
                        className="p-btn p-btn-ghost p-btn-sm"
                        aria-label="Delete certification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Projects tab ────────────────────────────────────────── */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              <div className="p-card p-card-lg space-y-4">
                <h3 className="text-sm font-semibold text-[#0E1014]">Add project</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="p-label">Project name</label>
                    <input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className="p-input" />
                  </div>
                  <div>
                    <label className="p-label">URL</label>
                    <input value={projectForm.url} onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })} className="p-input" placeholder="https://github.com/..." />
                  </div>
                </div>
                <div>
                  <label className="p-label">Description</label>
                  <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className="p-input" rows={3} />
                </div>
                <button type="button" onClick={addProject} className="p-btn p-btn-primary">
                  <Plus className="w-3.5 h-3.5" />Add project
                </button>
              </div>
              {projects.length > 0 && (
                <div className="space-y-2">
                  <p className="p-eyebrow">Your projects</p>
                  {projects.map((p) => (
                    <div key={p.id} className="p-card flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#0E1014]">{p.name}</p>
                        <p className="text-xs text-[#9C9DA1]">{p.description?.substring(0, 60)}{p.description?.length > 60 ? "..." : ""}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const { error } = await supabase.from("projects").delete().eq("id", p.id).eq("user_id", user.id);
                          if (error) { toast.error("Failed to delete project."); return; }
                          queryClient.invalidateQueries({ queryKey: ["projects"] });
                          toast.success("Project removed.");
                        }}
                        className="p-btn p-btn-ghost p-btn-sm"
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
          {activeTab === "experience" && (
            <div className="space-y-4">
              {/* Story Bank summary — links to /StoryBank for full management */}
              <div className="p-card flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#FDE7E3] flex items-center justify-center flex-shrink-0">
                    <BookText className="w-4 h-4 text-[#C84F40]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0E1014]">
                      {stories.length === 0
                        ? "No stories captured yet."
                        : `${stories.length} ${stories.length === 1 ? "story" : "stories"} captured.`}
                    </p>
                    <p className="text-xs text-[#52545A]">
                      Story Bank stores STAR-format moments that feed CVs, LinkedIn posts, and interview prep.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(createPageUrl("StoryBank"))}
                  className="p-btn p-btn-outline p-btn-sm flex-shrink-0"
                >
                  Open Story Bank<ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-card p-card-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#0E1014]">
                    {expForm.id ? "Edit experience" : "Add experience"}
                  </h3>
                  {expForm.id && (
                    <button onClick={resetExpForm} className="text-xs text-[#9C9DA1] hover:text-[#52545A] underline">
                      Cancel edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="p-label">Title</label>
                    <input value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} className="p-input" placeholder="e.g. Sergeant First Class, Marketing Intern" />
                  </div>
                  <div>
                    <label className="p-label">Company / unit / organization</label>
                    <input value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} className="p-input" placeholder="e.g. Nahal Brigade, Google" />
                  </div>
                  <div>
                    <label className="p-label">Start date</label>
                    <input value={expForm.start_date} onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })} className="p-input" placeholder="e.g. Oct 2025 or 2020" />
                  </div>
                  <div>
                    <label className="p-label">End date</label>
                    <input
                      value={expForm.end_date}
                      onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value, is_current: e.target.value.toLowerCase() === "present" })}
                      className="p-input"
                      placeholder="e.g. Jul 2025 or Present"
                    />
                  </div>
                </div>
                <div>
                  <label className="p-label">Type</label>
                  <Select value={expForm.type} onValueChange={(v) => setExpForm({ ...expForm, type: v })}>
                    <SelectTrigger className="border-[#DDDDDB]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="leadership">Leadership / Club</SelectItem>
                      <SelectItem value="military">Military / IDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="p-label">Responsibilities</label>
                  <textarea
                    value={expForm.responsibilities}
                    onChange={(e) => setExpForm({ ...expForm, responsibilities: e.target.value })}
                    className="p-input"
                    rows={5}
                    placeholder="One responsibility per line. Examples:&#10;Led a team of 5 engineers on the onboarding feature.&#10;Awarded Presidential Award for Excellence (Independence Day 2022)."
                  />
                </div>
                <SkillTagInput
                  label="Skills used"
                  description="Skills you applied in this role — feeds CV bullet generation and skill-graph matching."
                  tags={expForm.skills_used}
                  onChange={(v) => setExpForm({ ...expForm, skills_used: v })}
                  placeholder="e.g. customer success, stakeholder management"
                  suggestionType="library_skills"
                />
                <SkillTagInput
                  label="Tools used"
                  description="Software, platforms, or systems you used in this role."
                  tags={expForm.tools_used || []}
                  onChange={(v) => setExpForm({ ...expForm, tools_used: v })}
                  placeholder="e.g. Excel, Python, Salesforce"
                  suggestionType="library_skills"
                />
                <button type="button" onClick={addExperience} className="p-btn p-btn-primary">
                  {expForm.id ? "Update experience" : <><Plus className="w-3.5 h-3.5" />Add experience</>}
                </button>
              </div>

              {experiences.length > 0 && (
                <div className="space-y-2">
                  <p className="p-eyebrow">Your experience</p>
                  {experiences.map((e) => {
                    const count = storyCountByExperience.get(e.id) || 0;
                    return (
                      <div key={e.id} className="p-exp-card">
                        <div className="min-w-0 flex-1">
                          <p className="p-exp-card-title truncate">
                            {e.title} <span className="text-[#9C9DA1] font-normal">at</span> {e.company}
                          </p>
                          <p className="p-exp-card-meta">
                            {e.type?.replace("_", " ")}
                            {e.start_date ? ` · ${e.start_date}${e.end_date ? ` – ${e.end_date}` : ""}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => navigate(`${createPageUrl("StoryBank")}?filter=experience_id=${e.id}`)}
                            className="p-story-pill"
                            data-has={count > 0}
                            title={count > 0 ? "View stories in Story Bank" : "Capture a story for this experience"}
                          >
                            <BookText className="w-3 h-3" />
                            {count} {count === 1 ? "story" : "stories"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpForm({
                              id: e.id,
                              title: e.title || "",
                              company: e.company || "",
                              type: e.type || "internship",
                              start_date: e.start_date || "",
                              end_date: e.end_date || "",
                              is_current: !!e.is_current,
                              responsibilities: e.responsibilities || "",
                              skills_used: e.skills_used || [],
                              tools_used: e.tools_used || [],
                            })}
                            className="p-btn p-btn-ghost p-btn-sm"
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
                            className="p-btn p-btn-ghost p-btn-sm"
                            aria-label="Delete experience"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
