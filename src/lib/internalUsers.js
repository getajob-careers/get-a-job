// Internal (team) user_ids — exclude these from ALL production metrics so we
// don't count ourselves. Established 2026-06-12 after deleting 21 +-convention
// demo/test seed accounts (scripts/delete-demo-seeds.mjs).
//
// WHY a hardcoded allowlist: the team's `+`-email convention
// (elienglard34+demo@…) is auto-excluded by a `LIKE '%+%'` filter, but the five
// PRIMARY team accounts below have NO `+`, so a pattern filter misses them.
// The full internal exclusion is therefore:  email LIKE '%+%'  OR  id IN (these 5).

// The five no-plus team accounts (the ones a '+' filter cannot catch).
export const INTERNAL_USER_IDS = [
  "4b243f3a-5035-474e-a89d-aff13fe06cc2", // elienglard34@gmail.com   — Eli (primary)
  "294d7fca-15e1-4131-bf47-cd82718990c4", // isaacselig@gmail.com     — Isaac (primary)
  "b16b7ad7-dfe8-44ff-8ebf-13eedb1ecdd3", // isaacseligcoding@gmail.com — Isaac (working alt)
  "6de6aa99-a940-4f5d-88c9-3a32e387c761", // yishailieser@gmail.com   — Yishai (primary)
  "90bcf097-77f2-437f-9210-42755ba4d143", // gymnastgirl323@gmail.com — Noms (real team member)
];

// Surviving '+' test keepers — already excluded by the '%+%' filter, listed
// here only for reference (do NOT also add to INTERNAL_USER_IDS; the '+' filter
// covers them, and the early/mid seeds are still used for repro):
//   42d8133f-302f-4b75-99a0-d3b6d322b8fa  isaacselig+demo@gmail.com    (early-career seed)
//   78260897-3641-4c8f-a769-81c46580d5bd  yishailieser+demo3@gmail.com (mid seed)
// No senior seed exists post-cleanup — create a dedicated +senior seed if needed;
// do NOT use Noms' (gymnastgirl323) real account for test repros.

export function isInternalUserId(userId) {
  return INTERNAL_USER_IDS.includes(userId);
}

// ── Reuse snippets ────────────────────────────────────────────────────────────
//
// SQL (function_metrics, applications, etc. — anything user_id-keyed):
//   WHERE NOT (
//     u.email LIKE '%+%'
//     OR m.user_id IN (
//       '4b243f3a-5035-474e-a89d-aff13fe06cc2','294d7fca-15e1-4131-bf47-cd82718990c4',
//       'b16b7ad7-dfe8-44ff-8ebf-13eedb1ecdd3','6de6aa99-a940-4f5d-88c9-3a32e387c761',
//       '90bcf097-77f2-437f-9210-42755ba4d143'
//     )
//   )
//
// PostHog "Internal users" cohort — match on either:
//   • email contains "+"           (catches every +-convention seed), OR
//   • distinct_id is one of the 5 ids above
// Then set Project Settings → "Filter out internal and test users" to this cohort.
