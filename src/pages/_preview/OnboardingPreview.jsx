// Onboarding preview harness — DEV-only route at
// /_preview/onboarding/:state. Mounts each restyled step inside a mock
// parent that supplies onChange / onNext / onBack as no-ops + the
// fixture data from src/pages/_preview/fixtures/onboarding.js.
//
// Why a harness instead of a real test session: Onboarding is auth-
// gated AND writes to multiple prod tables. A test-session preview
// would either pollute prod data or require running against a separate
// project. The harness mocks the parent wrapper's contract (props
// only — no Supabase, no edge fns, no DB) and renders each step
// faithfully because the step components' visual surface depends on
// props, not on auth/data context.
//
// Production safety: this entire module is gated by
// `import.meta.env.DEV` at the route-register call in App.jsx. In a
// production build, the route is never registered and /_preview/*
// resolves to the App's 404 page.
//
// Skill-picker fixture: the runner clicks into the RdSkillTagInput
// input and types a query so the autocomplete dropdown renders before
// capture. Proves the fork preserves the suggestion source.

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FIXTURES } from "./fixtures/onboarding";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import StepResumeUpload from "@/components/onboarding/StepResumeUpload";
import StepEducation from "@/components/onboarding/StepEducation";
import StepInternship from "@/components/onboarding/StepInternship";
import RdSkillTagInput from "@/components/redesign/RdSkillTagInput";

const STEP_INDEX_BY_PREFIX = {
  resume: 0,
  education: 1,
  internship: 2,
  shared: 0,
};

function NoOpAuth({ children }) {
  // The real AuthProvider in App.jsx wraps every route (public + auth-
  // gated) so useAuth() resolves here too. This stub exists for symmetry
  // with how each preview state mounts — currently a passthrough; reserved
  // for future preview-only auth mocking if a step needs richer user data.
  return children;
}

// Step harness wrapper — supplies onChange / onNext / onBack noops +
// shells out the step inside OnboardingShell so the chrome shows too.
function StepWrap({ stepIndex, children }) {
  return (
    <OnboardingShell currentStep={stepIndex}>{children}</OnboardingShell>
  );
}

export default function OnboardingPreview() {
  const { state } = useParams();
  const fixture = FIXTURES[state] || FIXTURES["resume-empty"];
  const [profileData, setProfileData] = useState(fixture.profileData || {});
  const [educations, setEducations] = useState(fixture.educations || []);

  // Reset when fixture changes (when the runner navigates between states
  // it loads a new page, so this effect mostly covers in-tab reloads).
  useEffect(() => {
    setProfileData(fixture.profileData || {});
    setEducations(fixture.educations || []);
  }, [state, fixture]);

  const onChange = (patch) =>
    setProfileData((prev) =>
      typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
    );

  const prefix = (state || "resume-empty").split("-")[0];
  const stepIndex = STEP_INDEX_BY_PREFIX[prefix] ?? 0;

  // Skill-picker fixture: stand-alone shared-input demo so the preview
  // PDF includes evidence that RdSkillTagInput renders the autocomplete
  // dropdown + canonical suggestions. The runner triggers a focus + type
  // before screenshotting.
  if (prefix === "shared") {
    return (
      <NoOpAuth>
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
                  The runner types into this field before screenshotting so
                  the dropdown is visible in the preview PDF.
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
      </NoOpAuth>
    );
  }

  return (
    <NoOpAuth>
      <StepWrap stepIndex={stepIndex}>
        {prefix === "resume" && (
          <StepResumeUpload
            onExtracted={() => {}}
            onNext={() => {}}
            profileData={profileData}
            onChange={onChange}
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
      </StepWrap>
    </NoOpAuth>
  );
}
