import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import TopLoadingBar from "./components/ui/TopLoadingBar";
import SidebarFooter from "./components/layout/SidebarFooter";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Map,
  ClipboardList,
  BookOpen,
  Menu,
  X,
  CheckSquare,
  Layers,
  Calendar as CalendarIcon,
  Linkedin,
  Sparkles,
  User,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Home", page: "Home", icon: LayoutDashboard },
  { name: "Career Roadmap", page: "CareerRoadmap", icon: Map },
  { name: "Job Suggestions", page: "JobSuggestions", icon: Linkedin },
  { name: "LinkedIn Optimizer", page: "LinkedinOptimizer", icon: Sparkles },
  { name: "Calendar", page: "Calendar", icon: CalendarIcon },
  { name: "Tracker", page: "Tracker", icon: ClipboardList },
  { name: "Practicum", page: "Practicum", icon: Briefcase },
  { name: "Tasks", page: "Tasks", icon: CheckSquare },
  { name: "AI Agents", page: "Subagents", icon: Layers },
  { name: "Resources", page: "Resources", icon: BookOpen },
  { name: "Profile", page: "AddInformation", icon: User },
];

const ONBOARDING_PAGE = "Onboarding";

export default function Layout({ children, currentPageName }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const location = useLocation();

  // Layout-chrome gating: fetches the two profile fields Layout actually
  // cares about — onboarding_complete (drives whether the sidebar shows at
  // all) and practicum_path (drives whether /Practicum appears in the nav).
  // Single round trip, .maybeSingle() returns null cleanly for new signups
  // who don't have a profile row yet.
  const { data: profileChrome } = useQuery({
    queryKey: ["profile_layout_chrome", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("practicum_path, onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const practicumPath = profileChrome?.practicum_path ?? null;
  const onboardingComplete = profileChrome?.onboarding_complete === true;

  const navItems = NAV_ITEMS.filter(
    (item) => item.page !== "Practicum" || practicumPath != null
  );

  useEffect(() => {
    setNavLoading(true);
    const t = setTimeout(() => setNavLoading(false), 600);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Hide the dashboard chrome (sidebar + top-loading-bar + main shell) in
  // any state where the user shouldn't be seeing it. Three cases:
  //   1. The user is on the Onboarding page itself.
  //   2. The profile query hasn't returned yet (pessimistic — prevents the
  //      sidebar from flashing for new signups whose Home mount triggers
  //      the redirect-bounce to /Onboarding).
  //   3. The user has a profile but hasn't completed onboarding — they're
  //      mid-flow and any non-Onboarding route will bounce them back to
  //      /Onboarding via that page's redirect guards.
  // Tradeoff: existing complete users see a ~50-100ms no-chrome window on
  // first profile fetch each session (refresh on any page). Within session,
  // cache (staleTime 5 min) makes subsequent visits chrome-immediate.
  if (currentPageName === ONBOARDING_PAGE || !onboardingComplete) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <TopLoadingBar loading={navLoading} />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E5E5E5] flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-6 py-5 border-b border-[#F0F0F0]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#0A0A0A]">
                Get A Job
              </h1>
              <p className="text-xs text-[#A3A3A3] mt-0.5 tracking-wide uppercase">
                Career Operating System
              </p>
            </div>
            <button
              className="lg:hidden p-1 rounded-md hover:bg-[#F5F5F5]"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-[#525252]" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-gradient-to-r from-[#0A0A0A] to-[#1a1a2e] text-white shadow-sm"
                    : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <SidebarFooter />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E5E5]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[#F5F5F5]"
          >
            <Menu className="w-5 h-5 text-[#0A0A0A]" />
          </button>
          <h1 className="text-sm font-bold tracking-tight">Get A Job</h1>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}