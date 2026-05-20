import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, X, Sparkles } from "lucide-react";

// Per-type form. Eli's PR #32 input-field decisions:
//   - project: project_name, context, what_you_built (multi-line),
//              outcome (free-text per Eli), portfolio_link (optional)
//   - lessons: source_type, source_name, lessons[3-5] (chip-style adder)
//   - milestone: milestone_type, the_thing, people_to_thank[1+]
//                (Add another button, max 5 — encourage not require),
//                whats_next (optional)

const PROJECT_CONTEXTS = [
  { value: "course", label: "Course / class project" },
  { value: "company", label: "Company / internship work" },
  { value: "hackathon", label: "Hackathon / event" },
  { value: "personal", label: "Personal / side project" },
];

const LESSONS_SOURCES = [
  { value: "course", label: "Course / class" },
  { value: "role", label: "Role / job" },
  { value: "project", label: "Project" },
  { value: "book", label: "Book" },
  { value: "event", label: "Event / conference" },
];

const MILESTONE_TYPES = [
  { value: "internship_offer", label: "Internship offer" },
  { value: "role_start", label: "Role start (first day)" },
  { value: "certification", label: "Certification" },
  { value: "graduation", label: "Graduation" },
  { value: "other", label: "Other milestone" },
];

const PROJECT_DEFAULTS = { project_name: "", context: "company", what_you_built: "", outcome: "", portfolio_link: "" };
const LESSONS_DEFAULTS = { source_type: "role", source_name: "", lessons: ["", "", ""] };
const MILESTONE_DEFAULTS = { milestone_type: "role_start", the_thing: "", people_to_thank: [{ name: "", reason: "" }], whats_next: "" };
const RECAP_DEFAULTS = { event_name: "", role_played: "", team_members: [{ name: "", linkedin_handle: "" }], outcome: "", key_lesson: "" };
const OBSERVATION_DEFAULTS = { trend: "", specific_example: "", your_take: "" };
const QUESTION_DEFAULTS = { decision_or_topic: "", what_youve_considered: "", what_youre_stuck_on: "" };
const FREE_FORM_DEFAULTS = { topic: "", intent: "share_experience" };

export function getDefaultsForType(postType) {
  if (postType === "project") return { ...PROJECT_DEFAULTS };
  if (postType === "lessons") return { ...LESSONS_DEFAULTS, lessons: ["", "", ""] };
  if (postType === "milestone") return { ...MILESTONE_DEFAULTS, people_to_thank: [{ name: "", reason: "" }] };
  if (postType === "recap") return { ...RECAP_DEFAULTS, team_members: [{ name: "", linkedin_handle: "" }] };
  if (postType === "observation") return { ...OBSERVATION_DEFAULTS };
  if (postType === "question") return { ...QUESTION_DEFAULTS };
  if (postType === "free_form") return { ...FREE_FORM_DEFAULTS };
  return {};
}

const FREE_FORM_INTENTS = [
  { value: "share_experience", label: "Share an experience", hint: "Narrative + explicit takeaways" },
  { value: "ask_question", label: "Ask a question", hint: "What you've considered + where you're stuck" },
  { value: "make_announcement", label: "Make an announcement", hint: "News with named gratitude + concrete forward-look" },
  { value: "spark_discussion", label: "Spark a discussion", hint: "Anchor on a specific example before sharing the take" },
  { value: "showcase_work", label: "Showcase work", hint: "Lead with the outcome, name what was built and the tools" },
];

export default function PostComposeForm({ postType, inputs, onChange, onBack, onGenerate, generating }) {
  const set = (key, value) => onChange({ ...inputs, [key]: value });

  if (postType === "project") {
    return (
      <FormShell postType={postType} onBack={onBack} onGenerate={onGenerate} generating={generating}
                 canSubmit={!!(inputs.project_name?.trim() && inputs.what_you_built?.trim() && inputs.outcome?.trim())}>
        <Field label="Project name" required>
          <Input value={inputs.project_name || ""} onChange={(e) => set("project_name", e.target.value)} placeholder="e.g. VIP onboarding redesign at Guardio" />
        </Field>
        <Field label="Where did you do it" required>
          <Select value={inputs.context || "company"} onValueChange={(v) => set("context", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROJECT_CONTEXTS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="What you built" required hint="1–2 sentences. What's the project, what's it for, what did you specifically do.">
          <textarea value={inputs.what_you_built || ""} onChange={(e) => set("what_you_built", e.target.value)}
                    placeholder="e.g. Rewrote our VIP onboarding from a 4-step manual handoff to a self-serve guided tour. Designed with our CS lead, prototyped in Notion, built with engineering."
                    rows={3} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
        <Field label="Specific outcome" required hint="Number, metric, what shipped, what changed. The post leads with this — make it concrete.">
          <textarea value={inputs.outcome || ""} onChange={(e) => set("outcome", e.target.value)}
                    placeholder="e.g. Cut average onboarding from 8 days to 3, and our VIP cohort hit 88% feature adoption in their first quarter."
                    rows={2} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
        <Field label="Portfolio / demo link" hint="Optional. Adds a 'see the work' destination at the end.">
          <Input value={inputs.portfolio_link || ""} onChange={(e) => set("portfolio_link", e.target.value)} placeholder="https://..." />
        </Field>
      </FormShell>
    );
  }

  if (postType === "lessons") {
    const lessons = Array.isArray(inputs.lessons) ? inputs.lessons : ["", "", ""];
    const setLessonAt = (i, val) => set("lessons", lessons.map((l, idx) => idx === i ? val : l));
    const addLesson = () => set("lessons", [...lessons, ""]);
    const removeLessonAt = (i) => set("lessons", lessons.filter((_, idx) => idx !== i));
    const filled = lessons.filter((l) => l.trim().length > 0).length;
    const canSubmit = filled >= 3 && filled <= 5 && !!inputs.source_name?.trim();

    return (
      <FormShell postType={postType} onBack={onBack} onGenerate={onGenerate} generating={generating} canSubmit={canSubmit}>
        <Field label="Source type" required>
          <Select value={inputs.source_type || "role"} onValueChange={(v) => set("source_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LESSONS_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Source name" required hint="e.g. 'Customer Discovery class with Prof. Lee' or 'First quarter as Customer Success Specialist'.">
          <Input value={inputs.source_name || ""} onChange={(e) => set("source_name", e.target.value)} placeholder="What did you do / where did you learn this" />
        </Field>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1 block">
            Lessons <span className="text-red-500">*</span>
          </label>
          <p className="text-[11px] text-[#52545A] mb-2">3–5 specific lessons. Each tied to a real example you lived. ≤200 chars each.</p>
          <div className="space-y-2">
            {lessons.map((l, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs font-mono text-[#9C9DA1] mt-2 w-5">{i + 1}.</span>
                <textarea
                  value={l}
                  onChange={(e) => setLessonAt(i, e.target.value.slice(0, 200))}
                  placeholder={i === 0 ? "e.g. VIP onboarding works when you watch the customer use the product, not when you ask them how it's going" : ""}
                  rows={2}
                  className="flex-1 text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
                <div className="flex flex-col items-end mt-1.5 gap-1">
                  <span className="text-[10px] text-[#9C9DA1]">{l.length}/200</span>
                  {lessons.length > 3 && (
                    <button type="button" onClick={() => removeLessonAt(i)} className="text-[#9C9DA1] hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {lessons.length < 5 && (
              <button type="button" onClick={addLesson} className="inline-flex items-center gap-1 text-xs text-[#52545A] hover:text-[#0E1014]">
                <Plus className="w-3 h-3" />
                Add another lesson
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#9C9DA1] mt-2">{filled} of 3–5 filled</p>
        </div>
      </FormShell>
    );
  }

  if (postType === "milestone") {
    const people = Array.isArray(inputs.people_to_thank) ? inputs.people_to_thank : [];
    const setPersonAt = (i, key, val) => set("people_to_thank", people.map((p, idx) => idx === i ? { ...p, [key]: val } : p));
    const addPerson = () => set("people_to_thank", [...people, { name: "", reason: "" }]);
    const removePersonAt = (i) => set("people_to_thank", people.filter((_, idx) => idx !== i));
    const canSubmit = !!inputs.the_thing?.trim();

    return (
      <FormShell postType={postType} onBack={onBack} onGenerate={onGenerate} generating={generating} canSubmit={canSubmit}>
        <Field label="Milestone type" required>
          <Select value={inputs.milestone_type || "role_start"} onValueChange={(v) => set("milestone_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MILESTONE_TYPES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="The specific thing" required hint="e.g. 'Customer Success Specialist offer at Guardio' or 'Bachelor's in Business Administration from Reichman'. Specific beats generic.">
          <Input value={inputs.the_thing || ""} onChange={(e) => set("the_thing", e.target.value)} placeholder="What just happened" />
        </Field>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1 block">
            People to thank
          </label>
          <p className="text-[11px] text-[#52545A] mb-2">
            Encouraged but not required. Real names, real specific reasons — research shows specific gratitude beats generic "thanks to everyone who supported me".
          </p>
          <div className="space-y-2">
            {people.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input
                  value={p.name}
                  onChange={(e) => setPersonAt(i, "name", e.target.value)}
                  placeholder="Name"
                  className="w-[35%]"
                />
                <Input
                  value={p.reason}
                  onChange={(e) => setPersonAt(i, "reason", e.target.value)}
                  placeholder="Specific reason (e.g. 'for the mock-interview prep')"
                  className="flex-1"
                />
                {people.length > 1 && (
                  <button type="button" onClick={() => removePersonAt(i)} className="text-[#9C9DA1] hover:text-red-600 mt-2.5">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {people.length < 5 && (
              <button type="button" onClick={addPerson} className="inline-flex items-center gap-1 text-xs text-[#52545A] hover:text-[#0E1014]">
                <Plus className="w-3 h-3" />
                Add another person
              </button>
            )}
          </div>
        </div>
        <Field label="What's next" hint="Optional 1-sentence forward-look. Specific beats 'excited to dive in' — say what you'll actually be doing.">
          <Input value={inputs.whats_next || ""} onChange={(e) => set("whats_next", e.target.value)}
                 placeholder="e.g. First two weeks I'm shadowing the renewal cohort" />
        </Field>
      </FormShell>
    );
  }

  if (postType === "recap") {
    const team = Array.isArray(inputs.team_members) ? inputs.team_members : [];
    const setTeamAt = (i, key, val) => set("team_members", team.map((p, idx) => idx === i ? { ...p, [key]: val } : p));
    const addTeam = () => set("team_members", [...team, { name: "", linkedin_handle: "" }]);
    const removeTeamAt = (i) => set("team_members", team.filter((_, idx) => idx !== i));
    const canSubmit = !!(inputs.event_name?.trim() && inputs.role_played?.trim() && inputs.outcome?.trim());

    return (
      <FormShell postType={postType} onBack={onBack} onGenerate={onGenerate} generating={generating} canSubmit={canSubmit}>
        <Field label="Event name" required>
          <Input value={inputs.event_name || ""} onChange={(e) => set("event_name", e.target.value)} placeholder="e.g. Reichman AI Hackathon 2026" />
        </Field>
        <Field label="What you did at the event" required hint="e.g. 'Team lead', 'Backend dev', 'Pitch presenter', 'Volunteer organizer'">
          <Input value={inputs.role_played || ""} onChange={(e) => set("role_played", e.target.value)} placeholder="Your role" />
        </Field>
        <Field label="Specific outcome" required hint="Won prize? Built X? Presented to whom? Concrete result, not 'great experience'.">
          <textarea value={inputs.outcome || ""} onChange={(e) => set("outcome", e.target.value)}
                    placeholder="e.g. Won 1st place — built a Hebrew-English code-switching translator with two friends in 26 hours."
                    rows={2} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1 block">
            Team members to tag
          </label>
          <p className="text-[11px] text-[#52545A] mb-2">
            Tagging materially lifts reach for recap posts. Add LinkedIn handles where you have them.
          </p>
          <div className="space-y-2">
            {team.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input value={p.name} onChange={(e) => setTeamAt(i, "name", e.target.value)} placeholder="Name" className="w-[40%]" />
                <Input value={p.linkedin_handle || ""} onChange={(e) => setTeamAt(i, "linkedin_handle", e.target.value)} placeholder="LinkedIn handle (optional)" className="flex-1" />
                {team.length > 1 && (
                  <button type="button" onClick={() => removeTeamAt(i)} className="text-[#9C9DA1] hover:text-red-600 mt-2.5">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {team.length < 10 && (
              <button type="button" onClick={addTeam} className="inline-flex items-center gap-1 text-xs text-[#52545A] hover:text-[#0E1014]">
                <Plus className="w-3 h-3" />
                Add another teammate
              </button>
            )}
          </div>
        </div>
        <Field label="Key lesson" hint="Optional ≤200 chars. One takeaway worth carrying forward — lifts the post's saveability if the lesson is concrete.">
          <textarea value={inputs.key_lesson || ""} onChange={(e) => set("key_lesson", e.target.value.slice(0, 200))}
                    placeholder="e.g. The team that pre-discussed scope cuts before the demo always finishes; the team that doesn't, ships half-broken features."
                    rows={2} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
          <p className="text-[10px] text-[#9C9DA1] mt-1 text-right">{(inputs.key_lesson || "").length}/200</p>
        </Field>
      </FormShell>
    );
  }

  if (postType === "observation") {
    const canSubmit = !!(inputs.trend?.trim() && inputs.specific_example?.trim() && inputs.your_take?.trim());
    return (
      <FormShell postType={postType} onBack={onBack} onGenerate={onGenerate} generating={generating} canSubmit={canSubmit}>
        <div className="li-banner li-banner-warning p-3 text-[11px] text-[#6B4E0F] leading-snug">
          <strong>Heads-up:</strong> Observation posts are the highest-risk format for early-career accounts. Without a concrete <em>specific example</em> anchoring your authority, this post will read as overreach. The framework requires you to provide one.
        </div>
        <Field label="The trend" required hint="What's happening in your target industry/space. Concrete, not vague.">
          <textarea value={inputs.trend || ""} onChange={(e) => set("trend", e.target.value)}
                    placeholder="e.g. CS leaders in B2B SaaS are quietly de-emphasizing CSAT in favor of feature-adoption rate."
                    rows={2} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
        <Field label="Specific example you directly saw or did" required hint="The load-bearing field. Without it, the post reads as posturing. Names, numbers, places where appropriate.">
          <textarea value={inputs.specific_example || ""} onChange={(e) => set("specific_example", e.target.value)}
                    placeholder="e.g. At my Guardio internship, my CS lead pushed me to track adoption-rate-per-VIP-cohort rather than CSAT. Within Q1 we caught two retention risks earlier than CSAT would have surfaced."
                    rows={3} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
        <Field label="Your take" required hint="The actual opinion, grounded in the example. Conviction is welcome; a hot take untethered from the example is not.">
          <textarea value={inputs.your_take || ""} onChange={(e) => set("your_take", e.target.value)}
                    placeholder="e.g. CSAT measures how customers feel about a single interaction; adoption-rate measures whether they'll renew. The latter is leading; the former is lagging."
                    rows={3} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
      </FormShell>
    );
  }

  if (postType === "question") {
    const canSubmit = !!(inputs.decision_or_topic?.trim() && inputs.what_youve_considered?.trim() && inputs.what_youre_stuck_on?.trim());
    return (
      <FormShell postType={postType} onBack={onBack} onGenerate={onGenerate} generating={generating} canSubmit={canSubmit}>
        <Field label="Decision or topic" required hint="What you're asking about. Specific framing beats broad questions.">
          <textarea value={inputs.decision_or_topic || ""} onChange={(e) => set("decision_or_topic", e.target.value)}
                    placeholder="e.g. Picking between a Customer Success offer at Guardio and a Product Analyst offer at a Series-B fintech."
                    rows={2} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
        <Field label="What you've already considered" required hint="The factors you've weighed, the people you've talked to, the constraints. This shows you've thought about it — questions that skip this read as lazy and underperform.">
          <textarea value={inputs.what_youve_considered || ""} onChange={(e) => set("what_youve_considered", e.target.value)}
                    placeholder="e.g. CS gives me 1-2 years of customer-facing depth + a clearer path to PM later. Product Analyst gives me data fluency now but I'd be the most junior on the team. Talked to 3 PMs who started in CS — all said it was the right call but slow."
                    rows={4} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
        <Field label="Where you're stuck" required hint="The narrow place where outside input would change your decision.">
          <textarea value={inputs.what_youre_stuck_on || ""} onChange={(e) => set("what_youre_stuck_on", e.target.value)}
                    placeholder="e.g. Whether the 'CS → PM' path actually compresses 6 months of learning into early-PM, or whether it's a comfortable narrative people tell themselves."
                    rows={2} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
        </Field>
      </FormShell>
    );
  }

  if (postType === "free_form") {
    const canSubmit = !!(inputs.topic?.trim() && inputs.intent);
    return (
      <FormShell postType={postType} onBack={onBack} onGenerate={onGenerate} generating={generating} canSubmit={canSubmit}>
        <div className="bg-[#E8E8E5] border border-[#DDDDDB] rounded-lg p-3 text-[11px] text-[#52545A] leading-snug">
          The escape hatch. The structured types above produce sharper output — try one if your topic fits. Free-form still applies all voice rules (no engagement-bait, no banned openers, anti-fab discipline) and grounds the post in your real profile + experiences.
        </div>
        <Field label="Topic" required hint="1-2 sentences on what the post is about.">
          <textarea value={inputs.topic || ""} onChange={(e) => set("topic", e.target.value.slice(0, 600))}
                    placeholder="What you want to post about"
                    rows={3} className="w-full text-sm border border-[#DDDDDB] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
          <p className="text-[10px] text-[#9C9DA1] mt-1 text-right">{(inputs.topic || "").length}/600</p>
        </Field>
        <Field label="Why posting" required hint="The structural intent — drives how the AI shapes the post.">
          <Select value={inputs.intent || "share_experience"} onValueChange={(v) => set("intent", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FREE_FORM_INTENTS.map((i) => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-[#9C9DA1] mt-1.5 italic">
            {(FREE_FORM_INTENTS.find((i) => i.value === inputs.intent) || FREE_FORM_INTENTS[0]).hint}
          </p>
        </Field>
      </FormShell>
    );
  }

  return null;
}

function FormShell({ children, onBack, onGenerate, generating, canSubmit }) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-[#52545A] hover:text-[#0E1014]">
        <ArrowLeft className="w-3 h-3" />
        Back to post types
      </button>
      <div className="bg-white border border-[#DDDDDB] rounded-xl p-5 space-y-4">
        {children}
      </div>
      <div className="flex justify-end">
        <Button
          onClick={onGenerate}
          disabled={!canSubmit || generating}
          className="bg-[#0E1014] hover:bg-[#F87060] text-sm"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Generate post</>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required = false, hint = "", children }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-1 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[11px] text-[#52545A] mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
