// Pure decision for what the app shell (Layout) renders, extracted so the
// loading-vs-onboarding gate is unit-testable without rendering the whole shell.
//
// Bug this guards (item 8, cold-load flash): Layout derives onboarding_complete
// from the profile query's data, which is `undefined` while the query is pending.
// The chrome select projects undefined -> onboarding_complete:false, so a
// signed-in, already-onboarded user briefly hit the "not onboarded" branch on a
// cold load (a chrome-less / onboarding-style flash) before the query resolved.
// The fix is a neutral "loading" mode while the profile is unresolved for a
// signed-in user on a non-onboarding route - a neutral state, never guard copy.
//
// Modes:
//   "loading"    -> neutral full-page loader (never guard / onboarding copy)
//   "chromeless" -> render children with no sidebar chrome: the Onboarding page
//                   itself, or a RESOLVED not-onboarded user who bounces back to
//                   /Onboarding via that page's own redirect guards
//   "full"       -> the full dashboard chrome + children
//
// Order matters: the Onboarding page is always chromeless (it renders its own
// flow immediately, never the loader); otherwise a signed-in user whose profile
// has not resolved yet gets the neutral loader BEFORE any onboarding-status
// decision is made from an undefined profile.
export function resolveLayoutMode({
  hasUser,
  profileFetched,
  onboardingComplete,
  isOnboardingPage,
}) {
  if (isOnboardingPage) return "chromeless";
  if (hasUser && !profileFetched) return "loading";
  if (!onboardingComplete) return "chromeless";
  return "full";
}
