import React from "react";
import { toast } from "sonner";
import { Wand2, Plus, ExternalLink, Sparkles } from "lucide-react";
import { useCvGen } from "./CvGenContext";

// Job-card hover actions — adapted from kokonutUI SocialButton (the primary
// button expands into a staggered row of actions), fully rethemed to our warm
// cream/coral palette. Tailor CV is the always-visible hero; Track / Apply /
// Ask coach stagger in on card hover. Touch devices (no hover) get them
// always-visible. All fixture no-ops. prefers-reduced-motion disables the
// stagger (actions still reveal, just instantly).

let injected = false;
function ensureCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "cx-card-actions-css";
  s.textContent = `
.cx-actions { display: inline-flex; align-items: center; gap: 4px; }
.cx-action-item { opacity: 0; transform: translateX(-6px); transition: opacity .22s ease, transform .22s ease; }
@media (hover: hover) and (pointer: fine) {
  .cx-card:hover .cx-action-item, .cx-card:focus-within .cx-action-item { opacity: 1; transform: none; }
}
@media (hover: none) { .cx-action-item { opacity: 1 !important; transform: none !important; } }
@media (prefers-reduced-motion: reduce) { .cx-action-item { transition: none !important; opacity: 1; transform: none; } }`;
  document.head.appendChild(s);
}

function IconAction({ icon: Icon, label, onClick, delay }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="cx-action-item group/act relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-coral hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {/* Styled hover-intent tooltip (300ms to show, instant to hide). */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 whitespace-nowrap rd-r-xs bg-rd-text text-white rd-t-micro font-display font-semibold px-1.5 py-0.5 opacity-0 transition-opacity duration-100 delay-0 group-hover/act:opacity-100 group-hover/act:delay-300">
        {label}
      </span>
    </button>
  );
}

export default function CanvasCardActions({ job }) {
  ensureCss();
  const gen = useCvGen();
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div className="mt-2 flex items-center gap-1.5">
      {/* Tailor CV — hero, always visible. Fires the shared generation theater. */}
      <button
        type="button"
        onClick={stop(() => gen?.start(`${job.company_name} · ${job.title}`))}
        className="inline-flex items-center gap-1 font-display font-semibold rd-t-micro text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-1"
      >
        <Wand2 className="w-3 h-3" aria-hidden="true" />
        Tailor CV
      </button>

      {/* Secondary actions — stagger in on card hover */}
      <div className="cx-actions">
        <IconAction
          icon={Plus}
          label="Track"
          delay={0}
          onClick={() => toast.success("Prototype: added to your pipeline.")}
        />
        <IconAction
          icon={ExternalLink}
          label="Apply"
          delay={60}
          onClick={() => toast.info("Prototype: opening the application…")}
        />
        <IconAction
          icon={Sparkles}
          label="Ask coach"
          delay={120}
          onClick={() =>
            toast.info("Prototype: ask the coach about this role.")
          }
        />
      </div>
    </div>
  );
}
