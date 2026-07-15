import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserCircle, Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import { CANVAS_PROFILE } from "../fixtures/canvasHome";
import DuotoneIcon from "./DuotoneIcon";
import CanvasCommandItem from "./CanvasCommandItem";

// Profile tile → dropdown (kokonutUI ProfileDropdown, rethemed warm). The tile
// itself stays the grid trigger (keeps its magnet ref + styling); the menu is
// portaled + fixed-positioned so it isn't clipped by the sidebar and doesn't
// disturb the grid. Real menu items (Profile / Settings / Sign out), all fixture
// no-ops. Reuses CanvasCommandItem (the ⌘K primitive).
export default function CanvasProfileMenu({
  innerRef,
  className,
  style,
  icon: Icon,
  label,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const setRefs = (el) => {
    btnRef.current = el;
    if (typeof innerRef === "function") innerRef(el);
  };

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
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
      <button
        ref={setRefs}
        type="button"
        onClick={toggle}
        className={className}
        style={style}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <DuotoneIcon icon={Icon} />
        <span className="text-[10px] font-display font-semibold text-rd-text-secondary group-hover:text-rd-text leading-tight text-center transition-colors">
          {label}
        </span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 60,
            }}
            className="w-52 rounded-lg border border-rd-border bg-rd-bg-card shadow-rd p-1.5"
          >
            <div className="px-2 py-1.5 border-b border-rd-border-subtle mb-1">
              <p className="font-display font-bold text-[12.5px] text-rd-text truncate">
                {CANVAS_PROFILE.full_name}
              </p>
              <p className="text-[10.5px] text-rd-text-tertiary truncate">
                {CANVAS_PROFILE.email}
              </p>
            </div>
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
