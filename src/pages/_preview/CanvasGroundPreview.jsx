// Slice 1 (Phase 2) - canvas ground bake-off, ROUND 3.
//
// Rounds 1 (dots, #678) and 2 (baked grain) were BOTH rejected the same way:
// Eli's eye reads any high-frequency speckle as a dirty screen. Ruling: no dots,
// no grain, no speckle, no particulate texture on the ground, EVER. (Logged in
// docs/design/phase2-canvas-arrival-plan.md, superseding the "Option 1 dots"
// ruling at the category level.)
//
// Round 3: if the ground earns any treatment, it must be SMOOTH and
// low-frequency - tonal, not textural. Three smooth variants against a FLAT
// control that is now a live candidate (two rejections mean "nothing" may be the
// right answer - the variants compete against flat, not against each other):
//   - flat        : pure cream, no treatment
//   - mottle      : large, heavily-blurred warm colour blobs (the DepthField
//                   family, static) - cloud-like tonal variation, zero particles
//   - vignette    : soft radial edge wash, cream deepening warm toward the edges
//                   so the centre breathes
//   - directional : a gentle diagonal wash, one corner slightly deeper
//
// Bar (unchanged): real canvas palette (#F4EBDA ground / #FFFCF4 cards / #60617D
// primary), cream stays WARM (deepen toward warm tones, never grey), white cards
// lift off the ground, no shimmer on scroll (ground is FIXED), and NO visible
// banding (banding is speckle's cousin and equally disqualifying - washes are
// kept low-amplitude and large-scale; confirm on a real display). The soft-light
// (mean-preserving) finding from round 2 carries forward to anything tonal.
// DEV-only, self-contained, no auth. Bake-off, not the shipped implementation.

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";

// Warm deepening tone for the washes = the --rd-shadow hue (warm brown), so the
// cream deepens without greying. Kept low-alpha + large-scale to avoid banding.
const WARM = "96, 72, 62";

const VARIANTS = [
  {
    id: "flat",
    label: "Flat",
    note: "Pure cream, no treatment. A live candidate: after two rejections, nothing may be right.",
  },
  {
    id: "mottle",
    label: "Warm mottle",
    note: "Large blurred warm blobs (DepthField family, static) - cloud-like tonal depth, zero particles",
    mottle: true,
  },
  {
    id: "vignette",
    label: "Edge wash",
    note: "Soft radial vignette - cream deepens warm toward the edges, centre breathes",
    wash: `radial-gradient(125% 115% at 50% 42%, transparent 52%, rgba(${WARM}, 0.06) 100%)`,
  },
  {
    id: "directional",
    label: "Directional wash",
    note: "Gentle diagonal wash - one corner slightly deeper, even and smooth",
    wash: `linear-gradient(152deg, transparent 42%, rgba(${WARM}, 0.05) 100%)`,
  },
];

// The DepthField blobs, mirrored from src/components/redesign/DepthField.jsx
// (single source of truth) so the bake-off shows the real canonical treatment.
function MottleLayer() {
  return (
    <>
      <div
        className="absolute rounded-full"
        style={{
          width: 460,
          height: 460,
          top: -150,
          right: -130,
          background: "var(--rd-primary)",
          filter: "blur(140px)",
          opacity: 0.1,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 360,
          height: 360,
          bottom: -110,
          left: "30%",
          background: "var(--rd-teal)",
          filter: "blur(130px)",
          opacity: 0.12,
        }}
      />
    </>
  );
}

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
            white card lifting off the ground.
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
  const [v, setV] = useState("mottle");
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

  const isMottle = !!variant.mottle;
  const washStyle = variant.wash
    ? { backgroundImage: variant.wash }
    : undefined;

  return (
    <div className="relative min-h-screen">
      {/* FIXED ground - cream field + (optionally) a smooth tonal wash. Fixed so
          nothing moves as content scrolls over it => no shimmer. These are
          PREVIEW inline treatments; the winner (or flat) becomes a token. */}
      <div
        className="fixed inset-0 bg-rd-bg-page overflow-hidden"
        aria-hidden="true"
      >
        {isMottle && <MottleLayer />}
        {washStyle && <div className="absolute inset-0" style={washStyle} />}
      </div>

      {/* Content sits above the fixed ground. */}
      <div className="relative">
        {/* Controls on a plain card strip so the ground below is a clean canvas. */}
        <div className="border-b border-rd-border bg-rd-bg-card px-6 py-4">
          <h1 className="font-display font-extrabold text-[20px] text-rd-text mb-1">
            Canvas ground - smooth bake-off (round 3)
          </h1>
          <p className="text-[12.5px] text-rd-text-secondary mb-3 max-w-[820px]">
            Particulate texture is retired (dots, then grain, both read as a
            dirty screen). This tests SMOOTH, low-frequency tonal treatments
            against a flat ground. Flat is a live candidate - pick a variant
            only if it clearly earns its place over nothing. Bar: cream stays
            warm (never grey), white cards lift, no scroll shimmer, no visible
            banding.
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

        {/* Extra height so Eli can scroll and confirm the fixed ground / wash
            does not shimmer, drift, or reveal banding under the content. */}
        <div className="px-4 pb-16 flex gap-3">
          <div className="rd-lift rd-r-lg flex-1 p-6">
            <p className="text-[13px] font-display font-bold text-rd-text mb-1">
              Scroll check
            </p>
            <p className="text-[12.5px] text-rd-text-secondary leading-relaxed max-w-[560px]">
              Scroll this page. The wash belongs to a fixed ground layer, so it
              stays put while these cards move over it - no drift, no shimmer.
              Watch the large open cream areas for banding (smooth stepping in
              the gradient); there should be none.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
