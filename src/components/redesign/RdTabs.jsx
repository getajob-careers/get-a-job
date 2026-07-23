import React, { useRef } from "react";

// RdTabs - the shared canvas tablist. Controlled + presentational: the page owns
// the active value + URL sync (so react-router stays out of this primitive), and
// this owns the tablist role, aria-selected wiring, roving-tabindex keyboard nav
// (Left/Right/Up/Down + Home/End with automatic activation), a visible focus
// ring, and the two canonical looks. `pill` = the primary-tone selected pill
// (bg-rd-primary); `underline` = the section-nav bottom-border strip. Home's
// segmented-thumb control and Calendar's aria-pressed view toggle are DELIBERATELY
// not this component - a segmented control and a button-group are different
// patterns, not tabs.

const VARIANTS = {
  pill: {
    list: "flex",
    tab: "rd-focus-ring inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-body cursor-pointer transition-colors duration-150 whitespace-nowrap",
    selected:
      "bg-rd-primary text-white border border-rd-primary font-display font-semibold",
    inactive:
      "bg-rd-bg-card text-rd-text-secondary border border-rd-border font-medium hover:border-rd-border-hover hover:text-rd-text",
  },
  underline: {
    list: "flex gap-[22px] border-b-[1.5px] border-rd-border-subtle",
    tab: "rd-focus-ring appearance-none border-0 bg-transparent font-display text-[15px] font-semibold cursor-pointer pb-[9px] -mb-[1.5px] transition-colors duration-150 whitespace-nowrap",
    selected: "text-rd-text border-b-[2.5px] border-rd-primary",
    inactive:
      "text-rd-text-secondary border-b-[2.5px] border-transparent hover:text-rd-text",
  },
};

export default function RdTabs({
  tabs,
  value,
  onChange,
  variant = "pill",
  className = "",
  "aria-label": ariaLabel,
}) {
  const v = VARIANTS[variant] || VARIANTS.pill;
  const btnRefs = useRef([]);
  const activeIndex = tabs.findIndex((t) => t.id === value);

  const moveTo = (index) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.id);
    btnRefs.current[(index + tabs.length) % tabs.length]?.focus();
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveTo(activeIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveTo(activeIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        moveTo(0);
        break;
      case "End":
        e.preventDefault();
        moveTo(tabs.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[v.list, className].filter(Boolean).join(" ")}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => (btnRefs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected || (activeIndex === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={[v.tab, selected ? v.selected : v.inactive].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
