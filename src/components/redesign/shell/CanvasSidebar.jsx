// Persistent left sidebar (mockup `.side`): brand -> profile-strength chip ->
// TOOLKIT CAROUSEL (nav) -> coach card. Eli's final nav ruling (2026-07-19):
// restore the swipe/scroll carousel band with edge chevrons (the labeled grid
// retired to the graveyard). Roster is the ruled set; every tile is a real route.
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import { createPageUrl } from "@/utils";
import CoachDock from "@/components/agent/CoachDock";
import CanvasLogo from "./CanvasLogo";
import CanvasToolTile from "./CanvasToolTile";
import ProfileStrengthChip from "./ProfileStrengthChip";
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

// Coach card (mockup `.coach`): a warm gradient card frame wrapping the REAL coach
// node (production CoachDock; the fixture dock in the preview). The dock supplies
// its own header + expand, so the frame stays header-less to avoid a duplicate.
function CoachCard({ coach }) {
  return (
    <div
      className="flex-1 min-h-0 flex flex-col rd-r-lg border border-rd-border p-2 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, var(--rd-bg-soft), var(--rd-golden-tint))",
      }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {coach || <CoachDock />}
      </div>
    </div>
  );
}

// `coach` = the dock node. `account` = the mobile-rail avatar. `name` /
// `profileStrength` power the profile chip (strength waits on the data-source
// table - null renders a neutral ring, no fabricated %).
export default function CanvasSidebar({
  coach,
  account,
  name,
  profileStrength = null,
}) {
  return (
    <>
      {/* Desktop: full left sidebar. Hidden below md - content-first there. */}
      <div className="hidden md:flex md:w-[248px] flex-shrink-0 flex-col gap-4 md:h-full min-h-0">
        <Link
          to={createPageUrl("Home")}
          aria-label="Get A Job home"
          className="inline-flex px-1 rd-r-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral"
        >
          <CanvasLogo size={26} />
        </Link>
        <ProfileStrengthChip name={name} strength={profileStrength} />
        <ToolkitRail />
        <CoachCard coach={coach} />
      </div>

      {/* Below md: fixed bottom icon rail (out of flow -> work fills first). */}
      <CanvasMobileRail navItems={TOOL_TILES} coach={coach} account={account} />
    </>
  );
}
