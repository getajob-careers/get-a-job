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
// Current scope: ONLY resume-extractor reads from this layer in production.
// The other two job entries are placeholders that document intent for the
// upcoming agent-merge work; they're not wired anywhere yet, so changing
// them won't affect production until a future PR.

export type JobKey =
  | 'chat-agent'
  | 'resume-extractor'
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

  // Reliability fix: response_format json_object eliminates the prefix/
  // suffix-prose failure mode that lost 4 of 19 pilot users' experiences
  // (the production loose-regex parser dropped unparseable replies).
  // Model stays gpt-4o-mini until the bake-off latency for gpt-5.5
  // direct-OpenAI confirms it's acceptable for the onboarding spinner.
  // Swap is two lines: model -> 'gpt-5.5' + add reasoning_effort: 'none'.
  //
  // ⚠️ BEFORE SWAPPING TO gpt-5.5 OR ANY OTHER REASONING MODEL:
  // The OpenAI Chat Completions API rejects `max_tokens` for gpt-5.x and
  // o-series reasoning models with HTTP 400 "Unsupported parameter:
  // 'max_tokens' is not supported with this model, use 'max_completion_
  // tokens' instead." The ai-chat callOpenAI helper currently hardcodes
  // `max_tokens` (see supabase/functions/ai-chat/index.ts callOpenAI). The
  // resume-extractor branch in ai-chat MUST translate to
  // `max_completion_tokens` before the model swap, or every resume-
  // extractor call will 400 in production exactly like the bake-off
  // direct-OpenAI control did 19/19. Specifically:
  //   - If route.reasoning_effort is set: send max_completion_tokens, not
  //     max_tokens. Send reasoning_effort as a top-level body field.
  //   - Otherwise (gpt-4o-mini today): keep max_tokens as-is.
  // Verified pattern: scripts/test-cv-extraction-bakeoff.ts callModel()
  // does this correctly once the reasoning regex matches the bare slug.
  'resume-extractor': {
    model: 'gpt-4o-mini',
    transport: 'openai',
    response_format: { type: 'json_object' },
    temperature: 0.2,
  },

  // Placeholder — the existing structured-extract functions (extract-
  // proof-signals, extract-job-requirements, extract-story-from-text,
  // extract-cv-text-no-LLM, etc.) still hold their own model constants.
  // Documented here for the eventual consolidation; nothing reads it now.
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
