import React from "react";

const STATUS_LABELS = {
  exploring: "Exploring",
  matched: "Matched",
  active_internship: "Active internship",
  completed: "Completed",
};

const PATH_LABELS = {
  self_sourced: "Self-sourced",
  faculty_assigned: "Faculty-assigned",
};

export default function InternshipHeader({ practicumPath, practicumStatus, practicumCohort }) {
  return (
    <header className="mb-7">
      <p className="act-eyebrow">Internship</p>
      <h1 className="act-h1 mt-1.5">Track your internship pipeline.</h1>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {practicumPath && (
          <span className="act-status-badge act-status-gray">
            {PATH_LABELS[practicumPath] || practicumPath}
          </span>
        )}
        {practicumStatus && (
          <span className="act-status-badge act-status-info">
            {STATUS_LABELS[practicumStatus] || practicumStatus}
          </span>
        )}
        {practicumCohort && (
          <span className="text-xs text-[#9C9DA1]">{practicumCohort}</span>
        )}
      </div>
      <p className="act-sub" style={{ marginTop: 14 }}>
        Track companies, manage outreach, and capture what you learn from each conversation.
      </p>
    </header>
  );
}
