// CanvasField - re-export of the canonical DepthField (single source of truth,
// 2026-07-18). The depth-field ground now lives in components/redesign/DepthField
// so the canvas preview and the production Layout render the IDENTICAL ground and
// cannot drift. Kept as a named alias so the canvas imports read unchanged.
export { default } from "@/components/redesign/DepthField";
