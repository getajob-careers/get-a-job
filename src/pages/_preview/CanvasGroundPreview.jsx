// Slice 1 (Phase 2) - canvas ground: REGRESSION REFERENCE (not a bake-off).
//
// The bake-off is over. Ruling (Eli, 2026-07-22): the DIRECTIONAL WASH wins - a
// smooth warm cream deepening along one diagonal - and it beat a flat ground.
// Particulate texture (dots, then baked grain) is retired at the category level.
// Flat, warm mottle, and edge wash are out (the mottle's cool top-right corner was
// a contributing rejection factor). See docs/design/phase2-canvas-arrival-plan.md.
//
// This route now shows the WINNER AS IMPLEMENTED - the real production ground
// components (`DepthField` cream base + `GrainGround` directional wash, mounted in
// a `relative isolate` shell exactly like Layout/CanvasShell), so it is a true
// regression reference and cannot drift from production. It also proves the wash
// renders correctly inside the -z-10 isolate stacking context on a non-auth route.
// DEV-only, self-contained.

import React, { useEffect } from "react";
import { Download } from "lucide-react";
import DepthField from "@/components/redesign/DepthField";
import GrainGround from "@/components/redesign/GrainGround";

function DocLaneCard() {
  return (
    <div className="rd-lift rd-r-lg overflow-hidden flex-1 min-w-0">
      <div className="h-[52px] border-b border-rd-border flex items-center px-4 gap-3 bg-rd-bg-card">
        <div className="w-7 h-7 rounded-lg bg-rd-primary-tint grid place-items-center">
          <span className="text-[11px] font-display font-bold text-rd-primary-dark">
            CV
          </span>
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-display font-bold text-rd-text">
            Master CV
          </p>
          <p className="text-[11px] text-rd-text-tertiary">
            Your full, untailored CV
          </p>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rd-primary text-white text-[12.5px] font-medium">
          <Download className="w-3.5 h-3.5" /> Download PDF
        </span>
      </div>
      <div className="bg-rd-bg-card px-10 py-8">
        <div className="max-w-[520px]">
          <div className="text-[26px] font-display font-extrabold text-rd-text leading-tight">
            Eli Englard
          </div>
          <div className="text-[13px] text-rd-text-secondary mt-1">
            elienglard@example.com · Herzliya, Israel
          </div>
          <p className="text-[11px] font-display font-bold uppercase tracking-[0.11em] text-rd-primary mt-6 mb-2">
            Summary
          </p>
          <p className="text-[13px] text-rd-text leading-[1.6]">
            Business Administration student focused on digital innovation, with
            hands-on product and analytics experience. The document lane is a
            white card lifting off the directional-wash ground.
          </p>
        </div>
      </div>
    </div>
  );
}

function RailCard() {
  return (
    <aside className="rd-lift rd-r-lg overflow-hidden w-[300px] shrink-0 flex flex-col">
      <div className="px-4 py-3">
        <h2 className="font-display font-bold text-[14px] text-rd-text">
          Your matched roles
        </h2>
        <p className="text-[9.5px] uppercase tracking-[0.12em] font-semibold text-rd-text-eyebrow font-mono mt-3 mb-2">
          Our picks for you
        </p>
        {["Customer Support Specialist", "Data Analyst", "Ops Associate"].map(
          (r) => (
            <div
              key={r}
              className="rd-r-md border border-rd-border bg-rd-bg-card px-3 py-2.5 mb-2"
            >
              <p className="text-[13px] font-display font-semibold text-rd-text">
                {r}
              </p>
              <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
                DealHub · Holon
              </p>
            </div>
          ),
        )}
      </div>
    </aside>
  );
}

function CoachCard() {
  return (
    <aside className="rd-lift rd-r-lg overflow-hidden w-[220px] shrink-0 p-3">
      <p className="text-[13px] font-display font-bold text-rd-text mb-1">
        Coach
      </p>
      <p className="text-[12px] text-rd-text-secondary leading-relaxed">
        Knows your roadmap, your pipeline, and this page.
      </p>
    </aside>
  );
}

export default function CanvasGroundPreview() {
  // Force the flag-on canvas palette so the ground token (`--rd-ground-wash`,
  // defined under [data-next-design]) resolves, exactly as on the real route.
  useEffect(() => {
    const el = document.documentElement;
    const had = el.hasAttribute("data-next-design");
    el.setAttribute("data-next-design", "");
    return () => {
      if (!had) el.removeAttribute("data-next-design");
    };
  }, []);

  return (
    // Mirrors the production shell: `relative isolate` stacking context + cream
    // base, with the -z-10 ground layers behind a TRANSPARENT scroll container so
    // the ground shows through and stays fixed (no scroll shimmer).
    <div className="relative isolate h-screen overflow-hidden bg-rd-bg-page font-body text-rd-text flex flex-col">
      <DepthField />
      <GrainGround />

      <div className="relative flex-1 overflow-y-auto">
        <div className="border-b border-rd-border bg-rd-bg-card px-6 py-4">
          <h1 className="font-display font-extrabold text-[20px] text-rd-text mb-1">
            Canvas ground - directional wash (implemented)
          </h1>
          <p className="text-[12.5px] text-rd-text-secondary max-w-[820px]">
            Regression reference, not a bake-off. This is the winning ground as
            shipped: the real <code>DepthField</code> cream base +{" "}
            <code>GrainGround</code> directional wash, in a production-matching{" "}
            <code>relative isolate</code> shell. Warm cream deepening along one
            diagonal, smooth, no particulate, white cards lifting off it.
            Scroll: the ground is fixed, no shimmer, no banding.
          </p>
        </div>

        <div className="p-4 flex gap-3">
          <CoachCard />
          <DocLaneCard />
          <RailCard />
        </div>

        <div className="px-4 pb-16 flex gap-3">
          <div className="rd-lift rd-r-lg flex-1 p-6">
            <p className="text-[13px] font-display font-bold text-rd-text mb-1">
              Scroll check
            </p>
            <p className="text-[12.5px] text-rd-text-secondary leading-relaxed max-w-[560px]">
              Scroll this page. The wash belongs to the fixed isolate ground, so
              it stays put while these cards move over it - no drift, no
              shimmer. Watch the open cream areas: smooth directional deepening,
              no banding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
