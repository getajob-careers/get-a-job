#!/usr/bin/env node
/**
 * check-docs-freshness.mjs — flag living docs that have gone stale.
 *
 * For every Markdown file under docs/ with frontmatter, read its
 * `status`, `last_reviewed`, and `code_paths`. For `living` docs, compare
 * `last_reviewed` against the last git-commit date of each listed code
 * path. If any path changed after the doc was reviewed, the doc is STALE.
 *
 * This is a helpful nudge, not a gate. It exits 0 normally so it never
 * blocks anything; pass `--ci` to exit non-zero when stale docs exist
 * (useful if you ever want a non-blocking CI warning step to surface it).
 *
 * Usage:
 *   node scripts/check-docs-freshness.mjs        # report, always exit 0
 *   node scripts/check-docs-freshness.mjs --ci   # exit 1 if anything is stale
 *
 * No dependencies — a tiny hand-rolled frontmatter parser keeps it
 * self-contained.
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "docs");
const CI = process.argv.includes("--ci");

// ── tiny frontmatter parser ─────────────────────────────────────────────
// Handles the simple subset we use: scalar key: value, and `key:` followed
// by `  - item` list lines. No external YAML dep.
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end).trim();
  const out = {};
  let listKey = null;
  for (const raw of block.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && listKey) {
      out[listKey].push(listItem[1].trim());
      continue;
    }
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) {
      const [, key, val] = kv;
      if (val === "") {
        out[key] = [];
        listKey = key;
      } else {
        out[key] = val.trim();
        listKey = null;
      }
    }
  }
  return out;
}

// Last commit date (YYYY-MM-DD) for a path, or null if untracked/never committed.
function lastCommitDate(path) {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${path}"`, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return out || null;
  } catch {
    return null;
  }
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "archive") continue; // archived docs are never checked
      yield* walk(full);
    } else if (name.endsWith(".md")) {
      yield full;
    }
  }
}

const stale = [];
const missingMeta = [];
let checked = 0;

for (const file of walk(DOCS_DIR)) {
  const text = readFileSync(file, "utf8");
  const fm = parseFrontmatter(text);
  const rel = relative(ROOT, file).replace(/\\/g, "/");

  if (!fm) {
    missingMeta.push(rel);
    continue;
  }
  if (fm.status !== "living") continue;
  if (!fm.last_reviewed) {
    missingMeta.push(rel);
    continue;
  }
  if (!Array.isArray(fm.code_paths) || fm.code_paths.length === 0) continue;

  checked++;
  const reviewed = fm.last_reviewed;
  const drifted = [];
  for (const cp of fm.code_paths) {
    const changed = lastCommitDate(cp);
    if (changed && changed > reviewed) drifted.push({ cp, changed });
  }
  if (drifted.length) stale.push({ rel, reviewed, drifted });
}

// ── report ──────────────────────────────────────────────────────────────
if (stale.length === 0) {
  console.log(`✓ docs freshness: ${checked} living docs checked, all current.`);
} else {
  console.log(`⚠ docs freshness: ${stale.length} doc(s) may be stale:\n`);
  for (const s of stale) {
    console.log(`STALE  ${s.rel}`);
    for (const d of s.drifted) {
      console.log(`       last_reviewed ${s.reviewed}, but ${d.cp} changed on ${d.changed}`);
    }
    console.log("");
  }
  console.log("Review each against the code, fix any drift, and bump last_reviewed.");
}

if (missingMeta.length) {
  console.log(`\nℹ ${missingMeta.length} doc(s) without freshness frontmatter (ok for archived/incidental notes):`);
  for (const m of missingMeta) console.log(`  ${m}`);
}

process.exit(CI && stale.length ? 1 : 0);
