// Unit tests for the Piece C strict-match named-job lookup. Pure coverage over
// detectJobReference / decideMatch / renderNamedJobBlock plus the thin
// lookupNamedJob wiring (with a recording mock to assert the no-anchor path
// issues NO query). See coach-visibility-BC-build-spec-2026-07-26.md.

import { describe, it, expect } from "vitest";
import {
  detectJobReference,
  decideMatch,
  renderNamedJobBlock,
  lookupNamedJob,
  type NamedJobRow,
} from "./job-name-lookup";

// The two live Chainalysis roles from the walkthrough fixture - same title
// stem ("Intelligence Analyst"), different specialisation.
const CHAINALYSIS_ROWS: NamedJobRow[] = [
  {
    id: "job-1",
    title: "Intelligence Analyst - Fraud Researcher",
    company_name: "Chainalysis",
    description: "Investigate fraud on-chain.",
  },
  {
    id: "job-2",
    title: "Intelligence Analyst - Threat Hunter",
    company_name: "Chainalysis",
    description: "Hunt threat actors on-chain.",
  },
];

describe("detectJobReference", () => {
  it("extracts title + company from '<Title> at <Company>'", () => {
    expect(detectJobReference("Intelligence Analyst at Chainalysis")).toEqual({
      title: "Intelligence Analyst",
      company: "Chainalysis",
    });
  });

  it("extracts a single-stem title + company", () => {
    expect(detectJobReference("Threat Hunter at Chainalysis")).toEqual({
      title: "Threat Hunter",
      company: "Chainalysis",
    });
  });

  it("handles the dash pattern '<Company> - <Title>'", () => {
    expect(detectJobReference("Chainalysis - Intelligence Analyst")).toEqual({
      title: "Intelligence Analyst",
      company: "Chainalysis",
    });
  });

  it("strips leading fillers and trailing role-noise from the title", () => {
    expect(
      detectJobReference("the Intelligence Analyst role at Chainalysis"),
    ).toEqual({ title: "Intelligence Analyst", company: "Chainalysis" });
  });

  it("keeps a specific title-only reference (>=2 tokens) with no company", () => {
    expect(detectJobReference("Senior Data Analyst for now")).toEqual({
      title: "Senior Data Analyst",
      company: null,
    });
  });

  it("drops a weak single-token title-only reference (the detect guard)", () => {
    // 'analyst' is lowercase (no company anchor); the prefix 'looking' is a
    // single short token, so the guard nulls it -> no anchor at all.
    expect(detectJobReference("looking for analyst")).toEqual({
      title: null,
      company: null,
    });
  });

  it("drops a single long-word title-only reference ('Marketing for now')", () => {
    // "Marketing" is >= 8 chars but a single token; a lone word is not a strict
    // enough anchor to name a posting without a company (QA F2).
    expect(detectJobReference("Marketing for now")).toEqual({
      title: null,
      company: null,
    });
    expect(detectJobReference("Developer for now")).toEqual({
      title: null,
      company: null,
    });
  });

  it("returns both null when the message carries no anchor", () => {
    expect(detectJobReference("how do I improve my resume this week")).toEqual({
      title: null,
      company: null,
    });
    expect(detectJobReference("")).toEqual({ title: null, company: null });
  });
});

describe("decideMatch", () => {
  it("returns AMBIGUOUS with both options for the 2-role Chainalysis stem", () => {
    const r = decideMatch(CHAINALYSIS_ROWS, {
      title: "Intelligence Analyst",
      company: "Chainalysis",
    });
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      expect(r.company).toBe("Chainalysis");
      expect(r.options.map((o) => o.title)).toEqual([
        "Intelligence Analyst - Fraud Researcher",
        "Intelligence Analyst - Threat Hunter",
      ]);
    }
  });

  it("returns a single strict MATCH when the title narrows to one row", () => {
    const r = decideMatch(CHAINALYSIS_ROWS, {
      title: "Threat Hunter",
      company: "Chainalysis",
    });
    expect(r.kind).toBe("match");
    if (r.kind === "match") expect(r.job.id).toBe("job-2");
  });

  it("dedups identical title+company rows to ONE -> match, not ambiguous", () => {
    const dupRows: NamedJobRow[] = [
      {
        id: "job-a",
        title: "Threat Hunter",
        company_name: "Chainalysis",
        description: "d",
      },
      {
        id: "job-b",
        title: "Threat Hunter",
        company_name: "Chainalysis",
        description: "d",
      },
    ];
    const r = decideMatch(dupRows, {
      title: "Threat Hunter",
      company: "Chainalysis",
    });
    expect(r.kind).toBe("match");
    if (r.kind === "match") expect(r.job.id).toBe("job-a");
  });

  it("returns NONE when a company matches but zero title tokens agree", () => {
    const r = decideMatch(CHAINALYSIS_ROWS, {
      title: "Data Scientist",
      company: "Chainalysis",
    });
    expect(r).toEqual({ kind: "none" });
  });

  it("returns NONE for a generic single-token title with no row agreement (never a wrong row)", () => {
    const r = decideMatch(CHAINALYSIS_ROWS, {
      title: "manager",
      company: null,
    });
    // 'manager' appears in neither title -> no strict hit -> no wrong row.
    expect(r).toEqual({ kind: "none" });
  });

  it("company matched, no title, single role -> MATCH that role", () => {
    const oneRow: NamedJobRow[] = [
      {
        id: "job-x",
        title: "Product Manager",
        company_name: "Wix",
        description: "d",
      },
    ];
    const r = decideMatch(oneRow, { title: null, company: "Wix" });
    expect(r.kind).toBe("match");
    if (r.kind === "match") expect(r.job.id).toBe("job-x");
  });

  it("does NOT match a company substring collision ('Meta' vs 'Metadata Inc')", () => {
    // Whole-word company gate: "Meta" is a mid-word substring of "Metadata",
    // so it must NOT auto-match the single Metadata row (QA F1 wrong-row).
    const rows: NamedJobRow[] = [
      {
        id: "job-m",
        title: "Product Manager",
        company_name: "Metadata Inc",
        description: "d",
      },
    ];
    expect(decideMatch(rows, { title: null, company: "Meta" })).toEqual({
      kind: "none",
    });
  });

  it("still matches when the company anchor is a WHOLE word in company_name", () => {
    const rows: NamedJobRow[] = [
      {
        id: "job-h",
        title: "Data Analyst",
        company_name: "HP Inc",
        description: "d",
      },
    ];
    const r = decideMatch(rows, { title: null, company: "HP" });
    expect(r.kind).toBe("match");
    if (r.kind === "match") expect(r.job.id).toBe("job-h");
  });

  it("company matched, no title, multiple roles -> AMBIGUOUS", () => {
    const rows: NamedJobRow[] = [
      {
        id: "job-x",
        title: "Product Manager",
        company_name: "Wix",
        description: "d",
      },
      {
        id: "job-y",
        title: "Data Analyst",
        company_name: "Wix",
        description: "d",
      },
    ];
    const r = decideMatch(rows, { title: null, company: "Wix" });
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      expect(r.company).toBe("Wix");
      expect(r.options.length).toBe(2);
    }
  });
});

// Recording mock: from() bumps a counter; the builder is thenable at .limit().
function makeLookupMock(rows: NamedJobRow[]) {
  const calls = { from: 0, filters: [] as [string, string, unknown][] };
  const filter = {
    eq(col: string, val: unknown) {
      calls.filters.push(["eq", col, val]);
      return filter;
    },
    ilike(col: string, val: string) {
      calls.filters.push(["ilike", col, val]);
      return filter;
    },
    async limit(n: number) {
      calls.filters.push(["limit", "limit", n]);
      return { data: rows, error: null };
    },
  };
  const client = {
    from(_t: string) {
      calls.from++;
      return { select: (_c: string) => filter };
    },
  };
  return { client, calls };
}

describe("lookupNamedJob", () => {
  it("issues NO db query when the message has no anchor", async () => {
    const { client, calls } = makeLookupMock([]);
    const r = await lookupNamedJob(client, "how do I improve my resume");
    expect(r).toEqual({ kind: "none" });
    expect(calls.from).toBe(0);
  });

  it("runs a company-filtered query and returns the strict match", async () => {
    const { client, calls } = makeLookupMock(CHAINALYSIS_ROWS);
    const r = await lookupNamedJob(client, "Threat Hunter at Chainalysis");
    expect(calls.from).toBe(1);
    expect(
      calls.filters.some((f) => f[0] === "ilike" && f[1] === "company_name"),
    ).toBe(true);
    expect(r.kind).toBe("match");
    if (r.kind === "match") expect(r.job.id).toBe("job-2");
  });

  it("runs a title-only query when a specific title but no company is named", async () => {
    const row: NamedJobRow = {
      id: "job-z",
      title: "Senior Data Analyst",
      company_name: "Acme",
      description: "d",
    };
    const { client, calls } = makeLookupMock([row]);
    const r = await lookupNamedJob(client, "Senior Data Analyst for now");
    expect(calls.from).toBe(1);
    expect(
      calls.filters.some((f) => f[0] === "ilike" && f[1] === "title"),
    ).toBe(true);
    expect(r.kind).toBe("match");
  });

  it("returns none (no wrong row) on a company substring collision", async () => {
    // Corpus has one company containing the anchor as a substring; the
    // whole-word gate rejects it so no wrong row is injected (QA F1).
    const row: NamedJobRow = {
      id: "job-m",
      title: "Product Manager",
      company_name: "Metadata Inc",
      description: "d",
    };
    const { client, calls } = makeLookupMock([row]);
    const r = await lookupNamedJob(client, "the role at Meta");
    expect(calls.from).toBe(1); // it does query (loose %Meta% ilike)...
    expect(r).toEqual({ kind: "none" }); // ...but the gate rejects the row.
  });

  it("issues NO query for a single long-word conversational phrase (F2)", async () => {
    const { client, calls } = makeLookupMock([]);
    const r = await lookupNamedJob(client, "Marketing for now");
    expect(r).toEqual({ kind: "none" });
    expect(calls.from).toBe(0);
  });
});

describe("renderNamedJobBlock", () => {
  it("renders nothing for a none result", () => {
    expect(renderNamedJobBlock({ kind: "none" })).toBe("");
  });

  it("renders a LOOKED-UP JOB block with an HTML-stripped, capped JD", () => {
    const out = renderNamedJobBlock({
      kind: "match",
      job: {
        id: "job-1",
        title: "Intelligence Analyst - Threat Hunter",
        company_name: "Chainalysis",
        description: "<p>Hunt threat actors</p>" + "x".repeat(3000),
      },
    });
    expect(out).toContain("LOOKED-UP JOB (a live job posting the user NAMED");
    expect(out).toContain("- Title: Intelligence Analyst - Threat Hunter");
    expect(out).toContain("- Company: Chainalysis");
    expect(out).toContain("- Job Description:");
    expect(out).not.toContain("<p>");
    expect(out).not.toContain("x".repeat(2001));
  });

  it("renders an AMBIGUOUS block that numbers each posting and names the company", () => {
    const out = renderNamedJobBlock({
      kind: "ambiguous",
      company: "Chainalysis",
      options: [
        {
          title: "Intelligence Analyst - Fraud Researcher",
          company_name: "Chainalysis",
        },
        {
          title: "Intelligence Analyst - Threat Hunter",
          company_name: "Chainalysis",
        },
      ],
    });
    expect(out).toContain("NAMED-JOB LOOKUP - AMBIGUOUS");
    expect(out).toContain("at Chainalysis");
    expect(out).toContain("1. Intelligence Analyst - Fraud Researcher - Chainalysis");
    expect(out).toContain("2. Intelligence Analyst - Threat Hunter - Chainalysis");
  });
});
