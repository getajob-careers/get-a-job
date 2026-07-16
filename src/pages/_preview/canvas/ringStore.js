// Live score-ring variant store (round 3, step 3 refined). Backs the pinned
// on-page ring switcher so A / B / C flips instantly across every card without a
// reload. A tiny external store (useSyncExternalStore-compatible) rather than a
// context, so rings anywhere — including portaled ones — react. Initialized from
// ?ring and kept in sync with it, so the URL param still works underneath and a
// pick stays shareable.

export const RING_VARIANT_KEYS = ["a", "b", "c"];

function initial() {
  if (typeof window === "undefined") return "a";
  const p = new URLSearchParams(window.location.search).get("ring");
  return RING_VARIANT_KEYS.includes(p) ? p : "a";
}

let value = initial();
const subs = new Set();

export function getRingVariant() {
  return value;
}

export function subscribeRing(cb) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function setRingVariant(v) {
  if (!RING_VARIANT_KEYS.includes(v) || v === value) return;
  value = v;
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("ring", v);
    window.history.replaceState({}, "", url);
  }
  subs.forEach((cb) => cb());
}
