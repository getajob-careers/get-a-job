// CvGenerationProgress - the honest generation-wait ring (CV RED OQ4).
// Guards the honesty contract: the ring is INDETERMINATE (never a fabricated
// completion meter, never timed fake stages) unless a real { done, total }
// progress contract is supplied, and no surface ever prints a percentage or a
// countdown.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CvGenerationProgress, {
  GENERATION_ETA,
} from "@/components/cv-studio/CvGenerationProgress";

afterEach(cleanup);

describe("CvGenerationProgress - honest ring", () => {
  it("no contract: indeterminate ring, no percentage", () => {
    const { container, queryByText } = render(
      <CvGenerationProgress label="Tailoring your CV…" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg.classList.contains("rd-ring-indeterminate")).toBe(true);
    expect(queryByText(/%/)).toBeNull();
    expect(container.textContent).not.toMatch(/\d+\s*%/);
  });

  it("real { done, total } contract: determinate ring (not indeterminate) + stage", () => {
    const { container, getByText } = render(
      <CvGenerationProgress
        progress={{ done: 2, total: 4, stage: "Assembling your CV…" }}
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg.classList.contains("rd-ring-indeterminate")).toBe(false);
    const arc = container.querySelectorAll("circle")[1];
    const offset = Number(arc.getAttribute("stroke-dashoffset"));
    const circ = Number(arc.getAttribute("stroke-dasharray"));
    // The arc reflects the real fraction: not empty, not full.
    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(circ);
    expect(getByText("Assembling your CV…")).toBeTruthy();
  });

  it("hint renders the honest expectation, and it is not a countdown", () => {
    const { getByText } = render(
      <CvGenerationProgress label="Tailoring your CV…" hint={GENERATION_ETA} />,
    );
    expect(getByText(GENERATION_ETA)).toBeTruthy();
    // Static expectation only - no "N seconds remaining" / countdown phrasing.
    expect(GENERATION_ETA).not.toMatch(/remaining|left|countdown/i);
  });

  it("compact variant renders the supplied label + a ring", () => {
    const { container, getByText } = render(
      <CvGenerationProgress compact label="Generating your CV…" />,
    );
    expect(getByText("Generating your CV…")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("falls back to a neutral label when none is supplied (no fabricated stage)", () => {
    const { getByText } = render(<CvGenerationProgress />);
    expect(getByText("Working on it…")).toBeTruthy();
  });
});
