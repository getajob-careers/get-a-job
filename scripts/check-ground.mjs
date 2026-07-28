// check-ground.mjs - ENFORCEMENT for the ground-occlusion class.
//
// The cream ground (the DepthField field + blobs, plus the mockup DOT-GRID
// texture - 2026-07-18, was greige + grain) is a `-z-10` layer on the isolate app
// shell (Layout / CanvasShell), mounted ONLY when the NEXT_DESIGN flag is on. It
// paints on the shell's background, BEHIND the shell's in-flow children. So any
// GROUND-FILLING wrapper between the shell and the page content that carries an
// OPAQUE background paints OVER the ground and silently occludes it. This class of
// bug recurred THREE times
// (preview shell, first port on <main>, ...), each time invisible until a
// pixel-diff caught it. Prose in canvas-tokens.md was not enough; this fails the
// build instead.
//
// Rule: in the LAYOUT/SHELL files only (scoped so it never fires on cards, which
// legitimately use bg-rd-bg-card), a ground-filling wrapper
//   (flex-1 | overflow-y-auto | overflow-auto | h-full | min-h-full | h-screen)
// must NOT carry an opaque bg class
//   (bg-rd-bg-page | bg-rd-bg-card | bg-rd-bg-soft | bg-rd-bg-sidebar | bg-white
//    | bg-[#hex])
// UNLESS one of:
//   (a) it is the isolate ground provider itself (className also has `isolate`) -
//       that element is SUPPOSED to carry the cream field + dot grid; or
//   (b) the opaque bg is FLAG-GATED to the flag-OFF branch (appears only inside a
//       `!nextDesign && "..."` / `!isNextDesign() && "..."` clause). Flag OFF
//       mounts no ground, so an opaque <main> there occludes nothing - it is the
//       byte-identical old-main fallback. An UNCONDITIONAL opaque bg still fails,
//       because it would occlude the ground whenever the flag is on.
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
  // The redesign shell (CanvasShell + rail) owns the ground on the flag-ON path.
  ...safeReaddir(path.join(ROOT, "components", "redesign", "shell")).map((f) =>
    path.join(ROOT, "components", "redesign", "shell", f),
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
// A ROUNDED surface is a bounded card/panel (e.g. the sidebar coach dock), not
// the flat full-bleed wrapper the occlusion bug lives on - the ground bleeds
// around its corners, so an opaque bg here occludes nothing. The occluder is
// always a square-cornered content/scroll container (never rounded).
const IS_BOUNDED_PANEL = /\brd-r-|\brounded/;
// A flag-OFF-guarded class clause: `!nextDesign && "..."` or `!isNextDesign() && "..."`.
const FLAG_OFF_CLAUSE =
  /!\s*(?:isNextDesign\(\)|nextDesign)\s*&&\s*"[^"]*"|!\s*(?:isNextDesign\(\)|nextDesign)\s*&&\s*`[^`]*`/g;

// Pull every className value with its line number. Handles className="...",
// className={`...`}, AND className={ ...expression... } (e.g. cn(...)) by matching
// balanced braces so conditional class expressions are inspected, not skipped.
function classNameExprs(src) {
  const out = [];
  const re = /className=(?:"([^"]*)"|\{)/g;
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    if (m[1] !== undefined) {
      out.push({ cls: m[1], line });
      continue;
    }
    // className={ ... } - scan from the '{' to its matching close brace.
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
    }
    out.push({ cls: src.slice(m.index + m[0].length, i - 1), line });
    re.lastIndex = i;
  }
  return out;
}

let violations = 0;
for (const file of FILES) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(process.cwd(), file);
  for (const { cls, line } of classNameExprs(src)) {
    if (!GROUND_FILLER.test(cls)) continue;
    if (!OPAQUE_BG.test(cls)) continue;
    if (IS_GROUND_PROVIDER.test(cls)) continue; // the shell itself - allowed
    if (IS_BOUNDED_PANEL.test(cls)) continue; // rounded card/panel - not an occluder
    // Strip flag-OFF-guarded clauses, then see if an opaque bg still remains
    // UNCONDITIONALLY. Only an unconditional one can occlude the flag-ON ground.
    const unguarded = cls.replace(FLAG_OFF_CLAUSE, "");
    if (!OPAQUE_BG.test(unguarded)) continue; // every opaque bg was flag-off-gated
    violations++;
    const bg = unguarded.match(OPAQUE_BG)[0];
    console.log(
      `${rel}:${line}  ground-filling wrapper carries an UNCONDITIONAL opaque \`${bg}\` - it will occlude the -z-10 grain when NEXT_DESIGN is on. Make it transparent, or gate the bg to the flag-off branch (!nextDesign && "..."). See canvas-tokens.md ground spec.`,
    );
  }
}

if (violations === 0) {
  console.log(
    "✓ ground check: no unconditional opaque background on a ground-filling layout wrapper.",
  );
  process.exit(0);
}
console.log(`\n✗ ${violations} ground-occlusion risk(s). Fix before merge.`);
process.exit(1);
