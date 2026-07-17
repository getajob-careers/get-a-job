import React, { useEffect } from "react";
import { Search, Settings } from "lucide-react";
import CanvasLogo, { WORDMARK_TREATMENTS } from "./CanvasLogo";

// Wordmark typeface lab (?wordmark=lab) - the MARK is locked, only the setting of
// "Get" / "Job" around it is open. Each treatment is rendered in the REAL header
// composition (eyebrow + lockup + right-side utility icons at the true 28px
// header scale), because a wordmark judged on a blank page is judged wrong: the
// only question that matters is how it holds against the mark at header size,
// next to real neighbours. Rip this lab when Eli picks.

// C is the only treatment needing a webfont. Loading it HERE (lab-only, on mount)
// keeps the cost inside the lab: production pays nothing unless C is picked, at
// which point the <link> moves to index.html.
const ARCHIVO_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&display=swap";

function useLabFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${ARCHIVO_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ARCHIVO_HREF;
    link.dataset.wordmarkLab = "true";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
}

// The real utility bar from Home3TabPreview, reproduced at true scale so each
// treatment is judged where it will actually live.
function HeaderContext({ treatment }) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 md:px-6 py-5 bg-rd-bg-page rd-r-lg border border-rd-border-subtle">
      <div className="min-w-0">
        <p className="rd-t-micro uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          Design canvas · fixture data · safe to click
        </p>
        <div className="mt-1">
          <CanvasLogo size={28} treatment={treatment} />
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-rd-text-secondary">
          <Search className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-rd-text-secondary">
          <Settings className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="w-8 h-8 rounded-full bg-rd-bg-soft border border-rd-border-subtle" />
      </div>
    </div>
  );
}

export default function CanvasWordmarkLab() {
  useLabFont();
  const treatments = Object.values(WORDMARK_TREATMENTS);

  return (
    <div className="min-h-[100dvh] bg-rd-bg-soft overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-6 py-10">
        <p className="rd-t-micro uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          Wordmark lab · the mark is locked · pick the setting
        </p>
        <h1 className="rd-t-display-m font-display font-bold text-rd-text mt-2">
          Get A Job - wordmark treatments
        </h1>
        <p className="rd-t-body-m text-rd-text-secondary mt-2 max-w-[62ch]">
          Same locked mark, same 28px header scale, same neighbours. A and B
          reuse Rokkitt (already loaded - no cost). C is a real typeface change
          and adds a font family to every page load.
        </p>

        <div className="mt-8 space-y-8">
          {treatments.map((t) => (
            <section key={t.id}>
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h2 className="rd-t-display-s font-display font-bold text-rd-text">
                  {t.name}
                  <span className="rd-t-body-s font-normal text-rd-text-secondary ml-2">
                    {t.face}
                  </span>
                </h2>
                <span
                  className={`rd-t-micro font-mono uppercase tracking-[0.06em] px-2 py-1 rd-r-sm ${
                    t.fontLoad
                      ? "text-rd-coral-dark bg-rd-coral-tint"
                      : "text-rd-text-tertiary bg-rd-bg-soft"
                  }`}
                >
                  {t.fontLoad
                    ? `+1 font load (${t.fontLoad})`
                    : "no new font load"}
                </span>
              </div>
              <HeaderContext treatment={t.id} />
              <p className="rd-t-body-s text-rd-text-secondary mt-2 max-w-[70ch]">
                {t.rationale}
              </p>
            </section>
          ))}
        </div>

        {/* Side-by-side at header scale - the actual discrimination test. Three
            lockups stacked tight, so the differences read without scrolling. */}
        <section className="mt-12">
          <h2 className="rd-t-display-s font-display font-bold text-rd-text mb-3">
            Stacked, header scale
          </h2>
          <div className="bg-rd-bg-page rd-r-lg border border-rd-border-subtle p-6 flex flex-col gap-5">
            {treatments.map((t) => (
              <div key={t.id} className="flex items-center gap-4">
                <span className="rd-t-micro font-mono text-rd-text-tertiary w-6 flex-shrink-0">
                  {t.name.charAt(0)}
                </span>
                <CanvasLogo size={28} treatment={t.id} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
