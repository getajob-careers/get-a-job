// Warm-field treatments (round 3 rev). Eli's verdict: the ORIGINAL cream+coral
// identity is right — the a/b/c palette swap was rejected. The problem is the
// FIELD (too white, too flat). So these keep every original --rd-* token and
// only transform the background the columns float on. Behind ?field=a|b|c.
//
// Rendered as an absolute, -z-10, pointer-events-none layer inside the shell,
// which is `relative overflow-hidden` — so any oversized shape bleeds off the
// shell edges rather than the document.
//
// References (docs/design/inspo — the project's own research notes):
//   a Atmosphere — 01_invision_freehand_hero: white content floating on a soft,
//                  non-uniform warm peach/blush gradient field; grain over it
//                  (grainient.supply / idea-menu #13), the coach panel's grain
//                  treatment graduated to the whole shell at lower intensity.
//   b Depth      — 02_outcrowd_banking_dashboard: a distinct deeper field tone
//                  with white cards lifted above it by soft long shadows, plus
//                  an oversized brand arc bleeding off-canvas behind the columns.
//   c Bold Warm  — warm editorial poster (not a cream office): the field itself
//                  carries a confident sand/terracotta so coral becomes
//                  punctuation against it, earning one bigger soft moment.
import React from "react";

// Same fractal-noise tile the coach panel uses; SVG data-URI filters are scoped
// to their own document, so sharing the filter id across the page is safe.
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const FIELDS = {
  a: {
    name: "Atmosphere",
    reference: "InVision Freehand hero · grainient.supply grain",
  },
  b: {
    name: "Depth",
    reference: "Outcrowd banking dashboard · layered soft-shadow depth",
  },
  c: {
    name: "Bold Warm",
    reference: "warm editorial poster — the field carries the colour",
  },
};
export const FIELD_KEYS = Object.keys(FIELDS);

// Shell-level var overrides a field legitimately demands (never identity hues).
// Depth lengthens/softens the elevation token so white cards read as lifted.
export function fieldShellStyle(field) {
  if (field === "b") {
    return {
      "--rd-shadow":
        "0 22px 46px -14px rgba(74,48,20,0.22), 0 6px 16px rgba(74,48,20,0.10)",
    };
  }
  if (field === "a") {
    return { "--rd-shadow": "0 16px 36px -12px rgba(82,52,22,0.16)" };
  }
  return {};
}

export default function CanvasField({ field }) {
  if (!FIELDS[field]) return null;

  if (field === "a") {
    // Atmosphere — soft warm washes drifting across a cream base, grain on top.
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden pointer-events-none bg-rd-bg-page"
      >
        <div
          className="cx-atmos absolute inset-[-25%]"
          style={{
            backgroundImage: `
              radial-gradient(38% 34% at 12% 8%, var(--rd-coral-tint) 0%, transparent 62%),
              radial-gradient(34% 30% at 88% 14%, var(--rd-golden-tint) 0%, transparent 60%),
              radial-gradient(44% 42% at 80% 92%, rgba(231,155,125,0.30) 0%, transparent 64%),
              radial-gradient(36% 34% at 8% 90%, var(--rd-golden-tint) 0%, transparent 60%)
            `,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: GRAIN_URL,
            opacity: 0.035,
            mixBlendMode: "multiply",
          }}
        />
        <style>{`
          @keyframes cxAtmosDrift {
            0%   { transform: translate3d(0,0,0) scale(1); }
            50%  { transform: translate3d(2.5%, -2%, 0) scale(1.06); }
            100% { transform: translate3d(0,0,0) scale(1); }
          }
          .cx-atmos { animation: cxAtmosDrift 34s ease-in-out infinite; will-change: transform; }
          @media (prefers-reduced-motion: reduce) { .cx-atmos { animation: none; } }
        `}</style>
      </div>
    );
  }

  if (field === "b") {
    // Depth — a distinct deeper field tone; cards lift via the long shadow token
    // (fieldShellStyle). Oversized brand arcs bleed off-canvas behind columns.
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
        style={{ background: "#EAE1D2" }}
      >
        <svg
          className="absolute -right-[16%] -bottom-[26%] w-[64%] h-auto"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle
            cx="200"
            cy="200"
            r="182"
            stroke="var(--rd-coral)"
            strokeWidth="48"
            opacity="0.06"
          />
          <circle
            cx="200"
            cy="200"
            r="116"
            stroke="var(--rd-golden)"
            strokeWidth="30"
            opacity="0.05"
          />
        </svg>
        <svg
          className="absolute -left-[13%] -top-[20%] w-[40%] h-auto"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle
            cx="200"
            cy="200"
            r="152"
            stroke="var(--rd-teal)"
            strokeWidth="38"
            opacity="0.05"
          />
        </svg>
      </div>
    );
  }

  // c — Bold Warm: a confident sand/terracotta field, one bigger coral moment.
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{
        background:
          "linear-gradient(165deg, #EFDFC6 0%, #ECD4B7 55%, #E7C8A6 100%)",
      }}
    >
      <div
        className="absolute -top-[14%] -right-[10%] w-[52%] h-[52%]"
        style={{
          background:
            "radial-gradient(circle at 68% 32%, rgba(214,66,31,0.16) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: GRAIN_URL,
          opacity: 0.05,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}
