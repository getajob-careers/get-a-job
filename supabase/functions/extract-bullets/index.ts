import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startMetric, finishMetric } from "../_shared/metrics.ts";
import { openaiChatCompletion } from "../_shared/openai-chat.ts";

// extract-bullets — the bullet-writer for the Story Bank -> experiences/education
// migration. The bullet-writer sibling of extract-story-from-text.
//
// Reads free-form user text describing something they did in a role or in
// their studies and returns 1-3 resume-ready STAR-disciplined bullet lines
// (action + outcome with any REAL metric/tool in-line) plus the skills/tools
// demonstrated. It requires a target_type (experience | education) + target_id
// — bullets always belong to an existing experience or education entry.
//
// Like the story extractor, this function does NOT write to the DB: it returns
// the candidate bullets for the frontend to render in an editable confirmation
// card. The frontend appends to the entry's bullets only after the user
// accepts/edits (the anti-fabrication safety seam) and snapshots the prior
// array so the write is undoable. The bullet TEXT is the source of truth for
// the downstream verbatim-metric guarantee (later phases), so every real
// number/tool must live in the bullet exactly as the user wrote it.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const MODEL = "gpt-4o-mini";
const RATE_LIMIT_CALLS = 60;
const RATE_LIMIT_WINDOW = 3600;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAP_BULLETS = 4;
const CAP_BULLET_LEN = 300;
const CAP_SKILLS = 15;
const CAP_TEXT_INPUT = 5000;

const SYSTEM_PROMPT = `You are an Experience Bullet Writer for the "Get A Job" Career Operating System. You read free-form user text describing something the user did in a job, internship, or project, and write resume-ready achievement bullets the user can drop straight into their CV.

ABSOLUTE FABRICATION RULES — these override every other consideration:

1. NEVER invent metrics, numbers, percentages, durations, team sizes, dollar amounts, dates, company names, or product names that aren't EXPLICITLY in the user's text. If the user wrote "I led a project to improve onboarding" you may NOT write "improved onboarding by 30%" or "led a 12-person team" — those numbers do not exist in the source.

2. A metric goes in a bullet ONLY if the user wrote it. "shipped 2 weeks early" stays verbatim — same number, same unit. "shipped fast" gets NO number. When the text has no metric, write the action and the concrete outcome WITHOUT a number. A truthful bullet with no metric beats a strong-looking bullet with an invented one.

3. Tools / platforms appear ONLY if the user named them explicitly ("I used Notion and Linear" -> Notion, Linear). Inferring a tool from the role is forbidden.

4. Do not pad. If the text supports one bullet, write one. Do not split a single achievement into several near-duplicate bullets, and do not merge two unrelated achievements into one bullet.

BULLET STYLE:
- Start each bullet with a concrete action verb (Built, Migrated, Negotiated, Ran, Cut, Coordinated, Wrote, Shipped) — never with a tool name and never with "Responsible for".
- Each bullet is ONE line, roughly 14-22 words: action + what was done + concrete outcome (and the real metric/tool when present).
- Name the user's specific company, tool, or outcome where the text provides it. A bullet that could belong to any candidate is filler — cut it.
- Any real number, percentage, currency figure, or named tool that IS in the text must appear in the bullet VERBATIM (numbers and units byte-for-byte).

SKILLS — skills[] lists the skills and tools the bullets demonstrate, in display case ("Stakeholder Management", "Figma", "SQL"), never abbreviations or snake_case. Be conservative: include a skill only if the text clearly supports it. These dedupe into the experience's skills list.

EXTRACTION_NOTES — required. In 1-2 sentences, say what you deliberately left out and why (e.g. "Your text didn't include a number, so the bullet states the action and outcome without one"). This is shown to the user and forces you to check your own work.

OUTPUT — return EXACTLY this JSON shape:
{
  "bullets": ["string", ...],
  "skills": ["string", ...],
  "extraction_notes": "string (1-2 sentences)"
}

Return ONLY valid JSON.`;

function sanitise(
  raw: unknown,
): { bullets: string[]; skills: string[]; extraction_notes: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const stringArray = (v: unknown, cap: number, maxLen: number): string[] => {
    if (!Array.isArray(v)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
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

  const bullets = stringArray(r.bullets, CAP_BULLETS, CAP_BULLET_LEN);
  if (bullets.length === 0) return null;
  const skills = stringArray(r.skills, CAP_SKILLS, 100);
  const extraction_notes =
    typeof r.extraction_notes === "string"
      ? r.extraction_notes.trim().slice(0, 500)
      : "";
  return { bullets, skills, extraction_notes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const m = startMetric("extract-bullets");
  let _ok = false;
  let _http = 500;
  let _err: string | null = null;

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      _http = 500;
      _err = "no_openai_key";
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      _http = 401;
      _err = "auth";
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      _http = 401;
      _err = "auth";
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    m.userId = user.id;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "extract-bullets",
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    });
    if (allowed === false) {
      _http = 429;
      _err = "rate_limit";
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again in an hour." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rawBody = await req.text();
    if (rawBody.length > 10_000) {
      _http = 413;
      _err = "payload_too_large";
      return new Response(
        JSON.stringify({ error: "Request payload too large." }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    let parsed: { text?: unknown; target_type?: unknown; target_id?: unknown };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      _http = 400;
      _err = "bad_json";
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text =
      typeof parsed.text === "string"
        ? parsed.text.trim().slice(0, CAP_TEXT_INPUT)
        : "";
    if (!text) {
      _http = 400;
      _err = "missing_input";
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // target_type + target_id are REQUIRED — a bullet always belongs to an
    // EXISTING experience or education entry. Ownership is validated against
    // the matching table (RLS gates the SELECT under the user's auth).
    const target_type =
      parsed.target_type === "experience" || parsed.target_type === "education"
        ? parsed.target_type
        : "";
    const target_id =
      typeof parsed.target_id === "string" ? parsed.target_id : "";
    if (!target_type) {
      _http = 400;
      _err = "bad_input";
      return new Response(
        JSON.stringify({
          error: 'target_type must be "experience" or "education"',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!target_id || !UUID_RE.test(target_id)) {
      _http = 400;
      _err = "bad_input";
      return new Response(
        JSON.stringify({ error: "target_id (valid UUID) is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Ownership check against the matching table; a short label grounds the LLM.
    const targetTable =
      target_type === "education" ? "education" : "experiences";
    const targetCols =
      target_type === "education"
        ? "degree_type, field_of_study, institution"
        : "title, company";
    const { data: entry } = await supabase
      .from(targetTable)
      .select(targetCols)
      .eq("id", target_id)
      .maybeSingle();
    if (!entry) {
      _http = 404;
      _err = "bad_ownership";
      return new Response(
        JSON.stringify({ error: "target not found or not owned by user" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const ent = entry as unknown as Record<string, unknown>;
    const entryLabel =
      target_type === "education"
        ? `EDUCATION ENTRY (the bullets belong to this entry — you may reference the degree / field / school since they are confirmed, but do not invent other details):
- Degree: ${String(ent.degree_type || "").slice(0, 200)}
- Field of study: ${String(ent.field_of_study || "").slice(0, 200)}
- School: ${String(ent.institution || "").slice(0, 200)}`
        : `EXPERIENCE (the bullets belong to this role — you may reference the role / company since they are confirmed, but do not invent other details about it):
- Role: ${String(ent.title || "").slice(0, 200)}
- Company: ${String(ent.company || "").slice(0, 200)}`;

    const userPrompt = `${entryLabel}

USER TEXT:
${text}

Write resume-ready achievement bullets from the user text above.`;

    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      },
      openaiKey,
      {
        traceName: "extract-bullets",
        userId: user.id,
        metadata: { target_type },
      },
      { signal: AbortSignal.timeout(20000) },
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error(
        `[extract-bullets] OpenAI ${openaiResponse.status}: ${errText}`,
      );
      _http = 502;
      _err = `openai_${openaiResponse.status}`;
      m.modelUsed = MODEL;
      return new Response(
        JSON.stringify({
          error: "AI service temporarily unavailable. Please try again.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const completion = await openaiResponse.json();
    m.modelUsed = MODEL;
    m.tokensIn = completion.usage?.prompt_tokens ?? null;
    m.tokensOut = completion.usage?.completion_tokens ?? null;

    const content: string = completion.choices?.[0]?.message?.content || "{}";
    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(content);
    } catch (parseErr) {
      console.error(
        `[extract-bullets] JSON parse failed:`,
        content.slice(0, 200),
        parseErr,
      );
      _http = 502;
      _err = "json_parse";
      return new Response(
        JSON.stringify({
          error: "AI returned malformed response. Please try again.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sanitised = sanitise(rawParsed);
    if (!sanitised) {
      console.error(
        `[extract-bullets] bad shape from LLM:`,
        JSON.stringify(rawParsed).slice(0, 300),
      );
      _http = 502;
      _err = "bad_shape";
      return new Response(
        JSON.stringify({
          error: "AI returned an unexpected structure. Please try again.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    _ok = true;
    _http = 200;
    return new Response(JSON.stringify(sanitised), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(
      "[extract-bullets] unhandled:",
      error?.message || error,
    );
    _http = 500;
    _err = "unhandled";
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err });
  }
});
