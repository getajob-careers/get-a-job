// check-em-dash.mjs - ENFORCEMENT for the "no em dash in additions" convention.
//
// getajob copy + code use ASCII hyphens, never the em dash (U+2014). The rule is
// about ADDITIONS: main already carries em dashes in hundreds of pre-rule source
// files, so a whole-tree scan is impossible - this guard is DIFF-SCOPED. It looks
// only at lines this branch ADDS (working tree vs the merge-base with origin/main)
// in shipped source (src/ + supabase/functions/), and fails if any added line
// carries an em dash. Pre-existing em dashes and doc/handoff/lesson files (which
// legitimately carry them) are never scanned.
//
// Scope rationale: the recurring miss the design lane's gatekeeper kept letting
// through was an em dash in a NEW jsx string / comment. Catch exactly that class,
// nothing else. Ellipsis (U+2026) is deliberately NOT flagged: it is established
// practice in dozens of on-main files, not a project-wide rule.
//
// Exit non-zero on any violation so it gates like the other checks.

import { execFileSync } from "node:child_process";

const EM_DASH = "—";
// Shipped source only. Docs, handoffs, lessons, and tooling scripts are excluded
// (they carry em dashes on purpose or as prose).
const IN_SCOPE = /^(src|supabase\/functions)\/.*\.(?:js|jsx|ts|tsx|css)$/;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

let base;
try {
  base = git(["merge-base", "origin/main", "HEAD"]).trim();
} catch {
  // No origin/main to compare against (e.g. a detached CI checkout with no
  // history). Nothing to diff - pass rather than block.
  console.log("✓ em-dash check: no origin/main base to diff against, skipped.");
  process.exit(0);
}

// Working tree vs the merge-base: catches both committed and uncommitted additions
// on this branch. --unified=0 so only changed lines appear; parse the hunk headers
// to recover real line numbers.
const diff = git([
  "diff",
  "--unified=0",
  base,
  "--",
  "src",
  "supabase/functions",
]);

const violations = [];
let file = null;
let newLine = 0;
for (const raw of diff.split("\n")) {
  if (raw.startsWith("+++ b/")) {
    file = raw.slice(6);
    continue;
  }
  if (raw.startsWith("@@")) {
    // @@ -a,b +c,d @@  -> next added line is c
    const m = raw.match(/\+(\d+)/);
    newLine = m ? parseInt(m[1], 10) : 0;
    continue;
  }
  if (raw.startsWith("+") && !raw.startsWith("+++")) {
    if (file && IN_SCOPE.test(file) && raw.includes(EM_DASH)) {
      violations.push({ file, line: newLine, text: raw.slice(1).trim() });
    }
    newLine++;
  }
}

if (violations.length === 0) {
  console.log("✓ em-dash check: no em dash on added source lines.");
  process.exit(0);
}
for (const v of violations) {
  console.log(
    `${v.file}:${v.line}  added line carries an em dash (—); use an ASCII hyphen. -> ${v.text}`,
  );
}
console.log(
  `\n✗ ${violations.length} em-dash violation(s) on added lines. Fix before merge.`,
);
process.exit(1);
