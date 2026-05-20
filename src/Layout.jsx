import React, { useState, useEffect, useMemo } from "react";
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
  Calendar as CalendarIcon,
  User,
  Briefcase,
  Target,
  ChevronRight,
  Brain,
  FileText,
  Mic,
  GraduationCap,
  Linkedin as LinkedinIcon,
  MessageCircle,
  BookText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Sidebar information architecture — 5 top-level sections + footer.
// Sections with `items` are collapsible groups; sections with a direct
// `page` route are single-link entries. The active section auto-expands
// based on currentPageName so the user always sees the relevant
// sub-items without manual clicking.
//
// Practicum is conditionally rendered inside the Pipeline section based
// on profiles.practicum_path — same gate as before, just moved one level
// deeper in the structure.
//
// Subagents (the legacy router page) is intentionally NOT linked from
// here. The 4 agent pages it routed to are now top-level under Chat.
// The Subagents file stays registered as an orphan in pages.config.js;
// it can be deleted in a separate cleanup PR.
const SECTIONS = [
  {
    id: "home",
    label: "Home",
    icon: LayoutDashboard,
    page: "Home",
  },
  {
    id: "career",
    label: "Career",
    icon: Map,
    items: [
      { name: "Roadmap", page: "Roadmap", icon: Map },
      { name: "Jobs", page: "Jobs", icon: Target },
      { name: "Story Bank", page: "StoryBank", icon: BookText },
      { name: "Resources", page: "Resources", icon: BookOpen },
    ],
  },
  {
    // section id stays "pipeline" so the active-section auto-expand logic
    // (which keys off the id) keeps working. Just the user-facing label
    // changed from "Pipeline" to "Activity" — the word "pipeline" still
    // appears contextually in places like the Home card and Practicum
    // page where it reads as the right metaphor.
    id: "pipeline",
    label: "Activity",
    icon: ClipboardList,
    items: [
      { name: "Tracker", page: "Tracker", icon: ClipboardList },
      { name: "Calendar", page: "Calendar", icon: CalendarIcon },
      { name: "Tasks", page: "Tasks", icon: CheckSquare },
      // Practicum is appended at runtime when profiles.practicum_path is set.
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: LinkedinIcon,
    page: "Linkedin",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    items: [
      { name: "Career Agent", page: "CareerAgent", icon: Brain },
      { name: "CV Agent", page: "CVAgent", icon: FileText },
      { name: "Interview Coach", page: "InterviewCoach", icon: Mic },
      { name: "Skill Advisor", page: "SkillDevelopmentAdvisor", icon: GraduationCap },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    page: "Profile",
  },
];

const ONBOARDING_PAGE = "Onboarding";

// Section is "active" if currentPageName matches its direct `page` OR any of its `items[].page`.
function findActiveSectionId(sections, currentPageName) {
  for (const section of sections) {
    if (section.page === currentPageName) return section.id;
    if (section.items?.some((it) => it.page === currentPageName)) return section.id;
  }
  return null;
}

export default function Layout({ children, currentPageName }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const location = useLocation();

  // Layout-chrome gating: fetches the three profile fields Layout actually
  // cares about — onboarding_complete (drives whether the sidebar shows at
  // all), practicum_path (drives whether the Practicum sub-item appears),
  // and full_name (used by SidebarFooter for the avatar initials + name).
  // Single round trip, .maybeSingle() returns null cleanly for new signups
  // who don't have a profile row yet.
  const { data: profileChrome } = useQuery({
    queryKey: ["profile_layout_chrome", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("practicum_path, onboarding_complete, full_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const practicumPath = profileChrome?.practicum_path ?? null;
  const onboardingComplete = profileChrome?.onboarding_complete === true;
  const profileFullName = profileChrome?.full_name ?? null;

  // Conditional Practicum sub-item inside the Pipeline section.
  const sections = useMemo(() => {
    if (practicumPath == null) return SECTIONS;
    return SECTIONS.map((s) =>
      s.id === "pipeline"
        ? { ...s, items: [...s.items, { name: "Practicum", page: "Practicum", icon: Briefcase }] }
        : s,
    );
  }, [practicumPath]);

  const activeSectionId = findActiveSectionId(sections, currentPageName);

  // Expanded-section state. Initialize with the active section expanded,
  // all others collapsed. The user can toggle other sections open by
  // clicking their headers; state persists across mode changes but
  // resets when the active section changes (i.e. the active section is
  // always expanded). One section can be manually expanded at a time in
  // addition to the active one — the user's intent.
  const [expandedSections, setExpandedSections] = useState(() =>
    activeSectionId ? new Set([activeSectionId]) : new Set(),
  );

  // Keep the active section in the expanded set when route changes.
  useEffect(() => {
    if (!activeSectionId) return;
    setExpandedSections((prev) => {
      if (prev.has(activeSectionId)) return prev;
      const next = new Set(prev);
      next.add(activeSectionId);
      return next;
    });
  }, [activeSectionId]);

  const toggleSection = (id) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow collapsing the active section — would leave the user
        // unable to see where they are in the nav.
        if (id === activeSectionId) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <TopLoadingBar loading={navLoading} />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E5E5E5] flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
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
              onClick={closeMobileSidebar}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-[#525252]" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {sections.map((section) => (
            <SidebarSection
              key={section.id}
              section={section}
              currentPageName={currentPageName}
              isExpanded={expandedSections.has(section.id)}
              isActiveSection={activeSectionId === section.id}
              onToggle={() => toggleSection(section.id)}
              onNavigate={closeMobileSidebar}
            />
          ))}
        </nav>

        <SidebarFooter
          profileFullName={profileFullName}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E5E5]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[#F5F5F5]"
            aria-label="Open menu"
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

// One section row. Direct-link sections render as a single Link.
// Item-bearing sections render as a header button + (when expanded)
// the indented sub-item list. Active state highlighting matches the
// pre-restructure pattern: the dark gradient fill on the active page.
function SidebarSection({
  section,
  currentPageName,
  isExpanded,
  isActiveSection,
  onToggle,
  onNavigate,
}) {
  const Icon = section.icon;

  // Direct-link section (Home, LinkedIn, Profile).
  if (section.page) {
    const isActive = currentPageName === section.page;
    return (
      <Link
        to={createPageUrl(section.page)}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-gradient-to-r from-[#0A0A0A] to-[#1a1a2e] text-white shadow-sm"
            : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]",
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{section.label}</span>
      </Link>
    );
  }

  // Collapsible section — header toggles expand, sub-items navigate.
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          isActiveSection
            ? "text-[#0A0A0A]"
            : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]",
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-[#A3A3A3] transition-transform duration-200",
            isExpanded && "rotate-90",
          )}
        />
      </button>
      {isExpanded && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-[#F0F0F0] space-y-0.5">
          {section.items.map((item) => {
            const isActive = currentPageName === item.page;
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-gradient-to-r from-[#0A0A0A] to-[#1a1a2e] text-white shadow-sm"
                    : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]",
                )}
              >
                <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
