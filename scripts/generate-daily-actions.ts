// scripts/generate-daily-actions.ts
//
// Nightly daily-action precompute. Iterates every user with
// onboarding_complete=true and invokes cron-generate-daily-action once
// per user. By the time anyone opens Home in the morning, today's row
// already exists in daily_actions — the card loads in ~50ms instead of
// blocking on an 8–25s LLM call.
//
// Idempotency: cron-generate-daily-action short-circuits if today's row
// exists. Safe to re-run within the same day (e.g., to retry after a
// partial failure) without double-inserting or burning extra OpenAI.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/generate-daily-actions.ts
//   npx tsx scripts/generate-daily-actions.ts --dry-run    # log users, no calls
//
// Exit codes:
//   0  — success (or <20% of users failed)
//   1  — fatal config error OR >20% of users failed (alerts the GHA run)

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FAILURE_THRESHOLD_PCT = 20;
const PER_USER_TIMEOUT_MS = 30_000;
// Sequential invocations — generate-daily-action makes 1 OpenAI call
// per user (gpt-4o-mini, ~1-2s). At pilot scale (100 users × ~2s =
// ~3-4 min total) sequential is fine. Going parallel would risk
// OpenAI rate-limit fanout during the cron window; the streaming-chat
// retro (PR R1) reminded us how that ripples into other functions.
const CONCURRENCY = 1;

const DRY_RUN = process.argv.includes("--dry-run");

interface UserResult {
  user_id: string;
  status: "ok" | "cached" | "error";
  http_status?: number;
  error?: string;
  elapsed_ms: number;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`[daily-actions-cron] starting${DRY_RUN ? " (dry-run)" : ""}`);
  const t0 = Date.now();

  const { data: users, error: usersErr } = await client
    .from("profiles")
    .select("id")
    .eq("onboarding_complete", true);

  if (usersErr) {
    console.error("[daily-actions-cron] failed to fetch users:", usersErr);
    process.exit(1);
  }

  const userIds: string[] = (users ?? []).map((u: { id: string }) => u.id);
  console.log(`[daily-actions-cron] ${userIds.length} active users`);

  if (DRY_RUN) {
    for (const id of userIds) console.log(`  would generate for ${id}`);
    console.log(`[daily-actions-cron] dry-run complete in ${Date.now() - t0}ms`);
    process.exit(0);
  }

  if (userIds.length === 0) {
    console.log("[daily-actions-cron] no users to process, exit 0");
    process.exit(0);
  }

  // Sequential (CONCURRENCY=1). If we ever raise CONCURRENCY > 1, batch
  // via a worker pool to avoid spawning N pending fetches at once.
  const results: UserResult[] = [];
  for (const userId of userIds) {
    results.push(await generateForUser(userId));
  }

  const ok = results.filter((r) => r.status === "ok" || r.status === "cached").length;
  const errors = results.filter((r) => r.status === "error");
  const failurePct = userIds.length > 0 ? (errors.length / userIds.length) * 100 : 0;

  const p50 = percentile(results.map((r) => r.elapsed_ms).sort((a, b) => a - b), 0.5);
  const p99 = percentile(results.map((r) => r.elapsed_ms).sort((a, b) => a - b), 0.99);

  console.log(`[daily-actions-cron] done in ${Date.now() - t0}ms`);
  console.log(`  ok: ${ok}/${userIds.length}  errors: ${errors.length}  failure_pct: ${failurePct.toFixed(1)}%`);
  console.log(`  per-user p50: ${p50}ms  p99: ${p99}ms`);

  if (errors.length > 0) {
    console.log(`  error sample (up to 5):`);
    for (const e of errors.slice(0, 5)) {
      console.log(`    ${e.user_id} → ${e.http_status ?? "??"}: ${e.error}`);
    }
  }

  if (failurePct > FAILURE_THRESHOLD_PCT) {
    console.error(`[daily-actions-cron] failure rate ${failurePct.toFixed(1)}% > ${FAILURE_THRESHOLD_PCT}%; exit 1`);
    process.exit(1);
  }
  process.exit(0);
}

async function generateForUser(userId: string): Promise<UserResult> {
  const url = `${SUPABASE_URL}/functions/v1/cron-generate-daily-action`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_USER_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const elapsed = Date.now() - startedAt;

    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      return { user_id: userId, status: "error", http_status: res.status, error: text.slice(0, 200), elapsed_ms: elapsed };
    }

    // status: distinguish "freshly generated" from "row already existed
    // (cached)" using daily_action.created_at vs today's date. Stat is
    // for observability only — both count as success.
    let data: { daily_action?: { created_at?: string } } | null = null;
    try { data = await res.json(); } catch { /* ignore */ }
    const isCached = !!data?.daily_action?.created_at
      && new Date(data.daily_action.created_at).getTime() < startedAt - 1000;
    return { user_id: userId, status: isCached ? "cached" : "ok", http_status: res.status, elapsed_ms: elapsed };
  } catch (err: unknown) {
    clearTimeout(timer);
    const elapsed = Date.now() - startedAt;
    return {
      user_id: userId,
      status: "error",
      error: (err as Error)?.message || String(err),
      elapsed_ms: elapsed,
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

main().catch((err) => {
  console.error("[daily-actions-cron] uncaught:", err);
  process.exit(1);
});
