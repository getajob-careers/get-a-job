// anthropic-chat.ts — direct Anthropic Messages API transport for the CV Pass-2
// authoring call, a drop-in twin of openrouter-chat.ts. Bypasses OpenRouter
// (measured 2026-07-19 to add ~24s of latency per generation vs a direct
// provider call — see docs/research/cv-generation-speed-investigation.md).
//
// CONTRACT: returns an OpenAI-shaped Response so the Pass-2 call site reads
// `.ok` / `.status` / `.json()` → `{ choices:[{message:{content},finish_reason}],
// usage:{prompt_tokens,completion_tokens} }` exactly as it does for the OpenAI /
// OpenRouter paths. The caller does NOT branch on transport when reading the
// result — only when choosing the transport.
//
// Two shape differences from OpenAI that this module absorbs internally:
//   1. Anthropic takes `system` as a TOP-LEVEL param, not a role=system message.
//      We lift the system message out of the OpenAI-shaped `messages` array.
//   2. Anthropic has no `response_format: json_object`. We force valid JSON with
//      the documented assistant-prefill trick (seed the assistant turn with "{")
//      and prepend "{" back onto the returned text. Same model + same prompt as
//      the OpenRouter path, so authoring output is equivalent.
//
// Env: ANTHROPIC_API_KEY (checked by the caller before invoking). The model id
// is passed IN the payload (`payload.model`) — the caller sets it from
// ANTHROPIC_CV_MODEL, so no model string is hardcoded here.
//
// Tracing reuses sendLangfuseTrace with the ADAPTED (OpenAI-shaped) response so
// the Langfuse trace body/usage fields populate identically to the other paths.

import {
  LANGFUSE_ENABLED,
  sendLangfuseTrace,
  type TraceContext,
} from './openai-chat.ts'

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

interface AnthropicChatOptions {
  signal?: AbortSignal
}

interface AnthropicChatWithRetryOptions extends AnthropicChatOptions {
  retries?: number
  baseBackoffMs?: number
  maxBackoffMs?: number
}

// 429 rate limit, 529 overloaded (Anthropic-specific), 5xx transient. Same
// spirit as the OpenAI/OpenRouter retryable set.
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529])

// Map Anthropic stop_reason → OpenAI finish_reason so the caller's truncation
// check (finish_reason === 'length') keeps working.
function mapFinishReason(stop: unknown): string {
  if (stop === 'max_tokens') return 'length'
  if (stop === 'end_turn' || stop === 'stop_sequence') return 'stop'
  return String(stop ?? 'stop')
}

// Translate an OpenAI-shaped chat payload into an Anthropic Messages payload.
// Lifts the system message out, keeps user/assistant turns, and appends an
// assistant "{" prefill when the caller asked for json_object output.
function toAnthropicPayload(openaiPayload: Record<string, unknown>): {
  body: Record<string, unknown>
  jsonPrefill: boolean
} {
  const msgs = Array.isArray(openaiPayload.messages) ? openaiPayload.messages : []
  const systemParts: string[] = []
  const messages: Array<{ role: string; content: string }> = []
  for (const m of msgs as Array<{ role?: string; content?: unknown }>) {
    const content = typeof m?.content === 'string' ? m.content : ''
    if (m?.role === 'system') systemParts.push(content)
    else if (m?.role === 'user' || m?.role === 'assistant') messages.push({ role: m.role, content })
  }
  const wantsJson =
    (openaiPayload.response_format as { type?: string } | undefined)?.type === 'json_object'
  // Assistant-prefill forces the model to continue a JSON object. Only add it
  // when the last turn is a user turn (Anthropic requires alternating roles and
  // a prefill must be the final assistant turn).
  if (wantsJson) messages.push({ role: 'assistant', content: '{' })

  const body: Record<string, unknown> = {
    model: openaiPayload.model,
    max_tokens: openaiPayload.max_tokens ?? 4096,
    messages,
  }
  if (systemParts.length) body.system = systemParts.join('\n\n')
  if (typeof openaiPayload.temperature === 'number') body.temperature = openaiPayload.temperature
  return { body, jsonPrefill: wantsJson }
}

// Adapt an Anthropic success body → OpenAI-shaped body. `jsonPrefill` prepends
// the "{" we seeded so the returned text is a complete JSON object.
function toOpenAiShape(anthropicData: any, jsonPrefill: boolean): Record<string, unknown> {
  const textParts: string[] = Array.isArray(anthropicData?.content)
    ? anthropicData.content.filter((b: any) => b?.type === 'text').map((b: any) => String(b.text ?? ''))
    : []
  let content = textParts.join('')
  if (jsonPrefill) content = '{' + content
  return {
    choices: [
      {
        message: { role: 'assistant', content },
        finish_reason: mapFinishReason(anthropicData?.stop_reason),
      },
    ],
    usage: {
      prompt_tokens: anthropicData?.usage?.input_tokens ?? null,
      completion_tokens: anthropicData?.usage?.output_tokens ?? null,
      total_tokens:
        (anthropicData?.usage?.input_tokens ?? 0) + (anthropicData?.usage?.output_tokens ?? 0),
    },
    model: anthropicData?.model,
  }
}

// Single attempt. Returns an OpenAI-shaped Response (ok=200 on success; the raw
// error status + body on failure so the caller's error path is unchanged).
export async function anthropicChatCompletion(
  openaiPayload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: AnthropicChatOptions = {},
): Promise<Response> {
  const startTime = new Date()
  const { body, jsonPrefill } = toAnthropicPayload(openaiPayload)

  const upstream = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    // Preserve status + raw error text so the caller logs the real upstream.
    const errText = await upstream.text().catch(() => '')
    return new Response(errText, { status: upstream.status })
  }

  const anthropicData = await upstream.json()
  const openaiShaped = toOpenAiShape(anthropicData, jsonPrefill)

  if (LANGFUSE_ENABLED) {
    try {
      const endTime = new Date()
      const synthetic = new Response(JSON.stringify(openaiShaped), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
      const tracePromise = sendLangfuseTrace({
        payload: openaiPayload,
        traceCtx,
        startTime,
        endTime,
        responseClone: synthetic.clone(),
        responseOk: true,
        responseStatus: 200,
      }).catch((err) => {
        console.warn('[anthropic-chat] Langfuse trace failed (non-fatal):', err?.message || err)
      })
      // @ts-ignore — EdgeRuntime is a Supabase-specific global.
      const edgeRuntime = (globalThis as any).EdgeRuntime
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(tracePromise)
    } catch (err) {
      console.warn('[anthropic-chat] Langfuse setup failed (non-fatal):', (err as Error)?.message || err)
    }
  }

  return new Response(JSON.stringify(openaiShaped), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

// anthropicChatCompletion + exponential-backoff retry. Strict parity with
// openrouterChatCompletionWithRetry: same retry count, backoff curve, and
// Retry-After honor (capped at 30s).
export async function anthropicChatCompletionWithRetry(
  openaiPayload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: AnthropicChatWithRetryOptions = {},
): Promise<Response> {
  const { retries = 3, baseBackoffMs = 1000, maxBackoffMs = 8000, signal } = options

  let lastResponse: Response | null = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await anthropicChatCompletion(openaiPayload, apiKey, traceCtx, { signal })
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res
      lastResponse = res
      console.warn(`[anthropic-retry] HTTP ${res.status} on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName})`)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      lastError = err instanceof Error ? err : new Error(String(err))
      lastResponse = null
      console.warn(`[anthropic-retry] fetch error on attempt ${attempt + 1}/${retries + 1} (trace=${traceCtx.traceName}):`, lastError.message)
    }

    if (attempt >= retries) break

    let waitMs = Math.min(baseBackoffMs * Math.pow(2, attempt), maxBackoffMs)
    if (lastResponse && (lastResponse.status === 429 || lastResponse.status === 529)) {
      const retryAfter = lastResponse.headers.get('retry-after')
      if (retryAfter) {
        const seconds = Number(retryAfter)
        if (!Number.isNaN(seconds) && seconds > 0) waitMs = Math.min(seconds * 1000, 30_000)
      }
    }
    waitMs += Math.random() * 500
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  if (lastResponse) return lastResponse
  throw lastError ?? new Error('Anthropic fetch failed after retries (no response)')
}
