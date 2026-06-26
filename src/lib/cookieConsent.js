// Cookie-consent storage + gating for anonymous analytics.
//
// The consent record itself is an essential cookie: it records the visitor's
// choice, so storing this flag in localStorage is allowed even before any
// analytics consent. Everything here is wrapped so a storage failure (private
// mode, storage disabled) fails to the safe state, which is treated as "no
// consent" and therefore no anonymous analytics.

const CONSENT_KEY = "gaj.cookie_consent";
// When the choice was made (epoch ms). Consent is treated as expired once it is
// older than CONSENT_TTL_MS, at which point the banner re-prompts.
const CONSENT_AT_KEY = "gaj.cookie_consent_at";
const ACCEPTED = "accepted";
const REJECTED = "rejected";

// 12 months. After this the stored choice (accepted OR rejected) is ignored and
// the visitor is asked again.
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

// Master switch for the whole anonymous-analytics path (banner + early init).
// Kept env-gated so activation stays controlled until the consent flow is
// approved. When this is off, the banner never shows and early init never
// runs, so behaviour matches the prior authenticated-only setup.
export function isAnonymousAnalyticsEnabled() {
  try {
    return import.meta.env.VITE_POSTHOG_EARLY_INIT === "true";
  } catch {
    return false;
  }
}

// Returns "accepted" | "rejected" | null. null means the visitor has not
// chosen yet (or their choice has expired), so the banner should be shown and
// nothing tracked. A choice older than CONSENT_TTL_MS, or one with a missing or
// unparseable timestamp, is treated as expired and returns null so the visitor
// is re-prompted.
export function getCookieConsent() {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v !== ACCEPTED && v !== REJECTED) return null;
    const ts = Number(localStorage.getItem(CONSENT_AT_KEY));
    if (!Number.isFinite(ts) || ts <= 0) return null; // no/invalid timestamp = expired
    if (Date.now() - ts > CONSENT_TTL_MS) return null; // older than 12 months
    return v;
  } catch {
    return null;
  }
}

// Persist the visitor's choice plus the time it was made. Ignores anything that
// is not a valid value.
export function setCookieConsent(value) {
  if (value !== ACCEPTED && value !== REJECTED) return;
  try {
    localStorage.setItem(CONSENT_KEY, value);
    localStorage.setItem(CONSENT_AT_KEY, String(Date.now()));
  } catch {
    // Storage unavailable: the choice is not remembered and the banner will
    // re-ask next visit. Safe either way (no tracking without an accept).
  }
}

// True only when the visitor has explicitly accepted analytics cookies. Any
// error or absent choice returns false, so analytics never fires without a
// stored accept.
export function hasAnalyticsConsent() {
  return getCookieConsent() === ACCEPTED;
}

export const COOKIE_CONSENT_VALUES = { ACCEPTED, REJECTED };
