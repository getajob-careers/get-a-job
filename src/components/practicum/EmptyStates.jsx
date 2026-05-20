import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Briefcase, FileText, Building2, ArrowRight, Compass, Send } from "lucide-react";

// Three empty states, one component per — keeps the orchestrator's
// conditional render readable. Layout matches the design-strategy
// "friendly empty state with explicit CTA" pattern.

export function NoPracticumPath() {
  return (
    <EmptyShell
      icon={Briefcase}
      title="Set your practicum path"
      body="The Internship Practicum is where you track your placement progress. Tell us whether your placement is faculty-assigned or self-sourced to unlock the right experience."
      cta={{ to: createPageUrl("Profile"), label: "Open Profile" }}
    />
  );
}

export function NoInternshipProfile({ onGenerate, generateDisabled }) {
  return (
    <EmptyShell
      icon={FileText}
      title="Generate your internship profile first"
      body="Your internship profile captures the pitch strategy we use to match companies — realistic targets, role archetypes you can pitch today, and how this practicum compounds your long-term career."
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
export function PracticumStartHere({ practicumPath }) {
  const isSelfSourced = practicumPath === "self_sourced";
  const steps = isSelfSourced
    ? [
        { Icon: FileText, label: "Generate your internship profile", desc: "Captures your pitch strategy — realistic targets, role archetypes, the practicum's long-term compound." },
        { Icon: Compass,  label: "Find matching companies",         desc: "We rank companies against your profile and surface the strongest fits." },
        { Icon: Send,     label: "Track your outreach",              desc: "Drag matched companies into your pipeline. Move them through Exploring → Outreach → Interview → Offered." },
      ]
    : [
        { Icon: Building2, label: "Wait for your placement",         desc: "Your faculty mentor will log the company you've been assigned. It'll appear here automatically." },
        { Icon: Compass,   label: "Self-source backups",              desc: "You can also add companies you've found on your own — they'll sit alongside your faculty placement." },
        { Icon: Send,      label: "Track outreach as you go",         desc: "Move each company through Exploring → Outreach → Interview → Offered as the conversation progresses." },
      ];

  return (
    <div className="act-card act-card-lg" style={{ marginTop: 12 }}>
      <p className="act-eyebrow">Start here</p>
      <h2 className="text-base font-semibold text-[#0E1014] mt-1.5 mb-4">
        {isSelfSourced ? "Build your self-sourced pipeline" : "Your faculty-assigned pipeline"}
      </h2>
      <ol className="flex flex-col gap-4 list-none">
        {steps.map(({ Icon, label, desc }, i) => (
          <li key={i} className="flex items-start gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-full text-xs font-bold"
              style={{
                width: 28, height: 28,
                background: "var(--act-accent-tint)",
                color: "var(--act-accent-deep)",
              }}
            >
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0E1014] flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-[#52545A]" />{label}
              </p>
              <p className="text-xs text-[#52545A] leading-relaxed mt-1">{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmptyShell({ icon: Icon, title, body, cta }) {
  return (
    <div className="act-card act-card-lg max-w-2xl">
      <div className="w-12 h-12 rounded-lg bg-[#FDE7E3] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#F87060]" />
      </div>
      <h2 className="text-base font-semibold text-[#0E1014] mb-2">{title}</h2>
      <p className="text-sm text-[#52545A] leading-relaxed mb-5">{body}</p>
      {cta && (cta.to ? (
        <Link to={cta.to} className="act-btn act-btn-primary act-btn-sm">
          {cta.label} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={cta.onClick}
          disabled={cta.disabled}
          className="act-btn act-btn-primary act-btn-sm"
        >
          {cta.label}
        </button>
      ))}
    </div>
  );
}
