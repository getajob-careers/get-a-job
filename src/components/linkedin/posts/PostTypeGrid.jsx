import React from "react";
import { Briefcase, Lightbulb, Award, Trophy, MessageCircleQuestion, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// All 7 post types live now (Phase 3). Ordered by likely-frequency for
// students per Eli's call PR #33: project / lessons / milestone (top row),
// recap / question / observation (middle row), free_form (bottom row, on
// its own to signal escape-hatch status).
const POST_TYPES = [
  {
    id: "project",
    label: "Project showcase",
    Icon: Briefcase,
    description: "Share a class project, side project, hackathon piece, or internship deliverable. Best when you have a specific outcome to lead with.",
    saveableHint: "Posts with a clear outcome lead get the highest engagement.",
  },
  {
    id: "lessons",
    label: "Lessons learned",
    Icon: Lightbulb,
    description: "3–5 concrete lessons from a course, role, project, book, or event. Each lesson tied to a specific example you actually lived.",
    saveableHint: "Numbered lists with examples are the most-saved post format.",
  },
  {
    id: "milestone",
    label: "Career milestone",
    Icon: Award,
    description: "Share a career update — internship offer, role start, certification, graduation. Specific gratitude with named people works far better than generic excitement.",
    saveableHint: "Skip 'Excited to share' / 'Thrilled to announce' — these are algorithmically suppressed.",
  },
  {
    id: "recap",
    label: "Event / hackathon recap",
    Icon: Trophy,
    description: "Recap of a hackathon, conference, competition, workshop, or panel. Tag teammates with their specific contributions.",
    saveableHint: "Tagging teammates materially lifts reach. Image (group photo, demo, prize) strongly recommended.",
  },
  {
    id: "question",
    label: "Question for community",
    Icon: MessageCircleQuestion,
    description: "Genuinely ask for input on a decision. You'll be asked what you've already considered — questions that skip this read as lazy.",
    saveableHint: "Questions are conversational, not saved. End with a specific invitation, not 'Thoughts?'",
  },
  {
    id: "observation",
    label: "Industry observation",
    Icon: Eye,
    description: "Your perspective on a trend in your target industry. Highest-risk format — easy to come off as overreach without a concrete example anchoring authority.",
    saveableHint: "Hardest format to do well. Anchor on a specific example you directly saw or did, then share the take.",
  },
];

const ESCAPE_HATCH_TYPE = {
  id: "free_form",
  label: "Free-form",
  Icon: Pencil,
  description: "Anything not covered by the structured types above. You provide a topic + intent; the AI applies all the same voice rules.",
  saveableHint: "Use the structured types when they fit — they produce sharper output. This is the escape hatch.",
};

export default function PostTypeGrid({ onSelect }) {
  return (
    <div>
      <p className="text-sm text-[#52545A] mb-4">
        Pick a post type to start. The AI grounds each post in your profile, Story Bank, and career goals.
      </p>
      {/* Top 6 types in 3-column grid (3-3 layout). Free-form below as a
          single full-width card to visually signal "escape hatch" status. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {POST_TYPES.map(({ id, label, Icon, description, saveableHint }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "text-left bg-white border border-[#DDDDDB] rounded-xl p-4",
              "hover:border-[#0E1014] hover:shadow-sm transition-all"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[#0E1014]" />
              <h3 className="text-sm font-semibold text-[#0E1014]">{label}</h3>
            </div>
            <p className="text-xs text-[#52545A] leading-snug mb-2">{description}</p>
            <p className="text-[11px] text-[#9C9DA1] italic leading-snug">{saveableHint}</p>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSelect(ESCAPE_HATCH_TYPE.id)}
        className={cn(
          "w-full text-left bg-[#F4F4F2] border border-dashed border-[#DDDDDB] rounded-xl p-4",
          "hover:border-[#0E1014] hover:bg-white transition-all"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <ESCAPE_HATCH_TYPE.Icon className="w-4 h-4 text-[#52545A]" />
          <h3 className="text-sm font-semibold text-[#0E1014]">{ESCAPE_HATCH_TYPE.label}</h3>
          <span className="text-[10px] uppercase tracking-wider text-[#9C9DA1] ml-1">escape hatch</span>
        </div>
        <p className="text-xs text-[#52545A] leading-snug mb-1">{ESCAPE_HATCH_TYPE.description}</p>
        <p className="text-[11px] text-[#9C9DA1] italic leading-snug">{ESCAPE_HATCH_TYPE.saveableHint}</p>
      </button>
    </div>
  );
}
