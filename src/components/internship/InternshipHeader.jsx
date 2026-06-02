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
      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">Internship</p>
      <h1 className="font-display font-extrabold text-[27px] sm:text-[32px] leading-[1.08] tracking-tight text-rd-text mt-1.5">Track your internship pipeline.</h1>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {practicumPath && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-medium tracking-[0.04em] uppercase bg-rd-bg-soft text-rd-text-secondary">
            {PATH_LABELS[practicumPath] || practicumPath}
          </span>
        )}
        {practicumStatus && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-medium tracking-[0.04em] uppercase bg-rd-teal-tint text-rd-teal-dark">
            {STATUS_LABELS[practicumStatus] || practicumStatus}
          </span>
        )}
        {practicumCohort && (
          <span className="text-xs text-rd-text-tertiary">{practicumCohort}</span>
        )}
      </div>
      <p className="text-[14.5px] leading-[1.55] text-rd-text-secondary mt-3.5">
        Track companies, manage outreach, and capture what you learn from each conversation.
      </p>
    </header>
  );
}
