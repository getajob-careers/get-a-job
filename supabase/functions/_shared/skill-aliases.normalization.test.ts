// PR-A (Scoring Coverage Arc) — resolver normalization retries.
// Validates the depluralize / suffix-strip / hyphen / ampersand retries added
// to resolveSkill, and that they never over-resolve (a normalized form only
// matches a real alias/ID, so no class-G false positives are introduced).
import { describe, it, expect } from "vitest";
import { resolveSkill } from "./skill-aliases.ts";

// The retries only fire against the injected ID set; seed the IDs the cases hit.
const IDS = new Set([
  "problem_solving", "crm_management", "leadership", "rf_engineering",
  "place_and_route", "cybersecurity_general", "git_version_control",
]);

describe("resolveSkill — PR-A normalization retries", () => {
  it("suffix-strip: 'problem-solving skills' -> problem_solving", () => {
    expect(resolveSkill("problem-solving skills", IDS)).toEqual(["problem_solving"]);
  });
  it("suffix-strip 'systems': 'crm systems' -> crm_management", () => {
    expect(resolveSkill("crm systems", IDS)).toEqual(["crm_management"]);
  });
  it("ampersand: 'place & route' -> place_and_route", () => {
    expect(resolveSkill("place & route", IDS)).toEqual(["place_and_route"]);
  });
  it("hyphen: 'cyber-security' -> cybersecurity_general", () => {
    expect(resolveSkill("cyber-security", IDS)).toEqual(["cybersecurity_general"]);
  });
  it("suffix 'systems' on version control: 'version control systems' -> git_version_control", () => {
    expect(resolveSkill("version control systems", IDS)).toEqual(["git_version_control"]);
  });
  it("SAFETY: depluralize never over-resolves to an unrelated id", () => {
    // 'leaderships' -> 'leadership' only resolves because leadership IS an id.
    expect(resolveSkill("leaderships", IDS)).toEqual(["leadership"]);
    // a plural with no singular alias/id stays unmapped (no false positive).
    expect(resolveSkill("kubernetess", IDS)).toEqual([]);
    expect(resolveSkill("random gibberish phrase", IDS)).toEqual([]);
  });
  it("SAFETY: empty id set resolves nothing, never throws", () => {
    expect(resolveSkill("problem-solving skills", new Set())).toEqual([]);
  });
});
