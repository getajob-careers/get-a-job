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
  // Default to wrapping so a suggestion is never clipped in the narrow coach
  // dock; a future wide ⌘K palette can opt into truncate={true}.
  truncate = false,
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
      className={`${className} w-full flex items-start gap-2 px-2.5 py-1.5 rd-r-xs text-left transition-colors ${
        active
          ? "bg-rd-primary-tint text-rd-primary-dark"
          : "text-rd-text-secondary hover:bg-rd-bg-soft"
      }`}
      style={style}
    >
      {Icon && (
        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
      )}
      <span
        className={`flex-1 min-w-0 rd-t-body-s leading-tight ${truncate ? "truncate" : "break-words"}`}
      >
        {label}
      </span>
      {hint && (
        <span className="rd-t-micro font-mono text-rd-text-tertiary flex-shrink-0">
          {hint}
        </span>
      )}
    </button>
  );
}
