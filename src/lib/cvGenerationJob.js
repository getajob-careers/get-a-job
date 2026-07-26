// Cross-remount state for the single in-flight "Generate CV" (tailored-CV) run.
//
// WHY a module-level store and not local component state: the compact JobGridCard
// and the JobDetailModal render the SAME job at different times (opening the modal
// unmounts / replaces the card), so a run started on the card is invisible to the
// modal if the flag lives in either component. This store lives above both, so the
// running ring and the "CV ready" landing show for the same job in whichever view
// is on screen - and survive the card->modal remount.
//
// Pairs with useCvGenerationProgress, which polls the honest {done,total,stage} row
// keyed on (user_id, source='generate-tailored-cv'). That poller knows a run is live
// but NOT which job; this store supplies the job identity so only the matching card
// / modal lights up. One run at a time (the button disables during its own run), so
// a single-entry store is sufficient; a newer run overwrites an older ready state.
import { useSyncExternalStore } from "react";

// status: 'running' | 'ready' | 'error' | null
let state = { jobKey: null, applicationId: null, status: null };
const listeners = new Set();

function set(next) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

// Stable key for a job across the card / modal, matching useJobCardActions'
// (ats_source, external_id) identity with a title fallback for source-less rows.
export function jobKeyOf(job) {
  if (!job) return "";
  if (job.ats_source && job.external_id)
    return `${job.ats_source}::${job.external_id}`;
  return `title::${(job.title || "").trim().toLowerCase()}`;
}

export function startCvGeneration(jobKey) {
  set({ jobKey, applicationId: null, status: "running" });
}

// Guard on jobKey so a slow finished run can't clobber a newer run the user has
// since started on a different job.
// Returns true when it applied (this run is still the active one), false when a
// newer run on another job has superseded it - so the caller can suppress a
// "CV ready" toast that would point at a card that has already reverted to idle.
export function markCvGenerationReady(jobKey, applicationId) {
  if (state.jobKey !== jobKey) return false;
  set({ jobKey, applicationId, status: "ready" });
  return true;
}

export function markCvGenerationError(jobKey) {
  if (state.jobKey !== jobKey) return;
  set({ jobKey, applicationId: null, status: "error" });
}

// Clear unconditionally (jobKey omitted) or only when the active run matches.
export function clearCvGeneration(jobKey) {
  if (jobKey && state.jobKey !== jobKey) return;
  set({ jobKey: null, applicationId: null, status: null });
}

// Subscribe to the store. Components derive their own per-job view from the
// returned snapshot (compare jobKey), so a job that isn't the active one reads
// as idle.
export function useCvGenerationJob() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
