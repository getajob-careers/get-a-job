// Per-tool object colours for the toolkit carousel, re-derived VERBATIM from the
// mockup palette (2026-07-19, Eli's carousel-restore ruling). The mockup uses a
// restrained THREE-accent set - blue / mauve / brown - so the tools reuse those
// families grouped by concept rather than inventing 8 unique hues (the mockup's
// own restraint). LinkedIn keeps its true brand blue (a brand mark is not ours to
// restyle).
//
//   hi   = the top-lit highlight (warm-white, the mockup's card material #FFFCF4)
//   tint = the family glaze fill (the mockup's *-tint chip backgrounds)
//   ink  = the family deep stroke/detail (the mockup's *-deep chip text)
//
// Values are LITERAL hexes, not var() indirection: the old set pointed at
// --rd-tool-* vars that only applyPalette() set (preview-only), so the production
// shell rendered the icons as black blobs (undefined gradient stops). Literal
// colours render correctly everywhere.
const TOOL_IDS = [
  "home",
  "career",
  "tasks",
  "profile",
  "cvbank",
  "storybank",
  "linkedin",
  "coach",
  "skills",
  "chat",
];

// Mockup families (from docs/design/reference/app-handoff-mockup.html):
const MATERIAL = "#FFFCF4"; // --card (warm-white tile highlight)
const BLUE = { hi: MATERIAL, tint: "#E3E3EC", ink: "#4B4C66" }; // --accent-tint / -deep
const MAUVE = { hi: MATERIAL, tint: "#EFE3E9", ink: "#7E626F" }; // --mauve-tint / -deep
const BROWN = { hi: MATERIAL, tint: "#E9DECF", ink: "#4A362E" }; // --brown-tint / -deep
const LINKEDIN = { hi: "#EAF2FC", tint: "#D2E4F6", ink: "#0A66C2" }; // brand

// Grouped by concept so the repetition reads intentional: direction/growth = blue
// (Home, Career, Skill hub, Tasks - the forward-action set); you/history = brown
// (Profile, Story bank); documents/talk = mauve (CV bank, Interview coach, Chat).
const MOCKUP_TOOLS = {
  home: BLUE,
  career: BLUE,
  tasks: BLUE,
  profile: BROWN,
  cvbank: MAUVE,
  storybank: BROWN,
  linkedin: LINKEDIN,
  coach: MAUVE,
  skills: BLUE,
  chat: MAUVE,
};

const TOOL_SETS = { yishai: MOCKUP_TOOLS };

// Legacy shape kept for the preview's applyPalette() (harmless now that
// TOOL_COLORS is literal). Produces the :root var map applyPalette installs.
export function toolVars(id) {
  const set = TOOL_SETS[id] || MOCKUP_TOOLS;
  const out = {};
  for (const t of TOOL_IDS) {
    out[`--rd-tool-${t}-hi`] = set[t].hi;
    out[`--rd-tool-${t}-tint`] = set[t].tint;
    out[`--rd-tool-${t}-ink`] = set[t].ink;
  }
  return out;
}

// What CanvasToolTile reads - LITERAL hexes, so the icons colour correctly in the
// production shell without applyPalette (that was the black-blob bug).
export const TOOL_COLORS = Object.fromEntries(
  TOOL_IDS.map((t) => [t, { ...MOCKUP_TOOLS[t] }]),
);
