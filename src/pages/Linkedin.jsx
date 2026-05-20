import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { User, FileText, Users } from "lucide-react";

import ProfileTab from "@/components/linkedin/ProfileTab";
import PostsTab from "@/components/linkedin/PostsTab";
import NetworkingTab from "@/components/linkedin/NetworkingTab";
import { LI_CSS } from "@/components/linkedin/linkedinStyles";

// LinkedIn — three-tab hub for profile optimization, post creation, and
// networking outreach coaching. URL-driven via ?tab= so deep links work.
//
// Direction 3 visual pass (PR-A) — .li token scope cascades to all three
// tabs and their sub-components. PR-B adds the social-profile mockup
// preview on Profile and the feed-card preview + image upload on Posts.
//
// See docs/research/linkedin-post-performance.md for the research grounding
// the Posts + Networking tabs.

const TABS = [
  { id: "profile",    label: "Profile",    Icon: User,     Component: ProfileTab },
  { id: "posts",      label: "Posts",      Icon: FileText, Component: PostsTab },
  { id: "networking", label: "Networking", Icon: Users,    Component: NetworkingTab },
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
    <>
      <style>{LI_CSS}</style>
      <div className="li">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Header */}
          <p className="li-eyebrow">LinkedIn</p>
          <h1 className="li-h1 mt-1.5">Show up like the candidate you are.</h1>
          <p className="li-sub">
            Optimise your profile, draft posts in your voice, and coach networking outreach — all grounded in your real experience.
          </p>

          {/* Tab pill bar */}
          <div className="li-tabs mt-7 mb-6" role="tablist" aria-label="LinkedIn hub sections">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => handleTabClick(id)}
                className="li-tab"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <ActiveTabComponent />
        </div>
      </div>
    </>
  );
}
