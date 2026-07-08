// Covers the final onboarding beat: the completion step shown at the end of
// OnboardingTutorial. Verifies (1) the step renders its copy, (2) "Go to
// platform" finishes onboarding, and (3) completing the tour actually routes
// to the step (and only navigates on the user's explicit click, never before).
//
// This step used to carry a browser-extension install promo; that was removed
// (the extension's JD-to-CV path is broken) while keeping the completion beat.
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// posthog is not initialised in jsdom — stub analytics so track() is a no-op.
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  EVENTS: {
    ONBOARDING_TUTORIAL_STARTED: "onboarding_tutorial_started",
    ONBOARDING_TUTORIAL_SLIDE_VIEWED: "onboarding_tutorial_slide_viewed",
    ONBOARDING_TUTORIAL_COMPLETED: "onboarding_tutorial_completed",
    ONBOARDING_TUTORIAL_SKIPPED: "onboarding_tutorial_skipped",
  },
}));

import OnboardingTutorial, {
  OnboardingCompleteStep,
  SLIDES,
} from "@/components/onboarding/OnboardingTutorial";

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingCompleteStep (final onboarding step)", () => {
  it("renders the completion copy", () => {
    wrap(<OnboardingCompleteStep onDone={() => {}} />);
    expect(screen.getByText("You're all set!")).toBeInTheDocument();
    expect(screen.getByText(/your workspace is ready/i)).toBeInTheDocument();
  });

  it("does not promote the browser extension", () => {
    wrap(<OnboardingCompleteStep onDone={() => {}} />);
    expect(screen.queryByText(/extension/i)).not.toBeInTheDocument();
  });

  it("'Go to platform' finishes onboarding", () => {
    const onDone = vi.fn();
    wrap(<OnboardingCompleteStep onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /go to platform/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingTutorial completion routes to the completion step", () => {
  it("shows the step after 'Go to platform' and only navigates on the user's choice", () => {
    const onTutorialEnd = vi.fn();
    wrap(
      <OnboardingTutorial
        isReturningUser={false}
        setupComplete={true}
        onTutorialEnd={onTutorialEnd}
      />,
    );
    // Advance through every slide so "Go to platform" enables.
    for (let i = 0; i < SLIDES.length - 1; i++) {
      fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    }
    fireEvent.click(screen.getByRole("button", { name: /go to platform/i }));
    // The completion step is now the visible screen, and we have NOT navigated.
    expect(screen.getByText(/your workspace is ready/i)).toBeInTheDocument();
    expect(onTutorialEnd).not.toHaveBeenCalled();
    // Clicking through finishes onboarding.
    fireEvent.click(screen.getByRole("button", { name: /go to platform/i }));
    expect(onTutorialEnd).toHaveBeenCalledWith({ skipped: false });
  });
});
