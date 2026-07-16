// Logo mark lab (round 3). Shows the refined marks at three sizes side by side
// so Eli can judge the size split: the simplified A (header) vs the full
// desk-person mark (large). Shown at ?logo=lab above the Browse grid; removed
// once the mark is finalized. Clay colorway (the confirmed one).
import React from "react";
import { MarkSimple, MarkFull } from "./CanvasLogo";
import CanvasLogo from "./CanvasLogo";

const ACCENT = "var(--rd-coral)";
const INK = "var(--rd-text)";
const SIZES = [30, 64, 128];

export default function CanvasLogoLab() {
  return (
    <div className="rd-lift rd-r-lg p-5 mb-4">
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1">
        Logo mark — refinement + size split
      </p>
      <h2 className="font-display font-bold rd-t-display-s text-rd-text mb-4">
        Small = simplified A · large = full desk-person
      </h2>

      <div className="flex flex-col gap-6">
        <div>
          <p className="rd-t-body-s font-display font-bold text-rd-text mb-2">
            Simplified A (header) — 30 / 64 / 128px
          </p>
          <div className="flex items-end gap-8">
            {SIZES.map((s) => (
              <MarkSimple key={s} accent={ACCENT} w={s * 0.88} h={s} />
            ))}
          </div>
        </div>

        <div>
          <p className="rd-t-body-s font-display font-bold text-rd-text mb-2">
            Full desk-person (large) — 30 / 64 / 128px
          </p>
          <div className="flex items-end gap-8">
            {SIZES.map((s) => (
              <MarkFull key={s} accent={ACCENT} ink={INK} w={s * 1.04} h={s} />
            ))}
          </div>
        </div>

        <div>
          <p className="rd-t-body-s font-display font-bold text-rd-text mb-2">
            Wordmark in context — header (28, simplified) vs large (56, full)
          </p>
          <div className="flex items-end gap-10">
            <CanvasLogo variant="clay" size={28} />
            <CanvasLogo variant="clay" size={56} />
          </div>
        </div>
      </div>
    </div>
  );
}
