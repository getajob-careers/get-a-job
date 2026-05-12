import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Upload, X, BookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StorySaveCard from "@/components/chat/StorySaveCard";

// ─── Enum sources ──────────────────────────────────────────────────────────
// Mirror the values onboarding writes so AddInformation can edit them with
// the same vocabulary. Out-of-sync values would silently break tier scoring
// (primary_domain) and userStage derivation (employment_status,
// qualification_level) in analyze-job-match.

// Keys of PRIMARY_DOMAIN_TO_FAMILIES in generate-career-analysis.
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

// inferQualificationLevel in generate-career-analysis returns one of these.
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

// Survey enums copied from StepSurvey — same values, so when the user revisits
// the same answers in AddInformation they see their selection re-highlighted.
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

// ─── Reusable controls ─────────────────────────────────────────────────────

// Tag editor for text[] columns (target_job_titles, honors, relevant_coursework,
// adjacent_fields). One control encapsulates the input + chip list pattern so
// the JSX below stays scannable.
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
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || "Add and press Enter"}
          className="text-sm"
        />
        <Button variant="outline" size="sm" onClick={add} className="text-xs px-3">Add</Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs bg-[#F5F5F5] text-[#525252] px-2 py-1 rounded-md border border-[#E5E5E5]">
              {t}
              <button onClick={() => remove(t)} className="hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Multi-select via tile buttons. For text[] columns where the values are a
// fixed enum (employment_status, work_environment, work_type).
function MultiSelectTiles({ options, selected, onChange }) {
  const toggle = (val) => {
    const set = new Set(selected);
    if (set.has(val)) set.delete(val); else set.add(val);
    onChange(Array.from(set));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const value = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const isSelected = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              isSelected
                ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Single-select via stacked buttons — for fields that StepSurvey renders this
// way (cv_tailoring_strategy, linkedin_outreach_strategy). Custom value entry
// supported via a free-text fallback below the options.
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
            className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
              value === o.value
                ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {isCustom && (
        <div className="mt-2 inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2.5 py-1 rounded-md">
          Your answer: {value}
          <button type="button" onClick={() => onChange(null)} className="hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="mt-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustom(); } }}
          placeholder="Or type your own answer"
          className="text-sm"
        />
      </div>
    </>
  );
}

export default function AddInformation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

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

  // Story Bank Phase 2 — surface stories on the Experience tab + floating
  // quick-add. Single query, then group client-side by experience_id (cheaper
  // than per-experience queries). Only stories with experience_id are shown
  // here; floating chat-captured stories without a link still exist but
  // belong on a future stories management page.
  const { data: stories = [] } = useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const storiesByExperience = useMemo(() => {
    const m = new Map();
    for (const s of stories) {
      if (!s.experience_id) continue;
      if (!m.has(s.experience_id)) m.set(s.experience_id, []);
      m.get(s.experience_id).push(s);
    }
    return m;
  }, [stories]);

  // Story modal state — shape: { experience_id (or null for quick-add picker),
  // source ('manual_form' | 'manual_quick_add') }. null = closed.
  const [storyModal, setStoryModal] = useState(null);
  // Quick-add modal needs an experience picker; tracks the user's selection
  // before passing it through to the StorySaveCard.
  const [quickAddExperienceId, setQuickAddExperienceId] = useState("");

  // Daily Action Card "reflect" handoff. When Home navigates here with
  // location.state.dailyAction = { id, prompt }, open the quick-add modal
  // with that prompt as `framing`, and after the story saves mark the
  // referenced daily_actions row as done. The reflection IS the capture.
  const location = useLocation();
  const navigate = useNavigate();
  const [dailyActionCtx, setDailyActionCtx] = useState(null);
  useEffect(() => {
    const incoming = location.state?.dailyAction;
    if (!incoming?.id || !incoming?.prompt) return;
    setDailyActionCtx(incoming);
    setQuickAddExperienceId(experiences?.[0]?.id || "");
    setStoryModal({ experience_id: null, source: "manual_quick_add" });
    // Clear the navigation state so a manual refresh doesn't re-open.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.dailyAction?.id]);

  const handleExtractStory = async (text) => {
    try {
      const { data, error } = await supabase.functions.invoke("extract-story-from-text", {
        body: { text, source: storyModal?.source || "manual_form" },
      });
      if (error) {
        console.error("Story extraction error:", error);
        return null;
      }
      return data || null;
    } catch (err) {
      console.error("Story extraction exception:", err);
      return null;
    }
  };

  const handleSaveStory = async (story, capture) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        source: storyModal?.source || "manual_form",
        experience_id: capture?.experience_id || null,
        title: story.title,
        situation: story.situation || null,
        task: story.task || null,
        action: story.action || null,
        result: story.result || null,
        metrics: Array.isArray(story.metrics) ? story.metrics : [],
        skills_demonstrated: Array.isArray(story.skills_demonstrated) ? story.skills_demonstrated : [],
        tools_used: Array.isArray(story.tools_used) ? story.tools_used : [],
        relevance_tags: Array.isArray(story.relevance_tags) ? story.relevance_tags : [],
      });
      if (error) {
        console.error("Story save error:", error);
        toast.error("Could not save story. Please try again.");
        return false;
      }
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story saved.");

      // Daily Action handoff: if this story came from a Reflect daily action,
      // mark the daily_action row as done now that the story landed. The
      // reflection IS the capture — completing one completes the other.
      if (dailyActionCtx?.id) {
        const { error: daErr } = await supabase
          .from("daily_actions")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", dailyActionCtx.id);
        if (daErr) {
          // Soft-fail — story saved, just couldn't update the daily action.
          console.warn("Daily action mark-done failed:", daErr.message);
        } else {
          queryClient.invalidateQueries({ queryKey: ["daily_action", user.id] });
        }
        setDailyActionCtx(null);
      }

      // Close after a short delay so the user sees the success state in the card
      setTimeout(() => setStoryModal(null), 1200);
      return true;
    } catch (err) {
      console.error("Story save exception:", err);
      return false;
    }
  };

  const profile = profiles?.[0] || null;

  // profileForm shape mirrors the columns onboarding writes to so every
  // onboarding-collected value is editable here. New columns added to
  // onboarding need to be added here too — the test in saveProfile that
  // pushes the dbFields object is the source of truth for what persists.
  const [profileForm, setProfileForm] = useState({
    // Identity / contact
    full_name: "",
    phone_number: "",
    location: "",
    linkedin_url: "",
    summary: "",
    // Education
    education_level: "",
    education_institution: "",
    degree: "",
    field_of_study: "",
    education_dates: "",
    gpa: "",
    honors: [],
    relevant_coursework: [],
    languages: [],
    secondary_education: { institution: "", location: "", dates: "", highlights: [] },
    // Skills + career direction
    skills: [],
    five_year_role: "",
    target_job_titles: [],
    target_industries: [],
    primary_domain: "",
    adjacent_fields: [],
    qualification_level: "",
    // Preferences / constraints
    employment_status: [],
    work_environment: [],
    work_type: [],
    salary_expectation: "",
    available_start_date: "",
    open_to_lateral: false,
    open_to_outside_degree: false,
    // Self-assessment (StepSurvey)
    biggest_challenge: [],
    cv_tailoring_strategy: "",
    linkedin_outreach_strategy: "",
    role_clarity_score: null,
    job_search_efforts: "",
  });

  React.useEffect(() => {
    if (!profile) return;
    setProfileForm({
      full_name: profile.full_name || "",
      phone_number: profile.phone_number || "",
      location: profile.location || "",
      linkedin_url: profile.linkedin_url || "",
      summary: profile.summary || "",
      education_level: profile.education_level || "",
      education_institution: profile.education_institution || "",
      degree: profile.degree || "",
      field_of_study: profile.field_of_study || "",
      education_dates: profile.education_dates || "",
      gpa: profile.gpa || "",
      honors: Array.isArray(profile.honors) ? profile.honors : [],
      relevant_coursework: Array.isArray(profile.relevant_coursework) ? profile.relevant_coursework : [],
      languages: Array.isArray(profile.languages) ? profile.languages : [],
      secondary_education: profile.secondary_education && typeof profile.secondary_education === "object"
        ? {
            institution: profile.secondary_education.institution || "",
            location: profile.secondary_education.location || "",
            dates: profile.secondary_education.dates || "",
            highlights: Array.isArray(profile.secondary_education.highlights) ? profile.secondary_education.highlights : [],
          }
        : { institution: "", location: "", dates: "", highlights: [] },
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

  const [skillInput, setSkillInput] = useState("");
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
  });

  const saveProfile = async () => {
    setSaving(true);
    // Normalise secondary_education: empty object → null so the CV renderer
    // (which gates rendering on truthy institution) doesn't show an empty
    // Education entry.
    const se = profileForm.secondary_education || {};
    const seHasContent = !!(
      se.institution?.trim() ||
      se.location?.trim() ||
      se.dates?.trim() ||
      (se.highlights || []).some((h) => h?.trim())
    );
    const dbFields = {
      // Identity / contact
      full_name: profileForm.full_name,
      phone_number: profileForm.phone_number,
      location: profileForm.location,
      linkedin_url: profileForm.linkedin_url,
      summary: profileForm.summary || null,
      // Education
      education_level: profileForm.education_level,
      education_institution: profileForm.education_institution || null,
      degree: profileForm.degree || null,
      field_of_study: profileForm.field_of_study,
      education_dates: profileForm.education_dates,
      gpa: profileForm.gpa || null,
      honors: profileForm.honors,
      relevant_coursework: profileForm.relevant_coursework,
      languages: profileForm.languages,
      secondary_education: seHasContent ? se : null,
      // Skills + career direction
      skills: profileForm.skills,
      five_year_role: profileForm.five_year_role,
      target_job_titles: profileForm.target_job_titles,
      target_industries: profileForm.target_industries,
      primary_domain: profileForm.primary_domain || null,
      adjacent_fields: profileForm.adjacent_fields,
      qualification_level: profileForm.qualification_level || null,
      // Preferences / constraints
      employment_status: profileForm.employment_status,
      work_environment: profileForm.work_environment,
      work_type: profileForm.work_type,
      salary_expectation: profileForm.salary_expectation || null,
      available_start_date: profileForm.available_start_date || null,
      open_to_lateral: profileForm.open_to_lateral,
      open_to_outside_degree: profileForm.open_to_outside_degree,
      // Self-assessment
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

  const addSkill = () => {
    if (skillInput.trim() && !profileForm.skills.includes(skillInput.trim())) {
      setProfileForm({ ...profileForm, skills: [...profileForm.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    setProfileForm({ ...profileForm, skills: profileForm.skills.filter((s) => s !== skill) });
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
        .createSignedUrl(filePath, 315360000); // ~10 years

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
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
      </div>
    );
  }

  // Save button reused at the bottom of every profile-fields tab so users
  // don't have to navigate back to "Profile" to commit changes made on
  // "Goals" or "Self-Assessment". All four call the same saveProfile()
  // because saving is idempotent over the entire profileForm.
  const SaveProfileButton = () => (
    <Button onClick={saveProfile} disabled={saving} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm">
      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Profile"}
    </Button>
  );

  const setField = (key, val) => setProfileForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Profile</h1>
        <p className="text-sm text-[#A3A3A3] mt-1">
          Personal info, experience, education, and skills. Every change retriggers career analysis.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-[#F5F5F5] w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="education" className="text-xs">Education</TabsTrigger>
          <TabsTrigger value="goals" className="text-xs">Goals & Preferences</TabsTrigger>
          <TabsTrigger value="self-assessment" className="text-xs">Self-Assessment</TabsTrigger>
          <TabsTrigger value="certifications" className="text-xs">Certifications</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
          <TabsTrigger value="experience" className="text-xs">Experience</TabsTrigger>
        </TabsList>

        {/* ── Profile tab — identity, contact, summary, skills, resume ──── */}
        <TabsContent value="profile">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Full Name</label>
                <Input value={profileForm.full_name} onChange={(e) => setField("full_name", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Phone Number</label>
                <Input value={profileForm.phone_number} onChange={(e) => setField("phone_number", e.target.value)} className="mt-1" placeholder="054-1234567 or +972 54 123 4567" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Location</label>
                <Input value={profileForm.location} onChange={(e) => setField("location", e.target.value)} className="mt-1" placeholder="e.g. Tel Aviv, Israel" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">LinkedIn URL</label>
                <Input value={profileForm.linkedin_url} onChange={(e) => setField("linkedin_url", e.target.value)} className="mt-1" placeholder="https://linkedin.com/in/..." />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Professional Summary</label>
              <Textarea
                value={profileForm.summary}
                onChange={(e) => setField("summary", e.target.value)}
                className="mt-1 text-sm"
                rows={4}
                placeholder="2–3 sentences. The CV generator uses this as the About Me anchor."
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Skills</label>
              <div className="flex gap-2 mb-2">
                <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" className="text-sm" />
                <Button variant="outline" size="sm" onClick={addSkill} className="text-xs px-3">Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profileForm.skills.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-[#F5F5F5] text-[#525252] px-2 py-1 rounded-md border border-[#E5E5E5]">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Resume</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] rounded-lg text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Resume"}
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                </label>
                {profile?.resume_url && <span className="text-xs text-[#059669]">Resume uploaded</span>}
              </div>
            </div>

            <SaveProfileButton />
          </div>
        </TabsContent>

        {/* ── Education tab — degree, field, gpa, honors, coursework ─────── */}
        <TabsContent value="education">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Education Level</label>
                <Select value={profileForm.education_level} onValueChange={(v) => setField("education_level", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="associate">Associate Degree</SelectItem>
                    <SelectItem value="bachelors">Bachelor&apos;s Degree</SelectItem>
                    <SelectItem value="masters">Master&apos;s Degree</SelectItem>
                    <SelectItem value="phd">PhD</SelectItem>
                    <SelectItem value="bootcamp">Bootcamp</SelectItem>
                    <SelectItem value="self_taught">Self-Taught</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Institution</label>
                <Input value={profileForm.education_institution} onChange={(e) => setField("education_institution", e.target.value)} className="mt-1" placeholder="e.g. Reichman University" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Degree</label>
                <Input value={profileForm.degree} onChange={(e) => setField("degree", e.target.value)} className="mt-1" placeholder="e.g. BSc, BA, MBA" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Field of Study</label>
                <Input value={profileForm.field_of_study} onChange={(e) => setField("field_of_study", e.target.value)} className="mt-1" placeholder="e.g. Business Administration" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">GPA (optional)</label>
                <Input value={profileForm.gpa} onChange={(e) => setField("gpa", e.target.value)} className="mt-1" placeholder="e.g. 3.7 / 4.0 or 90 / 100" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Education Dates</label>
                <Input value={profileForm.education_dates} onChange={(e) => setField("education_dates", e.target.value)} className="mt-1" placeholder="e.g. 2023 - Present" />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Honors / Awards</label>
              <TagEditor
                tags={profileForm.honors}
                onChange={(v) => setField("honors", v)}
                placeholder="e.g. Dean's List, President's Award"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Relevant Coursework</label>
              <TagEditor
                tags={profileForm.relevant_coursework}
                onChange={(v) => setField("relevant_coursework", v)}
                placeholder="e.g. Marketing Strategy, Statistics for Business"
              />
            </div>

            {/* Languages editor */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Languages</label>
              <div className="space-y-2">
                {profileForm.languages.map((lang, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={lang.language || ""}
                      onChange={(e) => {
                        const next = [...profileForm.languages];
                        next[i] = { ...next[i], language: e.target.value };
                        setField("languages", next);
                      }}
                      placeholder="e.g. English"
                      className="text-sm flex-1"
                    />
                    <Select
                      value={lang.proficiency || ""}
                      onValueChange={(v) => {
                        const next = [...profileForm.languages];
                        next[i] = { ...next[i], proficiency: v };
                        setField("languages", next);
                      }}
                    >
                      <SelectTrigger className="text-sm w-40">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = profileForm.languages.filter((_, idx) => idx !== i);
                        setField("languages", next);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-[#A3A3A3] hover:text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setField("languages", [...profileForm.languages, { language: "", proficiency: "Fluent" }])}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add language
                </Button>
              </div>
            </div>

            {/* Secondary education */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">High School / Secondary Education (optional)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={profileForm.secondary_education.institution}
                  onChange={(e) => setField("secondary_education", { ...profileForm.secondary_education, institution: e.target.value })}
                  placeholder="Institution name"
                  className="text-sm"
                />
                <Input
                  value={profileForm.secondary_education.dates}
                  onChange={(e) => setField("secondary_education", { ...profileForm.secondary_education, dates: e.target.value })}
                  placeholder="e.g. 2014 - 2018"
                  className="text-sm"
                />
                <Input
                  value={profileForm.secondary_education.location}
                  onChange={(e) => setField("secondary_education", { ...profileForm.secondary_education, location: e.target.value })}
                  placeholder="Location (optional)"
                  className="text-sm md:col-span-2"
                />
                <Textarea
                  value={(profileForm.secondary_education.highlights || []).join("\n")}
                  onChange={(e) => setField("secondary_education", { ...profileForm.secondary_education, highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Notable roles / activities — one per line (e.g. President of Debate Club)"
                  rows={2}
                  className="text-sm md:col-span-2"
                />
              </div>
            </div>

            <SaveProfileButton />
          </div>
        </TabsContent>

        {/* ── Goals & Preferences tab ─────────────────────────────────────── */}
        <TabsContent value="goals">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
            <p className="text-xs text-[#525252] bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-3 py-2">
              These fields drive tier scoring and role recommendations. Editing them retriggers
              <code className="text-[#0A0A0A] mx-1">analyze-job-match</code>
              the next time you save a JD on the Tracker, so the right tier reflects your latest target.
            </p>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">5-Year Target Role</label>
              <Input value={profileForm.five_year_role} onChange={(e) => setField("five_year_role", e.target.value)} className="mt-1" placeholder="e.g. Product Manager, Senior Data Analyst" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Primary Domain</label>
                <Select value={profileForm.primary_domain || "__none__"} onValueChange={(v) => setField("primary_domain", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select domain" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not set —</SelectItem>
                    {PRIMARY_DOMAIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#A3A3A3] mt-1">The role family that anchors your career story.</p>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Qualification Level</label>
                <Select value={profileForm.qualification_level || "__none__"} onValueChange={(v) => setField("qualification_level", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not set (system will infer) —</SelectItem>
                    {QUALIFICATION_LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#A3A3A3] mt-1">Controls the seniority ceiling on tier_1 recommendations.</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Job Titles You&apos;re Targeting Now</label>
              <TagEditor
                tags={profileForm.target_job_titles}
                onChange={(v) => setField("target_job_titles", v)}
                placeholder="e.g. Marketing Coordinator, Junior Product Analyst"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Target Industries</label>
              <TagEditor
                tags={profileForm.target_industries}
                onChange={(v) => setField("target_industries", v)}
                placeholder="e.g. Fintech, Healthcare, Cybersecurity"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Adjacent Fields</label>
              <TagEditor
                tags={profileForm.adjacent_fields}
                onChange={(v) => setField("adjacent_fields", v)}
                placeholder="Other domains relevant to your background"
              />
              <p className="text-[11px] text-[#A3A3A3] mt-1">Used by the roadmap to surface bridge roles between your current and target domain.</p>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Current Employment Status</label>
              <MultiSelectTiles
                options={EMPLOYMENT_STATUS_OPTIONS}
                selected={profileForm.employment_status}
                onChange={(v) => setField("employment_status", v)}
              />
              <p className="text-[11px] text-[#A3A3A3] mt-1">If you select &quot;Student&quot;, tier scoring caps recommendations at the level you can be hired into now.</p>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Preferred Work Environment</label>
              <MultiSelectTiles
                options={WORK_ENVIRONMENT_OPTIONS}
                selected={profileForm.work_environment}
                onChange={(v) => setField("work_environment", v)}
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">Work Arrangement</label>
              <MultiSelectTiles
                options={WORK_TYPE_OPTIONS}
                selected={profileForm.work_type}
                onChange={(v) => setField("work_type", v)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Salary Expectation (optional)</label>
                <Input value={profileForm.salary_expectation} onChange={(e) => setField("salary_expectation", e.target.value)} className="mt-1" placeholder="e.g. ₪12,000 - ₪15,000 / month" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Earliest Start Date</label>
                <Input
                  type="date"
                  value={profileForm.available_start_date}
                  onChange={(e) => setField("available_start_date", e.target.value)}
                  className="mt-1"
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
                  <p className="text-sm text-[#0A0A0A] font-medium">Open to lateral roles</p>
                  <p className="text-xs text-[#A3A3A3]">Roles at the same level in a different function or industry.</p>
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
                  <p className="text-sm text-[#0A0A0A] font-medium">Open to roles outside my degree field</p>
                  <p className="text-xs text-[#A3A3A3]">e.g. a Finance major applying to Operations or Product roles.</p>
                </div>
              </label>
            </div>

            <SaveProfileButton />
          </div>
        </TabsContent>

        {/* ── Self-Assessment tab — mirrors StepSurvey ────────────────────── */}
        <TabsContent value="self-assessment">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-6">
            <p className="text-xs text-[#525252] bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-3 py-2">
              The same questions from onboarding. Update any of these as your situation changes — they
              feed the weekly task generator and the chat agents&apos; understanding of where you&apos;re stuck.
            </p>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">
                Biggest Job-Search Challenges
              </label>
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
                      className={`text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                          : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {/* Custom challenge chips (free-text answers from onboarding) */}
              {profileForm.biggest_challenge.filter((c) => !CHALLENGES.includes(c)).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profileForm.biggest_challenge.filter((c) => !CHALLENGES.includes(c)).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2.5 py-1 rounded-md">
                      {c}
                      <button type="button" onClick={() => setField("biggest_challenge", profileForm.biggest_challenge.filter((x) => x !== c))} className="hover:text-red-300">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">
                CV Tailoring Strategy
              </label>
              <StackedRadio
                options={CV_OPTIONS}
                value={profileForm.cv_tailoring_strategy}
                onChange={(v) => setField("cv_tailoring_strategy", v)}
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">
                LinkedIn Outreach Strategy
              </label>
              <StackedRadio
                options={LINKEDIN_OPTIONS}
                value={profileForm.linkedin_outreach_strategy}
                onChange={(v) => setField("linkedin_outreach_strategy", v)}
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">
                Role Clarity (1–5)
              </label>
              <div className="flex gap-2 flex-wrap">
                {CLARITY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setField("role_clarity_score", profileForm.role_clarity_score === o.value ? null : o.value)}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                      profileForm.role_clarity_score === o.value
                        ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                        : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#A3A3A3] mt-2">Click again to clear.</p>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2 block">
                Job-Search Efforts So Far
              </label>
              <Textarea
                value={profileForm.job_search_efforts}
                onChange={(e) => setField("job_search_efforts", e.target.value)}
                placeholder="e.g. Applied to 50+ roles, attended career fairs, updated my LinkedIn..."
                className="text-sm min-h-[80px]"
              />
            </div>

            <SaveProfileButton />
          </div>
        </TabsContent>

        {/* ── Certifications tab (unchanged) ──────────────────────────────── */}
        <TabsContent value="certifications">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0A0A0A]">Add Certification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Certification Name</label>
                  <Input value={certForm.name} onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Issuer</label>
                  <Input value={certForm.issuer} onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })} className="mt-1" placeholder="e.g. AWS, Google" />
                </div>
              </div>
              <Button onClick={addCert} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm">
                <Plus className="w-4 h-4 mr-2" />Add Certification
              </Button>
            </div>
            {certifications.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-[#A3A3A3] font-medium">Your Certifications</h3>
                {certifications.map((c) => (
                  <div key={c.id} className="bg-white rounded-lg border border-[#E5E5E5] px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">{c.name}</p>
                      <p className="text-xs text-[#A3A3A3]">{c.issuer}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => { const { error } = await supabase.from("certifications").delete().eq("id", c.id).eq("user_id", user.id); if (error) { toast.error("Failed to delete certification."); return; } queryClient.invalidateQueries({ queryKey: ["certifications"] }); toast.success("Certification removed."); }}>
                      <Trash2 className="w-4 h-4 text-[#A3A3A3] hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Projects tab (unchanged) ────────────────────────────────────── */}
        <TabsContent value="projects">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0A0A0A]">Add Project</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Project Name</label>
                  <Input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">URL</label>
                  <Input value={projectForm.url} onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })} className="mt-1" placeholder="https://github.com/..." />
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Description</label>
                <Textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className="mt-1" rows={3} />
              </div>
              <Button onClick={addProject} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm">
                <Plus className="w-4 h-4 mr-2" />Add Project
              </Button>
            </div>
            {projects.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-[#A3A3A3] font-medium">Your Projects</h3>
                {projects.map((p) => (
                  <div key={p.id} className="bg-white rounded-lg border border-[#E5E5E5] px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">{p.name}</p>
                      <p className="text-xs text-[#A3A3A3]">{p.description?.substring(0, 60)}{p.description?.length > 60 ? "..." : ""}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => { const { error } = await supabase.from("projects").delete().eq("id", p.id).eq("user_id", user.id); if (error) { toast.error("Failed to delete project."); return; } queryClient.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project removed."); }}>
                      <Trash2 className="w-4 h-4 text-[#A3A3A3] hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Experience tab (unchanged) ──────────────────────────────────── */}
        <TabsContent value="experience">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0A0A0A]">
                  {expForm.id ? "Edit Experience" : "Add Experience"}
                </h3>
                {expForm.id && (
                  <button onClick={resetExpForm} className="text-xs text-[#A3A3A3] hover:text-[#525252] underline">
                    Cancel edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Title</label>
                  <Input value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} className="mt-1" placeholder="e.g. Sergeant First Class, Marketing Intern" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Company / Unit / Organization</label>
                  <Input value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} className="mt-1" placeholder="e.g. Nahal Brigade, Google" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Start Date</label>
                  <Input value={expForm.start_date} onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })} className="mt-1" placeholder="e.g. Oct 2025 or 2020" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">End Date</label>
                  <Input
                    value={expForm.end_date}
                    onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value, is_current: e.target.value.toLowerCase() === "present" })}
                    className="mt-1"
                    placeholder="e.g. Jul 2025 or Present"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Type</label>
                <Select value={expForm.type} onValueChange={(v) => setExpForm({ ...expForm, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Responsibilities</label>
                <Textarea
                  value={expForm.responsibilities}
                  onChange={(e) => setExpForm({ ...expForm, responsibilities: e.target.value })}
                  className="mt-1"
                  rows={5}
                  placeholder="One responsibility per line. Examples:&#10;Led a team of 5 engineers on the onboarding feature.&#10;Awarded Presidential Award for Excellence (Independence Day 2022)."
                />
              </div>
              <Button onClick={addExperience} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm">
                {expForm.id ? (<>Update Experience</>) : (<><Plus className="w-4 h-4 mr-2" />Add Experience</>)}
              </Button>
            </div>
            {experiences.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-[#A3A3A3] font-medium">Your Experience</h3>
                {experiences.map((e) => {
                  const expStories = storiesByExperience.get(e.id) || [];
                  return (
                    <div key={e.id} className="bg-white rounded-lg border border-[#E5E5E5]">
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#0A0A0A] truncate">{e.title} <span className="text-[#A3A3A3]">at</span> {e.company}</p>
                          <p className="text-xs text-[#A3A3A3]">
                            {e.type?.replace("_", " ")}
                            {e.start_date ? ` · ${e.start_date}${e.end_date ? ` – ${e.end_date}` : ""}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
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
                            })}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => { const { error } = await supabase.from("experiences").delete().eq("id", e.id).eq("user_id", user.id); if (error) { toast.error("Failed to delete experience."); return; } queryClient.invalidateQueries({ queryKey: ["experiences"] }); if (expForm.id === e.id) resetExpForm(); toast.success("Experience removed."); }}>
                            <Trash2 className="w-4 h-4 text-[#A3A3A3] hover:text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Stories section — collapsed list with per-story details
                          expand. Uses native <details> for accessibility +
                          zero JS state. Each story row is a single line
                          (title); expanding shows the full STAR + tags. */}
                      <div className="border-t border-[#F5F5F5] px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium flex items-center gap-1.5">
                            <BookText className="w-3 h-3" />
                            Stories ({expStories.length})
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setStoryModal({ experience_id: e.id, source: "manual_form" });
                            }}
                            className="text-[11px] font-medium text-violet-700 hover:text-violet-900"
                          >
                            + Add story
                          </button>
                        </div>
                        {expStories.length === 0 ? (
                          <p className="text-[11px] text-[#A3A3A3] italic">No stories yet — capture moments to ground CV gen + interview prep.</p>
                        ) : (
                          <div className="space-y-1">
                            {expStories.map((s) => (
                              <details key={s.id} className="group">
                                <summary className="text-xs text-[#0A0A0A] cursor-pointer list-none flex items-center gap-2 py-1 hover:bg-[#FAFAFA] rounded px-1.5 -mx-1.5">
                                  <span className="text-[#A3A3A3] group-open:rotate-90 transition-transform">▸</span>
                                  <span className="truncate">{s.title}</span>
                                </summary>
                                <div className="pl-5 pr-2 py-2 text-[11px] text-[#525252] space-y-1.5">
                                  {s.situation && <div><span className="text-[#A3A3A3] uppercase tracking-wider text-[10px]">Situation</span><br/>{s.situation}</div>}
                                  {s.task && <div><span className="text-[#A3A3A3] uppercase tracking-wider text-[10px]">Task</span><br/>{s.task}</div>}
                                  {s.action && <div><span className="text-[#A3A3A3] uppercase tracking-wider text-[10px]">Action</span><br/>{s.action}</div>}
                                  {s.result && <div><span className="text-[#A3A3A3] uppercase tracking-wider text-[10px]">Result</span><br/>{s.result}</div>}
                                  {s.metrics?.length > 0 && (
                                    <div><span className="text-[#A3A3A3] uppercase tracking-wider text-[10px]">Metrics</span><br/>{s.metrics.join(" · ")}</div>
                                  )}
                                  {s.skills_demonstrated?.length > 0 && (
                                    <div><span className="text-[#A3A3A3] uppercase tracking-wider text-[10px]">Skills</span><br/>{s.skills_demonstrated.join(", ")}</div>
                                  )}
                                  {s.tools_used?.length > 0 && (
                                    <div><span className="text-[#A3A3A3] uppercase tracking-wider text-[10px]">Tools</span><br/>{s.tools_used.join(", ")}</div>
                                  )}
                                  <div className="text-[10px] text-[#A3A3A3] pt-1">
                                    Captured {new Date(s.created_at).toLocaleDateString()} · source: {s.source}
                                  </div>
                                </div>
                              </details>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating quick-add Story button — visible on every AddInformation
          tab, opens a modal with experience picker. Per Wk 3 spec: scoped
          to AddInformation only for v1 (CareerRoadmap could be a Wk 4+
          surface if pilot signal warrants). Hidden when the per-experience
          inline modal is open to avoid stacking. */}
      {!storyModal && experiences.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setQuickAddExperienceId(experiences[0]?.id || "");
            setStoryModal({ experience_id: null, source: "manual_quick_add" });
          }}
          className="fixed bottom-6 right-6 bg-violet-700 hover:bg-violet-800 text-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 text-sm font-medium z-40"
          aria-label="Add a story"
        >
          <BookText className="w-4 h-4" />
          <span className="hidden sm:inline">+ Story</span>
        </button>
      )}

      {/* Story capture modal — used by both surfaces. The inline path passes
          experience_id directly; the quick-add path passes null and shows
          the picker first. The StorySaveCard handles the rest of the flow
          (text → extract → review → save). */}
      <Dialog open={!!storyModal} onOpenChange={(open) => {
        if (!open) {
          setStoryModal(null);
          // Closing without saving leaves the Reflect daily action pending.
          setDailyActionCtx(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <BookText className="w-4 h-4 text-violet-700" />
              Add a story
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {storyModal?.source === "manual_quick_add" && (
              <div className="mb-3">
                <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1 block">
                  Which experience?
                </label>
                <Select value={quickAddExperienceId} onValueChange={setQuickAddExperienceId}>
                  <SelectTrigger><SelectValue placeholder="Pick an experience" /></SelectTrigger>
                  <SelectContent>
                    {experiences.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}{e.company ? ` at ${e.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(storyModal?.experience_id || quickAddExperienceId) && (
              <StorySaveCard
                key={storyModal?.experience_id || quickAddExperienceId}
                capture={{
                  text: "",
                  experience_id: storyModal?.experience_id || quickAddExperienceId,
                  framing: dailyActionCtx?.prompt || "Capture a moment from your work history.",
                }}
                experienceLabel={(() => {
                  const id = storyModal?.experience_id || quickAddExperienceId;
                  const exp = experiences.find((x) => x.id === id);
                  return exp ? `${exp.title}${exp.company ? ` at ${exp.company}` : ""}` : null;
                })()}
                onExtract={handleExtractStory}
                onSave={handleSaveStory}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
