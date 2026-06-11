import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import TopLoadingBar from "./components/ui/TopLoadingBar";
import SidebarFooter from "./components/layout/SidebarFooter";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Map,
  Menu,
  X,
  User,
  Briefcase,
  ChevronRight,
  Brain,
  FileText,
  Mic,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentDrawerProvider, useAgentDrawer } from "@/lib/AgentDrawerContext";
import AgentDrawer from "@/components/agent/AgentDrawer";

// Sidebar information architecture — top-level sections + footer.
// Sections with `items` are collapsible groups; sections with a direct
// `page` route are single-link entries. The active section auto-expands
// based on currentPageName so the user always sees the relevant
// sub-items without manual clicking.
//
// Internship is conditionally inserted as a top-level section between
// Activity and LinkedIn based on profiles.practicum_path (DB column name
// kept — see CLAUDE.md). Only renders when the user has chosen a path.
//
// Subagents (the legacy router page) is intentionally NOT linked from
// here. The 4 agent pages it routed to are now top-level under Chat.
// The Subagents file stays registered as an orphan in pages.config.js;
// it can be deleted in a separate cleanup PR.
// Seamless-IA nav slim-down (design handoff, scopes 1+2 of 3): the old
// Career group (Roadmap/Jobs/StoryBank/Resources), Activity group
// (Tracker/Calendar/Tasks), and the LinkedIn item leave the nav. Roadmap +
// Jobs are replaced by the Career page; Tasks live on Today; Tracker is
// reachable from Today's Pipeline card; StoryBank/CV/LinkedIn surface as
// Today's quick-access tiles. All old pages stay registered and routable —
// deep links keep working.
//
// The Chat section stays untouched (full-page agents remain the deep entry
// until the Phase B merge). The new Coach item is the drawer entry —
// founder decision after production use: the right-edge floating tab was
// too invisible, so the entry moves into the left sidebar styled as a
// first-class nav item. Coach is NOT a route; clicking it opens the
// existing drawer panel via useAgentDrawer().open(). The Sparkles icon
// matches Home's coach-band glyph for surface continuity.
const BASE_SECTIONS = [
  {
    id: "home",
    label: "Today",
    icon: LayoutDashboard,
    page: "Home",
  },
  {
    id: "coach",
    label: "Coach",
    icon: Sparkles,
    action: "open-agent-drawer",
  },
  {
    id: "career",
    label: "Career",
    icon: Map,
    page: "Career",
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

const INTERNSHIP_SECTION = {
  id: "internship",
  label: "Internship",
  icon: Briefcase,
  page: "Internship",
};

const ONBOARDING_PAGE = "Onboarding";

// Section is "active" if currentPageName matches its direct `page` OR any of its `items[].page`.
function findActiveSectionId(sections, currentPageName) {
  for (const section of sections) {
    if (section.page === currentPageName) return section.id;
    if (section.items?.some((it) => it.page === currentPageName)) return section.id;
  }
  return null;
}

// Decorative 4-dot logo glyph — the same mark the onboarding shell, login
// page, and tutorial use. Kept inline (not extracted) because the shell
// is the canonical place; if another consumer needs it later we'll lift.
function BrandMark() {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div className="grid grid-cols-2 gap-[3px]">
        <span className="w-[7px] h-[7px] rounded-full bg-rd-coral" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-golden" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-teal" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-text" />
      </div>
      <span className="font-display font-bold text-[17px] tracking-tight text-rd-text">
        Get A Job
      </span>
    </div>
  );
}

// Layout is split into an outer wrapper that mounts the
// AgentDrawerProvider and an inner LayoutBody that consumes
// useAgentDrawer. The sidebar's Coach item needs the drawer state to
// drive its active-while-panel-open styling, so the body has to live
// inside the provider; doing this inline in a single Layout function
// would put the hook call outside the provider scope.
export default function Layout({ children, currentPageName }) {
  return (
    <AgentDrawerProvider>
      <LayoutBody currentPageName={currentPageName}>{children}</LayoutBody>
    </AgentDrawerProvider>
  );
}

function LayoutBody({ children, currentPageName }) {
  const { user } = useAuth();
  const { isOpen: agentDrawerOpen, open: openAgentDrawer } = useAgentDrawer();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const location = useLocation();

  // Layout-chrome gating: picks the three profile fields Layout actually
  // cares about — onboarding_complete (drives whether the sidebar shows
  // at all), practicum_path (drives whether the Internship section
  // appears — DB column name kept as practicum_path), and full_name
  // (used by SidebarFooter for the avatar initials + name). Backed by
  // the canonical profile cache, so this shares a single fetch with
  // every other page in the app.
  const { data: profileChrome } = useProfileQuery(user?.id, (p) => ({
    practicum_path: p?.practicum_path ?? null,
    onboarding_complete: p?.onboarding_complete === true,
    full_name: p?.full_name ?? null,
  }));

  const practicumPath = profileChrome?.practicum_path ?? null;
  const onboardingComplete = profileChrome?.onboarding_complete === true;
  const profileFullName = profileChrome?.full_name ?? null;

  // Conditional Internship top-level section, inserted between Activity
  // (pipeline) and LinkedIn. Only rendered when the user has chosen an
  // internship path on Profile.
  const sections = useMemo(() => {
    if (practicumPath == null) return BASE_SECTIONS;
    const pipelineIdx = BASE_SECTIONS.findIndex((s) => s.id === "pipeline");
    const insertAt = pipelineIdx >= 0 ? pipelineIdx + 1 : BASE_SECTIONS.length;
    return [
      ...BASE_SECTIONS.slice(0, insertAt),
      INTERNSHIP_SECTION,
      ...BASE_SECTIONS.slice(insertAt),
    ];
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
  // `data-private` on both Layout branches puts every authenticated
  // surface inside the selector PostHog's session replay uses to mask
  // DOM text content (PostHogProvider config: maskTextSelector:
  // "[data-private]"). It prevents the user's CV preview, AI-generated
  // outputs (career analysis, LinkedIn posts/comments/outreach, STAR
  // stories, tasks, application/JD text), chat messages, profile
  // fields rendered as text, and the SidebarFooter's full_name from
  // landing in session replays. Form-input values (passwords, profile
  // edits, pasted JDs) are already masked by `maskAllInputs: true`.
  // Replays still capture the visual frame, clicks, scroll, and error
  // states — just no readable text inside the authenticated app.
  // Public surfaces (Landing / Login / Privacy / Terms / ResetPassword)
  // are rendered outside Layout and stay unmasked since they don't
  // display existing user content.
  if (currentPageName === ONBOARDING_PAGE || !onboardingComplete) {
    return <div data-private>{children}</div>;
  }

  const closeMobileSidebar = () => setSidebarOpen(false);

  // Coach nav item handler — opens the agent drawer + closes the mobile
  // sidebar so the panel/sheet animation isn't competing with the
  // sidebar's slide-in overlay.
  const handleCoachClick = () => {
    closeMobileSidebar();
    openAgentDrawer({});
  };

  return (
    <div
      data-private
      className="flex h-screen bg-rd-bg-page font-body text-rd-text"
    >
      <TopLoadingBar loading={navLoading} />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-rd-text/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar — cream sidebar surface (--rd-bg-sidebar) matches the
          mockup in docs/design/redesign/getajob_home_locked_crowz_style.html.
          Border is the warm border token; legacy --rd-border so it sits
          flush against the cream page background without a hard edge. */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-rd-bg-sidebar border-r border-rd-border flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-5 py-5 border-b border-rd-border-subtle">
          <div className="flex items-center justify-between">
            <BrandMark />
            <button
              className="lg:hidden p-1 rounded-md hover:bg-rd-bg-soft transition-colors"
              onClick={closeMobileSidebar}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-rd-text-secondary" />
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
              agentDrawerOpen={agentDrawerOpen}
              onToggle={() => toggleSection(section.id)}
              onNavigate={closeMobileSidebar}
              onCoachClick={handleCoachClick}
            />
          ))}
        </nav>

        <SidebarFooter
          profileFullName={profileFullName}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      {/* Main content. The `legacy-body` wrapper forces the warm page
          background underneath any unrestyled page that still ships a
          legacy white/grey background — keeps the cream sidebar from
          clashing while the per-page restyles roll out. Pages restyled
          on rd tokens can leave their own backgrounds alone; pages that
          set `bg-white` etc. as their root will paint over this with the
          rd page color via the CSS reset below. */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-rd-bg-card border-b border-rd-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-rd-bg-soft transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-rd-text" />
          </button>
          <BrandMark />
          <div className="w-9" />
        </header>

        <main className="legacy-body flex-1 overflow-y-auto bg-rd-bg-page">
          {children}
        </main>
      </div>

      {/* Agent drawer — panel/sheet only. The original right-edge tab
          retired in this PR; the sidebar Coach item is the new entry.
          Panel mechanics unchanged: desktop right-side panel + mobile
          bottom sheet at z-[60], overlay z-[58]. Still layers above
          ApplicationDetailDrawer's Sheet (z-50). */}
      <AgentDrawer />
    </div>
  );
}

// One section row. Three render branches:
//   1. `action: "open-agent-drawer"` → button that opens the agent drawer
//      via the parent's onCoachClick handler. NOT a route. Active styling
//      applies while the panel is open (agentDrawerOpen prop).
//   2. `section.page` → Link to a route (Home / Career / Internship / Profile).
//   3. `section.items` → collapsible group with sub-item Links.
//
// Active state highlighting — coral on cream — matches the active-row
// treatment from the home mockup.
function SidebarSection({
  section,
  currentPageName,
  isExpanded,
  isActiveSection,
  agentDrawerOpen,
  onToggle,
  onNavigate,
  onCoachClick,
}) {
  const Icon = section.icon;

  // Action section — currently just "open-agent-drawer" for the Coach
  // entry. Renders as a button; coral active styling fires while the
  // drawer is open (agentDrawerOpen).
  if (section.action === "open-agent-drawer") {
    const isActive = !!agentDrawerOpen;
    return (
      <button
        type="button"
        onClick={onCoachClick}
        aria-pressed={isActive}
        data-coach-entry
        className={cn(
          "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-display font-semibold transition-colors duration-150",
          isActive
            ? "bg-rd-coral-tint text-rd-coral-dark"
            : "text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text",
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{section.label}</span>
        {isActive && (
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-rd-coral flex-shrink-0"
          />
        )}
      </button>
    );
  }

  // Direct-link section (Home, LinkedIn, Profile).
  if (section.page) {
    const isActive = currentPageName === section.page;
    return (
      <Link
        to={createPageUrl(section.page)}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-display font-semibold transition-colors duration-150",
          isActive
            ? "bg-rd-coral-tint text-rd-coral-dark"
            : "text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text",
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{section.label}</span>
        {isActive && (
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-rd-coral flex-shrink-0"
          />
        )}
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
        data-section-id={section.id}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-display font-semibold transition-colors duration-150",
          isActiveSection
            ? "text-rd-text"
            : "text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text",
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-rd-text-secondary transition-transform duration-200",
            isExpanded && "rotate-90",
          )}
        />
      </button>
      {isExpanded && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-rd-border space-y-0.5">
          {section.items.map((item) => {
            const isActive = currentPageName === item.page;
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[12.5px] font-medium transition-colors duration-150",
                  isActive
                    ? "bg-rd-coral-tint text-rd-coral-dark font-display font-semibold"
                    : "text-rd-text-tertiary hover:bg-rd-bg-soft hover:text-rd-text",
                )}
              >
                <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full bg-rd-coral flex-shrink-0"
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
