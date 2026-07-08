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
// Phase 3 onboarding redesign collapsed Education / Experience /
// Role-skills / Other-skills into one StepReview page. The matching
// fixture prefixes (`education-*`, `experience-*`, `roleskills-*`,
// `skills-*`) now all resolve to the same Review fixture; the old
// `shared-skill-picker` standalone surface still proves the
// RdSkillTagInput contract independently.

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FIXTURES } from "./fixtures/onboarding";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import StepResumeUpload from "@/components/onboarding/StepResumeUpload";
import StepReview from "@/components/onboarding/StepReview";
import StepInternship from "@/components/onboarding/StepInternship";
import StepCareerDirection from "@/components/onboarding/StepCareerDirection";
import StepConstraints from "@/components/onboarding/StepConstraints";
import StepSurvey from "@/components/onboarding/StepSurvey";
import OnboardingTutorial, {
  OnboardingCompleteStep,
} from "@/components/onboarding/OnboardingTutorial";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";

// Map each fixture prefix to the OnboardingShell `currentStep` index so
// the progress bar + header label match what the user would see in the
// live flow. Indices are the new 6-step machine post-Phase-3 collapse.
//
// Legacy prefixes (education / experience / roleskills / skills) all
// resolve to the Review step at index 1 so existing preview links from
// the old PDF captures still mount something useful.
const STEP_INDEX_BY_PREFIX = {
  resume: 0,
  review: 1,
  education: 1,
  experience: 1,
  roleskills: 1,
  skills: 1,
  internship: 2,
  direction: 3,
  constraints: 4,
  survey: 5,
  shared: 0,
};

const REVIEW_PREFIXES = new Set([
  "review",
  "education",
  "experience",
  "roleskills",
  "skills",
]);

function StepWrap({ stepIndex, children }) {
  return <OnboardingShell currentStep={stepIndex}>{children}</OnboardingShell>;
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
  const [certifications, setCertifications] = useState(
    fixture.certifications || [],
  );

  useEffect(() => {
    setProfileData(fixture.profileData || {});
    setEducations(fixture.educations || []);
    setExperiences(fixture.experiences || []);
    setProjects(fixture.projects || []);
    setCertifications(fixture.certifications || []);
  }, [state, fixture]);

  const onProfileChange = (patch) =>
    setProfileData((prev) =>
      typeof patch === "function" ? patch(prev) : { ...prev, ...patch },
    );

  const prefix = (state || "resume-empty").split("-")[0];
  const stepIndex = STEP_INDEX_BY_PREFIX[prefix] ?? 0;

  // Final onboarding beat — the completion step, rendered on its own so the
  // reviewer sees it without clicking through all six tutorial slides.
  if (prefix === "complete") {
    return <OnboardingCompleteStep onDone={() => {}} />;
  }

  // Tutorial renders full-screen outside OnboardingShell (own FullScreenShell).
  if (prefix === "tutorial") {
    const t = fixture.tutorial || {};
    return (
      <OnboardingTutorial
        isReturningUser={!!t.isReturningUser}
        setupComplete={!!t.setupComplete}
        onTutorialEnd={() => {}}
      />
    );
  }

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
                <code className="text-rd-coral-dark">
                  suggestionType=&quot;library_skills&quot;
                </code>{" "}
                — the 595 canonical library names from{" "}
                <code className="text-rd-coral-dark">
                  skillIdsGenerated.json
                </code>
                . The runner types into this field before screenshotting so the
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
      {REVIEW_PREFIXES.has(prefix) && (
        <StepReview
          data={profileData}
          onChange={setProfileData}
          educations={educations}
          setEducations={setEducations}
          experiences={experiences}
          setExperiences={setExperiences}
          projects={projects}
          setProjects={setProjects}
          certifications={certifications}
          setCertifications={setCertifications}
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
      {prefix === "direction" && (
        <StepCareerDirection
          data={profileData}
          onChange={setProfileData}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
      {prefix === "constraints" && (
        <StepConstraints
          data={profileData}
          onChange={setProfileData}
          onSubmit={() => {}}
          onBack={() => {}}
          submitting={false}
        />
      )}
      {prefix === "survey" && (
        <StepSurvey
          data={profileData}
          onChange={setProfileData}
          onNext={() => {}}
          onBack={() => {}}
        />
      )}
    </StepWrap>
  );
}
