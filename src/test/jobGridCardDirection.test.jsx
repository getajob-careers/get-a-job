// Component 2b: the quiet direction tag renders on JobGridCard. This is the
// render smoke the deriveJobDisplay unit tests can't give (green build != the
// card renders — the 2026-07-15 / #546 lesson): it mounts the real card with
// the query providers and asserts the tag appears only in the unified feed with
// ?scoring_v2=1, and is absent (byte-identical live) with the flag off.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createWrapper } from "./testUtils";
import JobGridCard from "@/components/jobs/JobGridCard";

const JOB = {
  id: "helfy-pm",
  title: "Product Manager",
  company_name: "Helfy",
  location_city: "Tel Aviv",
  is_remote: false,
  seniority: "mid",
  date_posted: new Date().toISOString(),
};
const PRIMARY_SCORE = {
  fit_score: 0.7,
  attainability_band: "good",
  attainability_score: 0.66,
  relevance_match: "primary",
  rank_score: 0.825,
  signals: { matched_skills: [], missing_core_skills: [] },
  reasoning: { strengths: [] },
};

function mount(path) {
  window.history.replaceState({}, "", path);
  return render(
    <JobGridCard
      job={JOB}
      scoreResult={PRIMARY_SCORE}
      unified
      onOpen={() => {}}
    />,
    { wrapper: createWrapper(path) },
  );
}

describe("JobGridCard direction tag (2b)", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("renders the direction tag by DEFAULT in the unified feed (v2 default-on)", () => {
    mount("/Career");
    expect(screen.queryByText("On your goal path")).toBeTruthy();
  });

  it("still renders with the explicit ?scoring_v2=1", () => {
    mount("/Career?scoring_v2=1");
    expect(screen.queryByText("On your goal path")).toBeTruthy();
  });

  it("hides the tag with the kill switch ?scoring_v2=0 (legacy path)", () => {
    mount("/Career?scoring_v2=0");
    expect(screen.queryByText("On your goal path")).toBeNull();
  });

  it("hides the tag outside the unified feed even when v2 is on", () => {
    window.history.replaceState({}, "", "/Career");
    render(
      <JobGridCard job={JOB} scoreResult={PRIMARY_SCORE} onOpen={() => {}} />,
      { wrapper: createWrapper("/Career") },
    );
    expect(screen.queryByText("On your goal path")).toBeNull();
  });
});
