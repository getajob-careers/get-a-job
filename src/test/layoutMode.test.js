// resolveLayoutMode: the app-shell gate that fixes the cold-load onboarding
// flash (item 8). The critical case is a signed-in, already-onboarded user whose
// profile query is still pending: it must resolve to "loading" (neutral), NOT
// "chromeless" (which flashed onboarding-style/no-chrome content before the fix).
import { describe, it, expect } from "vitest";
import { resolveLayoutMode } from "@/lib/layoutMode";

describe("resolveLayoutMode", () => {
  it("the Onboarding page is always chromeless (renders its own flow, never the loader)", () => {
    expect(
      resolveLayoutMode({
        hasUser: true,
        profileFetched: false,
        onboardingComplete: false,
        isOnboardingPage: true,
      }),
    ).toBe("chromeless");
    // Onboarding-page precedence holds even with a resolved onboarded profile.
    expect(
      resolveLayoutMode({
        hasUser: true,
        profileFetched: true,
        onboardingComplete: true,
        isOnboardingPage: true,
      }),
    ).toBe("chromeless");
  });

  it("THE FIX: signed-in user with an unresolved profile on a normal route -> loading (not chromeless)", () => {
    expect(
      resolveLayoutMode({
        hasUser: true,
        profileFetched: false,
        onboardingComplete: false, // undefined-profile projection; must be ignored while pending
        isOnboardingPage: false,
      }),
    ).toBe("loading");
  });

  it("resolved + onboarded -> full chrome", () => {
    expect(
      resolveLayoutMode({
        hasUser: true,
        profileFetched: true,
        onboardingComplete: true,
        isOnboardingPage: false,
      }),
    ).toBe("full");
  });

  it("resolved + NOT onboarded -> chromeless (bounces to onboarding, no sidebar flash)", () => {
    expect(
      resolveLayoutMode({
        hasUser: true,
        profileFetched: true,
        onboardingComplete: false,
        isOnboardingPage: false,
      }),
    ).toBe("chromeless");
  });

  it("no user -> never the loader; falls through to chromeless", () => {
    expect(
      resolveLayoutMode({
        hasUser: false,
        profileFetched: false,
        onboardingComplete: false,
        isOnboardingPage: false,
      }),
    ).toBe("chromeless");
  });
});
