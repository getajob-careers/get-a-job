import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Linkedin, User, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import ProfileTab from "@/components/linkedin/ProfileTab";
import PostsTab from "@/components/linkedin/PostsTab";
import NetworkingTab from "@/components/linkedin/NetworkingTab";

// LinkedinOptimizer — LinkedIn command center hub (PR #31).
//
// Three tabs replacing the original single-purpose Profile-only page:
//   - Profile: existing 7-section optimizer + archive import + per-section
//     refinement (PRs #16-19)
//   - Posts: AI-driven post creator (Phase 2-3 in subsequent PRs)
//   - Networking: comment generator + outreach + static guidance (Phase 4-5)
//
// URL state via ?tab= query param so deep-linking works (Linkedin Optimizer
// nav item in Layout.jsx still routes to /LinkedinOptimizer; tab selector
// re-renders content). Tab state survives navigation between hub tabs and
// reloads.
//
// Eventually each tab gains a "preview as LinkedIn" mirror toggle —
// component shape is structured so Compose / Preview / Mirror can sit
// side-by-side without architectural changes.
//
// See docs/research/linkedin-post-performance.md for the research grounding
// the Posts + Networking tabs.

const TABS = [
  { id: "profile", label: "Profile", Icon: User, Component: ProfileTab },
  { id: "posts", label: "Posts", Icon: FileText, Component: PostsTab },
  { id: "networking", label: "Networking", Icon: Users, Component: NetworkingTab },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

export default function LinkedinOptimizer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    initialTab && VALID_TAB_IDS.has(initialTab) ? initialTab : "profile"
  );

  // Keep activeTab in sync with the URL: when the user navigates with the
  // browser back/forward buttons, the active tab follows. When the user
  // clicks a tab button, we update the URL so links/bookmarks work.
  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl && VALID_TAB_IDS.has(fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabClick = (id) => {
    if (id === activeTab) return;
    setActiveTab(id);
    // Replace (not push) so the tab toggles don't pollute browser history
    // — users back-buttoning out of the page should land at the previous
    // route, not at a previous tab.
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab)?.Component || ProfileTab;

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Linkedin className="w-5 h-5 text-[#0A66C2]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            LinkedIn
          </h1>
        </div>
        <p className="text-sm text-[#A3A3A3] mb-5">
          Optimize your profile, create posts, and grow your network — all grounded in your real experience.
        </p>

        {/* Tab selector — segmented control style */}
        <div className="inline-flex bg-[#F5F5F5] rounded-lg p-1 mb-6">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabClick(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                activeTab === id
                  ? "bg-white text-[#0A0A0A] shadow-sm"
                  : "text-[#525252] hover:text-[#0A0A0A]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-12">
        <ActiveTabComponent />
      </div>
    </div>
  );
}
