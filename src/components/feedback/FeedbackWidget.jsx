import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { track, EVENTS } from "@/lib/analytics";

// Floating "Got feedback?" pill + modal. Mounted from
// `AuthenticatedApp` in src/App.jsx as a sibling of <Routes> so it
// renders on every authenticated route — independent of Layout's
// chrome-gate, which was hiding the widget during the profile-fetch
// window (and entirely on any session where the profile query never
// resolved). Skips /Onboarding via the pathname check below.
//
// Two-step flow inside the modal:
//   step 1 — pick a category chip (one of 4)
//   step 2 — write what happened, send.
//   The category persists in state when the user moves to step 2 so
//   the back arrow returns them to the chip row without losing input.
//
// Submit writes directly to public.feedback via the supabase anon
// client. RLS allows INSERT only when auth.uid() = user_id, so no edge
// function indirection is needed. Failure path: surface a toast,
// preserve the user's message so they can retry without retyping.
//
// Categories are deliberately broad (Bug / Confusing / Missing feature /
// Other) so the pilot doesn't pre-commit to surface-specific buckets
// before we see where users actually complain.

const CATEGORIES = [
  { id: "bug",             label: "Bug",              hint: "Something is broken or doesn't work as expected" },
  { id: "confusing",       label: "Confusing",        hint: "I'm not sure how to do something / unclear UI" },
  { id: "missing_feature", label: "Missing feature",  hint: "I wanted to do something the app doesn't support" },
  { id: "other",           label: "Other",            hint: "Anything else — praise, ideas, edge cases" },
];

const MAX_MESSAGE = 2000;

export default function FeedbackWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory(null);
    setMessage("");
    setSubmitting(false);
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) reset();
  };

  const canSubmit = !!category && message.trim().length > 0 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !user?.id) return;
    setSubmitting(true);
    const trimmed = message.trim().slice(0, MAX_MESSAGE);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      category,
      message: trimmed,
      route: location.pathname,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) {
      console.error("[feedback] submit failed:", error);
      toast.error("Couldn't send feedback. Please try again.");
      setSubmitting(false);
      return;
    }
    track(EVENTS.FEEDBACK_SUBMITTED, { category, route: location.pathname });
    toast.success("Thanks — feedback sent!");
    setOpen(false);
    reset();
  };

  // Don't render the launcher for unauthenticated users —
  // AuthenticatedApp already gates on isAuthenticated + user, but
  // belt-and-suspenders here for any future caller that mounts the
  // widget outside that gate.
  if (!user?.id) return null;

  // Skip on the Onboarding route — users mid-onboarding shouldn't see
  // the feedback pill. Matches /Onboarding exactly (case-insensitive)
  // and any nested path. The widget mount point in App.jsx is a sibling
  // of <Routes>, so this is the only gate filtering by current path.
  if (/^\/onboarding($|\/)/i.test(location.pathname)) return null;

  return (
    <>
      {/* Floating launcher pill — pinned to the bottom-right corner. The
          shadcn toast containers share this corner at z-[100], but they're now
          pointer-events-none when empty (see ui/toast.jsx; individual toasts
          keep pointer-events-auto), so the pill no longer needs to sit above
          them — it lives in the corner at z-50 and a live toast simply renders
          over it for its short lifetime. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 inline-flex items-center gap-2 font-display font-bold text-[12.5px] rounded-full px-4 py-2.5 bg-rd-coral text-white shadow-lg hover:bg-rd-coral-dark transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Got feedback?
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-rd-bg-card border border-rd-border rounded-[18px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-[20px] text-rd-text">
              {category ? "Describe what happened" : "What's working, what isn't?"}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-rd-text-secondary">
              {category
                ? "Be specific — even one sentence helps."
                : "Tell us what got in your way. Pick a category to start."}
            </DialogDescription>
          </DialogHeader>

          {!category ? (
            <div className="flex flex-col gap-2 py-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className="text-left rounded-[12px] border border-rd-border bg-rd-bg-card hover:border-rd-coral hover:bg-rd-coral-tint/40 transition-colors px-3.5 py-3"
                >
                  <p className="font-display font-bold text-[13.5px] text-rd-text leading-tight">
                    {c.label}
                  </p>
                  <p className="text-[11.5px] text-rd-text-secondary mt-0.5 leading-snug">
                    {c.hint}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-1">
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center font-display font-semibold text-[11.5px] rounded-full px-2.5 py-1 bg-rd-coral-tint text-rd-coral-dark"
                >
                  {CATEGORIES.find((c) => c.id === category)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className="text-[11.5px] font-display font-semibold text-rd-text-secondary hover:text-rd-text"
                >
                  Change category
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                rows={5}
                autoFocus
                placeholder="What happened? What did you expect instead?"
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] resize-y min-h-[110px]"
              />
              <div className="flex items-center justify-between text-[11px] text-rd-text-tertiary tabular-nums">
                <span>{location.pathname}</span>
                <span>{message.length}/{MAX_MESSAGE}</span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="inline-flex items-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-4 py-2 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2 transition-colors"
                >
                  {submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
                  ) : "Send feedback"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
