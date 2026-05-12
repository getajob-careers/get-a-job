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

// Column accent (text + dot) — kept subtle to match the rest of the app.
export const STATUS_ACCENTS = {
  exploring: "text-[#525252] bg-[#F5F5F5]",
  outreach_sent: "text-[#1E40AF] bg-[#DBEAFE]",
  interview: "text-[#7C2D12] bg-[#FED7AA]",
  offered: "text-[#166534] bg-[#DCFCE7]",
  rejected: "text-[#991B1B] bg-[#FEE2E2]",
  declined: "text-[#525252] bg-[#F5F5F5]",
};

// Discrete-band labels for scores — mirrors the rubric in the
// match-internship-companies system prompt. Drawer surfaces these
// next to the raw numeric score.
export function scoreBand(score) {
  if (score == null) return { label: "—", color: "text-[#A3A3A3]" };
  if (score >= 85) return { label: "Strong", color: "text-[#166534]" };
  if (score >= 70) return { label: "Real", color: "text-[#1E40AF]" };
  if (score >= 50) return { label: "Stretch", color: "text-[#7C2D12]" };
  return { label: "Weak", color: "text-[#991B1B]" };
}
