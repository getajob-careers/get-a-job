// scripts/cleanup-harness-contamination.mjs
//
// Surgical cleanup of the rebake-harness contamination documented in
// scripts/findings/harness-contamination-cleanup.md (PR #385).
//
// WHAT IT REMOVES (and nothing else):
//   - 9 applications with company = '__REBAKE_HARNESS__'
//   - 11 application_cvs FK-linked to those 9 applications (all is_master = false)
// The exact ids are frozen below from the PR #385 review. The script refuses to
// run if the live set does not match that frozen set exactly.
//
// SAFETY MODEL:
//   - DRY RUN is the default. It reports the target set and exits without any write.
//   - Mutation requires the explicit --apply flag. There is no other way to mutate.
//   - Pre-flight asserts run BEFORE any delete. Any mismatch aborts with exit 1 and
//     mutates nothing: exactly 9 marked applications, exactly 11 linked non-master
//     CVs, 0 master CVs in the set, and 0 unexpected FK children
//     (status_changes / calendar_events / conversations).
//   - FK-safe order: application_cvs.application_id is ON DELETE SET NULL, so the
//     CVs are deleted FIRST. Deleting the applications first would orphan the CVs
//     with a null link and lose the only handle that identifies them as synthetic.
//   - Atomicity: supabase-js talks to PostgREST, which cannot wrap multiple
//     statements in one BEGIN/COMMIT. This script gets the same all-or-nothing
//     SAFETY a different way: it aborts before any delete on a count mismatch, and
//     the CVs-first order means a mid-run failure leaves only marked applications
//     (which are re-runnable and orphan nothing). For a strict DB-level
//     transaction, run the verbatim BEGIN/COMMIT block this script prints (via the
//     Supabase SQL editor or the MCP). That block is the canonical atomic form.
//   - Post-verify: after --apply, the marker count is re-queried and must be 0.
//
// RUN (zsh, from repo root):
//   # 1) dry run (default) - prints the target set + the atomic SQL, writes nothing:
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" npx tsx scripts/cleanup-harness-contamination.mjs
//   # 2) execute (only after reviewing the dry-run output):
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" npx tsx scripts/cleanup-harness-contamination.mjs --apply

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

const APPLY = process.argv.includes("--apply");
const MARKER = "__REBAKE_HARNESS__";
const EXPECTED_APP_COUNT = 9;
const EXPECTED_CV_COUNT = 11;

// Frozen from PR #385 (scripts/findings/harness-contamination-cleanup.md, Section 3).
// The live marked set must equal these exactly or the script aborts.
const EXPECTED_APP_IDS = new Set([
  "8943503a-bd87-46ce-a9ce-72485085d444",
  "0c60f49f-c000-46e6-bceb-2b2a8586c852",
  "70297c78-e40b-4929-b5cf-0ceac9b25a20",
  "1ab67757-0693-4536-b55e-7c0f1028deee",
  "0bc5d2a1-3abd-4a6c-8cf0-43c7430a5a20",
  "8c309fdf-0f23-4c19-98cd-d9f6dd832a5b",
  "23584a6e-29df-4652-9824-938d9e8d9490",
  "bb96ae5e-2821-48c2-a9da-a682277d4549",
  "ec93c8e4-d89b-44e0-801f-fa8230fc2c17",
]);
const EXPECTED_CV_IDS = new Set([
  "8d376bc7-b891-4bac-b38c-9f425243c56f",
  "9fa3fa18-1ae2-4158-9a0b-926fff876eb0",
  "ed0f90fb-a069-4768-a4ed-811005a5f846",
  "d2588526-664a-4bca-a133-f36cc9d011f5",
  "2d2fb297-82b8-4590-b718-43f9911997ec",
  "3ec87d1d-8903-4128-bcf6-56b6d2f0d5ec",
  "0cdd9f75-ce1a-4c60-968a-f2ab896fcfe8",
  "e323f6ae-be60-451a-bbb1-aa3d90a26d72",
  "0ab125a0-3d9f-4193-a843-5145973c9f09",
  "edd6576e-2e3e-4fcb-a356-b54c25b67f1f",
  "975ab90e-b3d2-4c32-b4e0-8e8bd40a4ba6",
]);

// Canonical strict-atomic form. Printed by every run. Run this via the SQL editor
// or MCP if you want a single hard BEGIN/COMMIT transaction instead of the
// ordered supabase-js deletes below.
const TRANSACTION_SQL = `BEGIN;

CREATE TEMP TABLE _harness_apps ON COMMIT DROP AS
  SELECT id FROM applications WHERE company = '__REBAKE_HARNESS__';

DO $$
DECLARE n_app int; n_cv int; n_master int; n_children int;
BEGIN
  SELECT count(*) INTO n_app FROM _harness_apps;
  IF n_app <> 9 THEN RAISE EXCEPTION 'expected 9 harness applications, found %', n_app; END IF;

  SELECT count(*) INTO n_cv FROM application_cvs WHERE application_id IN (SELECT id FROM _harness_apps);
  IF n_cv <> 11 THEN RAISE EXCEPTION 'expected 11 linked application_cvs, found %', n_cv; END IF;

  SELECT count(*) INTO n_master FROM application_cvs
    WHERE application_id IN (SELECT id FROM _harness_apps) AND is_master;
  IF n_master <> 0 THEN RAISE EXCEPTION 'refusing: % master CVs in target set', n_master; END IF;

  SELECT (SELECT count(*) FROM status_changes WHERE application_id IN (SELECT id FROM _harness_apps))
       + (SELECT count(*) FROM calendar_events WHERE application_id IN (SELECT id FROM _harness_apps))
       + (SELECT count(*) FROM conversations  WHERE application_id IN (SELECT id FROM _harness_apps))
    INTO n_children;
  IF n_children <> 0 THEN RAISE EXCEPTION 'unexpected % FK child rows, re-review', n_children; END IF;
END $$;

-- children first: application_cvs.application_id is ON DELETE SET NULL, so deleting
-- the applications first would orphan these CVs with a null link.
DELETE FROM application_cvs WHERE application_id IN (SELECT id FROM _harness_apps);

DELETE FROM applications WHERE company = '__REBAKE_HARNESS__';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM applications WHERE company = '__REBAKE_HARNESS__';
  IF n <> 0 THEN RAISE EXCEPTION 'post-check: % marked applications remain', n; END IF;
END $$;

COMMIT;`;

const ts = () => new Date().toISOString();
const log = (...a) => console.log(`[${ts()}]`, ...a);
function die(msg) {
  console.error(`[${ts()}] ABORT: ${msg}`);
  process.exit(1);
}
function setDiff(a, b) {
  // ids in a missing from b, plus ids in b missing from a
  const out = [];
  for (const x of a) if (!b.has(x)) out.push(`+${x}`);
  for (const x of b) if (!a.includes(x)) out.push(`-${x}`);
  return out;
}

async function main() {
  log(
    `cleanup-harness-contamination starting. mode=${APPLY ? "APPLY (will mutate)" : "DRY RUN (no writes)"}`,
  );

  // 1. fetch the marked applications
  const { data: apps, error: appErr } = await admin
    .from("applications")
    .select("id, user_id")
    .eq("company", MARKER);
  if (appErr) die(`fetch applications failed: ${appErr.message}`);
  const appIds = (apps || []).map((a) => a.id);
  log(
    `marked applications found: ${appIds.length} (expected ${EXPECTED_APP_COUNT})`,
  );
  if (appIds.length !== EXPECTED_APP_COUNT)
    die(
      `application count ${appIds.length} != expected ${EXPECTED_APP_COUNT}. Refusing.`,
    );
  const appMismatch = setDiff(appIds, EXPECTED_APP_IDS);
  if (appMismatch.length)
    die(
      `marked application ids differ from the PR #385 frozen set: ${appMismatch.join(", ")}`,
    );

  // 2. fetch the FK-linked CVs
  const { data: cvs, error: cvErr } = await admin
    .from("application_cvs")
    .select("id, user_id, application_id, is_master")
    .in("application_id", appIds);
  if (cvErr) die(`fetch application_cvs failed: ${cvErr.message}`);
  const cvIds = (cvs || []).map((c) => c.id);
  log(
    `linked application_cvs found: ${cvIds.length} (expected ${EXPECTED_CV_COUNT})`,
  );
  if (cvIds.length !== EXPECTED_CV_COUNT)
    die(`cv count ${cvIds.length} != expected ${EXPECTED_CV_COUNT}. Refusing.`);
  const masters = (cvs || []).filter((c) => c.is_master);
  if (masters.length)
    die(
      `refusing: ${masters.length} master CV(s) in target set: ${masters.map((c) => c.id).join(", ")}`,
    );
  const cvMismatch = setDiff(cvIds, EXPECTED_CV_IDS);
  if (cvMismatch.length)
    die(
      `linked cv ids differ from the PR #385 frozen set: ${cvMismatch.join(", ")}`,
    );

  // 3. re-verify zero unexpected FK children (the doc found 0; confirm at runtime)
  for (const tbl of ["status_changes", "calendar_events", "conversations"]) {
    const { data: kids, error } = await admin
      .from(tbl)
      .select("id")
      .in("application_id", appIds);
    if (error) die(`fetch ${tbl} children failed: ${error.message}`);
    const n = (kids || []).length;
    log(`FK children in ${tbl}: ${n} (expected 0)`);
    if (n !== 0)
      die(
        `unexpected ${n} child row(s) in ${tbl}; PR #385 expected 0. Re-review before deleting.`,
      );
  }

  // report the verified target set
  log("=== TARGET SET (verified against PR #385 frozen set) ===");
  log(`application_cvs to delete (${cvIds.length}):`);
  for (const id of cvIds) log(`  cv  ${id}`);
  log(`applications to delete (${appIds.length}):`);
  for (const id of appIds) log(`  app ${id}`);

  log(
    "\n--- canonical atomic transaction (run via SQL editor / MCP for a strict BEGIN/COMMIT) ---",
  );
  console.log(TRANSACTION_SQL);
  console.log("");

  if (!APPLY) {
    log(
      "DRY RUN complete. Nothing was mutated. Re-run with --apply to execute.",
    );
    return;
  }

  // 4. APPLY: FK-safe ordered deletes (CVs first, then the marked applications)
  log(
    "--apply set. Executing FK-safe ordered deletes (CVs first, then applications).",
  );
  const { data: delCvs, error: delCvErr } = await admin
    .from("application_cvs")
    .delete()
    .in("application_id", appIds)
    .select("id");
  if (delCvErr)
    die(
      `DELETE application_cvs failed: ${delCvErr.message} (no applications deleted yet; safe to re-run).`,
    );
  log(`deleted application_cvs: ${(delCvs || []).length}`);

  const { data: delApps, error: delAppErr } = await admin
    .from("applications")
    .delete()
    .eq("company", MARKER)
    .select("id");
  if (delAppErr)
    die(
      `DELETE applications failed: ${delAppErr.message} (CVs already deleted; marked apps remain, re-run to finish).`,
    );
  log(`deleted applications: ${(delApps || []).length}`);

  // 5. post-verify
  const { data: remain, error: remErr } = await admin
    .from("applications")
    .select("id")
    .eq("company", MARKER);
  if (remErr) die(`post-verify query failed: ${remErr.message}`);
  if ((remain || []).length !== 0)
    die(
      `post-verify: ${(remain || []).length} marked applications still present.`,
    );
  log("post-verify: 0 marked applications remain. OK.");

  const { count: appsTotal } = await admin
    .from("applications")
    .select("*", { count: "exact", head: true });
  const { count: cvsTotal } = await admin
    .from("application_cvs")
    .select("*", { count: "exact", head: true });
  log(
    `final counts: applications=${appsTotal} (expected 67), application_cvs=${cvsTotal} (expected 63)`,
  );
  log("cleanup complete.");
}

main().catch((e) => {
  console.error(`[${ts()}] UNCAUGHT:`, e);
  process.exit(1);
});
