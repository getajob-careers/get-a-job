// v2 default-on + kill switch. Locks that the whole validated stack (C1 + 2a +
// 2b) is the default, that ?scoring_v2=0 forces the legacy path, and that the
// re-rank opts (mustHave + directionBlend) flip together with the card tag's
// scoringV2Enabled() reader — the coupling that keeps the direction tag from
// ever appearing without the re-rank it explains, or vice versa.
// C4 (roleTier) is the exception by design: its own ?scoring_c4=1, OFF under
// bare-URL AND under both kill-switch paths, so v2's default-on never drags an
// unvalidated component live (Eli's standing rule).
import { describe, it, expect, afterEach } from "vitest";
import { scoringOpts, scoringV2Enabled } from "@/lib/flags";

describe("scoring flags — v2 default-on", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("defaults ON: a bare URL enables the full v2 stack, C4 stays OFF", () => {
    window.history.replaceState({}, "", "/Career");
    expect(scoringV2Enabled()).toBe(true);
    expect(scoringOpts()).toEqual({
      confidenceAware: true,
      mustHave: true,
      directionBlend: true,
      roleTier: false,
    });
  });

  it("kill switch ?scoring_v2=0 forces the legacy path (all off)", () => {
    window.history.replaceState({}, "", "/Career?scoring_v2=0");
    expect(scoringV2Enabled()).toBe(false);
    expect(scoringOpts()).toEqual({
      confidenceAware: false,
      mustHave: false,
      directionBlend: false,
      roleTier: false,
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
      roleTier: false,
    });
  });

  it("?scoring_c4=1 turns C4 on independently, leaving v2 as-is", () => {
    window.history.replaceState({}, "", "/Career?scoring_c4=1");
    expect(scoringOpts()).toEqual({
      confidenceAware: true,
      mustHave: true,
      directionBlend: true,
      roleTier: true,
    });
  });

  it("?scoring_c4=1 works under the v2 kill switch (C4 alone, diagnostic)", () => {
    window.history.replaceState({}, "", "/Career?scoring_v2=0&scoring_c4=1");
    expect(scoringOpts()).toEqual({
      confidenceAware: false,
      mustHave: false,
      directionBlend: false,
      roleTier: true,
    });
  });
});
