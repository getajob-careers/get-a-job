// aiChatStream.js — client-side SSE consumer for the ai-chat edge function.
//
// Two modes:
//   1. Streaming (default): hand-rolled fetch + body.getReader() loop, parses
//      the edge function's SSE wire format. Tokens arrive via onToken, the
//      cleaned reply + suggested_* shapes arrive via onFinal once the stream
//      closes. AbortController support → stop button.
//   2. Buffered fallback: supabase.functions.invoke (identical to pre-stream
//      behavior). Used when the feature flag is off or the edge function
//      returns JSON instead of SSE (e.g., an older deployment).
//
// Feature flag, two-way kill switch (env-var as default, query param as
// emergency override):
//   - VITE_CHAT_STREAMING=false → disables streaming everywhere
//   - ?stream=0 / ?stream=1 → per-tab override (wins over env var)
//
// SSE wire format (one event per `data:` line, events separated by blank
// lines per the SSE spec):
//   data: {"type":"token","text":"..."}\n\n
//   data: {"type":"final","reply":"...","suggested_*":...}\n\n
//   data: {"type":"error","message":"...","status":502}\n\n
//   data: [DONE]\n\n

import { supabase } from '@/api/supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isStreamingEnabled() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stream') === '0') return false
    if (params.get('stream') === '1') return true
  }
  const envVal = import.meta.env.VITE_CHAT_STREAMING
  if (envVal === 'false' || envVal === '0' || envVal === false) return false
  return true
}

// Shape of the parsed `final` SSE event (also the shape of the buffered
// fallback's response body). Mirrors what the edge function returns from
// buildAiChatResponse.
//
// onToken(text)   — called for each `token` event with the delta string
// onFinal(payload) — called once with { reply, suggested_tasks?, ... }
// onError(err)    — called on transport error, server-side error event,
//                   or abort. The error has `.status` + `.context.status`
//                   on it so existing 401-refresh logic continues to work.
//
// Returns a Promise that resolves on `[DONE]` or rejects on error.
export async function callAiChat(body, { onToken, onFinal, onError, signal } = {}) {
  if (!isStreamingEnabled()) {
    return callAiChatBuffered(body, { onFinal, onError })
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token
  if (!accessToken) {
    const err = new Error('Not authenticated')
    err.status = 401
    err.context = { status: 401 }
    onError?.(err)
    throw err
  }

  let resp
  try {
    resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    if (err?.name !== 'AbortError') onError?.(err)
    throw err
  }

  if (!resp.ok) {
    let errBody = ''
    try { errBody = await resp.text() } catch { /* */ }
    const err = new Error(`ai-chat ${resp.status}: ${errBody.slice(0, 200) || 'request failed'}`)
    err.status = resp.status
    err.context = { status: resp.status }
    onError?.(err)
    throw err
  }

  // Server may have ignored the Accept header (older deployment) and
  // returned buffered JSON. Detect via Content-Type; deliver via onFinal
  // so the caller doesn't care.
  const contentType = resp.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    let data
    try { data = await resp.json() } catch { data = null }
    onFinal?.(data || {})
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let receivedError = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by `\n\n`. Process every complete event
      // in the buffer; keep the trailing partial for the next read.
      let sepIdx
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx)
        buffer = buffer.slice(sepIdx + 2)
        // Each event is a sequence of `key: value` lines. We only care
        // about `data:` lines — comments (`:`) and other field types
        // (`event:`, `id:`) are ignored.
        const dataLines = rawEvent.split('\n').filter((l) => l.startsWith('data:'))
        if (dataLines.length === 0) continue
        const payload = dataLines.map((l) => l.slice(5).replace(/^ /, '')).join('\n')
        if (payload === '[DONE]') return
        let parsed
        try { parsed = JSON.parse(payload) } catch { continue }

        if (parsed.type === 'token' && typeof parsed.text === 'string') {
          onToken?.(parsed.text)
        } else if (parsed.type === 'final') {
          onFinal?.(parsed)
        } else if (parsed.type === 'error') {
          const err = new Error(parsed.message || 'Server error')
          err.status = parsed.status || 500
          err.context = { status: err.status }
          receivedError = err
          onError?.(err)
          // Don't throw yet — let the server flush [DONE] so the reader
          // closes cleanly. The throw at the end surfaces it to the caller.
        }
      }
    }
    if (receivedError) throw receivedError
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    if (!receivedError) onError?.(err)
    throw err
  } finally {
    try { reader.releaseLock() } catch { /* */ }
  }
}

// Buffered fallback — identical UX shape to the streaming path: onFinal
// fires once with the full payload, onToken never fires. Preserves the
// pre-streaming code path so the feature flag is a true two-way switch.
async function callAiChatBuffered(body, { onFinal, onError }) {
  const { data, error } = await supabase.functions.invoke('ai-chat', { body })
  if (error) {
    // supabase.functions.invoke surfaces edge-function HTTP status on
    // error.context.status — preserve that for the caller's 401-refresh
    // logic.
    onError?.(error)
    throw error
  }
  onFinal?.(data || {})
}
