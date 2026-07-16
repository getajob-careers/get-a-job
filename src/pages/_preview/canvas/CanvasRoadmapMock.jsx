// ROUGH MOCK (proposal, not a build) — where the user's roadmap could live.
// A "Your roadmap" card: the target role + a qualitative path (milestones as
// done / current / next / later — no hard stats, per the no-percentages steer)
// + the next move linking to Skill hub. Shown at ?roadmap=lab above the Browse
// grid so the shape is concrete for the IA conversation. Fixture data (Noa).
import React from "react";
import { Target, Check, ArrowRight } from "lucide-react";

const STEPS = [
  { label: "Foundations", detail: "SQL · Excel modeling", state: "done" },
  {
    label: "Dashboarding & BI",
    detail: "Looker, dashboards that drive decisions",
    state: "current",
  },
  {
    label: "Stakeholder storytelling",
    detail: "STAR narratives, exec-ready decks",
    state: "next",
  },
  {
    label: "RevOps systems",
    detail: "Salesforce / CRM operations",
    state: "later",
  },
];

function Node({ state }) {
  if (state === "done")
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rd-coral text-white flex-shrink-0">
        <Check className="w-3 h-3" aria-hidden="true" />
      </span>
    );
  if (state === "current")
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-rd-coral flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-rd-coral" />
      </span>
    );
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-rd-border-hover flex-shrink-0" />
  );
}

export default function CanvasRoadmapMock() {
  return (
    <div className="rd-lift rd-r-lg p-5 mb-4 max-w-[380px]">
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-2">
        Rough mock · roadmap placement proposal
      </p>
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-rd-coral" aria-hidden="true" />
        <h3 className="font-display font-bold rd-t-display-s text-rd-text">
          Your roadmap
        </h3>
      </div>
      <p className="rd-t-body-s text-rd-text-secondary mt-1">
        Target ·{" "}
        <strong className="font-display font-bold text-rd-text">
          Revenue Operations Analyst
        </strong>
      </p>

      <div className="mt-4 flex flex-col">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Node state={s.state} />
              {i < STEPS.length - 1 && (
                <span className="w-px flex-1 my-0.5 bg-rd-border-hover" />
              )}
            </div>
            <div
              className={`pb-3 ${s.state === "later" || s.state === "next" ? "opacity-70" : ""}`}
            >
              <p
                className={`rd-t-body-m text-rd-text leading-tight ${
                  s.state === "current"
                    ? "font-display font-bold"
                    : "font-medium"
                }`}
              >
                {s.label}
                {s.state === "current" && (
                  <span className="ml-2 rd-t-micro font-mono uppercase tracking-[0.08em] text-rd-coral-dark">
                    now
                  </span>
                )}
              </p>
              <p className="rd-t-micro text-rd-text-tertiary mt-0.5">
                {s.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 rd-well rd-r-md p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow">
            Next move
          </p>
          <p className="rd-t-body-s font-display font-bold text-rd-text truncate">
            Build a dashboard project
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 flex-shrink-0 font-display font-bold rd-t-micro text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-3 py-1.5 rd-press rd-btn-sheen"
        >
          Skill hub
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
