import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { LAZY_PAGES, LAZY_MAIN_PAGE } from './pages.lazy'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import PostHogProvider from '@/lib/PostHogProvider';
import CookieConsentBanner from '@/components/consent/CookieConsentBanner';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';

// Redesign preview harness. Statically imported, but the route block below
// registers it ONLY when SHOW_PREVIEW_ROUTES is true — local dev OR a Vercel
// PREVIEW build (see the const after the imports). In a PRODUCTION build it
// folds to false → the route block becomes dead code → React Router never
// matches /_preview/* → the path falls through to AuthenticatedApp →
// unauthenticated visitors land on /login. See tasks/redesign.md +
// scripts/preview-onboarding.mjs.
//
// Earlier attempt used React.lazy + Suspense fallback={null}; under
// Vite dev with the harness routes deeply nested the lazy chunk
// resolved AFTER Playwright snapshotted the page (Suspense fallback
// rendered nothing → empty body in screenshots). Eager import sidesteps
// the race. Bundle cost in prod: ~10–15 KB (cold path; never invoked).
import OnboardingPreview from '@/pages/_preview/OnboardingPreview';
import AuthCallback from '@/pages/AuthCallback';
import ShellPreview from '@/pages/_preview/ShellPreview';
import HomePreview from '@/pages/_preview/HomePreview';
import CareerPreview from '@/pages/_preview/CareerPreview';
import JobsLogoPreview from '@/pages/_preview/JobsLogoPreview';
import JobsGridPreview from '@/pages/_preview/JobsGridPreview';
import LandingV2Preview from '@/pages/_preview/LandingV2Preview';
import CVAgentPreview from '@/pages/_preview/CVAgentPreview';
import CVAgentLivePreview from '@/pages/_preview/CVAgentLivePreview';
import RoadmapPreview from '@/pages/_preview/RoadmapPreview';
import ProfilePreview from '@/pages/_preview/ProfilePreview';
import StoryBankPreview from '@/pages/_preview/StoryBankPreview';
import TasksPreview from '@/pages/_preview/TasksPreview';
import CalendarPreview from '@/pages/_preview/CalendarPreview';
import LinkedinPreview from '@/pages/_preview/LinkedinPreview';
import ChatPreview from '@/pages/_preview/ChatPreview';
import InternshipPreview from '@/pages/_preview/InternshipPreview';
import ResourcesPreview from '@/pages/_preview/ResourcesPreview';
import SettingsPreview from '@/pages/_preview/SettingsPreview';
import DrawerPreview from '@/pages/_preview/DrawerPreview';
import RouteFallback, { ChunkErrorBoundary } from '@/components/RouteFallback';

/* global __PREVIEW_ROUTES__ */
// _preview/* routes render in local dev (import.meta.env.DEV) AND on Vercel
// PREVIEW builds only. __PREVIEW_ROUTES__ is defined in vite.config.js as
// (process.env.VERCEL_ENV === "preview"); a PRODUCTION build folds it to false
// and strips every _preview route as dead code, even if this branch later
// merges to main.
const SHOW_PREVIEW_ROUTES = import.meta.env.DEV || __PREVIEW_ROUTES__;

// Use the LAZY map (sibling of pages.config.js) so every authenticated
// route becomes its own chunk. pages.config.js is read-only (auto-
// generated) per its header; LAZY_PAGES mirrors its keys but wraps each
// page in React.lazy() except for Onboarding (kept eager — see
// pages.lazy.js comments for the WhatsApp-link first-impression rationale).
//
// Layout still comes from pages.config (it's not page-specific data; it's
// the shared dashboard chrome wrapped around every authenticated route).
const { Layout } = pagesConfig;
const mainPageKey = LAZY_MAIN_PAGE;
const MainPage = LAZY_PAGES[mainPageKey];

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Render the main app. PostHogProvider wraps the routes (not the auth
  // gate above) so that:
  //   - PostHog never initializes on /login or /reset-password
  //   - PostHog initializes once per session, after isAuthenticated flips
  //   - Logout unmounts the provider, which resets the distinct_id
  //
  // ChunkErrorBoundary wraps Suspense so a failed lazy-chunk fetch
  // mid-load renders a "couldn't load — reload" CTA instead of crashing
  // the whole authenticated tree. The global handler in main.jsx covers
  // the pre-Suspense failure path (one-shot reload). Together they cover
  // both flavours of stale-tab-after-deploy.
  return (
    <PostHogProvider>
      <ChunkErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            } />
            {/* Legacy redirect: /Practicum → /Internship. The page was
                renamed but old WhatsApp / email links may still hit the
                old URL. Drop after a few weeks if logs show no traffic. */}
            <Route path="/Practicum" element={<Navigate to="/Internship" replace />} />
            {Object.entries(LAZY_PAGES).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                }
              />
            ))}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>
      {/* Floating "Got feedback?" widget — mounted as a sibling of
          <Routes> (NOT inside Layout) so it doesn't get hidden by
          Layout's chrome-gate during the profile-fetch window. The
          widget owns its own /Onboarding pathname check via
          useLocation, so we don't need a wrapper here. AuthenticatedApp
          has already gated on isAuthenticated + user, so when this
          renders the widget is guaranteed to see a non-null user. */}
      <FeedbackWidget />
    </PostHogProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Public surfaces — rendered OUTSIDE the auth gate and OUTSIDE
                the dashboard Layout. The homepage is auth-aware (CTAs flip
                based on session; logged-in visitors auto-bounce to /Home).
                LandingV2Preview is the live homepage. /Landing is the explicit
                NON-BOUNCING marketing-page route for logged-in users (the /
                auto-bounce is pathname-gated to "/"); it now renders the SAME
                LandingV2Preview as /. The old Landing component is retired from
                routing — its file (src/pages/Landing.jsx) stays on disk for the
                dead-code ritual. Rollback = revert this PR. */}
            <Route path="/" element={<LandingV2Preview />} />
            <Route path="/Landing" element={<LandingV2Preview />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/* OAuth (PKCE/implicit) callback — PUBLIC, outside the auth gate;
                the session does not exist until the exchange completes. */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/onboarding/:state"
                element={<OnboardingPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/shell/:state"
                element={<ShellPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/home/:state"
                element={<HomePreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/career"
                element={<CareerPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/jobs-logos"
                element={<JobsLogoPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/jobs-grid"
                element={<JobsGridPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/landing-v2"
                element={<LandingV2Preview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/cv-agent"
                element={<CVAgentPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/cv-agent-live"
                element={<CVAgentLivePreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/roadmap/:state"
                element={<RoadmapPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/profile/:state"
                element={<ProfilePreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/storybank/:state"
                element={<StoryBankPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/tasks/:state"
                element={<TasksPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/calendar/:state"
                element={<CalendarPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/linkedin/:state"
                element={<LinkedinPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/chat/:state"
                element={<ChatPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/internship/:state"
                element={<InternshipPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/resources/:state"
                element={<ResourcesPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/settings/:state"
                element={<SettingsPreview />}
              />
            )}
            {SHOW_PREVIEW_ROUTES && (
              <Route
                path="/_preview/drawer/:state"
                element={<DrawerPreview />}
              />
            )}
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
          {/* Cookie-consent banner. Renders on every route; suppresses
              itself for signed-in users and when a choice is stored. Governs
              the anonymous early-init analytics path only. */}
          <CookieConsentBanner />
        </Router>
        <Toaster />
        <SonnerToaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

