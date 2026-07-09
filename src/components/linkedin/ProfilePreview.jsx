import React, { useState, useMemo, useRef, useEffect } from "react";
import { Sparkles, Loader2, Copy, Check, AlertCircle } from "lucide-react";

// PR 3J-A — ProfilePreview restyled to match getajob_linkedin_profile_optimizer.html.
//
// This is now the MAIN surface of the Profile tab (Q1 hybrid pane): single
// profile-card preview with the Current/Optimized segmented toggle at top,
// and per-section refinement reachable inline by clicking each section's
// Refine affordance. The previous list-of-CompareCards editor is removed
// in favour of editing in-place on the preview.
//
// Brand fidelity (Q7): LinkedIn-blue (#0A66C2) is preserved ONLY in the
// simulacrum surfaces — Open-to-work pill, cover strip, "500+ connections"
// link, the action buttons (Open to work / Add section / More), and the
// experience entry icon. Everything else is rd-coral / rd tokens.
//
// Write-path preservation:
// - Refinement clicks call `onRefine(sectionKey, instruction)` exactly as
//   the previous CompareCard did. Section keys map 1:1 to the live
//   `generate-linkedin-content` contract: `headline` | `about` |
//   `experience:<id>` | `volunteering:<id>` | `military:<id>` |
//   `honors:<index>` | `skills_priority`.

function initialsFor(name) {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "?"
  );
}

// Shape baseline (LinkedIn-archive ZIP) into the same {headline, about,
// experiences[]} format the generated_data uses.
function shapeBaseline(baseline) {
  if (!baseline) return null;
  return {
    headline: baseline.profile?.headline || baseline.headline || baseline.Headline || "",
    about: baseline.profile?.about || baseline.about || baseline.Summary || baseline.summary || "",
    experiences: (baseline.positions || baseline.experiences || []).map((p) => ({
      id: p.position_id || p.Title || p.title || "",
      title: p.Title || p.title || "",
      company: p["Company Name"] || p.company || "",
      description: p.Description || p.description || "",
    })),
  };
}

// Shape generated_data into the same display shape, threading
// experience_labels metadata for company / title rendering.
function shapeGenerated(content, baseline) {
  if (!content) return null;
  const labels = content.experience_labels || {};
  const baselineMap = new Map(
    (baseline?.positions || baseline?.experiences || []).map((p) => [
      p.position_id || p.Title || p.title,
      {
        company: p["Company Name"] || p.company || "",
        title: p.Title || p.title || "",
        description: p.Description || p.description || "",
      },
    ]),
  );

  const experiences = (content.experiences || []).map((e, i) => {
    const key = e.experience_id || e.position_id || e.id || e.title || `pos_${i}`;
    const labelLine = labels[key];
    const parsedLabel = parseExperienceLabel(labelLine);
    const baselineMeta = baselineMap.get(key) || {};
    return {
      kind: "experience",
      sectionKey: `experience:${key}`,
      id: key,
      title: parsedLabel.title || e.title || baselineMeta.title || "Role",
      company: parsedLabel.company || e.company || baselineMeta.company || "",
      description: e.description || "",
      baselineDescription: baselineMeta.description || "",
    };
  });

  const volunteering = (content.volunteering || []).map((v, i) => {
    const key = v.experience_id || v.id || `vol_${i}`;
    const labelLine = labels[key];
    const parsedLabel = parseExperienceLabel(labelLine);
    return {
      kind: "volunteering",
      sectionKey: `volunteering:${key}`,
      id: key,
      title: parsedLabel.title || v.role || "Volunteering",
      company: parsedLabel.company || v.organization || "",
      description: v.description || "",
      baselineDescription: "",
    };
  });

  const military = (content.military || []).map((m, i) => {
    const key = m.experience_id || m.id || `mil_${i}`;
    const labelLine = labels[key];
    const parsedLabel = parseExperienceLabel(labelLine);
    return {
      kind: "military",
      sectionKey: `military:${key}`,
      id: key,
      title: parsedLabel.title || m.role || "Military service",
      company: parsedLabel.company || m.unit || "",
      description: m.description || "",
      baselineDescription: "",
    };
  });

  return {
    headline: content.headline || "",
    about: content.about || "",
    experiences: [...experiences, ...volunteering, ...military],
    skills_priority: content.skills_priority || [],
    honors: content.honors || [],
  };
}

// "Senior PM at monday.com" → { title, company }. Tolerates malformed input.
function parseExperienceLabel(label) {
  if (!label || typeof label !== "string") return { title: "", company: "" };
  const match = label.match(/^(.+?)\s+at\s+(.+)$/i);
  if (match) return { title: match[1].trim(), company: match[2].trim() };
  return { title: label.trim(), company: "" };
}

// Inline per-section refine form. Wraps the Q1 click-to-refine UX —
// preserves the live ≤600-char instruction + handleRefine contract from
// ProfileTab.
function RefineForm({ onSubmit, onCancel, refining }) {
  const [text, setText] = useState("");
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); }, []);
  return (
    <div className="mt-3 rounded-[14px] border border-rd-border bg-rd-bg-soft px-3.5 py-3">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 600))}
        disabled={refining}
        placeholder="Optional: how to improve this section. e.g. 'focus more on product management', 'mention my military leadership', 'make it shorter'. Leave blank to regenerate with a different angle."
        className="w-full text-[13px] border border-rd-border rounded-[10px] px-3 py-2 bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary resize-none focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] disabled:opacity-60"
        rows={3}
      />
      <div className="flex items-center justify-between mt-2 gap-3">
        <span className="text-[11px] text-rd-text-tertiary">{text.length}/600</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={refining}
            className="text-[12px] px-3 py-1.5 text-rd-text-secondary hover:text-rd-text disabled:opacity-60 rounded-full"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(text.trim())}
            disabled={refining}
            className="inline-flex items-center gap-1.5 font-display font-bold text-[12px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-3 py-1.5 transition-colors"
          >
            {refining ? (
              <><Loader2 className="w-3 h-3 animate-spin" />Refining…</>
            ) : (
              <><Sparkles className="w-3 h-3" />Refine</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Header row inside a section card: title + Optimized pill (if changed) +
// Refine icon button. Clicking Refine toggles the per-section RefineForm.
function SectionHeader({ title, changed, canRefine, refineOpen, onRefineClick, optimizedPillVisible }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className="font-display font-bold text-[16px] text-[#1A1A1A]">{title}</span>
        {changed && optimizedPillVisible && (
          <span className="inline-flex items-center font-display font-bold text-[10px] uppercase tracking-[0.04em] text-white bg-rd-coral rounded-full px-2 py-[2px]">
            Optimized
          </span>
        )}
      </div>
      {canRefine && !refineOpen && (
        <button
          type="button"
          onClick={onRefineClick}
          className="inline-flex items-center gap-1 text-[11px] text-rd-text-secondary hover:text-rd-coral-dark transition-colors"
          title="Refine just this section"
        >
          <Sparkles className="w-3 h-3" />Refine
        </button>
      )}
    </div>
  );
}

export default function ProfilePreview({
  content,
  baseline,
  fullName,
  location,
  onRefine,
  view: viewProp,
  onViewChange,
  onCopyAll,
}) {
  const optimised = useMemo(() => shapeGenerated(content, baseline), [content, baseline]);
  const current = useMemo(() => shapeBaseline(baseline), [baseline]);
  const hasBaseline = !!current && (current.headline || current.about || current.experiences.length);

  // Toggle state can be controlled or uncontrolled (preview harness passes
  // a controlled value).
  const [viewState, setViewState] = useState("optimised");
  const view = viewProp ?? viewState;
  const setView = (next) => {
    if (onViewChange) onViewChange(next);
    setViewState(next);
  };

  const showCurrent = view === "current" && hasBaseline;
  const active = showCurrent ? current : optimised;

  // Per-section refine state — { sectionKey: string | null, refining: bool, error: string|null }
  const [refineState, setRefineState] = useState({ sectionKey: null, refining: false, error: null });
  const openRefine = (sectionKey) => setRefineState({ sectionKey, refining: false, error: null });
  const closeRefine = () => setRefineState({ sectionKey: null, refining: false, error: null });

  // Auto-close the refine form when the generated content changes
  // (refinement landed). Watch `optimised` reference, not deep equality.
  useEffect(() => {
    if (refineState.refining) {
      closeRefine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimised]);

  const handleRefineSubmit = async (sectionKey, instruction) => {
    if (!onRefine) return;
    setRefineState({ sectionKey, refining: true, error: null });
    try {
      await onRefine(sectionKey, instruction);
      // Effect above closes on optimised-update.
    } catch (e) {
      setRefineState({ sectionKey, refining: false, error: e?.message || "Refinement failed." });
    }
  };

  // Section "changed" markers — only when both versions exist and we're
  // showing the optimised side. Compares text against the current value.
  const showChangeMarkers = hasBaseline && !showCurrent;
  const changed = {
    headline: showChangeMarkers && optimised && optimised.headline !== current.headline,
    about: showChangeMarkers && optimised && optimised.about !== current.about,
  };

  if (!active) return null;

  const name = fullName || "Your name";
  const initials = initialsFor(fullName);
  const canRefine = !!onRefine && !showCurrent;

  // The simulacrum surface uses LinkedIn-blue cues per Q7. Everything
  // outside the white profile-card uses rd tokens.
  return (
    <div className="flex flex-col gap-3">
      {/* Optimizer header — title + Current/Optimized segmented toggle. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-display font-bold text-[16px] text-rd-text">Profile optimizer</p>
          <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
            How your profile will look on LinkedIn - coral marks what your agent improved.
          </p>
        </div>
        {hasBaseline && (
          <div
            className="inline-flex bg-rd-bg-soft rounded-full p-[3px] gap-[2px]"
            role="group"
            aria-label="Toggle between current and optimized profile"
          >
            <button
              type="button"
              onClick={() => setView("current")}
              aria-pressed={view === "current"}
              data-mockup-toggle="current"
              className={[
                "appearance-none border-0 font-display text-[13px] font-semibold cursor-pointer px-3.5 py-1.5 rounded-full transition-colors duration-150",
                view === "current"
                  ? "bg-rd-bg-card text-rd-text shadow-[0_2px_6px_rgba(40,25,10,0.1)]"
                  : "bg-transparent text-rd-text-secondary hover:text-rd-text",
              ].join(" ")}
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => setView("optimised")}
              aria-pressed={view === "optimised"}
              data-mockup-toggle="optimised"
              className={[
                "appearance-none border-0 font-display text-[13px] font-semibold cursor-pointer px-3.5 py-1.5 rounded-full transition-colors duration-150",
                view === "optimised"
                  ? "bg-rd-bg-card text-rd-text shadow-[0_2px_6px_rgba(40,25,10,0.1)]"
                  : "bg-transparent text-rd-text-secondary hover:text-rd-text",
              ].join(" ")}
            >
              Optimized
            </button>
          </div>
        )}
      </div>

      {/* Profile-card simulacrum — LinkedIn-blue brand cues preserved in
          cover, Open-to-work pill, connection-count link, and action
          buttons. All other surfaces use rd tokens. */}
      <div className="bg-white border border-[#E2DED5] rounded-[12px] overflow-hidden">
        {/* Cover strip */}
        <div className="h-[62px] bg-[#A7C4DD]" />

        {/* Avatar + identity */}
        <div className="px-[18px] pb-4">
          <div
            className="-mt-[38px] w-20 h-20 rounded-full bg-white p-[2px]"
            style={{ border: "3px solid #4FB477" }}
          >
            <div className="w-full h-full rounded-full bg-[#F0A98E] flex items-center justify-center">
              <span className="font-display text-[30px] font-bold text-white">{initials}</span>
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 mt-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-[20px] font-bold text-[#1A1A1A]">{name}</span>
                <span className="text-[10px] font-semibold text-[#0a7d3f] bg-[#E5F4EA] rounded-[4px] px-[7px] py-[2px]">
                  Open to work
                </span>
              </div>
              <p className="text-[13.5px] text-[#3A3A3A] mt-[3px] leading-[1.4]">
                {active.headline || (
                  <span className="text-rd-text-tertiary italic">(headline will appear here)</span>
                )}
              </p>
              {changed.headline && (
                <RefineSectionMarker
                  sectionKey="headline"
                  refineState={refineState}
                  onOpen={openRefine}
                  onClose={closeRefine}
                  onSubmit={handleRefineSubmit}
                  canRefine={canRefine}
                />
              )}
              <p className="text-[11.5px] text-[#6A6A6A] mt-[6px]">
                {location || "Tel Aviv, Israel"} ·{" "}
                <span className="text-[#0A66C2] font-semibold">500+ connections</span>
              </p>
            </div>
          </div>

          {/* Action buttons — LinkedIn-blue brand cues per Q7 */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-[12.5px] font-semibold rounded-full px-[14px] py-[6px] bg-[#0A66C2] text-white">
              Open to work
            </span>
            <span className="text-[12.5px] font-semibold rounded-full px-[14px] py-[6px] bg-white text-[#0A66C2] border-[1.5px] border-[#0A66C2]">
              Add section
            </span>
            <span className="text-[12.5px] font-semibold rounded-full px-[14px] py-[6px] bg-white text-[#5A5A5A] border-[1.5px] border-[#B6B6B6]">
              More
            </span>
          </div>
        </div>

        {/* About section */}
        <div className="border-t border-[#ECEAE4] px-[18px] py-4">
          <SectionHeader
            title="About"
            changed={changed.about}
            optimizedPillVisible
            canRefine={canRefine}
            refineOpen={refineState.sectionKey === "about"}
            onRefineClick={() => openRefine("about")}
          />
          <div className="text-[13px] leading-[1.65] text-[#2C2C2C] mt-2.5 whitespace-pre-wrap">
            {active.about || (
              <span className="text-rd-text-tertiary italic">(about section will appear here)</span>
            )}
          </div>
          {refineState.sectionKey === "about" && (
            <>
              <RefineForm
                onSubmit={(instruction) => handleRefineSubmit("about", instruction)}
                onCancel={closeRefine}
                refining={refineState.refining}
              />
              {refineState.error && <RefineErrorBanner error={refineState.error} />}
            </>
          )}
        </div>

        {/* Experience section — merges experiences + volunteering + military
            for visual consistency, but each entry preserves its own
            sectionKey for the refine call. */}
        {active.experiences && active.experiences.length > 0 && (
          <div className="border-t border-[#ECEAE4] px-[18px] py-4">
            <span className="font-display font-bold text-[16px] text-[#1A1A1A]">Experience</span>
            <div className="flex flex-col gap-[14px] mt-3">
              {active.experiences.map((exp, i) => {
                const expChanged =
                  showChangeMarkers &&
                  exp.description &&
                  exp.baselineDescription !== exp.description;
                const sectionKey = exp.sectionKey;
                const refineOpenHere =
                  refineState.sectionKey === sectionKey;
                return (
                  <div
                    key={`${exp.kind}-${exp.id}-${i}`}
                    className="flex gap-[11px]"
                    data-section-key={sectionKey}
                  >
                    <div className="w-[42px] h-[42px] rounded-[8px] bg-[#EAF1F8] flex items-center justify-center flex-shrink-0">
                      <span className="font-display text-[18px] font-bold text-[#0A66C2]">
                        {(exp.company || exp.title)[0]?.toUpperCase() || "•"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-bold text-[#1A1A1A]">{exp.title}</p>
                          <p className="text-[12px] text-[#3A3A3A]">{exp.company}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {expChanged && (
                            <span className="inline-flex items-center font-display font-bold text-[10px] uppercase tracking-[0.04em] text-white bg-rd-coral rounded-full px-2 py-[2px]">
                              Optimized
                            </span>
                          )}
                          {canRefine && !refineOpenHere && (
                            <button
                              type="button"
                              onClick={() => openRefine(sectionKey)}
                              className="inline-flex items-center gap-1 text-[11px] text-rd-text-secondary hover:text-rd-coral-dark transition-colors"
                              title="Refine just this entry"
                            >
                              <Sparkles className="w-3 h-3" />Refine
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[12.5px] text-[#2C2C2C] mt-[6px] leading-[1.55] whitespace-pre-wrap">
                        {exp.description || (
                          <span className="text-rd-text-tertiary italic">
                            (description will appear here)
                          </span>
                        )}
                      </p>
                      {refineOpenHere && (
                        <>
                          <RefineForm
                            onSubmit={(instruction) => handleRefineSubmit(sectionKey, instruction)}
                            onCancel={closeRefine}
                            refining={refineState.refining}
                          />
                          {refineState.error && <RefineErrorBanner error={refineState.error} />}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skills section */}
        {!showCurrent && optimised?.skills_priority?.length > 0 && (
          <div className="border-t border-[#ECEAE4] px-[18px] py-4">
            <SectionHeader
              title="Skills"
              changed={false}
              optimizedPillVisible={false}
              canRefine={canRefine}
              refineOpen={refineState.sectionKey === "skills_priority"}
              onRefineClick={() => openRefine("skills_priority")}
            />
            <div className="flex flex-wrap gap-[7px] mt-3">
              {optimised.skills_priority.map((s, i) => (
                <span
                  key={i}
                  className={[
                    "text-[12px] rounded-[6px] px-[10px] py-[5px] border",
                    i < 3
                      ? "bg-rd-coral-tint border-[#F2C3B5] text-rd-coral-dark font-semibold"
                      : "bg-[#EFEDE8] border-[#E2DED5] text-[#2C2C2C]",
                  ].join(" ")}
                  title={s.rationale || undefined}
                >
                  {s.skill}
                  {i < 3 && <span className="ml-1 text-[10px] font-normal">· top</span>}
                </span>
              ))}
            </div>
            {refineState.sectionKey === "skills_priority" && (
              <>
                <RefineForm
                  onSubmit={(instruction) => handleRefineSubmit("skills_priority", instruction)}
                  onCancel={closeRefine}
                  refining={refineState.refining}
                />
                {refineState.error && <RefineErrorBanner error={refineState.error} />}
              </>
            )}
          </div>
        )}

        {/* Honors section */}
        {!showCurrent && optimised?.honors?.length > 0 && (
          <div className="border-t border-[#ECEAE4] px-[18px] py-4">
            <span className="font-display font-bold text-[16px] text-[#1A1A1A]">Honors &amp; Awards</span>
            <div className="flex flex-col gap-3 mt-3">
              {optimised.honors.map((h, i) => {
                const sectionKey = `honors:${i}`;
                const refineOpenHere = refineState.sectionKey === sectionKey;
                return (
                  <div key={i} className="flex flex-col gap-1.5" data-section-key={sectionKey}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-display text-[13.5px] font-bold text-[#1A1A1A]">{h.name}</span>
                      {canRefine && !refineOpenHere && (
                        <button
                          type="button"
                          onClick={() => openRefine(sectionKey)}
                          className="inline-flex items-center gap-1 text-[11px] text-rd-text-secondary hover:text-rd-coral-dark transition-colors"
                          title="Refine just this entry"
                        >
                          <Sparkles className="w-3 h-3" />Refine
                        </button>
                      )}
                    </div>
                    {h.description ? (
                      <p className="text-[12.5px] text-[#2C2C2C] leading-[1.55] whitespace-pre-wrap">
                        {h.description}
                      </p>
                    ) : (
                      <p className="text-[11.5px] text-rd-text-tertiary italic">
                        (blank by design - paste the award title alone, or add your own context)
                      </p>
                    )}
                    {refineOpenHere && (
                      <>
                        <RefineForm
                          onSubmit={(instruction) => handleRefineSubmit(sectionKey, instruction)}
                          onCancel={closeRefine}
                          refining={refineState.refining}
                        />
                        {refineState.error && <RefineErrorBanner error={refineState.error} />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer pills (Q2 + Q3) — "Apply section by section" is a visual
          entry-point hint, not a new behavior (clicking any Refine icon
          inside the preview opens the per-section form). "Copy optimized
          profile" runs the client-only concat helper. */}
      <div className="flex gap-2.5 mt-1 flex-wrap">
        <span className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] rounded-full px-3 py-[7px] bg-rd-bg-soft text-rd-text-secondary">
          <Sparkles className="w-3.5 h-3.5" />Apply section by section
        </span>
        <div className="flex-1" />
        {onCopyAll && (
          <CopyAllButton onCopyAll={onCopyAll} />
        )}
      </div>
    </div>
  );
}

// Renders a small inline marker + opens the headline refine form when
// clicked. Headline is special-cased because it doesn't have a card-level
// section header — it renders inline next to the headline text.
function RefineSectionMarker({ sectionKey, refineState, onOpen, onClose, onSubmit, canRefine }) {
  const open = refineState.sectionKey === sectionKey;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="inline-flex items-center font-display font-bold text-[10px] uppercase tracking-[0.04em] text-white bg-rd-coral rounded-full px-2 py-[2px]">
        Optimized
      </span>
      {canRefine && !open && (
        <button
          type="button"
          onClick={() => onOpen(sectionKey)}
          className="inline-flex items-center gap-1 text-[11px] text-rd-text-secondary hover:text-rd-coral-dark transition-colors"
          title="Refine the headline"
        >
          <Sparkles className="w-3 h-3" />Refine
        </button>
      )}
      {open && (
        <div className="w-full">
          <RefineForm
            onSubmit={(instruction) => onSubmit(sectionKey, instruction)}
            onCancel={onClose}
            refining={refineState.refining}
          />
          {refineState.error && <RefineErrorBanner error={refineState.error} />}
        </div>
      )}
    </div>
  );
}

function RefineErrorBanner({ error }) {
  return (
    <div className="mt-2 px-3 py-2 rounded-[10px] bg-rd-coral-tint border border-rd-coral/30 text-[11.5px] text-rd-coral-dark flex items-start gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-[1px]" />
      <span>{error}</span>
    </div>
  );
}

function CopyAllButton({ onCopyAll }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    const ok = await onCopyAll();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      data-copy-all="true"
      className={[
        "inline-flex items-center gap-1.5 font-display font-bold text-[12.5px] rounded-full px-3.5 py-[7px] transition-colors text-white",
        copied ? "bg-rd-teal-dark hover:bg-rd-teal-dark" : "bg-rd-coral hover:bg-rd-coral-dark",
      ].join(" ")}
    >
      {copied ? (
        <><Check className="w-3.5 h-3.5" />Copied</>
      ) : (
        <><Copy className="w-3.5 h-3.5" />Copy optimized profile</>
      )}
    </button>
  );
}

// Export the Current/Optimized view names so the harness fixtures can
// drive the toggle without poking internal state.
export const PROFILE_PREVIEW_VIEW_CURRENT = "current";
export const PROFILE_PREVIEW_VIEW_OPTIMISED = "optimised";

// Export a no-throw concat helper used by ProfileTab's Q3 "Copy optimized
// profile" action. Pure function — easy to unit-test, no DOM access.
export function buildOptimizedProfileBlob(content, baseline) {
  if (!content) return "";
  const shaped = shapeGenerated(content, baseline);
  if (!shaped) return "";
  const lines = [];

  if (shaped.headline) {
    lines.push("HEADLINE");
    lines.push(shaped.headline);
    lines.push("");
  }

  if (shaped.about) {
    lines.push("ABOUT");
    lines.push(shaped.about);
    lines.push("");
  }

  const expEntries = shaped.experiences.filter((e) => e.kind === "experience" && e.description);
  if (expEntries.length > 0) {
    lines.push("EXPERIENCE");
    for (const e of expEntries) {
      const heading = e.company ? `${e.title} - ${e.company}` : e.title;
      lines.push(heading);
      lines.push(e.description);
      lines.push("");
    }
  }

  const volEntries = shaped.experiences.filter((e) => e.kind === "volunteering" && e.description);
  if (volEntries.length > 0) {
    lines.push("VOLUNTEERING");
    for (const v of volEntries) {
      const heading = v.company ? `${v.title} - ${v.company}` : v.title;
      lines.push(heading);
      lines.push(v.description);
      lines.push("");
    }
  }

  const milEntries = shaped.experiences.filter((e) => e.kind === "military" && e.description);
  if (milEntries.length > 0) {
    lines.push("MILITARY SERVICE");
    for (const m of milEntries) {
      const heading = m.company ? `${m.title} - ${m.company}` : m.title;
      lines.push(heading);
      lines.push(m.description);
      lines.push("");
    }
  }

  if (shaped.skills_priority?.length > 0) {
    lines.push("SKILLS PRIORITY (top 3 highlighted on LinkedIn)");
    shaped.skills_priority.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.skill}`);
    });
    lines.push("");
  }

  const honorEntries = shaped.honors.filter((h) => h.name);
  if (honorEntries.length > 0) {
    lines.push("HONORS & AWARDS");
    for (const h of honorEntries) {
      if (h.description) {
        lines.push(`${h.name}: ${h.description}`);
      } else {
        lines.push(h.name);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
