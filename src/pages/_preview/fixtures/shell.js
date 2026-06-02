// Shell preview fixtures — drive each render branch of Layout +
// SidebarFooter. Fixture IDs use a single dash-separated segment
// (React Router v6 :state param matches a single URL segment).
//
// Each fixture supplies:
//   - profileChrome: the 3-field profile shape Layout reads via
//     useProfileQuery(uid, select). null = "profile query hasn't
//     resolved yet" → Layout returns bare children (sidebar hidden).
//   - currentPageName: the page slug Layout uses to drive active
//     section + auto-expand logic.
//   - manuallyExpanded: extra section ids to start expanded in addition
//     to the active section (proves the multi-section expand state).
//   - mobileOpen: pre-open the mobile drawer on viewport <lg.
//   - bodyVariant: which sample body to render inside <main>. "rd" =
//     a body already on rd tokens; "legacy" = a sample legacy white
//     card that the .legacy-body reset must wash through.

export const SHELL_FIXTURES = {
  "shell-home-active": {
    label: "Shell · Home active · Career collapsed",
    profileChrome: {
      practicum_path: null,
      onboarding_complete: true,
      full_name: "Eli Englard",
    },
    currentPageName: "Home",
    manuallyExpanded: [],
    bodyVariant: "rd",
  },
  "shell-roadmap-active": {
    label: "Shell · Roadmap active · Career auto-expanded",
    profileChrome: {
      practicum_path: null,
      onboarding_complete: true,
      full_name: "Eli Englard",
    },
    currentPageName: "Roadmap",
    manuallyExpanded: [],
    bodyVariant: "rd",
  },
  "shell-tracker-active": {
    label: "Shell · Tracker active · Activity auto-expanded",
    profileChrome: {
      practicum_path: null,
      onboarding_complete: true,
      full_name: "Eli Englard",
    },
    currentPageName: "Tracker",
    manuallyExpanded: [],
    bodyVariant: "rd",
  },
  "shell-career-active-chat-expanded": {
    label: "Shell · Career active + Chat manually expanded",
    profileChrome: {
      practicum_path: null,
      onboarding_complete: true,
      full_name: "Eli Englard",
    },
    currentPageName: "Jobs",
    manuallyExpanded: ["chat"],
    bodyVariant: "rd",
  },
  "shell-internship-visible": {
    label: "Shell · practicum_path set · Internship section inserted",
    profileChrome: {
      practicum_path: "faculty_assigned",
      onboarding_complete: true,
      full_name: "Eli Englard",
    },
    currentPageName: "Internship",
    manuallyExpanded: [],
    bodyVariant: "rd",
  },
  "shell-legacy-body": {
    label: "Shell · legacy-body reset over a sample legacy white card",
    profileChrome: {
      practicum_path: null,
      onboarding_complete: true,
      full_name: "Eli Englard",
    },
    currentPageName: "Home",
    manuallyExpanded: [],
    bodyVariant: "legacy",
  },
  "shell-onboarding-hidden": {
    label: "Shell · Onboarding page · sidebar HIDDEN",
    profileChrome: {
      practicum_path: null,
      onboarding_complete: false,
      full_name: "",
    },
    currentPageName: "Onboarding",
    manuallyExpanded: [],
    bodyVariant: "rd",
  },
  "shell-pre-onboarding-hidden": {
    label: "Shell · onboarding_complete=false on a non-Onboarding route · sidebar HIDDEN",
    profileChrome: {
      practicum_path: null,
      onboarding_complete: false,
      full_name: "",
    },
    currentPageName: "Home",
    manuallyExpanded: [],
    bodyVariant: "rd",
  },
  "shell-mobile-drawer-open": {
    label: "Shell · mobile drawer OPEN (viewport <lg)",
    profileChrome: {
      practicum_path: "faculty_assigned",
      onboarding_complete: true,
      full_name: "Eli Englard",
    },
    currentPageName: "Home",
    manuallyExpanded: [],
    mobileOpen: true,
    bodyVariant: "rd",
  },
};

export const SHELL_STATE_IDS = Object.keys(SHELL_FIXTURES);
