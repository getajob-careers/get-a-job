import React from "react";
import { PALETTES } from "./palette";

// Pinned palette switcher (round 4 challenger round, fixture-only). Flip between
// the incumbent Clay and the challengers on the real fixture Home, full page.
//
// Deliberate design-craft exception, and the reason it is NOT built from rd-*
// tokens: this control is the INSTRUMENT, and an instrument that repaints itself
// with every reading is useless — you could never tell whether the chrome you're
// judging is the palette or the switcher. So it is pinned to a fixed neutral ink
// on white, identical under every candidate. It ships only behind CANVAS_FIXTURES
// and never reaches a user, so it is not a token-discipline regression.
//
// The choice round-trips through ?palette= so a reload (and a shared link) keeps
// the reading, matching the ?logo= precedent on this fixture.
export default function CanvasPaletteSwitcher({ value, onChange }) {
  const ids = Object.keys(PALETTES);
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-1.5 py-1.5 shadow-[0_8px_28px_rgba(20,20,25,0.18)] ring-1 ring-black/10"
      role="group"
      aria-label="Palette switcher"
    >
      <span className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500 select-none">
        Palette
      </span>
      {ids.map((id) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={[
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1",
              "active:translate-y-px",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
            ].join(" ")}
          >
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15"
                style={{ background: PALETTES[id].tokens["--rd-coral"] }}
              />
              {PALETTES[id].label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
