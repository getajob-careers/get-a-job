// CV tab content for the 3-tab homepage demo (Home3TabPreview.jsx).
//
// Revision 4: reverted the CV-bank dropdown from a teal accent back to
// coral - an earlier pass had steered every new component in this branch
// away from coral toward teal/neutral as an in-progress experiment, not a
// real decision. Coral is the live app's actual accent color (see
// Home3TabPreview.jsx's revision 4 note), so this now matches it. The
// Track button's teal-tint-when-tracked state is UNCHANGED here - that's
// not a coral-avoidance choice, it's copied verbatim from the real
// JobDetailModal.jsx's handleAdd button (`background: "var(--rd-teal-
// tint)"` when added), which is a functional success-state color, not a
// stand-in for the accent color.
//
// Revision 3:
// - The static "Master CV" label above the mock CV is now a dropdown
//   selector - a stand-in for a future real "CV bank" of saved CVs.
//   Visual only: picking an option just swaps in a different hardcoded
//   mock CV object below, nothing reads or writes application_cvs.
// - The top-matches cards' second action is renamed "Generate tailored
//   CV" and styled in --rd-coral.
//
// Both the master CV and the top-matches list remain hardcoded, visual-
// only mock content (see Home3TabFixtures.js) rather than live queries -
// see the previous revision's notes for why (empty-state fidelity for a
// reviewing account with no profile data, and outdated Roadmap-required
// empty-state copy).
//
// The icon grid + coach dock that lived in this tab's left column before
// now live in Home3TabSidebar.jsx, which wraps all three tabs.

import React, { useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Wand2, ChevronDown } from "lucide-react";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import JobGridCard from "@/components/jobs/JobGridCard";
import { CV_OPTIONS, MOCK_JOBS } from "./Home3TabFixtures";

const CV_TAB_PICKS = MOCK_JOBS.slice(0, 4);
const CV_TAB_STRETCH = MOCK_JOBS.slice(4, 6);

function tailorStub() {
  toast.info("Generate tailored CV isn't wired up yet in this prototype.");
}
function trackStub(setTracked, id) {
  setTracked((prev) => new Set(prev).add(id));
  toast.info(
    "Track is a visual stub here - this job is a sample, not a real listing.",
  );
}

export default function Home3TabCvTab() {
  const [selectedCvId, setSelectedCvId] = useState(CV_OPTIONS[0].id);
  const selectedCv =
    CV_OPTIONS.find((o) => o.id === selectedCvId)?.cv || CV_OPTIONS[0].cv;

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
      <div className="w-full md:flex-1 min-w-0 md:h-full md:overflow-y-auto bg-rd-bg-card border border-rd-border-subtle rounded-[16px]">
        <MockMasterCv
          cv={selectedCv}
          selectedCvId={selectedCvId}
          onSelectCv={setSelectedCvId}
        />
      </div>

      <div className="w-full md:w-[320px] flex-shrink-0 md:h-full md:overflow-y-auto">
        <TopMatchesPanel />
      </div>
    </div>
  );
}

// ───── Center: mock master CV + CV-bank dropdown ─────

function MockMasterCv({ cv, selectedCvId, onSelectCv }) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-rd-text-eyebrow font-mono">
          Sample content for this prototype
        </p>
        <CvBankDropdown value={selectedCvId} onChange={onSelectCv} />
      </div>
      <div className="max-w-2xl">
        <h2 className="font-display font-extrabold text-[22px] text-rd-text">
          {cv.name}
        </h2>
        <p className="text-[13px] text-rd-text-secondary mt-0.5">{cv.title}</p>
        <p className="text-[11.5px] text-rd-text-tertiary mt-1">{cv.contact}</p>

        <SectionLabel>Summary</SectionLabel>
        <p className="text-[12.5px] text-rd-text-secondary leading-[1.6]">
          {cv.summary}
        </p>

        <SectionLabel>Experience</SectionLabel>
        <div className="flex flex-col gap-4">
          {cv.experience.map((exp) => (
            <div key={exp.company}>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-[13px] font-display font-bold text-rd-text">
                  {exp.role}{" "}
                  <span className="font-normal text-rd-text-secondary">
                    · {exp.company}
                  </span>
                </p>
                <p className="text-[11px] text-rd-text-tertiary whitespace-nowrap">
                  {exp.dates}
                </p>
              </div>
              <ul className="mt-1.5 flex flex-col gap-1">
                {exp.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="text-[12.5px] text-rd-text-secondary leading-[1.55] pl-3.5 relative before:content-['·'] before:absolute before:left-0 before:text-rd-text-tertiary"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <SectionLabel>Education</SectionLabel>
        {cv.education.map((ed) => (
          <div
            key={ed.school}
            className="flex items-baseline justify-between gap-2 flex-wrap"
          >
            <p className="text-[13px] font-display font-bold text-rd-text">
              {ed.school}{" "}
              <span className="font-normal text-rd-text-secondary">
                · {ed.degree}
              </span>
            </p>
            <p className="text-[11px] text-rd-text-tertiary whitespace-nowrap">
              {ed.dates}
            </p>
          </div>
        ))}

        <SectionLabel>Skills</SectionLabel>
        <p className="text-[12.5px] text-rd-text-secondary leading-[1.6]">
          {cv.skills.join(" · ")}
        </p>
        <p className="text-[11.5px] text-rd-text-tertiary mt-1.5">
          Tools: {cv.tools.join(" · ")}
        </p>

        <SectionLabel>Languages</SectionLabel>
        <p className="text-[12.5px] text-rd-text-secondary leading-[1.6]">
          {cv.languages.join(" · ")}
        </p>
      </div>
    </div>
  );
}

// Styled to visually read as "click me": teal border + text, chevron,
// hover state - a stand-in for a future real CV-bank selector. Native
// <select> for the demo (keyboard/a11y come free); the option list is the
// visible control, the icon overlay is decorative only.
function CvBankDropdown({ value, onChange }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer font-display font-bold text-[13px] text-rd-coral-dark bg-rd-coral-tint border border-rd-coral/40 hover:border-rd-coral hover:bg-rd-coral-tint rounded-full pl-3.5 pr-8 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-1"
      >
        {CV_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="w-3.5 h-3.5 text-rd-coral-dark absolute right-2.5 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-rd-text-eyebrow font-mono mt-5 mb-2 pb-1 border-b border-rd-border-subtle">
      {children}
    </p>
  );
}

// ───── Right: mock top matches ─────

function TopMatchesPanel() {
  const [trackedIds, setTrackedIds] = useState(() => new Set());

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display font-bold text-[14px] text-rd-text px-0.5">
        Top matches for you
      </h2>
      <p className="text-[10.5px] text-rd-text-tertiary px-0.5 -mt-2">
        Sample listings for this prototype
      </p>

      <MatchSection
        title="Our picks for you"
        entries={CV_TAB_PICKS}
        trackedIds={trackedIds}
        setTrackedIds={setTrackedIds}
      />
      <MatchSection
        title="Worth a stretch"
        entries={CV_TAB_STRETCH}
        trackedIds={trackedIds}
        setTrackedIds={setTrackedIds}
      />
    </div>
  );
}

function MatchSection({ title, entries, trackedIds, setTrackedIds }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-rd-text-eyebrow font-mono mb-1.5 px-0.5">
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {entries.map(({ job, score }) => {
          const trackColor = TRACK_CONFIG[score.track]?.rdColor || null;
          const tracked = trackedIds.has(job.id);
          return (
            <div key={job.id} className="flex flex-col gap-1.5">
              <JobGridCard
                job={job}
                scoreResult={score}
                trackColor={trackColor}
                unified
                onOpen={() => {}}
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => trackStub(setTrackedIds, job.id)}
                  disabled={tracked}
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold text-[11px] rounded-full px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed"
                  style={
                    tracked
                      ? {
                          background: "var(--rd-teal-tint)",
                          color: "var(--rd-teal-dark)",
                        }
                      : {
                          background: "var(--rd-bg-soft)",
                          color: "var(--rd-text)",
                        }
                  }
                >
                  {tracked ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  {tracked ? "Tracked" : "Track"}
                </button>
                <button
                  type="button"
                  onClick={tailorStub}
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold text-[11px] rounded-full px-2.5 py-1.5 bg-rd-coral text-white hover:bg-rd-coral-dark transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  Generate tailored CV
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
