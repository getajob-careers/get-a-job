// Kanban statuses + display config — single source of truth for the
// 6-column board. Order here = column order in the kanban.

export const STATUSES = [
  "exploring",
  "outreach_sent",
  "interview",
  "offered",
  "rejected",
  "declined",
];

export const STATUS_LABELS = {
  exploring: "Exploring",
  outreach_sent: "Outreach sent",
  interview: "Interview",
  offered: "Offered",
  rejected: "Rejected",
  declined: "Declined",
};

// Maps each status to one of the .act-status-* tones in activityStyles.js.
// Keeps the column accent colors in the shared Direction 3 palette instead
// of inlining their own colors here. The .act-status-* class sets two CSS
// variables which the .act-status-badge consumes.
export const STATUS_TONE = {
  exploring:     "gray",
  outreach_sent: "info",
  interview:     "warning",
  offered:       "success",
  rejected:      "error",
  declined:      "gray",
};

// Discrete-band labels for scores — mirrors the rubric in the
// match-internship-companies system prompt. Drawer surfaces these
// next to the raw numeric score.
export function scoreBand(score) {
  if (score == null) return { label: "—", color: "text-[#9C9DA1]" };
  if (score >= 85) return { label: "Strong", color: "text-[#1D7556]" };
  if (score >= 70) return { label: "Real",   color: "text-[#1E4A9E]" };
  if (score >= 50) return { label: "Stretch", color: "text-[#6B4E0F]" };
  return { label: "Weak", color: "text-[#C84F40]" };
}
