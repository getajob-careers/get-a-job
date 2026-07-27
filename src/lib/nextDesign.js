// isNextDesign - the ONE legal guard for every phase of the redesign reveal.
//
// The whole redesign ships to users as a single reveal, gated by one flag. No
// phase may invent its own check: shell, components, and pages all gate on THIS
// function (JS) or the `:root[data-next-design]` selector (CSS). See the flag
// section in docs/design/canvas-tokens.md.
//
// The flag is resolved ONCE, before first paint, by the bootstrap in index.html,
// which sets `data-next-design` on <html>. REVEAL SHIPPED (Flip 2): the redesign
// is the DEFAULT for everyone; the persisted 'nextDesign' localStorage "0" (set
// via ?next=0) is the sole kill switch. This reader just reflects that attribute,
// so the CSS token overrides and the JS component gating can never disagree (no
// flash, no split-brain).
//
// Flag ON (default) = the revealed redesign. Flag OFF (?next=0 kill switch) =
// legacy production, byte-identical. The whole mechanism (this file, the bootstrap,
// the [data-next-design] blocks, every guard) is deleted at reveal-cleanup.
export function isNextDesign() {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute("data-next-design");
}
