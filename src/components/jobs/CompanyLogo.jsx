import React, { useState, useEffect } from "react";

// CompanyLogo — real company logo with a graceful fallback cascade:
//   1. logo.dev (real vector-ish logos) — only when VITE_LOGODEV_TOKEN is
//      set. logo.dev is the maintained successor to Clearbit's logo API,
//      which was shut down (logo.clearbit.com no longer resolves). The
//      token is a publishable key (pk_…), safe in the frontend bundle like
//      the Turnstile site key already shipped here.
//   2. DuckDuckGo icon service — tokenless, returns the company's favicon
//      directly (verified 200 image/* for IL companies). The "real logo if
//      we can get one" tier that needs no setup.
//   3. the colored letter avatar (the prior placeholder).
//
// Each <img> load error advances one tier. No domain → straight to the
// letter avatar. The tile geometry (40px rounded square) is identical
// across all tiers so the card never reflows when an image fails.
//
// `fallbackStyle` is the existing track-tinted avatar style the card
// already computes — reused verbatim for the letter tier so the placeholder
// looks exactly as it did before.

const LOGODEV_TOKEN = import.meta.env.VITE_LOGODEV_TOKEN;

function logoSources(domain) {
  if (!domain) return [];
  const out = [];
  if (LOGODEV_TOKEN) {
    out.push(`https://img.logo.dev/${domain}?token=${LOGODEV_TOKEN}&size=80&format=png`);
  }
  out.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
  return out;
}

export default function CompanyLogo({
  domain,
  companyName,
  fallbackStyle,
  fallbackClassName = "",
  className = "",
  size = 40,
  radius = 10,
}) {
  const tiers = logoSources(domain);
  const [tier, setTier] = useState(0);

  // Reset to the first source if the domain changes (card recycled in a
  // virtualized/re-rendered list).
  useEffect(() => {
    setTier(0);
  }, [domain]);

  const letter = (companyName || "?").trim().charAt(0).toUpperCase();
  const usingImage = tiers.length > 0 && tier < tiers.length;
  // Letter scales with the tile so the same component reads well from the
  // 40px job card down to the ~22px pipeline chip.
  const box = { width: size, height: size, borderRadius: radius };

  if (!usingImage) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center flex-shrink-0 ${fallbackClassName} ${className}`}
        style={{ ...box, ...fallbackStyle }}
      >
        <span className="font-display font-extrabold leading-none" style={{ fontSize: Math.round(size * 0.42) }}>
          {letter}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border border-rd-border ${className}`}
      style={box}
    >
      <img
        src={tiers[tier]}
        alt={companyName ? `${companyName} logo` : "Company logo"}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain"
        style={{ padding: Math.max(1, Math.round(size * 0.1)) }}
        onError={() => setTier((t) => t + 1)}
        onLoad={(e) => {
          // DuckDuckGo serves a generic 48×48 grey-chevron placeholder
          // (an HTTP 404 whose image body the browser still renders) for
          // domains it has no favicon for. Real favicons come back at
          // other sizes (16/32/64/192/ICO). Treat the 48×48 placeholder as
          // a miss and advance to the next tier → the letter avatar.
          const im = e.currentTarget;
          if (
            im.src.includes("icons.duckduckgo.com") &&
            im.naturalWidth === 48 &&
            im.naturalHeight === 48
          ) {
            setTier((t) => t + 1);
          }
        }}
      />
    </div>
  );
}
