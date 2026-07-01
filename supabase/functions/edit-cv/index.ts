// edit-cv — apply a natural-language instruction to a structured cv_data and
// return the edited cv_data + a one-line assistant message. Powers the CV Agent
// chat's GENERAL edits ("rewrite my summary", "tighten bullets", "add keywords",
// free-form). This is NOT JD tailoring — that stays in refine-cv.
//
// Grounding: the model only rephrases / restructures / reorders / tightens the
// candidate's EXISTING content. It must not invent employers, titles, dates,
// metrics, skills, or schools. A light structural guard rejects edits that would
// drop a section. v1 leans on the prompt for fact-grounding (the heavier
// anti-fabrication gates live in generate-tailored-cv / refine-cv).
//
// Direct-invoke shape (authenticated AS the owning user):
//   POST /functions/v1/edit-cv
//   { "cv_data": { ...structured CV... }, "instruction": "tighten my bullets" }

import { createClient } from "npm:@supabase/supabase-js@2";
import { openaiChatCompletionWithRetry } from "../_shared/openai-chat.ts";
import { parseLlmJsonObject } from "../_shared/json-parse.ts";
import { applyAntiFabGate } from "../_shared/cv-antifab.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MODEL = "gpt-4o";

const SYSTEM = `You are a precise CV editor. You receive a candidate's CV as structured JSON and ONE instruction. Apply only that instruction and return the COMPLETE edited CV with the EXACT same JSON structure and keys.

Hard rules:
- NEVER invent facts. Do not add employers, job titles, dates, numbers/metrics, tools, skills, schools, or achievements that are not already present in the input. You may only rephrase, tighten, reorder, merge, or split content that is already there. "Add keywords" means surface skills/terms already implied by the existing content — not fabricate new experience.
- NEVER drop sections, entries, or bullets that exist in the input unless the instruction explicitly says to remove them.
- Preserve shapes exactly: experience/education "dates" stay strings, "bullets" stay arrays of plain strings, "skills" stays the { domain, tools, technical, languages } object, "header" keeps its fields.
- Keep it concise and ATS-friendly.
- SCOPE (be honest, never silently no-op): you can ONLY edit THIS CV document. You do NOT have access to the user's saved Profile or Experiences. If the instruction asks to change their SAVED profile / experiences / bullets everywhere (e.g. "fix the duplicate bullets in my profile", "delete this from my experience", "update my saved CV"), do NOT pretend to. Return the cv_data UNCHANGED and set message to exactly: "I can edit this CV document, but I can't change your saved profile. To fix your experience or bullets everywhere, edit them in your Profile page." If the instruction is about THIS document (rephrase, tighten, reorder, or dedupe the visible bullets), apply it normally.

Return JSON only: { "cv_data": <the full edited CV object>, "message": "<one short sentence describing what you changed>" }.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    if (JSON.stringify(body ?? {}).length > 100_000) return json({ error: "Request payload too large." }, 413);

    const cv_data = body?.cv_data;
    const instruction = String(body?.instruction ?? "").slice(0, 2000).trim();
    if (!cv_data || typeof cv_data !== "object" || Array.isArray(cv_data)) {
      return json({ error: "cv_data (object) is required." }, 400);
    }
    if (!instruction) return json({ error: "instruction is required." }, 400);

    // LLM call — 30/hour, same ceiling as generate-tailored-cv.
    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "edit-cv",
      p_max_calls: 30,
      p_window_seconds: 3600,
    });
    if (!allowed) return json({ error: "Rate limit exceeded. Try again in an hour." }, 429);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "CV editing is not configured." }, 500);

    const response = await openaiChatCompletionWithRetry(
      {
        model: MODEL,
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `INSTRUCTION:\n${instruction}\n\nCURRENT CV (JSON):\n${JSON.stringify(cv_data)}` },
        ],
      },
      openaiKey,
      { traceName: "edit-cv", userId: user.id },
      { signal: AbortSignal.timeout(45000) },
    );
    if (!response.ok) return json({ error: "The editor couldn't process that — try again." }, 502);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = parseLlmJsonObject(raw, "edit-cv", data.choices?.[0]?.finish_reason || "");
    const edited = (parsed as { cv_data?: Record<string, unknown> })?.cv_data;

    // Structural guard — never let a bad edit nuke the CV or drop a core section.
    if (!edited || typeof edited !== "object" || Array.isArray(edited)) {
      return json({ cv_data, message: "I couldn't apply that cleanly, so I left your CV unchanged." });
    }
    for (const k of ["professional_experiences", "education"]) {
      if (Array.isArray((cv_data as any)[k]) && (cv_data as any)[k].length > 0 && !Array.isArray((edited as any)[k])) {
        return json({ cv_data, message: "I skipped that edit because it would have dropped a whole section." });
      }
    }

    // Anti-fabrication gate: trace the edit against the pre-edit cv_data (the
    // user's own source — no JD, no master fetch). Per-entry bullet revert +
    // facts-immutable: apply the safe rephrasing, silently restore anything that
    // invented a metric/tool/company or rewrote a title/employer/date.
    const guard = applyAntiFabGate(
      cv_data as Record<string, unknown>,
      edited as Record<string, unknown>,
    );
    const rawMsg = (parsed as { message?: unknown })?.message;
    const llmMsg = typeof rawMsg === "string" && rawMsg.trim()
      ? rawMsg.trim()
      : "Done — applied your change.";
    const anyReverted = guard.bulletsReverted > 0 || guard.summaryReverted || guard.factsReverted > 0;
    const message = anyReverted
      ? `${llmMsg} (Kept some content exactly as written — I only rephrase what's already in your CV, I don't add facts.)`
      : llmMsg;

    return json({ cv_data: guard.cv_data, message });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "edit-cv failed" }, 500);
  }
});
