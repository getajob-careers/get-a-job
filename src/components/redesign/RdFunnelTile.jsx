import React from "react";
import { useCountUp } from "@/hooks/useCountUp";

// Pipeline-funnel count tile. Single rounded card with a big slab numeral
// and a tiny label below. Zero counts render muted regardless of tone —
// the colored tiles only light up once there's something in the stage.
//
// Extracted from Home.jsx in PR-A1 so the Career pipeline strip can render
// byte-equivalent tiles without duplicating the tone/zero rules.

const FUNNEL_TONES = {
  neutral: {
    bg: "bg-rd-bg-page",
    num: "text-rd-text",
    label: "text-rd-text-secondary",
  },
  coral: {
    bg: "bg-rd-primary-tint",
    num: "text-rd-primary-dark",
    label: "text-rd-primary-dark",
  },
  teal: {
    bg: "bg-rd-teal-tint",
    num: "text-rd-teal-dark",
    label: "text-rd-teal-dark",
  },
};

export default function RdFunnelTile({ label, value, tone, animate = false }) {
  const t = FUNNEL_TONES[tone];
  const isZero = !value;
  // `animate` is passed only by the flag-on home tracker tab; every flag-off
  // caller (Home / Career) omits it, so the hook returns `value` immediately and
  // the tile renders byte-identically. Zero-tone keys off the real `value`, not
  // the animating display value, so the muted-zero styling never flickers.
  const shown = useCountUp(value, { enabled: animate });
  return (
    <div
      className={`flex-1 min-w-0 text-center rounded-[12px] py-2 ${isZero ? "bg-rd-bg-page" : t.bg}`}
    >
      <div
        className={`font-display font-extrabold text-[18px] leading-tight ${isZero ? "text-rd-text-tertiary" : t.num}`}
      >
        {shown}
      </div>
      <div
        className={`text-[10.5px] ${isZero ? "text-rd-text-tertiary" : t.label}`}
      >
        {label}
      </div>
    </div>
  );
}
