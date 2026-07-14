// Persistent left sidebar for the 3-tab home canvas: feature tiles (top) + the
// coach dock (fills the rest). Lifted out of the CV tab in iteration 2 Stage A
// so it stays mounted across CV / Tracker / Browse Jobs. The tiles carry the
// cursor-magnet (useCursorMagnet); Tracker/Browse tiles switch tabs via
// onSwitchTab, the rest are nav links.
import React from "react";
import { Link } from "react-router-dom";
import {
  Linkedin,
  BookOpen,
  FileStack,
  IdCard,
  Columns3,
  Compass,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import CoachDock from "@/components/agent/CoachDock";
import { CANVAS_FIXTURES } from "./canvasConfig";
import { useCursorMagnet } from "./useCursorMagnet";
import CanvasCoachDock from "./CanvasCoachDock";

const ICON_TILES = (onSwitchTab) => [
  {
    id: "linkedin",
    label: "LinkedIn tools",
    icon: Linkedin,
    href: createPageUrl("Linkedin"),
  },
  {
    id: "storybank",
    label: "Story bank",
    icon: BookOpen,
    href: createPageUrl("StoryBank"),
  },
  {
    id: "cvbank",
    label: "CV bank",
    icon: FileStack,
    href: createPageUrl("CVAgent"),
  },
  {
    id: "profile",
    label: "Profile",
    icon: IdCard,
    href: createPageUrl("Profile"),
  },
  {
    id: "tracker",
    label: "Tracker",
    icon: Columns3,
    onClick: () => onSwitchTab?.("tracker"),
  },
  {
    id: "jobs",
    label: "Browse jobs",
    icon: Compass,
    onClick: () => onSwitchTab?.("jobs"),
  },
];

function IconGrid({ tiles }) {
  // Cursor-magnet: tiles lean toward the pointer (iteration 1 Part 3).
  const { containerRef, registerTile } = useCursorMagnet();
  return (
    <div ref={containerRef} className="grid grid-cols-3 gap-2">
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        const content = (
          <>
            <Icon
              className="w-4 h-4 text-rd-text-secondary group-hover:text-rd-text transition-colors"
              aria-hidden="true"
            />
            <span className="text-[10px] font-display font-semibold text-rd-text-secondary group-hover:text-rd-text leading-tight text-center transition-colors">
              {tile.label}
            </span>
          </>
        );
        const className =
          "group flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[12px] bg-rd-bg-card border border-rd-border hover:border-rd-border-hover hover:bg-rd-bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-teal focus-visible:ring-offset-2 p-2";
        // Yishai's exact transform ease (.35s cubic-bezier) for the lean;
        // colours keep the quick 150ms. will-change hints the compositor.
        const style = {
          transition:
            "transform .35s cubic-bezier(.22,.61,.36,1), border-color .15s ease, background-color .15s ease",
          willChange: "transform",
        };
        if (tile.href) {
          return (
            <Link
              key={tile.id}
              ref={registerTile(i)}
              to={tile.href}
              className={className}
              style={style}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={tile.id}
            ref={registerTile(i)}
            type="button"
            onClick={tile.onClick}
            className={className}
            style={style}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

export default function CanvasSidebar({ onSwitchTab }) {
  return (
    <div className="w-full md:w-[220px] flex-shrink-0 flex flex-col gap-4 md:h-full min-h-0">
      <IconGrid tiles={ICON_TILES(onSwitchTab)} />
      <div className="flex-1 min-h-[280px] md:min-h-0 bg-rd-bg-sidebar rounded-[16px] flex flex-col">
        {CANVAS_FIXTURES ? <CanvasCoachDock /> : <CoachDock />}
      </div>
    </div>
  );
}
