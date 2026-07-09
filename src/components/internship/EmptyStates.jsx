import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Briefcase, FileText, Building2, ArrowRight, Compass, Send } from "lucide-react";

// Three empty states, one component per — keeps the orchestrator's
// conditional render readable. Layout matches the design-strategy
// "friendly empty state with explicit CTA" pattern.

export function NoInternshipPath() {
  return (
    <EmptyShell
      icon={Briefcase}
      title="Set your internship path"
      body="The Internship page is where you track your placement progress. Tell us whether your placement is faculty-assigned or self-sourced to unlock the right experience."
      cta={{ to: createPageUrl("Profile"), label: "Open Profile" }}
    />
  );
}

export function NoInternshipProfile({ onGenerate, generateDisabled }) {
  return (
    <EmptyShell
      icon={FileText}
      title="Generate your internship profile first"
      body="Your internship profile captures the pitch strategy we use to match companies - realistic targets, role archetypes you can pitch today, and how this internship compounds your long-term career."
      cta={
        generateDisabled
          ? { disabled: true, label: "Generator landing Tuesday" }
          : { onClick: onGenerate, label: "Generate profile" }
      }
    />
  );
}

export function FacultyPlacementPending() {
  return (
    <EmptyShell
      icon={Building2}
      title="Your placement will appear here"
      body="Add the company your faculty assigned you to start tracking your placement."
    />
  );
}

// 3-step "start here" card for new self-sourced users with no targets yet.
// Sits above the empty kanban so the workflow is obvious — disappears once
// any company target exists.
export function InternshipStartHere({ practicumPath }) {
  const isSelfSourced = practicumPath === "self_sourced";
  const steps = isSelfSourced
    ? [
        { Icon: FileText, label: "Generate your internship profile", desc: "Captures your pitch strategy - realistic targets, role archetypes, the internship's long-term compound." },
        { Icon: Compass,  label: "Find matching companies",         desc: "We rank companies against your profile and surface the strongest fits." },
        { Icon: Send,     label: "Track your outreach",              desc: "Drag matched companies into your pipeline. Move them through Exploring → Outreach → Interview → Offered." },
      ]
    : [
        { Icon: Building2, label: "Wait for your placement",         desc: "Your faculty mentor will log the company you've been assigned. It'll appear here automatically." },
        { Icon: Compass,   label: "Self-source backups",              desc: "You can also add companies you've found on your own - they'll sit alongside your faculty placement." },
        { Icon: Send,      label: "Track outreach as you go",         desc: "Move each company through Exploring → Outreach → Interview → Offered as the conversation progresses." },
      ];

  return (
    <div className="bg-rd-bg-card border border-rd-border rounded-[20px] p-6 mt-3 shadow-rd">
      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">Start here</p>
      <h2 className="text-base font-display font-bold text-rd-text mt-1.5 mb-4">
        {isSelfSourced ? "Build your self-sourced pipeline" : "Your faculty-assigned pipeline"}
      </h2>
      <ol className="flex flex-col gap-4 list-none">
        {steps.map(({ Icon, label, desc }, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-full text-xs font-display font-bold bg-rd-coral-tint text-rd-coral-dark">
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-display font-semibold text-rd-text flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-rd-text-secondary" />{label}
              </p>
              <p className="text-xs text-rd-text-secondary leading-relaxed mt-1">{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmptyShell({ icon: Icon, title, body, cta }) {
  return (
    <div className="bg-rd-bg-card border border-rd-border rounded-[20px] p-6 max-w-2xl shadow-rd">
      <div className="w-12 h-12 rounded-[10px] bg-rd-coral-tint flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-rd-coral" />
      </div>
      <h2 className="text-base font-display font-bold text-rd-text mb-2">{title}</h2>
      <p className="text-sm text-rd-text-secondary leading-relaxed mb-5">{body}</p>
      {cta && (cta.to ? (
        <Link
          to={cta.to}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-display font-bold bg-rd-coral text-white hover:bg-rd-coral-dark transition-colors"
        >
          {cta.label} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={cta.onClick}
          disabled={cta.disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-display font-bold bg-rd-coral text-white hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {cta.label}
        </button>
      ))}
    </div>
  );
}
