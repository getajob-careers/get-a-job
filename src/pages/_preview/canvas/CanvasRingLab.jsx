// Ring comparison lab (round 3, step 3 refined). Renders the enriched score-ring
// directions side by side on the same fixture scores so Eli can pick. Shown at
// ?ring=lab (above the Browse grid). Each row is a variant; columns are three
// representative bands (strong / good / stretch) at real card size.
import React from "react";
import { CANVAS_MATCHES } from "../fixtures/canvasHome";
import { deriveJobDisplay } from "@/lib/jobCardDisplay";
import CanvasScoreRing from "./CanvasScoreRing";

const VARIANTS = [
  { key: "a", name: "A · Sheen arc", note: "gradient stroke + tint backing" },
  { key: "b", name: "B · Score coin", note: "number on a band-tint disc" },
  { key: "c", name: "C · Beaded arc", note: "arc + tip bead (dial feel)" },
];

// One sample per band, highest-scoring first, so the row spans the palette.
function pickSamples() {
  const byBand = {};
  for (const m of CANVAS_MATCHES) {
    const b = m.scoreResult?.attainability_band;
    if (!b) continue;
    if (
      !byBand[b] ||
      (m.scoreResult.attainability_score ?? 0) >
        (byBand[b].scoreResult.attainability_score ?? 0)
    ) {
      byBand[b] = m;
    }
  }
  return ["strong", "good", "stretch"]
    .map((b) => byBand[b])
    .filter(Boolean)
    .map((m) => ({
      scoreResult: m.scoreResult,
      bandMeta: deriveJobDisplay(m.job, m.scoreResult, {
        showAttainabilityBand: true,
      }).bandMeta,
    }));
}

export default function CanvasRingLab() {
  const samples = pickSamples();
  return (
    <div className="rd-lift rd-r-lg p-5 mb-4">
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1">
        Score-ring exploration
      </p>
      <h2 className="font-display font-bold rd-t-display-s text-rd-text mb-4">
        Pick a direction (?ring=a|b|c)
      </h2>
      <div className="flex flex-col gap-4">
        {VARIANTS.map((vr) => (
          <div
            key={vr.key}
            className="flex items-center gap-4 rd-well rd-r-md px-4 py-3"
          >
            <div className="w-[150px] flex-shrink-0">
              <p className="font-display font-bold rd-t-body-m text-rd-text">
                {vr.name}
              </p>
              <p className="rd-t-micro text-rd-text-tertiary">{vr.note}</p>
            </div>
            <div className="flex items-center gap-6">
              {samples.map((s, i) => (
                <CanvasScoreRing
                  key={i}
                  scoreResult={s.scoreResult}
                  bandMeta={s.bandMeta}
                  variant={vr.key}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
