/**
 * jobcard-track-write-shape.test.jsx
 *
 * Locks the JobCard "Track" button's insert payload shape so the Tracker
 * Skills tab's live matched/missing derivation has the data it needs.
 *
 * The 2026-06-03 tracker-skills-autofill fix stamps
 *   applications.skills_required = { core: [...], nice: [...] }
 * from the job's req_skills_core / req_skills_nice at track time. The
 * Tracker reads this jsonb shape and intersects it with the user's
 * current profile.skills_canonical via computeSkillMatch. If the write
 * shape drifts, the Skills tab silently reverts to the empty state for
 * every freshly-tracked job — exactly the regression that caused this
 * PR in the first place.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createWrapper } from "../testUtils.jsx";

// Capture every insert payload globally; let any chain method return the
// chain itself so .select().eq().eq().limit() and .insert().select().single()
// both terminate at the awaited promise we control.
const insertPayloads = [];

function makeChain({ awaitedData = [], singleData = null } = {}) {
  const chain = {
    select: (...args) => chain,
    eq: (...args) => chain,
    in: (...args) => chain,
    ilike: (...args) => chain,
    order: (...args) => chain,
    range: (...args) => chain,
    limit: (...args) => chain,
    insert: (payload) => {
      insertPayloads.push(payload);
      return chain;
    },
    update: (...args) => chain,
    single: () => Promise.resolve({ data: singleData, error: null }),
    maybeSingle: () => Promise.resolve({ data: singleData, error: null }),
    then: (resolve, reject) =>
      Promise.resolve({ data: awaitedData, error: null }).then(resolve, reject),
  };
  return chain;
}

vi.mock("@/api/supabaseClient", () => ({
  supabase: {
    // Table-aware: the applications chain returns [] for the dup-check and a
    // fake inserted id for .insert().select().single(); the jobs chain returns
    // a description row so addJobToTracker's JD-resolution fetch (light corpus
    // rows carry no `description`) is exercised.
    from: vi.fn((table) =>
      makeChain({
        awaitedData: [],
        singleData:
          table === "jobs"
            ? { description: "Full JD fetched from the jobs row." }
            : { id: "new-app-id" },
      }),
    ),
  },
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-id" } }),
}));

vi.mock("@/lib/scoreApplication", () => ({
  scoreApplication: vi.fn(),
}));

import JobCard from "../../components/jobs/JobCard.jsx";

const baseJob = {
  id: "job-1",
  title: "Senior Software Engineer",
  company_name: "Wiz",
  ats_source: "greenhouse",
  external_id: "gh-1",
  description: "Long enough description to count.",
  apply_url: "https://example.com/apply",
  is_remote: false,
  date_posted: new Date().toISOString(),
  req_skills_core: ["python", "sql", "aws"],
  req_skills_nice: ["airflow", "dbt"],
};

const baseScoreResult = {
  fit_score: 0.72,
  track: "track_1",
  signals: {
    matched_skills: ["python", "sql"],
    missing_core_skills: ["aws"],
    missing_nice_skills: ["airflow", "dbt"],
    skill_match_pct: 67,
  },
  reasoning: { strengths: ["67% skill match"], gaps: ["Missing AWS"] },
  goal_alignment_score: 1.0,
};

describe("JobCard — track-time write shape", () => {
  beforeEach(() => {
    insertPayloads.length = 0;
  });

  it("writes skills_required: { core, nice } from the job at insert time", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <JobCard
          job={baseJob}
          scoreResult={baseScoreResult}
          trackColor="coral"
        />
      </Wrapper>,
    );

    const trackBtn = await screen.findByRole("button", { name: /track/i });
    fireEvent.click(trackBtn);

    await waitFor(() => expect(insertPayloads.length).toBe(1));
    const payload = insertPayloads[0];

    expect(payload.skills_required).toEqual({
      core: ["python", "sql", "aws"],
      nice: ["airflow", "dbt"],
    });
    // Sanity-check sibling fields stayed put so this test catches a drift,
    // not just covers the new key.
    expect(payload.ats_source).toBe("greenhouse");
    expect(payload.external_id).toBe("gh-1");
    expect(payload.role_title).toBe("Senior Software Engineer");
    expect(payload.cv_skills_emphasized).toEqual(["python", "sql"]);
  });

  it("resolves the JD from the jobs row when the light-corpus job carries no description", async () => {
    // Regression (2026-07-12): the browse corpus (CORPUS_SELECT) omits
    // `description`, so job.description is undefined at track time even though
    // the JD was shown on the expanded card. The old `job.description || ""`
    // stored an EMPTY job_description on every card-tracked row, making it
    // un-tailorable in CV Studio. The write path must now fetch the JD by id.
    const Wrapper = createWrapper();
    const lightJob = { ...baseJob };
    delete lightJob.description; // light corpus: no description field
    render(
      <Wrapper>
        <JobCard
          job={lightJob}
          scoreResult={baseScoreResult}
          trackColor="coral"
        />
      </Wrapper>,
    );

    const trackBtn = await screen.findByRole("button", { name: /track/i });
    fireEvent.click(trackBtn);

    await waitFor(() => expect(insertPayloads.length).toBe(1));
    expect(insertPayloads[0].job_description).toBe(
      "Full JD fetched from the jobs row.",
    );
  });

  it("writes empty arrays when source job has no extracted skills", async () => {
    const Wrapper = createWrapper();
    const noSkillsJob = {
      ...baseJob,
      req_skills_core: null,
      req_skills_nice: undefined,
    };
    render(
      <Wrapper>
        <JobCard
          job={noSkillsJob}
          scoreResult={baseScoreResult}
          trackColor="coral"
        />
      </Wrapper>,
    );

    const trackBtn = await screen.findByRole("button", { name: /track/i });
    fireEvent.click(trackBtn);

    await waitFor(() => expect(insertPayloads.length).toBe(1));
    expect(insertPayloads[0].skills_required).toEqual({ core: [], nice: [] });
  });
});

// Isolation guard (jobs-early-career-gate): the attainability band must render
// ONLY when the unified feed opts in via showAttainabilityBand. With the prop
// off (legacy track-tabs default + Career live-jobs pane), the card keeps the
// fit_score % badge even though scoreResult carries the additive band fields.
// Locks the "default untouched until #329" guarantee.
describe("JobCard — attainability band gated behind the unified flag", () => {
  const withBand = {
    ...baseScoreResult,
    attainability_score: 0.58,
    attainability_band: "strong",
  };

  it("legacy default (no showAttainabilityBand): fit_score % badge, no band label", () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <JobCard job={baseJob} scoreResult={withBand} trackColor="coral" />
      </Wrapper>,
    );
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.queryByText(/Strong match/i)).toBeNull();
  });

  it("unified (showAttainabilityBand): leads with the band label, drops the fit %", () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <JobCard
          job={baseJob}
          scoreResult={withBand}
          trackColor="coral"
          showAttainabilityBand
        />
      </Wrapper>,
    );
    expect(screen.getByText(/Strong match/i)).toBeInTheDocument();
    expect(screen.queryByText("72%")).toBeNull();
  });
});
