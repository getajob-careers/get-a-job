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
import { stripHtml } from "../_shared/strip-html.ts";
import { buildCvPdf } from "../_shared/cv-templates/build-pdf.ts";
import { resolveSectorTheme } from "../_shared/cv-templates/sector-mapping.ts";
import type {
  TemplateStyle,
  SectionKey,
} from "../_shared/cv-templates/types.ts";
import { parseLlmJsonObject } from "../_shared/json-parse.ts";
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

// ── Anti-fab quantified-token trace (primitives copied from generate-tailored-cv) ──
const QUANT_TOKEN_RE =
  /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?[%$€₪]?|[$€₪]\d+[KMB]?|\d+\+|\d+x|[A-Z][a-z]+(?:[A-Z][a-zA-Z]+)+|[A-Z]{3,})\b/g;
const TOKEN_BLOCKLIST = new Set([
  "Israel",
  "Tel",
  "Aviv",
  "Hebrew",
  "English",
  "USA",
  "UK",
  "EU",
  "API",
  "CV",
  "JD",
  "PM",
  "HR",
  "CS",
  "VIP",
  "CEO",
  "CFO",
  "CTO",
  "COO",
  "SQL",
]);
// True iff every quantified / proper-noun token in `text` already appears in
// `haystack` (the master content). Reworded bullets + the summary must pass this
// — the master is the anti-fab'd source, so the refine only polices that a
// reword surfaces a keyword without inventing a metric/tool/number.
function tokensTraceToMaster(text: string, haystackLower: string): boolean {
  const tokens = String(text || "").match(QUANT_TOKEN_RE) || [];
  for (const tok of tokens) {
    if (TOKEN_BLOCKLIST.has(tok)) continue;
    if (!haystackLower.includes(tok.toLowerCase())) return false;
  }
  return true;
}

// Summary-only gate (Phase 2.1). NUMERIC tokens (percent/dollar/count/number) must
// still trace to the master — strict, unchanged. PROPER-NOUN tokens (CamelCase /
// ALLCAPS, e.g. a JD acronym like "GTM") may instead come from the JD keyword set,
// since extractJDKeywords already provenance-filters those to terms present in the
// JD — so a legitimately JD-framed summary survives instead of being forced back to
// the JD-agnostic master summary. Matches the latitude the from-scratch path gives
// its own summary: no stricter, no looser. NOT used for bullet rewords — those stay
// on the strict master-only trace (tokensTraceToMaster) above.
function summaryTokensClean(
  text: string,
  masterHaystackLower: string,
  jdHaystackLower: string,
): boolean {
  const tokens = String(text || "").match(QUANT_TOKEN_RE) || [];
  for (const tok of tokens) {
    if (TOKEN_BLOCKLIST.has(tok)) continue;
    const lower = tok.toLowerCase();
    if (/\d/.test(tok)) {
      if (!masterHaystackLower.includes(lower)) return false; // numbers: master only (strict)
    } else if (!masterHaystackLower.includes(lower) && !jdHaystackLower.includes(lower)) {
      return false; // proper-noun: master OR JD keyword set (widened)
    }
  }
  return true;
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
  select: { experience_ids: string[]; bullet_ids: string[] };
  rewordings: { bullet_id: string; new_text: string }[];
  summary: string;
  skills_emphasis: string[];
};

function parseOps(raw: any): Ops {
  const sel = raw?.select || {};
  return {
    select: {
      experience_ids: safeArray(sel.experience_ids).map((x: any) => String(x)),
      bullet_ids: safeArray(sel.bullet_ids).map((x: any) => String(x)),
    },
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
  const selectedExpIds = new Set(ops.select.experience_ids);
  const selectedBulletIds = new Set(ops.select.bullet_ids);
  // rewordings indexed by bullet_id
  const rewordById = new Map(
    ops.rewordings.map((r) => [r.bullet_id, r.new_text]),
  );
  let rejectedRewordings = 0;

  // start from a shallow clone of the master so untouched sections carry over verbatim
  const cv: any = { ...master };

  for (const { key, org } of EXP_BUCKETS) {
    const out: any[] = [];
    for (const e of safeArray(master?.[key])) {
      const expId = e?.experience_id ? String(e.experience_id) : null;
      if (!expId || !selectedExpIds.has(expId)) continue; // not selected → drop (one-page budget)
      // master bullets are bare strings; address by index within this experience
      const masterBullets = safeArray(e?.bullets).map((b: any) =>
        String(b ?? ""),
      );
      const expHaystack = [e?.title, e?.[org], ...masterBullets]
        .join(" \n ")
        .toLowerCase();
      const keptBullets: string[] = [];
      for (let i = 0; i < masterBullets.length; i++) {
        const bid = `${expId}#${i}`;
        if (!selectedBulletIds.has(bid)) continue; // not selected → drop
        let text = masterBullets[i];
        const reword = rewordById.get(bid);
        if (reword != null) {
          // Anti-fab gate: a reword may only re-phrase; every quantified /
          // proper-noun token must already exist in THIS experience's master
          // content. On violation, keep the original master bullet.
          if (tokensTraceToMaster(reword, expHaystack)) text = reword;
          else rejectedRewordings++;
        }
        keptBullets.push(text);
      }
      if (keptBullets.length === 0) continue; // selected experience with no kept bullets → drop
      const entry: any = {
        title: e?.title || "",
        dates: e?.dates || "",
        bullets: keptBullets,
        experience_id: expId,
      };
      entry[org] = e?.[org] || "";
      out.push(entry);
    }
    cv[key] = out;
  }

  // Summary: numbers must trace to the master (strict); proper-noun JD framing
  // (e.g. "GTM") may come from the JD keyword set — so a tailored summary lands
  // instead of falling back to the JD-agnostic master. See summaryTokensClean.
  const masterHaystack = JSON.stringify(master).toLowerCase();
  if (ops.summary && summaryTokensClean(ops.summary, masterHaystack, summaryJdHaystack))
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

const OPS_SYSTEM_PROMPT = `You are a CV REFINER. You receive a user's MASTER CV — the complete, already-verified reservoir of their real experience — and a target job. You do NOT write a CV. You emit a small JSON ops object that SELECTS from the master and lightly rewords existing bullets to surface the job's keywords, producing a focused one-page CV.

Emit ONLY this JSON (no prose, no markdown):
{
  "select": {
    "experience_ids": ["<experience_id>", ...],
    "bullet_ids": ["<experience_id>#<n>", ...]
  },
  "rewordings": [ { "bullet_id": "<experience_id>#<n>", "new_text": "..." } ],
  "summary": "...",
  "skills_emphasis": ["<skill from master>", ...]
}

ONE-PAGE BUDGET — this is the PRIMARY one-page mechanism:
- Select the most JD-relevant experiences and roughly a page's worth of bullets. Aim for about 3-5 experiences and about 12 bullets TOTAL (roughly 10-14; about 2-3 bullets per selected experience). Include the most JD-relevant experiences and bullets; drop the rest. Do not select everything.
- experience_ids and bullet_ids MUST be ids that exist in the MASTER below. bullet_ids must belong to selected experiences.

REWORDINGS — minimal, only to ADD a missing keyword (truthfulness is non-negotiable):
- Reword a SELECTED bullet ONLY when it is MISSING a must_include JD keyword the user genuinely demonstrated in that same experience, AND rewording would surface that keyword. If a selected bullet already conveys its JD-relevant content, SELECT IT VERBATIM by id and emit NO rewording for it — do NOT re-emit its text. Most selected bullets need no rewording.
- HARD CAP: at most 4 rewordings total. Choose the 4 that add the most missing-keyword coverage.
- A rewording may only re-phrase; it must NOT introduce any metric, number, percentage, currency, tool, company, or claim that is not already present in that experience's master bullets. If a keyword can't be surfaced truthfully, leave the bullet as-is.

SUMMARY:
- 2-3 sentences. You MAY frame it with the target job's terminology and keywords, but every fact, metric, number, tool, and claim must be grounded in the master. Do not invent.

SKILLS_EMPHASIS:
- Up to 8 skills, taken from the master's skills, ordered most JD-relevant first. Do NOT invent skills.`;

async function callOps(
  masterV: any,
  jdKeywords: JDKeywords,
  jdExcerpt: string,
  openrouterKey: string,
  traceCtx: { userId: string; sessionId: string },
  retryHint: string,
  m: Metric,
  opsModel: { slug: string; used: string },
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
      { role: "system", content: OPS_SYSTEM_PROMPT },
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
    const { application_id, job_description, cv_model } = body;
    if (typeof application_id !== "string" || !application_id) {
      _http = 400;
      _err = "missing_input";
      return json({ error: "application_id is required" }, 400);
    }
    const jdInput = stripHtml(String(job_description ?? "")) ?? "";
    if (!jdInput.trim()) {
      _http = 400;
      _err = "missing_input";
      return json({ error: "job_description is required" }, 400);
    }
    const safeJobDescription = jdInput.slice(0, 10000);
    const safeTemplateStyle: TemplateStyle = "ats-optimized";
    // ops model routing (experiment): default Sonnet; cv_model can pick a faster model
    const opsModel = OPS_MODELS[String(cv_model ?? "").trim()] ?? OPS_MODELS.sonnet;

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
      .select("id, role_title, company")
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
    const safeTargetRole = String(app.role_title ?? "").slice(0, 200);

    // profile (resolveSectorTheme + buildCvPdf header fallbacks)
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, phone_number, location, linkedin_url, primary_domain, target_industries",
      )
      .eq("id", user.id)
      .single();
    const userContext = {
      full_name: profile?.full_name ?? "",
      phone_number: profile?.phone_number ?? "",
      email: user.email ?? "",
      location: profile?.location ?? "",
      linkedin_url: profile?.linkedin_url ?? "",
    };

    // ── 1. Lazy master load (L1): author it once via the deployed master mode
    //    if the user has no is_master row yet, then re-select. ───────────────
    const readMaster = async () =>
      (
        await supabase
          .from("application_cvs")
          .select("cv_data")
          .eq("user_id", user.id)
          .eq("is_master", true)
          .maybeSingle()
      ).data;
    let masterRow = await readMaster();
    if (!masterRow?.cv_data) {
      console.log(
        "[refine] no master — authoring one (master mode, ~40s, once)",
      );
      const { error: genErr } = await supabase.functions.invoke(
        "generate-tailored-cv",
        { body: { master: true, cv_model: "sonnet" } },
      );
      if (genErr) {
        _http = 500;
        _err = "master_gen";
        return json(
          { error: "Could not prepare your master CV. Try again." },
          500,
        );
      }
      masterRow = await readMaster();
    }
    const master = masterRow?.cv_data as any;
    if (!master) {
      _http = 500;
      _err = "no_master";
      return json({ error: "Master CV unavailable." }, 500);
    }

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

    // ── 3 + 4 + 5. Ops → assemble → anti-fab gate, with one coverage retry ──
    const masterV = masterView(master);
    const jdExcerpt = safeJobDescription.slice(0, 4000);
    // Summary-gate widening input (Phase 2.1): JD keyword terms, already
    // provenance-filtered by extractJDKeywords to terms present in the JD.
    const summaryJdHaystack = [
      ...jdKeywords.must_include_phrases,
      ...jdKeywords.tools_and_platforms,
      ...jdKeywords.domain_terms,
    ].join(" \n ").toLowerCase();
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
      );
      if (!ops) return null;
      const { cv, rejectedRewordings } = assembleJobCv(master, ops, summaryJdHaystack);
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
      jdKeywords.must_include_phrases.length > 0 &&
      result.cov.tailoring_score < 50
    ) {
      retryFired = true;
      const hint = `\n\nRETRY: the previous selection missed these JD phrases that may genuinely describe the user's experience: ${JSON.stringify(result.cov.missed_phrases)}. Re-select bullets / add minimal truthful rewordings to surface more of them where the user actually demonstrated them. Do NOT invent.`;
      const retry = await runPass(hint);
      if (retry && retry.cov.tailoring_score > result.cov.tailoring_score)
        result = retry;
    }
    const { cv: cvData, cov } = result;

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
    const cvBytes = await buildCvPdf(cvData, userContext as any, {
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
          source_jd: jdInput || null,
          cv_data: cvData as any,
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
