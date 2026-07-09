import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import ProfileTab from "@/components/linkedin/ProfileTab";
import PostsTab from "@/components/linkedin/PostsTab";
import NetworkingTab from "@/components/linkedin/NetworkingTab";

// LinkedIn hub — three-tab page (Profile / Posts / Networking),
// URL-driven via ?tab=. All three tabs ship on rd-* tokens. The
// legacy LI_CSS injection + `.li` wrapper were retired in PR 3J-C
// after a repo-wide audit confirmed zero remaining `.li-*` className
// consumers.
//
// See docs/research/linkedin-post-performance.md for the research
// grounding the Posts + Networking tabs.

const TABS = [
  { id: "profile",    label: "Profile",    Component: ProfileTab },
  { id: "posts",      label: "Posts",      Component: PostsTab },
  { id: "networking", label: "Networking", Component: NetworkingTab },
];
const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

export default function LinkedinOptimizer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    initialTab && VALID_TAB_IDS.has(initialTab) ? initialTab : "profile"
  );

  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl && VALID_TAB_IDS.has(fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }

  }, [searchParams]);

  const handleTabClick = (id) => {
    if (id === activeTab) return;
    setActiveTab(id);
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab)?.Component || ProfileTab;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
          {/* Header */}
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            LinkedIn
          </p>
          <h1 className="font-display font-extrabold text-[27px] sm:text-[32px] leading-[1.08] tracking-tight text-rd-text mt-1">
            Build your presence - profile, posts, outreach.
          </h1>

          {/* Tab bar — underline pattern per Profile mockup
              (Rokkitt 600, 15px, coral underline 2.5px on selected,
              soft-line container divider 1.5px) */}
          <div
            className="flex gap-[22px] mt-5 border-b-[1.5px] border-rd-border-subtle"
            role="tablist"
            aria-label="LinkedIn hub sections"
          >
            {TABS.map(({ id, label }) => {
              const selected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => handleTabClick(id)}
                  className={[
                    "appearance-none border-0 bg-transparent font-display text-[15px] font-semibold cursor-pointer pb-[9px] -mb-[1.5px] transition-colors duration-150 whitespace-nowrap",
                    selected
                      ? "text-rd-text border-b-[2.5px] border-rd-coral"
                      : "text-rd-text-secondary border-b-[2.5px] border-transparent hover:text-rd-text",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

      {/* Tab content */}
      <div className="mt-4">
        <ActiveTabComponent />
      </div>
    </div>
  );
}
