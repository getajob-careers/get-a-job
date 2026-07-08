// refine-cv — per-job CV by SELECTING from the user's master reservoir instead
// of authoring from scratch (Phase 2.1). The from-scratch generate-tailored-cv
// path is untouched; this is a separate, opt-in function (no call-site wiring,
// no flag yet — that's a later step).
//
// Flow: auth → load application + profile → lazy-load master (author it once via
// the deployed master mode if absent) → extract JD keywords → ops LLM (emits
// select/reword/summary/skills ops, never a full CV) → server assembly from the
// master text → anti-fab reword gate (tokens must trace to the master) →
// coverage scorer (+1 retry) → render PDF → persist a NON-master application_cvs
// row + the applications pointer.
//
// Reuse: buildCvPdf / resolveSectorTheme / openrouter-openai-chat / metrics /
// json-parse / voice-rules / strip-html are imported from _shared. extractJDKeywords,
// the coverage scorer, and the quantified-token anti-fab primitives are COPIED
// verbatim from generate-tailored-cv (that file must stay untouched, and they
// aren't exported).
//
// Direct-invoke shape (authenticated AS the target user — mint a JWT):
//   POST /functions/v1/refine-cv
//   { "application_id": "<uuid of an owned application with a JD>",
//     "job_description": "<the JD text>", "cv_model": "sonnet" }

import { createClient } from "npm:@supabase/supabase-js@2";
import { startMetric, finishMetric, type Metric } from "../_shared/metrics.ts";
import { openaiChatCompletionWithRetry } from "../_shared/openai-chat.ts";
import { openrouterChatCompletionWithRetry } from "../_shared/openrouter-chat.ts";
import {
  cvHasHebrew,
  translateCvToEnglish,
  type ChatMessage,
} from "../_shared/cv-translate.ts";
import { stripHtml } from "../_shared/strip-html.ts";
import { buildCvPdf } from "../_shared/cv-templates/build-pdf.ts";
import { buildMasterCvData } from "../_shared/cv-master.ts";
import { enforceCvInvariants } from "../_shared/cv-enforce-invariants.ts";
import { resolveSectorTheme } from "../_shared/cv-templates/sector-mapping.ts";
import type {
  TemplateStyle,
  SectionKey,
} from "../_shared/cv-templates/types.ts";
import { parseLlmJsonObject } from "../_shared/json-parse.ts";
import { summaryTokensClean } from "../_shared/cv-antifab.ts";
import { resolveBullets } from "./reword.ts";
import { roleLibrary } from "../_shared/libraries/00_role_library.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const MODEL = "gpt-4o"; // JD keyword extraction (same as from-scratch pass 1)
const SONNET_OPENROUTER_SLUG = "anthropic/claude-sonnet-4.6";
const SONNET_MODEL_USED = "claude-sonnet-4-6";

// Ops model routing (experiment): cv_model selects the ops LLM, defaulting to
// Sonnet (back-compat). All route through OpenRouter so the transport + retry
// wrapper are unchanged — the ONLY variable is the model. The lazy master author
// (generate-tailored-cv) stays on Sonnet regardless.
const OPS_MODELS: Record<string, { slug: string; used: string }> = {
  sonnet: { slug: SONNET_OPENROUTER_SLUG, used: SONNET_MODEL_USED },
  haiku: { slug: "anthropic/claude-haiku-4.5", used: "claude-haiku-4-5" },
  "gpt-4o-mini": { slug: "openai/gpt-4o-mini", used: "gpt-4o-mini" },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const safeArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);

function parseLlmJson(
  rawContent: string,
  finishReason: string,
  label: string,
): any {
  return parseLlmJsonObject(rawContent, label, finishReason);
}

// ── JD keyword extraction (copied verbatim from generate-tailored-cv) ─────────
type JDKeywords = {
  must_include_phrases: string[];
  action_verbs: string[];
  tools_and_platforms: string[];
  domain_terms: string[];
  soft_skill_keywords: string[];
};

async function extractJDKeywords(
  jd: string,
  openaiKey: string,
  m: Metric | undefined,
  traceCtx: { userId: string; sessionId: string },
): Promise<JDKeywords> {
  const empty: JDKeywords = {
    must_include_phrases: [],
    action_verbs: [],
    tools_and_platforms: [],
    domain_terms: [],
    soft_skill_keywords: [],
  };
  try {
    const response = await openaiChatCompletionWithRetry(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an ATS keyword extraction specialist. Extract the most important keywords and phrases from job descriptions that should appear in a tailored CV. Return JSON only, no markdown.",
          },
          {
            role: "user",
            content: `Extract keywords from this job description. Return JSON with these exact fields:
- must_include_phrases: 8-12 exact multi-word phrases from the JD that are core to the role (e.g. "operational excellence", "adoption dashboards", "GTM initiatives")
- action_verbs: 5-8 action verbs the JD uses (e.g. "own", "lead", "collaborate", "monitor")
- tools_and_platforms: all specific tools, platforms, technologies mentioned (e.g. "Data Cloud", "Tableau", "Agentforce")
- domain_terms: 5-8 domain/industry terms (e.g. "marketing analytics", "martech", "customer signals")
- soft_skill_keywords: 3-5 soft skill phrases (e.g. "cross-functional", "stakeholder management")

JOB DESCRIPTION:
${jd}`,
          },
        ],
      },
      openaiKey,
      {
        traceName: "refine-cv:keywords",
        userId: traceCtx.userId,
        sessionId: traceCtx.sessionId,
      },
      { signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok) return empty;
    const data = await response.json();
    if (m) {
      m.tokensIn = (m.tokensIn ?? 0) + (data.usage?.prompt_tokens ?? 0);
      m.tokensOut = (m.tokensOut ?? 0) + (data.usage?.completion_tokens ?? 0);
    }
    const raw = data.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<JDKeywords>;
    const jdLower = String(jd ?? "").toLowerCase();
    const grounded = (arr: unknown, max: number, strict = true): string[] => {
      if (!Array.isArray(arr)) return [];
      const out: string[] = [];
      for (const item of arr) {
        const s = String(item).trim();
        if (!s) continue;
        if (strict && !jdLower.includes(s.toLowerCase())) continue;
        out.push(s);
        if (out.length >= max) break;
      }
      return out;
    };
    return {
      must_include_phrases: grounded(parsed.must_include_phrases, 15),
      action_verbs: grounded(parsed.action_verbs, 10),
      tools_and_platforms: grounded(parsed.tools_and_platforms, 20),
      domain_terms: grounded(parsed.domain_terms, 10),
      soft_skill_keywords: grounded(parsed.soft_skill_keywords, 8, false),
    };
  } catch (err) {
    console.warn(
      "[refine] JD keyword extraction failed:",
      err instanceof Error ? err.message : err,
    );
    return empty;
  }
}

// ── Coverage scorer (copied verbatim from generate-tailored-cv) ───────────────
const KEYWORD_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "as",
  "is",
  "are",
  "be",
  "been",
  "into",
  "over",
  "through",
  "across",
  "from",
  "up",
  "out",
  "via",
]);
const tokenizePhrase = (s: string): string[] =>
  String(s)
    .toLowerCase()
    .split(/[\s\-_,.:;!?()\[\]\/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !KEYWORD_STOPWORDS.has(t));
const MATCH_WINDOW = 200;
const phraseMatchesProximity = (phrase: string, cvLower: string): boolean => {
  const tokens = tokenizePhrase(phrase);
  if (tokens.length === 0) return false;
  const required = tokens.length <= 3 ? tokens.length : tokens.length - 1;
  const positions: number[][] = tokens.map((tok) => {
    const out: number[] = [];
    let idx = 0;
    while ((idx = cvLower.indexOf(tok, idx)) !== -1) {
      out.push(idx);
      idx += tok.length;
    }
    return out;
  });
  const presentTokens = positions.filter((p) => p.length > 0).length;
  if (presentTokens < required) return false;
  for (let anchorTokIdx = 0; anchorTokIdx < positions.length; anchorTokIdx++) {
    for (const anchorPos of positions[anchorTokIdx]) {
      let inWindow = 1;
      for (let otherIdx = 0; otherIdx < positions.length; otherIdx++) {
        if (otherIdx === anchorTokIdx) continue;
        if (
          positions[otherIdx].some(
            (p) => Math.abs(p - anchorPos) <= MATCH_WINDOW,
          )
        )
          inWindow++;
      }
      if (inWindow >= required) return true;
    }
  }
  return false;
};
function scoreCoverage(
  cvData: unknown,
  mustInclude: string[],
): {
  tailoring_score: number;
  matched_phrases: string[];
  missed_phrases: string[];
} {
  if (!mustInclude.length)
    return { tailoring_score: 0, matched_phrases: [], missed_phrases: [] };
  const cvTextLower = JSON.stringify(cvData).toLowerCase();
  const matched: string[] = [];
  const missed: string[] = [];
  for (const phrase of mustInclude) {
    const phraseLower = String(phrase).toLowerCase();
    if (
      cvTextLower.includes(phraseLower) ||
      phraseMatchesProximity(phrase, cvTextLower)
    )
      matched.push(phrase);
    else missed.push(phrase);
  }
  return {
    tailoring_score: Math.round((matched.length / mustInclude.length) * 100),
    matched_phrases: matched,
    missed_phrases: missed,
  };
}

// ── Master → addressable view + assembly ──────────────────────────────────────
const EXP_BUCKETS: { key: string; org: string }[] = [
  { key: "professional_experiences", org: "company" },
  { key: "military_experiences", org: "unit" },
  { key: "volunteering_experiences", org: "organization" },
  { key: "leadership_experiences", org: "organization" },
];

// Build the addressable view the ops LLM sees: each experience keeps its
// experience_id (stamped by Phase 2.0) and each bullet gets a derived
// bullet_id = `${experience_id}#${index}` (the master stores bare strings).
function masterView(master: any) {
  const experiences: any[] = [];
  for (const { key, org } of EXP_BUCKETS) {
    for (const e of safeArray(master?.[key])) {
      const id = e?.experience_id;
      if (!id) continue; // no addressability → can't be targeted; skip from the view
      experiences.push({
        experience_id: String(id),
        section: key,
        title: e?.title || "",
        org: e?.[org] || "",
        dates: e?.dates || "",
        bullets: safeArray(e?.bullets).map((b: any, i: number) => ({
          bullet_id: `${id}#${i}`,
          text: String(b ?? ""),
        })),
      });
    }
  }
  return {
    summary: master?.summary || "",
    skills: master?.skills || {},
    experiences,
  };
}

type Ops = {
  rewordings: { bullet_id: string; new_text: string }[];
  summary: string;
  skills_emphasis: string[];
};

function parseOps(raw: any): Ops {
  return {
    rewordings: safeArray(raw?.rewordings)
      .filter(
        (r: any) =>
          r &&
          typeof r.bullet_id === "string" &&
          typeof r.new_text === "string",
      )
      .map((r: any) => ({
        bullet_id: String(r.bullet_id),
        new_text: String(r.new_text).slice(0, 600),
      }))
      .slice(0, 4), // Phase 2.1: hard cap 4 rewordings (the main output-token lever)
    summary: typeof raw?.summary === "string" ? raw.summary.slice(0, 1500) : "",
    skills_emphasis: safeArray(raw?.skills_emphasis)
      .map((x: any) => String(x))
      .slice(0, 8), // Phase 2.1: cap ~8
  };
}

// Assemble the one-page job cv_data from master + ops, applying the anti-fab
// reword gate. Returns the assembled cv_data + a count of rejected rewordings.
function assembleJobCv(
  master: any,
  ops: Ops,
  summaryJdHaystack: string,
): { cv: any; rejectedRewordings: number } {
  // rewordings indexed by bullet_id
  const rewordById = new Map(
    ops.rewordings.map((r) => [r.bullet_id, r.new_text]),
  );
  let rejectedRewordings = 0;

  // start from a shallow clone of the master so untouched sections carry over verbatim
  const cv: any = { ...master };

  // EVERY experience carries through — tailoring REFRAMES, it never drops. Each
  // experience keeps ALL its bullets; a bullet is reworded toward the JD only
  // where the ops step provided a (gate-passing) rewording, else stays verbatim.
  // One-page fit is the renderer's job (uniform scale-to-fit) — never cut here.
  for (const { key, org } of EXP_BUCKETS) {
    const out: any[] = [];
    for (const e of safeArray(master?.[key])) {
      // experience_id may be absent (unstamped master row); the experience still
      // carries through — it just can't be targeted for rewording (bullets stay
      // verbatim). Never dropped for lacking a stamp.
      const expId = e?.experience_id ? String(e.experience_id) : null;
      const masterBullets = safeArray(e?.bullets).map((b: any) =>
        String(b ?? ""),
      );
      const expHaystack = [e?.title, e?.[org], ...masterBullets]
        .join(" \n ")
        .toLowerCase();
      // Reword each bullet toward the JD where a real, gate-passing replacement
      // exists; a missing, degenerate (punctuation-only), or anti-fab-failing
      // reword keeps the ORIGINAL bullet whole. See reword.ts.
      const resolved = resolveBullets(
        masterBullets,
        expId,
        rewordById,
        expHaystack,
      );
      const bullets = resolved.bullets;
      rejectedRewordings += resolved.rejected;
      const entry: any = {
        title: e?.title || "",
        dates: e?.dates || "",
        bullets,
      };
      if (expId) entry.experience_id = expId;
      entry[org] = e?.[org] || "";
      out.push(entry);
    }
    cv[key] = out;
  }

  // Summary: numbers must trace to the master (strict); proper-noun JD framing
  // (e.g. "GTM") may come from the JD keyword set — so a tailored summary lands
  // instead of falling back to the JD-agnostic master. See summaryTokensClean.
  const masterHaystack = JSON.stringify(master).toLowerCase();
  if (
    ops.summary &&
    summaryTokensClean(ops.summary, masterHaystack, summaryJdHaystack)
  )
    cv.summary = ops.summary;
  else cv.summary = master?.summary || "";

  // Skills emphasis: reorder the master's existing skills (emphasized first).
  // Only master skills survive — skills_emphasis cannot introduce new skills.
  const emph = ops.skills_emphasis.map((s) => s.toLowerCase());
  const reorder = (arr: any[]) => {
    const a = safeArray(arr).map((s: any) => String(s));
    return [...a].sort((x, y) => {
      const ix = emph.indexOf(x.toLowerCase());
      const iy = emph.indexOf(y.toLowerCase());
      if (ix === -1 && iy === -1) return 0;
      if (ix === -1) return 1;
      if (iy === -1) return -1;
      return ix - iy;
    });
  };
  if (master?.skills) {
    cv.skills = {
      ...master.skills,
      domain: reorder(master.skills.domain),
      tools: reorder(master.skills.tools),
      technical: reorder(master.skills.technical),
    };
  }
  // header / education / languages / honors_and_awards / certifications / projects
  // / fit_analysis carry over verbatim from the master clone above (not invented).
  return { cv, rejectedRewordings };
}

const OPS_SYSTEM_PROMPT = `You are a CV REFINER. You receive a user's MASTER CV — the complete, already-verified reservoir of their real experience — and a target job. You do NOT write a CV, and you do NOT choose which experiences to include: EVERY experience in the master is always kept. Your only job is to REFRAME the user's real experience toward this job — reword bullets to surface the job's keywords (truthfully), and write a JD-framed summary and skills emphasis.

Emit ONLY this JSON (no prose, no markdown):
{
  "rewordings": [ { "bullet_id": "<experience_id>#<n>", "new_text": "..." } ],
  "summary": "...",
  "skills_emphasis": ["<skill from master>", ...]
}

NEVER OMIT AN EXPERIENCE — this is the core rule:
- Every professional, military, volunteering, and leadership experience in the master is included in the output, regardless of how well it matches the JD. You do NOT select, rank, or drop experiences, and you do NOT cut bullets to fit a length target. A weak keyword match is a REFRAMING task (reword the bullet toward the JD's language), NEVER a reason to drop a job or a bullet. One-page length is handled downstream by the renderer — never trim to fit.

REWORDINGS — reframe bullets toward the JD (truthfulness is non-negotiable):
- Reword a bullet ONLY when it is MISSING a must_include JD keyword the user genuinely demonstrated in that same experience, AND rewording would surface that keyword. If a bullet already conveys its JD-relevant content, leave it as-is and emit NO rewording for it — most bullets need none.
- bullet_ids MUST be ids that exist in the MASTER below.
- HARD CAP: at most 4 rewordings total. Choose the 4 that add the most missing-keyword coverage across the most JD-relevant experiences. (Every bullet you do NOT reword is still kept verbatim — the cap limits rewriting, never inclusion.)
- A rewording may only re-phrase; it must NOT introduce any metric, number, percentage, currency, tool, company, or claim that is not already present in that experience's master bullets. If a keyword can't be surfaced truthfully, leave the bullet as-is.

SUMMARY:
- 2-3 sentences. You MAY frame it with the target job's terminology and keywords, but every fact, metric, number, tool, and claim must be grounded in the master. Do not invent.

SKILLS_EMPHASIS:
- Up to 8 skills, taken from the master's skills, ordered most JD-relevant first. Do NOT invent skills.`;

// Ops variant is now INERT. It used to swap a "one-page budget / select 3-5
// experiences, drop the rest" paragraph (the bullet-selection bake-off); that
// whole selection step is gone — refine-cv reframes ALL experience and never
// drops, and one-page fit is the renderer's job. The enum + param are kept only
// so existing callers (studio, extension) that still send ops_variant don't
// break; the value no longer changes the prompt.
type OpsVariant = "current" | "v1" | "v2" | "v3";
const OPS_VARIANTS: readonly OpsVariant[] = ["current", "v1", "v2", "v3"];

// Optional grounding constraint (A/B-testable, OFF by default). When "strict", a
// constraint block is APPENDED to the ops prompt — governing rewordings, the
// summary, and skills_emphasis (NOT the selection step). grounding="default"
// appends nothing, so the prompt stays byte-identical to v8 by construction.
// Like ops_variant, only the enum is honored (refine-cv is verify_jwt=false, so a
// public caller must never be able to inject a prompt).
type Grounding = "default" | "strict";
const GROUNDINGS: readonly Grounding[] = ["default", "strict"];
const GROUNDING_CONSTRAINT = `

GROUNDING — STRICT (applies to rewordings, the summary, and skills_emphasis; NOT to selection):
- When rephrasing, reordering, or summarizing, use only facts and terminology present in the candidate's source material. Do not introduce any tool, technology, programming language, methodology, framework, certification, military unit, job title, company descriptor, or industry or domain label that is not already in the source. Rephrasing an existing fact is allowed; naming something new is not. If the JD calls for a term the candidate lacks, omit it rather than insert it.`;

// Assemble the ops system prompt: the reframe-all OPS_SYSTEM_PROMPT, optionally
// with the strict grounding block appended. opsVariant is inert (no selection
// step to vary); only `grounding` changes the prompt now.
function opsSystemPromptFor(
  _opsVariant: OpsVariant,
  grounding: Grounding,
): string {
  const base = OPS_SYSTEM_PROMPT;
  return grounding === "strict" ? base + GROUNDING_CONSTRAINT : base;
}

async function callOps(
  masterV: any,
  jdKeywords: JDKeywords,
  jdExcerpt: string,
  openrouterKey: string,
  traceCtx: { userId: string; sessionId: string },
  retryHint: string,
  m: Metric,
  opsModel: { slug: string; used: string },
  opsVariant: OpsVariant,
  grounding: Grounding,
): Promise<Ops | null> {
  const userPrompt = `TARGET JOB KEYWORDS:
- must_include_phrases: ${JSON.stringify(jdKeywords.must_include_phrases)}
- action_verbs: ${JSON.stringify(jdKeywords.action_verbs)}
- tools_and_platforms: ${JSON.stringify(jdKeywords.tools_and_platforms)}
- domain_terms: ${JSON.stringify(jdKeywords.domain_terms)}

JOB DESCRIPTION (excerpt, for judging relevance):
${jdExcerpt}

MASTER CV (select from this — every experience_id and bullet_id you emit must exist here):
${JSON.stringify(masterV)}${retryHint}`;
  const payload = {
    model: opsModel.slug,
    messages: [
      { role: "system", content: opsSystemPromptFor(opsVariant, grounding) },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1600,
  };
  const res = await openrouterChatCompletionWithRetry(
    payload,
    openrouterKey,
    {
      traceName: "refine-cv:ops",
      userId: traceCtx.userId,
      sessionId: traceCtx.sessionId,
    },
    { signal: AbortSignal.timeout(60000) },
  );
  if (!res.ok) {
    console.warn("[refine] ops call non-ok:", res.status);
    return null;
  }
  const data = await res.json();
  m.modelUsed = opsModel.used;
  m.tokensIn = (m.tokensIn ?? 0) + (data.usage?.prompt_tokens ?? 0);
  m.tokensOut = (m.tokensOut ?? 0) + (data.usage?.completion_tokens ?? 0);
  try {
    const parsed = parseLlmJson(
      data.choices?.[0]?.message?.content || "",
      String(data.choices?.[0]?.finish_reason || ""),
      "refine-ops",
    );
    return parseOps(parsed);
  } catch (e) {
    console.warn("[refine] ops parse failed:", (e as Error).message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const m = startMetric("refine-cv");
  let _ok = false;
  let _http = 500;
  let _err: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      _http = 401;
      _err = "auth";
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      _http = 401;
      _err = "auth";
      return json({ error: "Unauthorized" }, 401);
    }
    m.userId = user.id;
    const sessionId = `refine-${crypto.randomUUID()}`;
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    if (JSON.stringify(body).length > 200_000) {
      _http = 413;
      _err = "payload_too_large";
      return json({ error: "Payload too large." }, 413);
    }
    const { application_id, job_description, cv_model, disable_retry } = body;
    // CV chokepoint opt-in flag (cv_enforce_v2): default OFF — anything but "on"
    // keeps the exact legacy path. Body flag OR the CV_ENFORCE_V2 env fallback.
    const cvEnforceV2 =
      String(body?.cv_enforce_v2 ?? Deno.env.get("CV_ENFORCE_V2") ?? "")
        .trim().toLowerCase() === "on";
    // Bake-off selection variant. ONLY the enum is honored — refine-cv is
    // verify_jwt=false, so a public caller must never be able to inject a
    // prompt. An unknown/free-form value falls back to "current" (never passed
    // through as text).
    const opsVariant: OpsVariant = (OPS_VARIANTS as readonly string[]).includes(
      body?.ops_variant,
    )
      ? (body.ops_variant as OpsVariant)
      : "current";
    // Grounding constraint (A/B): enum-only, same injection-safety rationale as
    // ops_variant. Unknown/free-form falls back to "default" (byte-identical).
    const grounding: Grounding = (GROUNDINGS as readonly string[]).includes(
      body?.grounding,
    )
      ? (body.grounding as Grounding)
      : "default";
    if (typeof application_id !== "string" || !application_id) {
      _http = 400;
      _err = "missing_input";
      return json({ error: "application_id is required" }, 400);
    }
    // JD resolution with a server-side fallback. The extension proposal-card
    // path sends job_description:"" when the user references a JD from an
    // earlier message (extension/popup.js), even though the JD is stored on
    // the application row. So we defer the empty-JD rejection: parse the body
    // JD here, fall back to the application's stored job_description after the
    // app load below, and only 400 when BOTH are empty (the guardrail there).
    const bodyJd = stripHtml(String(job_description ?? "")) ?? "";
    let safeJobDescription = bodyJd.trim() ? bodyJd.slice(0, 10000) : "";
    const safeTemplateStyle: TemplateStyle = "ats-optimized";
    // ops model routing (experiment): default Sonnet; cv_model can pick a faster model
    const opsModel =
      OPS_MODELS[String(cv_model ?? "").trim()] ?? OPS_MODELS.sonnet;
    // disable_retry (additive, default false = current behavior): when true, run a
    // single ops pass only. Used by the Phase 2.2 re-bake harness so single-pass
    // coverage/latency are clean. Prod callers omit it -> retry behaves as before.
    const disableRetry = disable_retry === true;

    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "refine-cv",
      p_max_calls: 30,
      p_window_seconds: 3600,
    });
    if (!allowed) {
      _http = 429;
      _err = "rate_limit";
      return json({ error: "Rate limit exceeded. Try again in an hour." }, 429);
    }

    // application (ownership + role title for the persist pointer)
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id, role_title, company, job_description")
      .eq("id", application_id)
      .eq("user_id", user.id)
      .single();
    if (appErr || !app) {
      _http = 404;
      _err = "app_not_found";
      return json(
        { error: "Application not found or not owned by user." },
        404,
      );
    }
    // Fall back to the application's stored JD when the request body omitted it
    // (the extension proposal-card path). Live check: ~88% of applications carry
    // a populated job_description, so this rescues the common missing-JD case.
    if (!safeJobDescription) {
      const storedJd = stripHtml(String(app.job_description ?? "")) ?? "";
      if (storedJd.trim()) safeJobDescription = storedJd.slice(0, 10000);
    }
    // Guardrail: with no usable JD from the body OR the stored row, there is
    // nothing to tailor against. Keep the original clear 400.
    if (!safeJobDescription) {
      _http = 400;
      _err = "missing_input";
      return json({ error: "job_description is required" }, 400);
    }
    const safeTargetRole = String(app.role_title ?? "").slice(0, 200);

    // profile + experiences + education — the master's source rows, in parallel.
    // resolveSectorTheme + buildCvPdf header fallbacks read `profile`.
    const [profileRes, expRes, eduRes, projRes, certRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("experiences").select("*").eq("user_id", user.id),
      supabase
        .from("education")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      // Parallel with the above, so restoring projects/certifications sections adds
      // no serial latency to the warm tailor path.
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("certifications").select("*").eq("user_id", user.id),
    ]);
    const profile = profileRes.data as any;
    if (!profile) {
      _http = 404;
      _err = "no_profile";
      return json({ error: "No user profile found" }, 404);
    }
    const userContext = {
      full_name: profile?.full_name ?? "",
      phone_number: profile?.phone_number ?? "",
      email: user.email ?? "",
      location: profile?.location ?? "",
      linkedin_url: profile?.linkedin_url ?? "",
    };

    // ── 1. Master (FIX 2 — staleness): rebuild DETERMINISTICALLY from the CURRENT
    //    profile every tailor, so profile edits always propagate. Profile is the
    //    single source of truth. buildMasterCvData is deterministic (no LLM, sub-ms),
    //    so this replaces the old persisted-row read + the cold ~40s LLM self-heal
    //    and adds no measurable latency. The persisted is_master row is refreshed
    //    fire-and-forget so the studio shows the same fresh master.
    let master = buildMasterCvData(
      profile,
      expRes.data || [],
      eduRes.data || [],
      user.email,
      { projects: projRes.data || [], certifications: certRes.data || [] },
    ) as any;
    void (async () => {
      try {
        const { error: insErr } = await supabase
          .from("application_cvs")
          .insert({
            user_id: user.id,
            is_master: true,
            version: 1,
            application_id: null,
            cv_data: master,
          });
        if (insErr && (insErr as any).code === "23505") {
          await supabase
            .from("application_cvs")
            .update({ cv_data: master })
            .eq("user_id", user.id)
            .eq("is_master", true);
        }
      } catch (_) {
        // studio-sync only; never affects the tailor
      }
    })();

    // ── 2. JD keywords ──────────────────────────────────────────────────────
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      _http = 500;
      _err = "no_openrouter_key";
      return json({ error: "Refine model not configured." }, 500);
    }
    const jdKeywords = openaiKey
      ? await extractJDKeywords(safeJobDescription, openaiKey, m, {
          userId: user.id,
          sessionId,
        })
      : {
          must_include_phrases: [],
          action_verbs: [],
          tools_and_platforms: [],
          domain_terms: [],
          soft_skill_keywords: [],
        };

    // ── 2.5 English enforcement: a generated CV is always English. Translate
    //    any Hebrew profile content to English BEFORE tailoring + render, so the
    //    JD reword and anti-fab gate operate in English and Hebrew never reaches
    //    the renderer. No-op (no model call) for all-English masters. Translation
    //    only converts language; it never changes a claim (see cv-translate.ts).
    const translateChat = async (messages: ChatMessage[]): Promise<string> => {
      const res = await openaiChatCompletionWithRetry(
        {
          model: MODEL,
          temperature: 0,
          max_tokens: 4000,
          response_format: { type: "json_object" },
          messages,
        },
        openaiKey!,
        { traceName: "refine-cv:translate", userId: user.id, sessionId },
        { signal: AbortSignal.timeout(30000) },
      );
      if (!res.ok) throw new Error("translate http " + res.status);
      const data = await res.json();
      if (m) {
        m.tokensIn = (m.tokensIn ?? 0) + (data.usage?.prompt_tokens ?? 0);
        m.tokensOut = (m.tokensOut ?? 0) + (data.usage?.completion_tokens ?? 0);
      }
      return data.choices?.[0]?.message?.content || "{}";
    };
    // Pre-ops: translate a Hebrew master so the reword + anti-fab gate run in
    // English. No-op (no model call) for an all-English master.
    if (openaiKey && cvHasHebrew(master)) {
      master = await translateCvToEnglish(master, translateChat);
    }

    // ── 3 + 4 + 5. Ops → assemble → anti-fab gate, with one coverage retry ──
    const masterV = masterView(master);
    const jdExcerpt = safeJobDescription.slice(0, 4000);
    // Summary-gate widening input (Phase 2.1): JD keyword terms, already
    // provenance-filtered by extractJDKeywords to terms present in the JD.
    const summaryJdHaystack = [
      ...jdKeywords.must_include_phrases,
      ...jdKeywords.tools_and_platforms,
      ...jdKeywords.domain_terms,
    ]
      .join(" \n ")
      .toLowerCase();
    const runPass = async (retryHint: string) => {
      const ops = await callOps(
        masterV,
        jdKeywords,
        jdExcerpt,
        openrouterKey,
        { userId: user.id, sessionId },
        retryHint,
        m,
        opsModel,
        opsVariant,
        grounding,
      );
      if (!ops) return null;
      const { cv, rejectedRewordings } = assembleJobCv(
        master,
        ops,
        summaryJdHaystack,
      );
      const cov = scoreCoverage(cv, jdKeywords.must_include_phrases);
      return { cv, cov, rejectedRewordings };
    };
    let result = await runPass("");
    if (!result) {
      _http = 502;
      _err = "ops_failed";
      return json({ error: "Refine could not produce a CV. Try again." }, 502);
    }
    let retryFired = false;
    if (
      !disableRetry &&
      jdKeywords.must_include_phrases.length > 0 &&
      result.cov.tailoring_score < 50
    ) {
      retryFired = true;
      const hint = `\n\nRETRY: the previous selection missed these JD phrases that may genuinely describe the user's experience: ${JSON.stringify(result.cov.missed_phrases)}. Re-select bullets / add minimal truthful rewordings to surface more of them where the user actually demonstrated them. Do NOT invent.`;
      const retry = await runPass(hint);
      if (retry && retry.cov.tailoring_score > result.cov.tailoring_score)
        result = retry;
    }
    let cvData = result.cv;
    const cov = result.cov;

    // ── 5b. Post-ops Hebrew chokepoint (FIX 1). The ops/reword can introduce
    //    Hebrew from the JD (a JD-framed summary with Hebrew proper nouns) AFTER
    //    the master translation, or when an English master skipped translation
    //    entirely. Translate the FINAL assembled cv so Hebrew never reaches the
    //    render regardless of source. Gated on cvHasHebrew(cvData): an all-English
    //    tailor fires NO model call and gets ZERO added latency.
    if (openaiKey && cvHasHebrew(cvData)) {
      cvData = await translateCvToEnglish(cvData, translateChat);
    }

    // ── 5c. CV chokepoint (cv_enforce_v2): the LAST transform before the CV
    //    leaves the function. Placed BEFORE the render (buildCvPdf below) so the
    //    rendered PDF and the persisted cv_data come from the SAME normalized
    //    object — refine renders from cvData at render time and persists it after,
    //    so enforcing after the render would recreate a preview != download gap.
    //    refine is already title-safe and keeps every experience; the chokepoint
    //    mainly adds the voice normalization refine lacked on its write path. The
    //    trace/restore source is the (already-English) master. Idempotent no-op
    //    when the flag is OFF.
    if (cvEnforceV2) {
      const enf = await enforceCvInvariants(cvData, master, safeJobDescription, {
        path: "refine-cv",
      });
      cvData = enf.cv_data as typeof cvData;
      console.log(
        `[cv-enforce] path=refine-cv applied=true revoiced=${enf.bulletsRevoiced} enforced=${enf.bulletsEnforced} restored=${enf.experiencesRestored} hebrew=${enf.hebrew}`,
      );
    }

    // ── 6. Render → upload → sign ───────────────────────────────────────────
    const proCount = Array.isArray(cvData.professional_experiences)
      ? cvData.professional_experiences.length
      : 0;
    const sectionOrder: SectionKey[] =
      proCount >= 2
        ? [
            "about",
            "professional_experience",
            "military_service",
            "volunteering",
            "leadership",
            "education",
            "skills",
            "languages",
            "honors",
            "certifications",
            "projects",
          ]
        : [
            "about",
            "education",
            "professional_experience",
            "military_service",
            "volunteering",
            "leadership",
            "skills",
            "languages",
            "honors",
            "certifications",
            "projects",
          ];
    const sectorResolution = resolveSectorTheme(
      safeTargetRole,
      roleLibrary as any,
      profile as any,
    );
    const { bytes: cvBytes } = await buildCvPdf(cvData, userContext as any, {
      style: safeTemplateStyle,
      theme: sectorResolution.theme,
      sectionOrder,
      photo: null,
    });
    const safeRole =
      safeTargetRole.replace(/[^a-zA-Z0-9_\-]/g, "_") || "Refined";
    const fileName = `${user.id}/${safeRole}_CV_${Date.now()}.pdf`;
    const { error: uploadError } = await serviceClient.storage
      .from("cvs")
      .upload(fileName, cvBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) {
      _http = 500;
      _err = "upload";
      return json({ error: `CV upload failed: ${uploadError.message}` }, 500);
    }
    const { data: signedUrlData, error: signedUrlError } =
      await serviceClient.storage
        .from("cvs")
        .createSignedUrl(fileName, 315360000);
    if (signedUrlError || !signedUrlData) {
      _http = 500;
      _err = "signed_url";
      return json({ error: "Failed to generate CV download URL" }, 500);
    }
    const cv_url = signedUrlData.signedUrl;

    // ── 7. Persist: applications pointer + NON-master application_cvs row ────
    await supabase
      .from("applications")
      .update({
        cv_url,
        cv_status: "ready",
        cv_version_name: `${safeTargetRole} CV`,
        cv_skills_emphasized: (cvData.skills as any)?.domain || [],
      })
      .eq("id", application_id)
      .eq("user_id", user.id);

    try {
      const { error: persistErr } = await supabase
        .from("application_cvs")
        .insert({
          user_id: user.id,
          application_id,
          source_jd: safeJobDescription || null,
          cv_data: cvData as any,
          // Immutable as-generated snapshot (P0); Studio autosave mutates
          // cv_data only, never this.
          generated_cv_data: cvData as any,
          cv_url,
          version: 1,
          // is_master omitted → column DEFAULT false (a refined job CV, not a master)
        });
      if (persistErr)
        console.error(
          "[refine] application_cvs persist failed (non-fatal):",
          persistErr.message,
        );
    } catch (e) {
      console.error(
        "[refine] application_cvs persist threw (non-fatal):",
        (e as Error).message,
      );
    }

    _ok = true;
    _http = 200;
    return json({
      cv_url,
      application_id,
      tailoring: cov,
      retry_fired: retryFired,
      message: `Refined CV generated for "${safeTargetRole}".`,
    });
  } catch (error) {
    console.error("refine-cv error:", error);
    _http = 500;
    _err = "unhandled";
    return json({ error: (error as Error).message }, 500);
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err });
  }
});
