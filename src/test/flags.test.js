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
    });
  });

  it("kill switch ?scoring_v2=0 forces the legacy path (all off)", () => {
    window.history.replaceState({}, "", "/Career?scoring_v2=0");
    expect(scoringV2Enabled()).toBe(false);
    expect(scoringOpts()).toEqual({
      confidenceAware: false,
      mustHave: false,
      directionBlend: false,
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
    });
  });
});
