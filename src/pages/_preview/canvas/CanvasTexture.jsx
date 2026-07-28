// CanvasTexture - re-export of the canonical GroundWash (single source of truth,
// 2026-07-18). The grain now lives in components/redesign/GroundWash so the canvas
// preview and the production Layout render the IDENTICAL grain and cannot drift.
// (The grain params were already identical; this makes them ONE definition.) Kept
// as a named alias so the canvas imports read unchanged.
export { default } from "@/components/redesign/GroundWash";
