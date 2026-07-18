import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import CanvasToolIcon from "./CanvasToolIcon";
import { TOOL_COLORS } from "./toolColors";

// Toolkit tile (round 3). NOT a card: the tool's colored OBJECT is the tile —
// its silhouette + glaze, floating with a ground shadow, the icon as the hero,
// the label under it. The descriptor is a small tooltip PORTALED to the body so
// it escapes the carousel band's horizontal-scroll clip (no data, per the
// ruling). The object tilts toward the cursor on hover and runs its one morph
// beat. Reduced motion → no tilt.
const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function CanvasToolTile({
  id,
  label,
  descriptor,
  href,
  onClick,
  size = 44,
  className = "",
}) {
  const c = TOOL_COLORS[id] || {};
  const colorVars = { "--to-hi": c.hi, "--to-tint": c.tint, "--to-ink": c.ink };
  const [tip, setTip] = useState(null);

  const onEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top - 6 });
  };
  const onMove = REDUCE
    ? undefined
    : (e) => {
        const ico = e.currentTarget.querySelector(".cx-tool-ico");
        if (!ico) return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ico.style.transform = `perspective(520px) rotateX(${(-py * 12).toFixed(
          1,
        )}deg) rotateY(${(px * 12).toFixed(1)}deg) translateY(-3px)`;
      };
  const onLeave = (e) => {
    setTip(null);
    const ico = e.currentTarget.querySelector(".cx-tool-ico");
    if (ico) ico.style.transform = "";
  };

  const cls = `cx-tool group flex flex-col items-center justify-start gap-1 px-1 py-2 rd-r-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2 ${className}`;
  const inner = (
    <>
      <span className="cx-tool-ico">
        <CanvasToolIcon id={id} size={size} />
      </span>
      <span className="block font-display font-bold rd-t-micro text-rd-text leading-tight text-center">
        {label}
      </span>
    </>
  );

  const handlers = {
    onMouseEnter: onEnter,
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    onFocus: onEnter,
    onBlur: () => setTip(null),
  };

  return (
    <>
      {href ? (
        <Link to={href} className={cls} style={colorVars} {...handlers}>
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className={cls}
          style={colorVars}
          {...handlers}
        >
          {inner}
        </button>
      )}
      {tip &&
        descriptor &&
        createPortal(
          <div
            className="fixed z-[130] pointer-events-none -translate-x-1/2 -translate-y-full rd-r-xs bg-rd-text text-white rd-t-micro font-display font-semibold px-2 py-1 whitespace-nowrap shadow-rd"
            style={{ left: tip.x, top: tip.y }}
          >
            {descriptor}
          </div>,
          document.body,
        )}
    </>
  );
}
