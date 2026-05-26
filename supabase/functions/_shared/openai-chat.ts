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

const LANGFUSE_ENABLED = !!(LANGFUSE_SECRET && LANGFUSE_PUBLIC && LANGFUSE_URL)

// Cached Basic-auth header. Built once at module load. Safe even when
// disabled — never used if LANGFUSE_ENABLED is false.
const LANGFUSE_AUTH_HEADER: string | null = LANGFUSE_ENABLED
  ? `Basic ${btoa(`${LANGFUSE_PUBLIC}:${LANGFUSE_SECRET}`)}`
  : null

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

interface SendTraceArgs {
  payload: Record<string, unknown>
  traceCtx: TraceContext
  startTime: Date
  endTime: Date
  responseClone: Response
  responseOk: boolean
  responseStatus: number
}

async function sendLangfuseTrace(args: SendTraceArgs): Promise<void> {
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

  const usage = parsedBody?.usage ?? null
  const outputMessage = parsedBody?.choices?.[0]?.message ?? null
  const model = (payload.model as string) || parsedBody?.model || 'unknown'

  await postLangfuseGeneration({
    payload,
    traceCtx,
    startTime,
    endTime,
    model,
    output: outputMessage,
    usage,
    responseOk,
    responseStatus,
    parseError,
  })
}

interface StreamingResponseOptions {
  // Same payload you'd pass to openaiChatCompletion. stream:true and
  // stream_options.include_usage are added internally.
  payload: Record<string, unknown>
  apiKey: string
  traceCtx: TraceContext
  // Callback invoked after the OpenAI stream closes with the fully-accumulated
  // text + final usage block. Returns the JSON payload to send as the `final`
  // SSE event. Throwing here surfaces a `stream failed` error event to the client.
  onComplete: (fullText: string, usage: OpenAIUsage | null) => Promise<Record<string, unknown>>
  // Extra response headers to merge into the SSE response (typically corsHeaders).
  extraHeaders?: Record<string, string>
  // AbortSignal propagated to the OpenAI fetch — closes the stream if the
  // client disconnects.
  signal?: AbortSignal
}

interface OpenAIUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

const STREAMING_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

/**
 * Open a Server-Sent Events response that streams OpenAI chat tokens to the
 * client as they arrive. Wire format (one event per `data:` line, events
 * separated by blank lines per the SSE spec):
 *
 *   data: {"type":"token","text":"Hi "}\n\n
 *   data: {"type":"token","text":"there"}\n\n
 *   ...
 *   data: {"type":"final", ...onComplete payload}\n\n
 *   data: [DONE]\n\n
 *
 * Error path:
 *   data: {"type":"error","message":"...","status":502}\n\n
 *   data: [DONE]\n\n
 *
 * The caller's `onComplete` runs once the OpenAI stream finishes; it gets
 * the full accumulated text + usage block and returns the JSON shape to
 * emit as the `final` event. Langfuse tracing fires after the stream
 * closes via EdgeRuntime.waitUntil (so the user-visible response isn't
 * blocked on Langfuse latency).
 *
 * Truncation retry: not implemented here. Bump `max_tokens` in the
 * payload directly — chasing truncation mid-stream would either lose
 * already-streamed tokens (bad UX) or require a continuation protocol
 * the client doesn't need. ai-chat raises base max_tokens to 4096; if
 * that's still not enough the LLM is being asked the wrong question.
 */
export function openaiStreamingResponse(options: StreamingResponseOptions): Response {
  const { payload, apiKey, traceCtx, onComplete, extraHeaders, signal } = options
  const encoder = new TextEncoder()
  const startTime = new Date()
  const fullPayload = { ...payload, stream: true, stream_options: { include_usage: true } }
  let fullText = ''
  let finalUsage: OpenAIUsage | null = null
  let errorMessage: string | undefined

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        } catch {
          // Controller closed (client aborted). Subsequent emits no-op.
        }
      }
      const close = () => {
        try { controller.enqueue(encoder.encode('data: [DONE]\n\n')) } catch { /* */ }
        try { controller.close() } catch { /* */ }
      }

      try {
        // Initial fetch with one transient-error retry. Once headers come
        // back we commit to the stream; mid-stream errors surface as
        // truncated output, not retries.
        let openaiResponse: Response | null = null
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            openaiResponse = await fetch(OPENAI_ENDPOINT, {
              method: 'POST',
              signal,
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(fullPayload),
            })
            if (openaiResponse.ok) break
            if (!STREAMING_RETRYABLE_STATUSES.has(openaiResponse.status)) break
            if (attempt < 1) await new Promise(r => setTimeout(r, 1000 + Math.random() * 500))
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') throw err
            if (attempt >= 1) throw err
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 500))
          }
        }

        if (!openaiResponse || !openaiResponse.ok) {
          const status = openaiResponse?.status ?? 502
          const errBody = openaiResponse ? await openaiResponse.text().catch(() => '') : 'connection failed'
          errorMessage = `OpenAI ${status}: ${errBody.slice(0, 200)}`
          console.error('[openai-streaming]', errorMessage)
          emit({ type: 'error', message: 'AI service error', status })
          close()
          return
        }

        const reader = openaiResponse.body!.getReader()
        const decoder = new TextDecoder()
        let oaiBuf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          oaiBuf += decoder.decode(value, { stream: true })
          // OpenAI emits one event per `data: <json>\n\n` block.
          let sepIdx: number
          while ((sepIdx = oaiBuf.indexOf('\n\n')) !== -1) {
            const rawEvent = oaiBuf.slice(0, sepIdx)
            oaiBuf = oaiBuf.slice(sepIdx + 2)
            for (const line of rawEvent.split('\n')) {
              if (!line.startsWith('data:')) continue
              const data = line.slice(5).trim()
              if (!data || data === '[DONE]') continue
              try {
                const json = JSON.parse(data)
                const delta = json.choices?.[0]?.delta?.content
                if (typeof delta === 'string' && delta) {
                  fullText += delta
                  emit({ type: 'token', text: delta })
                }
                if (json.usage) finalUsage = json.usage
              } catch {
                // Malformed chunk — skip. OpenAI occasionally emits keep-alive
                // comments or non-JSON lines we don't care about.
              }
            }
          }
        }

        // OpenAI stream finished — let the caller process accumulated text
        // (strip SUGGESTED_* markers, validate, etc.) and emit the final event.
        const finalEvent = await onComplete(fullText, finalUsage)
        emit({ type: 'final', ...finalEvent })
        close()
      } catch (err) {
        errorMessage = (err as Error)?.message || String(err)
        if ((err as Error)?.name === 'AbortError') {
          // Client disconnected — close cleanly without error event.
          close()
        } else {
          console.error('[openai-streaming] stream failed:', errorMessage)
          emit({ type: 'error', message: 'Stream failed' })
          close()
        }
      } finally {
        // Fire-and-forget Langfuse trace with whatever we accumulated.
        // Wrapped in waitUntil so the runtime stays alive long enough to
        // post AFTER the response stream closes to the client.
        const endTime = new Date()
        const tracePromise = traceStreamingGeneration({
          payload: fullPayload,
          traceCtx,
          startTime,
          endTime,
          fullText,
          usage: finalUsage,
          errorMessage,
        }).catch((err) => {
          console.warn('[openai-streaming] trace failed (non-fatal):', err?.message || err)
        })
        // @ts-ignore — EdgeRuntime is a Supabase-specific global.
        const edgeRuntime = (globalThis as any).EdgeRuntime
        if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(tracePromise)
      }
    },
    cancel() {
      // Client closed the stream (e.g., user clicked Stop). The OpenAI
      // fetch's AbortSignal handles upstream cancellation; nothing to do
      // here beyond letting the finally block in start() post the trace.
    },
  })

  return new Response(stream, {
    headers: {
      ...(extraHeaders || {}),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Disable any proxy buffering (nginx etc.). Supabase Edge Runtime
      // doesn't buffer by default, but the header is cheap insurance.
      'X-Accel-Buffering': 'no',
    },
  })
}

interface StreamingTraceArgs {
  payload: Record<string, unknown>
  traceCtx: TraceContext
  startTime: Date
  endTime: Date
  fullText: string
  usage: OpenAIUsage | null
  errorMessage?: string
}

/**
 * Post a Langfuse trace for a streaming OpenAI call. Buffered-only:
 * the caller accumulates tokens during the stream and passes the full
 * text + final usage block here once the stream closes. Same
 * fire-and-forget safety guarantees as openaiChatCompletion: any
 * Langfuse failure is swallowed.
 *
 * Wrap the call in EdgeRuntime.waitUntil at the call site so the trace
 * sends after the user-visible response has closed.
 */
export async function traceStreamingGeneration(args: StreamingTraceArgs): Promise<void> {
  if (!LANGFUSE_ENABLED) return
  const { payload, traceCtx, startTime, endTime, fullText, usage, errorMessage } = args

  // Shape the output to match what sendLangfuseTrace would have produced
  // for a non-streaming call — Langfuse renders both identically.
  const outputMessage = fullText ? { role: 'assistant', content: fullText } : null
  const model = (payload.model as string) || 'unknown'

  try {
    await postLangfuseGeneration({
      payload,
      traceCtx,
      startTime,
      endTime,
      model,
      output: outputMessage,
      usage,
      responseOk: !errorMessage,
      responseStatus: errorMessage ? 502 : 200,
      parseError: null,
      explicitErrorMessage: errorMessage,
    })
  } catch (err) {
    console.warn('[openai-chat] streaming trace failed (non-fatal):', (err as Error)?.message || err)
  }
}

interface PostGenerationArgs {
  payload: Record<string, unknown>
  traceCtx: TraceContext
  startTime: Date
  endTime: Date
  model: string
  output: { role: string; content: string } | null
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null
  responseOk: boolean
  responseStatus: number
  parseError: string | null
  explicitErrorMessage?: string
}

async function postLangfuseGeneration(args: PostGenerationArgs): Promise<void> {
  const {
    payload, traceCtx, startTime, endTime, model, output, usage,
    responseOk, responseStatus, parseError, explicitErrorMessage,
  } = args

  const traceId = crypto.randomUUID()
  const observationId = crypto.randomUUID()

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
  if (explicitErrorMessage) {
    level = 'ERROR'
    statusMessage = explicitErrorMessage
  } else if (!responseOk) {
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
        output,
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
