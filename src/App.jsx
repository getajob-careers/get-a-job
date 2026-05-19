import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import PostHogProvider from '@/lib/PostHogProvider';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import Landing from '@/pages/Landing';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

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
  return (
    <PostHogProvider>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
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

