// Slice 1 (Phase 2) - canvas ground bake-off, ROUND 2.
//
// Round 1 (#678) tested dialed dot-grain variants. Eli's ruling: all three
// rejected AND the dot-grain direction retired - dots read as a dirty screen,
// not paper. (Supersedes the earlier "Option 1 dots" ruling.)
//
// New target: the ground should feel like the canvas grain did BEFORE the
// feTurbulence retirement - fine organic PAPER fiber - reached WITHOUT runtime
// feTurbulence (the retirement stands). Approach: turbulence-style fractal noise
// baked ONCE into a small seamless grayscale tile (scripts/gen-canvas-grain.mjs
// -> assets/canvas-grain.png, 128px, ~15KB). At runtime the browser only blits a
// bitmap; no filter is evaluated. The tile is laid with `mix-blend-mode:
// soft-light` (mean-preserving), so it modulates the cream WITHOUT greying it -
// the exact defect that retired the old multiply grain.
//
// Three variants, one of which is a completely FLAT untextured ground, so Eli can
// judge whether grain earns its place at all. Same bar as round 1: real canvas
// palette (#F4EBDA ground / #FFFCF4 cards / #60617D primary), white cards lifting
// off the ground, no shimmer on scroll (the ground is FIXED; content scrolls over
// it, so the tile never moves). DEV-only, self-contained, no auth.
//
// This is the bake-off, not the shipped implementation: once Eli picks a variant,
// the winner becomes a token-level ground treatment on the flag-on canvas.

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import grainUrl from "./assets/canvas-grain.png";

// Each variant = how the baked grain tile is applied over the cream ground.
// opacity is the ONLY dial (soft-light strength); grain:false = the flat control.
const VARIANTS = [
  {
    id: "flat",
    label: "Flat",
    note: "No texture - pure cream ground. The control: does grain earn its place?",
    grain: false,
  },
  {
    id: "faint",
    label: "Grain - faint",
    note: "Baked turbulence tile, soft-light @ 0.5 - fiber you feel more than see",
    grain: true,
    opacity: 0.5,
  },
  {
    id: "present",
    label: "Grain - present",
    note: "Same tile, soft-light @ 0.85 - paper fiber clearly there, cream unchanged",
    grain: true,
    opacity: 0.85,
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
            white card lifting off the textured ground.
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
  const [v, setV] = useState("present");
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
    <div className="relative min-h-screen">
      {/* FIXED ground - the cream field + (optionally) the baked grain. Fixed so
          the tile never moves as content scrolls over it => no shimmer. Grain is
          a PREVIEW inline treatment; the winner becomes a token (no token yet). */}
      <div className="fixed inset-0 bg-rd-bg-page" aria-hidden="true">
        {variant.grain && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${grainUrl})`,
              backgroundRepeat: "repeat",
              mixBlendMode: "soft-light",
              opacity: variant.opacity,
            }}
          />
        )}
      </div>

      {/* Content sits above the fixed ground. */}
      <div className="relative">
        {/* Controls on a plain card strip so the ground below is a clean canvas. */}
        <div className="border-b border-rd-border bg-rd-bg-card px-6 py-4">
          <h1 className="font-display font-extrabold text-[20px] text-rd-text mb-1">
            Canvas ground - grain bake-off (round 2)
          </h1>
          <p className="text-[12.5px] text-rd-text-secondary mb-3 max-w-[760px]">
            Dots are retired. This tests baked paper-fiber grain (turbulence
            rendered once to a tiling image, no runtime feTurbulence) against a
            completely flat ground. Pick where the white cards lift cleanly, the
            grain reads as paper (not a screen), and the cream is not greyed.
            Scroll: the ground is fixed, so grain never shimmers.
          </p>
          <div className="inline-flex bg-rd-bg-soft rounded-full p-1">
            {VARIANTS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setV(o.id)}
                aria-pressed={v === o.id}
                className={`rd-press px-4 py-1.5 rounded-full font-display font-bold text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-1 focus-visible:ring-offset-rd-bg-soft ${
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

        {/* Lanes on the ground. */}
        <div className="p-4 flex gap-3">
          <CoachCard />
          <DocLaneCard />
          <RailCard />
        </div>

        {/* Extra height so Eli can scroll and confirm the fixed ground / grain
            does not shimmer or drift under the content. */}
        <div className="px-4 pb-16 flex gap-3">
          <div className="rd-lift rd-r-lg flex-1 p-6">
            <p className="text-[13px] font-display font-bold text-rd-text mb-1">
              Scroll check
            </p>
            <p className="text-[12.5px] text-rd-text-secondary leading-relaxed max-w-[560px]">
              Scroll this page. The grain belongs to a fixed ground layer, so it
              stays put while these cards move over it - no moire, no shimmer.
              White cards keep lifting off the textured cream at any scroll
              position.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
