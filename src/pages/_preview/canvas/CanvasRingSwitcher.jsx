// Pinned on-page ring switcher (round 3, step 3 refined). A small control fixed
// to the viewport corner on the fixture pages so A / B / C flip live across the
// whole card grid (Browse, top-matches, kanban) without editing the URL. Writes
// through the ring store, which keeps ?ring in sync — the param still works
// underneath and a pick stays shareable. Mounted once in the shell.
import React, { useSyncExternalStore } from "react";
import {
  RING_VARIANT_KEYS,
  getRingVariant,
  setRingVariant,
  subscribeRing,
} from "./ringStore";

export default function CanvasRingSwitcher() {
  const v = useSyncExternalStore(subscribeRing, getRingVariant, () => "a");
  return (
    <div className="fixed top-3 right-3 z-[90] flex items-center gap-1.5 rd-lift rd-r-md px-2 py-1.5">
      <span className="rd-t-micro font-mono uppercase tracking-[0.08em] text-rd-text-tertiary">
        ring
      </span>
      <div className="inline-flex items-center gap-0.5 rd-well rd-r-sm p-0.5">
        {RING_VARIANT_KEYS.map((k) => {
          const on = v === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setRingVariant(k)}
              aria-pressed={on}
              aria-label={`Ring variant ${k.toUpperCase()}`}
              className={`rd-t-micro font-display font-bold rd-r-xs px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral ${
                on
                  ? "bg-rd-coral text-white shadow-rd"
                  : "text-rd-text-secondary hover:text-rd-text"
              }`}
            >
              {k.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
