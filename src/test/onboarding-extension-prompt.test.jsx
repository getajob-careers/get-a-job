// Covers the final onboarding beat: the browser-extension install prompt shown
// at the end of OnboardingTutorial. Verifies (1) the prompt renders its copy,
// (2) "Add the extension" opens the Chrome Web Store listing in a new tab and
// then offers "Continue to platform", (3) "Maybe later" is skippable, and
// (4) completing the tour actually routes to the prompt (and only navigates on
// the user's explicit choice, never before).
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
  ExtensionPromptStep,
  EXTENSION_STORE_URL,
  SLIDES,
} from "@/components/onboarding/OnboardingTutorial";

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

let openSpy;
beforeEach(() => {
  openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
});
afterEach(() => {
  openSpy.mockRestore();
  vi.clearAllMocks();
});

describe("ExtensionPromptStep (final onboarding step)", () => {
  it("renders the install copy and the keep-tab-open note", () => {
    wrap(<ExtensionPromptStep onDone={() => {}} />);
    expect(screen.getByText("You're all set!")).toBeInTheDocument();
    expect(
      screen.getByText(/take us everywhere you apply/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Keep this getajob\.careers tab open so the extension connects to your account automatically\./i,
      ),
    ).toBeInTheDocument();
  });

  it("'Add the extension' opens the Chrome Web Store listing in a new tab", () => {
    wrap(<ExtensionPromptStep onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /add the extension/i }));
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      EXTENSION_STORE_URL,
      "_blank",
      "noopener,noreferrer",
    );
    expect(EXTENSION_STORE_URL).toBe(
      "https://chromewebstore.google.com/detail/get-a-job/cnlgglikhomodkjpidaoigajonnbhlii",
    );
  });

  it("after adding, offers 'Continue to platform' which finishes onboarding", () => {
    const onDone = vi.fn();
    wrap(<ExtensionPromptStep onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /add the extension/i }));
    // The install button is replaced by a continue affordance; it does not
    // navigate on its own.
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: /continue to platform/i }),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("is skippable — 'Maybe later' finishes onboarding without installing", () => {
    const onDone = vi.fn();
    wrap(<ExtensionPromptStep onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /maybe later/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });
});

describe("OnboardingTutorial completion routes to the extension prompt", () => {
  it("shows the prompt after 'Go to platform' and only navigates on the user's choice", () => {
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
    // The extension step is now the visible screen, and we have NOT navigated.
    expect(
      screen.getByText(/take us everywhere you apply/i),
    ).toBeInTheDocument();
    expect(onTutorialEnd).not.toHaveBeenCalled();
    // Dismissing finishes onboarding.
    fireEvent.click(screen.getByRole("button", { name: /maybe later/i }));
    expect(onTutorialEnd).toHaveBeenCalledWith({ skipped: false });
  });
});
