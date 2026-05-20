// Single source of truth for the tier vocabulary and color scheme.
// Used by:
//   - src/components/onboarding/OnboardingTutorial.jsx (Browse Jobs slide cards)
//   - src/pages/Roadmap.jsx (header pills, tab labels, empty states)
//   - src/components/roadmap/RoleCard.jsx (tier badge, accent stripe)
//   - src/components/roadmap/TierQuadrantGrid.jsx (2×2 explainer quadrants)
//
// Before this consolidation, the Roadmap, the tutorial, and the quadrant grid
// each had their own (drifted) scheme — Tier 2 was amber in one place and
// gray in another; Tier 3 was indigo in one place and amber in two others.
// Pick scheme: emerald (green) for Tier 1, neutral gray for Tier 2, amber
// for Tier 3 — matches the tutorial tier cards that shipped in PR #88.
//
// Why these specific colors:
//   - emerald = "go" / qualified + on path / your strongest move
//   - gray = neutral / qualified but off path / functional fallback, not strategic
//   - amber = "caution + work toward" / on path but not ready yet
//
// Coral (the brand accent) is intentionally NOT used for tiers — coral is
// the brand signal, not a functional indicator. Using it for Tier 1 would
// muddy the brand vocabulary across the product.

export const TIER_COLORS = {
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

export const TIER_CONFIG = {
  tier_1: {
    id:          "tier_1",
    number:      1,
    name:        "Sweet spot",
    color:       "green",
    description:
      "Roles you're qualified for that match where you want your career to go. Apply to these first.",
    emptyCopy:
      "No Tier 1 roles surfaced yet — once your roadmap regenerates, roles you're qualified for AND that fit your career path will land here.",
  },
  tier_2: {
    id:          "tier_2",
    number:      2,
    name:        "Detour",
    color:       "gray",
    description:
      "Roles you're qualified for, but they'd take your career in a different direction. Good fallbacks if Tier 1 isn't hiring.",
    emptyCopy:
      "No off-path roles found — your matches are well-aligned with your stated career goals. Tier 2 lists roles you're qualified for that would be detours from your path.",
  },
  tier_3: {
    id:          "tier_3",
    number:      3,
    name:        "Growth",
    color:       "amber",
    description:
      "Roles that match your direction, but you need more experience or skills first. Use these to plan what to learn next.",
    emptyCopy:
      "No growth roles surfaced — either every on-path role is already in your reach, or your goals point at roles too far ahead to score meaningfully right now.",
  },
};

export const TIER_ORDER = ["tier_1", "tier_2", "tier_3"];

// Convenience array form for .map() rendering — preserves the canonical
// 1 → 2 → 3 order so callers don't need to sort.
export const TIERS = TIER_ORDER.map((id) => TIER_CONFIG[id]);
