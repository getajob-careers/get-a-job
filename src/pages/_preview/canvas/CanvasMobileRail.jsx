import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { CANVAS_FIXTURES } from "./canvasConfig";
import CanvasCoachDock from "./CanvasCoachDock";
import CoachDock from "@/components/agent/CoachDock";
import CanvasAvatarChip from "./CanvasAvatarChip";

// Below-md sidebar: content-first. The full sidebar is hidden and the tiles +
// coach + account collapse into a fixed bottom icon rail (standard mobile
// pattern) so the first screen is the work, never the navigation. Tab-switching
// tiles (Tracker/Browse) are already in the tab bar, so the rail shows only the
// nav tiles (LinkedIn / Story bank / CV bank / Profile) + a Coach toggle (opens
// a slide-up sheet) + the account avatar.

function RailItem({ tile }) {
  const Icon = tile.icon;
  const cls =
    "flex-shrink-0 inline-flex items-center justify-center w-11 h-9 rounded-lg text-rd-text-secondary hover:text-rd-coral hover:bg-rd-bg-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral";
  return (
    <Link
      to={tile.href}
      className={cls}
      aria-label={tile.label}
      title={tile.label}
    >
      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
    </Link>
  );
}

export default function CanvasMobileRail({ tiles }) {
  const [coachOpen, setCoachOpen] = useState(false);
  const navTiles = tiles.filter((t) => t.href); // exclude the tab-switchers

  return (
    <div className="md:hidden">
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around gap-0.5 bg-rd-bg-sidebar/95 backdrop-blur border-t border-rd-border px-2 py-1.5"
        style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
        aria-label="Sidebar"
      >
        {navTiles.map((t) => (
          <RailItem key={t.id} tile={t} />
        ))}
        <button
          type="button"
          onClick={() => setCoachOpen(true)}
          aria-label="Open coach"
          title="Coach"
          className="flex-shrink-0 inline-flex items-center justify-center w-11 h-9 rounded-lg text-rd-coral hover:bg-rd-coral-tint transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral"
        >
          <Sparkles
            className="w-[18px] h-[18px]"
            aria-hidden="true"
            strokeWidth={2}
          />
        </button>
        <CanvasAvatarChip compact />
      </nav>

      {coachOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[rgba(40,25,10,0.4)]"
            onClick={() => setCoachOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-[72vh] bg-rd-bg-sidebar rounded-t-[20px] flex flex-col overflow-hidden shadow-[0_-16px_40px_rgba(40,25,10,0.25)]">
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
              <span className="font-display font-bold text-[13px] text-rd-text">
                Coach
              </span>
              <button
                type="button"
                onClick={() => setCoachOpen(false)}
                aria-label="Close coach"
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-card transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              {CANVAS_FIXTURES ? <CanvasCoachDock /> : <CoachDock />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
