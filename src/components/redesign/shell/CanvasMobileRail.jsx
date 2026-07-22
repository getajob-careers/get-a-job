import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { createPageUrl } from "@/utils";
import CoachDock from "@/components/agent/CoachDock";
import CanvasAvatarChip from "./CanvasAvatarChip";

// Below-md sidebar: content-first. The full sidebar is hidden and the nav + coach
// + account collapse into a fixed bottom icon rail (standard mobile pattern) so
// the first screen is the work, never the navigation. Shows the ruled nav items
// (a horizontally-scrollable icon row) + a Coach toggle (slide-up sheet) + the
// account avatar. (Fuller mobile nav polish is PR4.)

function RailItem({ item }) {
  const Icon = item.icon;
  const cls =
    "flex-shrink-0 inline-flex items-center justify-center w-11 h-9 rd-r-sm text-rd-text-secondary hover:text-rd-primary hover:bg-rd-bg-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary";
  return (
    <Link
      to={createPageUrl(item.page)}
      className={cls}
      aria-label={item.label}
      title={item.label}
    >
      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
    </Link>
  );
}

export default function CanvasMobileRail({ navItems = [], coach, account }) {
  const [coachOpen, setCoachOpen] = useState(false);

  return (
    <div className="md:hidden">
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-0.5 bg-rd-bg-sidebar/95 backdrop-blur border-t border-rd-border px-2 py-1.5"
        style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
        aria-label="Primary"
      >
        <div className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto cx-carousel">
          {navItems.map((item) => (
            <RailItem key={item.id} item={item} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCoachOpen(true)}
          aria-label="Open coach"
          title="Coach"
          className="flex-shrink-0 inline-flex items-center justify-center w-11 h-9 rd-r-sm text-rd-primary hover:bg-rd-primary-tint transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary"
        >
          <Sparkles
            className="w-[18px] h-[18px]"
            aria-hidden="true"
            strokeWidth={2}
          />
        </button>
        <CanvasAvatarChip compact account={account} />
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
              <span className="font-display font-bold rd-t-body-m text-rd-text">
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
              {coach || <CoachDock />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
