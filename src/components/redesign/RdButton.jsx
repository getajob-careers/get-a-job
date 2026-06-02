import React from "react";

// RdButton — primary coral pill button for the visual redesign.
// Minimal API by design: this PR only ships the variant the mockups use
// repeatedly (coral pill primary). Secondary / ghost variants land when
// a downstream page actually needs them, per the additive-foundation
// rule in tasks/redesign.md.
//
// Tokens consumed: --rd-coral, --rd-coral-dark, --rd-font-display.
// Active scale .98 matches the .gajbtn:active rule from the mockups.
export default function RdButton({ className = "", children, ...rest }) {
  // `type="button"` is the default; consumers passing `type="submit"`
  // via `...rest` override it. Spread comes after the literal attribute
  // so the override actually takes effect.
  return (
    <button
      type="button"
      {...rest}
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-full px-5 py-2.5",
        "bg-rd-coral text-white",
        "font-display font-bold text-sm tracking-tight",
        "shadow-sm",
        "transition-[background-color,transform] duration-150 ease-out",
        "hover:bg-rd-coral-dark active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral-dark focus-visible:ring-offset-2",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
