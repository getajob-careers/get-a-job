// hebrew-extract-bakeoff.ts — Scoring-arc PR-C bake-off (Deno, manual run).
//
// Compares gpt-4o-mini (today's routing-OFF baseline) vs gpt-5.4-mini (the
// Hebrew-routing candidate) on 30 FROZEN Hebrew-dominant jobs, using the v5
// extraction prompt reconstructed from the live edge-fn source. It reuses the
// edge fn's OWN openaiChatCompletion (identical gpt-5 payload shaping + usage),
// resolver, and Hebrew guardrails — so the only fidelity gap vs production is
// that the vocab-enum lists are eval-extracted from source (they don't affect
// skill emission, and token count stays faithful for the cost measurement).
//
// It does NOT write to the jobs table (pure read + OpenAI). Each arm runs the
// model through ITS production path: 4o-mini = English path (cap 25, no
// guardrails); gpt-5.4-mini = Hebrew path (cap 15, dropHebrewLabels +
// tokenGroundedSkills) — the actual routing decision.
//
// Run:
//   deno run --allow-env --allow-read --allow-net scripts/hebrew-extract-bakeoff.ts
// Keys (env or scripts/.bakeoff.env, KEY=value lines, gitignored):
//   OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY

import { openaiChatCompletion } from "../supabase/functions/_shared/openai-chat.ts";
import { resolveSkill as resolveSkillShared } from "../supabase/functions/_shared/skill-aliases.ts";
import { skillLibrary } from "../supabase/functions/_shared/libraries/01_skill_library.ts";
import { roleLibrary } from "../supabase/functions/_shared/libraries/00_role_library.ts";
import { stripHtml } from "../supabase/functions/_shared/strip-html.ts";
import {
  dropHebrewLabels,
  tokenGroundedSkills,
  hebrewCharRatio,
  EXTRACT_HE_SKILL_CAP,
} from "../supabase/functions/_shared/hebrew-routing.ts";

// ── Pricing (USD per 1M tokens). Both verified against current OpenAI pricing
// (Eli, 2026-07-13). Token counts are measured, so re-price by editing here. ──
const RATES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-5.4-mini": { in: 0.75, out: 4.5 },
};

const SUPABASE_URL = "https://ilmqmodklutztuybsvwd.supabase.co";

// 30 frozen Hebrew jobs — is_active, desc≥200, he_ratio≥0.10, order by md5(id).
const FROZEN_IDS = [
  "958a74fd-33c0-4d58-ae8d-4a57c543dee4",
  "bf7ad182-69e0-47f2-bc04-4ad733a7f8a9",
  "f7644bf1-6120-48c4-9178-66ed27e84556",
  "0d0f6525-781d-4405-bdfd-87cb7dda7783",
  "d92e5038-7e1d-49da-84f6-58ded11aa805",
  "a8fec683-a187-4ca2-b64c-c98e68b1a0ac",
  "8eafc574-5f41-4aef-afdb-de3ff42d1173",
  "9ad989d5-db88-413c-9244-cd1e824ce26d",
  "2060b488-ac1a-425b-a488-66851f4fca66",
  "279ea85b-c520-402e-b91d-324e99b7f5eb",
  "2357eef9-c000-459a-9ad3-8ab7fb2d6afb",
  "e12e7cb2-ba43-40f7-8056-c2e549fab751",
  "895dc8f9-919d-4a93-898c-c95ae2363ba2",
  "410a629c-38de-4484-850b-ed019afcf6ac",
  "18922069-cbc5-4c7a-925a-c57e75b4267b",
  "69231585-c6b1-4331-af16-4b50b559bdf2",
  "3cc49c94-7e45-4187-8662-bebbdc7d637d",
  "a36d66fb-3439-41f8-b4c8-db6f6150c9c0",
  "e9099a21-5c7e-4f92-9cf9-1bbc07636901",
  "0f8da3d4-e841-45d2-8afe-e33b3387b79f",
  "437fded0-a1d9-4ca5-8082-3b7407014701",
  "d747e1d4-7716-4f20-b9c6-b11712acb434",
  "62f60b46-48e6-4b95-b7cc-fef6bb0beb27",
  "72dc00aa-d87c-43c9-8cea-6878836f386a",
  "e905a74f-ca7b-4f37-b305-65e2c3c3c7ae",
  "3bf9bae9-1400-43d4-9747-6e6c0e222814",
  "70f390ab-2828-4c73-bfe4-f51363a94f47",
  "1794f873-3bf1-4e3f-a264-d9ed54beb321",
  "550770d8-b0d2-401e-a82e-46bb74c178e4",
  "f1f91c13-5dfd-4bbf-9978-d6d555372751",
];

// 10 frozen clean-English jobs (he_ratio<0.02, is_active, desc≥200, md5(id)).
// Used by BAKEOFF_MODE=english-musthave — the must-have sanity check: does the
// v5 prompt populate req_skills_must_have on English JDs under gpt-4o-mini?
const ENGLISH_IDS = [
  "acc70a3c-8c46-4f9e-aaa8-539a28a54581",
  "cd9517c1-7026-4497-94c1-ba30a5d9f5a0",
  "a421cc89-f1c2-4d45-a5ad-0d5e5002a17e",
  "988978d0-09ee-49eb-b5cb-ab7dcab89927",
  "0cb93f74-9d0d-4231-b4e8-5e938c2836a9",
  "5c9456aa-6175-4966-916d-537d59b76dd3",
  "e84ba39c-c842-4781-b248-6c882887c458",
  "36800105-42ad-4528-9e89-0679a07c2399",
  "82cacd3e-61b5-4def-bea7-a3cae78d4b7e",
  "5ea7dba1-db11-47ce-b9f1-2120e048f4e5",
];

// ── key loading ──────────────────────────────────────────────────────────
async function loadKeys(): Promise<Record<string, string>> {
  const keys: Record<string, string> = {};
  for (const k of ["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const v = Deno.env.get(k);
    if (v) keys[k] = v;
  }
  try {
    const txt = await Deno.readTextFile(
      new URL("./.bakeoff.env", import.meta.url),
    );
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m && !keys[m[1]]) keys[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no file — env only */
  }
  for (const k of ["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!keys[k]) {
      console.error(`Missing ${k}. Set it in the env or scripts/.bakeoff.env`);
      Deno.exit(1);
    }
  }
  return keys;
}

// ── faithful prompt reconstruction from the edge-fn source ────────────────
function buildPrompts(): {
  systemPrompt: string;
  heAddendum: string;
  userTmpl: string;
} {
  const src = Deno.readTextFileSync(
    new URL(
      "../supabase/functions/extract-job-requirements/index.ts",
      import.meta.url,
    ),
  );
  const grab = (name: string): string => {
    const m = src.match(new RegExp("const " + name + " =\\s*`([\\s\\S]*?)`;"));
    if (!m) throw new Error(`could not extract ${name} from source`);
    return m[1];
  };
  let systemPrompt = grab("systemPrompt");
  const userTmpl = grab("userPrompt");
  // heAddendum interpolates ${EXTRACT_HE_SKILL_CAP} at runtime in the edge fn;
  // resolve it here so the routed prompt matches production byte-for-byte.
  const heAddendum = grab("HE_PROMPT_ADDENDUM").replaceAll(
    "${EXTRACT_HE_SKILL_CAP}",
    String(EXTRACT_HE_SKILL_CAP),
  );

  // Extract the 8 local literal vocab arrays from source. Safe parse: pull the
  // quoted string tokens out of the array literal via regex — no code exec, and
  // robust to trailing commas / inline comments (which would break JSON.parse).
  const evalArr = (name: string): string[] => {
    const m = src.match(
      new RegExp("const " + name + " =\\s*(\\[[\\s\\S]*?\\]);"),
    );
    if (!m) throw new Error(`could not extract vocab ${name}`);
    return [...m[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map((x) => x[1] ?? x[2]);
  };
  const vocab: Record<string, string[]> = {
    SENIORITY_VOCAB: (roleLibrary as any).seniority_levels,
    ROLE_FAMILIES: (roleLibrary as any).role_families,
    EDUCATION_LEVELS: evalArr("EDUCATION_LEVELS"),
    PROFICIENCY_LEVELS: evalArr("PROFICIENCY_LEVELS"),
    CUSTOMER_TYPES: evalArr("CUSTOMER_TYPES"),
    COMPANY_STAGES: evalArr("COMPANY_STAGES"),
    METHODOLOGIES: evalArr("METHODOLOGIES"),
    APPLICATION_EXTRAS: evalArr("APPLICATION_EXTRAS"),
    BENEFITS_VOCAB: evalArr("BENEFITS_VOCAB"),
    SALARY_CADENCES: evalArr("SALARY_CADENCES"),
  };
  for (const [name, arr] of Object.entries(vocab)) {
    systemPrompt = systemPrompt.replaceAll(
      "${" + name + ".join(' | ')}",
      arr.join(" | "),
    );
  }
  if (systemPrompt.includes("${")) {
    throw new Error(
      "unresolved interpolation in systemPrompt: " +
        systemPrompt.slice(
          systemPrompt.indexOf("${"),
          systemPrompt.indexOf("${") + 60,
        ),
    );
  }
  return { systemPrompt, heAddendum, userTmpl };
}

const SKILL_ID_SET: Set<string> = new Set(
  ((skillLibrary as any).skill_library as any[])
    .map((s) => s.id || s.skill_id)
    .filter(Boolean),
);
const resolveSkill = (label: string): string[] =>
  resolveSkillShared(label, SKILL_ID_SET);

// ── one extraction run (one model, one job) ───────────────────────────────
async function runArm(
  job: { id: string; title: string; jd: string },
  model: string,
  routeToHebrew: boolean,
  prompts: { systemPrompt: string; heAddendum: string; userTmpl: string },
  openaiKey: string,
) {
  const userPrompt = prompts.userTmpl
    .replaceAll("${jobTitle}", job.title)
    .replace("${jd.slice(0, 12000)}", job.jd.slice(0, 12000));
  const res = await openaiChatCompletion(
    {
      model,
      temperature: 0,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            prompts.systemPrompt + (routeToHebrew ? prompts.heAddendum : ""),
        },
        { role: "user", content: userPrompt },
      ],
    },
    openaiKey,
    { traceName: "hebrew-bakeoff" },
    { signal: AbortSignal.timeout(90000) },
  );
  if (!res.ok)
    return { error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  const data = await res.json();
  const usage = data.usage ?? {};
  let parsed: any = {};
  try {
    parsed = JSON.parse(
      (data.choices?.[0]?.message?.content || "{}")
        .replace(/```json|```/g, "")
        .trim(),
    );
  } catch {
    /* leave empty */
  }

  const cap = routeToHebrew ? EXTRACT_HE_SKILL_CAP : 25;
  const clean = (a: unknown): string[] =>
    Array.isArray(a)
      ? a.filter((s) => typeof s === "string" && s.trim()).slice(0, cap)
      : [];
  let core = clean(parsed.req_skills_core_raw);
  let nice = clean(parsed.req_skills_nice_raw);
  let must = clean(parsed.req_skills_must_have_raw);
  if (routeToHebrew) {
    core = tokenGroundedSkills(dropHebrewLabels(core), job.jd);
    nice = tokenGroundedSkills(dropHebrewLabels(nice), job.jd);
    must = tokenGroundedSkills(dropHebrewLabels(must), job.jd);
  }
  const coreLower = new Set(core.map((s) => s.toLowerCase().trim()));
  must = must.filter((s) => coreLower.has(s.toLowerCase().trim()));

  const resolvedCore = new Set<string>();
  let unmapped = 0;
  for (const r of core) {
    const ids = resolveSkill(r);
    ids.length ? ids.forEach((i) => resolvedCore.add(i)) : unmapped++;
  }
  for (const r of nice) {
    const ids = resolveSkill(r);
    if (!ids.length) unmapped++;
  }
  const totalRaw = core.length + nice.length;

  const rate = RATES[model];
  const pt = usage.prompt_tokens ?? 0,
    ct = usage.completion_tokens ?? 0;
  const cost = (pt * rate.in + ct * rate.out) / 1e6;
  return {
    rawCore: core.length,
    rawNice: nice.length,
    must: must.length,
    resolvedCore: resolvedCore.size,
    zeroCore: resolvedCore.size === 0,
    coverage: totalRaw ? (totalRaw - unmapped) / totalRaw : null,
    langs: Array.isArray(parsed.req_languages)
      ? parsed.req_languages.length
      : 0,
    promptTokens: pt,
    completionTokens: ct,
    cost,
    langInSkills: core
      .concat(nice)
      .filter((s) => /\b(english|hebrew|spanish|arabic)\b/i.test(s)).length,
  };
}

// ── main ──────────────────────────────────────────────────────────────────
const keys = await loadKeys();
const prompts = buildPrompts();
console.error(
  `systemPrompt reconstructed: ${prompts.systemPrompt.length} chars`,
);

// Mode: default "hebrew" (30-job 2-model bake-off) or "english-musthave" (10
// English jobs, gpt-4o-mini only — does the v5 prompt populate must-have on EN?)
const MODE = Deno.env.get("BAKEOFF_MODE") ?? Deno.args[0] ?? "hebrew";
const ENGLISH = MODE === "english-musthave";
const IDS = ENGLISH ? ENGLISH_IDS : FROZEN_IDS;
const arms = ENGLISH
  ? [{ name: "gpt-4o-mini (EN path)", model: "gpt-4o-mini", he: false }]
  : [
      {
        name: "gpt-4o-mini (baseline, EN path)",
        model: "gpt-4o-mini",
        he: false,
      },
      {
        name: "gpt-5.4-mini (candidate, HE path)",
        model: "gpt-5.4-mini",
        he: true,
      },
    ];

// fetch the frozen jobs (service-role bypasses RLS)
const resp = await fetch(
  `${SUPABASE_URL}/rest/v1/jobs?id=in.(${IDS.join(",")})&select=id,title,description`,
  {
    headers: {
      apikey: keys.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${keys.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  },
);
if (!resp.ok) {
  console.error("job fetch failed:", resp.status, await resp.text());
  Deno.exit(1);
}
const rows: any[] = await resp.json();
const jobs = IDS.map((id) => {
  const r = rows.find((x) => x.id === id);
  return r
    ? { id, title: r.title || "", jd: stripHtml(r.description) ?? "" }
    : null;
}).filter(Boolean) as { id: string; title: string; jd: string }[];
console.error(
  `mode=${MODE}; fetched ${jobs.length}/${IDS.length} jobs; he-ratio avg ${(jobs.reduce((a, j) => a + hebrewCharRatio(j.jd), 0) / jobs.length).toFixed(2)}`,
);

const agg: Record<string, any[]> = {};
for (const arm of arms) agg[arm.model] = [];

for (const job of jobs) {
  for (const arm of arms) {
    try {
      const r = await runArm(
        job,
        arm.model,
        arm.he,
        prompts,
        keys.OPENAI_API_KEY,
      );
      agg[arm.model].push(r);
      if ((r as any).error)
        console.error(
          `  ${arm.model} ${job.id.slice(0, 8)} ERROR ${(r as any).error}`,
        );
    } catch (e) {
      console.error(`  ${arm.model} ${job.id.slice(0, 8)} threw ${e}`);
      agg[arm.model].push({ error: String(e) });
    }
  }
  console.error(`done ${job.id.slice(0, 8)} "${job.title.slice(0, 30)}"`);
}

// ── report ──────────────────────────────────────────────────────────────
function summarize(model: string) {
  const rs = agg[model].filter((r) => !r.error);
  const n = rs.length || 1;
  const avg = (f: (r: any) => number) =>
    rs.reduce((a, r) => a + (f(r) || 0), 0) / n;
  const cov = rs.filter((r) => r.coverage != null);
  return {
    n: rs.length,
    errors: agg[model].length - rs.length,
    avgRawCore: avg((r) => r.rawCore),
    avgResolvedCore: avg((r) => r.resolvedCore),
    zeroCorePct: (100 * rs.filter((r) => r.zeroCore).length) / n,
    mustPopulatedPct: (100 * rs.filter((r) => r.must > 0).length) / n,
    avgCoverage: cov.length
      ? cov.reduce((a, r) => a + r.coverage, 0) / cov.length
      : null,
    langInSkills: rs.reduce((a, r) => a + r.langInSkills, 0),
    avgPromptTok: avg((r) => r.promptTokens),
    avgComplTok: avg((r) => r.completionTokens),
    avgCost: avg((r) => r.cost),
    totalCost: rs.reduce((a, r) => a + r.cost, 0),
  };
}

// English must-have sanity check — focused report, gpt-4o-mini only.
if (ENGLISH) {
  const s = summarize("gpt-4o-mini");
  const em: string[] = [];
  em.push("## English must-have sanity check (v5 prompt, gpt-4o-mini)\n");
  em.push(`Frozen set: 10 clean-English jobs (he_ratio<0.02, md5(id)).\n`);
  em.push("| metric | value |");
  em.push("|---|---|");
  em.push(`| jobs ok / errored | ${s.n} / ${s.errors} |`);
  em.push(
    `| **must-have populated %** | **${s.mustPopulatedPct.toFixed(0)}%** |`,
  );
  em.push(`| avg raw core skills | ${s.avgRawCore.toFixed(1)} |`);
  em.push(`| avg RESOLVED core skills | ${s.avgResolvedCore.toFixed(1)} |`);
  em.push(`| languages-in-skills leaks | ${s.langInSkills} |`);
  em.push("");
  em.push(
    s.mustPopulatedPct >= 40
      ? "→ must-have populates on English. The 0% Hebrew figure is language/model-bound, not a prompt bug — proceed with routing as planned."
      : "→ must-have ALSO ~empty on English — the field is prompt-bound, not language-bound. Report options before the pass (prompt fix vs 5.4-mini corpus-wide); do NOT run a pass that leaves must-have empty on most jobs.",
  );
  console.log("\n" + em.join("\n") + "\n");
  Deno.exit(0);
}

const md: string[] = [];
md.push("## 30-job Hebrew bake-off — results\n");
md.push(
  `Frozen set: 30 Hebrew-dominant jobs (is_active, desc≥200, he_ratio≥0.10, order by md5(id)).\n`,
);
md.push("| metric | gpt-4o-mini (baseline) | gpt-5.4-mini (candidate) |");
md.push("|---|---|---|");
const A = summarize("gpt-4o-mini"),
  B = summarize("gpt-5.4-mini");
const row = (label: string, f: (s: any) => string) =>
  md.push(`| ${label} | ${f(A)} | ${f(B)} |`);
row("jobs ok / errored", (s) => `${s.n} / ${s.errors}`);
row("avg raw core skills", (s) => s.avgRawCore.toFixed(1));
row("avg RESOLVED core skills", (s) => s.avgResolvedCore.toFixed(1));
row("zero-resolved-core %", (s) => s.zeroCorePct.toFixed(0) + "%");
row("must-have populated %", (s) => s.mustPopulatedPct.toFixed(0) + "%");
row("avg coverage ratio", (s) =>
  s.avgCoverage == null ? "—" : s.avgCoverage.toFixed(2),
);
row("languages-in-skills leaks", (s) => String(s.langInSkills));
row(
  "avg prompt / completion tok",
  (s) => `${Math.round(s.avgPromptTok)} / ${Math.round(s.avgComplTok)}`,
);
row("avg $/job (observed)", (s) => "$" + s.avgCost.toFixed(5));
md.push("");
md.push(
  `Rates: gpt-4o-mini $${RATES["gpt-4o-mini"].in}/$${RATES["gpt-4o-mini"].out} per 1M (authoritative); ` +
    `gpt-5.4-mini $${RATES["gpt-5.4-mini"].in}/$${RATES["gpt-5.4-mini"].out} per 1M (both verified against current OpenAI pricing).`,
);
md.push("");
md.push("### Full-pass projection (6,096 jobs; 1,470 Hebrew / 4,626 English)");
md.push(
  `- Routing OFF (all 4o-mini): 6096 × $${A.avgCost.toFixed(5)} ≈ **$${(6096 * A.avgCost).toFixed(2)}**`,
);
md.push(
  `- Routing ON: 4626 × $${A.avgCost.toFixed(5)} + 1470 × $${B.avgCost.toFixed(5)} ≈ ` +
    `**$${(4626 * A.avgCost + 1470 * B.avgCost).toFixed(2)}** (Hebrew arm $${(1470 * B.avgCost).toFixed(2)})`,
);

console.log("\n" + md.join("\n") + "\n");
