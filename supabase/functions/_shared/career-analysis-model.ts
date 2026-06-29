// Model selection + request-payload shape for generate-career-analysis.
// Extracted from the handler so the reasoning-vs-default payload is unit-testable
// without importing the Deno.serve handler.
//
// gpt-5.4-mini won the 2026-06 bake-off (docs/research/career-analysis-model-eval-
// 2026-06.md). It is a gpt-5.x REASONING model, so it CANNOT take max_tokens; it
// requires max_completion_tokens + reasoning_effort, mirroring model-routing.ts
// ROUTES.resume-extractor / proof-signals. The 16000 budget with reasoning_effort
// 'none' (so ~0 hidden-thinking tokens) is what prevents truncation on the
// 15-role prompts whose visible output reached ~4600 tokens, over the old 4500.

export const DEFAULT_MODEL = "gpt-4o";
export const REASONING_MODEL = "gpt-5.4-mini";
export const DEFAULT_MAX_TOKENS = 4500;
export const REASONING_MAX_COMPLETION_TOKENS = 16000;

// Decide the model from the opt-in flag. Default is gpt-4o. Two levers so test
// traffic can be targeted: a per-request body field `analysis_model` or the env
// CAREER_ANALYSIS_MODEL (global). Anything other than the reasoning model name
// (including absent) resolves to the default.
export function selectAnalysisModel(
  bodyAnalysisModel: unknown,
  envModel: string | null | undefined,
): string {
  if (bodyAnalysisModel === REASONING_MODEL || envModel === REASONING_MODEL) {
    return REASONING_MODEL;
  }
  return DEFAULT_MODEL;
}

// Build the OpenAI chat-completion payload for the chosen model. Reasoning models
// get max_completion_tokens + reasoning_effort and NO max_tokens; the default
// gets max_tokens. response_format json_object on both (parse-reliability).
export function buildAnalysisPayload(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
): Record<string, unknown> {
  const reasoning = modelName === REASONING_MODEL;
  return {
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: reasoning ? 0.2 : 0.4,
    response_format: { type: "json_object" },
    ...(reasoning
      ? {
          max_completion_tokens: REASONING_MAX_COMPLETION_TOKENS,
          reasoning_effort: "none",
        }
      : { max_tokens: DEFAULT_MAX_TOKENS }),
  };
}
