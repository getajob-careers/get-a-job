// Shared ring readability floors (round 3 rev 2, hard constraint a). Both the
// score ring and the tracker funnel tile draw a progress arc; at low fill (e.g.
// the "offer" funnel at 1/12) the arc was a near-invisible sliver, and on some
// fields the faint track disappeared entirely. These floors are enforced here,
// once, so no palette or field treatment can reintroduce the problem.
//
//   - TRACK_OPACITY: the unfilled track is always at least this visible, so the
//     ring's shape reads even at 0% fill.
//   - visibleFill(): any NON-zero value renders at least MIN_ARC of the circle,
//     so a real-but-small count is never mistaken for empty. True zero stays 0.

export const RING_TRACK_OPACITY = 0.22;
const MIN_ARC = 0.07;

export function visibleFill(frac, hasValue) {
  const f = Math.max(0, Math.min(1, frac || 0));
  if (!hasValue || f <= 0) return hasValue ? MIN_ARC : 0;
  return Math.max(f, MIN_ARC);
}
