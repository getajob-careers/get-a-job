import React from "react";
import { Link } from "react-router-dom";
import CanvasToolIcon from "./CanvasToolIcon";

// Toolkit tile shell (round 3, step A). A tactile soft-3D object (toolkit.css):
// a warm domed tile that tilts toward the cursor on hover, holding a per-tool
// icon, a label, and a short static descriptor (no data — per the ruling), and
// clickable to its tool. Step B swaps the placeholder DuotoneIcon for a bespoke
// per-tool silhouette that morphs on hover (the tile is `group` so those can key
// off group-hover). Reduced motion → no tilt.
const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function CanvasToolTile({
  id,
  label,
  descriptor,
  href,
  onClick,
}) {
  const onMove = REDUCE
    ? undefined
    : (e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(640px) rotateX(${(-py * 5).toFixed(
          2,
        )}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-2px)`;
      };
  const onLeave = REDUCE
    ? undefined
    : (e) => {
        e.currentTarget.style.transform = "";
      };

  const cls =
    "rd-tool group rd-r-md flex items-center gap-3 px-3 py-2.5 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2";
  const inner = (
    <>
      <span className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10">
        <CanvasToolIcon id={id} />
      </span>
      <span className="min-w-0">
        <span className="block font-display font-bold rd-t-body-m text-rd-text leading-tight">
          {label}
        </span>
        <span className="block rd-t-micro text-rd-text-tertiary leading-tight mt-0.5">
          {descriptor}
        </span>
      </span>
    </>
  );

  return href ? (
    <Link to={href} className={cls} onMouseMove={onMove} onMouseLeave={onLeave}>
      {inner}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {inner}
    </button>
  );
}
