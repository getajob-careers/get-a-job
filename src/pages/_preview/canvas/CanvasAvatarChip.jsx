import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserCircle, Settings, LogOut, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { CANVAS_PROFILE } from "../fixtures/canvasHome";
import CanvasCommandItem from "./CanvasCommandItem";

// Compact user/avatar chip at the sidebar bottom (wave-2 feedback #6). Standard
// app pattern: the Profile TILE now navigates; the quick menu (Profile /
// Settings / Sign out) lives here. Same warm portaled menu styling as before —
// it just moved homes. Opens ABOVE the chip (it sits at the bottom). Fixture
// no-ops.
export default function CanvasAvatarChip({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const w = compact ? 190 : r.width;
      setPos({
        left: compact ? Math.max(8, r.right - w) : r.left,
        bottom: window.innerHeight - r.top + 6,
        width: w,
      });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!btnRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (msg) => () => {
    toast.info(msg);
    setOpen(false);
  };

  return (
    <>
      {compact ? (
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-rd-coral-tint text-rd-coral font-display font-bold rd-t-body-m hover:bg-rd-coral hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2"
        >
          {CANVAS_PROFILE.full_name?.[0] || "?"}
        </button>
      ) : (
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex-shrink-0 flex items-center gap-2 w-full rd-r-md bg-rd-bg-card border border-rd-border px-2.5 py-2 hover:border-rd-border-hover hover:bg-rd-bg-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2"
        >
          <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-rd-coral-tint text-rd-coral font-display font-bold rd-t-body-s">
            {CANVAS_PROFILE.full_name?.[0] || "?"}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block font-display font-bold rd-t-body-s text-rd-text truncate leading-tight">
              {CANVAS_PROFILE.full_name}
            </span>
            <span className="block rd-t-micro text-rd-text-tertiary truncate">
              {CANVAS_PROFILE.email}
            </span>
          </span>
          <ChevronsUpDown
            className="w-3.5 h-3.5 text-rd-text-tertiary flex-shrink-0"
            aria-hidden="true"
          />
        </button>
      )}

      {open &&
        pos &&
        createPortal(
          <div
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: pos.left,
              bottom: pos.bottom,
              width: pos.width,
              zIndex: 60,
            }}
            className="rd-r-sm border border-rd-border bg-rd-bg-card shadow-rd p-1.5"
          >
            <CanvasCommandItem
              icon={UserCircle}
              label="Profile"
              onSelect={pick("Prototype: open profile.")}
            />
            <CanvasCommandItem
              icon={Settings}
              label="Settings"
              onSelect={pick("Prototype: open settings.")}
            />
            <CanvasCommandItem
              icon={LogOut}
              label="Sign out"
              onSelect={pick("Prototype: sign out (no-op).")}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
