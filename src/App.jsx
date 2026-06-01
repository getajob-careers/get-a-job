import { Suspense } from 'react';
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
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import Landing from '@/pages/Landing';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import RouteFallback, { ChunkErrorBoundary } from '@/components/RouteFallback';

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
                the dashboard Layout. Landing is auth-aware (CTAs flip based
                on session) but doesn't redirect on auth state — same URL
                shows for everyone. */}
            <Route path="/" element={<Landing />} />
            <Route path="/Landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

