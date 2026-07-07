// Tests for the deterministic Hebrew router + the two routed-path guardrail
// filters (spec §1, §3). Pure functions — NO LLM, NO network, fixtures only.

import { describe, it, expect } from "vitest";
import {
  hebrewCharRatio,
  isHebrewJd,
  containsHebrew,
  dropHebrewLabels,
  tokenGroundedSkills,
  EXTRACT_HE_SKILL_CAP,
  HEBREW_ROUTING_THRESHOLD,
} from "./hebrew-routing.ts";

const HEBREW_JD =
  "דרוש מפתח תוכנה בכיר עם ניסיון בפיתוח מערכות צד שרת וניהול צוות. " +
  "המשרה כוללת עבודה מול לקוחות עסקיים ותכנון ארכיטקטורה של מוצר.";

const ENGLISH_JD =
  "We are looking for a senior software engineer with strong backend experience " +
  "to design and build scalable services for our enterprise customers.";

// Hebrew prose peppered with English tech terms — the common Israeli JD shape.
const MIXED_JD =
  "דרוש מהנדס Backend עם ניסיון ב Python ו SQL לפיתוח מערכות בענן AWS " +
  "וניהול pipeline של נתונים בסביבת production.";

// English body with a single Hebrew company suffix token ("Ltd").
const ENGLISH_WITH_STRAY_HEBREW =
  ENGLISH_JD + " The employer is a well-established technology company (בעמ).";

describe("hebrewCharRatio + isHebrewJd — deterministic script router (spec §1)", () => {
  it("scores a Hebrew JD near 1.0 and routes it", () => {
    expect(hebrewCharRatio(HEBREW_JD)).toBeGreaterThan(0.9);
    expect(isHebrewJd(HEBREW_JD)).toBe(true);
  });

  it("scores an English JD at 0 and does NOT route it", () => {
    expect(hebrewCharRatio(ENGLISH_JD)).toBe(0);
    expect(isHebrewJd(ENGLISH_JD)).toBe(false);
  });

  it("routes a mixed Hebrew+English JD (above threshold)", () => {
    expect(hebrewCharRatio(MIXED_JD)).toBeGreaterThan(HEBREW_ROUTING_THRESHOLD);
    expect(isHebrewJd(MIXED_JD)).toBe(true);
  });

  it("does NOT route an English JD with a stray Hebrew token (below threshold)", () => {
    expect(hebrewCharRatio(ENGLISH_WITH_STRAY_HEBREW)).toBeLessThan(HEBREW_ROUTING_THRESHOLD);
    expect(isHebrewJd(ENGLISH_WITH_STRAY_HEBREW)).toBe(false);
  });

  it("handles empty / non-string input as not-Hebrew", () => {
    expect(hebrewCharRatio("")).toBe(0);
    expect(isHebrewJd("")).toBe(false);
    // deno/TS callers only pass strings, but guard against runtime junk.
    expect(hebrewCharRatio(undefined as unknown as string)).toBe(0);
  });
});

describe("dropHebrewLabels — English-only-labels guardrail (spec §3b)", () => {
  it("drops Hebrew-script labels, keeps English ones", () => {
    expect(dropHebrewLabels(["Python", "ניהול מוצר", "SQL", "עבודת צוות"]))
      .toEqual(["Python", "SQL"]);
  });

  it("keeps a fully-English list unchanged and tolerates junk entries", () => {
    expect(dropHebrewLabels(["stakeholder communication", "kubernetes"]))
      .toEqual(["stakeholder communication", "kubernetes"]);
    expect(dropHebrewLabels([])).toEqual([]);
  });

  it("containsHebrew flags mixed and pure-Hebrew strings, not English", () => {
    expect(containsHebrew("ניהול")).toBe(true);
    expect(containsHebrew("Product ניהול")).toBe(true);
    expect(containsHebrew("product management")).toBe(false);
    expect(containsHebrew(42 as unknown as string)).toBe(false);
  });
});

describe("tokenGroundedSkills — anti-fabrication padding kill (spec §3a)", () => {
  const RICH_ENGLISH_BODY =
    "We need a backend engineer skilled in python and kubernetes to build " +
    "scalable microservices for our fintech platform serving enterprise " +
    "customers across europe and israel, with strong stakeholder communication " +
    "and a data pipeline built on airflow and spark over aws cloud infrastructure.";

  it("drops a Latin skill with zero JD-anchored tokens, keeps grounded ones", () => {
    const out = tokenGroundedSkills(
      ["python", "kubernetes management", "blockchain wizardry", "stakeholder communication"],
      RICH_ENGLISH_BODY,
    );
    expect(out).toEqual(["python", "kubernetes management", "stakeholder communication"]);
  });

  it("keeps Hebrew-script labels untouched (owned by dropHebrewLabels)", () => {
    const out = tokenGroundedSkills(["ניהול מוצר", "python"], RICH_ENGLISH_BODY);
    expect(out).toEqual(["ניהול מוצר", "python"]);
  });

  it("no-ops on a Hebrew-dominant body (too few Latin tokens to verify against)", () => {
    // English translated labels can't be grounded against Hebrew text, so the
    // filter must NOT nuke them.
    const labels = ["product lifecycle management", "cross-team coordination"];
    expect(tokenGroundedSkills(labels, HEBREW_JD)).toEqual(labels);
  });

  it("keeps labels made only of stopwords/numbers (nothing checkable)", () => {
    const out = tokenGroundedSkills(["team and the", "3+"], RICH_ENGLISH_BODY);
    expect(out).toEqual(["team and the", "3+"]);
  });
});

describe("routed-path skill cap constant (spec §3a.2)", () => {
  it("is 15 — tighter than the 4o-mini path's 25", () => {
    expect(EXTRACT_HE_SKILL_CAP).toBe(15);
  });
});
