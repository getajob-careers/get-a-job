// Logo lab - brand-material pass. B (chair) is THE official mark; this shows it
// in the toolkit-object material (top-lit glaze + weight shadow) at 64/128, the
// flat→material delta, and the mark in header context (the size split still hands
// header scale to the simplified A). Rip once the material is locked.
import React from "react";
import CanvasLogo, { MarkFullChair } from "./CanvasLogo";

const ACCENT = "var(--rd-coral)";
const INK = "var(--rd-text)";

function Row({ label, children }) {
  return (
    <div>
      <p className="rd-t-body-s font-display font-bold text-rd-text mb-2">
        {label}
      </p>
      <div className="flex items-end gap-10">{children}</div>
    </div>
  );
}

export default function CanvasLogoLab() {
  return (
    <div className="rd-lift rd-r-lg p-5 mb-4">
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1">
        Logo mark - official B, object material
      </p>
      <h2 className="font-display font-bold rd-t-display-s text-rd-text mb-4">
        Soft-3D brand mark (glaze + weight shadow)
      </h2>

      <div className="flex flex-col gap-6">
        <Row label="Official mark - 64 / 128px">
          <MarkFullChair
            accent={ACCENT}
            ink={INK}
            material
            w={64 * 1.06}
            h={64}
          />
          <MarkFullChair
            accent={ACCENT}
            ink={INK}
            material
            w={128 * 1.06}
            h={128}
          />
        </Row>
        <Row label="Flat → material (96px) - the treatment delta">
          <MarkFullChair accent={ACCENT} ink={INK} w={96 * 1.06} h={96} />
          <MarkFullChair
            accent={ACCENT}
            ink={INK}
            material
            w={96 * 1.06}
            h={96}
          />
        </Row>
        <Row label="Header context (size split → simplified A) - 22 / 28 / 40px">
          <CanvasLogo size={22} />
          <CanvasLogo size={28} />
          <CanvasLogo size={40} />
        </Row>
      </div>
    </div>
  );
}
