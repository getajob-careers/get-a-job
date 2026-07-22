import React from "react";
import { onboardingV2Enabled } from "@/lib/flags";
import Onboarding from "./Onboarding";
import OnboardingV2 from "./OnboardingV2";

// Route gate for the onboarding redesign. Flag-OFF renders the legacy
// Onboarding byte-identically (it's the same component, untouched); flag-ON
// renders the reordered V2 flow. Both are eager-imported so the legacy path's
// first-impression eagerness (App.jsx keeps "Onboarding" out of React.lazy) is
// preserved.
export default function OnboardingEntry() {
  return onboardingV2Enabled() ? <OnboardingV2 /> : <Onboarding />;
}
