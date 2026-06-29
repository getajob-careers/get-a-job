// openai-chat.ts — drop-in OpenAI chat-completions fetch wrapper with
// optional Langfuse tracing. Pure pass-through: if Langfuse is broken,
// misconfigured, slow, or fails for ANY reason, the OpenAI call still
// works exactly as it would have without this helper.
//
// Why raw HTTP to Langfuse ingestion instead of @langfuse/openai or
// @langfuse/tracing: the v4 SDK is OpenTelemetry-based and assumes
// NodeSDK. Getting OTel running in Supabase Edge Runtime (Deno) is
// possible but fragile, adds cold-start cost, and complicates the
// pass-through safety guarantee. Langfuse's /api/public/ingestion HTTP
// endpoint is stable, documented, and framework-agnostic — same fetch
// pattern as the OpenAI calls themselves.
//
// Env vars (POSIX-valid underscore names — Deno can't read hyphenated env
// vars even when Supabase accepts hyphenated secret names in the dashboard):
//   LANGFUSE_SECRET_KEY — secret key (sk_lf_...)
//   LANGFUSE_PUBLIC_KEY — public key (pk_lf_...)
//   LANGFUSE_BASE_URL   — base URL (https://cloud.langfuse.com)
//
// If any are missing, tracing silently no-ops. The OpenAI call proceeds.
//
// Tracing is fire-and-forget via EdgeRuntime.waitUntil so it never adds
// latency to the user response. If waitUntil isn't available (local
// dev), we still kick off the trace post but don't await it — worst
// case the runtime exits before the trace lands and we lose that one.

const LANGFUSE_SECRET = Deno.env.get('LANGFUSE_SECRET_KEY')
const LANGFUSE_PUBLIC = Deno.env.get('LANGFUSE_PUBLIC_KEY')
const LANGFUSE_URL = Deno.env.get('LANGFUSE_BASE_URL')

// Exported so parallel helpers (e.g. _shared/openrouter-chat.ts) can run
// the same enabled-check + Basic-auth header without re-reading env or
// re-encoding the credential. The values themselves remain module-load
// constants — no behavior change.
export const LANGFUSE_ENABLED = !!(LANGFUSE_SECRET && LANGFUSE_PUBLIC && LANGFUSE_URL)

// Cached Basic-auth header. Built once at module load. Safe even when
// disabled — never used if LANGFUSE_ENABLED is false.
export const LANGFUSE_AUTH_HEADER: string | null = LANGFUSE_ENABLED
  ? `Basic ${btoa(`${LANGFUSE_PUBLIC}:${LANGFUSE_SECRET}`)}`
  : null

export const LANGFUSE_BASE_URL: string | null = LANGFUSE_URL ?? null

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

export interface TraceContext {
  // Trace name shown in Langfuse — typically the edge function slug.
  traceName: string
  // Supabase user.id, surfaced in Langfuse for per-student filtering.
  userId?: string
  // Optional session grouping (e.g. a conversation_id for multi-turn flows).
  sessionId?: string
  // Free-form metadata visible in the trace details — post_type, goal, etc.
  metadata?: Record<string, unknown>
  // Optional tag list (e.g. ['production', 'cv-gen']).
  tags?: string[]
}

interface OpenAIChatOptions {
  // Passed straight to fetch — same shape as today. Caller controls timeout
  // via AbortSignal.timeout(ms) just like the existing inline calls.
  signal?: AbortSignal
}

interface OpenAIChatWithRetryOptions extends OpenAIChatOptions {
  // Max retry attempts on transient errors (default 3). Total HTTP attempts
  // is retries + 1.
  retries?: number
  // Base exponential-backoff delay (default 1000ms). Wait = base * 2^attempt
  // up to maxBackoffMs. Jitter (0–500ms) added to avoid thundering-herd.
  baseBackoffMs?: number
  // Backoff ceiling (default 8000ms).
  maxBackoffMs?: number
}

// HTTP statuses worth retrying. 408 = request timeout, 429 = rate limit,
// 5xx = transient server errors.
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

// openaiChatCompletion + exponential-backoff retry on transient errors.
// Honors the `Retry-After` header on 429s (capped at 30s to keep edge
// functions under the 150s platform timeout). Use this from any function
// that makes 2+ sequential OpenAI calls or runs during fan-out windows
// (onboarding, post-CV-gen story capture) — the default budget protects
// against ~7-8s rate-limit windows.
//
// Rationale: PR #156 retrospective showed that streaming chat raised
// instantaneous concurrent OpenAI usage, and non-streaming functions with
// only 1 retry (1.2s budget) cascade-500'd under sustained rate-limits.
// See tasks/lessons.md 2026-05-26 entries.
export async function openaiChatCompletionWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: OpenAIChatWithRetryOptions = {},
): Promise<Response> {
  const {
    retries = 3,
    baseBackoffMs = 1000,
    maxBackoffMs = 8000,
    signal,
  } = options

  let lastResponse: Response | null = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await openaiChatCompletion(payload, apiKey, traceCtx, { signal })
      // Success or non-retryable failure — return immediately. The caller
      // sees the same Response shape as openaiChatCompletion would have
      // returned, regardless of how many retries happened internally.
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res
      lastResponse = res
      console.warn(`[openai-retry] HTTP ${res.status} on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName})`)
    } catch (err) {
      // AbortSignal.timeout() rejects with name 'TimeoutError'; a plain abort
      // uses 'AbortError'. Both mean the caller's deadline fired, so re-throw
      // immediately and never loop back to retry on an already-aborted signal.
      // A retry would reuse the dead signal, fail instantly, and only burn
      // backoff against the platform wall.
      const errName = (err as Error)?.name
      if (errName === 'AbortError' || errName === 'TimeoutError') throw err
      lastError = err instanceof Error ? err : new Error(String(err))
      lastResponse = null
      console.warn(`[openai-retry] fetch error on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName}):`, lastError.message)
    }

    if (attempt >= retries) break

    // Compute backoff. Honor Retry-After on 429s up to a 30s cap so a
    // bad upstream signal can't keep the function alive past the edge
    // platform timeout. Falls back to exponential otherwise.
    let waitMs = Math.min(baseBackoffMs * Math.pow(2, attempt), maxBackoffMs)
    if (lastResponse && lastResponse.status === 429) {
      const retryAfter = lastResponse.headers.get('retry-after')
      if (retryAfter) {
        const seconds = Number(retryAfter)
        if (!Number.isNaN(seconds) && seconds > 0) {
          waitMs = Math.min(seconds * 1000, 30_000)
        }
      }
    }
    // Jitter — 0 to 500ms — prevents synchronized retries across concurrent
    // edge function invocations from re-creating the same rate-limit wave.
    waitMs += Math.random() * 500
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  // Exhausted. Return the last Response if we have one (so the caller's
  // existing error path handles HTTP semantics). Otherwise throw the
  // last network error.
  if (lastResponse) return lastResponse
  throw lastError ?? new Error('OpenAI fetch failed after retries (no response)')
}

// Drop-in replacement for the inline
//   await fetch('https://api.openai.com/v1/chat/completions', { ... })
// pattern. Returns the same Response object the caller would have gotten,
// untouched. Trace is sent to Langfuse in the background.
export async function openaiChatCompletion(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: OpenAIChatOptions = {},
): Promise<Response> {
  const startTime = new Date()

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  // SAFETY: Langfuse tracing is wrapped in its own try/catch and runs
  // fire-and-forget. Nothing here can affect the caller's response.
  if (LANGFUSE_ENABLED) {
    try {
      // Clone the response so we can read its body for tracing without
      // consuming the body the caller will read. clone() is safe for the
      // non-streaming responses every edge function currently uses.
      const cloned = response.clone()
      const endTime = new Date()

      const tracePromise = sendLangfuseTrace({
        payload,
        traceCtx,
        startTime,
        endTime,
        responseClone: cloned,
        responseOk: response.ok,
        responseStatus: response.status,
      }).catch((err) => {
        // Swallow ALL errors. Langfuse failure must never surface to caller.
        console.warn('[openai-chat] Langfuse trace failed (non-fatal):', err?.message || err)
      })

      // EdgeRuntime.waitUntil keeps the runtime alive long enough for the
      // background trace to send AFTER the response goes back to the user.
      // Available in Supabase Edge Runtime; falls back gracefully if not.
      // @ts-ignore — EdgeRuntime is a Supabase-specific global, not in stock Deno types.
      const edgeRuntime = (globalThis as any).EdgeRuntime
      if (edgeRuntime?.waitUntil) {
        edgeRuntime.waitUntil(tracePromise)
      }
      // If waitUntil isn't available, we leave the promise running. It may
      // not complete before the runtime exits, but that's a clean "trace
      // dropped" — no user-visible impact.
    } catch (err) {
      // Defensive — anything that escapes the inner try/catch (e.g. clone()
      // throwing on an already-consumed body) gets swallowed here too.
      console.warn('[openai-chat] Langfuse setup failed (non-fatal):', (err as Error)?.message || err)
    }
  }

  return response
}

export interface SendTraceArgs {
  payload: Record<string, unknown>
  traceCtx: TraceContext
  startTime: Date
  endTime: Date
  responseClone: Response
  responseOk: boolean
  responseStatus: number
}

// Exported so parallel transports (OpenRouter etc.) can emit identically-
// shaped traces. The function body is unchanged — only the visibility was
// promoted from module-private to module-public.
export async function sendLangfuseTrace(args: SendTraceArgs): Promise<void> {
  const { payload, traceCtx, startTime, endTime, responseClone, responseOk, responseStatus } = args

  // Parse the OpenAI response body for the trace. If parsing fails (bad
  // shape, non-JSON error body), we still emit a partial trace with what
  // we know — the trace shows up as an error in Langfuse.
  let parsedBody: any = null
  let parseError: string | null = null
  try {
    parsedBody = await responseClone.json()
  } catch (e) {
    parseError = (e as Error)?.message || 'response body not JSON'
  }

  const traceId = crypto.randomUUID()
  const observationId = crypto.randomUUID()

  // Extract OpenAI usage + output. Defensive — any field might be missing.
  const usage = parsedBody?.usage ?? null
  const outputMessage = parsedBody?.choices?.[0]?.message ?? null
  const model = (payload.model as string) || parsedBody?.model || 'unknown'

  // Strip the OpenAI message-history input down to the trace payload.
  // We log inputs even on error for debugging.
  const inputMessages = Array.isArray(payload.messages) ? payload.messages : []

  // Model parameters (everything except messages) — useful in Langfuse UI.
  const modelParameters: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'messages' || k === 'model') continue
    modelParameters[k] = v
  }

  // Determine observation level + status message for the Langfuse trace.
  let level: 'DEFAULT' | 'WARNING' | 'ERROR' = 'DEFAULT'
  let statusMessage: string | undefined
  if (!responseOk) {
    level = 'ERROR'
    statusMessage = `OpenAI returned ${responseStatus}`
  } else if (parseError) {
    level = 'WARNING'
    statusMessage = `Response parse warning: ${parseError}`
  }

  // Single-batch ingestion event with trace + generation in one POST.
  // Format per https://langfuse.com/docs/api -> /api/public/ingestion
  const batch = [
    {
      id: crypto.randomUUID(),
      type: 'trace-create',
      timestamp: startTime.toISOString(),
      body: {
        id: traceId,
        name: traceCtx.traceName,
        timestamp: startTime.toISOString(),
        userId: traceCtx.userId,
        sessionId: traceCtx.sessionId,
        metadata: traceCtx.metadata,
        tags: traceCtx.tags,
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'generation-create',
      timestamp: startTime.toISOString(),
      body: {
        id: observationId,
        traceId,
        type: 'GENERATION',
        name: traceCtx.traceName,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        model,
        modelParameters,
        input: inputMessages,
        output: outputMessage,
        usage: usage
          ? {
              input: usage.prompt_tokens,
              output: usage.completion_tokens,
              total: usage.total_tokens,
              unit: 'TOKENS',
            }
          : undefined,
        level,
        statusMessage,
      },
    },
  ]

  const ingestResponse = await fetch(`${LANGFUSE_URL}/api/public/ingestion`, {
    method: 'POST',
    headers: {
      'Authorization': LANGFUSE_AUTH_HEADER!,
      'Content-Type': 'application/json',
      // Without this header, Langfuse routes ingestion through a delayed
      // batch processor (~10 min lag). v4 routing makes traces appear in
      // real time, which is what we want for prompt-tuning during pilot.
      'x-langfuse-ingestion-version': '4',
    },
    body: JSON.stringify({ batch }),
    // 5s cap — Langfuse should respond fast; if it's stuck we'd rather
    // drop the trace than keep the edge function alive longer.
    signal: AbortSignal.timeout(5000),
  })

  if (!ingestResponse.ok) {
    const errText = await ingestResponse.text().catch(() => '<no body>')
    throw new Error(`Langfuse ingestion ${ingestResponse.status}: ${errText.slice(0, 200)}`)
  }
}
