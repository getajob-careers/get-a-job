// scripts/delete-demo-seeds.mjs
//
// ┌─ CANONICAL PATTERN FOR DESTRUCTIVE OPS SCRIPTS ─────────────────────────────┐
// │ Future scripts that delete/overwrite production data should COPY this shape: │
// │   1. DRY RUN by default — print the exact targets (ids + emails) and STOP.   │
// │   2. Real run gated behind an explicit confirm PHRASE, not a bare flag        │
// │      (here: CONFIRM=DELETE-20-SEEDS) so it can never fire by accident.        │
// │   3. A PROTECTED allowlist asserted DISJOINT from the target set — abort on   │
// │      any overlap, and re-check per-account inside the delete loop.            │
// │   4. Target by an EXPLICIT list, never a broad pattern (a '%+%' LIKE would    │
// │      have caught the keepers); resolve ids at runtime so they can't go stale. │
// │   5. Post-run VERIFICATION in the same script (counts + an independent        │
// │      "what's left that matches the rule?" sweep + a CASCADE spot-check).      │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// One-off cleanup: delete the internal +-convention demo/test seed accounts
// (the kill list Eli approved on 2026-06-12) so production metrics stop counting
// ourselves. Service-role admin deletion; data tables FK-CASCADE off auth.users
// (verified: applications/conversations/experiences/stories/profiles ...), so
// auth.admin.deleteUser(id) wipes each account's data. NO tombstones — internal
// test seeds need no account_deletions audit row.
//
// SAFETY:
//   - The kill list is an EXPLICIT set of 20 emails, NOT a '+' pattern, so the
//     two '+' test keepers (isaacselig+demo, yishailieser+demo3) are never caught.
//   - A PROTECTED set (team accounts + test keepers + the rachelimiller false
//     positive) is asserted disjoint from the kill list; any overlap aborts.
//   - DRY RUN by default. Deletion ONLY runs with CONFIRM=DELETE-20-SEEDS.
//
// RUN (zsh, from repo root):
//   # 1) dry run — prints exactly what it would delete, then stops:
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" npx tsx scripts/delete-demo-seeds.mjs
//   # 2) execute (after Eli's final confirm):
//   CONFIRM=DELETE-20-SEEDS SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
//     npx tsx scripts/delete-demo-seeds.mjs

import { createClient } from "@supabase/supabase-js";

const URL =
  process.env.SUPABASE_URL || "https://ilmqmodklutztuybsvwd.supabase.co";
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SRK) {
  console.error("ERROR: set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── the 20 approved kill-list emails (section A) ─────────────────────────────
const DELETE_EMAILS = [
  "elienglard34+demo@gmail.com",
  "elienglard34+smoketest5@gmail.com",
  "elienglard34+smoketest6@gmail.com",
  "elienglard34+smoketest7@gmail.com",
  "elienglard34+smoketest8@gmail.com",
  "elienglard34+smoketest9@gmail.com",
  "yishailieser+demo@gmail.com",
  "yishailieser+demo2@gmail.com",
  "elienglard34+demo51@gmail.com",
  "elienglard34+demo45@gmail.com",
  "elienglard34+demo43@gmail.com",
  "elienglard34+skilltest1@gmail.com",
  "elienglard34+skilltest12@gmail.com",
  "elienglard34+demo543@gmail.com",
  "elienglard34+demo8989@gmail.com",
  "elienglard34+demo7654@gmail.com",
  "elienglard34+demo5643@gmail.com",
  "elienglard34+demo5452415@gmail.com",
  "elienglard34+demo7765@gmail.com",
  "elienglard34+demo67890@gmail.com",
  // 21st seed: TEAMGETAJOB-coded, miscounted out of the original list of 20;
  // confirmed for deletion 2026-06-12 (same '+'-seed rule, not a keeper).
  "elienglard34+demo0909@gmail.com",
];

// ─── NEVER delete these (belt-and-suspenders) ─────────────────────────────────
const PROTECTED = new Set([
  "elienglard34@gmail.com", // Eli primary
  "isaacselig@gmail.com", // Isaac primary
  "isaacseligcoding@gmail.com", // Isaac working alt
  "yishailieser@gmail.com", // Yishai primary
  "gymnastgirl323@gmail.com", // Noms — real team member
  "isaacselig+demo@gmail.com", // early-career test keeper
  "yishailieser+demo3@gmail.com", // mid test keeper
  "rachelimiller24@gmail.com", // real pilot user (false positive)
]);

// One deleted account that HAD data — used to prove CASCADE post-run.
const CASCADE_SPOTCHECK_EMAIL = "yishailieser+demo@gmail.com"; // had 1 app + 1 convo

async function allUsers() {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data.users;
}

async function countFor(table, userId) {
  const { count } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

async function main() {
  const confirmed = process.env.CONFIRM === "DELETE-20-SEEDS";

  // Static safety: kill list must be disjoint from PROTECTED.
  const overlap = DELETE_EMAILS.filter((e) => PROTECTED.has(e));
  if (overlap.length) {
    console.error("ABORT: kill list overlaps PROTECTED:", overlap);
    process.exit(1);
  }
  if (DELETE_EMAILS.length !== 21) {
    console.error(
      `ABORT: expected 21 kill-list emails, got ${DELETE_EMAILS.length}`,
    );
    process.exit(1);
  }

  const users = await allUsers();
  const byEmail = new Map(users.map((u) => [u.email, u.id]));

  const targets = DELETE_EMAILS.map((email) => ({
    email,
    id: byEmail.get(email) || null,
  }));
  const missing = targets.filter((t) => !t.id);
  const resolved = targets.filter((t) => t.id);

  console.error(
    "╭─ DEMO-SEED DELETION — KILL LIST ─────────────────────────────",
  );
  for (const t of resolved) console.error(`│ DELETE  ${t.id}  ${t.email}`);
  for (const t of missing)
    console.error(`│ (missing — already gone) ${t.email}`);
  console.error(`│`);
  console.error(
    `│ resolved: ${resolved.length}/20   missing: ${missing.length}`,
  );
  console.error(`│ profiles before: ${await profilesCount()}`);
  console.error(
    "╰──────────────────────────────────────────────────────────────",
  );

  if (!confirmed) {
    console.error(
      "\nDRY RUN — nothing deleted. To execute, re-run with:\n  CONFIRM=DELETE-20-SEEDS ... npx tsx scripts/delete-demo-seeds.mjs",
    );
    process.exit(0);
  }

  // Capture spot-check counts BEFORE deletion.
  const spotId = byEmail.get(CASCADE_SPOTCHECK_EMAIL);
  let spotBefore = null;
  if (spotId) {
    spotBefore = {
      apps: await countFor("applications", spotId),
      convos: await countFor("conversations", spotId),
    };
  }

  console.error("\n→ EXECUTING deletions sequentially…");
  let ok = 0;
  let fail = 0;
  for (const t of resolved) {
    // Final per-account guard.
    if (PROTECTED.has(t.email)) {
      console.error(`  SKIP (protected!?) ${t.email}`);
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(t.id);
    if (error) {
      fail++;
      console.error(`  ✗ ${t.email}: ${error.message}`);
    } else {
      ok++;
      console.error(`  ✓ deleted ${t.email}`);
    }
  }

  // ─── post-run verification ───
  const profilesAfter = await profilesCount();
  const remainingPlus = (await allUsers())
    .map((u) => u.email)
    .filter((e) => e && e.includes("+"));
  const unexpectedPlus = remainingPlus.filter(
    (e) =>
      e !== "isaacselig+demo@gmail.com" && e !== "yishailieser+demo3@gmail.com",
  );
  let spotAfter = null;
  if (spotId) {
    spotAfter = {
      apps: await countFor("applications", spotId),
      convos: await countFor("conversations", spotId),
    };
  }

  console.error(
    "\n╭─ POST-RUN VERIFICATION ──────────────────────────────────────",
  );
  console.error(`│ deleted: ${ok} ok, ${fail} failed`);
  console.error(`│ profiles after: ${profilesAfter}  (expect ~25)`);
  console.error(
    `│ remaining '+' emails: ${remainingPlus.length}  → ${remainingPlus.join(", ")}`,
  );
  console.error(
    `│ unexpected '+' (should be EMPTY): ${unexpectedPlus.length ? unexpectedPlus.join(", ") : "none ✓"}`,
  );
  if (spotBefore && spotAfter) {
    console.error(
      `│ CASCADE spot-check (${CASCADE_SPOTCHECK_EMAIL}): apps ${spotBefore.apps}→${spotAfter.apps}, convos ${spotBefore.convos}→${spotAfter.convos} ${spotAfter.apps === 0 && spotAfter.convos === 0 ? "✓ cascaded" : "✗ ROWS REMAIN"}`,
    );
  }
  console.error(
    "╰──────────────────────────────────────────────────────────────",
  );
}

async function profilesCount() {
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  return count ?? "?";
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});
