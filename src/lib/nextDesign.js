// isNextDesign - the ONE legal guard for every phase of the redesign reveal.
//
// The whole redesign ships to users as a single reveal, gated by one flag. No
// phase may invent its own check: shell, components, and pages all gate on THIS
// function (JS) or the `:root[data-next-design]` selector (CSS). See the flag
// section in docs/design/canvas-tokens.md.
//
// The flag is resolved ONCE, before first paint, by the bootstrap in index.html,
// which sets `data-next-design` on <html> from (in precedence order): the ?next=
// query param, then localStorage 'nextDesign', then the VITE_NEXT_DESIGN build
// default. This reader just reflects that attribute, so the CSS token overrides
// and the JS component gating can never disagree (no flash, no split-brain).
//
// Flag OFF (default) = current production, byte-identical. Flag ON = the redesign
// as far as it is built. The whole mechanism (this file, the bootstrap, the
// [data-next-design] blocks, every guard) is deleted at reveal.
export function isNextDesign() {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute("data-next-design");
}
