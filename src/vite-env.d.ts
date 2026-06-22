// Ambient declaration for Vite's `?raw` imports (e.g. importing a .md file as a
// string). Vite resolves these at build time; this tells tsc the shape so
// typecheck passes. Kept minimal — only `?raw` — to avoid pulling in broader
// vite/client type changes.
declare module "*?raw" {
  const content: string;
  export default content;
}
