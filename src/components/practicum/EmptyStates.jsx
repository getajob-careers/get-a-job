import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Briefcase, FileText, Building2 } from "lucide-react";

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

function EmptyShell({ icon: Icon, title, body, cta }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 max-w-2xl">
      <div className="w-12 h-12 rounded-lg bg-[#FAFAFA] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#525252]" />
      </div>
      <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">{title}</h2>
      <p className="text-sm text-[#525252] leading-relaxed mb-5">{body}</p>
      {cta && (cta.to ? (
        <Link
          to={cta.to}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-[#0A0A0A] hover:bg-[#262626] text-white rounded-md transition-colors"
        >
          {cta.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={cta.onClick}
          disabled={cta.disabled}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-[#0A0A0A] hover:bg-[#262626] disabled:bg-[#E5E5E5] disabled:text-[#A3A3A3] disabled:cursor-not-allowed text-white rounded-md transition-colors"
        >
          {cta.label}
        </button>
      ))}
    </div>
  );
}
