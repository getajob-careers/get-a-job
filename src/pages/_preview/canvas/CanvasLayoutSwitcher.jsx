// Pinned LAYOUT switcher (round 3) — flips the toolkit rail between GRID and
// CAROUSEL live on the desktop, like the ring switcher. Writes through the layout
// store (keeps ?layout in sync). Ripped out with the losing variant once Eli
// picks. Fixed to the viewport corner; canvas-only.
import React, { useSyncExternalStore } from "react";
import {
  LAYOUT_KEYS,
  getLayout,
  setLayout,
  subscribeLayout,
} from "./layoutStore";

const LABELS = { grid: "Grid", carousel: "Carousel" };

export default function CanvasLayoutSwitcher() {
  const v = useSyncExternalStore(subscribeLayout, getLayout, () => "grid");
  return (
    <div className="fixed top-3 right-3 z-[90] flex items-center gap-1.5 rd-lift rd-r-md px-2 py-1.5">
      <span className="rd-t-micro font-mono uppercase tracking-[0.08em] text-rd-text-tertiary">
        layout
      </span>
      <div className="inline-flex items-center gap-0.5 rd-well rd-r-sm p-0.5">
        {LAYOUT_KEYS.map((k) => {
          const on = v === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setLayout(k)}
              aria-pressed={on}
              className={`rd-t-micro font-display font-bold rd-r-xs px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral ${
                on
                  ? "bg-rd-coral text-white shadow-rd"
                  : "text-rd-text-secondary hover:text-rd-text"
              }`}
            >
              {LABELS[k]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
