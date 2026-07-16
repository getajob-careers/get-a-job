// Persistent left sidebar for the 3-tab home canvas. Two surfaces: the TOOLKIT
// rail (top) + the coach dock (fills the rest), mounted across CV / Tracker /
// Browse Jobs. The rail is the toolkit — NOT the tabs: Browse / Tracker / CV are
// dropped (the tabs own those). The remaining tools are tactile soft-3D objects
// (CanvasToolTile), the one surface that earns extra dimensionality beyond the
// paper-lift house language (see canvas-tokens.md). Step B swaps the placeholder
// icons for bespoke per-tool silhouettes that morph on hover.
import React from "react";
import { toast } from "sonner";
import {
  Mic,
  Target,
  IdCard,
  Linkedin,
  FileStack,
  BookOpen,
  ListChecks,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import CoachDock from "@/components/agent/CoachDock";
import { CANVAS_FIXTURES } from "./canvasConfig";
import CanvasCoachDock from "./CanvasCoachDock";
import CanvasToolTile from "./CanvasToolTile";
import CanvasAvatarChip from "./CanvasAvatarChip";
import CanvasMobileRail from "./CanvasMobileRail";

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

export default function CanvasSidebar() {
  return (
    <>
      {/* Desktop: full left sidebar. Hidden below md — content-first there. */}
      <div className="hidden md:flex md:w-[248px] flex-shrink-0 flex-col gap-4 md:h-full min-h-0">
        <div className="flex flex-col gap-2 flex-shrink-0">
          {TOOL_TILES.map((tile) => (
            <CanvasToolTile
              key={tile.id}
              id={tile.id}
              label={tile.label}
              descriptor={tile.descriptor}
              href={tile.href}
              onClick={tile.onClick}
            />
          ))}
        </div>
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
