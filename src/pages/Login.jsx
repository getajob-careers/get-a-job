import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { MIN_LEN, getPasswordChecks, allChecksPass } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/account/PasswordRequirements";
import { Turnstile } from "@marsidev/react-turnstile";
import RdButton from "@/components/redesign/RdButton";
import RdCard from "@/components/redesign/RdCard";
import CanvasLogo from "@/components/redesign/shell/CanvasLogo";

// Cloudflare Turnstile site key. Public — ships in the frontend bundle
// regardless. Bound to the matching secret in Supabase Auth → CAPTCHA.
const TURNSTILE_SITE_KEY = "0x4AAAAAADSlsvzNPw5Qejvq";

// Auth surface. Open signup (no invite code, no waitlist) plus Google OAuth.
// Inventory:
//   - Modes: signin / signup / forgot.
//   - URL-driven mode (?mode=signup|forgot), browser back/forward sync,
//     replace-history mode switches, ?deleted=1 toast, ?oauth_error toast.
//   - signup user_metadata carries full_name only, read at the Onboarding
//     profile insert. No invite_code / cohort_label.
//   - Google OAuth via signInWithOAuth to /auth/callback, on its own
//     handler (not the captcha-gated email path).
//   - Cloudflare Turnstile required on the email auth endpoints; token
//     reused across mode switches, reset on auth failure.
//   - PasswordRequirements rendered on signup only.
//   - Forgot password from the signin label row.
//   - Banner regions (error + ok) kept available.

// Google "G" mark for the OAuth button.
function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

// mode: "signin" | "signup" | "forgot"
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  // Open signup: no invite code, no waitlist gate. Google OAuth + email/password.
  // Required consent for signup. Submit stays disabled until checked.
  // Layout reserves the row in all modes so the form doesn't reflow on
  // mode switch — checkbox is just visually hidden on signin/forgot.
  const [consent, setConsent] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  // URL-driven mode. Lets Landing CTAs deeplink straight to signup via
  // ?mode=signup, and lets users bookmark / share / refresh the right form.
  const initialMode = (() => {
    const m = searchParams.get("mode");
    return m === "signup" || m === "forgot" ? m : "signin";
  })();
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  // Turnstile state. captchaToken is fed into supabase.auth.signUp's options.
  // It expires (~5min default), is cleared on expiry or error, and is
  // required to enable the signup submit button.
  const [captchaToken, setCaptchaToken] = useState(null);
  const turnstileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Show a confirmation banner after self-service deletion (Settings redirects
  // here with ?deleted=1).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("deleted") === "1") {
      setMessage("Your account has been deleted.");
    }
    // The /auth/callback route redirects here with ?oauth_error on a
    // failed Google exchange so the user sees why, not a blank form.
    const oauthErr = params.get("oauth_error");
    if (oauthErr) setError(oauthErr);
  }, [location.search]);

  // Keep local mode in sync when the URL changes (e.g. browser back/forward).
  useEffect(() => {
    const m = searchParams.get("mode");
    const next = m === "signup" || m === "forgot" ? m : "signin";
    setMode((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  // Supabase Auth → Bot Protection is enabled, which enforces CAPTCHA on
  // signup, signin, AND password recovery. captchaToken is required for
  // every mode. Signup additionally requires invite-code + consent +
  // password checks.
  const canSubmit =
    (mode !== "signup" ||
      (allChecksPass(passwordChecks) && consent)) &&
    !!captchaToken;

  // QA-R1 P1: when the form is otherwise ready and the ONLY thing missing is the
  // Turnstile token (still verifying), the submit is disabled with no explanation.
  // Surface it in the button label so the greyed button is not a mystery. Gated on
  // !error so a captcha failure (which sets error) shows the error, not "verifying".
  const waitingOnCaptcha =
    !loading &&
    !captchaToken &&
    !error &&
    (mode !== "signup" || (allChecksPass(passwordChecks) && consent));

  const switchMode = (next) => {
    setError(null);
    setMessage(null);
    // Don't clear captchaToken — Turnstile widget stays mounted across
    // mode switches; the user's solved token is still valid for whichever
    // endpoint we hit next.
    const params = new URLSearchParams(searchParams);
    if (next === "signin") params.delete("mode");
    else params.set("mode", next);
    setSearchParams(params, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        // Open signup: no invite code, no redeem step. full_name is the
        // only metadata; it is read at the first profile insert in
        // Onboarding. invite_code / cohort_label are intentionally not set.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            captchaToken,
            // /Onboarding must be in Supabase Auth → URL Configuration →
            // Redirect URLs, else Supabase falls back to Site URL.
            emailRedirectTo: `${window.location.origin}/Onboarding`,
          },
        });
        if (error) throw error;
        // signup_completed PostHog event drains via PostHogProvider on
        // first identify after email confirm.
        try { localStorage.setItem("gaj.signup_pending", "1"); } catch { /* private mode */ }
        setMessage("Check your email for a confirmation link!");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
          captchaToken,
        });
        if (error) throw error;
        setMessage("Password reset email sent - check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (err) {
      // Token is single-use server-side. Reset the widget on any auth
      // failure so the user can re-challenge without a manual refresh.
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth. Its OWN handler — NOT the email handleSubmit/canSubmit
  // path (those require captchaToken + consent; OAuth needs neither and is
  // never gated by the invite state). On success the browser redirects to
  // Google and nothing else here runs; on a start error we surface it.
  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // Redirect in flight; leave loading true so the button stays disabled.
    } catch (err) {
      setError(err.message || "Could not start Google sign-in.");
      setLoading(false);
    }
  };

  const eyebrowText =
    mode === "signup" ? "Get started"
    : mode === "forgot" ? "Password reset"
    : "Welcome back";

  const titleText =
    mode === "signup" ? "Create your account"
    : mode === "forgot" ? "Reset your password"
    : "Sign in";

  const submitLabel =
    loading ? "Loading..."
    : waitingOnCaptcha ? "Verifying you're human..."
    : mode === "signup" ? "Create account"
    : mode === "forgot" ? "Send reset email"
    : "Sign in";

  // Mode switch link copy (bottom-of-form). Forgot uses its own back
  // affordance below the form.
  const switchLabel =
    mode === "signin" ? "New to Get A Job? "
    : mode === "signup" ? "Already have an account? "
    : null;
  const switchAction =
    mode === "signin" ? "Create an account"
    : mode === "signup" ? "Sign in"
    : null;
  const switchTarget = mode === "signin" ? "signup" : "signin";

  return (
    <div className="min-h-screen bg-rd-bg-page text-rd-text font-body flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      <RdCard className="w-full max-w-[920px] overflow-hidden flex flex-col md:flex-row">
        {/* ── Brand panel (left on desktop, top on mobile) ──────────────── */}
        <aside
          className="bg-rd-bg-sidebar px-7 py-7 md:w-[300px] md:flex-shrink-0 md:px-7 md:py-9 flex flex-col gap-6 md:justify-between"
          aria-hidden="false"
        >
          {/* Top: brand (official locked logotype) */}
          <div className="flex flex-col gap-4">
            <CanvasLogo size={26} />
          </div>

          {/* Middle: hero + subline (fixed copy regardless of mode) */}
          <div>
            <h2 className="font-display font-extrabold text-[28px] leading-[1.08] tracking-tight text-rd-text">
              Craft your<br />career.
            </h2>
            <p className="text-[12.5px] leading-[1.55] text-rd-text-tertiary mt-3">
              Get A Job reads your real experience, finds the roles you can
              actually land, tailors each CV, and puts AI coaches in your
              corner.
            </p>
          </div>

          {/* Bottom: three feature dots — hidden on mobile to keep the form
              reachable above the fold, mirroring the live page's behavior. */}
          <ul className="hidden md:flex flex-col gap-2.5 m-0 p-0 list-none">
            <li className="flex items-center gap-2.5 font-display font-semibold text-[13.5px] text-rd-text">
              <span className="w-2 h-2 rounded-full bg-rd-primary flex-shrink-0" />
              Roles that fit you
            </li>
            <li className="flex items-center gap-2.5 font-display font-semibold text-[13.5px] text-rd-text">
              <span className="w-2 h-2 rounded-full bg-rd-teal flex-shrink-0" />
              CVs tailored per job
            </li>
            <li className="flex items-center gap-2.5 font-display font-semibold text-[13.5px] text-rd-text">
              <span className="w-2 h-2 rounded-full bg-rd-golden flex-shrink-0" />
              AI agents in your corner
            </li>
          </ul>
        </aside>

        {/* ── Form panel (right on desktop, below brand on mobile) ──────── */}
        <main className="flex-1 px-7 py-8 md:px-8 md:py-9 flex flex-col">
          <div className="font-display text-[11.5px] font-semibold uppercase tracking-[0.09em] text-rd-text-eyebrow">
            {eyebrowText}
          </div>
          <h1 className="font-display font-bold text-[23px] tracking-tight text-rd-text mt-0.5">
            {titleText}
          </h1>

          {/* Banner region — error + ok. Reserves space so a future
              "Resend confirmation" button lands here without re-flow. */}
          {(error || message) && (
            <div className="mt-5 space-y-2.5">
              {error && (
                <div
                  role="alert"
                  className="text-[13px] leading-snug rounded-xl px-3.5 py-2.5 bg-rd-primary-tint text-rd-primary-dark border border-rd-primary/40"
                >
                  {error}
                </div>
              )}
              {message && (
                <div
                  role="status"
                  className="text-[13px] leading-snug rounded-xl px-3.5 py-2.5 bg-rd-teal-tint text-rd-teal-dark border border-rd-teal/40"
                >
                  {message}
                </div>
              )}
            </div>
          )}

          {/* ── Inline waitlist form (within signup, after invalid code
               OR after a valid-but-exhausted cohort code) ── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-5">
            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 min-h-[44px] rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] font-semibold hover:border-rd-primary transition-[border-color] duration-150 disabled:opacity-60"
                >
                  <GoogleGlyph />
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 text-[11.5px] text-rd-text-tertiary">
                  <span className="h-px flex-1 bg-rd-border-subtle" />
                  or continue with email
                  <span className="h-px flex-1 bg-rd-border-subtle" />
                </div>
              </>
            )}
              {mode === "signup" && (
                <Field id="login-fullname" label="Full name">
                  <Input
                    id="login-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </Field>
              )}

              <Field id="login-email" label="Email">
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                />
              </Field>

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="text-[12px] font-semibold text-rd-text"
                    >
                      Password
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-[11.5px] font-semibold text-rd-primary hover:text-rd-primary-dark"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Meets all 5 requirements below" : "••••••••"}
                    required
                    minLength={mode === "signup" ? MIN_LEN : 6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  {mode === "signup" && <PasswordRequirements checks={passwordChecks} />}
                </div>
              )}

              {/* Consent — signup only. Keep the row in the DOM via
                  conditional only on the visible block; layout doesn't
                  reflow because both signin and forgot are taller in
                  other ways. */}
              {mode === "signup" && (
                <label className="flex items-start gap-2.5 text-[11.5px] leading-[1.45] text-rd-text-tertiary cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-[1px] w-[15px] h-[15px] flex-shrink-0 accent-rd-primary cursor-pointer"
                    required
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-rd-primary hover:text-rd-primary-dark font-semibold"
                    >
                      Terms
                    </Link>{" "}
                    &amp;{" "}
                    <Link
                      to="/privacy"
                      className="text-rd-primary hover:text-rd-primary-dark font-semibold"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              )}

              {/* Turnstile — required on all 3 auth endpoints. */}
              <div className="flex justify-center mt-1">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => {
                    setCaptchaToken(null);
                    setError("Captcha challenge failed - please try again.");
                  }}
                  options={{ theme: "auto" }}
                />
              </div>

              <RdButton
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full mt-1.5"
              >
                {submitLabel}
                <span aria-hidden="true">→</span>
              </RdButton>
          </form>

          {/* Mode switch link (bottom). Forgot keeps its own "Back" link. */}
          {mode !== "forgot" ? (
            <div className="border-t border-rd-border-subtle mt-5 pt-4 text-center text-[12.5px] text-rd-text-tertiary">
              {switchLabel}
              <button
                type="button"
                onClick={() => switchMode(switchTarget)}
                className="text-rd-primary hover:text-rd-primary-dark font-semibold"
              >
                {switchAction}
              </button>
            </div>
          ) : (
            <div className="border-t border-rd-border-subtle mt-5 pt-4 text-center text-[12.5px] text-rd-text-tertiary">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-rd-primary hover:text-rd-primary-dark font-semibold"
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </main>
      </RdCard>
    </div>
  );
}

// ── Local primitives — tight to this page, not shared yet. ───────────
// (Inputs / labeled field are not in the foundation primitive set per
// PR scope; they live here until a second consumer needs them.)

function Field({ id, label, hint = null, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={id} className="text-[12px] font-semibold text-rd-text">
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-rd-text-secondary">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full px-3.5 py-2.5 rounded-[10px]",
        "border border-rd-border bg-rd-bg-card text-rd-text",
        "text-[13.5px] font-body",
        "placeholder:text-rd-text-secondary/70",
        "outline-none transition-[border-color,box-shadow] duration-150",
        "focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]",
        props.className || "",
      ].join(" ")}
    />
  );
}
