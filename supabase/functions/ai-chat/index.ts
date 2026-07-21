import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { startMetric, finishMetric } from "../_shared/metrics.ts";
import {
  openaiChatCompletion,
  type TraceContext,
} from "../_shared/openai-chat.ts";
import { routeFor } from "../_shared/model-routing.ts";
import { sanitizePageContext } from "./page-context.ts";
// Option-B: prompt assembly + structured-block parsing live in prompt-lib.ts
// (single source of truth, shared verbatim with the eval harness).
import {
  buildUserContext,
  assembleSystemPrompt,
  buildMessages,
  parseSuggestions,
  reconcileCvGenToApp,
  stripUnbackedCvGenerationClaim,
  enrichApplicationActionsWithJd,
} from "./prompt-lib.ts";
import { resolveSonnetTransport } from "../_shared/sonnet-transport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const MODEL = "gpt-4o-mini";
// PR-B2 bump 30 → 50: the agent drawer adds a second high-volume entry
// point on top of the four full-page agents, and pilot students who
// keep the drawer open through a working session legitimately need
// more turns than the legacy single-page flow modeled. Same 1-hour
// window. Telemetry will revisit after Aug-Nov 2026 pilot.
const RATE_LIMIT_CALLS = 50;
const RATE_LIMIT_WINDOW = 3600;

// Server-side retry on transient OpenAI errors. Pairs with the B7
// frontend Retry button: 1 server attempt + 1 silent server retry +
// 1 manual frontend retry. Catches the common case where OpenAI 429s
// or 503s once and recovers immediately, invisible to the user.
//
// Permanent errors (4xx auth/validation) are NOT retried — retry
// won't help and just doubles latency / cost.
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

async function fetchOpenAIWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: { timeoutMs?: number; retries?: number; backoffMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 45000, retries = 1, backoffMs = 1200 } = options;
  let lastError: Response | Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      // openaiChatCompletion replaces the raw fetch — adds Langfuse tracing.
      // Each retry attempt emits its own trace (visibility into retry behaviour).
      const res = await openaiChatCompletion(payload, apiKey, traceCtx, {
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      // Success or permanent failure — return immediately, no retry.
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res;
      // Transient failure — log and (if attempts remain) retry after backoff.
      console.warn(
        `[ai-chat] OpenAI ${res.status} on attempt ${attempt + 1}/${retries + 1}`,
      );
      lastError = res;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(
        `[ai-chat] OpenAI fetch error on attempt ${attempt + 1}/${retries + 1}:`,
        err?.message || err,
      );
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < retries) {
      // Jittered backoff to avoid thundering-herd on a transient outage.
      await new Promise((r) => setTimeout(r, backoffMs + Math.random() * 500));
    }
  }

  // All attempts exhausted. Return the last Response if we have one so the
  // caller's existing error path handles it. Otherwise throw the network error.
  if (lastError instanceof Response) return lastError;
  throw lastError ?? new Error("OpenAI fetch failed (no response)");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const m = startMetric("ai-chat");
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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "ai-chat",
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    });
    if (!allowed) {
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
    if (rawBody.length > 50_000) {
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
    const {
      message,
      agent,
      conversation_history = [],
      application_id,
      follow_up_after,
      page_context,
      chat_model,
    } = JSON.parse(rawBody);
    // Flag-gated model swap for the conversational chat route. chat_model='sonnet'
    // routes conversational agents through routeFor('chat-agent') (claude-sonnet-4.6
    // via OpenRouter); anything else — missing, null, typo — keeps gpt-4o-mini on
    // OpenAI. Mirrors the cv_model pattern (PRs #284-286). Same safe-coerce shape.
    const safeChatModel: "sonnet" | "default" =
      chat_model === "sonnet" ? "sonnet" : "default";

    // PR-B2 page-context contract: the drawer surface forwards the
    // user's current route + entity IDs only. Sanitize aggressively
    // (whitelist enum / UUID-format / valid keys) before any DB work;
    // unknown shapes silently drop to null so the prompt assembly stays
    // byte-identical to the legacy path. Empty / absent input skips the
    // fetch round-trips entirely.
    const safePageContext = sanitizePageContext(page_context);
    // The drawer can also surface application_id via page_context for
    // surfaces where it's natural (Career detail drawer, Calendar event
    // row). Prefer the explicit top-level application_id when present so
    // legacy callers (CVAgent, InterviewCoach) keep working untouched;
    // fall back to page_context only when the body field isn't set.
    const effectiveApplicationId =
      (typeof application_id === "string" && application_id) ||
      safePageContext?.application_id ||
      null;

    if (!message || !agent) {
      _http = 400;
      _err = "missing_input";
      return new Response(
        JSON.stringify({ error: "message and agent are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Path B follow-up trigger. The frontend sets this after a side-effect
    // completes so the agent can do a clean second pass for things missed
    // when the user had a competing explicit ask. Whitelist the values to
    // keep the contract tight. Phase 4 shipped (PR #377 + #378): experiences.bullets
    // now flows into CV generation, so after a bullet save the frontend fires a
    // "bullet_capture" follow-up and the agent acknowledges the save verbally
    // (the bullet is available for future CV generations; no card is emitted).
    const VALID_FOLLOW_UPS = new Set(["cv_generation", "bullet_capture"]);
    const safeFollowUp =
      typeof follow_up_after === "string" &&
      VALID_FOLLOW_UPS.has(follow_up_after)
        ? follow_up_after
        : null;

    const userContext = await buildUserContext(supabase, user.id, {
      agent,
      effectiveApplicationId,
      safePageContext,
      safeFollowUp,
    });

    const systemPrompt = assembleSystemPrompt(agent, userContext, safeFollowUp);

    const messages = buildMessages(systemPrompt, conversation_history, message);

    // temperature 0.4 + max_tokens 2048 (was 0.7 / 1024). Lower temp keeps
    // SUGGESTED_*_JSON markers + field names verbatim so the frontend's
    // extractJsonBlock parser doesn't miss them. Higher token cap stops the
    // CV agent's structured block from being truncated mid-emit, which was
    // causing the "Generate CV" button to never appear (A1/A2/A3 from the
    // session-13 audit). Aligned with generate-career-analysis (temp 0.4)
    // and generate-tasks (max 2048).
    //
    // Truncation retry: if 2048 STILL isn't enough (chat reply + multiple
    // structured blocks), one retry at 4096. Unlike analyze-job-match /
    // generate-tasks (where truncation = unparseable JSON = fatal error),
    // ai-chat tolerates truncation gracefully — even a partially-truncated
    // reply is more useful to the student than a 502. So if retry also
    // truncates, we still return what we got and let extractJsonBlock
    // best-effort the markers.
    const BASE_MAX_TOKENS = 2048;
    const RETRY_MAX_TOKENS = 4096;

    // Route resolution.
    //  - resume-extractor: its own reasoning route (gpt-5.4-mini), unchanged.
    //  - conversational agents: consult routeFor('chat-agent') — claude-sonnet-4.6
    //    via OpenRouter — ONLY when chat_model='sonnet' (frontend flag) AND
    //    OPENROUTER_API_KEY is present. Otherwise gpt-4o-mini on OpenAI. Two
    //    rollback levers: flip the frontend flag, or pull OPENROUTER_API_KEY.
    //  - a route's `reasoning_effort` presence selects the max_completion_tokens
    //    param shape (resume-extractor); chat-agent + the gpt-4o-mini fallback
    //    are non-reasoning, so they use max_tokens.
    const SONNET_MODEL_USED = "claude-sonnet-4-6";
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const wantsSonnet =
      agent !== "resume-extractor" &&
      safeChatModel === "sonnet" &&
      !!openrouterKey;
    const route =
      agent === "resume-extractor"
        ? routeFor("resume-extractor")
        : wantsSonnet
          ? routeFor("chat-agent")
          : null;
    // Sonnet transport selection (SONNET_TRANSPORT_CHAT): OpenRouter default,
    // direct Anthropic when the coach fast-follow flips it — one env flip, no
    // refactor. Non-Sonnet agents (resume-extractor) stay on OpenAI untouched.
    const chatSonnet = wantsSonnet ? resolveSonnetTransport("chat") : null;
    const callModel = chatSonnet ? chatSonnet.model : (route?.model ?? MODEL);
    // function_metrics records the dash-form Sonnet name so metrics.ts
    // MODEL_PRICING (claude-sonnet-4-6) computes cost_usd regardless of transport.
    const callMetricsModel = chatSonnet ? SONNET_MODEL_USED : callModel;
    const callTemperature = route?.temperature ?? 0.4;
    const callResponseFormat = route?.response_format;
    const callReasoningEffort = route?.reasoning_effort;
    const callMaxCompletionTokens = route?.max_completion_tokens;

    async function callOpenAI(maxTokens: number) {
      const body: Record<string, unknown> = {
        model: callModel,
        messages,
        temperature: callTemperature,
      };
      if (callReasoningEffort) {
        body.max_completion_tokens = callMaxCompletionTokens ?? maxTokens;
        body.reasoning_effort = callReasoningEffort;
      } else {
        body.max_tokens = maxTokens;
      }
      if (callResponseFormat) body.response_format = callResponseFormat;
      const traceCtx = {
        traceName: "ai-chat",
        userId: user!.id,
        metadata: {
          agent,
          chat_model: safeChatModel,
          has_application_link: !!effectiveApplicationId,
          page_context_keys: safePageContext
            ? Object.keys(safePageContext).sort()
            : null,
          follow_up_after: follow_up_after || null,
          max_tokens: callReasoningEffort
            ? (callMaxCompletionTokens ?? maxTokens)
            : maxTokens,
          model: callMetricsModel,
        },
      };
      // Sonnet path uses the OpenRouter retry-parity wrapper (3 retries +
      // exponential backoff) — matches the cv_model ramp hardening so higher
      // drawer concurrency can't cascade a transient 5xx to the user.
      if (chatSonnet) {
        return await chatSonnet.transport(body, chatSonnet.key, traceCtx, {});
      }
      return await fetchOpenAIWithRetry(
        body as Parameters<typeof fetchOpenAIWithRetry>[0],
        openaiKey!,
        traceCtx,
      );
    }

    let openaiResponse = await callOpenAI(BASE_MAX_TOKENS);
    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      // Source-correct labels so on-call checks the right upstream status page.
      const upstream = chatSonnet ? (chatSonnet.name === "anthropic" ? "Anthropic" : "OpenRouter") : "OpenAI";
      const tag = chatSonnet ? chatSonnet.name : "openai";
      console.error(`${upstream} error:`, errBody);
      try {
        await serviceClient.rpc("log_error", {
          p_user_id: user.id,
          p_function_name: "ai-chat",
          p_error_message: `${upstream} ${openaiResponse.status} (agent=${agent})`,
          p_error_details: {
            status: openaiResponse.status,
            body: errBody.slice(0, 2000),
            agent,
            upstream: tag,
          },
        });
      } catch {
        /* swallow */
      }
      _http = 502;
      _err = `${tag}_${openaiResponse.status}`;
      m.modelUsed = callMetricsModel;
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let completion = await openaiResponse.json();
    let finishReason: string | undefined =
      completion.choices?.[0]?.finish_reason;
    // Track usage additively across initial + retry. Both calls bill, so
    // the metric should reflect total consumption, not just the last response.
    // Uses callModel so routed agents (resume-extractor) report their actual
    // model in function_metrics — previously every ai-chat row reported
    // 'gpt-4o-mini' regardless of agent.
    m.modelUsed = callMetricsModel;
    m.tokensIn = completion.usage?.prompt_tokens ?? 0;
    m.tokensOut = completion.usage?.completion_tokens ?? 0;
    // Anthropic cache tiers → accurate cost_usd (0/undefined on OpenAI/OpenRouter).
    m.cacheReadTokens = completion.usage?.cache_read_input_tokens ?? 0;
    m.cacheWriteTokens = completion.usage?.cache_creation_input_tokens ?? 0;

    if (finishReason === "length") {
      console.warn(
        `[ai-chat] truncation detected at max_tokens=${BASE_MAX_TOKENS}, retrying at ${RETRY_MAX_TOKENS}`,
      );
      const retryResponse = await callOpenAI(RETRY_MAX_TOKENS);
      if (retryResponse.ok) {
        completion = await retryResponse.json();
        finishReason = completion.choices?.[0]?.finish_reason;
        m.tokensIn = (m.tokensIn ?? 0) + (completion.usage?.prompt_tokens ?? 0);
        m.tokensOut =
          (m.tokensOut ?? 0) + (completion.usage?.completion_tokens ?? 0);
        m.cacheReadTokens = (m.cacheReadTokens ?? 0) + (completion.usage?.cache_read_input_tokens ?? 0);
        m.cacheWriteTokens = (m.cacheWriteTokens ?? 0) + (completion.usage?.cache_creation_input_tokens ?? 0);
        if (finishReason === "length") {
          console.warn(
            `[ai-chat] still truncated at max_tokens=${RETRY_MAX_TOKENS}; returning best-effort response`,
          );
        }
      } else {
        console.warn(
          `[ai-chat] retry failed: ${retryResponse.status}; falling back to original truncated reply`,
        );
      }
    }

    let reply: string =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    // CV-label fix: when a TARGET APPLICATION is selected, its role_title is
    // authoritative for any CV-gen block parsed below (see prompt-lib reconcile).
    let targetAppRole: string | null = null;
    if (effectiveApplicationId) {
      const { data: appForRole } = await serviceClient
        .from("applications")
        .select("role_title")
        .eq("id", effectiveApplicationId)
        .eq("user_id", user.id)
        .maybeSingle();
      targetAppRole = (appForRole?.role_title as string) ?? null;
    }
    const parsed = parseSuggestions(
      reply,
      message,
      conversation_history,
      targetAppRole,
    );
    reply = parsed.reply;
    const suggested_tasks = parsed.suggested_tasks;
    const suggested_agent = parsed.suggested_agent;
    const suggested_roadmap_changes = parsed.suggested_roadmap_changes;
    let suggested_application_actions = parsed.suggested_application_actions;
    const suggested_company_target_actions =
      parsed.suggested_company_target_actions;
    let suggested_cv_generation = parsed.suggested_cv_generation;
    // A5 (gtc_author_from_app, env-armed): reconcile the CV-gen proposal to the
    // PINNED application — add the application_id when the proposal lacks one (gap
    // 1), align + warn when the model emitted a different one (gap 3), and set
    // target_role to the pinned app's role. OFF → proposal untouched (byte-identical).
    const gtcAuthorFromApp =
      String(Deno.env.get("GTC_AUTHOR_FROM_APP") ?? "").trim().toLowerCase() === "on";
    if (gtcAuthorFromApp && suggested_cv_generation) {
      const r = reconcileCvGenToApp(suggested_cv_generation, effectiveApplicationId, targetAppRole);
      if (r.mismatch) {
        console.warn(`[ai-chat] A5 author_from_app: CV-gen application_id aligned to the pinned application ${effectiveApplicationId}`);
      }
      suggested_cv_generation = r.proposal;
    }
    const suggested_bullet_capture = parsed.suggested_bullet_capture;
    const suggested_add_skill = parsed.suggested_add_skill;

    // Anti-fabrication enforcement (honesty rule 5e): if the model narrated a CV
    // as "generating ... now" but did NOT emit a cv-generation action this turn,
    // strip the false promise so the user never waits for a CV that never started.
    // Deterministic backstop over the prompt; protects both surfaces regardless of
    // client wiring. No-op when an action IS present (the claim is then true).
    if (!suggested_cv_generation) {
      reply = stripUnbackedCvGenerationClaim(reply);
    }

    // JD-drop safety net (2026-07-07 KPMG incident): the model can emit an
    // add/update_application WITHOUT job_description even when the user pasted the
    // JD a turn earlier, leaving the row un-tailorable. Deterministically attach a
    // recently-pasted JD, guarded against misattaching the user's own CV, and be
    // transparent: say so when we attach, and ask for it when none is available.
    if (
      Array.isArray(suggested_application_actions) &&
      suggested_application_actions.some(
        (a: any) =>
          (a.action === "add_application" || a.action === "update_application") &&
          !(typeof a.job_description === "string" && a.job_description.trim()),
      )
    ) {
      const { data: exps } = await serviceClient
        .from("experiences")
        .select("title, company, bullets")
        .eq("user_id", user.id);
      const experiencesText = (exps ?? [])
        .map(
          (e: any) =>
            `${e.title ?? ""} ${e.company ?? ""} ${Array.isArray(e.bullets) ? e.bullets.join(" ") : ""}`,
        )
        .join(" ");
      const enriched = enrichApplicationActionsWithJd(
        suggested_application_actions,
        { message, conversationHistory: conversation_history, experiencesText },
      );
      suggested_application_actions = enriched.actions;
      const notes: string[] = [];
      for (const a of enriched.attached) {
        notes.push(
          `Saved the job description you pasted for ${a.role_title ?? "this role"}${a.company ? ` at ${a.company}` : ""}.`,
        );
      }
      for (const a of enriched.askedFor) {
        notes.push(
          `I've added ${a.role_title ?? "this role"}${a.company ? ` at ${a.company}` : ""} without a job description — paste the JD and I'll attach it so you can tailor a CV.`,
        );
      }
      if (notes.length) reply = `${reply}\n\n${notes.join("\n")}`;
    }

    _ok = true;
    _http = 200;
    return new Response(
      JSON.stringify({
        reply,
        agent,
        ...(suggested_tasks.length > 0 && { suggested_tasks }),
        ...(suggested_agent && { suggested_agent }),
        ...(suggested_roadmap_changes && { suggested_roadmap_changes }),
        ...(suggested_application_actions && { suggested_application_actions }),
        ...(suggested_company_target_actions && {
          suggested_company_target_actions,
        }),
        ...(suggested_cv_generation && { suggested_cv_generation }),
        ...(suggested_bullet_capture && { suggested_bullet_capture }),
        ...(suggested_add_skill && { suggested_add_skill }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("ai-chat error:", error);
    _http = 500;
    _err = "unhandled";
    return new Response(
      JSON.stringify({ error: (error as Error)?.message ?? "unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err });
  }
});
