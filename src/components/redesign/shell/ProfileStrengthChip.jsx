import React from "react";

// Profile-strength chip - the mockup's `.profile-mini`: a conic-gradient ring
// (mauve fill to `strength%`, line-soft remainder) + name + "Profile strength".
// PR2 renders the chip; the `strength` NUMBER waits on the per-feature data-source
// table (Eli, 2026-07-18) - until a real profile-completeness source is confirmed,
// `strength` is null and the ring shows a neutral resting state with no percent
// (no fabricated number, per the anti-fabrication principle).
export default function ProfileStrengthChip({ name, strength = null }) {
  const pct =
    typeof strength === "number" ? Math.max(0, Math.min(100, strength)) : null;
  return (
    <div className="flex items-center gap-2.5 rd-r-md border border-rd-border-subtle bg-rd-bg-soft p-2.5">
      <div
        className="relative flex-shrink-0 rounded-full"
        style={{
          width: 42,
          height: 42,
          background:
            pct == null
              ? "var(--rd-border-subtle)"
              : `conic-gradient(var(--rd-teal) ${pct}%, var(--rd-border-subtle) 0)`,
        }}
      >
        <div className="absolute inset-[5px] rounded-full bg-rd-bg-soft flex items-center justify-center">
          {pct != null && (
            <span className="rd-t-micro font-semibold text-rd-text">
              {`${pct}%`}
            </span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <span className="block rd-t-body-s font-display font-bold text-rd-text truncate leading-tight">
          {name || "Your profile"}
        </span>
        <span className="block rd-t-micro text-rd-text-secondary">
          Profile strength
        </span>
      </div>
    </div>
  );
}
