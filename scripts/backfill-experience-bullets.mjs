// scripts/backfill-experience-bullets.mjs
//
// Phase 1 of the Story Bank → experiences migration. Folds existing `stories`
// rows into their experience's `experiences.bullets[]`, COPY-ONLY and
// idempotent. The `stories` table is NOT modified or dropped here (that's
// Phase 5) — this only writes `experiences.bullets` + `experiences.skills`.
//
// Follows the canonical prod-data-script discipline (see delete-demo-seeds.mjs):
//   1. DRY RUN by default — prints exactly what it would write, then STOPS.
//   2. Real run gated behind CONFIRM=APPLY-BULLET-BACKFILL (a phrase, not a
//      bare flag) so it can never fire by accident.
//   3. Idempotent — a bullet identical (trimmed, case-insensitive) to one
//      already on the experience is skipped, so re-runs don't duplicate.
//   4. Per-experience verification pass at the end (bullet counts).
//
// Linked vs unlinked stories (decision #2):
//   - experience_id SET   → compose a bullet, append to that experience.
//   - experience_id NULL  → classify the owner. A REAL pilot user's story is
//     attached to their MOST-RECENT experience (so they don't lose it). An
//     internal/test owner's unlinked story is REPORTED only and left for the
//     Phase 5 drop-with-backup. Ownership is the same metrics-exclusion rule:
//     email LIKE '%+%'  OR  id IN INTERNAL_USER_IDS.
//
// RUN (zsh, from repo root):
//   # 1) dry run — prints the plan, writes nothing:
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" npx tsx scripts/backfill-experience-bullets.mjs
//   # 2) execute (after review):
//   CONFIRM=APPLY-BULLET-BACKFILL SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
//     npx tsx scripts/backfill-experience-bullets.mjs

import { createClient } from "@supabase/supabase-js";
import {
  composeBulletFromStory,
  mergeBulletSkills,
} from "../src/lib/composeBullet.js";
import { isInternalUserId } from "../src/lib/internalUsers.js";

const URL =
  process.env.SUPABASE_URL || "https://ilmqmodklutztuybsvwd.supabase.co";
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SRK) {
  console.error("ERROR: set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const APPLY = process.env.CONFIRM === "APPLY-BULLET-BACKFILL";

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase();

// A real pilot user is NOT internal: not in the no-plus team allowlist AND no
// '+' in their email (the metrics-exclusion convention).
async function isRealPilotUser(userId) {
  if (isInternalUserId(userId)) return false;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return false; // can't confirm → treat as non-pilot (safe)
  return !String(data.user.email || "").includes("+");
}

// Most-recent experience for a user: prefer is_current, then latest start_date,
// then newest row. start_date is free-form text ("Oct 2025") so we sort on the
// string descending as a best-effort, with created_at as the real tiebreak.
function pickMostRecentExperience(exps) {
  const sorted = [...exps].sort((a, b) => {
    if (!!b.is_current !== !!a.is_current) return b.is_current ? 1 : -1;
    const sd = norm(b.start_date).localeCompare(norm(a.start_date));
    if (sd !== 0) return sd;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
  return sorted[0] || null;
}

async function main() {
  console.log(
    `\n=== backfill-experience-bullets (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`,
  );

  const { data: stories, error: sErr } = await admin
    .from("stories")
    .select(
      "id, user_id, experience_id, title, action, result, metrics, skills_demonstrated, tools_used",
    );
  if (sErr) throw sErr;
  const { data: experiences, error: eErr } = await admin
    .from("experiences")
    .select(
      "id, user_id, title, company, is_current, start_date, created_at, bullets, skills",
    );
  if (eErr) throw eErr;

  const expById = new Map(experiences.map((e) => [e.id, e]));
  const expsByUser = new Map();
  for (const e of experiences) {
    if (!expsByUser.has(e.user_id)) expsByUser.set(e.user_id, []);
    expsByUser.get(e.user_id).push(e);
  }

  console.log(
    `stories: ${stories.length} · experiences: ${experiences.length}\n`,
  );

  // Plan: experienceId → { exp, addBullets[], mergedSkills[] }
  const plan = new Map();
  const skippedTestUnlinked = [];
  let composedLinked = 0;
  let composedUnlinkedReal = 0;

  const ensure = (exp) => {
    if (!plan.has(exp.id)) {
      plan.set(exp.id, {
        exp,
        bullets: [...(exp.bullets || [])],
        skills: [...(exp.skills || [])],
        added: [],
      });
    }
    return plan.get(exp.id);
  };

  const addStoryToExperience = (exp, story) => {
    const bullet = composeBulletFromStory(story);
    if (!bullet) return false;
    const entry = ensure(exp);
    // idempotency: skip if an equal bullet is already present (existing or queued)
    const present = new Set(entry.bullets.map(norm));
    if (present.has(norm(bullet))) return false;
    entry.bullets.push(bullet);
    entry.added.push(bullet);
    entry.skills = mergeBulletSkills(entry.skills, story);
    return true;
  };

  for (const story of stories) {
    if (story.experience_id) {
      const exp = expById.get(story.experience_id);
      if (!exp) continue; // orphaned FK (experience deleted) — skip
      if (exp.user_id !== story.user_id) continue; // defensive cross-user guard
      if (addStoryToExperience(exp, story)) composedLinked++;
    } else {
      const real = await isRealPilotUser(story.user_id);
      if (!real) {
        skippedTestUnlinked.push(story.id);
        continue;
      }
      const exps = expsByUser.get(story.user_id) || [];
      const target = pickMostRecentExperience(exps);
      if (!target) {
        skippedTestUnlinked.push(story.id); // no experience to attach to
        continue;
      }
      if (addStoryToExperience(target, story)) composedUnlinkedReal++;
    }
  }

  // Report the plan.
  for (const { exp, added } of plan.values()) {
    if (added.length === 0) continue;
    console.log(
      `• ${exp.title || "(untitled)"} @ ${exp.company || "?"} (${exp.id})`,
    );
    for (const b of added) console.log(`    + ${b}`);
  }
  console.log(
    `\nlinked stories folded: ${composedLinked} · unlinked(real-pilot) attached: ${composedUnlinkedReal} · unlinked(test/staff) left for Phase 5: ${skippedTestUnlinked.length}`,
  );
  if (skippedTestUnlinked.length)
    console.log(
      `  left-for-phase-5 story ids: ${skippedTestUnlinked.join(", ")}`,
    );

  if (!APPLY) {
    console.log(
      `\nDRY RUN — nothing written. Re-run with CONFIRM=APPLY-BULLET-BACKFILL to apply.\n`,
    );
    return;
  }

  // Apply: one UPDATE per experience with new bullets/skills.
  let written = 0;
  for (const { exp, bullets, skills, added } of plan.values()) {
    if (added.length === 0) continue;
    const { error } = await admin
      .from("experiences")
      .update({ bullets, skills })
      .eq("id", exp.id)
      .eq("user_id", exp.user_id);
    if (error) {
      console.error(`  UPDATE failed for ${exp.id}: ${error.message}`);
      continue;
    }
    written++;
  }
  console.log(`\nAPPLIED — updated ${written} experiences.`);

  // Verification: re-read and print bullet counts for touched experiences.
  const touchedIds = [...plan.keys()];
  if (touchedIds.length) {
    const { data: after } = await admin
      .from("experiences")
      .select("id, title, bullets")
      .in("id", touchedIds);
    console.log(`\nverification:`);
    for (const e of after || [])
      console.log(`  ${e.title || e.id}: ${(e.bullets || []).length} bullets`);
  }
  console.log("");
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});
