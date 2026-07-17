import React from "react";
import { PALETTES } from "./palette";
import { AMP_LEVELS, AMP_LABELS } from "./amplitude";

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
// The choice round-trips through ?palette= / ?amp= so a reload (and a shared
// link) keeps the reading, matching the ?logo= precedent on this fixture.
//
// The AMPLITUDE row appears only under Yishai — amplitude is Yishai-only for now
// (the field re-flips at the chosen rung later), so the toggle is hidden where it
// would be a no-op rather than shown dead.
function PillRow({ label, ids, value, onChange, labelFor, swatchFor }) {
  return (
    <div className="flex items-center gap-1">
      <span className="px-2 rd-t-micro font-bold uppercase tracking-[0.14em] text-neutral-500 select-none">
        {label}
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
              "rounded-full px-3 py-1.5 rd-t-body-s font-semibold transition-colors duration-150 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1",
              "active:translate-y-px",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
            ].join(" ")}
          >
            <span className="flex items-center gap-1.5">
              {swatchFor && (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15"
                  style={{ background: swatchFor(id) }}
                />
              )}
              {labelFor(id)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function CanvasPaletteSwitcher({
  value,
  onChange,
  amp,
  onAmpChange,
}) {
  const ids = Object.keys(PALETTES);
  const showAmp = value === "yishai" && amp && onAmpChange;
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-1.5 py-1.5 shadow-[0_8px_28px_rgba(20,20,25,0.18)] ring-1 ring-black/10"
      role="group"
      aria-label="Palette switcher"
    >
      <PillRow
        label="Palette"
        ids={ids}
        value={value}
        onChange={onChange}
        labelFor={(id) => PALETTES[id].label}
        swatchFor={(id) => PALETTES[id].tokens["--rd-coral"]}
      />
      {showAmp && (
        <>
          <span aria-hidden="true" className="h-5 w-px bg-neutral-200" />
          <PillRow
            label="Colour"
            ids={AMP_LEVELS}
            value={amp}
            onChange={onAmpChange}
            labelFor={(id) => AMP_LABELS[id]}
          />
        </>
      )}
    </div>
  );
}
