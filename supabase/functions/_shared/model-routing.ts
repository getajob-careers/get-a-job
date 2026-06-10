// model-routing.ts — small job-to-model map.
//
// Keys describe what a call DOES, not who calls it. The 4 user-facing
// conversational agents collapse to one job ("chat-agent") regardless of
// whether the agent merge has happened yet. The dozen-or-so background
// structured-extract functions share one job ("structured-extract").
// Resume extraction is its own job ("resume-extractor") because it has
// distinct requirements: single-shot, structured JSON output, latency-
// sensitive (onboarding spinner).
//
// Why job keys, not agent keys: avoids a per-agent override matrix across
// today's dozen agents. The map describes intent; callers consult it once.
// Adding a non-OpenAI model later means adding ONE entry per job, not
// remapping every agent string.
//
// Current scope: resume-extractor and proof-signals read from this layer
// in production. The other two job entries (chat-agent, structured-extract)
// are placeholders that document intent for the upcoming agent-merge work;
// they're not wired anywhere yet, so changing them won't affect production
// until a future PR.
//
// Why proof-signals gets its own key (and not the structured-extract
// umbrella): the bake-off result for proof-signals doesn't necessarily
// transfer to other extract-* functions (extract-job-requirements,
// extract-story-from-text, etc.). Each function has different input
// shape, output shape, and latency tolerance. Same precedent as
// resume-extractor — it has its own key because its bake-off result
// is specific to that surface.

export type JobKey =
  | 'chat-agent'
  | 'resume-extractor'
  | 'proof-signals'
  | 'structured-extract';

export type Transport = 'openai' | 'openrouter';

// reasoning_effort param shape for gpt-5.x and o-series. Values per
// OpenAI Chat Completions docs (Nov 2026): "none" | "low" | "medium"
// (default) | "high" | "xhigh". "none" is the lowest; OpenAI explicitly
// recommends it for "fast information retrieval and classification" —
// which is exactly what resume-extractor does. Older gpt-5 versions used
// "minimal" instead of "none" for the lowest setting; gpt-5.5 standardised
// on "none".
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';

export interface ModelRoute {
  model: string;
  transport: Transport;
  // Optional request-shaping defaults the caller applies. None of these
  // are forced — a caller that needs to override for one specific reason
  // can ignore the route entry and use its own values.
  response_format?: { type: 'json_object' };
  temperature?: number;
  reasoning_effort?: ReasoningEffort;
  // Optional per-route completion cap. Reasoning models (gpt-5.x,
  // o-series) count hidden thinking against this cap, so the bake-off-
  // proven value for resume-extractor is much higher (16000) than the
  // ai-chat global default of 2048 / 4096. Callers MUST use this when
  // present on the route, otherwise fall through to whatever cap they'd
  // pass for the non-routed path. Only applies to the reasoning branch
  // in callOpenAI (max_completion_tokens); non-reasoning agents keep
  // the global max_tokens budget.
  max_completion_tokens?: number;
}

// IMPORTANT: changing the chat-agent or structured-extract routes here is
// a no-op until those jobs are wired to consult this map. Only resume-
// extractor currently reads from ROUTES (ai-chat/index.ts), so a change
// to the other two has zero production effect.
export const ROUTES: Record<JobKey, ModelRoute> = {
  // Unchanged from production today. After the agent-merge PR, the unified
  // chat agent points here. Bake-off may swap the model to a non-OpenAI
  // candidate via { transport: 'openrouter' } — the shape supports it.
  'chat-agent': {
    model: 'gpt-4o-mini',
    transport: 'openai',
    temperature: 0.4,
  },

  // Resume-extractor sits on gpt-5.4-mini since the model-swap PR. The
  // bake-off across 5 direct-OpenAI controls (gpt-4o-mini, gpt-4o,
  // gpt-4.1-mini, gpt-5.4-mini, gpt-5.5) plus 4 OpenRouter models picked
  // gpt-5.4-mini for the right cost/latency/quality balance on the
  // onboarding spinner. Two paired settings make this work:
  //
  //   - `reasoning_effort: 'none'` — gpt-5.x's lowest effort level (replaces
  //     "minimal" from earlier gpt-5 releases). OpenAI explicitly recommends
  //     it for "fast information retrieval and classification" — exactly
  //     what resume-extractor does.
  //   - `max_completion_tokens: 16000` — reasoning models count hidden
  //     thinking against this cap, so the bake-off-validated value is 8x
  //     the ai-chat global default of 2048. Held at 16000 to mirror the
  //     bake-off run that produced clean JSON 19/19; "none" effort won't
  //     approach it but a high ceiling protects against the truncation
  //     failure mode PR #277 fixed (truncated JSON → silent zero-experience
  //     parse loss).
  //
  // The standing translation contract on ai-chat callOpenAI (max_tokens →
  // max_completion_tokens when route.reasoning_effort is set) is now live
  // — see supabase/functions/ai-chat/index.ts. Adding a future reasoning
  // model to any other route here will just work as long as it includes
  // reasoning_effort + max_completion_tokens.
  //
  // Response_format json_object stays — it's the parse-reliability fix
  // from PR #277 and is independent of the model swap.
  'resume-extractor': {
    model: 'gpt-5.4-mini',
    transport: 'openai',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    reasoning_effort: 'none',
    max_completion_tokens: 16000,
  },

  // Proof-signals sits on gpt-5.4-mini per the bake-off in PR #282.
  // Same shape as resume-extractor (reasoning model, structured JSON
  // output, latency-sensitive surface). Pairing matters:
  //
  //   - `reasoning_effort: 'none'` — bake-off ran with effort='none' and
  //     gpt-5.4-mini won. Higher effort would defeat the cost/latency
  //     win that produced the swap decision.
  //   - `max_completion_tokens: 16000` — reasoning models count hidden
  //     thinking against this cap. The prior production cap was 4000
  //     (max_tokens for gpt-4o); 16000 mirrors the resume-extractor
  //     ceiling and the bake-off harness, so a future effort bump
  //     can't trip the silent-truncation failure mode PR #277 fixed.
  //
  // extract-proof-signals/index.ts consults this entry directly at
  // module load. The body it sends matches the contract documented on
  // resume-extractor above: max_tokens replaced by max_completion_tokens
  // when reasoning_effort is set, no temperature/format coercion.
  //
  // response_format json_object stays — the prompt's "Return ONLY valid
  // JSON" instruction is the spec, and the stripped prompt (PR #282)
  // didn't change that contract.
  'proof-signals': {
    model: 'gpt-5.4-mini',
    transport: 'openai',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    reasoning_effort: 'none',
    max_completion_tokens: 16000,
  },

  // Placeholder — the OTHER structured-extract functions (extract-job-
  // requirements, extract-story-from-text, extract-cv-text-no-LLM, etc.)
  // still hold their own model constants. Documented here for the
  // eventual consolidation; nothing reads it now. extract-proof-signals
  // graduated to its own key above after the PR #282 bake-off.
  'structured-extract': {
    model: 'gpt-4o-mini',
    transport: 'openai',
    response_format: { type: 'json_object' },
    temperature: 0.2,
  },
};

export function routeFor(job: JobKey): ModelRoute {
  const r = ROUTES[job];
  if (!r) throw new Error(`unknown job key: ${job}`);
  return r;
}
