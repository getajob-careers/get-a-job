import React, { useState, useMemo } from "react";

// ProfilePreview — generic social-profile mockup. Renders the user's
// optimised content in a profile-page-like layout so they can SEE how
// the headline/about/experience would land before pasting it into
// LinkedIn manually. Not a LinkedIn-trademark replica — Direction 3
// tokens only, generic feed/profile chrome.
//
// Toggle Current ↔ Optimised when both exist (baseline imported + AI
// generated). Coral left-border accent marks sections that changed
// between Current and Optimised.

function initialsFor(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("") || "?";
}

// Normalise a baseline-data shape (from the LinkedIn ZIP import) into the
// same {headline, about, experiences[]} shape the generated_data uses, so
// the mockup can render both with the same component.
function shapeBaseline(baseline) {
  if (!baseline) return null;
  return {
    headline: baseline.headline || baseline.Headline || "",
    about: baseline.about || baseline.Summary || baseline.summary || "",
    experiences: (baseline.positions || baseline.experiences || []).map((p) => ({
      title: p.Title || p.title || "",
      company: p["Company Name"] || p.company || "",
      description: p.Description || p.description || "",
    })),
  };
}

function shapeGenerated(content, baseline) {
  if (!content) return null;
  // The experiences[] in generated_data is keyed by position; match the
  // labels from content.experience_labels for company / title display.
  // Fall back to baseline positions if available for company strings.
  const labels = content.experience_labels || {};
  const baselineMap = new Map(
    (baseline?.positions || baseline?.experiences || []).map((p) => [
      p.position_id || p.Title || p.title,
      { company: p["Company Name"] || p.company || "", title: p.Title || p.title || "" },
    ]),
  );
  return {
    headline: content.headline || "",
    about: content.about || "",
    experiences: (content.experiences || []).map((e, i) => {
      const key = e.position_id || e.id || e.title || `pos_${i}`;
      const labelMeta = labels[key] || {};
      const baselineMeta = baselineMap.get(key) || {};
      return {
        title: e.title || labelMeta.title || baselineMeta.title || "Role",
        company: e.company || labelMeta.company || baselineMeta.company || "",
        description: e.description || "",
      };
    }),
  };
}

export default function ProfilePreview({ content, baseline, fullName }) {
  const optimised = useMemo(() => shapeGenerated(content, baseline), [content, baseline]);
  const current = useMemo(() => shapeBaseline(baseline), [baseline]);
  const hasBaseline = !!current && (current.headline || current.about || current.experiences.length);

  // Default to "optimised" — the whole point of the page. Toggle hidden
  // when no baseline exists.
  const [view, setView] = useState("optimised");
  const active = view === "current" && hasBaseline ? current : optimised;

  if (!active) return null;

  // Section-level "changed" markers — only meaningful when both versions
  // exist AND we're showing the optimised side. Compares against the
  // current values; if a section's text differs, mark it.
  const showChangeMarkers = hasBaseline && view === "optimised";
  const changed = {
    headline: showChangeMarkers && active.headline !== current.headline,
    about:    showChangeMarkers && active.about !== current.about,
    experiences: (active.experiences || []).map((e, i) => {
      if (!showChangeMarkers) return false;
      return e.description !== current.experiences?.[i]?.description;
    }),
  };

  const name = fullName || "Your name";
  const initials = initialsFor(fullName);

  return (
    <div className="flex flex-col gap-3">
      {hasBaseline && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="li-eyebrow">Live preview</p>
          <div className="li-mockup-toggle" role="group" aria-label="Toggle between current and optimised profile">
            <button type="button" onClick={() => setView("current")} aria-pressed={view === "current"}>
              Current
            </button>
            <button type="button" onClick={() => setView("optimised")} aria-pressed={view === "optimised"}>
              Optimised
            </button>
          </div>
        </div>
      )}
      {!hasBaseline && (
        <p className="li-eyebrow">Live preview</p>
      )}

      <div className="li-profile-mockup">
        <div className="li-profile-cover">
          <div className="li-profile-avatar"><span>{initials}</span></div>
        </div>
        <div className="li-profile-identity">
          <p className="li-profile-name">{name}</p>
          <p className="li-profile-headline">
            {active.headline || <span className="text-[#9C9DA1] italic">(headline will appear here)</span>}
          </p>
        </div>

        <div className="li-profile-section" data-changed={changed.about || undefined}>
          <p className="li-profile-section-head">About</p>
          <p className="li-profile-section-body">
            {active.about || <span className="text-[#9C9DA1] italic">(about section will appear here)</span>}
          </p>
        </div>

        {active.experiences.length > 0 && (
          <div className="li-profile-section">
            <p className="li-profile-section-head">Experience</p>
            {active.experiences.map((exp, i) => (
              <div
                key={i}
                className="li-profile-exp-item"
                data-changed={changed.experiences[i] || undefined}
                style={
                  changed.experiences[i]
                    ? { borderLeft: "3px solid var(--li-accent)", paddingLeft: 12, marginLeft: -3 }
                    : undefined
                }
              >
                <p className="li-profile-exp-title">{exp.title}</p>
                {exp.company && <p className="li-profile-exp-meta">{exp.company}</p>}
                {exp.description && <p className="li-profile-exp-desc">{exp.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#9C9DA1] text-center mt-1">
        Generic profile layout for spatial reference — not affiliated with any social platform.
      </p>
    </div>
  );
}
