// Per-call metric emit for edge functions. Writes fire-and-forget so
// observability adds zero latency to user-facing requests. Errors during
// the metric write are logged but never thrown — observability failure
// must not break the function it's observing.
//
// Usage pattern (one example — see analyze-job-match for the wired version):
//
//   import { startMetric, finishMetric } from '../_shared/metrics.ts'
//
//   Deno.serve(async (req) => {
//     const m = startMetric('analyze-job-match')
//     try {
//       // ... handler logic ...
//       // when user is known: m.userId = user.id
//       // when LLM responds: m.modelUsed = MODEL; m.tokensIn = usage.prompt_tokens; m.tokensOut = usage.completion_tokens
//       // success: finishMetric(m, { ok: true, httpStatus: 200 })
//       return new Response(JSON.stringify(result), { status: 200, ... })
//     } catch (err) {
//       finishMetric(m, { ok: false, httpStatus: 500, errorCode: 'unhandled' })
//       return new Response(JSON.stringify({ error: '...' }), { status: 500, ... })
//     }
//   })
//
// Coexists with the existing log_error RPC — log_error captures detailed
// forensic data on failures only; function_metrics captures aggregate signal
// on every call. Different cardinality, different consumers.

// Note: the @supabase/supabase-js client is dynamically imported inside
// the fire-and-forget IIFE below. Two reasons:
//   1. Vitest can't resolve `https://esm.sh/...` static imports under the
//      default ESM loader, which would block this module's tests from
//      loading. Lazy import keeps the test path env-skip-only.
//   2. Module-load latency stays zero for callers that never reach the DB
//      write (e.g. local dev without SERVICE_ROLE_KEY).

// Pricing table in $/1M tokens. Update when models change or new ones added.
// Unknown models record cost_usd = 0 (so SUMs still work cleanly) — update
// the table when introducing a new model rather than letting unknowns drift.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':           { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':      { input: 0.15,  output: 0.60 },
  // gpt-5.4-mini standard tier (OpenAI pricing page). Wired into
  // generate-career-analysis behind the analysis_model flag; reasoning
  // tokens bill as output. Without this row computeCostUsd records 0.
  'gpt-5.4-mini':     { input: 0.75,  output: 4.50 },
  // Anthropic models — added speculatively for future Claude usage; safe to
  // leave in even though we don't currently call Anthropic. Remove if not used.
  'claude-haiku-4-5': { input: 1.00,  output: 5.00 },
  'claude-sonnet-4-6':{ input: 3.00,  output: 15.00 },
  'claude-opus-4-7':  { input: 5.00,  output: 25.00 },
}

export interface Metric {
  functionName: string
  startedAt: number                   // Date.now() when the request began
  userId?: string | null              // mutable — set when auth resolves
  modelUsed?: string | null           // mutable — set after LLM responds
  tokensIn?: number | null            // mutable — set after LLM responds
  tokensOut?: number | null           // mutable — set after LLM responds
}

export interface MetricResult {
  ok: boolean
  httpStatus: number
  // Required (no `?`) so callers must explicitly decide null vs string at the
  // call site. Forces the next field-name typo (e.g. `err:` instead of
  // `errorCode:`) to surface as a TypeScript error rather than dropping
  // silently to undefined → null in the DB row, as
  // generate-internship-pitch did from May 4 to June 11 2026.
  errorCode: string | null
}

export function startMetric(functionName: string): Metric {
  return { functionName, startedAt: Date.now() }
}

export function computeCostUsd(
  model: string | null | undefined,
  tokensIn: number | null | undefined,
  tokensOut: number | null | undefined
): number | null {
  if (!model || tokensIn == null || tokensOut == null) return null
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  return (tokensIn * pricing.input + tokensOut * pricing.output) / 1_000_000
}

/**
 * Fire-and-forget metric write. Does NOT await the DB insert — observability
 * must not add latency to user-facing requests. Errors are logged but never
 * thrown.
 */
export function finishMetric(m: Metric, result: MetricResult): void {
  // Backstop for the field-name-typo regression. TypeScript should already
  // catch a missing httpStatus or errorCode at compile time, but `supabase
  // functions deploy` does not run `deno check` — so a typo can ship as
  // runtime `undefined`. Log loudly if that happens; observability bugs
  // hiding in dashboards for months is exactly what this is meant to
  // prevent. NEVER throw — observability must not break the function it's
  // observing.
  if (result.httpStatus == null || typeof result.httpStatus !== 'number') {
    console.error(
      `[metrics] ${m.functionName} called finishMetric with non-numeric httpStatus (${typeof result.httpStatus}); ` +
      `row will record http_status=NULL — check the call site for a field-name typo (e.g. \`http:\` instead of \`httpStatus:\`).`
    )
  }

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !serviceKey) {
    console.warn(`[metrics] missing SUPABASE_URL or SERVICE_ROLE_KEY; skipping ${m.functionName}`)
    return
  }

  const row = {
    user_id: m.userId ?? null,
    function_name: m.functionName,
    latency_ms: Date.now() - m.startedAt,
    ok: result.ok,
    error_code: result.errorCode ?? null,
    model_used: m.modelUsed ?? null,
    tokens_in: m.tokensIn ?? null,
    tokens_out: m.tokensOut ?? null,
    cost_usd: computeCostUsd(m.modelUsed, m.tokensIn, m.tokensOut),
    http_status: typeof result.httpStatus === 'number' ? result.httpStatus : null,
  }

  // Fire-and-forget. Don't await — observability shouldn't block the response.
  ;(async () => {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const client = createClient(url, serviceKey)
      const { error } = await client.from('function_metrics').insert(row)
      if (error) console.warn(`[metrics] insert failed for ${m.functionName}:`, error.message)
    } catch (err) {
      console.warn(`[metrics] unexpected error for ${m.functionName}:`, (err as Error).message)
    }
  })()
}
