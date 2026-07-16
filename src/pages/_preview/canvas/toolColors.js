// Per-tool object colors (round 3, toolkit color pass). Each tool is its OWN
// colored object — a glaze over one shared soft-3D material — not a uniform tile.
// Muted/earthy siblings so it reads as a set, not a candy-box rainbow; LinkedIn
// is the one true-brand pop (#0A66C2). Sage (Story bank) is pushed WARM to olive
// so it separates from Skill hub's teal at a glance (Eli's watchpoint).
//
//   tint = the object glaze (fill, pale), hi = its top-lit highlight (dome),
//   ink  = the deeper detail/stroke color. This mapping is the SAME in both
//   layout variants; it's part of the toolkit-rail-only exception recorded in
//   canvas-tokens.md.
export const TOOL_COLORS = {
  coach: { hi: "#FCEFE7", tint: "#F1DDD0", ink: "#A6552E" }, // terracotta
  skills: { hi: "#EAF5F1", tint: "#D2E7E1", ink: "#2E7062" }, // teal (blue-green)
  profile: { hi: "#FCF3DC", tint: "#F4E4BE", ink: "#8A5E12" }, // honey / amber
  linkedin: { hi: "#EAF2FC", tint: "#D2E4F6", ink: "#0A66C2" }, // brand blue (pop)
  cvbank: { hi: "#F7ECF2", tint: "#E9D6E2", ink: "#7E3A63" }, // plum / aubergine
  storybank: { hi: "#F1F4E4", tint: "#E2E8CE", ink: "#5F7233" }, // sage → warm olive
  tasks: { hi: "#EEF1F5", tint: "#DBE0E9", ink: "#4C5A72" }, // slate
  chat: { hi: "#F2EEF9", tint: "#DFD7EE", ink: "#6C5691" }, // heather violet - the one open hue, ~60 deg off plum, far from terracotta so it never reads as the coach twin
};
