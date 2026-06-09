// scripts/test-cv-authoring-diff.ts
//
// Validation harness for Option A CV-authoring changes (responsibilities-as-primary,
// bullet-per-line cap, numeric carry-through, sparse-profile fallback).
//
// The script pulls a real pilot user's experiences/projects/proof_signals via
// service-role Supabase, then calls OpenAI twice for that user — once with the
// OLD prompt (current production behaviour), once with the NEW prompt (this
// branch's behaviour). It prints the authored bullets side-by-side so we can
// confirm:
//   - bullet counts rise when source has >4 responsibilities
//   - numbers in responsibilities text carry through verbatim
//   - zero-experience users get a non-empty CV via academic_projects + proof_signals
//
// This is a FOCUSED harness, not a full replay of generate-tailored-cv. It uses
// a stripped-down system prompt that exercises only the four changes — adding
// JD keywords, role-library context, etc. would conflate the diff. We're
// isolating the prompt change as the single variable.
//
// Usage:
//   SUPABASE_URL=https://ilmqmodklutztuybsvwd.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   OPENAI_API_KEY=... \
//     npx tsx scripts/test-cv-authoring-diff.ts \
//       --emails=michael@sobol.cc,matiborlak@gmail.com,gavibook@gmail.com,nevo.liani@gmail.com \
//       --out=/tmp/cv-diff-report.md
//
// Model is locked to gpt-4o to mirror production (generate-tailored-cv/index.ts:30).
// A diff on gpt-4o-mini would be meaningless — prompt changes interact with the
// model's instruction-following discipline, which differs between -mini and -4o.
//
// Cost: gpt-4o is ~$0.05 per CV-authoring call (~2.2k in + ~1.5k out at $2.50/$10 per M).
// The 4-user × 2-prompt run is roughly $0.40 total.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE || !OPENAI_API_KEY) {
  console.error("ERROR: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (n: string, d = ""): string =>
  args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const EMAILS = arg("emails", "michael@sobol.cc,matiborlak@gmail.com,gavibook@gmail.com,nevo.liani@gmail.com")
  .split(",").map((s) => s.trim()).filter(Boolean);
const OUT = arg("out", "/tmp/cv-diff-report.md");
const TARGET_ROLE = arg("role", "Customer Success Specialist");
// Mirrors generate-tailored-cv/index.ts:30 — production CV authoring uses gpt-4o,
// NOT -mini. A diff on -mini would be meaningless because instruction-following
// behaviour differs between the two and Option A's rules are instruction-heavy.
const MODEL = "gpt-4o";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ─── Stripped-down prompt fragments — each prompt picks one "bullet-policy"
// fragment, holds everything else constant. This isolates the diff. ───

const TRUTHFULNESS_CORE = `TRUTHFULNESS — these override all other rules:
- NEVER invent metrics, numbers, percentages, durations, team sizes, dollar amounts, dates, company names, or tools that aren't EXPLICITLY in the user's source data.
- NEVER add skills, tools, certifications, or experiences the user doesn't have in the source.
- Use EXACT job titles and company names from the source.`;

const VOICE_CORE = `WRITING VOICE:
- Action verbs that picture a real action ("Built", "Migrated", "Negotiated", "Reduced") — not category verbs ("leveraged", "drove growth").
- 14-22 words per bullet. No filler.
- Numbers belong in bullets when they exist in the source data. Round numbers that look invented are worse than no numbers.`;

// OLD policy — current production behaviour (the 2-4 cap, story-first precedence,
// metrics only verbatim for stories).
const OLD_BULLET_POLICY = `BULLET POLICY (current production behaviour):
- Professional experiences: 2-4 bullets per role. Pick the number based on richness of the source: a role with one short responsibility line gets 2 bullets; a role with multiple stories + named tools + measured outcomes gets 4.
- Hard ceiling: 5 bullets per experience.
- SOURCE PRECEDENCE: when stories[] contains a story whose experience_label matches an experience AND a JD requirement, PREFER the story's result + metrics + tools_used over the experience's freeform responsibilities text. Otherwise use the responsibilities text.
- VERBATIM METRICS (stories only): every entry from a matched story's metrics[] array must appear in a bullet WORD-FOR-WORD. Numbers in responsibilities text may be rephrased.`;

// NEW policy — Option A (one-per-line, responsibilities primary, numeric
// carry-through for responsibilities + stories, sparse fallback).
const NEW_BULLET_POLICY = `BULLET POLICY (Option A):
- Professional experiences: ONE bullet per distinct responsibility line in the source, capped at 6. If the user wrote 5 responsibility lines, emit 5 bullets — do not compress to 3. If 1 short line, emit 1-2 bullets (split a compound responsibility if needed; do not invent). Faithfulness over compression. Drop the LEAST JD-relevant line only if you hit the 6-bullet ceiling.
- SOURCE PRECEDENCE — RESPONSIBILITIES FIRST: experience.responsibilities is the PRIMARY source. Stories are OPTIONAL ENRICHMENT — they may contribute a metric or named tool the responsibility omits, but never replace a responsibility line. Source ranking: responsibilities > proof_signals (enrichment) > stories (enrichment).
- VERBATIM METRICS (responsibilities AND stories): every number in the responsibilities text — counts, percentages, currency, durations, team sizes, volumes — MUST appear in a bullet for that experience. Rephrasing applies to verbs and structure, NOT to the numbers themselves. If a single bullet can't carry all numbers, distribute across multiple bullets for the same experience.
- SPARSE-PROFILE FALLBACK: when professional_experiences[] is empty or contains only a short single entry, the About Me must anchor on education + draw 2-3 specific claims from proof_signals. Render up to 4 academic_projects per education entry (cap rises from 2 to 4). Surface every project. Skills section carries the relevance signal.`;

const buildSystemPrompt = (policyBlock: string) => `You are writing a tailored resume for a candidate applying to "${TARGET_ROLE}".

${TRUTHFULNESS_CORE}

${VOICE_CORE}

${policyBlock}

Return JSON only, exactly this shape:
{
  "about_me": "string — 2-4 sentences grounded in USER DATA",
  "professional_experiences": [
    { "title": "string", "company": "string", "dates": "string", "bullets": ["string", ...] }
  ],
  "academic_projects": [
    { "name": "string", "description": "string" }
  ],
  "projects": [
    { "name": "string", "bullets": ["string", ...] }
  ],
  "skills": ["string", ...]
}`;

interface UserContext {
  email: string;
  full_name: string;
  profile_summary: string;
  professional_experiences: Array<{
    title: string;
    company: string;
    dates: string;
    responsibilities: string;
    skills: string[];
  }>;
  projects: Array<{ name: string; description: string; skills: string[] }>;
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    academic_projects: string[];
  }>;
  proof_signals: any[];
  skills: string[];
}

// PostgREST refuses to expose the `auth` schema even with service-role auth,
// so .schema('auth').from('users') errors with "Invalid schema: auth". Cache
// the listUsers() result across diffOne() calls — single GoTrue page covers
// the ~30 pilot users without issue.
let _userIndex: Map<string, string> | null = null;
async function userIdByEmail(email: string): Promise<string | null> {
  if (!_userIndex) {
    _userIndex = new Map();
    let page = 1;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);
      for (const u of data.users) {
        if (u.email) _userIndex.set(u.email.trim().toLowerCase(), u.id);
      }
      if (data.users.length < 1000) break;
      page++;
    }
  }
  return _userIndex.get(email.trim().toLowerCase()) ?? null;
}

async function loadUser(email: string): Promise<UserContext | null> {
  const userId = await userIdByEmail(email);
  if (!userId) {
    console.error(`  could not resolve ${email}: not found in auth.users`);
    return null;
  }

  const [pRes, eRes, prRes, edRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("experiences").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId),
    supabase.from("education").select("*").eq("user_id", userId).order("display_order", { ascending: true }),
  ]);

  const p = pRes.data as any;
  if (!p) return null;

  const fmtDates = (e: any): string => {
    const s = String(e?.start_date ?? "").slice(0, 20);
    const en = e?.is_current ? "Present" : String(e?.end_date ?? "").slice(0, 20);
    if (!s && !en) return "";
    return `${s}${en ? ` – ${en}` : ""}`;
  };

  return {
    email,
    full_name: p.full_name ?? "",
    profile_summary: p.summary ?? "",
    professional_experiences: (eRes.data || []).map((e: any) => ({
      title: String(e.title || "").slice(0, 100),
      company: String(e.company || "").slice(0, 100),
      dates: fmtDates(e),
      responsibilities: String(e.responsibilities || "").slice(0, 4000),
      skills: Array.isArray(e.skills) ? e.skills.slice(0, 40).map((s: any) => String(s).slice(0, 60)) : [],
    })),
    projects: (prRes.data || []).map((pr: any) => ({
      name: String(pr.name || "").slice(0, 100),
      description: String(pr.description || "").slice(0, 500),
      skills: Array.isArray(pr.skills) ? pr.skills.slice(0, 20).map((s: any) => String(s).slice(0, 60)) : [],
    })),
    education: (edRes.data || []).map((e: any) => ({
      institution: String(e.institution || "").slice(0, 200),
      degree: String(e.degree_type || "").slice(0, 100),
      field_of_study: String(e.field_of_study || "").slice(0, 100),
      academic_projects: Array.isArray(e.academic_projects)
        ? e.academic_projects.slice(0, 10).map((x: any) => String(x).slice(0, 200))
        : [],
    })),
    proof_signals: Array.isArray(p.proof_signals) ? p.proof_signals.slice(0, 20) : [],
    skills: Array.isArray(p.skills) ? p.skills.slice(0, 50).map((s: any) => String(s).slice(0, 60)) : [],
  };
}

async function callOpenAI(systemPrompt: string, userContent: string): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 2200,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  try {
    return JSON.parse(j.choices?.[0]?.message?.content || "{}");
  } catch (e) {
    console.warn("  could not parse OpenAI JSON:", e);
    return {};
  }
}

function formatUserPayload(u: UserContext): string {
  return JSON.stringify({
    target_role: TARGET_ROLE,
    candidate: {
      full_name: u.full_name,
      summary: u.profile_summary,
      skills: u.skills,
    },
    professional_experiences: u.professional_experiences,
    education: u.education,
    projects: u.projects,
    proof_signals: u.proof_signals,
    stories: [], // empty for all 19 pilot users
  }, null, 2);
}

function countNumbersInText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(
    /\b\d+(?:[\.,]\d+)?\s*%|\$\s*\d+(?:[\.,]\d+)?\s*[MmKkBb]?|\b\d+\s*(?:k|K|M|B|m)\b|\b\d+(?:[\.,]\d+)?\s*(?:years?|months?|weeks?|days?|hours?|quarters?|Q[1-4]|FY|people|employees|team\s*members?|customers?|users?|students?|accounts?|projects?|deals?|leads?|interviews?|hires?|countries|cities|stores|stakeholders?)\b/gi
  ) || [];
  return Array.from(new Set(matches.map((m) => m.trim())));
}

function bulletsContainNumber(bullets: string[], num: string): boolean {
  const blob = bullets.join(" \n ").toLowerCase();
  return blob.includes(num.toLowerCase());
}

interface CompareReport {
  email: string;
  full_name: string;
  source: {
    exp_count: number;
    project_count: number;
    proof_signal_count: number;
    education_count: number;
    source_numbers: Record<string, string[]>; // per-experience numbers
  };
  before: {
    bullet_counts: Record<string, number>;
    bullets: any;
    numbers_carried: Record<string, { found: string[]; missing: string[] }>;
  };
  after: {
    bullet_counts: Record<string, number>;
    bullets: any;
    numbers_carried: Record<string, { found: string[]; missing: string[] }>;
  };
}

async function diffOne(email: string): Promise<CompareReport | null> {
  console.error(`\n=== ${email} ===`);
  const u = await loadUser(email);
  if (!u) return null;
  console.error(`  ${u.full_name}: ${u.professional_experiences.length} exp / ${u.projects.length} projects / ${u.proof_signals.length} proof_signals / ${u.education.length} edu`);

  const userPayload = formatUserPayload(u);
  // Per-experience source numbers (the bar the after-prompt should clear).
  const sourceNumbers: Record<string, string[]> = {};
  for (const exp of u.professional_experiences) {
    const key = `${exp.title} @ ${exp.company}`;
    const nums = countNumbersInText(exp.responsibilities);
    if (nums.length > 0) sourceNumbers[key] = nums;
  }

  console.error("  calling OpenAI for OLD prompt…");
  const beforeCV = await callOpenAI(buildSystemPrompt(OLD_BULLET_POLICY), userPayload);
  console.error("  calling OpenAI for NEW prompt…");
  const afterCV = await callOpenAI(buildSystemPrompt(NEW_BULLET_POLICY), userPayload);

  const summariseBullets = (cv: any) => {
    const out: Record<string, number> = {};
    const numCheck: Record<string, { found: string[]; missing: string[] }> = {};
    for (const exp of (cv?.professional_experiences ?? [])) {
      const key = `${exp.title} @ ${exp.company}`;
      out[key] = Array.isArray(exp.bullets) ? exp.bullets.length : 0;
      const need = sourceNumbers[key] || [];
      const found: string[] = [];
      const missing: string[] = [];
      for (const n of need) {
        if (bulletsContainNumber(exp.bullets || [], n)) found.push(n);
        else missing.push(n);
      }
      if (need.length > 0) numCheck[key] = { found, missing };
    }
    if (Array.isArray(cv?.academic_projects)) out["academic_projects[]"] = cv.academic_projects.length;
    if (Array.isArray(cv?.projects)) {
      let total = 0;
      for (const p of cv.projects) total += Array.isArray(p.bullets) ? p.bullets.length : 0;
      out["projects[*].bullets"] = total;
    }
    return { counts: out, numCheck };
  };

  const bSum = summariseBullets(beforeCV);
  const aSum = summariseBullets(afterCV);

  return {
    email,
    full_name: u.full_name,
    source: {
      exp_count: u.professional_experiences.length,
      project_count: u.projects.length,
      proof_signal_count: u.proof_signals.length,
      education_count: u.education.length,
      source_numbers: sourceNumbers,
    },
    before: { bullet_counts: bSum.counts, bullets: beforeCV, numbers_carried: bSum.numCheck },
    after: { bullet_counts: aSum.counts, bullets: afterCV, numbers_carried: aSum.numCheck },
  };
}

function renderMarkdownReport(reports: CompareReport[]): string {
  const lines: string[] = [];
  lines.push("# CV authoring diff — Option A");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Model: ${MODEL}`);
  lines.push(`Target role for tailoring: "${TARGET_ROLE}"`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| User | Exp | Projects | Proof Signals | Old bullets total | New bullets total | Old numbers carried | New numbers carried |");
  lines.push("|---|---:|---:|---:|---:|---:|---|---|");
  for (const r of reports) {
    const oldTotal = Object.entries(r.before.bullet_counts).filter(([k]) => k.includes(" @ ")).reduce((a, [, v]) => a + v, 0);
    const newTotal = Object.entries(r.after.bullet_counts).filter(([k]) => k.includes(" @ ")).reduce((a, [, v]) => a + v, 0);
    const oldFnd = Object.values(r.before.numbers_carried).reduce((a, v) => a + v.found.length, 0);
    const oldMis = Object.values(r.before.numbers_carried).reduce((a, v) => a + v.missing.length, 0);
    const newFnd = Object.values(r.after.numbers_carried).reduce((a, v) => a + v.found.length, 0);
    const newMis = Object.values(r.after.numbers_carried).reduce((a, v) => a + v.missing.length, 0);
    lines.push(`| ${r.full_name} (${r.email}) | ${r.source.exp_count} | ${r.source.project_count} | ${r.source.proof_signal_count} | ${oldTotal} | ${newTotal} | ${oldFnd}/${oldFnd + oldMis} | ${newFnd}/${newFnd + newMis} |`);
  }
  lines.push("");

  for (const r of reports) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${r.full_name} — ${r.email}`);
    lines.push(`Source: ${r.source.exp_count} experiences, ${r.source.project_count} projects, ${r.source.proof_signal_count} proof_signals, ${r.source.education_count} education entries.`);
    lines.push("");

    if (Object.keys(r.source.source_numbers).length > 0) {
      lines.push("### Numbers present in source responsibilities (the carry-through target)");
      lines.push("");
      for (const [key, nums] of Object.entries(r.source.source_numbers)) {
        lines.push(`- **${key}**: ${nums.join(" · ")}`);
      }
      lines.push("");
    } else {
      lines.push("_No numeric values detected in source responsibilities (or no professional experiences)._");
      lines.push("");
    }

    const expKeys = Array.from(new Set([
      ...Object.keys(r.before.bullet_counts).filter((k) => k.includes(" @ ")),
      ...Object.keys(r.after.bullet_counts).filter((k) => k.includes(" @ ")),
    ]));

    for (const key of expKeys) {
      lines.push(`### ${key}`);
      lines.push("");
      const bExp = (r.before.bullets?.professional_experiences || []).find((e: any) => `${e.title} @ ${e.company}` === key);
      const aExp = (r.after.bullets?.professional_experiences || []).find((e: any) => `${e.title} @ ${e.company}` === key);
      const oldBullets = bExp?.bullets || [];
      const newBullets = aExp?.bullets || [];
      const oldNC = r.before.numbers_carried[key];
      const newNC = r.after.numbers_carried[key];

      lines.push(`**BEFORE** — ${oldBullets.length} bullets${oldNC ? ` · numbers carried ${oldNC.found.length}/${oldNC.found.length + oldNC.missing.length}` : ""}${oldNC?.missing.length ? ` · MISSING: ${oldNC.missing.join(", ")}` : ""}`);
      lines.push("");
      for (const b of oldBullets) lines.push(`- ${b}`);
      lines.push("");

      lines.push(`**AFTER** — ${newBullets.length} bullets${newNC ? ` · numbers carried ${newNC.found.length}/${newNC.found.length + newNC.missing.length}` : ""}${newNC?.missing.length ? ` · MISSING: ${newNC.missing.join(", ")}` : ""}`);
      lines.push("");
      for (const b of newBullets) lines.push(`- ${b}`);
      lines.push("");
    }

    // Sparse-profile fallback evidence (academic_projects + projects buckets).
    const oldAP = r.before.bullet_counts["academic_projects[]"] ?? 0;
    const newAP = r.after.bullet_counts["academic_projects[]"] ?? 0;
    const oldPB = r.before.bullet_counts["projects[*].bullets"] ?? 0;
    const newPB = r.after.bullet_counts["projects[*].bullets"] ?? 0;
    if (r.source.exp_count === 0 || (oldAP + newAP + oldPB + newPB > 0)) {
      lines.push("### Fallback bucket (sparse-profile path)");
      lines.push("");
      lines.push(`- Academic projects: BEFORE ${oldAP} / AFTER ${newAP}`);
      lines.push(`- Project bullets total: BEFORE ${oldPB} / AFTER ${newPB}`);
      lines.push("");
      const aboutBefore = String(r.before.bullets?.about_me || "").trim();
      const aboutAfter = String(r.after.bullets?.about_me || "").trim();
      if (aboutBefore) lines.push(`**Before About Me:** ${aboutBefore}`);
      lines.push("");
      if (aboutAfter) lines.push(`**After About Me:** ${aboutAfter}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  const reports: CompareReport[] = [];
  for (const email of EMAILS) {
    try {
      const r = await diffOne(email);
      if (r) reports.push(r);
    } catch (e) {
      console.error(`  FATAL for ${email}:`, e instanceof Error ? e.message : e);
    }
  }
  const md = renderMarkdownReport(reports);
  writeFileSync(OUT, md);
  console.error(`\nWrote ${OUT} (${reports.length} users compared).`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
