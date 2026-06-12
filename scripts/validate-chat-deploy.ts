// scripts/validate-chat-deploy.ts
//
// Post-deploy validation for the chat_model='sonnet' flag on the conversational
// chat route (eli/chat-model-sonnet). Test tooling only — ZERO production code.
// Modeled on scripts/validate-cv-deploy.ts.
//
// Runs the 19 FROZEN fixtures (scripts/fixtures/chat-eval-fixtures.json) against
// the DEPLOYED ai-chat function with chat_model='sonnet', and asserts, from the
// function's OWN returned suggested_* fields (so it exercises the real
// extractJsonBlock parse path on Sonnet's actual output):
//   (1) ACTION PARSE PARITY — each fixture's expected action marker comes back
//       parsed (suggested_* populated); must_not_fire markers are absent. This
//       is the live proof Sonnet's fenced JSON parses through production.
//   (2) ANTI-FAB HARD GATE — CHAT-14 must NOT return suggested_cv_generation
//       (the agent refused to fabricate).
//   (3) FOUR ITEM-2 BEHAVIORS via CHAT-16..19:
//        16 dual-context: no spurious action; reply doesn't silently assume a role
//        17 page-deixis / 18 list-deixis: reply admits it can't see the page/list
//        19 capability routing: emits suggested_cv_generation AND no inline CV text
//   (4) MODEL ROUTING — function_metrics.model_used = 'claude-sonnet-4-6' for the
//       conversational calls (confirms the flag routed to Sonnet, not the fallback).
//
// Auth: mints a per-user JWT for Eli via auth.admin.generateLink + verifyOtp
// (service-role, no email sent) — same pattern as test-ai-chat-local-serve.ts.
//
// RUN (after `supabase functions deploy ai-chat`; zsh, from repo root):
//   SUPABASE_URL=https://ilmqmodklutztuybsvwd.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
//   SUPABASE_ANON_KEY="$(grep ^VITE_SUPABASE_ANON_KEY ../getajob/.env.local | cut -d= -f2-)" \
//     npx tsx scripts/validate-chat-deploy.ts 2>&1 | tee /tmp/chat-validate.log

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = resolve(HERE, "fixtures/chat-eval-fixtures.json");
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ilmqmodklutztuybsvwd.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const ELI_EMAIL = process.env.ELI_EMAIL || "elienglard34@gmail.com";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;
const BOUND_USER_ID = "4b243f3a-5035-474e-a89d-aff13fe06cc2";

if (!SERVICE_ROLE || !ANON_KEY) {
  console.error("ERROR: set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function mintUserToken(email: string): Promise<string> {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const hashed = link?.properties?.hashed_token;
  if (!hashed) throw new Error("no hashed_token");
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: otp, error: otpErr } = await anon.auth.verifyOtp({
    token_hash: hashed,
    type: "magiclink",
  });
  if (otpErr) throw new Error(`verifyOtp: ${otpErr.message}`);
  const at = otp?.session?.access_token;
  if (!at) throw new Error("no access_token");
  return at;
}

// Same résumé-in-prose heuristic as the bake-off harness.
function detectInlineCv(prose: string): { isCv: boolean; signals: string[] } {
  const sigs: Array<[string, RegExp]> = [
    ["**Summary**", /\*\*\s*(professional\s+)?summary\s*\*\*/i],
    ["**Experience**", /\*\*\s*(work\s+|professional\s+)?experience\s*\*\*/i],
    ["**Education**", /\*\*\s*education\s*\*\*/i],
    ["**Skills**", /\*\*\s*(key\s+|technical\s+)?skills\s*\*\*/i],
    [
      "[placeholder]",
      /\[(your email|your phone|month,?\s*year|location|linkedin[^\]]*|expected graduation[^\]]*)\]/i,
    ],
    ["bulleted-role-block", /(^|\n)\s*[-•]\s+\S.*\n\s*[-•]\s+\S.*\n\s*[-•]\s+/],
  ];
  const signals = sigs.filter(([, re]) => re.test(prose)).map(([n]) => n);
  return { isCv: signals.length >= 3, signals };
}

const MARKER_TO_FIELD: Record<string, string> = {
  SUGGESTED_TASKS_JSON: "suggested_tasks",
  SUGGESTED_ROADMAP_CHANGES_JSON: "suggested_roadmap_changes",
  SUGGESTED_APPLICATION_ACTIONS_JSON: "suggested_application_actions",
  SUGGESTED_COMPANY_TARGET_JSON: "suggested_company_target_actions",
  SUGGESTED_CV_GENERATION_JSON: "suggested_cv_generation",
  SUGGESTED_STORY_CAPTURE_JSON: "suggested_story_capture",
  SUGGESTED_AGENT_JSON: "suggested_agent",
};

function fired(data: any, field: string): boolean {
  const v = data?.[field];
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

interface Row {
  id: string;
  http: number;
  pass: boolean;
  notes: string[];
}

async function callFn(
  jwt: string,
  fx: any,
): Promise<{ http: number; data: any }> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      message: fx.message,
      agent: fx.agent,
      conversation_history: fx.conversation_history || [],
      chat_model: "sonnet",
      ...(fx.application_id && { application_id: fx.application_id }),
      ...(fx.page_context && { page_context: fx.page_context }),
    }),
    signal: AbortSignal.timeout(120_000),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  return { http: res.status, data };
}

function validate(fx: any, data: any): { pass: boolean; notes: string[] } {
  const notes: string[] = [];
  let pass = true;
  const reply: string = data?.reply ?? "";

  for (const marker of fx.expect || []) {
    if (!fired(data, MARKER_TO_FIELD[marker])) {
      pass = false;
      notes.push(`MISSING expected ${marker}`);
    }
  }
  for (const marker of fx.must_not_fire || []) {
    if (fired(data, MARKER_TO_FIELD[marker])) {
      pass = false;
      notes.push(`SPURIOUS ${marker}`);
    }
  }
  if (fx.hard_gate === "REFUSE" && data?.suggested_cv_generation) {
    pass = false;
    notes.push("ANTI-FAB FAIL: emitted cv_generation on fabrication request");
  }
  if (fx.must_not_contain_inline_cv) {
    const inline = detectInlineCv(reply);
    if (inline.isCv) {
      pass = false;
      notes.push(`INLINE-CV FAIL: ${inline.signals.join(",")}`);
    }
  }
  // CV-gen carry-through (when an application is linked)
  if (
    fx.expect?.includes("SUGGESTED_CV_GENERATION_JSON") &&
    data?.suggested_cv_generation
  ) {
    const cv = data.suggested_cv_generation;
    if (fx.application_id && cv.application_id !== fx.application_id) {
      pass = false;
      notes.push(
        `cv application_id mismatch: ${cv.application_id} != ${fx.application_id}`,
      );
    }
  }
  // B3 visible-list: with a visible list present, the agent must answer FROM it
  // (reply names one of the on-screen titles).
  if (Array.isArray(fx.must_mention_one_of)) {
    const lc = reply.toLowerCase();
    const hit = fx.must_mention_one_of.find((t: string) =>
      lc.includes(t.toLowerCase()),
    );
    if (!hit) {
      pass = false;
      notes.push(`VISIBLE-LIST FAIL: reply names none of the on-screen roles`);
    } else {
      notes.push(`answered from list (${hit})`);
    }
  }
  // B3 sibling: with NO visible list, the agent must ask / say it can't see —
  // a question or an explicit "can't see the list", and must NOT confidently
  // assert a single best role.
  if (fx.must_ask) {
    const asks =
      /\?/.test(reply) ||
      /can'?t see|don'?t see|which (role|one)|not sure which|tell me which|on your screen|name the/i.test(
        reply,
      );
    if (!asks) {
      pass = false;
      notes.push(
        `ASK-FALLBACK FAIL: reply did not ask / disclaim the unseen list`,
      );
    } else {
      notes.push("asked (no visible list)");
    }
  }
  if (notes.length === 0) notes.push("ok");
  return { pass, notes };
}

async function main() {
  const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")).fixtures;
  console.error(`→ minting JWT for ${ELI_EMAIL}…`);
  const jwt = await mintUserToken(ELI_EMAIL);
  const runStart = new Date();

  const rows: Row[] = [];
  for (const fx of fixtures) {
    const { http, data } = await callFn(jwt, fx);
    if (http !== 200) {
      rows.push({
        id: fx.id,
        http,
        pass: false,
        notes: [`HTTP ${http}: ${JSON.stringify(data).slice(0, 120)}`],
      });
      console.error(`  ${fx.id}: HTTP ${http} ✗`);
      continue;
    }
    const v = validate(fx, data);
    rows.push({ id: fx.id, http, pass: v.pass, notes: v.notes });
    console.error(
      `  ${fx.id} (${fx.agent}): ${v.pass ? "✓" : "✗ " + v.notes.join("; ")}`,
    );
  }

  // Model routing check — confirm sonnet actually served the calls.
  console.error("\n→ waiting 6s for function_metrics…");
  await new Promise((r) => setTimeout(r, 6000));
  const sinceIso = new Date(runStart.getTime() - 5000).toISOString();
  const { data: metrics } = await admin
    .from("function_metrics")
    .select("model_used, ok, http_status")
    .eq("function_name", "ai-chat")
    .eq("user_id", BOUND_USER_ID)
    .gte("created_at", sinceIso);
  const sonnetRows = (metrics || []).filter(
    (m: any) => m.model_used === "claude-sonnet-4-6",
  ).length;
  const total = (metrics || []).length;

  // ─── summary ───
  const passed = rows.filter((r) => r.pass).length;
  console.error("\n╭─ CHAT DEPLOY VALIDATION ─────────────────────────────");
  for (const r of rows) {
    console.error(
      `│ ${r.id.padEnd(9)} ${r.pass ? "PASS" : "FAIL"}  ${r.notes.join("; ").slice(0, 90)}`,
    );
  }
  console.error(`│`);
  console.error(`│ fixtures passed ........ ${passed}/${rows.length}`);
  console.error(
    `│ model_used=sonnet ...... ${sonnetRows}/${total} metric rows (expect all conversational on claude-sonnet-4-6)`,
  );
  console.error(
    `│ anti-fab gate (CHAT-14)  ${rows.find((r) => r.id === "CHAT-14")?.pass ? "PASS" : "FAIL"}`,
  );
  console.error(
    `│ deixis/routing 16-19 ... ${rows.filter((r) => ["CHAT-16", "CHAT-17", "CHAT-18", "CHAT-19"].includes(r.id) && r.pass).length}/4`,
  );
  console.error("╰──────────────────────────────────────────────────────");

  if (sonnetRows === 0) {
    console.error(
      "\n⚠️  No claude-sonnet-4-6 metric rows — the flag did NOT route to Sonnet. Check chat_model='sonnet' is sent AND OPENROUTER_API_KEY is set on the project.",
    );
  }
  process.exit(passed === rows.length && sonnetRows > 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});
