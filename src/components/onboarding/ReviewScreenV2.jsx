import React from "react";
import { Loader2, FileText, AlertCircle, RotateCcw, Check } from "lucide-react";
import StepReview from "@/components/onboarding/StepReview";
import { useCountUp } from "@/hooks/useCountUp";

// Onboarding V2 — review screen (index 1). One screen, one moment of truth:
// extraction resolves on THIS screen's watch (screen 0 kicked it off), so we
// show a wait, then either the counting-numbers reveal + confirm on success, or
// the "couldn't read your CV" retry + manual-entry floor on failure. The
// confirm/edit UI reuses the existing StepReview (embedded chrome-less under
// the shell's own progress).
//
// status drives the state machine:
//   'extracting' → animated wait
//   'success'    → count-up reveal + StepReview
//   'failed'     → failure banner + retry + StepReview (manual-entry floor)
//   'skipped'    → StepReview (manual entry, no failure framing)

function StatCountUp({ value, label, delay }) {
  const n = useCountUp(value, { duration: 900, delay });
  return (
    <div className="flex flex-col items-center px-3">
      <span className="font-display font-extrabold text-[26px] leading-none text-rd-primary tabular-nums">
        {n}
      </span>
      <span className="text-[11px] font-medium text-rd-text-secondary uppercase tracking-wide mt-1">
        {label}
      </span>
    </div>
  );
}

function ExtractingWait() {
  return (
    <div
      className="rounded-[18px] border border-rd-border bg-rd-bg-card p-8 flex flex-col items-center text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="w-6 h-6 text-rd-primary animate-spin"
        aria-hidden="true"
      />
      <p className="font-display font-bold text-[16px] text-rd-text mt-4">
        Reading your CV…
      </p>
      <p className="text-[13px] text-rd-text-secondary mt-1.5 max-w-[320px]">
        We&apos;re pulling out your experience, education, and skills. This
        takes a few seconds.
      </p>
    </div>
  );
}

function SuccessReveal({ experiences, educations, projects, skillsCount }) {
  const expN = (experiences || []).length;
  const eduN = (educations || []).filter((e) => e?.institution?.trim()).length;
  const projN = (projects || []).length;
  // Show the three most meaningful non-zero counts, in a stable order.
  const stats = [
    { value: expN, label: expN === 1 ? "role" : "roles" },
    { value: skillsCount, label: "skills" },
    eduN > 0
      ? { value: eduN, label: eduN === 1 ? "degree" : "degrees" }
      : { value: projN, label: projN === 1 ? "project" : "projects" },
  ];
  return (
    <div className="rounded-[18px] border border-rd-teal/40 bg-rd-teal-tint/50 p-5">
      <div className="flex items-center gap-2 justify-center text-rd-teal-dark">
        <Check className="w-4 h-4" aria-hidden="true" />
        <p className="font-display font-bold text-[14px]">We read your CV</p>
      </div>
      <div className="flex items-stretch justify-center divide-x divide-rd-teal/25 mt-3">
        {stats.map((s, i) => (
          <StatCountUp
            key={i}
            value={s.value}
            label={s.label}
            delay={120 + i * 140}
          />
        ))}
      </div>
      <p className="text-[12px] text-rd-text-secondary text-center mt-3">
        Check it below — edit anything that isn&apos;t right, add what&apos;s
        missing.
      </p>
    </div>
  );
}

function FailureBanner({ onRetry }) {
  return (
    <div className="rounded-[18px] border border-rd-primary/40 bg-rd-primary-tint/50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle
          className="w-5 h-5 text-rd-primary-dark flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-[14px] text-rd-text">
            We couldn&apos;t read your CV
          </p>
          <p className="text-[12.5px] text-rd-text-secondary mt-1 leading-relaxed">
            The file didn&apos;t parse cleanly. You can try uploading again, or
            just fill in the essentials below — either way you&apos;re not
            stuck.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] text-rd-primary-dark hover:text-rd-primary border border-rd-primary/40 hover:border-rd-primary rounded-full px-3.5 py-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Try another file
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewScreenV2({
  status,
  profileData,
  onChange,
  educations,
  setEducations,
  experiences,
  setExperiences,
  projects,
  setProjects,
  certifications,
  setCertifications,
  onContinue,
  onBack,
  onRetry,
}) {
  if (status === "extracting") {
    return <ExtractingWait />;
  }

  const skillsCount = Array.isArray(profileData?.skills)
    ? profileData.skills.length
    : 0;

  const manualFloor = status === "failed" || status === "skipped";

  return (
    <div className="space-y-6">
      {status === "success" && (
        <SuccessReveal
          experiences={experiences}
          educations={educations}
          projects={projects}
          skillsCount={skillsCount}
        />
      )}
      {status === "failed" && <FailureBanner onRetry={onRetry} />}
      {status === "skipped" && (
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card p-4 flex items-center gap-2.5 text-rd-text-secondary">
          <FileText className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <p className="text-[12.5px]">
            No CV yet — fill in the essentials below and you can always add your
            CV later.
          </p>
        </div>
      )}

      <StepReview
        data={profileData}
        onChange={onChange}
        educations={educations}
        setEducations={setEducations}
        experiences={experiences}
        setExperiences={setExperiences}
        projects={projects}
        setProjects={setProjects}
        certifications={certifications}
        setCertifications={setCertifications}
        onNext={onContinue}
        onBack={onBack}
        eyebrow={null}
        showExtractedBanner={!manualFloor}
      />
    </div>
  );
}
