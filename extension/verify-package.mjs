// Packaging guard for the Get A Job Chrome extension.
//
// Parses the manifest.json INSIDE a produced distribution zip and asserts that
// every file the manifest references is actually present in that same zip, at
// the exact path and casing. Exits non-zero, printing each missing path, if any
// referenced file is absent. This is the mandatory post-zip check in
// PACKAGING.md: it catches the class of bug where the zip command's file list
// drifts from what the manifest declares (e.g. a missing background.js, which
// the Chrome Web Store rejects with "Could not load background script").
//
// Usage: node verify-package.mjs <path-to-zip>
//
// Case matters: we build on macOS (case-insensitive) but the Web Store is not,
// so we compare against the exact entry names stored in the zip.

import { execFileSync } from "node:child_process";

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("usage: node verify-package.mjs <path-to-zip>");
  process.exit(2);
}

// Read raw bytes / text out of the zip without unpacking, via the system unzip.
function zipEntries(zip) {
  // -Z1 = zipinfo "names only, one per line". Trailing-slash entries are dirs.
  const out = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.endsWith("/"));
}

function manifestFromZip(zip) {
  // -p = pipe a single member to stdout. Reads the EXACT manifest that shipped.
  const raw = execFileSync("unzip", ["-p", zip, "manifest.json"], {
    encoding: "utf8",
  });
  return JSON.parse(raw);
}

// Collect every file path the manifest references, with the manifest key it came
// from (for a legible failure message).
function referencedFiles(m) {
  const refs = [];
  const add = (key, value) => {
    if (typeof value === "string" && value.length > 0)
      refs.push({ key, value });
  };
  const addIconMap = (key, map) => {
    if (map && typeof map === "object") {
      for (const [size, path] of Object.entries(map))
        add(`${key}[${size}]`, path);
    }
  };

  // Background service worker (MV3).
  if (m.background)
    add("background.service_worker", m.background.service_worker);

  // Top-level icons.
  addIconMap("icons", m.icons);

  // Action: default_icon (string OR size->path map) + default_popup.
  if (m.action) {
    if (typeof m.action.default_icon === "string")
      add("action.default_icon", m.action.default_icon);
    else addIconMap("action.default_icon", m.action.default_icon);
    add("action.default_popup", m.action.default_popup);
  }

  // Side panel.
  if (m.side_panel) add("side_panel.default_path", m.side_panel.default_path);

  // Content scripts (defensive: not used today, cheap to cover).
  for (const [i, cs] of (m.content_scripts || []).entries()) {
    for (const js of cs.js || []) add(`content_scripts[${i}].js`, js);
    for (const css of cs.css || []) add(`content_scripts[${i}].css`, css);
  }

  // Web-accessible resources (MV3: array of { resources, matches }).
  for (const [i, war] of (m.web_accessible_resources || []).entries()) {
    for (const r of war.resources || [])
      add(`web_accessible_resources[${i}].resources`, r);
  }

  return refs;
}

let entries;
let manifest;
try {
  entries = new Set(zipEntries(zipPath));
  manifest = manifestFromZip(zipPath);
} catch (err) {
  console.error(
    `[verify-package] could not read zip "${zipPath}": ${err.message}`,
  );
  process.exit(2);
}

const refs = referencedFiles(manifest);
// Wildcard resources (e.g. "assets/*") cannot be checked path-exact; skip with a note.
const checkable = refs.filter((r) => !r.value.includes("*"));
const skipped = refs.filter((r) => r.value.includes("*"));

const missing = checkable.filter((r) => !entries.has(r.value));

console.log(
  `[verify-package] manifest v${manifest.version} | ${entries.size} files in zip | ${checkable.length} referenced files checked`,
);
for (const s of skipped)
  console.log(`[verify-package] skipped wildcard ref: ${s.key} = ${s.value}`);

if (missing.length > 0) {
  console.error(
    `[verify-package] FAIL: ${missing.length} referenced file(s) missing from the zip:`,
  );
  for (const r of missing)
    console.error(`  - ${r.value}   (declared by ${r.key})`);
  process.exit(1);
}

console.log(
  "[verify-package] PASS: every manifest-referenced file is present in the zip.",
);
