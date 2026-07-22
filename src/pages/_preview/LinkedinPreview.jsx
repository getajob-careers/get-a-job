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

import React, { useMemo, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle2, Archive } from "lucide-react";
import { AuthContext } from "@/lib/AuthContext";
import Linkedin from "@/pages/Linkedin";
import PostPreview from "@/components/linkedin/posts/PostPreview";
import CommentCoach from "@/components/linkedin/networking/CommentCoach";
import {
  SuggestionCard,
  ThreadBubble,
  ConversationHeader,
  STATE_META,
} from "@/components/linkedin/networking/OutreachComposer";
import { GOAL_LABELS } from "@/components/linkedin/networking/OutreachConversationsList";
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

    // PostgREST: linkedin_outreach_conversations list (3J-C)
    if (url.includes("/rest/v1/linkedin_outreach_conversations")) {
      const rows = fixture.outreachConversations ?? [];
      return jsonResponse(rows);
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

    // Edge function: generate-linkedin-comment (3J-C CommentCoach)
    if (url.includes("/functions/v1/generate-linkedin-comment")) {
      const result = fixture.commentCoachState?.result ?? { options: [] };
      return jsonResponse(result);
    }

    // Edge function: generate-linkedin-outreach-message (3J-C composer).
    // Returns the full conversation payload shape callEdge() expects.
    if (url.includes("/functions/v1/generate-linkedin-outreach-message")) {
      const conv = fixture.threadConversation;
      const suggestion = fixture.threadSuggestion;
      if (!conv || !suggestion) {
        return jsonResponse({ error: "No threadConversation/suggestion seeded." }, 500);
      }
      return jsonResponse({
        conversation_id: conv.id,
        goal: conv.goal,
        target_person: conv.target_person,
        message_thread: conv.message_thread,
        status: conv.status,
        suggestion,
      });
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

  if (action.kind === "click-new-conversation") {
    const btn = document.querySelector('button[data-action="new-conversation"]');
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
    return;
  }

  if (action.kind === "pick-goal-propose-internship") {
    // Two-step: New conversation → goal pick.
    const newBtn = document.querySelector('button[data-action="new-conversation"]');
    if (newBtn && newBtn instanceof HTMLElement) {
      newBtn.click();
    }
    // The goal picker mounts after state change — give React a tick.
    setTimeout(() => {
      const goalBtn = document.querySelector('button[data-goal="propose_internship"]');
      if (goalBtn && goalBtn instanceof HTMLElement) {
        goalBtn.click();
      }
    }, 60);
    return;
  }

  if (action.kind === "fill-comment-coach") {
    const setter = (el, value) => {
      if (!el) return;
      const proto =
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      desc?.set?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const postEl = document.querySelector('textarea[placeholder*="Paste the LinkedIn post"]');
    const nameEl = document.querySelector('input[placeholder*="Sarah Chen"]');
    const headlineEl = document.querySelector('input[placeholder*="VP Customer Success"]');
    setter(postEl, action.postText || "");
    setter(nameEl, action.authorName || "");
    setter(headlineEl, action.authorHeadline || "");
    setTimeout(() => {
      const gen = document.querySelector('button[data-action="generate-comments"]');
      if (gen && gen instanceof HTMLElement) {
        gen.click();
      }
    }, 60);
    return;
  }
}

// Manual page-shell wrapper for `subtreeOnly` fixtures. Mirrors the
// live Linkedin.jsx shell — kept in sync deliberately so subtree
// fixtures look identical to the full-page render. LI_CSS retired in
// 3J-C; this shell is now pure Tailwind + rd tokens.
function PageShell({ tab = "posts", children }) {
  return (
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
                  ? "text-rd-text border-b-[2.5px] border-rd-primary"
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
  );
}

// Outreach thread subtree (3J-C) — renders the OutreachComposer card
// surface manually using exported subcomponents (ConversationHeader,
// ThreadBubble, SuggestionCard). The composer's screen-state machine
// is bypassed; the harness seeds final-state data directly so the
// suggestion + thread render without needing user interaction.
function OutreachThreadSubtree({ fixture }) {
  const conv = fixture.threadConversation;
  const suggestion = fixture.threadSuggestion;
  const goalLabel = GOAL_LABELS[conv.goal] || conv.goal;
  const stateMeta = suggestion?.conversation_state
    ? STATE_META[suggestion.conversation_state]
    : null;
  const [draftText, setDraftText] = useState(suggestion?.suggested_text || "");
  return (
    <div className="bg-white border border-rd-border rounded-[18px] p-5 sm:p-6 shadow-rd">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] text-rd-text-secondary hover:text-rd-text"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <h3 className="font-display font-bold text-[14px] text-rd-text">
            Outreach to {conv.target_person?.name || "(no name)"}
          </h3>
        </div>
        {conv.status === "active" && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="text-[11.5px] inline-flex items-center gap-1 text-rd-teal-dark hover:bg-rd-teal-tint px-2 py-1 rounded-full"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />Done
            </button>
            <button
              type="button"
              className="text-[11.5px] inline-flex items-center gap-1 text-rd-text-secondary hover:bg-rd-bg-soft px-2 py-1 rounded-full"
            >
              <Archive className="w-3.5 h-3.5" />Shelve
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <ConversationHeader
          goal={conv.goal}
          goalLabel={goalLabel}
          target={conv.target_person || {}}
          status={conv.status}
          showGoalEdit={false}
          setShowGoalEdit={() => {}}
          onChangeGoal={() => {}}
          generating={false}
        />

        {conv.message_thread?.length > 0 && (
          <div className="space-y-2.5 bg-rd-bg-soft border border-rd-border rounded-[14px] p-3 max-h-[500px] overflow-y-auto">
            {conv.message_thread.map((msg, i) => (
              <ThreadBubble
                key={i}
                msg={msg}
                editing={false}
                editingDraft=""
                setEditingDraft={() => {}}
                onStartEdit={() => {}}
                onCancelEdit={() => {}}
                onSave={() => {}}
              />
            ))}
          </div>
        )}

        <SuggestionCard
          suggestion={suggestion}
          stateMeta={stateMeta}
          draftText={draftText}
          setDraftText={setDraftText}
          generating={false}
          onAcceptAndSend={() => {}}
          onRegenerate={() => {}}
          target={conv.target_person || {}}
        />
      </div>
    </div>
  );
}

// Comment Coach subtree (3J-C) — renders CommentCoach standalone and
// drives the inputs + generate via post-mount DOM events. The result
// payload is returned by the mocked /generate-linkedin-comment edge fn.
function CommentCoachSubtree() {
  return (
    <div className="max-w-3xl mx-auto">
      <CommentCoach />
    </div>
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

  // Comment-coach subtree fixtures: auto-drive the inputs + Generate
  // click so the result card renders. The fixture's commentCoachState
  // payload is returned by the mocked /generate-linkedin-comment fn.
  useEffect(() => {
    if (fixture.subtreeOnly !== "comment-coach") return;
    if (!fixture.commentCoachState) return;
    const t = setTimeout(() => {
      applyPostMountAction({
        kind: "fill-comment-coach",
        postText: fixture.commentCoachState.postText,
        authorName: fixture.commentCoachState.authorName,
        authorHeadline: fixture.commentCoachState.authorHeadline,
      });
    }, 300);
    return () => clearTimeout(t);
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

  if (fixture.subtreeOnly === "outreach-thread") {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
            <PageShell tab="networking">
              <div className="max-w-3xl mx-auto">
                <OutreachThreadSubtree fixture={fixture} />
              </div>
            </PageShell>
          </div>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  if (fixture.subtreeOnly === "comment-coach") {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
            <PageShell tab="networking">
              <CommentCoachSubtree />
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
