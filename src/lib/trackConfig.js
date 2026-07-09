// Single source of truth for the track vocabulary and color scheme.
// Used by:
//   - src/components/onboarding/OnboardingTutorial.jsx (Browse Jobs slide cards)
//   - src/pages/Roadmap.jsx (header pills, tab labels, empty states)
//   - src/components/roadmap/RoleCard.jsx (track badge, accent stripe)
//   - src/components/roadmap/TrackQuadrantGrid.jsx (2×2 explainer quadrants)
//
// Before this consolidation, the Roadmap, the tutorial, and the quadrant grid
// each had their own (drifted) scheme — Track 2 was amber in one place and
// gray in another; Track 3 was indigo in one place and amber in two others.
// Pick scheme: emerald (green) for Track 1, neutral gray for Track 2, amber
// for Track 3 — matches the tutorial track cards that shipped in PR #88.
//
// Why these specific colors:
//   - emerald = "go" / qualified + on path / your strongest move
//   - gray = neutral / qualified but off path / functional fallback, not strategic
//   - amber = "caution + work toward" / on path but not ready yet
//
// Coral (the brand accent) is intentionally NOT used for tiers — coral is
// the brand signal, not a functional indicator. Using it for Track 1 would
// muddy the brand vocabulary across the product.
//
// PR 3C update — the redesign re-uses the warm rd palette as the canonical
// track-color vocabulary for restyled surfaces. The `rdColor` field below
// is consumed by Roadmap (PR 3C) and Home's TrackPill (also re-aligned in
// 3C). The legacy `color` field stays in place — it's still read by
// non-redesigned surfaces (JobCard, Tracker) and the legacy `roadmapStyles`
// CSS scaffolding until each surface gets its own restyle PR.

export const TRACK_COLORS = {
  green: {
    accent:      "#1D7556",
    accentSoft:  "#5FA38A",
    accentTint:  "#DBEEE5",
    border:      "rgba(29, 117, 86, 0.3)",
  },
  gray: {
    accent:      "#52545A",
    accentSoft:  "#9C9DA1",
    accentTint:  "#E8E8E5",
    border:      "rgba(82, 84, 90, 0.25)",
  },
  amber: {
    accent:      "#B8841C",
    accentSoft:  "#D6A53D",
    accentTint:  "#F5E8C9",
    border:      "rgba(184, 132, 28, 0.3)",
  },
};

export const TRACK_CONFIG = {
  track_1: {
    id:          "track_1",
    number:      1,
    name:        "Sweet spot",
    color:       "green",
    rdColor:     "coral",
    description:
      "Roles you're qualified for that match where you want your career to go. Apply to these first.",
    emptyCopy:
      "No Track 1 roles surfaced yet - once your roadmap regenerates, roles you're qualified for AND that fit your career path will land here.",
  },
  track_2: {
    id:          "track_2",
    number:      2,
    name:        "Detour",
    color:       "gray",
    rdColor:     "teal",
    description:
      "Roles you're qualified for, but they'd take your career in a different direction. Good fallbacks if Track 1 isn't hiring.",
    emptyCopy:
      "No off-path roles found - your matches are well-aligned with your stated career goals. Track 2 lists roles you're qualified for that would be detours from your path.",
  },
  track_3: {
    id:          "track_3",
    number:      3,
    name:        "Growth",
    color:       "amber",
    rdColor:     "golden",
    description:
      "Roles that match your direction, but you need more experience or skills first. Use these to plan what to learn next.",
    emptyCopy:
      "No growth roles surfaced - either every on-path role is already in your reach, or your goals point at roles too far ahead to score meaningfully right now.",
  },
};

export const TRACK_ORDER = ["track_1", "track_2", "track_3"];

// Convenience array form for .map() rendering — preserves the canonical
// 1 → 2 → 3 order so callers don't need to sort.
export const TRACKS = TRACK_ORDER.map((id) => TRACK_CONFIG[id]);
