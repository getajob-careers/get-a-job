import React from "react";
import { Rocket, Lightbulb, Flag, Calendar, HelpCircle, Eye, Pencil } from "lucide-react";

// PR 3J-B — restyled on rd-* tokens. Type-pill grid matches
// docs/design/redesign/getajob_linkedin_posts_feed_preview.html — all 7
// types render as full-round pills (999px) in a flex-wrap row, soft-tint
// unselected, coral selected. The mockup omits per-type description /
// saveable hint; those are kept in the data model and surfaced via
// `title=` hover tooltips so the guidance isn't lost for hesitant users.
//
// Icon mapping per the mockup: Rocket / Lightbulb / Flag / Calendar /
// HelpCircle / Eye / Pencil. The 7-type taxonomy (project / lessons /
// milestone / recap / observation / question / free_form) and ordering
// are preserved per Eli's PR #33 call. Free-form is the 7th pill in the
// row (the mockup's flex-wrap layout treats it as a peer of the
// structured types rather than a separately-styled escape hatch).

const POST_TYPES = [
  {
    id: "project",
    label: "Project",
    Icon: Rocket,
    description: "Share a class project, side project, hackathon piece, or internship deliverable. Best when you have a specific outcome to lead with.",
    saveableHint: "Posts with a clear outcome lead get the highest engagement.",
  },
  {
    id: "lessons",
    label: "Lessons",
    Icon: Lightbulb,
    description: "3–5 concrete lessons from a course, role, project, book, or event. Each lesson tied to a specific example you actually lived.",
    saveableHint: "Numbered lists with examples are the most-saved post format.",
  },
  {
    id: "milestone",
    label: "Milestone",
    Icon: Flag,
    description: "Share a career update - internship offer, role start, certification, graduation. Specific gratitude with named people works far better than generic excitement.",
    saveableHint: "Skip 'Excited to share' / 'Thrilled to announce' - these are algorithmically suppressed.",
  },
  {
    id: "recap",
    label: "Recap",
    Icon: Calendar,
    description: "Recap of a hackathon, conference, competition, workshop, or panel. Tag teammates with their specific contributions.",
    saveableHint: "Tagging teammates materially lifts reach. Image (group photo, demo, prize) strongly recommended.",
  },
  {
    id: "observation",
    label: "Observation",
    Icon: Eye,
    description: "Your perspective on a trend in your target industry. Highest-risk format - easy to come off as overreach without a concrete example anchoring authority.",
    saveableHint: "Hardest format to do well. Anchor on a specific example you directly saw or did, then share the take.",
  },
  {
    id: "question",
    label: "Question",
    Icon: HelpCircle,
    description: "Genuinely ask for input on a decision. You'll be asked what you've already considered - questions that skip this read as lazy.",
    saveableHint: "Questions are conversational, not saved. End with a specific invitation, not 'Thoughts?'",
  },
  {
    id: "free_form",
    label: "Free form",
    Icon: Pencil,
    description: "Escape hatch - anything not covered by the structured types above. You provide a topic + intent; the AI applies all the same voice rules.",
    saveableHint: "Use the structured types when they fit - they produce sharper output. This is the escape hatch.",
  },
];

export default function PostTypeGrid({ onSelect }) {
  return (
    <div>
      <p className="font-display font-bold text-[16px] text-rd-text">What do you want to post?</p>
      <p className="text-[12.5px] text-rd-text-secondary leading-snug mt-1 mb-3">
        Pick a post type to start. The AI grounds each post in your profile, Story Bank, and career goals.
        Hover for what each type works best for.
      </p>

      {/* 7 pills in a flex-wrap row per mockup. Full-round (999px),
          soft-tint unselected, coral selected. The "selected" state is
          driven from upstream once the user picks a type; on the idle
          grid all pills render in their neutral form. */}
      <div className="flex flex-wrap gap-[7px]">
        {POST_TYPES.map(({ id, label, Icon, description, saveableHint }) => (
          <button
            key={id}
            type="button"
            data-post-type={id}
            onClick={() => onSelect(id)}
            title={`${description}\n\n${saveableHint}`}
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[12px] rounded-full px-3 py-1.5 bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-border hover:text-rd-text transition-colors"
          >
            <Icon className="w-[13px] h-[13px]" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
