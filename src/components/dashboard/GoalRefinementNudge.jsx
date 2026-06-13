import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Target, ArrowRight, X } from "lucide-react";
import { createPageUrl } from "@/utils";

// Barabi P1 — light, dismissible nudge that surfaces ONCE per session
// when the user's 5-year goal is empty or single-word.
//
// Why this exists: the 5-year goal drives qualification_level tiering and
// goal_alignment_score on every job/role suggestion. A vague goal
// ("Engineer", "Marketing", or empty) degrades every downstream
// recommendation. Surfacing the prompt on Home — the most-visited
// authenticated surface — gives the highest chance the user refines it.
//
// Display rules:
//   - profile.five_year_role empty or split-by-whitespace yields ≤ 1 token
//   - sessionStorage flag `goalNudge:${user.id}:dismissed` NOT set
//   - rendered visually distinct from the page's coral primary CTA
//     (golden tint, matches the existing Today/Pipeline attention palette)
//
// Dismiss semantics: sessionStorage, not localStorage. Clears on tab
// close — exactly "at most once per session, never nagging." A user who
// reopens the app tomorrow sees it again unless they've meanwhile
// updated their goal, at which point the empty/single-word check filters
// them out naturally.

// Pure detection — exported for test. "Vague" = empty after trim OR a
// single token after whitespace-split. "Senior Product Manager" → false
// (sharp). "Engineer" → true (vague). "  " → true (empty). The same
// predicate informs both the nudge visibility AND any future surface
// that wants to flag goal quality.
export function isVagueGoal(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  return t.split(/\s+/).length <= 1;
}

export default function GoalRefinementNudge({ profile, userId }) {
  const goalText = String(profile?.five_year_role || "").trim();
  const isVague = isVagueGoal(goalText);

  // Dismissed-this-session check runs on every render (cheap), so a
  // dismiss inside the SAME tab hides the nudge instantly without
  // remount. New tab / new browser session shows it again.
  const sessionKey = userId ? `goalNudge:${userId}:dismissed` : null;
  const initiallyDismissed = (() => {
    if (!sessionKey || typeof window === "undefined") return false;
    try { return window.sessionStorage.getItem(sessionKey) === "1"; }
    catch { return false; }
  })();
  const [dismissed, setDismissed] = useState(initiallyDismissed);

  if (!isVague || dismissed || !userId) return null;

  const dismiss = () => {
    setDismissed(true);
    if (sessionKey) {
      try { window.sessionStorage.setItem(sessionKey, "1"); } catch { /* ignore */ }
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-rd-golden/40 bg-rd-golden-tint px-3.5 py-3">
      <div className="w-7 h-7 rounded-full bg-rd-golden text-white flex items-center justify-center flex-shrink-0">
        <Target className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-[13px] text-rd-text leading-tight">
          Sharpen your 5-year goal
        </p>
        <p className="text-[11.5px] text-rd-text-secondary leading-snug mt-0.5">
          {goalText
            ? <>Your goal of <span className="font-medium text-rd-text">&ldquo;{goalText}&rdquo;</span> is broad. A more specific role makes every job-fit score sharper.</>
            : <>You haven&apos;t set one yet. The 5-year goal anchors every job-fit score and roadmap recommendation.</>}
        </p>
      </div>
      <Link
        to={createPageUrl("Profile")}
        className="inline-flex items-center gap-1 text-[11.5px] font-display font-semibold text-rd-golden-dark hover:text-rd-text transition-colors flex-shrink-0 mt-0.5"
        onClick={() => {
          // Track the click but DON'T mark dismissed — the user is
          // following through, so the next session it'll naturally hide
          // because they will (we hope) have refined the goal.
        }}
      >
        Update goal <ArrowRight className="w-3 h-3" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss goal nudge for this session"
        className="inline-flex items-center justify-center w-5 h-5 rounded-md text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-card transition-colors flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
