import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  UserCircle,
  Settings,
  LogOut,
  ChevronsUpDown,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import CanvasCommandItem from "./CanvasCommandItem";
import { openFeedback } from "@/lib/feedbackStore";

// Compact user/avatar chip at the sidebar bottom (wave-2 feedback #6). Standard
// app pattern: the Profile TILE now navigates; the quick menu (Profile /
// Settings / Sign out) lives here. Opens ABOVE the chip (it sits at the bottom).
//
// `account` supplies the real user + handlers so this same component serves both
// the production shell (real profile + logout) and the preview (fixture profile +
// toast no-ops). Shape: { name, email, initial?, onProfile?, onSettings?,
// onSignOut? }. Handlers fall back to a prototype toast when not provided.
export default function CanvasAvatarChip({ compact = false, account }) {
  const name = account?.name || "";
  const email = account?.email || "";
  const initial = account?.initial || name?.[0] || "?";
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const w = compact ? 190 : r.width;
      const left = compact ? Math.max(8, r.right - w) : r.left;
      // Flip-aware placement. The chip mounts both top-anchored (top-right
      // utility bar, mobile header - `compact`) and bottom-anchored (sidebar
      // footer). Open DOWNWARD when the menu fits below the chip, else UPWARD.
      // The old code always opened upward, which pushed the top-anchored chips'
      // menu off the top edge of the viewport.
      const estMenuH = 4 * 40 + 12; // 4 items (~40px) + container padding
      const openDown = r.bottom + estMenuH + 8 <= window.innerHeight;
      setPos(
        openDown
          ? { left, top: r.bottom + 6, width: w }
          : { left, bottom: window.innerHeight - r.top + 6, width: w },
      );
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

  // Run the real handler when supplied (production shell), else the prototype
  // toast (preview). Always closes the menu first.
  const run = (handler, fallbackMsg) => () => {
    setOpen(false);
    if (handler) handler();
    else toast.info(fallbackMsg);
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
          className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-rd-primary-tint text-rd-primary font-display font-bold rd-t-body-m hover:bg-rd-primary hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2"
        >
          {initial}
        </button>
      ) : (
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex-shrink-0 flex items-center gap-2 w-full rd-r-md bg-rd-bg-card border border-rd-border px-2.5 py-2 hover:border-rd-border-hover hover:bg-rd-bg-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2"
        >
          <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-rd-primary-tint text-rd-primary font-display font-bold rd-t-body-s">
            {initial}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block font-display font-bold rd-t-body-s text-rd-text truncate leading-tight">
              {name}
            </span>
            <span className="block rd-t-micro text-rd-text-tertiary truncate">
              {email}
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
              ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
              width: pos.width,
              zIndex: 60,
            }}
            className="rd-r-sm border border-rd-border bg-rd-bg-card shadow-rd p-1.5"
          >
            <CanvasCommandItem
              icon={UserCircle}
              label="Profile"
              onSelect={run(account?.onProfile, "Prototype: open profile.")}
            />
            <CanvasCommandItem
              icon={Settings}
              label="Settings"
              onSelect={run(account?.onSettings, "Prototype: open settings.")}
            />
            <CanvasCommandItem
              icon={MessageSquare}
              label="Send feedback"
              onSelect={run(openFeedback)}
            />
            <CanvasCommandItem
              icon={LogOut}
              label="Sign out"
              onSelect={run(account?.onSignOut, "Prototype: sign out (no-op).")}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
