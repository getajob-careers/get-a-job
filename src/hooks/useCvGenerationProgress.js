// The determinate-ring poller (CV RED OQ4 follow-up). Lights
// <CvGenerationProgress> for real by reading the honest {done,total,stage}
// row the CV edge functions write to `cv_generation_progress`.
//
// GROUND TRUTH (verified live 2026-07-24 via information_schema / pg_policy):
// the table's PK is composite (user_id, source) and RLS is owner-readable
// (`auth.uid() = user_id`), so this authed-client read only ever sees the
// caller's own rows. Two writers coexist as SEPARATE rows on that PK:
//   - generate-tailored-cv  -> source='generate-tailored-cv' (column DEFAULT;
//     the upsert omits `source` on purpose). Emission is gated behind the
//     cvFanout flag, so with the flag OFF there is simply no row and the ring
//     stays honest-indeterminate.
//   - refine-cv             -> source='refine-cv' (explicit, onConflict user_id,source).
// A bare user_id read would MIX the two lanes, so we always pin (user_id, source).
//
// STALENESS (why no fragile clock-skew cutoff): both writers guarantee that a
// FINISHED generation leaves only a TERMINAL row behind -- refine-cv's `finally`
// emits 'error' on any non-ok exit and 'done' on success; generate-tailored-cv's
// catch emits 'error' and its success path emits 'done'. A non-terminal stage
// therefore can only belong to a live run. We additionally require the row to be
// recent (guards the rare hard-isolate-kill that skips the finally) and to have
// completed at least one milestone (done > 0) -- at done=0 nothing has actually
// finished, so the honest state is still the indeterminate spin, not an empty arc.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

// A prior run only ever leaves a terminal row; a live run never reaches these
// until it is about to stop (the caller flips its generating flag off then).
const TERMINAL_STAGES = new Set(["done", "error"]);
// A live generation emits at every milestone; anything older than this is a
// leftover a crashed run failed to mark terminal.
const STALE_MS = 90_000;
const POLL_MS = 1200;

/**
 * Pure derivation of the {done,total,stage} contract from a raw progress row.
 * Returns null (honest indeterminate) unless the row is a trustworthy, in-flight
 * generation with at least one completed milestone. Exported for unit tests.
 */
export function deriveCvProgress(row, now = Date.now()) {
  if (!row) return null;
  // Terminal stages are never progress: 'error' hands off to the caller's error
  // UI, 'done' coincides with the generating flag flipping off (unmount).
  if (TERMINAL_STAGES.has(row.stage)) return null;
  // done=0 means nothing has finished yet -> keep the honest spin, not an empty arc.
  if (!(row.total > 0) || !(row.done > 0)) return null;
  // Guard the rare hard-isolate-kill that left a non-terminal row behind.
  const ageMs = now - new Date(row.updated_at).getTime();
  if (!(ageMs < STALE_MS)) return null;
  return { done: row.done, total: row.total, stage: row.stage };
}

/**
 * Poll cv_generation_progress for the current user + source while a generation
 * is running. Returns a { done, total, stage } contract to hand to
 * <CvGenerationProgress progress={...} /> -- or null (honest indeterminate)
 * whenever there is no trustworthy in-flight progress to show.
 *
 * @param {object}  args
 * @param {string=} args.userId  the signed-in user's id
 * @param {string}  args.source  'refine-cv' | 'generate-tailored-cv'
 * @param {boolean} args.enabled poll only while the caller is generating
 */
export function useCvGenerationProgress({ userId, source, enabled }) {
  const active = !!userId && !!source && !!enabled;

  const { data: row } = useQuery({
    queryKey: ["cv_generation_progress", userId, source],
    enabled: active,
    // Don't retain a finished row between generations -- a fresh run must not
    // read the previous run's cached terminal row on mount.
    gcTime: 0,
    staleTime: 0,
    refetchInterval: (query) => {
      const r = query.state.data;
      // Stop hammering once a run reaches a terminal stage; the caller's own
      // outcome/error UI takes over from here.
      if (r && TERMINAL_STAGES.has(r.stage)) return false;
      return POLL_MS;
    },
    queryFn: async () => {
      // `cv_generation_progress` is not in the generated database.types yet, so
      // the typed builder can't resolve the select-string; cast the client for
      // this one call (the row shape is validated in deriveCvProgress anyway).
      const { data, error } = await /** @type {any} */ (supabase)
        .from("cv_generation_progress")
        .select("done,total,stage,updated_at")
        .eq("user_id", userId)
        .eq("source", source)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  if (!active) return null;
  return deriveCvProgress(row);
}
