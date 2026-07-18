// check-ground.mjs - ENFORCEMENT for the grain-ground occlusion class.
//
// The greige+grain ground is a `-z-10` layer on the isolate app shell (Layout).
// It paints on the shell's background, BEHIND the shell's in-flow children. So
// any GROUND-FILLING wrapper between the shell and the page content that carries
// an OPAQUE background paints OVER the grain and silently occludes it. This class
// of bug recurred THREE times (preview shell, first port on <main>, ...), each
// time invisible until a pixel-diff caught it. Prose in canvas-tokens.md was not
// enough; this fails the build instead.
//
// Rule: in the LAYOUT/SHELL files only (scoped so it never fires on cards, which
// legitimately use bg-rd-bg-card), a ground-filling wrapper
//   (flex-1 | overflow-y-auto | overflow-auto | h-full | min-h-full | h-screen)
// must NOT carry an opaque bg class
//   (bg-rd-bg-page | bg-rd-bg-card | bg-rd-bg-soft | bg-rd-bg-sidebar | bg-white
//    | bg-[#hex])
// UNLESS it is the isolate ground provider itself (className also has `isolate`) -
// that element is SUPPOSED to carry the greige bg + the grain.
//
// Exit non-zero on any violation so it gates like the other checks.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");

// Scope: the shell/layout files that own the ground. Add page-shell wrappers here
// if the port introduces them; do NOT add card/component files.
const FILES = [
  path.join(ROOT, "Layout.jsx"),
  ...safeReaddir(path.join(ROOT, "components", "layout")).map((f) =>
    path.join(ROOT, "components", "layout", f),
  ),
].filter((f) => f.endsWith(".jsx") && fs.existsSync(f));

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

const GROUND_FILLER =
  /\b(?:flex-1|overflow-y-auto|overflow-auto|h-full|min-h-full|h-screen|min-h-screen)\b/;
const OPAQUE_BG =
  /\bbg-(?:rd-bg-page|rd-bg-card|rd-bg-soft|rd-bg-sidebar|white)\b|\bbg-\[#[0-9A-Fa-f]{3,8}\]/;
const IS_GROUND_PROVIDER = /\bisolate\b/;

// Pull every className="..." (and className={`...`}) string with its line number.
function classNameStrings(src) {
  const out = [];
  const re = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
  let m;
  while ((m = re.exec(src))) {
    const cls = m[1] ?? m[2] ?? "";
    const line = src.slice(0, m.index).split("\n").length;
    out.push({ cls, line });
  }
  return out;
}

let violations = 0;
for (const file of FILES) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(process.cwd(), file);
  for (const { cls, line } of classNameStrings(src)) {
    if (!GROUND_FILLER.test(cls)) continue;
    if (!OPAQUE_BG.test(cls)) continue;
    if (IS_GROUND_PROVIDER.test(cls)) continue; // the shell itself - allowed
    violations++;
    const bg = cls.match(OPAQUE_BG)[0];
    console.log(
      `${rel}:${line}  ground-filling wrapper carries opaque \`${bg}\` - it will occlude the -z-10 grain. Make it transparent (the isolate shell provides the ground). See canvas-tokens.md ground spec.`,
    );
  }
}

if (violations === 0) {
  console.log(
    "✓ ground check: no opaque background on a ground-filling layout wrapper.",
  );
  process.exit(0);
}
console.log(`\n✗ ${violations} ground-occlusion risk(s). Fix before merge.`);
process.exit(1);
