import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { MIN_LEN, getPasswordChecks, allChecksPass } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/account/PasswordRequirements";
import { Turnstile } from "@marsidev/react-turnstile";
import RdButton from "@/components/redesign/RdButton";
import RdCard from "@/components/redesign/RdCard";

// Cloudflare Turnstile site key. Public — ships in the frontend bundle
// regardless. Bound to the matching secret in Supabase Auth → CAPTCHA.
const TURNSTILE_SITE_KEY = "0x4AAAAAADSlsvzNPw5Qejvq";

// Visual redesign — see tasks/redesign.md. All behavior is preserved
// 1:1 from the prior Direction-3 Login; only the visual layer changes.
// Inventory items mapped to the new layout:
//   - Modes: signin / signup / forgot / inline-waitlist (within signup)
//   - URL-driven mode (?mode=signup|forgot), browser back/forward sync,
//     replace-history mode switches, ?deleted=1 toast
//   - Pilot gate via redeem_invite_code RPC → 100-cap waitlist flip
//   - signup user_metadata: full_name, invite_code, cohort_label →
//     PostHog signup_pending flag → Onboarding stamping site
//   - Cloudflare Turnstile required on all 3 auth endpoints; token
//     reused across mode switches, reset on auth failure
//   - PasswordRequirements rendered on signup only
//   - Forgot password from signin label row
//   - Inline waitlist insert + send-waitlist-email fire-and-forget
//   - 23505 / "unique" → friendly "already on the waitlist"
//   - Banner regions (error + ok) kept available; the future "Resend
//     confirmation" button slot lands in the error region without re-flow

// Brand mark — 2x2 dot grid in brand colors + Rokkitt wordmark.
// Per the sign-in mockup: coral / golden / teal / ink.
function BrandMark() {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div className="grid grid-cols-2 gap-[3px]">
        <span className="w-[7px] h-[7px] rounded-full bg-rd-coral" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-golden" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-teal" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-text" />
      </div>
      <span className="font-display font-bold text-[17px] tracking-tight text-rd-text">
        Get A Job
      </span>
    </div>
  );
}

// mode: "signin" | "signup" | "forgot"
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  // Pilot gate (WhatsApp 100-invite cohort — audience-neutral copy).
  // Invite code is visible on signup only. On submit, the RPC atomically
  // validates + increments current_uses. Invalid → flip to waitlistMode
  // (inline, not a separate route). Valid → proceed with auth.signUp +
  // pass invite_code + cohort_label through user_metadata for stamping
  // onto profiles at first-profile-insert in Onboarding.
  const [inviteCode, setInviteCode] = useState("");
  // Preview hatch: `?preview=waitlist` initializes the inline waitlist
  // view directly (used by the redesign preview pipeline so the design
  // artifact can capture this branch without hitting the live RPC).
  // Harmless in production — just shows the waitlist form on landing.
  const previewWaitlist = (() => {
    try { return new URLSearchParams(window.location.search).get("preview") === "waitlist"; }
    catch { return false; }
  })();
  const [waitlistMode, setWaitlistMode] = useState(previewWaitlist);
  // Why we flipped to waitlist mode. "exhausted" = the user typed a
  // valid cohort code that's at its cap → "pilot is full" copy. null /
  // "invalid_or_exhausted" = the user typed something we couldn't
  // recognize → existing "invalid code, join waitlist" copy. Used to
  // swap eyebrow / title / subtitle on the waitlist form so the
  // experience matches the cause without changing the submit path.
  const [waitlistReason, setWaitlistReason] = useState(null);
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
      (allChecksPass(passwordChecks) && !!inviteCode.trim() && consent)) &&
    !!captchaToken;

  const switchMode = (next) => {
    setError(null);
    setMessage(null);
    // Leaving signup → clear waitlistMode so a future visit to signup
    // starts fresh.
    if (next !== "signup") {
      setWaitlistMode(false);
      setWaitlistReason(null);
    }
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
        // Pilot gate: redeem the invite code BEFORE auth.signUp.
        // RPC returns Json; treat as { valid: boolean; cohort_label: string }.
        const { data: redeemRaw, error: redeemError } = await supabase
          .rpc("redeem_invite_code", { p_code: inviteCode.trim() });
        if (redeemError) throw new Error(redeemError.message || "Could not validate invite code");
        const redeemResult = /** @type {{ valid?: boolean; reason?: string; cohort_label?: string }} */ (redeemRaw || {});
        if (!redeemResult.valid) {
          // Flip to inline waitlist mode. captchaToken still valid.
          // RPC tells us which branch via `reason`:
          //   - "exhausted": valid code, cohort at cap → "pilot is full" copy
          //   - "invalid_or_exhausted" (or missing): unknown / inactive
          //     code → original "invalid invite code" copy
          // Either way we flip to the same waitlist form, just with
          // copy that matches what actually happened.
          setWaitlistMode(true);
          if (redeemResult.reason === "exhausted") {
            setWaitlistReason("exhausted");
            setError(null);
          } else {
            setWaitlistReason(null);
            setError("Invalid invite code. If you don't have one, join the waitlist below — we'll email you when a spot opens.");
          }
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // user_metadata: invite_code + cohort_label travel through
            // auth.signUp → email confirmation → /Onboarding session →
            // first profile insert, where they're stamped onto the
            // profiles row.
            data: {
              full_name: fullName,
              invite_code: inviteCode.trim(),
              cohort_label: redeemResult.cohort_label,
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
        setMessage("Password reset email sent — check your inbox.");
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

  // Waitlist submit handler — fired from the inline waitlist form that
  // replaces the signup form after a failed invite-code redeem.
  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase
        .from("waitlist_signups")
        .insert({ email: normalizedEmail });
      if (error) {
        // PostgREST surfaces unique-violation as status 409; the JS client
        // returns code 23505. Both paths land here — same friendly msg.
        if (error.code === "23505" || error.message?.toLowerCase().includes("unique")) {
          setMessage("You're already on the waitlist — we'll email you when a spot opens.");
          setLoading(false);
          return;
        }
        throw error;
      }
      // Fire-and-forget waitlist confirmation email. Server-side
      // idempotency keyed on email (24h) means dupe clicks don't double-send.
      supabase.functions.invoke("send-waitlist-email", {
        body: { email: normalizedEmail },
      }).catch((emailErr) => {
        console.warn("[waitlist] confirmation email failed (non-fatal):", emailErr);
      });
      setMessage("Thanks — we'll email you when a spot opens.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const eyebrowText =
    mode === "signup"
      ? (waitlistMode
        ? (waitlistReason === "exhausted" ? "Pilot is full" : "Waitlist")
        : "Get started")
    : mode === "forgot" ? "Password reset"
    : "Welcome back";

  const titleText =
    mode === "signup"
      ? (waitlistMode
        ? (waitlistReason === "exhausted"
          ? "This pilot is full right now"
          : "Join the waitlist")
        : "Create your account")
    : mode === "forgot" ? "Reset your password"
    : "Sign in";

  const submitLabel =
    loading ? "Loading..."
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
          {/* Top: scarcity eyebrow (signup only) + brand */}
          <div className="flex flex-col gap-4">
            {mode === "signup" && !waitlistMode && (
              <span className="inline-flex self-start items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-rd-coral-dark bg-rd-coral-tint rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rd-coral" />
                Pilot phase
              </span>
            )}
            <BrandMark />
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
              <span className="w-2 h-2 rounded-full bg-rd-coral flex-shrink-0" />
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
                  className="text-[13px] leading-snug rounded-xl px-3.5 py-2.5 bg-rd-coral-tint text-rd-coral-dark border border-rd-coral/40"
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
          {mode === "signup" && waitlistMode ? (
            <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3.5 mt-5">
              {waitlistReason === "exhausted" && (
                <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] -mt-1">
                  Can we add you to the waitlist? We&apos;ll email you the moment a spot opens.
                </p>
              )}
              <Field id="waitlist-email" label="Email">
                <Input
                  id="waitlist-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                />
              </Field>
              <RdButton
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full mt-1.5"
              >
                {loading ? "Loading..." : "Join the waitlist"}
                <span aria-hidden="true">→</span>
              </RdButton>
              <button
                type="button"
                onClick={() => {
                  setWaitlistMode(false);
                  setWaitlistReason(null);
                  setError(null);
                  setMessage(null);
                }}
                className="text-[12.5px] text-rd-text-tertiary hover:text-rd-text mt-1"
              >
                ← Back — I have an invite code
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-5">
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

              {mode === "signup" && (
                <Field
                  id="login-invite"
                  label="Invite code"
                  hint="From your pilot invite"
                >
                  <Input
                    id="login-invite"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter your invite code"
                    autoCapitalize="characters"
                    autoComplete="off"
                    required
                  />
                </Field>
              )}

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
                        className="text-[11.5px] font-semibold text-rd-coral hover:text-rd-coral-dark"
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
                    className="mt-[1px] w-[15px] h-[15px] flex-shrink-0 accent-rd-coral cursor-pointer"
                    required
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-rd-coral hover:text-rd-coral-dark font-semibold"
                    >
                      Terms
                    </Link>{" "}
                    &amp;{" "}
                    <Link
                      to="/privacy"
                      className="text-rd-coral hover:text-rd-coral-dark font-semibold"
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
                    setError("Captcha challenge failed — please try again.");
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
          )}

          {/* Mode switch link (bottom). Forgot keeps its own "Back" link. */}
          {mode !== "forgot" ? (
            <div className="border-t border-rd-border-subtle mt-5 pt-4 text-center text-[12.5px] text-rd-text-tertiary">
              {switchLabel}
              <button
                type="button"
                onClick={() => switchMode(switchTarget)}
                className="text-rd-coral hover:text-rd-coral-dark font-semibold"
              >
                {switchAction}
              </button>
            </div>
          ) : (
            <div className="border-t border-rd-border-subtle mt-5 pt-4 text-center text-[12.5px] text-rd-text-tertiary">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-rd-coral hover:text-rd-coral-dark font-semibold"
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
        "focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]",
        props.className || "",
      ].join(" ")}
    />
  );
}
