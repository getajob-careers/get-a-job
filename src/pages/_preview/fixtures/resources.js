// Resources fixtures — PR 3M.
//
// Resources is a static, fully self-contained page (no fetches, no
// auth-gated state, no Supabase reads). The only "state" worth
// fixturing is the accordion's open-index. Two fixtures:
//
//   1. resources-default       — page mount, all guides collapsed
//   2. resources-guide-open    — first guide expanded
//                                (NetworkingPrinciples sub-render
//                                visible, exercising the 3J-C-shipped
//                                component in its Resources consumer
//                                context)

export const RESOURCES_FIXTURES = {
  "resources-default": {
    label: "Resources · all guides collapsed (default)",
    openGuideIndex: null,
  },
  "resources-guide-open": {
    label: "Resources · first guide open (NetworkingPrinciples visible)",
    openGuideIndex: 0,
  },
};

export const RESOURCES_STATE_IDS = Object.keys(RESOURCES_FIXTURES);
