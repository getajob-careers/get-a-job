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

// Score-band display moved to ./browse/scoreHelpers.js per PR5 — surfaces
// now show single High/Med/Low bands instead of the old 4-band Strong/
// Real/Stretch/Weak rubric paired with raw numbers. Import bandForLlmScore
// (or bandForRuleScore) + BAND_LABELS from there.
