// Global open-state for the feedback dialog, so the entry point can move off the
// floating pill and onto the flag-on avatar menu without threading a callback
// through the shell. FeedbackWidget owns the dialog + submit; anything (the
// flag-off pill, the flag-on CanvasAvatarChip "Send feedback" item) opens it by
// calling openFeedback(). Same destination (public.feedback), only the trigger
// moves. Module-level so no provider wiring is needed across the 3 avatar mounts.
import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

export function openFeedback() {
  if (open) return;
  open = true;
  emit();
}

export function closeFeedback() {
  if (!open) return;
  open = false;
  emit();
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return open;
}

export function useFeedbackOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
