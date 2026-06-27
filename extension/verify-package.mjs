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
// Usage: node verify-package.mjs [path-to-zip]
//   Defaults to ../getajob-extension.zip relative to this file (the path the
//   documented `zip -r ../getajob-extension.zip ...` step writes), so it also
//   works as `npm run package:verify` from the repo root.
//
// Pure Node: reads the zip with a minimal central-directory parser and zlib,
// so the guard has no dependency on the system `unzip` binary being present.
// Case matters (we build on macOS, the Web Store is case-sensitive), so we
// compare against the exact entry names stored in the zip.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const zipPath = process.argv[2] || resolve(here, "..", "getajob-extension.zip");

// ── Minimal ZIP reader ───────────────────────────────────────────────────────
// Enough of the spec to list entries and extract a stored/deflated member.
// Reads sizes/offsets from the central directory (authoritative even when a
// local header uses a data descriptor). No ZIP64 (extension zips are tiny).
const EOCD_SIG = 0x06054b50; // end of central directory
const CEN_SIG = 0x02014b50; // central directory file header
const LOC_SIG = 0x04034b50; // local file header

function readZip(path) {
  const buf = readFileSync(path);

  // EOCD is at the end, before an optional comment; scan backwards for it.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0)
    throw new Error("not a zip file (no end-of-central-directory record)");

  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);

  const entries = new Map(); // name -> { method, compSize, localOffset }
  let p = cdOffset;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== CEN_SIG)
      throw new Error("corrupt zip (bad central directory header)");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, { method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

function extractFile(buf, entry) {
  if (buf.readUInt32LE(entry.localOffset) !== LOC_SIG)
    throw new Error("corrupt zip (bad local file header)");
  const nameLen = buf.readUInt16LE(entry.localOffset + 26);
  const extraLen = buf.readUInt16LE(entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + entry.compSize);
  if (entry.method === 0) return data; // stored
  if (entry.method === 8) return inflateRawSync(data); // deflate
  throw new Error(`unsupported compression method ${entry.method}`);
}

// ── Manifest reference collection ────────────────────────────────────────────
// Every file path the manifest references, tagged with the key it came from
// (for a legible failure message).
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

// ── Run ──────────────────────────────────────────────────────────────────────
let buf;
let entries;
let manifest;
try {
  ({ buf, entries } = readZip(zipPath));
  const manifestEntry = entries.get("manifest.json");
  if (!manifestEntry) throw new Error("manifest.json is not in the zip");
  manifest = JSON.parse(extractFile(buf, manifestEntry).toString("utf8"));
} catch (err) {
  console.error(
    `[verify-package] could not read zip "${zipPath}": ${err.message}`,
  );
  process.exit(2);
}

const names = new Set([...entries.keys()].filter((n) => !n.endsWith("/")));
const refs = referencedFiles(manifest);
// Wildcard resources (e.g. "assets/*") cannot be checked path-exact; skip with a note.
const checkable = refs.filter((r) => !r.value.includes("*"));
const skipped = refs.filter((r) => r.value.includes("*"));
const missing = checkable.filter((r) => !names.has(r.value));

console.log(
  `[verify-package] manifest v${manifest.version} | ${names.size} files in zip | ${checkable.length} referenced files checked`,
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
