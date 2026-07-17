// Per-tool object colors. Each tool is its OWN colored object — a glaze over one
// shared soft-3D material — not a uniform tile. Muted/earthy siblings so it reads
// as a set, not a candy-box rainbow; LinkedIn is the one true-brand pop (#0A66C2)
// in EVERY family (a brand mark is not ours to restyle). Sage (Story bank) is
// pushed WARM to olive so it separates from Skill hub's teal (Eli's watchpoint).
//
//   tint = the object glaze (fill, pale), hi = its top-lit highlight (dome),
//   ink  = the deeper detail/stroke color. This mapping is the SAME in both
//   layout variants; it's part of the toolkit-rail-only exception recorded in
//   canvas-tokens.md.
//
// Round 4 (challenger round): each palette re-derives the WHOLE set inside its
// own family — the per-tool hues only read as a set together, and porting Clay's
// tints onto another family is exactly what makes a palette look broken. Tiles
// consume these as CSS custom properties (--to-hi/--to-tint/--to-ink), so
// TOOL_COLORS points at per-palette vars that applyPalette() sets on :root and
// CanvasToolTile stays untouched — this remains a token-layer change.
//
// Two collisions are REAL, and are surfaced rather than hidden:
//   - HEATHER: the primary IS heather, so Chat (heather violet — the hue Eli
//     liked) would read as the Coach twin. Chat moves to the card's denim. The
//     price of purple-as-primary is the purple Chat tile.
//   - PEWTER: the primary IS charcoal-navy, so Tasks' slate collides. Tasks
//     moves to the card's brown.
const TOOL_IDS = [
  "coach",
  "skills",
  "profile",
  "linkedin",
  "cvbank",
  "storybank",
  "tasks",
  "chat",
];

const LINKEDIN = { hi: "#EAF2FC", tint: "#D2E4F6", ink: "#0A66C2" };

// Clay — the adopted round-3 set, unchanged (the incumbent shows as-is).
const CLAY_TOOLS = {
  coach: { hi: "#FCEFE7", tint: "#F1DDD0", ink: "#A6552E" }, // terracotta (= primary)
  skills: { hi: "#EAF5F1", tint: "#D2E7E1", ink: "#2E7062" }, // teal (blue-green)
  profile: { hi: "#FCF3DC", tint: "#F4E4BE", ink: "#8A5E12" }, // honey / amber
  linkedin: LINKEDIN,
  cvbank: { hi: "#F7ECF2", tint: "#E9D6E2", ink: "#7E3A63" }, // plum / aubergine
  storybank: { hi: "#F1F4E4", tint: "#E2E8CE", ink: "#5F7233" }, // sage → warm olive
  tasks: { hi: "#EEF1F5", tint: "#DBE0E9", ink: "#4C5A72" }, // slate
  chat: { hi: "#F2EEF9", tint: "#DFD7EE", ink: "#6C5691" }, // heather violet
};

// Heather — every hue drawn from the "73 PURPLE" swatch card.
const HEATHER_TOOLS = {
  coach: { hi: "#F5F0F3", tint: "#E6DCE2", ink: "#705B64" }, // heather (= primary)
  skills: { hi: "#EDF3F0", tint: "#DCE8E3", ink: "#4A665B" }, // sage
  profile: { hi: "#FBF1E4", tint: "#F2E2CC", ink: "#815A32" }, // peach → ochre
  linkedin: LINKEDIN,
  cvbank: { hi: "#F8ECEA", tint: "#EFD9D6", ink: "#7E453F" }, // rust
  storybank: { hi: "#F2F2E6", tint: "#E4E3CE", ink: "#5F6236" }, // sage-olive
  tasks: { hi: "#EEEFF2", tint: "#DDDFE4", ink: "#444751" }, // charcoal-navy
  chat: { hi: "#EFEFF4", tint: "#DEDEE8", ink: "#51516B" }, // denim (displaced)
};

// Moss — earthen siblings around the olive primary; Chat KEEPS its heather.
const MOSS_TOOLS = {
  coach: { hi: "#F0F3E5", tint: "#E1E6CE", ink: "#566631" }, // moss (= primary)
  skills: { hi: "#ECF5F5", tint: "#D6E8E9", ink: "#2E686C" }, // deep cyan-teal
  profile: { hi: "#FAF2E2", tint: "#F0E2C4", ink: "#7C5B20" }, // ochre
  linkedin: LINKEDIN,
  cvbank: { hi: "#F5EFF3", tint: "#E7DBE4", ink: "#6E4A63" }, // plum
  storybank: { hi: "#F4EEE9", tint: "#E4DAD3", ink: "#5E4B41" }, // warm brown
  tasks: { hi: "#EEF1F5", tint: "#DBE0E9", ink: "#4C5A72" }, // slate
  chat: { hi: "#F2EEF9", tint: "#DFD7EE", ink: "#6C5691" }, // heather violet
};

// Pewter — chrome recedes, so the tiles carry nearly all the hue in the product.
const PEWTER_TOOLS = {
  coach: { hi: "#F0F1F3", tint: "#E0E1E5", ink: "#444751" }, // charcoal-navy (= primary)
  skills: { hi: "#EDF4F1", tint: "#DBE8E3", ink: "#3C6859" }, // deep green-teal
  profile: { hi: "#FAF3E8", tint: "#F0E3CE", ink: "#7D582D" }, // ochre
  linkedin: LINKEDIN,
  cvbank: { hi: "#F5EFF3", tint: "#E7DBE4", ink: "#6E4A63" }, // plum
  storybank: { hi: "#F1F4E4", tint: "#E2E8CE", ink: "#5F7233" }, // olive
  tasks: { hi: "#F4EEEB", tint: "#E4D9D4", ink: "#6B4A3E" }, // brown (displaced)
  chat: { hi: "#F2EEF9", tint: "#DFD7EE", ink: "#6C5691" }, // heather violet
};

// Yishai — the set re-derived inside the mock's brown / cream / blue / mauve
// family. Cool primary means the warm tools (profile ochre, storybank olive) do
// most of the separating work.
//
// COLLISION 1 (real, paid): the primary IS blue #60617D, so Tasks' slate
// (#4C5A72) would read as the primary's twin. Tasks moves to the mock's own
// brown #60483E — the same displacement Pewter pays for a cool primary.
//
// COLLISION 2 (watchpoint, NOT resolved here — needs Eli's eye): Chat's LOCKED
// heather violet #6C5691 sits uncomfortably near this blue primary; both are
// muted purple-blues. It is kept rather than silently moved, because the heather
// Chat tile is itself a locked decision — surrendering it is a cost Eli should
// choose knowingly, not one I quietly absorb. If Yishai wins, this is the second
// thing that re-opens (after the logotype material).
const YISHAI_TOOLS = {
  coach: { hi: "#EFEFF4", tint: "#DEDEE8", ink: "#60617D" }, // blue (= primary)
  skills: { hi: "#EDF3F1", tint: "#DBE7E2", ink: "#4A6A61" }, // muted sage-teal
  profile: { hi: "#FAF2E3", tint: "#F0E2C6", ink: "#7A5C2C" }, // ochre (stretch family)
  linkedin: LINKEDIN,
  cvbank: { hi: "#F6EDF2", tint: "#E8DAE3", ink: "#74405F" }, // deep plum
  storybank: { hi: "#F2F4E6", tint: "#E3E7D0", ink: "#5C6B36" }, // warm olive
  tasks: { hi: "#F3EDE9", tint: "#E3D7D0", ink: "#60483E" }, // brown (displaced)
  chat: { hi: "#F2EEF9", tint: "#DFD7EE", ink: "#6C5691" }, // heather violet
};

const TOOL_SETS = {
  clay: CLAY_TOOLS,
  yishai: YISHAI_TOOLS,
  heather: HEATHER_TOOLS,
  moss: MOSS_TOOLS,
  pewter: PEWTER_TOOLS,
};

// The :root vars a palette installs. Identical key set for every palette, so a
// switch can never leave a stale tool hue behind.
export function toolVars(id) {
  const set = TOOL_SETS[id] || TOOL_SETS.clay;
  const out = {};
  for (const t of TOOL_IDS) {
    out[`--rd-tool-${t}-hi`] = set[t].hi;
    out[`--rd-tool-${t}-tint`] = set[t].tint;
    out[`--rd-tool-${t}-ink`] = set[t].ink;
  }
  return out;
}

// What CanvasToolTile reads. The indirection through the vars above is what lets
// the rail re-tint on a palette switch with no component change.
export const TOOL_COLORS = Object.fromEntries(
  TOOL_IDS.map((t) => [
    t,
    {
      hi: `var(--rd-tool-${t}-hi)`,
      tint: `var(--rd-tool-${t}-tint)`,
      ink: `var(--rd-tool-${t}-ink)`,
    },
  ]),
);
