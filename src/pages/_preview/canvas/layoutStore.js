// Toolkit-rail layout store (round 3). Backs the pinned LAYOUT switcher so
// GRID / CAROUSEL flip live without a reload, synced with ?layout so the pick is
// shareable. A tiny external store (useSyncExternalStore-compatible), same shape
// as the ring switcher store — this + the switcher get ripped out once Eli picks
// the winner on desktop.
export const LAYOUT_KEYS = ["grid", "carousel"];

function initial() {
  if (typeof window === "undefined") return "grid";
  const p = new URLSearchParams(window.location.search).get("layout");
  return LAYOUT_KEYS.includes(p) ? p : "grid";
}

let value = initial();
const subs = new Set();

export function getLayout() {
  return value;
}

export function subscribeLayout(cb) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function setLayout(v) {
  if (!LAYOUT_KEYS.includes(v) || v === value) return;
  value = v;
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("layout", v);
    window.history.replaceState({}, "", url);
  }
  subs.forEach((cb) => cb());
}
