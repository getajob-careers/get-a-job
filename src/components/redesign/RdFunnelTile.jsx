import React from "react";

// Pipeline-funnel count tile. Single rounded card with a big slab numeral
// and a tiny label below. Zero counts render muted regardless of tone —
// the colored tiles only light up once there's something in the stage.
//
// Extracted from Home.jsx in PR-A1 so the Career pipeline strip can render
// byte-equivalent tiles without duplicating the tone/zero rules.

const FUNNEL_TONES = {
  neutral: { bg: "bg-rd-bg-page", num: "text-rd-text", label: "text-rd-text-secondary" },
  coral: { bg: "bg-rd-coral-tint", num: "text-rd-coral-dark", label: "text-rd-coral-dark" },
  teal: { bg: "bg-rd-teal-tint", num: "text-rd-teal-dark", label: "text-rd-teal-dark" },
};

export default function RdFunnelTile({ label, value, tone }) {
  const t = FUNNEL_TONES[tone];
  const isZero = !value;
  return (
    <div className={`flex-1 min-w-0 text-center rounded-[12px] py-2 ${isZero ? "bg-rd-bg-page" : t.bg}`}>
      <div className={`font-display font-extrabold text-[18px] leading-tight ${isZero ? "text-rd-text-tertiary" : t.num}`}>
        {value}
      </div>
      <div className={`text-[10.5px] ${isZero ? "text-rd-text-tertiary" : t.label}`}>{label}</div>
    </div>
  );
}
