// Persistent left sidebar for the 3-tab home canvas. Two surfaces: the TOOLKIT
// rail (top) + the coach dock (fills the rest), mounted across CV / Tracker /
// Browse Jobs. The rail is the toolkit — NOT the tabs: Browse / Tracker / CV are
// dropped (the tabs own those). The remaining tools are tactile soft-3D objects
// (CanvasToolTile), the one surface that earns extra dimensionality beyond the
// paper-lift house language (see canvas-tokens.md). Step B swaps the placeholder
// icons for bespoke per-tool silhouettes that morph on hover.
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Mic,
  Target,
  IdCard,
  Linkedin,
  FileStack,
  BookOpen,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import CoachDock from "@/components/agent/CoachDock";
import { CANVAS_FIXTURES } from "./canvasConfig";
import CanvasCoachDock from "./CanvasCoachDock";
import CanvasToolTile from "./CanvasToolTile";
import CanvasAvatarChip from "./CanvasAvatarChip";
import CanvasMobileRail from "./CanvasMobileRail";

const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The toolkit. Descriptors are short + action-flavoured, no data (per ruling).
// Interview coach + Skill hub + Tasks are fixture no-ops (interview coach = a
// separate interview-prep tool, distinct from the persistent coach dock).
const TOOL_TILES = [
  {
    id: "coach",
    label: "Interview coach",
    descriptor: "rehearse, get feedback",
    icon: Mic,
    onClick: () => toast.info("Prototype: opens the interview coach."),
  },
  {
    id: "skills",
    label: "Skill hub",
    descriptor: "find gaps, close them",
    icon: Target,
    onClick: () => toast.info("Prototype: opens your skills gap workspace."),
  },
  {
    id: "profile",
    label: "Profile",
    descriptor: "keep it sharp",
    icon: IdCard,
    href: createPageUrl("Profile"),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    descriptor: "grow your presence",
    icon: Linkedin,
    href: createPageUrl("Linkedin"),
  },
  {
    id: "cvbank",
    label: "CV bank",
    descriptor: "build & tailor",
    icon: FileStack,
    href: createPageUrl("CVAgent"),
  },
  {
    id: "storybank",
    label: "Story bank",
    descriptor: "bank your wins",
    icon: BookOpen,
    href: createPageUrl("StoryBank"),
  },
  {
    id: "tasks",
    label: "Tasks",
    descriptor: "your next moves",
    icon: ListChecks,
    onClick: () => toast.info("Prototype: opens your task list."),
  },
];

// The toolkit rail — a compact horizontal carousel of the colored objects (the
// picked layout). Native wheel/trackpad scrolls it (deltaY → scrollLeft); the
// right edge fades to peek the next object; quiet chevron buttons make "there's
// more" unmistakable and give non-trackpad users click-to-advance. Single row →
// the coach dock below keeps its maximum presence.
function ToolkitRail() {
  const railRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    update();
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const advance = (dir) => {
    const el = railRef.current;
    if (el)
      el.scrollBy({ left: dir * 158, behavior: REDUCE ? "auto" : "smooth" });
  };

  return (
    <div className="relative group/rail flex-shrink-0">
      <div
        ref={railRef}
        className="cx-carousel flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {TOOL_TILES.map((tile) => (
          <CanvasToolTile
            key={tile.id}
            id={tile.id}
            label={tile.label}
            descriptor={tile.descriptor}
            href={tile.href}
            onClick={tile.onClick}
            size={50}
            className="w-[76px] flex-shrink-0"
          />
        ))}
      </div>
      {canLeft && (
        <button
          type="button"
          aria-label="Previous tools"
          onClick={() => advance(-1)}
          className="cx-rail-nav left-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="More tools"
          onClick={() => advance(1)}
          className="cx-rail-nav cx-rail-nav-r right-0"
        >
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function CanvasSidebar() {
  return (
    <>
      {/* Desktop: full left sidebar. Hidden below md — content-first there. */}
      <div className="hidden md:flex md:w-[248px] flex-shrink-0 flex-col gap-4 md:h-full min-h-0">
        <ToolkitRail />
        <div className="flex-1 min-h-0 bg-rd-bg-sidebar rd-r-lg flex flex-col">
          {CANVAS_FIXTURES ? <CanvasCoachDock /> : <CoachDock />}
        </div>
        <CanvasAvatarChip />
      </div>

      {/* Below md: fixed bottom icon rail (out of flow → work fills first). */}
      <CanvasMobileRail tiles={TOOL_TILES} />
    </>
  );
}
