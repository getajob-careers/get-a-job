// LinkedIn preview harness — DEV-only route at /_preview/linkedin/:state.
//
// Supports both 3J-A (Profile) and 3J-B (Posts) fixtures via two render
// modes:
//   - default: mount full `<Linkedin>` page; pin `?tab=` via Navigate
//     replace; drive view state via post-mount DOM clicks
//   - subtreeOnly: render the page shell + tab bar manually, bypass
//     PostsTab/ProfileTab, render the named subtree (currently
//     "post-preview") standalone with seeded props
//
// ProfileTab + PostsTab do direct supabase reads on mount (NOT
// TanStack-wrapped), so a fetch override mocks the PostgREST endpoints
// + relevant edge functions. Cleanup restores real fetch on unmount.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/linkedin/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect, useRef } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Linkedin from "@/pages/Linkedin";
import { LI_CSS } from "@/components/linkedin/linkedinStyles";
import PostPreview from "@/components/linkedin/posts/PostPreview";
import {
  LINKEDIN_FIXTURES,
  LINKEDIN_FIXTURE_UID,
} from "./fixtures/linkedin";

function seedCache(qc, fixture) {
  qc.setQueryData(["userProfile", LINKEDIN_FIXTURE_UID], fixture.profile ?? null);
  // PostPreview reads "linkedinPreviewIdentity" via useQuery; seed it so
  // the post-preview subtree fixtures render with the right name/headline.
  if (fixture.subtreeOnly === "post-preview") {
    qc.setQueryData(
      ["linkedinPreviewIdentity", LINKEDIN_FIXTURE_UID],
      {
        full_name: fixture.profile?.full_name || null,
        headline:
          fixture.linkedinOptimizations?.generated_data?.headline || null,
      },
    );
  }
}

// Fetch override. Mocks the PostgREST endpoints + edge functions used
// by ProfileTab / PostsTab / PostsList / PostPreview.
function installFetchOverride(fixture) {
  const real = window.fetch;

  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";

    // PostgREST: linkedin_optimizations.maybeSingle() reads
    if (url.includes("/rest/v1/linkedin_optimizations")) {
      const row = fixture.linkedinOptimizations;
      const body = row ? [row] : [];
      return jsonResponse(body);
    }

    // PostgREST: linkedin_posts list (PostsList .order().limit())
    // OR linkedin_posts.maybeSingle() for image_url (PostPreview)
    if (url.includes("/rest/v1/linkedin_posts")) {
      // image_url fetch is a single-row read keyed by id; just return
      // empty array for the harness — PostPreview falls back to null
      // image_url. The fixture-controlled image_url is passed as a
      // direct prop in subtree-only mode.
      if (url.includes("select=image_url")) {
        return jsonResponse([]);
      }
      const posts = fixture.posts ?? [];
      return jsonResponse(posts);
    }

    // PostgREST: profiles.maybeSingle() (used by PostPreview identity)
    if (url.includes("/rest/v1/profiles")) {
      return jsonResponse([{ full_name: fixture.profile?.full_name || null }]);
    }

    // PostgREST: stories list (StoryBankSidebar)
    if (url.includes("/rest/v1/stories")) {
      return jsonResponse([]);
    }

    // Edge functions — surface success by default; the error fixture
    // overrides for generate-linkedin-content.
    if (url.includes("/functions/v1/generate-linkedin-content")) {
      if (fixture.generateError) {
        return jsonResponse(
          { error: fixture.generateError.message },
          fixture.generateError.status || 500,
        );
      }
      const generated =
        fixture.linkedinOptimizations?.generated_data ?? {};
      return jsonResponse(generated);
    }
    if (url.includes("/functions/v1/generate-linkedin-post")) {
      return jsonResponse({
        post_id: "post-mock",
        post_text: "Mocked LinkedIn post.",
        hook_preview: "Mocked LinkedIn post.",
        hashtag_suggestions: [],
        format_recommendation: "text",
        format_reason: "",
        saveable_score: 7,
        warnings: [],
      });
    }
    if (url.includes("/functions/v1/import-linkedin-archive")) {
      return jsonResponse({ ok: true });
    }

    return real(input, init);
  };

  return () => {
    window.fetch = real;
  };
}

function jsonResponse(body, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function applyPostMountAction(action) {
  if (!action) return;

  if (action.kind === "toggle-current") {
    const btn = document.querySelector('button[data-mockup-toggle="current"]');
    if (btn && btn instanceof HTMLElement && btn.getAttribute("aria-pressed") !== "true") {
      btn.click();
    }
    return;
  }

  if (action.kind === "open-refine-about") {
    const refineButtons = Array.from(
      document.querySelectorAll('button[title="Refine just this section"]'),
    );
    if (refineButtons.length > 0 && refineButtons[0] instanceof HTMLElement) {
      refineButtons[0].click();
    }
    return;
  }

  if (action.kind === "click-generate") {
    const btn = document.querySelector('button[data-action="generate"]');
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
    return;
  }

  if (action.kind === "select-post-type") {
    const btn = document.querySelector(`button[data-post-type="${action.type}"]`);
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
    return;
  }

  if (action.kind === "open-refine-post") {
    const btn = document.querySelector('button[data-action="refine-open"]');
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
    return;
  }
}

// Manual page-shell wrapper for `subtreeOnly` fixtures. Renders the
// `.li` wrapper + LI_CSS injection + LinkedIn eyebrow/h1/tab bar, then
// hands off to children for the active-tab content. Mirrors the live
// Linkedin.jsx shell — kept in sync deliberately so subtree fixtures
// look identical to the full-page render.
function PageShell({ tab = "posts", children }) {
  return (
    <>
      <style>{LI_CSS}</style>
      <div className="li">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            LinkedIn
          </p>
          <h1 className="font-display font-extrabold text-[27px] sm:text-[32px] leading-[1.08] tracking-tight text-rd-text mt-1">
            Build your presence — profile, posts, outreach.
          </h1>

          <div
            className="flex gap-[22px] mt-5 border-b-[1.5px] border-rd-border-subtle"
            role="tablist"
            aria-label="LinkedIn hub sections"
          >
            {[
              { id: "profile", label: "Profile" },
              { id: "posts", label: "Posts" },
              { id: "networking", label: "Networking" },
            ].map(({ id, label }) => {
              const selected = tab === id;
              return (
                <span
                  key={id}
                  role="tab"
                  aria-selected={selected}
                  className={[
                    "font-display text-[15px] font-semibold pb-[9px] -mb-[1.5px] transition-colors duration-150 whitespace-nowrap",
                    selected
                      ? "text-rd-text border-b-[2.5px] border-rd-coral"
                      : "text-rd-text-secondary border-b-[2.5px] border-transparent",
                  ].join(" ")}
                >
                  {label}
                </span>
              );
            })}
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </>
  );
}

// PostPreview subtree — renders PostPreview standalone with seeded
// props. PostPreview's internal image_url fetch is handled by the
// secondary fetch override installed in the main component below
// when the fixture seeds previewImageUrl.
function PostPreviewSubtree({ fixture }) {
  return (
    <div className="max-w-4xl mx-auto">
      <PostPreview
        post={fixture.previewPost}
        postId={fixture.previewPost?.post_id || null}
        inputs={fixture.previewInputs || {}}
        postType={fixture.previewPostType || "lessons"}
        storyId={null}
        onRefineSuccess={() => {}}
        onBack={() => {}}
      />
    </div>
  );
}

export default function LinkedinPreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture =
    LINKEDIN_FIXTURES[state] || LINKEDIN_FIXTURES["linkedin-profile-empty"];

  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    });
    seedCache(qc, fixture);
    return qc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Install fetch override. For "post-preview" subtree fixtures, also
  // patch the linkedin_posts image_url read for the seeded post id.
  const cleanupRef = useRef(null);
  useEffect(() => {
    const cleanup = installFetchOverride(fixture);
    // Add a second override for image_url if the fixture seeds one.
    if (fixture.subtreeOnly === "post-preview" && fixture.previewImageUrl) {
      const real = window.fetch;
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input?.url || "";
        if (
          url.includes("/rest/v1/linkedin_posts") &&
          url.includes("select=image_url")
        ) {
          return Promise.resolve(
            new Response(
              JSON.stringify([{ image_url: fixture.previewImageUrl }]),
              { status: 200, headers: { "content-type": "application/json" } },
            ),
          );
        }
        return real(input, init);
      };
    }
    cleanupRef.current = cleanup;
    return () => {
      if (typeof cleanupRef.current === "function") cleanupRef.current();
    };
  }, [fixture]);

  const authValue = useMemo(
    () => ({
      user: { id: LINKEDIN_FIXTURE_UID, email: "eli@example.com" },
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

  useEffect(() => {
    if (!fixture.postMountAction) return;
    const t1 = setTimeout(() => {
      applyPostMountAction(fixture.postMountAction);
      setTimeout(() => applyPostMountAction(fixture.postMountAction), 200);
    }, 300);
    return () => clearTimeout(t1);
  }, [fixture]);

  // Pin ?tab= via Navigate. Declared AFTER the hooks above to keep
  // hook order stable across the redirect re-render.
  const targetTab = fixture.tab || "profile";
  if (searchParams.get("tab") !== targetTab) {
    return <Navigate to={`?tab=${targetTab}`} replace />;
  }

  // Subtree-only mode — render the page shell manually and bypass the
  // tab orchestrator.
  if (fixture.subtreeOnly === "post-preview") {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
            <PageShell tab="posts">
              <PostPreviewSubtree fixture={fixture} />
            </PageShell>
          </div>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  // Default: full Linkedin page mount.
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
          <Linkedin />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
