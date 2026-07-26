// Demo-only permanent left sidebar for the 3-tab homepage prototype
// (Home3TabPreview.jsx). NOTE FOR REVIEWERS: if/when the 3-tab layout
// ships for real, this is the intended shape of the FUTURE site-wide
// sidebar (a likely eventual replacement for Layout.jsx's current nav
// column) - it is kept as a fully self-contained component for exactly
// that reason. Its only coupling to the host page is the single `onHome`
// callback prop, so it can be lifted wholesale into Layout.jsx in a later
// pass without untangling anything from this demo's tab logic.
//
// Icon behavior: Home is the only wired action here (it returns the host
// page to its default CV tab - this whole 3-tab page is what a user lands
// on right after onboarding, so "Home" means "this page"). CV / Tracker /
// Browse Jobs are deliberately NOT icons in this grid - the top tab bar
// already covers those, and duplicating them here would be redundant.
// Every other icon is a visual stub (toast) for now - no real navigation
// wired yet.

import React from "react";
import {
  Home,
  Sparkles,
  Linkedin,
  BookMarked,
  FileText,
  Puzzle,
  UserCircle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import CoachDock from "@/components/agent/CoachDock";

function stub(label) {
  toast.info(`${label} isn't wired up yet in this prototype.`);
}

export default function Home3TabSidebar({ onHome }) {
  const tiles = [
    { id: "home", label: "Home", icon: Home, onClick: onHome },
    {
      id: "coach",
      label: "Your coach",
      icon: Sparkles,
      onClick: () => stub("Your coach"),
    },
    {
      id: "linkedin",
      label: "LinkedIn tools",
      icon: Linkedin,
      onClick: () => stub("LinkedIn tools"),
    },
    {
      id: "storybank",
      label: "Story bank",
      icon: BookMarked,
      onClick: () => stub("Story bank"),
    },
    {
      id: "cvbank",
      label: "CV bank",
      icon: FileText,
      onClick: () => stub("CV bank"),
    },
    {
      id: "browser",
      label: "In your browser",
      icon: Puzzle,
      onClick: undefined,
      soon: true,
    },
    {
      id: "profile",
      label: "Profile",
      icon: UserCircle,
      onClick: () => stub("Profile"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      onClick: () => stub("Settings"),
    },
  ];

  return (
    <div
      className="w-full md:w-[220px] flex-shrink-0 flex flex-col gap-4 md:h-full min-h-0"
      data-demo-sidebar
    >
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <SidebarTile key={tile.id} {...tile} />
        ))}
      </div>
      <div className="flex-1 min-h-[280px] md:min-h-0 bg-rd-bg-sidebar rounded-[16px] flex flex-col">
        <CoachDock />
      </div>
    </div>
  );
}

function SidebarTile({ label, icon: Icon, onClick, soon = false }) {
  return (
    <button
      type="button"
      onClick={soon ? undefined : onClick}
      disabled={soon}
      aria-label={soon ? `${label} - coming soon` : label}
      className={`group flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[12px] border p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2 ${
        soon
          ? "bg-rd-bg-soft border-rd-border-subtle cursor-not-allowed opacity-60"
          : "bg-rd-bg-card border-rd-border hover:border-rd-border-hover hover:bg-rd-bg-soft cursor-pointer"
      }`}
    >
      <Icon
        className="w-5 h-5 text-rd-text-secondary group-hover:text-rd-text transition-colors"
        aria-hidden="true"
      />
      <span className="text-[9.5px] font-display font-semibold text-rd-text-secondary group-hover:text-rd-text leading-tight text-center transition-colors">
        {label}
      </span>
      {soon && (
        <span className="text-[8px] uppercase tracking-[0.06em] font-mono text-rd-text-tertiary">
          Soon
        </span>
      )}
    </button>
  );
}
