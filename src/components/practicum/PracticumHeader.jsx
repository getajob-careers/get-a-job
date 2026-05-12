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

export default function PracticumHeader({ practicumPath, practicumStatus, practicumCohort }) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Internship Practicum</h1>
        {practicumPath && (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium text-[#525252] bg-[#F5F5F5] border border-[#E5E5E5] rounded">
            {PATH_LABELS[practicumPath] || practicumPath}
          </span>
        )}
        {practicumStatus && (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium text-[#1E40AF] bg-[#DBEAFE] rounded">
            {STATUS_LABELS[practicumStatus] || practicumStatus}
          </span>
        )}
        {practicumCohort && (
          <span className="text-xs text-[#A3A3A3]">{practicumCohort}</span>
        )}
      </div>
      <p className="text-sm text-[#525252]">
        Track companies, manage outreach, and capture what you learn from each conversation.
      </p>
    </header>
  );
}
