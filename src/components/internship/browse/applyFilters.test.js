import { describe, it, expect } from "vitest";
import { applyFilters, facetCounts } from "./applyFilters";

const c = (overrides = {}) => {
  const { id, ...rest } = overrides;
  return {
    name: "Acme",
    industry: "Cybersecurity",
    sector: "Application Security",
    stage: "Series B",
    hq_city: "Tel Aviv",
    hq_country: "Israel",
    employee_count_range: "50-100",
    origin: "israeli_founded",
    ...rest,
    id: "id-" + (id ?? Math.random().toString(36).slice(2)),
  };
};

const empty = () => ({
  industry: new Set(),
  stage: new Set(),
  size: new Set(),
  location: new Set(),
  origin: new Set(),
});

describe("applyFilters — single axis", () => {
  it("returns everything when no filters or search", () => {
    const list = [c({ id: 1 }), c({ id: 2 })];
    expect(applyFilters(list, empty(), "", new Map())).toHaveLength(2);
  });

  it("industry filter is OR within axis", () => {
    const list = [
      c({ id: 1, industry: "Cybersecurity" }),
      c({ id: 2, industry: "FinTech" }),
      c({ id: 3, industry: "Gaming" }),
    ];
    const f = empty();
    f.industry = new Set(["Cybersecurity", "FinTech"]);
    expect(applyFilters(list, f, "", new Map()).map((x) => x.id)).toEqual(
      expect.arrayContaining(["id-1", "id-2"]),
    );
    expect(applyFilters(list, f, "", new Map())).toHaveLength(2);
  });

  it("drops rows with null industry when industry filter is active", () => {
    const list = [c({ id: 1, industry: null }), c({ id: 2, industry: "FinTech" })];
    const f = empty();
    f.industry = new Set(["FinTech"]);
    expect(applyFilters(list, f, "", new Map())).toHaveLength(1);
  });

  it("stage filter exact-match (case sensitive)", () => {
    const list = [c({ id: 1, stage: "Series B" }), c({ id: 2, stage: "Growth" })];
    const f = empty();
    f.stage = new Set(["Growth"]);
    expect(applyFilters(list, f, "", new Map())).toHaveLength(1);
  });

  it("size filter — overlapping buckets count", () => {
    const list = [
      c({ id: 1, employee_count_range: "1-50" }),
      c({ id: 2, employee_count_range: "50-200" }),
      c({ id: 3, employee_count_range: "5000+" }),
    ];
    const f = empty();
    f.size = new Set(["51-200"]);
    const out = applyFilters(list, f, "", new Map());
    expect(out.map((x) => x.id).sort()).toEqual(["id-2"]);
  });

  it("location uses substring match (catches dual-city listings)", () => {
    const list = [
      c({ id: 1, hq_city: "Tel Aviv" }),
      c({ id: 2, hq_city: "Tel Aviv / New York" }),
      c({ id: 3, hq_city: "Herzliya" }),
    ];
    const f = empty();
    f.location = new Set(["Tel Aviv"]);
    const out = applyFilters(list, f, "", new Map());
    expect(out.map((x) => x.id).sort()).toEqual(["id-1", "id-2"]);
  });

  it("origin filter — exact match on raw DB value", () => {
    const list = [
      c({ id: 1, origin: "israeli_founded" }),
      c({ id: 2, origin: "international_il_rd" }),
    ];
    const f = empty();
    f.origin = new Set(["international_il_rd"]);
    expect(applyFilters(list, f, "", new Map())).toHaveLength(1);
  });
});

describe("applyFilters — composition", () => {
  it("AND across axes", () => {
    const list = [
      c({ id: 1, industry: "FinTech", stage: "Series B" }),
      c({ id: 2, industry: "FinTech", stage: "Growth" }),
      c({ id: 3, industry: "Cybersecurity", stage: "Series B" }),
    ];
    const f = empty();
    f.industry = new Set(["FinTech"]);
    f.stage = new Set(["Series B"]);
    const out = applyFilters(list, f, "", new Map());
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("id-1");
  });
});

describe("applyFilters — search", () => {
  const list = [
    c({ id: 1, name: "Acme Security", sector: "AppSec", industry: "Cybersecurity" }),
    c({ id: 2, name: "PayCo",         sector: "Payments", industry: "FinTech" }),
  ];

  it("matches case-insensitive substring against name + sector + industry", () => {
    expect(applyFilters(list, empty(), "appsec", new Map())).toHaveLength(1);
    expect(applyFilters(list, empty(), "FINTECH", new Map())).toHaveLength(1);
    expect(applyFilters(list, empty(), "acme", new Map())[0].id).toBe("id-1");
  });

  it("treats multiple tokens as AND", () => {
    expect(applyFilters(list, empty(), "acme appsec", new Map())).toHaveLength(1);
    expect(applyFilters(list, empty(), "acme fintech", new Map())).toHaveLength(0);
  });
});

describe("applyFilters — sort", () => {
  const list = [
    c({ id: 1, name: "Zeta" }),
    c({ id: 2, name: "Alpha" }),
    c({ id: 3, name: "Mu" }),
  ];

  it("sorts alphabetically when no scores exist", () => {
    const out = applyFilters(list, empty(), "", new Map());
    expect(out.map((x) => x.name)).toEqual(["Alpha", "Mu", "Zeta"]);
  });

  it("sorts by score desc when at least one company is scored", () => {
    const scores = new Map([["id-1", 85], ["id-2", null], ["id-3", 60]]);
    const out = applyFilters(list, empty(), "", scores);
    expect(out.map((x) => x.id)).toEqual(["id-1", "id-3", "id-2"]); // null sorted last
  });
});

describe("facetCounts", () => {
  const list = [
    c({ id: 1, industry: "FinTech",       stage: "Series A" }),
    c({ id: 2, industry: "FinTech",       stage: "Series B" }),
    c({ id: 3, industry: "Cybersecurity", stage: "Series A" }),
    c({ id: 4, industry: "Gaming",        stage: "Growth" }),
  ];

  it("counts per pill assuming THIS pill is the only selection in its axis", () => {
    const counts = facetCounts({
      companies: list,
      filters: empty(),
      search: "",
      scoresById: new Map(),
      axis: "industry",
      axisValues: ["FinTech", "Cybersecurity", "Gaming"],
    });
    expect(counts.get("FinTech")).toBe(2);
    expect(counts.get("Cybersecurity")).toBe(1);
    expect(counts.get("Gaming")).toBe(1);
  });

  it("respects other-axis filters when computing", () => {
    const f = empty();
    f.stage = new Set(["Series A"]);
    const counts = facetCounts({
      companies: list,
      filters: f,
      search: "",
      scoresById: new Map(),
      axis: "industry",
      axisValues: ["FinTech", "Cybersecurity", "Gaming"],
    });
    expect(counts.get("FinTech")).toBe(1);       // (FinTech + Series A) → id-1
    expect(counts.get("Cybersecurity")).toBe(1); // (Cyber + Series A) → id-3
    expect(counts.get("Gaming")).toBe(0);        // (Gaming + Series A) → none
  });
});
