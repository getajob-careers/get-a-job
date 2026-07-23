// Persistent left sidebar - THE CANVAS structure (Eli's definitive reframe,
// 2026-07-19: the canvas redesign is the design; the mockup is colour-only). The
// TOOLKIT CAROUSEL (top) + the coach dock (fills the rest) + the account chip
// (bottom). The mockup's profile-strength chip and gradient coach card were
// reverted; the coach dock is the canvas's own, rethemed by the mockup palette
// tokens. Roster is the ruled set; every tile is a real route.
import React, { useEffect, useRef, useState } from "react";
import {
  Map,
  User,
  FileText,
  BookOpen,
  Linkedin,
  Mic,
  GraduationCap,
  MessagesSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CoachDock from "@/components/agent/CoachDock";
import CanvasToolTile from "./CanvasToolTile";
import CanvasAvatarChip from "./CanvasAvatarChip";
import CanvasMobileRail from "./CanvasMobileRail";

const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The ruled toolkit roster (Eli). Every tile navigates a real route; nothing is a
// no-op. Settings stays in the top-bar account chip; Chat is a tile here (the
// general career agent). `id` selects the bespoke CanvasToolIcon silhouette + the
// mockup tool tint; `icon` is the compact lucide glyph for the mobile rail.
const TOOL_TILES = [
  { id: "career", label: "Career", page: "Career", icon: Map },
  { id: "profile", label: "Profile", page: "Profile", icon: User },
  { id: "cvbank", label: "CV bank", page: "CVAgent", icon: FileText },
  { id: "storybank", label: "Story bank", page: "StoryBank", icon: BookOpen },
  { id: "linkedin", label: "LinkedIn", page: "Linkedin", icon: Linkedin },
  { id: "coach", label: "Interview coach", page: "InterviewCoach", icon: Mic },
  {
    id: "skills",
    label: "Skill hub",
    page: "SkillDevelopmentAdvisor",
    icon: GraduationCap,
  },
  { id: "chat", label: "Chat", page: "CareerAgent", icon: MessagesSquare },
];

// The toolkit rail - a compact horizontal carousel of the coloured objects. Native
// wheel/trackpad scrolls it (deltaY -> scrollLeft); the right edge fades to peek
// the next object; quiet chevron buttons make "there's more" unmistakable and give
// non-trackpad users click-to-advance. Swipe scrolls it on touch.
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
            href={createPageUrl(tile.page)}
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

// `coach` = the dock node (real CoachDock in production; the fixture dock in the
// preview). `account` powers the avatar chip.
export default function CanvasSidebar({ coach, account }) {
  return (
    <>
      {/* Desktop: full left sidebar. Hidden below md - content-first there. */}
      <div className="hidden md:flex md:w-[248px] flex-shrink-0 flex-col gap-4 md:h-full min-h-0">
        <ToolkitRail />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-rd-bg-sidebar rd-r-lg">
          {coach || <CoachDock />}
        </div>
        <div className="flex flex-col gap-2.5">
          <CanvasAvatarChip account={account} />
          {/* Muted path to the public marketing page. /Landing (not /) so the
              authed-user bounce (gated to pathname "/") skips it. Mirrors the
              flag-off SidebarFooter "About Get A Job" eyebrow. */}
          <Link
            to="/Landing"
            className="block text-[10px] text-rd-text-secondary hover:text-rd-text tracking-[0.09em] uppercase font-mono text-center transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary"
          >
            About Get A Job
          </Link>
        </div>
      </div>

      {/* Below md: fixed bottom icon rail (out of flow -> work fills first). */}
      <CanvasMobileRail navItems={TOOL_TILES} coach={coach} account={account} />
    </>
  );
}
