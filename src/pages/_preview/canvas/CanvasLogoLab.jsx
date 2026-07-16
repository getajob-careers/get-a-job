// Logo mark lab (round 3). Geometry pass: the full desk-person compared
// no-chair (sharpened) vs a chair variant that grounds the sitter, at 64/128, so
// Eli can pick. The simplified header A stays for reference. Shown at ?logo=lab
// above the Browse grid; removed once the mark is finalized. Clay colorway.
import React from "react";
import { MarkSimple, MarkFull, MarkFullChair } from "./CanvasLogo";

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
        Logo mark — chair pass
      </p>
      <h2 className="font-display font-bold rd-t-display-s text-rd-text mb-4">
        Full mark: chair vs sharpened no-chair (64 / 128)
      </h2>

      <div className="flex flex-col gap-6">
        <Row label="A · No chair (sharpened) — 64 / 128px">
          <MarkFull accent={ACCENT} ink={INK} w={64 * 1.06} h={64} />
          <MarkFull accent={ACCENT} ink={INK} w={128 * 1.06} h={128} />
        </Row>
        <Row label="B · Chair (grounds the sitter) — 64 / 128px">
          <MarkFullChair accent={ACCENT} ink={INK} w={64 * 1.06} h={64} />
          <MarkFullChair accent={ACCENT} ink={INK} w={128 * 1.06} h={128} />
        </Row>
        <Row label="Simplified A (header, for reference) — 30 / 64px">
          <MarkSimple accent={ACCENT} w={30 * 0.88} h={30} />
          <MarkSimple accent={ACCENT} w={64 * 0.88} h={64} />
        </Row>
      </div>
    </div>
  );
}
