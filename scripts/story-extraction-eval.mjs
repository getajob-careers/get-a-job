#!/usr/bin/env node
// Story-extraction quality eval harness (extract-bullets).
//
// Runs the FROZEN synthetic input set (docs/eval/story-extraction-inputs.json)
// through the extract-bullets prompt and scores each output against the frozen
// rubric (docs/eval/story-extraction-rubric.md). Produces a comparable
// before/after number — real-user data is n=0, so this is the only measure.
//
// Mirrors production EXACTLY (2026-06-11 lesson — a harness must never be more
// permissive than the deployed consumer):
//   - SYSTEM_PROMPT is READ OUT of supabase/functions/extract-bullets/index.ts
//     at runtime, not re-typed, so it can't drift from what ships.
//   - user prompt assembly mirrors index.ts:279-294.
//   - parse is bare JSON.parse(content || "{}") + the same sanitise shape
//     (bullets cap 4/len 300, skills cap 15, null on 0 bullets). No fence
//     stripping, no JSON-repair.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/story-extraction-eval.mjs --mode baseline
//   OPENAI_API_KEY=sk-... node scripts/story-extraction-eval.mjs --mode grounded --judge
//
// --mode baseline : current production prompt (grounding context OFF)
// --mode grounded : + reference-only grounding block built from input.profile
// --judge         : add the Layer-2 gpt-4o LLM judge (one call per input)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const MODE = args.includes("--mode")
  ? args[args.indexOf("--mode") + 1]
  : "baseline";
const JUDGE = args.includes("--judge");
const MODEL = "gpt-4o-mini"; // must match extract-bullets/index.ts MODEL
const JUDGE_MODEL = "gpt-4o";

// Strip anything outside printable ASCII (control chars, whitespace, and the
// U+2028/U+2029 line/paragraph separators - char 8232 burned a full run on
// 2026-07-23 - plus BOM/zero-width). An OpenAI key is printable ASCII, no spaces.
const KEY = (process.env.OPENAI_API_KEY || "").replace(/[^\x21-\x7E]/g, "");
if (MODE !== "baseline" && MODE !== "grounded") {
  console.error(`--mode must be baseline|grounded (got "${MODE}")`);
  process.exit(1);
}

// ---- load frozen inputs + the LIVE system prompt (drift-safe) --------------
const inputsDoc = JSON.parse(
  readFileSync(join(ROOT, "docs/eval/story-extraction-inputs.json"), "utf8"),
);
const INPUTS = inputsDoc.inputs;

const edgeSrc = readFileSync(
  join(ROOT, "supabase/functions/extract-bullets/index.ts"),
  "utf8",
);
const promptMatch = edgeSrc.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
if (!promptMatch) {
  console.error(
    "Could not extract SYSTEM_PROMPT from extract-bullets/index.ts — the const shape changed; update the regex.",
  );
  process.exit(1);
}
const SYSTEM_PROMPT = promptMatch[1];

// ---- prompt assembly (mirrors index.ts:279-294) ---------------------------
function entryLabel(input) {
  const t = input.target;
  if (input.target_type === "education") {
    return `EDUCATION ENTRY (the bullets belong to this entry — you may reference the degree / field / school since they are confirmed, but do not invent other details):
- Degree: ${t.degree_type || ""}
- Field of study: ${t.field_of_study || ""}
- School: ${t.institution || ""}`;
  }
  return `EXPERIENCE (the bullets belong to this role — you may reference the role / company since they are confirmed, but do not invent other details about it):
- Role: ${t.title || ""}
- Company: ${t.company || ""}`;
}

// The grounding-context lever. Kept in lockstep with the shared edge module
// (_shared/extraction-context.ts formatGroundingBlock). Reference-only: frames
// toward the goal, never a source of facts. Round-1 recalibration: field +
// target-role ONLY (the skill-vocabulary line leaked profile skills into output
// and was removed — see docs/eval/story-extraction-baseline-findings.md).
function groundingBlock(input) {
  const p = input.profile;
  if (!p) return "";
  // Mirror formatGroundingBlock EXACTLY. Production: field <- primary_domain,
  // working-toward <- five_year_role. Here the frozen fixture supplies the
  // analogs (primary_domain, target_roles[0]).
  const lines = [];
  if (p.primary_domain) lines.push(`- The user's field: ${p.primary_domain}`);
  const targetRole = (p.target_roles || [])[0];
  if (targetRole) lines.push(`- Working toward: ${targetRole}`);
  if (!lines.length) return "";
  return `\n\nGROUNDING CONTEXT (reference only — frames the bullet toward the user's goal; NEVER a source of facts, metrics, tools, or skills to add. Every claim in a bullet still comes from the USER TEXT alone):
${lines.join("\n")}`;
}

function userPrompt(input) {
  const grounding = MODE === "grounded" ? groundingBlock(input) : "";
  return `${entryLabel(input)}${grounding}

USER TEXT:
${input.text}

Write resume-ready achievement bullets from the user text above.`;
}

// ---- production-mirrored parse + sanitise ---------------------------------
function sanitise(raw) {
  if (!raw || typeof raw !== "object") return null;
  const stringArray = (v, cap, maxLen) => {
    if (!Array.isArray(v)) return [];
    const out = [],
      seen = new Set();
    for (const item of v) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim().replace(/\s+/g, " ").slice(0, maxLen);
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= cap) break;
    }
    return out;
  };
  const bullets = stringArray(raw.bullets, 4, 300);
  if (bullets.length === 0) return null;
  const skills = stringArray(raw.skills, 15, 100);
  const extraction_notes =
    typeof raw.extraction_notes === "string"
      ? raw.extraction_notes.trim().slice(0, 500)
      : "";
  return { bullets, skills, extraction_notes };
}

// ---- OpenAI ---------------------------------------------------------------
async function chat(model, messages, opts = {}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.max_tokens ?? 1024,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok)
    throw new Error(
      `OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "{}";
}

// ---- Layer 1 scoring (deterministic) --------------------------------------
// Metric-shaped number tokens: %/$/k-m-suffixed OR value >= 10 (the
// "impressive metric" shapes anti-fab exists to protect). Bare small integers
// (a "3-person team" grounded in text) are not gated to avoid false positives.
function metricNumbers(text) {
  const out = new Set();
  // Magnitude suffix must be ATTACHED to the number and at a word boundary, or
  // "20 meetings" reads as "20 m" -> 20,000,000 (the 2026-07-23 false-positive
  // that failed messy-bizdev in both modes). The (?![a-z]) also blocks "29th".
  const re = /(\$)?\s?(\d[\d,]*\.?\d*)(k|m|bn|b)?(%)?(?![a-z])/gi;
  let mm;
  while ((mm = re.exec(text))) {
    const hasCur = !!mm[1],
      suf = (mm[3] || "").toLowerCase(),
      hasPct = !!mm[4];
    let v = parseFloat(mm[2].replace(/,/g, ""));
    if (isNaN(v)) continue;
    if (suf === "k") v *= 1e3;
    else if (suf === "m") v *= 1e6;
    else if (suf === "bn" || suf === "b") v *= 1e9;
    const metricShaped = hasCur || hasPct || suf || v >= 10;
    if (metricShaped) out.add(Math.round(v));
  }
  return out;
}

const TOOL_LEXICON = [
  "figma",
  "jira",
  "salesforce",
  "hubspot",
  "notion",
  "linear",
  "tableau",
  "klaviyo",
  "excel",
  "powerpoint",
  "sql",
  "python",
  "java",
  "javascript",
  "react",
  "aws",
  "gcp",
  "azure",
  "sqlalchemy",
  "postgres",
  "postgresql",
  "cron",
  "git",
  "looker",
  "mixpanel",
  "segment",
  "zendesk",
  "intercom",
  "slack",
  "asana",
  "trello",
  "marketo",
  "mailchimp",
  "sendgrid",
  "google analytics",
  "ga4",
  "napoleon cat",
  "napoleoncat",
];
// Alias groups so a spelling variant (Postgres vs PostgreSQL) isn't scored as an
// invented tool. Keys canonicalise to a shared token; the gate treats an output
// tool as grounded if ANY alias of its group appears in the input.
const TOOL_ALIASES = {
  postgres: "postgres",
  postgresql: "postgres",
  "napoleon cat": "napoleoncat",
  napoleoncat: "napoleoncat",
  "google analytics": "ga",
  ga4: "ga",
};
const ACTION_VERBS = new Set([
  "built",
  "led",
  "ran",
  "cut",
  "wrote",
  "shipped",
  "migrated",
  "coordinated",
  "analyzed",
  "analysed",
  "designed",
  "created",
  "managed",
  "reduced",
  "increased",
  "grew",
  "developed",
  "launched",
  "negotiated",
  "trained",
  "reorganised",
  "reorganized",
  "segmented",
  "deployed",
  "scored",
  "presented",
  "booked",
  "closed",
  "set",
  "drove",
  "delivered",
  "automated",
  "streamlined",
  "improved",
  "saved",
  "hit",
  "wrote",
  "researched",
  "organised",
  "organized",
]);
const OUTCOME_SIGNALS = [
  "%",
  "improv",
  "reduc",
  "increas",
  "cut ",
  "grew",
  "grow",
  "saved",
  "hit ",
  "reach",
  "result",
  "enabl",
  "leading to",
  "up from",
  "faster",
  "more ",
  "better",
  "boost",
  "closed",
  "attributed",
  "within",
];

function hebrewRatio(s) {
  const heb = (s.match(/[֐-׿]/g) || []).length;
  const letters = (s.match(/[A-Za-z֐-׿]/g) || []).length;
  return letters ? heb / letters : 0;
}

function scoreLayer1(input, out) {
  const bulletsText = out.bullets.join(" \n ");
  const inNums = metricNumbers(input.text);
  const outNums = metricNumbers(bulletsText);

  // Anti-fab gate.
  const inventedNums = [...outNums].filter((v) => !inNums.has(v));
  const inLower = input.text.toLowerCase();
  const haystack = (bulletsText + " " + out.skills.join(" ")).toLowerCase();
  // Word-boundary match so the invention gate never false-fires on a substring
  // (e.g. "sql" inside "postgresql", "postgres" inside "postgresql"). Strict on
  // purpose: a false positive here forces quality to 0.
  const wordHit = (text, term) =>
    new RegExp(
      `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    ).test(text);
  const inventedTools = TOOL_LEXICON.filter((tool) => {
    if (!wordHit(haystack, tool)) return false;
    const canon = TOOL_ALIASES[tool] || tool;
    const aliases = Object.keys(TOOL_ALIASES)
      .filter((k) => TOOL_ALIASES[k] === canon)
      .concat(tool);
    return !aliases.some((a) => wordHit(inLower, a));
  });
  const anti_fab_pass = inventedNums.length === 0 && inventedTools.length === 0;

  // metric_fidelity
  let metric_fidelity = 1;
  if ((input.known_metrics || []).length) {
    const km = input.known_metrics
      .map((s) => [...metricNumbers(s)][0])
      .filter((v) => v != null);
    const carried = km.filter((v) => outNums.has(v)).length;
    metric_fidelity = km.length ? carried / km.length : 1;
  }

  // tool_coverage
  let tool_coverage = 1;
  if ((input.known_tools || []).length) {
    const covered = input.known_tools.filter((t) =>
      haystack.includes(t.toLowerCase()),
    ).length;
    tool_coverage = covered / input.known_tools.length;
  }

  // bullet_discipline
  const disc = out.bullets.map((b) => {
    const words = b.trim().split(/\s+/);
    const first = words[0].toLowerCase().replace(/[^a-z]/g, "");
    const verbStart = ACTION_VERBS.has(first) || /ed$/.test(first);
    const lenOk = words.length >= 8 && words.length <= 30;
    const bl = b.toLowerCase();
    const outcome =
      words.length >= 8 &&
      (metricNumbers(b).size > 0 ||
        OUTCOME_SIGNALS.some((s) => bl.includes(s)));
    return (verbStart + lenOk + outcome) / 3;
  });
  const bullet_discipline = disc.length
    ? disc.reduce((a, b) => a + b, 0) / disc.length
    : 0;

  const output_language_en = hebrewRatio(bulletsText) < 0.15;
  const skills_nonempty = out.skills.length > 0;

  // Soft review flag: hedge-sharpening on messy inputs (surfaced, not gated).
  const hedge_flag =
    input.richness === "messy" &&
    /(~|about|around|roughly|something|like )/i.test(input.text) &&
    outNums.size > 0 &&
    !/(~|about|around|roughly|approx|about )/i.test(bulletsText);

  return {
    anti_fab_pass,
    invented_numbers: inventedNums,
    invented_tools: inventedTools,
    metric_fidelity,
    tool_coverage,
    bullet_discipline,
    has_output: true,
    skills_nonempty,
    output_language_en,
    hedge_flag,
  };
}

// ---- Layer 2 judge --------------------------------------------------------
async function judge(input, out) {
  const sys = `You are a strict CV-quality judge. Score resume bullets extracted from a user's raw text. Return ONLY JSON {"star_completeness":0-100,"groundedness":0-100,"usefulness":0-100}.
- star_completeness: does each bullet read as a real achievement (implied situation/task, explicit action, concrete result) vs a skeletal "did X" fragment?
- groundedness: does EVERY claim trace to the user's text? PENALISE invention — a fluent bullet with an invented number or tool scores 0 here. Do not reward confidence.
- usefulness: would this survive onto a real CV for the target role, or is it filler?`;
  const usr = `TARGET: ${JSON.stringify(input.target)}
USER TEXT:
${input.text}

EXTRACTED BULLETS:
${out.bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}
SKILLS: ${out.skills.join(", ") || "(none)"}`;
  const content = await chat(
    JUDGE_MODEL,
    [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
    { temperature: 0 },
  );
  try {
    return JSON.parse(content);
  } catch {
    return { star_completeness: null, groundedness: null, usefulness: null };
  }
}

// ---- composite ------------------------------------------------------------
function composite(l1, l2) {
  if (!l1.anti_fab_pass) return 0;
  const parts = [l1.metric_fidelity, l1.tool_coverage, l1.bullet_discipline];
  if (l2 && typeof l2.star_completeness === "number")
    parts.push(l2.star_completeness / 100);
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

// ---- run ------------------------------------------------------------------
function pct(x) {
  return x == null ? " n/a" : (x * 100).toFixed(0).padStart(3) + "%";
}

export { metricNumbers, scoreLayer1, composite };

export async function main() {
  if (!KEY) {
    console.error(
      "OPENAI_API_KEY is required (export it or prefix the command).",
    );
    process.exit(1);
  }
  const rows = [];
  for (const input of INPUTS) {
    process.stderr.write(`· ${input.id} (${MODE})… `);
    let out,
      l1,
      l2 = null,
      err = null;
    try {
      const content = await chat(MODEL, [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(input) },
      ]);
      let parsed;
      try {
        parsed = JSON.parse(content || "{}");
      } catch {
        parsed = null;
      }
      out = parsed ? sanitise(parsed) : null;
      if (!out) {
        err = "no_output_or_bad_shape";
        out = { bullets: [], skills: [], extraction_notes: "" };
      } else {
        l1 = scoreLayer1(input, out);
        if (JUDGE) l2 = await judge(input, out);
      }
    } catch (e) {
      err = e.message;
    }
    const q = l1 ? composite(l1, l2) : 0;
    rows.push({
      id: input.id,
      richness: input.richness,
      domain: input.domain,
      language: input.language,
      err,
      out,
      l1,
      l2,
      quality: q,
    });
    process.stderr.write(
      err
        ? `ERR ${err}\n`
        : `q=${(q * 100).toFixed(0)}%${l1 && !l1.anti_fab_pass ? " ANTI_FAB_FAIL" : ""}\n`,
    );
  }

  // ---- report ---------------------------------------------------------------
  const lines = [];
  lines.push(
    `\n=== Story-extraction eval — mode=${MODE} model=${MODEL}${JUDGE ? ` judge=${JUDGE_MODEL}` : ""} — SYNTHETIC (n=${INPUTS.length}) ===\n`,
  );
  lines.push(
    "id                     rich    dom            fab  mFid tCov disc  lang skl  star  QUALITY",
  );
  lines.push("─".repeat(92));
  for (const r of rows) {
    if (r.err && !r.l1) {
      lines.push(
        `${r.id.padEnd(22)} ${(r.richness || "").padEnd(7)} ${(r.domain || "").padEnd(14)} ERR ${r.err}`,
      );
      continue;
    }
    const l = r.l1;
    lines.push(
      [
        r.id.padEnd(22),
        (r.richness || "").padEnd(7),
        (r.domain || "").slice(0, 14).padEnd(14),
        l.anti_fab_pass ? " ok " : "FAIL",
        pct(l.metric_fidelity),
        pct(l.tool_coverage),
        pct(l.bullet_discipline),
        l.output_language_en ? " en " : " HE ",
        l.skills_nonempty ? "yes" : "NO ",
        r.l2 && typeof r.l2.star_completeness === "number"
          ? String(r.l2.star_completeness).padStart(4)
          : " n/a",
        " " + pct(r.quality),
      ].join(" "),
    );
  }
  lines.push("─".repeat(92));
  const mean = (f) =>
    rows.filter((r) => r.l1).reduce((a, r) => a + f(r), 0) /
    Math.max(1, rows.filter((r) => r.l1).length);
  const antiFabFails = rows
    .filter((r) => r.l1 && !r.l1.anti_fab_pass)
    .map((r) => r.id);
  lines.push(
    `SET MEAN quality: ${pct(mean((r) => r.quality))}   metric_fidelity: ${pct(mean((r) => r.l1.metric_fidelity))}   tool_coverage: ${pct(mean((r) => r.l1.tool_coverage))}   bullet_discipline: ${pct(mean((r) => r.l1.bullet_discipline))}`,
  );
  if (JUDGE)
    lines.push(
      `SET MEAN star_completeness: ${mean((r) => r.l2?.star_completeness || 0).toFixed(0)}   groundedness: ${mean((r) => r.l2?.groundedness || 0).toFixed(0)}   usefulness: ${mean((r) => r.l2?.usefulness || 0).toFixed(0)}`,
    );
  lines.push(
    `ANTI-FAB FAILS: ${antiFabFails.length ? antiFabFails.join(", ") : "none"}`,
  );
  const hedges = rows.filter((r) => r.l1?.hedge_flag).map((r) => r.id);
  if (hedges.length)
    lines.push(`HEDGE-SHARPENING REVIEW FLAGS: ${hedges.join(", ")}`);
  const heb = rows.find((r) => r.language === "he-en");
  if (heb?.l1)
    lines.push(
      `HEBREW PROBE (${heb.id}): output_language_en=${heb.l1.output_language_en} skills_nonempty=${heb.l1.skills_nonempty} tool_coverage=${pct(heb.l1.tool_coverage)}`,
    );

  const report = lines.join("\n");
  console.log(report);

  // persist full results (verbatim bullets too, for inspection)
  const outDir = join(ROOT, "docs/eval/results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(
    outDir,
    `${MODE}${JUDGE ? "-judged" : ""}-${stamp}.json`,
  );
  writeFileSync(
    outPath,
    JSON.stringify(
      { mode: MODE, model: MODEL, judge: JUDGE, ts: stamp, rows },
      null,
      2,
    ),
  );
  console.log(
    `\nFull results (with verbatim bullets) → ${outPath.replace(ROOT + "/", "")}`,
  );
}

// Run only when invoked directly, so the deterministic scorer can be imported
// and unit-tested without triggering a paid OpenAI run.
if (process.argv[1] && process.argv[1].endsWith("story-extraction-eval.mjs")) {
  main();
}
