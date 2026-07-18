// Persistent left sidebar (the mockup's `.side`): brand -> profile-strength chip
// -> labeled 2-col nav grid -> coach card. PR2 (shell nav), sourced verbatim from
// the handoff mockup's structure; the nav ROSTER is the ruled roster (Eli), not
// the mockup's illustrative labels.
import React from "react";
import { Link } from "react-router-dom";
import {
  Map,
  User,
  FileText,
  BookOpen,
  Linkedin,
  Mic,
  GraduationCap,
  Settings,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import CoachDock from "@/components/agent/CoachDock";
import CanvasLogo from "./CanvasLogo";
import ProfileStrengthChip from "./ProfileStrengthChip";
import CanvasMobileRail from "./CanvasMobileRail";

// The ruled nav roster (Eli): Today + Internship trashed; Chat is the coach card
// (below), not a grid item; Jobs is a home tab; Tasks/Roadmap/Calendar/Resources
// stay deep-link only. Career takes the lead slot. `page` is the createPageUrl key
// AND the currentPageName match for the active state.
const NAV_ITEMS = [
  { id: "career", label: "Career", icon: Map, page: "Career" },
  { id: "profile", label: "Profile", icon: User, page: "Profile" },
  { id: "cvbank", label: "CV bank", icon: FileText, page: "CVAgent" },
  { id: "storybank", label: "Story bank", icon: BookOpen, page: "StoryBank" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, page: "Linkedin" },
  { id: "coach", label: "Interview coach", icon: Mic, page: "InterviewCoach" },
  {
    id: "skills",
    label: "Skill hub",
    icon: GraduationCap,
    page: "SkillDevelopmentAdvisor",
  },
  { id: "settings", label: "Settings", icon: Settings, page: "Settings" },
];

// Labeled 2-col nav grid (mockup `.icon-grid` / `.ig-item`). Active item = the
// mockup's filled accent tile; the rest are quiet ink-soft tiles that warm on
// hover. Every item is a real route (createPageUrl); nothing is a no-op.
function NavGrid({ currentPageName, onNavigate }) {
  return (
    <nav className="grid grid-cols-2 gap-2" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = currentPageName === item.page;
        return (
          <Link
            key={item.id}
            to={createPageUrl(item.page)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={
              "flex flex-col items-center gap-1 rd-r-md px-2 py-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral " +
              (active
                ? "bg-rd-coral text-white"
                : "text-rd-text-secondary hover:bg-rd-bg-soft hover:text-rd-text")
            }
          >
            <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
            <span className="rd-t-micro font-medium leading-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// Coach card (mockup `.coach`): a warm gradient card frame that owns the
// sidebar's remaining height, wrapping the REAL coach node (production CoachDock;
// the fixture dock in the preview). The dock supplies its own "Coach" header +
// expand, so the frame stays header-less to avoid a duplicate. `p-2` keeps the
// gradient border visible around the dock.
function CoachCard({ coach }) {
  return (
    <div
      className="flex-1 min-h-0 flex flex-col rd-r-lg border border-rd-border p-2 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, var(--rd-bg-soft), var(--rd-golden-tint))",
      }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {coach || <CoachDock />}
      </div>
    </div>
  );
}

// `coach` = the dock node. `onOpenChat` = open the real coach panel. `account` =
// the mobile-rail avatar. `currentPageName` drives the active nav tile. `name` /
// `profileStrength` power the profile chip (strength waits on the data-source
// table - null renders a neutral ring, no fabricated %).
export default function CanvasSidebar({
  coach,
  account,
  currentPageName,
  name,
  profileStrength = null,
}) {
  return (
    <>
      {/* Desktop: full left sidebar. Hidden below md - content-first there. */}
      <div className="hidden md:flex md:w-[248px] flex-shrink-0 flex-col gap-4 md:h-full min-h-0">
        <Link
          to={createPageUrl("Home")}
          aria-label="Get A Job home"
          className="inline-flex px-1 rd-r-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral"
        >
          <CanvasLogo size={26} />
        </Link>
        <ProfileStrengthChip name={name} strength={profileStrength} />
        <NavGrid currentPageName={currentPageName} />
        <CoachCard coach={coach} />
      </div>

      {/* Below md: fixed bottom icon rail (out of flow -> work fills first). */}
      <CanvasMobileRail navItems={NAV_ITEMS} coach={coach} account={account} />
    </>
  );
}
