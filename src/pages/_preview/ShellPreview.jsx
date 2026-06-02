// Shell preview harness — DEV-only route at /_preview/shell/:state.
// Mounts the real Layout + SidebarFooter inside a fresh QueryClient
// pre-seeded with a fixture profile + a stub AuthContext value that
// represents a signed-in fixture user.
//
// Why this shape:
//   1. The real Layout reads useProfileQuery(user.id, select). The
//      preview seeds the canonical ["userProfile", uid] cache entry
//      with the fixture's 3-field profile shape so the select projection
//      returns deterministic data — no Supabase call fired.
//   2. The real Layout reads useAuth(). The harness wraps in
//      AuthContext.Provider with a stub { user: { id: FIXTURE_UID } }
//      to override the outer real AuthProvider for this subtree only.
//   3. The real Layout uses useState for `expandedSections` +
//      `sidebarOpen`. The harness can't mutate that state from outside,
//      so fixtures that need a manually-expanded section or a pre-open
//      mobile drawer drive those via the URL: ?expand=chat,profile and
//      ?mobile=1. The Layout component itself is unchanged — it just
//      gets the right initial state.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`, identical to the onboarding harness.

import React, { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Layout from "@/Layout";
import { SHELL_FIXTURES } from "./fixtures/shell";

const FIXTURE_UID = "shell-fixture-user";
const FIXTURE_EMAIL = "eli@example.com";

// Sample bodies. The legacy body shows what a not-yet-restyled page
// might paint when wrapped by the new shell — the .legacy-body reset
// (force bg-rd-bg-page on <main>) keeps the cream sidebar from
// clashing with whatever the body decides to render.
function RdBody({ pageName }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 sm:px-8 sm:py-12">
      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
        shell preview · {pageName.toLowerCase()}
      </p>
      <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.1] tracking-tight text-rd-text mt-3">
        Sample {pageName} body
      </h1>
      <p className="text-[14px] leading-[1.6] text-rd-text-secondary mt-3 max-w-xl">
        This body renders on rd tokens so the shell PR can be reviewed
        independently of any page-body restyle. Each authenticated page
        will replace this sample with its real content as we work through
        the rollout in tasks/redesign.md.
      </p>
      <div className="mt-6 bg-rd-bg-card border border-rd-border rounded-[18px] p-6 shadow-rd">
        <p className="text-[13.5px] text-rd-text">
          A representative card on the new palette: white surface, warm
          border, soft shadow. Lives inside the cream-bordered shell.
        </p>
      </div>
    </div>
  );
}

function LegacyBody() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100%" }}>
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ fontSize: 11, color: "#9C9DA1", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>
          legacy body sample
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", marginTop: 8 }}>
          Pretend this is an unrestyled page
        </h1>
        <p style={{ fontSize: 14, color: "#525252", marginTop: 12, lineHeight: 1.6 }}>
          Hard-coded greys + sharp corners + Geist-ish weight to mimic a
          page that hasn't been touched by the redesign yet. The shell's
          <code> .legacy-body </code> reset forces <code>bg-rd-bg-page</code>
          on the <code>&lt;main&gt;</code> wrapper so the surrounding
          warm chrome reads cleanly. This card is intentionally white to
          show the contrast.
        </p>
        <div style={{ marginTop: 24, padding: 20, background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: "#0A0A0A", margin: 0 }}>
            Sample legacy card — sharp corners, cool grey.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShellPreview() {
  const { state } = useParams();
  const [search] = useSearchParams();
  const fixture = SHELL_FIXTURES[state] || SHELL_FIXTURES["shell-home-active"];

  // Each fixture gets its own QueryClient + pre-seeded cache. Memoised
  // by fixture id so navigating across fixture URLs in the same tab
  // doesn't keep recreating the client mid-render. The cache seeding
  // happens on mount + on fixture change.
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Infinity staleTime so React Query never re-fetches; we
            // own the cache entries directly.
            staleTime: Infinity,
            // Disable retries — there's no network in this harness;
            // any error means we mis-seeded.
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  useEffect(() => {
    // Seed the canonical profile cache so Layout's useProfileQuery
    // returns the fixture data via its select projection. The select fn
    // runs against this seeded payload — see useProfile.js for the
    // canonical key + 5-min staleTime.
    queryClient.setQueryData(["userProfile", FIXTURE_UID], fixture.profileChrome);
  }, [queryClient, fixture]);

  const authValue = useMemo(
    () => ({
      user: { id: FIXTURE_UID, email: FIXTURE_EMAIL },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }),
    [],
  );

  // URL escape hatches — let preview runners drive the bits of Layout
  // state that aren't easily reachable from outside (Layout owns
  // expandedSections + sidebarOpen internally). Both default to off so
  // a bare /_preview/shell/<id> visit still works.
  const expandUrlSet = (search.get("expand") || "").split(",").filter(Boolean);
  const fixtureExpand = fixture.manuallyExpanded || [];
  const expandAll = new Set([...expandUrlSet, ...fixtureExpand]);
  const mobileOpen = search.get("mobile") === "1" || fixture.mobileOpen === true;

  // The legacy-body fixture needs to render inside Layout's <main> so
  // the .legacy-body reset can be evaluated. RdBody mode shows the new
  // tokens for everything else.
  const body = fixture.bodyVariant === "legacy"
    ? <LegacyBody />
    : <RdBody pageName={fixture.currentPageName} />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ShellWithInitialState
          currentPageName={fixture.currentPageName}
          manuallyExpand={expandAll}
          mobileOpen={mobileOpen}
        >
          {body}
        </ShellWithInitialState>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

// Thin wrapper that mounts the real Layout and post-mount triggers the
// internal toggle / drawer state via DOM interactions, since Layout
// owns the state internally. The runner could also use Playwright to
// click section headers + the mobile menu button before the
// screenshot, but doing it inside the harness keeps the fixture map
// declarative.
function ShellWithInitialState({ currentPageName, manuallyExpand, mobileOpen, children }) {
  useEffect(() => {
    if (manuallyExpand.size === 0 && !mobileOpen) return;
    // Defer one tick so Layout has mounted before we drive its DOM.
    const t = setTimeout(() => {
      if (mobileOpen) {
        const btn = /** @type {HTMLElement | null} */ (
          document.querySelector('button[aria-label="Open menu"]')
        );
        if (btn) btn.click();
      }
      manuallyExpand.forEach((sectionId) => {
        const header = /** @type {HTMLElement | null} */ (
          document.querySelector(
            `button[aria-expanded][data-section-id="${sectionId}"]`,
          )
        );
        if (header && header.getAttribute("aria-expanded") === "false") {
          header.click();
        }
      });
    }, 50);
    return () => clearTimeout(t);
  }, [manuallyExpand, mobileOpen]);

  return <Layout currentPageName={currentPageName}>{children}</Layout>;
}
