import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { initPostHog } from "@/lib/posthogClient";
import {
  getCookieConsent,
  setCookieConsent,
  isAnonymousAnalyticsEnabled,
  COOKIE_CONSENT_VALUES,
} from "@/lib/cookieConsent";

// Cookie-consent banner. Governs ANONYMOUS pre-login analytics only: it is the
// per-visitor switch for the early-init PostHog path (see src/main.jsx). Until
// a visitor clicks Accept, no analytics initialises and no analytics cookie is
// set. Decline genuinely turns it off (nothing inits). Logged-in tracking is a
// separate basis (account consent via the signup Terms/Privacy acceptance) and
// runs through PostHogProvider, so this banner is suppressed for signed-in
// users.
//
// OPEN QUESTION for Noms: confirm logged-in tracking rides on account consent
// rather than also needing this banner. The code assumes the likely posture
// (banner = anonymous only); changing it is a one-line edit to the suppress
// condition below.
//
// Fail-safe: every storage/init call is wrapped, so any error leaves analytics
// off and never blocks app boot.
export default function CookieConsentBanner() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  // Decide visibility once from stored state; accept/decline flips local state
  // so the banner closes without a reload.
  const [choice, setChoice] = useState(() => {
    try {
      return getCookieConsent();
    } catch {
      return null;
    }
  });

  // Do not show when: the feature is disabled, auth is still resolving, the
  // visitor is signed in, or a choice is already on record.
  if (!isAnonymousAnalyticsEnabled()) return null;
  if (isLoadingAuth || isAuthenticated) return null;
  if (choice !== null) return null;

  const accept = () => {
    try {
      setCookieConsent(COOKIE_CONSENT_VALUES.ACCEPTED);
      // Start tracking this session from the accept point. Pageviews only;
      // session replay stays off for anonymous visitors (it turns on at login).
      initPostHog({ enableSessionRecording: false });
    } catch {
      /* fail safe: no tracking */
    } finally {
      setChoice(COOKIE_CONSENT_VALUES.ACCEPTED);
    }
  };

  const decline = () => {
    try {
      setCookieConsent(COOKIE_CONSENT_VALUES.REJECTED);
    } catch {
      /* fail safe: nothing stored, nothing tracked */
    } finally {
      setChoice(COOKIE_CONSENT_VALUES.REJECTED);
    }
  };

  // Buttons share size, shape, and type weight so Decline is exactly as easy to
  // click as Accept (no dark pattern). Decline is placed first so it is never
  // buried. Accept uses the coral CTA fill; Decline a neutral bordered fill.
  const btnBase =
    "flex-1 sm:flex-none inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-display font-bold tracking-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-[640px] bg-rd-bg-card text-rd-text border border-rd-border shadow-rd rounded-[18px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-[13px] leading-[1.55] text-rd-text-secondary flex-1 m-0">
          We use analytics cookies to understand how people use Get A Job so we
          can improve it. These are the only non-essential cookies we use. You
          can accept or decline.{" "}
          <Link
            to="/privacy"
            className="text-rd-primary hover:text-rd-primary-dark font-semibold"
          >
            Privacy policy
          </Link>
        </p>
        <div className="flex gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={decline}
            className={`${btnBase} border border-rd-border-hover bg-rd-bg-card text-rd-text hover:bg-rd-bg-soft focus-visible:ring-rd-text/30`}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className={`${btnBase} bg-rd-primary text-white hover:bg-rd-primary-dark focus-visible:ring-rd-primary-dark`}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
