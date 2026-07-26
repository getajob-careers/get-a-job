// v2 default-on + kill switch. Locks that the whole validated stack (C1 + 2a +
// 2b) is the default, that ?scoring_v2=0 forces the legacy path, and that the
// re-rank opts (mustHave + directionBlend) flip together with the card tag's
// scoringV2Enabled() reader — the coupling that keeps the direction tag from
// ever appearing without the re-rank it explains, or vice versa.
import { describe, it, expect, afterEach } from "vitest";
import { scoringOpts, scoringV2Enabled } from "@/lib/flags";

describe("scoring flags — v2 default-on", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("defaults ON: a bare URL enables the full v2 stack", () => {
    window.history.replaceState({}, "", "/Career");
    expect(scoringV2Enabled()).toBe(true);
    expect(scoringOpts()).toEqual({
      confidenceAware: true,
      mustHave: true,
      directionBlend: true,
      honestLabels: true,
    });
  });

  it("?scoring_v2=0 forces the legacy scoring path; honest labels are independent (default on)", () => {
    window.history.replaceState({}, "", "/Career?scoring_v2=0");
    expect(scoringV2Enabled()).toBe(false);
    expect(scoringOpts()).toEqual({
      confidenceAware: false,
      mustHave: false,
      directionBlend: false,
      honestLabels: true,
    });
  });

  it("kill switch + ?scoring_confidence=1 is the C1-only diagnostic", () => {
    window.history.replaceState(
      {},
      "",
      "/Career?scoring_v2=0&scoring_confidence=1",
    );
    expect(scoringOpts()).toEqual({
      confidenceAware: true,
      mustHave: false,
      directionBlend: false,
      honestLabels: true,
    });
  });

  it("honest_match_labels is display-only and ON by default, killed via ?honest_match_labels=0", () => {
    window.history.replaceState({}, "", "/Career");
    expect(scoringOpts().honestLabels).toBe(true);
    window.history.replaceState({}, "", "/Career?honest_match_labels=0");
    expect(scoringOpts().honestLabels).toBe(false);
    // kill switch is display-only: it never changes the v2 stack flags
    expect(scoringOpts()).toEqual({
      confidenceAware: true,
      mustHave: true,
      directionBlend: true,
      honestLabels: false,
    });
    // ?honest_match_labels=1 still forces on (parity with the old opt-in URL)
    window.history.replaceState({}, "", "/Career?honest_match_labels=1");
    expect(scoringOpts().honestLabels).toBe(true);
  });
});
