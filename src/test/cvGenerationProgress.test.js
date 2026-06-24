import { describe, it, expect } from "vitest";
import {
  easedPct,
  stageLabel,
  BASELINE_MS,
  HOLD_PCT,
  LONGTAIL_MS,
} from "../components/cv/CvGenerationProgress.jsx";

// The pacing math is the shared spec the extension's vanilla impl mirrors verbatim.
describe("CV generation progress pacing", () => {
  it("starts at 0 and reaches the hold ceiling at the 35s baseline", () => {
    expect(easedPct(0)).toBe(0);
    expect(Math.round(easedPct(BASELINE_MS))).toBe(HOLD_PCT);
  });

  it("holds at ~90 past the baseline — never fabricates 100", () => {
    expect(easedPct(BASELINE_MS + 10000)).toBe(HOLD_PCT);
    expect(easedPct(60000)).toBe(HOLD_PCT);
    expect(easedPct(60000)).toBeLessThan(100);
  });

  it("is monotonic and decelerating (slows as it approaches 90)", () => {
    let prev = -1;
    for (let t = 0; t <= BASELINE_MS; t += 1000) {
      const v = easedPct(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    const earlyGain = easedPct(5000) - easedPct(0); // first 5s
    const lateGain = easedPct(35000) - easedPct(30000); // last 5s before hold
    expect(earlyGain).toBeGreaterThan(lateGain);
  });

  it("rotates stage labels on the truthful schedule", () => {
    expect(stageLabel(0)).toBe("Scanning the job description");
    expect(stageLabel(4999)).toBe("Scanning the job description");
    expect(stageLabel(5000)).toBe("Finding your relevant experience");
    expect(stageLabel(13000)).toBe("Selecting your strongest stories");
    expect(stageLabel(22000)).toBe("Tailoring your CV to this role");
    expect(stageLabel(32000)).toBe("Finalizing");
    expect(stageLabel(44999)).toBe("Finalizing");
  });

  it("swaps to the long-tail label past ~45s", () => {
    expect(stageLabel(LONGTAIL_MS)).toBe("Still working, almost there");
    expect(stageLabel(70000)).toBe("Still working, almost there");
  });
});
