// Onboarding preview harness — DEV-only route at
// /_preview/onboarding/:state. Mounts each restyled step inside a mock
// parent that supplies onChange / onNext / onBack / setExperiences etc.
// as no-ops or setState-shaped functions + the fixture data from
// src/pages/_preview/fixtures/onboarding.js.
//
// Production safety: the entire route registration in App.jsx is gated
// by `import.meta.env.DEV`. In a production build the conditional folds
// to false and the route never registers → /_preview/* falls through
// to AuthenticatedApp → /login.
//
// Skill-picker fixtures (`shared-skill-picker`, `skills-empty`,
// `skills-with-chips`, `roleskills-prefilled`) prove the picker UX
// preserved across the redesign forks — see scripts/preview-onboarding.mjs
// for the typing flows that surface the dropdown + chip bank in the
// PDF captures.

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FIXTURES } from "./fixtures/onboarding";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import StepResumeUpload from "@/components/onboarding/StepResumeUpload";
import StepEducation from "@/components/onboarding/StepEducation";
import StepInternship from "@/components/onboarding/StepInternship";
import StepExperience from "@/components/onboarding/StepExperience";
import StepRoleSkills from "@/components/onboarding/StepRoleSkills";
import StepSkills from "@/components/onboarding/StepSkills";
import StepCareerDirection from "@/components/onboarding/StepCareerDirection";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";

// Map each fixture prefix to the OnboardingShell `currentStep` index so
// the progress bar + header label match what the user would see in the
// live flow.
const STEP_INDEX_BY_PREFIX = {
  resume: 0,
  education: 1,
  internship: 2,
  experience: 3,
  roleskills: 4,
  skills: 5,
  direction: 6,
  shared: 0,
};

function StepWrap({ stepIndex, children }) {
  return (
    <OnboardingShell currentStep={stepIndex}>{children}</OnboardingShell>
  );
}

export default function OnboardingPreview() {
  const { state } = useParams();
  const fixture = FIXTURES[state] || FIXTURES["resume-empty"];

  // Per-render state. Each step receives its own setX callback so the
  // user can interact within the harness (e.g. expand a different
  // accordion card) without writing through to Supabase.
  const [profileData, setProfileData] = useState(fixture.profileData || {});
  const [educations, setEducations] = useState(fixture.educations || []);
  const [experiences, setExperiences] = useState(fixture.experiences || []);
  const [projects, setProjects] = useState(fixture.projects || []);

  useEffect(() => {
    setProfileData(fixture.profileData || {});
    setEducations(fixture.educations || []);
    setExperiences(fixture.experiences || []);
    setProjects(fixture.projects || []);
  }, [state, fixture]);

  const onProfileChange = (patch) =>
    setProfileData((prev) =>
      typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
    );

  const prefix = (state || "resume-empty").split("-")[0];
  const stepIndex = STEP_INDEX_BY_PREFIX[prefix] ?? 0;

  // Standalone shared-input demo (skill picker fixture).
  if (prefix === "shared") {
    return (
      <div className="min-h-screen bg-rd-bg-page font-body text-rd-text px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="bg-rd-bg-card border border-rd-border rounded-[18px] shadow-rd p-8 space-y-6">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                shared inputs · proof
              </p>
              <h1 className="font-display font-extrabold text-[24px] text-rd-text mt-2">
                Skill picker — autocomplete + suggestions
              </h1>
              <p className="text-[13px] text-rd-text-secondary mt-2 leading-snug">
                RdSkillTagInput rendered with{" "}
                <code className="text-rd-coral-dark">suggestionType=&quot;library_skills&quot;</code>{" "}
                — the 595 canonical library names from{" "}
                <code className="text-rd-coral-dark">skillIdsGenerated.json</code>.
                The runner types into this field before screenshotting so the
                dropdown is visible in the preview PDF.
              </p>
            </div>
            <div data-preview-skill-picker>
              <RdSkillTagInput
                label="Tag a skill"
                description="Search the canonical library — same source as Direction-3 SkillTagInput."
                tags={["Customer Communication", "Stakeholder Management"]}
                onChange={() => {}}
                placeholder="data"
                suggestionType="library_skills"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StepWrap stepIndex={stepIndex}>
      {prefix === "resume" && (
        <StepResumeUpload
          onExtracted={() => {}}
          onNext={() => {}}
          profileData={profileData}
          onChange={onProfileChange}
        />
      )}
      {prefix === "education" && (
        <StepEducation
          data={profileData}
          onChange={setProfileData}
          educations={educations}
          setEducations={setEducations}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
      {prefix === "internship" && (
        <StepInternship
          data={profileData}
          onChange={setProfileData}
          educations={educations}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
      {prefix === "experience" && (
        <StepExperience
          experiences={experiences}
          onChange={setExperiences}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
      {prefix === "roleskills" && (
        <StepRoleSkills
          experiences={experiences}
          setExperiences={setExperiences}
          educations={educations}
          setEducations={setEducations}
          projects={projects}
          setProjects={setProjects}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
      {prefix === "skills" && (
        <StepSkills
          data={profileData}
          onChange={setProfileData}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
      {prefix === "direction" && (
        <StepCareerDirection
          data={profileData}
          onChange={setProfileData}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
    </StepWrap>
  );
}
