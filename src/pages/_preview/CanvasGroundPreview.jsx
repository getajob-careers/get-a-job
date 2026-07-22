// Slice 1 (Phase 2) - textured canvas ground bake-off. Renders the canvas ground
// with 2-3 dialed dot-grain variants + mock lane cards (document / matched-roles
// / coach) on it, so Eli picks the grain by eye and confirms the white cards
// (#FFFCF4) lift off the ground (#F4EBDA). DEV-only, self-contained, no auth.
//
// CSS dot-grain only (NO feTurbulence, per ruling): a radial-gradient dot layer
// over the ground token. The chosen variant becomes a token-level `.rd-ground`
// treatment on the flag-on canvas surface (flag-on only); this preview is the
// bake-off, not the shipped implementation.
//
// The dot is a warm-brown tint (matches the rd-lift shadow hue, rgba(74,44,22)),
// so the grain reads as part of the paper world, not a cool grid.

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";

// Each variant = the background-image + background-size applied OVER the ground.
// dot = radius(px) / opacity / hue; gap = tile size(px). Dialed subtle -> grain,
// not grid.
const VARIANTS = [
  {
    id: "a",
    label: "A - Fine & faint",
    note: "1px dot, 6% warm, 18px tile - subtlest; grain you feel, not see",
    dot: "radial-gradient(rgba(74,44,22,0.06) 1px, transparent 1.4px)",
    size: "18px 18px",
  },
  {
    id: "b",
    label: "B - Balanced",
    note: "1px dot, 8% warm, 22px tile - present but soft; the safe pick",
    dot: "radial-gradient(rgba(74,44,22,0.08) 1px, transparent 1.5px)",
    size: "22px 22px",
  },
  {
    id: "c",
    label: "C - Warm & open",
    note: "1.3px dot, 9% deeper-warm, 26px tile - more paper texture, airier",
    dot: "radial-gradient(rgba(96,58,30,0.09) 1.3px, transparent 1.8px)",
    size: "26px 26px",
  },
];

function DocLaneCard() {
  return (
    <div className="rd-lift rd-r-lg overflow-hidden flex-1 min-w-0">
      <div className="h-[52px] border-b border-rd-border flex items-center px-4 gap-3 bg-rd-bg-card">
        <div className="w-7 h-7 rounded-lg bg-rd-primary-tint grid place-items-center">
          <span className="text-[11px] font-display font-bold text-rd-primary-dark">
            CV
          </span>
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-display font-bold text-rd-text">
            Master CV
          </p>
          <p className="text-[11px] text-rd-text-tertiary">
            Your full, untailored CV
          </p>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rd-primary text-white text-[12.5px] font-medium">
          <Download className="w-3.5 h-3.5" /> Download PDF
        </span>
      </div>
      <div className="bg-rd-bg-card px-10 py-8">
        <div className="max-w-[520px]">
          <div className="text-[26px] font-display font-extrabold text-rd-text leading-tight">
            Eli Englard
          </div>
          <div className="text-[13px] text-rd-text-secondary mt-1">
            elienglard@example.com · Herzliya, Israel
          </div>
          <p className="text-[11px] font-display font-bold uppercase tracking-[0.11em] text-rd-primary mt-6 mb-2">
            Summary
          </p>
          <p className="text-[13px] text-rd-text leading-[1.6]">
            Business Administration student focused on digital innovation, with
            hands-on product and analytics experience. The document lane is a
            white card on the textured ground.
          </p>
        </div>
      </div>
    </div>
  );
}

function RailCard() {
  return (
    <aside className="rd-lift rd-r-lg overflow-hidden w-[300px] shrink-0 flex flex-col">
      <div className="px-4 py-3">
        <h2 className="font-display font-bold text-[14px] text-rd-text">
          Your matched roles
        </h2>
        <p className="text-[9.5px] uppercase tracking-[0.12em] font-semibold text-rd-text-eyebrow font-mono mt-3 mb-2">
          Our picks for you
        </p>
        {["Customer Support Specialist", "Data Analyst", "Ops Associate"].map(
          (r) => (
            <div
              key={r}
              className="rd-r-md border border-rd-border bg-rd-bg-card px-3 py-2.5 mb-2"
            >
              <p className="text-[13px] font-display font-semibold text-rd-text">
                {r}
              </p>
              <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
                DealHub · Holon
              </p>
            </div>
          ),
        )}
      </div>
    </aside>
  );
}

function CoachCard() {
  return (
    <aside className="rd-lift rd-r-lg overflow-hidden w-[220px] shrink-0 p-3">
      <p className="text-[13px] font-display font-bold text-rd-text mb-1">
        Coach
      </p>
      <p className="text-[12px] text-rd-text-secondary leading-relaxed">
        Knows your roadmap, your pipeline, and this page.
      </p>
    </aside>
  );
}

export default function CanvasGroundPreview() {
  const [v, setV] = useState("b");
  const variant = VARIANTS.find((x) => x.id === v);

  // Force the flag-on canvas palette so the bake-off shows the REAL ground
  // (#F4EBDA) + cards (#FFFCF4) + primary (#60617d), never the default theme.
  useEffect(() => {
    const el = document.documentElement;
    const had = el.hasAttribute("data-next-design");
    el.setAttribute("data-next-design", "");
    return () => {
      if (!had) el.removeAttribute("data-next-design");
    };
  }, []);

  return (
    <div className="min-h-screen bg-rd-bg-page">
      {/* Controls sit on a plain strip so the ground below is a clean canvas. */}
      <div className="border-b border-rd-border bg-rd-bg-card px-6 py-4">
        <h1 className="font-display font-extrabold text-[20px] text-rd-text mb-1">
          Canvas ground - dot-grain bake-off
        </h1>
        <p className="text-[12.5px] text-rd-text-secondary mb-3 max-w-[720px]">
          Same lanes, three grain variants. Pick the one where the white cards
          lift cleanly and the grain reads as paper texture, not a grid. The
          winner becomes a token-level <code>.rd-ground</code> on the flag-on
          canvas (CSS dots, no feTurbulence).
        </p>
        <div className="inline-flex bg-rd-bg-soft rounded-full p-1">
          {VARIANTS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setV(o.id)}
              className={`px-4 py-1.5 rounded-full font-display font-bold text-[12.5px] transition-colors ${
                v === o.id
                  ? "bg-rd-primary text-white"
                  : "text-rd-text-secondary hover:text-rd-text"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-rd-text-tertiary mt-2 font-mono">
          {variant.note}
        </p>
      </div>

      {/* The ground: rd-bg-page + the selected dot-grain, with the lanes on it. */}
      <div
        className="p-4 flex gap-3 min-h-[calc(100vh-140px)]"
        style={{ backgroundImage: variant.dot, backgroundSize: variant.size }}
      >
        <CoachCard />
        <DocLaneCard />
        <RailCard />
      </div>
    </div>
  );
}
