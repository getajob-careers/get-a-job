import React from "react";

// RdCard — white surface card for the visual redesign.
// Single variant for now: white background, 18px corners, hairline
// border, soft warm shadow. Hover lift / coloured variants land when
// a downstream page actually needs them, per the additive-foundation
// rule in tasks/redesign.md.
//
// Tokens consumed: --rd-bg-card, --rd-border, --rd-shadow.
export default function RdCard({ className = "", children, ...rest }) {
  return (
    <div
      className={[
        "bg-rd-bg-card text-rd-text",
        "rounded-[18px] border border-rd-border",
        "shadow-rd",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
