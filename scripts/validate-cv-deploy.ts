// scripts/validate-cv-deploy.ts
//
// Post-deploy validation for the cv_model='sonnet' flag introduced in
// PR #284. Test tooling only — ZERO production code changes. Lives in
// scripts/ alongside the bake-off harness; ships in the ramp PR
// (alongside the OpenRouter retry-parity wrapper + "OpenAI error:"
// label fix) rather than its own PR.
//
// What it does (in order):
//   1. Resolve a user JWT for the calls. Two paths, in priority order:
//        (i)  ELI_JWT env var pre-supplied — used as-is. Preferred for
//             captcha-protected projects: the production sign-in flow
//             gates email/password requests behind a captcha challenge
//             the script can't solve, so headless sign-in returns 400
//             "captcha verification process failed". Skipping sign-in
//             dodges the gate entirely.
//        (ii) Fallback: sign in via supabase-js using anon key +
//             ELI_EMAIL / ELI_PASSWORD from env. Works on projects
//             without captcha enforcement, or with the script's IP
//             allowlisted. Sign-in errors are logged and surface a
//             hint to use the ELI_JWT path instead.
//      In both paths the JWT stays in closure — never printed, never
//      written to disk.
//   2. Three sequential POSTs against the deployed function:
//        (a) cv_model='sonnet', no JD                — Sonnet smoke
//        (b) no cv_model              (default)      — gpt-4o parity
//        (c) cv_model='sonnet' + a JD picked for     — Pass-3 (retry)
//            high niche-tool density                   on Sonnet path
//   3. Raw responses + PDFs land in /tmp/cv-validate/.
//   4. Sleep 6s for the fire-and-forget metric inserts in
//      _shared/metrics.ts to land, then read function_metrics via a
//      separate service-role client and print a PASS/FAIL table.
//
// Detection method for Pass-3-fired (no production code change, so no
// `pass3_fired` field on the response):
//   Two signals from function_metrics, evaluated in this order:
//     - PRIMARY: tokens_out ratio (c) / (a). Pass-2 alone emits one CV
//       JSON (~1500-2500 output tokens for a 5-experience profile).
//       Pass-2 + Pass-3 emits two full CVs (~3000-5000 output tokens).
//       Ratio >= 1.5 strongly suggests retry fired. Robust to
//       grounded-vs-sparse ABOUT_ME length differences (3-4 sentences
//       vs 1-2 — single-CV magnitude difference dwarfed by the second
//       full CV emission).
//     - SECONDARY: absolute tokens_out for (c). If >= 2500, retry
//       almost certainly fired regardless of (a) baseline; if < 1800,
//       retry almost certainly did NOT fire.
//   Both signals are printed alongside a verdict. Tie / indeterminate
//   case prints UNCERTAIN and the user judges from raw numbers.
//
// JD pick rationale (jobs.id = '18d0d755-58be-4fde-a51f-fac068893a3b'):
//   Guidde "SMB Customer Success Manager" — chosen over the LayerX
//   Senior Technical CSM and Upwind CSM. Three reasons:
//     1. Title is the closest match to the target role ("Customer
//        Success Specialist") — keeps overlap above the 30% retry
//        eligibility floor instead of forcing the "role is genuinely
//        a stretch" skip branch.
//     2. JD has ~5-6 generic CS phrases Eli's profile names
//        (customer success, adoption, renewals, onboarding,
//        engagement) — gives Pass 1 keyword extraction enough phrases
//        the user has SOMEWHERE to push overlapPct >= 30%.
//     3. JD also names 4-5 specific tools / methodologies Eli does NOT
//        have (HubSpot, Intercom, Mixpanel, video documentation,
//        digital adoption platform, pooled portfolio, scaled CS
//        playbooks). Pass 2 CV will include the generic ones but
//        cannot include the specific ones (the prompt forbids it),
//        dropping preliminaryPct below 50%. Both retry-gate conditions
//        cleared — retry fires deterministically.
//
// Reliability note: any LLM-driven decision is probabilistic. If the
// Pass-3 signal comes back UNCERTAIN, rerun and report the band. The
// JD pick maximises P(retry fires) but doesn't guarantee it.
//
// Run command is staged at the bottom of this file's comments AND in
// the chat message that ships this script for review.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
// Mirrors how src/api/supabaseClient.js reads the anon key. tsx surfaces
// .env.local via Vite's loader only at build time; the script reads from
// process.env directly (the run command sources .env.local explicitly).
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// Primary auth path (captcha-safe): caller pre-supplies a fresh JWT.
const ELI_JWT = process.env.ELI_JWT || "";
// Fallback auth path: email/password sign-in via supabase-js. Works only
// when the project has no captcha protection on the password flow.
const ELI_EMAIL = process.env.ELI_EMAIL || "";
const ELI_PASSWORD = process.env.ELI_PASSWORD || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) {
  console.error("ERROR: set SUPABASE_URL, SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY), SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!ELI_JWT && (!ELI_EMAIL || !ELI_PASSWORD)) {
  console.error("ERROR: provide either ELI_JWT (preferred) OR ELI_EMAIL+ELI_PASSWORD (fallback; blocked on captcha-protected projects)");
  process.exit(1);
}

const OUT_DIR = "/tmp/cv-validate";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-tailored-cv`;
const TARGET_ROLE = "Customer Success Specialist";

// Pinned by id so the script keeps reproducing the same call shape even
// if the jobs row drifts out of the top-N niche-density ranking. The id
// is non-secret and stable; the description is fetched at runtime via
// service-role.
const PASS3_JOB_ID = "18d0d755-58be-4fde-a51f-fac068893a3b";

interface CallSpec {
  label: string;
  body: Record<string, unknown>;
}

interface CallResult {
  label: string;
  http_status: number;
  ok: boolean;
  started_at: Date;
  response: any;
  pdf_path: string | null;
  pdf_bytes: number | null;
  raw_path: string;
}

function maskError(msg: string): string {
  // Defensive — strip any Authorization-looking substring before echo.
  return String(msg).replace(/Bearer\s+[A-Za-z0-9\-_.=]+/g, "Bearer <redacted>");
}

async function downloadPdf(cvUrl: string | null | undefined, label: string): Promise<{ path: string | null; bytes: number | null }> {
  if (!cvUrl) return { path: null, bytes: null };
  try {
    const res = await fetch(cvUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.error(`  pdf download for ${label} HTTP ${res.status}`);
      return { path: null, bytes: null };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${OUT_DIR}/${label}.pdf`;
    writeFileSync(path, buf);
    return { path, bytes: buf.length };
  } catch (e) {
    console.error(`  pdf download for ${label} failed:`, maskError((e as Error)?.message || String(e)));
    return { path: null, bytes: null };
  }
}

async function callDeployedFn(jwt: string, spec: CallSpec): Promise<CallResult> {
  const startedAt = new Date();
  console.error(`\n→ ${spec.label}`);
  console.error(`  body keys: ${Object.keys(spec.body).join(", ")}`);

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(spec.body),
    // 90s — generous; Pass 2 + Pass 3 + reconcile + render typically
    // finishes well under 60s, but Sonnet+retry occasionally pushes 45-50s.
    signal: AbortSignal.timeout(90_000),
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { _parse_error: true, raw_text: text.slice(0, 500) };
  }

  const rawPath = `${OUT_DIR}/${spec.label}.json`;
  writeFileSync(rawPath, JSON.stringify(parsed, null, 2));

  console.error(`  HTTP ${res.status} | ok=${res.ok}`);
  if (parsed?.cv_url) console.error(`  cv_url=${parsed.cv_url.slice(0, 80)}…`);
  if (parsed?.error) console.error(`  error=${maskError(parsed.error).slice(0, 200)}`);
  if (parsed?.reconcile_warnings) console.error(`  reconcile_warnings=${JSON.stringify(parsed.reconcile_warnings).slice(0, 200)}`);
  if (parsed?.unsourced_bullets) console.error(`  unsourced_bullets count=${parsed.unsourced_bullets.length}`);

  const { path: pdf_path, bytes: pdf_bytes } = await downloadPdf(parsed?.cv_url, spec.label);
  return { label: spec.label, http_status: res.status, ok: res.ok, started_at: startedAt, response: parsed, pdf_path, pdf_bytes, raw_path: rawPath };
}

interface MetricRow {
  created_at: string;
  ok: boolean;
  http_status: number;
  model_used: string | null;
  latency_ms: number;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number | null;
}

async function fetchMetricsSince(serviceClient: any, userId: string, sinceIso: string): Promise<MetricRow[]> {
  const { data, error } = await serviceClient
    .from("function_metrics")
    .select("created_at, ok, http_status, model_used, latency_ms, tokens_in, tokens_out, cost_usd")
    .eq("function_name", "generate-tailored-cv")
    .eq("user_id", userId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`function_metrics query failed: ${error.message}`);
  return (data || []) as MetricRow[];
}

interface Verdict { tag: string; detail: string }

function verdictModelOk(row: MetricRow | undefined, expectedModel: string): Verdict {
  if (!row) return { tag: "FAIL", detail: "no metric row" };
  if (!row.ok) return { tag: "FAIL", detail: `ok=false http=${row.http_status}` };
  if (row.model_used !== expectedModel) return { tag: "FAIL", detail: `model_used=${row.model_used} (expected ${expectedModel})` };
  return { tag: "PASS", detail: `ok=true model=${row.model_used}` };
}

function verdictPass3Fired(rowA: MetricRow | undefined, rowC: MetricRow | undefined): Verdict {
  if (!rowA?.tokens_out || !rowC?.tokens_out) return { tag: "UNCERTAIN", detail: "missing tokens_out" };
  const ratio = rowC.tokens_out / rowA.tokens_out;
  const absC = rowC.tokens_out;
  // Primary: ratio. Secondary: absolute floor / ceiling.
  if (ratio >= 1.5 && absC >= 2500) return { tag: "PASS", detail: `ratio=${ratio.toFixed(2)}x abs=${absC} (both signals)` };
  if (ratio >= 1.5)                 return { tag: "PASS", detail: `ratio=${ratio.toFixed(2)}x abs=${absC} (ratio only — abs below 2500 ceiling, retry probably fired)` };
  if (absC >= 2500)                 return { tag: "PASS", detail: `abs=${absC} ratio=${ratio.toFixed(2)}x (abs only — ratio below 1.5x, retry probably fired)` };
  if (absC < 1800 && ratio < 1.3)   return { tag: "FAIL", detail: `ratio=${ratio.toFixed(2)}x abs=${absC} (retry almost certainly did NOT fire)` };
  return { tag: "UNCERTAIN", detail: `ratio=${ratio.toFixed(2)}x abs=${absC} (between bands — judge from raw)` };
}

function verdictReconcileClean(call: CallResult): Verdict {
  const warnings = call.response?.reconcile_warnings;
  if (!warnings || (Array.isArray(warnings) && warnings.length === 0)) return { tag: "PASS", detail: "absent or empty" };
  return { tag: "WARN", detail: `${warnings.length} warning(s): ${JSON.stringify(warnings).slice(0, 200)}` };
}

// Decode the user_id (`sub` claim) out of a JWT without verifying the
// signature. Signature verification needs the issuer's JWKS — overkill
// for a read-only test harness, and we already trust the JWT because it
// reaches the deployed function the same way. We need user_id only to
// scope the function_metrics SELECT to the right row.
function decodeJwtSub(jwt: string): string {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("ELI_JWT does not look like a JWT (expected 3 dot-separated segments)");
  // URL-safe base64 → standard base64, then pad.
  let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch (e) {
    throw new Error(`ELI_JWT payload is not JSON: ${(e as Error).message}`);
  }
  if (!payload?.sub || typeof payload.sub !== "string") throw new Error("ELI_JWT payload has no 'sub' claim");
  // Don't echo the rest of the claims — could include email, expiry, etc.
  // user_id (`sub`) is fine to surface because it's already in
  // function_metrics rows which the script reads downstream.
  return payload.sub;
}

interface AuthResolution {
  jwt: string;
  userId: string;
  source: "env" | "password";
  // Defined only when source === 'password'. Lets main() sign out at
  // the end to retire the session token, since we created it.
  signOut?: () => Promise<void>;
}

async function resolveAuth(): Promise<AuthResolution> {
  if (ELI_JWT) {
    console.error("→ using ELI_JWT from env (skipping password sign-in)");
    const userId = decodeJwtSub(ELI_JWT);
    console.error(`  decoded sub (user_id) from JWT: ${userId}`);
    return { jwt: ELI_JWT, userId, source: "env" };
  }
  // Fallback path. Requires anon-client sign-in; will fail with
  // "captcha verification process failed" on projects with captcha
  // enforcement enabled on the password flow.
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  console.error("→ signing in (anon key + email/password)…");
  const { data, error } = await anonClient.auth.signInWithPassword({ email: ELI_EMAIL, password: ELI_PASSWORD });
  if (error || !data?.session?.access_token) {
    const msg = error?.message || "no session returned";
    console.error(`ERROR: sign-in failed: ${msg}`);
    if (/captcha/i.test(msg)) {
      console.error("HINT: project enforces captcha on the password flow — use the ELI_JWT env-var path instead.");
    }
    process.exit(1);
  }
  console.error(`  signed in as ${data.user!.email} (user_id=${data.user!.id})`);
  return {
    jwt: data.session.access_token,
    userId: data.user!.id,
    source: "password",
    signOut: async () => { await anonClient.auth.signOut(); },
  };
}

async function main(): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const { jwt, userId, source, signOut } = await resolveAuth();
  console.error(`  auth source: ${source}`);
  // No JWT echo. The closure holds it; nothing else references it post this point.

  // Service-role client for the JD fetch + the post-run metrics read.
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  console.error(`→ fetching JD for call (c) — jobs.id=${PASS3_JOB_ID}…`);
  const { data: jobRow, error: jobErr } = await svc
    .from("jobs")
    .select("title, company_name, description")
    .eq("id", PASS3_JOB_ID)
    .maybeSingle();
  if (jobErr || !jobRow) {
    console.error(`ERROR: JD fetch failed: ${jobErr?.message || "not found"}`);
    process.exit(1);
  }
  console.error(`  JD: "${jobRow.title}" @ ${jobRow.company_name} (${(jobRow.description || "").length} chars)`);

  const calls: CallSpec[] = [
    { label: "a_sonnet_nojd",     body: { target_role: TARGET_ROLE, cv_model: "sonnet" } },
    { label: "b_default_nojd",    body: { target_role: TARGET_ROLE } },
    { label: "c_sonnet_jd_retry", body: { target_role: TARGET_ROLE, cv_model: "sonnet", job_description: jobRow.description } },
  ];

  const runStart = new Date();
  const results: CallResult[] = [];
  for (const spec of calls) {
    const r = await callDeployedFn(jwt, spec);
    results.push(r);
  }

  // Fire-and-forget metric inserts (see _shared/metrics.ts:78-108) —
  // give them ~6s to land. Each call's metric is enqueued at finally; a
  // small grace beats any racy SELECT.
  console.error(`\n→ waiting 6s for fire-and-forget metric inserts…`);
  await new Promise((resolve) => setTimeout(resolve, 6_000));

  const sinceIso = new Date(runStart.getTime() - 5_000).toISOString();
  const metrics = await fetchMetricsSince(svc, userId, sinceIso);
  console.error(`→ fetched ${metrics.length} metric row(s) since ${sinceIso}`);

  // Pair metric rows to calls by chronological order (sequential calls,
  // monotonic created_at). Should be 3 rows; if not, log the mismatch.
  if (metrics.length !== results.length) {
    console.error(`WARNING: expected ${results.length} metric rows, got ${metrics.length} — pairing may be off`);
  }
  const metricByLabel: Record<string, MetricRow | undefined> = {};
  for (let i = 0; i < results.length; i++) metricByLabel[results[i].label] = metrics[i];

  // ─── PASS/FAIL table ───────────────────────────────────────────────
  console.error("\n╭─ VALIDATION SUMMARY ─────────────────────────────────");
  for (const r of results) {
    const m = metricByLabel[r.label];
    const expectedModel = r.label === "b_default_nojd" ? "gpt-4o" : "claude-sonnet-4-6";
    const v_model = verdictModelOk(m, expectedModel);
    const v_rec = verdictReconcileClean(r);
    const unsourced = Array.isArray(r.response?.unsourced_bullets) ? r.response.unsourced_bullets.length : 0;
    console.error(`│`);
    console.error(`│ ${r.label}`);
    console.error(`│   model+ok ........... ${v_model.tag.padEnd(9)} ${v_model.detail}`);
    console.error(`│   reconcile_warnings.. ${v_rec.tag.padEnd(9)} ${v_rec.detail}`);
    console.error(`│   unsourced_bullets... ${unsourced} (printed, not gated)`);
    if (unsourced > 0) {
      for (const u of r.response.unsourced_bullets.slice(0, 3)) {
        console.error(`│     - [${u.bucket}] tokens=${JSON.stringify(u.tokens)} bullet="${(u.bullet || "").slice(0, 80)}…"`);
      }
    }
    console.error(`│   latency ............ ${m?.latency_ms ?? "?"}ms`);
    console.error(`│   tokens in/out ...... ${m?.tokens_in ?? "?"} / ${m?.tokens_out ?? "?"}`);
    console.error(`│   cost_usd ........... $${m?.cost_usd?.toFixed(4) ?? "?"}`);
    console.error(`│   raw ................ ${r.raw_path}`);
    console.error(`│   pdf ................ ${r.pdf_path ?? "(none)"} ${r.pdf_bytes ? `(${r.pdf_bytes} bytes)` : ""}`);
  }
  console.error(`│`);
  const v_pass3 = verdictPass3Fired(metricByLabel["a_sonnet_nojd"], metricByLabel["c_sonnet_jd_retry"]);
  console.error(`│ Pass-3-fired on (c) .... ${v_pass3.tag.padEnd(9)} ${v_pass3.detail}`);
  console.error(`│   method ............... tokens_out heuristic (no production code change → no pass3_fired field)`);
  console.error(`╰──────────────────────────────────────────────────────`);

  console.error(`\nOpen the PDFs:`);
  for (const r of results) {
    if (r.pdf_path) console.error(`  open ${r.pdf_path}`);
  }
  console.error(`\nRaw responses:`);
  for (const r of results) console.error(`  jq . ${r.raw_path}`);

  // Sign out only if we created the session via the password fallback.
  // For the ELI_JWT path the token's lifecycle belongs to whoever minted
  // it (the browser session); the script must not revoke it on the way
  // out, since that would invalidate the user's still-active browser tab.
  if (signOut) await signOut();
}

main().catch((e) => {
  console.error("FATAL:", maskError((e as Error)?.message || String(e)));
  process.exit(1);
});

// Staged run (HOLD-FOR-REVIEW, zsh — JWT path, captcha-safe):
//
//   read -s "ELI_JWT?ELI_JWT: "; echo; \
//   SUPABASE_URL=https://ilmqmodklutztuybsvwd.supabase.co \
//   SUPABASE_ANON_KEY="$(grep ^VITE_SUPABASE_ANON_KEY .env.local | cut -d= -f2-)" \
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
//   ELI_JWT="$ELI_JWT" \
//     npx tsx scripts/validate-cv-deploy.ts \
//       2>&1 | tee /tmp/cv-validate.log; \
//   unset ELI_JWT
//
// JWT capture in DevTools console (sign in at https://getajob.careers first):
//   JSON.parse(localStorage.getItem('sb-ilmqmodklutztuybsvwd-auth-token')).access_token
// Then paste at the ELI_JWT prompt. The terminal won't echo it.
