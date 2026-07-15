import React from "react";

// Reusable command/list-item row — used by the coach action-search dropdown now,
// and intended to be the SAME primitive for the future ⌘K command palette
// (idea #8). Icon + label + optional hint, with an active (keyboard-highlight)
// state. onMouseDown (not onClick) + preventDefault so selecting doesn't blur
// the input and close the list before the select lands.
export default function CanvasCommandItem({
  icon: Icon,
  label,
  hint,
  active = false,
  onSelect,
  style,
  className = "",
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect?.();
      }}
      className={`${className} w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
        active
          ? "bg-rd-coral-tint text-rd-coral-dark"
          : "text-rd-text-secondary hover:bg-rd-bg-soft"
      }`}
      style={style}
    >
      {Icon && (
        <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      )}
      <span className="flex-1 text-[12px] leading-tight truncate">{label}</span>
      {hint && (
        <span className="text-[9.5px] font-mono text-rd-text-tertiary flex-shrink-0">
          {hint}
        </span>
      )}
    </button>
  );
}
