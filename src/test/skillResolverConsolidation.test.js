import { describe, it, expect } from "vitest";

// The ONE shared resolver (Deno _shared module — bundles under Vite/esbuild,
// same path the frontend skillResolver.js already imports).
import {
  SKILL_ALIASES,
  resolveSkill as sharedResolveSkill,
  resolveSkillAliases as sharedResolveSkillAliases,
} from "../../supabase/functions/_shared/skill-aliases.ts";
// The frontend re-export (its own ID set, derived from the generated JSON).
import { resolveSkill as frontendResolveSkill } from "../lib/skillResolver";
// The canonical library + its generated mirror.
import { skillLibrary } from "../../supabase/functions/_shared/libraries/01_skill_library.ts";
import skillIdsData from "../lib/skillIdsGenerated.json";

// Library-derived ID set — EXACTLY how extract-job-requirements and
// generate-career-analysis build theirs (id || skill_id, drop falsy).
const LIBRARY_IDS = skillLibrary.skill_library
  .map((s) => s.id || s.skill_id)
  .filter(Boolean);
const LIBRARY_ID_SET = new Set(LIBRARY_IDS);

// extract + career-analysis both call the shared resolver with the
// library-derived set — reproduce that call path here.
const backendResolve = (label) => sharedResolveSkill(label, LIBRARY_ID_SET);
// generate-career-analysis specifically imports resolveSkillAliases.
const careerAnalysisResolve = (label) =>
  sharedResolveSkillAliases(label, LIBRARY_ID_SET);

// A representative fixture spanning every resolver branch + the new aliases.
const FIXTURE_PHRASES = [
  "Python",
  "Figma (basic)",
  "PRODUCT_MANAGEMENT",
  "product management",
  "ab_testing",
  "totally fake skill zzz",
  "technical_support",
  "technical support",
  "ai_ml",
  "object-oriented design",
  "object_oriented_programming",
  "lookers",
  "system verilog",
  "erp",
  "priority_erp",
  "authentication",
  "system engineering",
  "ui_design",
  "azure_devops",
  "embedded software development",
  "full stack development",
  "underwriting",
  "חיתום",
  "",
];

describe("three resolvers share one impl (identical IDs per fixture)", () => {
  // extract's path, generate-career-analysis's path, and the frontend
  // skillResolver.js path must return IDENTICAL IDs — they now delegate to a
  // single shared implementation over one logical ID source.
  it.each(FIXTURE_PHRASES)("resolves %j identically across runtimes", (p) => {
    const backend = backendResolve(p);
    const career = careerAnalysisResolve(p);
    const frontend = frontendResolveSkill(p);
    expect(career).toEqual(backend);
    expect(frontend).toEqual(backend);
  });
});

describe("no-behavior-change: shared resolver === legacy 4-step over a corpus", () => {
  // Byte-for-byte reproduction of the pre-consolidation resolveSkill
  // (the identical copy that lived in extract-job-requirements/index.ts,
  // generate-career-analysis, and skillResolver.js). It reads the SAME
  // SKILL_ALIASES table, so this proves the CONSOLIDATION changed no logic.
  function legacyResolve(label, idSet) {
    if (!label || typeof label !== "string") return [];
    const norm = label.toLowerCase().replace(/\s+/g, " ").trim();
    if (!norm) return [];
    const direct = SKILL_ALIASES[norm];
    if (direct) return direct.filter((id) => idSet.has(id));
    const stripped = norm
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped !== norm && stripped.length > 0) {
      const aliased = SKILL_ALIASES[stripped];
      if (aliased) return aliased.filter((id) => idSet.has(id));
    }
    if (norm.includes("_")) {
      const unsnaked = norm.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
      if (unsnaked !== norm && unsnaked.length > 0) {
        const aliased = SKILL_ALIASES[unsnaked];
        if (aliased) return aliased.filter((id) => idSet.has(id));
      }
    }
    const snake = norm.replace(/[\s-]+/g, "_");
    if (idSet.has(snake)) return [snake];
    return [];
  }

  it("matches the legacy output for every alias key in the table", () => {
    for (const key of Object.keys(SKILL_ALIASES)) {
      expect(sharedResolveSkill(key, LIBRARY_ID_SET)).toEqual(
        legacyResolve(key, LIBRARY_ID_SET),
      );
    }
  });

  it("matches the legacy output across mixed edge-case inputs", () => {
    const corpus = [
      ...FIXTURE_PHRASES,
      "Node.js (advanced)",
      "big_data",
      "GOOGLE   SHEETS",
      "  spaced  out  ",
      "snake_case_unknown_id",
      "data_structures_algorithms",
      null,
      undefined,
      42,
    ];
    for (const p of corpus) {
      expect(sharedResolveSkill(p, LIBRARY_ID_SET)).toEqual(
        legacyResolve(p, LIBRARY_ID_SET),
      );
    }
  });
});

describe("ID-source drift guard: generated JSON mirrors 01_skill_library.ts", () => {
  it("skillIdsGenerated.json IDs are identical to the library IDs", () => {
    const jsonIds = [...skillIdsData.ids].sort();
    const libIds = [...LIBRARY_IDS].sort();
    expect(jsonIds).toEqual(libIds);
  });

  it("the JSON count matches the library ID count", () => {
    expect(skillIdsData.ids.length).toBe(LIBRARY_IDS.length);
    expect(skillIdsData.count).toBe(LIBRARY_IDS.length);
  });
});

describe("step-2 class-A alias rows resolve to existing library IDs", () => {
  // The 15 rows built here. Each target was grep-verified present in
  // 01_skill_library.ts before adding. (4 of the spec's 19 — data science /
  // data_science / security research / security_research — were reclassified
  // M and deferred to step 3: no canonical ID exists yet. See the block below.)
  const CASES = [
    ["technical_support", ["helpdesk_support"]],
    ["technical support", ["helpdesk_support"]],
    ["ai_ml", ["machine_learning_fundamentals"]],
    ["object-oriented design", ["programming_fundamentals"]],
    ["object_oriented_programming", ["programming_fundamentals"]],
    ["lookers", ["dashboarding", "bi_tools"]],
    ["system verilog", ["systemverilog"]],
    ["erp", ["erp_systems"]],
    ["priority_erp", ["erp_systems"]],
    ["authentication", ["jwt_oauth_auth"]],
    ["system engineering", ["system_design"]],
    ["ui_design", ["ui_visual_design"]],
    ["azure_devops", ["cloud_platforms_devops"]],
    ["embedded software development", ["embedded_systems"]],
    ["full stack development", ["frontend_development", "backend_development"]],
  ];

  it.each(CASES)(
    "%j resolves to its expected target(s)",
    (phrase, expected) => {
      const ids = frontendResolveSkill(phrase);
      expect(ids).toEqual(expect.arrayContaining(expected));
      // Every returned ID must be a real library ID (the resolver filters, so
      // this also proves the targets exist).
      for (const id of ids) expect(LIBRARY_ID_SET.has(id)).toBe(true);
    },
  );

  // data_science and security_research were "deferred to step 3, no canonical
  // ID" phrases until the 7-role expansion (#581 security, #582 quality)
  // promoted them to real library IDs. They now resolve to themselves via the
  // snake-case auto-resolve step — the drift-guard regen of skillIdsGenerated.json
  // is what surfaced this (the stale 599-ID mirror was missing them).
  it("phrases promoted to canonical IDs in the 7-role expansion now resolve", () => {
    expect(frontendResolveSkill("data science")).toEqual(["data_science"]);
    expect(frontendResolveSkill("data_science")).toEqual(["data_science"]);
    expect(frontendResolveSkill("security research")).toEqual([
      "security_research",
    ]);
    expect(frontendResolveSkill("security_research")).toEqual([
      "security_research",
    ]);
  });
});
