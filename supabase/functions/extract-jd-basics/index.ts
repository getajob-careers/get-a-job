import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { startMetric, finishMetric } from "../_shared/metrics.ts";
import { openaiChatCompletion } from "../_shared/openai-chat.ts";
import { stripHtml } from "../_shared/strip-html.ts";

// extract-jd-basics — the fast front of the CV pipeline. Pulls ONLY the hiring
// company name and the job title out of a pasted JD with a single gpt-4o-mini
// call, so the caller can write role_title onto the application row BEFORE
// refine-cv runs (refine-cv derives the CV target role from app.role_title; a
// placeholder would tailor the CV to the placeholder). Scaffolding mirrors
// analyze-job-match: verify_jwt=false at the gateway + an internal getUser()
// gate, CORS preflight, and a function_metrics write. Kept lean (~2s).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const m = startMetric("extract-jd-basics");
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

    const authHeader = req.headers.get("Authorization")!;
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

    const rawBody = await req.json();
    const job_description = stripHtml(
      typeof rawBody?.job_description === "string"
        ? rawBody.job_description
        : null,
    );
    if (!job_description) {
      _http = 400;
      _err = "missing_input";
      return new Response(
        JSON.stringify({ error: "job_description is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const prompt = `Extract the hiring company name and a job title from this job description.
Return JSON exactly: { "company": string|null, "role_title": string }. Return no other fields.

company: the hiring company's name ONLY if it is explicitly named in the text. If the company is not explicitly named, return null. Do not guess or infer it.

role_title: ALWAYS a concise, usable job title — never null, never empty. A job description always describes a role, so naming it is summarization, not fabrication. If the JD states a clean title, use it verbatim. If it does not (e.g. it only describes the work, or blends responsibilities like "a dual support-first role with a customer-success dimension"), return a short standard industry title that best summarizes the role the JD describes (e.g. "Customer Support Specialist", "Backend Engineer"). Keep it under ~6 words and do not include the company, location, or seniority padding unless the JD makes them central.

JOB DESCRIPTION:
${job_description}`;

    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
      },
      openaiKey,
      { traceName: "extract-jd-basics", userId: user.id },
      { signal: AbortSignal.timeout(20000) },
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error(
        `[extract-jd-basics] OpenAI ${openaiResponse.status}: ${errText}`,
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
    const content: string = completion.choices?.[0]?.message?.content || "{}";
    m.modelUsed = MODEL;
    m.tokensIn = completion.usage?.prompt_tokens ?? null;
    m.tokensOut = completion.usage?.completion_tokens ?? null;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.error(
        "[extract-jd-basics] JSON parse failed:",
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

    const cleanField = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };

    _ok = true;
    _http = 200;
    return new Response(
      JSON.stringify({
        company: cleanField(parsed.company),
        role_title: cleanField(parsed.role_title),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    _http = 500;
    _err = "unhandled";
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err });
  }
});
