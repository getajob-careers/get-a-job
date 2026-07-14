import React from "react";

// THE product icon family: lucide (see the wave2-0 commit for why it won over
// iconsax / phosphor-duotone / hugeicons — license, React ergonomics, fit, and
// zero dependency friction on the shared symlinked node_modules).
//
// Duotone is delivered as a TREATMENT, not a second icon package: feature +
// action icons render a lucide glyph in a coral-tint filled backing (the two
// tones), coral accent, hover fills solid coral. Tabs + inline icons stay bare
// lucide glyphs. One family, one treatment, applied everywhere.
export default function DuotoneIcon({
  icon: Icon,
  size = 32,
  glyph = 18,
  radius = 10,
  className = "",
}) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-rd-coral-tint text-rd-coral group-hover:bg-rd-coral group-hover:text-white transition-colors ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Icon style={{ width: glyph, height: glyph }} aria-hidden="true" />
    </span>
  );
}
