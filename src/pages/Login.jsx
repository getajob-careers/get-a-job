import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { MIN_LEN, getPasswordChecks, allChecksPass } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/account/PasswordRequirements";
import { Turnstile } from "@marsidev/react-turnstile";

// Cloudflare Turnstile site key. Public — ships in the frontend bundle
// regardless. Bound to the matching secret in Supabase Auth → CAPTCHA.
const TURNSTILE_SITE_KEY = "0x4AAAAAADSlsvzNPw5Qejvq";

// Direction 3 tokens scoped to .login — same palette as Landing.jsx / Home.jsx.
// Two-column shell on desktop, stacked on mobile. Form keeps its existing
// shadcn-adjacent inputs; the surrounding chrome is brand-tuned.
const LOGIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700;800&display=swap');
.login {
  --login-bg: #F4F4F2;
  --login-bg-tinted: #E8E8E5;
  --login-ink: #0E1014;
  --login-ink-soft: #52545A;
  --login-ink-faded: #9C9DA1;
  --login-accent: #F87060;
  --login-accent-deep: #C84F40;
  --login-accent-tint: #FDE7E3;
  --login-green: #1D7556;
  --login-line: #DDDDDB;
  --login-line-soft: #E8E8E5;
  --login-card: #FFFFFF;
  --login-ink-card: #0E1014;
  --login-radius: 14px;
  --login-radius-lg: 20px;
  --login-font: 'Geist', system-ui, sans-serif;
  --login-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--login-font);
  color: var(--login-ink);
  background: var(--login-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.login *, .login *::before, .login *::after { box-sizing: border-box; }

.login-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  max-width: 1240px;
  margin: 0 auto;
  gap: 0;
}

/* ── Left: form panel ─────────────────────────────────────────────────── */
.login-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background: var(--login-bg);
}
.login-form-inner {
  width: 100%;
  max-width: 420px;
}
.login-brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 36px;
}
.login-brand-mark {
  font-family: var(--login-font);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--login-ink);
}
.login-brand-dot {
  width: 7px;
  height: 7px;
  background: var(--login-accent);
  border-radius: 50%;
  display: inline-block;
  transform: translateY(-2px);
}

.login-tabs {
  display: inline-flex;
  background: var(--login-bg-tinted);
  border-radius: 100px;
  padding: 4px;
  margin-bottom: 28px;
  gap: 2px;
}
.login-tabs button {
  appearance: none;
  border: 0;
  background: transparent;
  font-family: var(--login-font);
  font-size: 13px;
  font-weight: 500;
  color: var(--login-ink-soft);
  padding: 7px 18px;
  border-radius: 100px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.login-tabs button[aria-selected="true"] {
  background: var(--login-card);
  color: var(--login-ink);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(14, 16, 20, 0.06);
}
.login-tabs button:hover:not([aria-selected="true"]) {
  color: var(--login-ink);
}

.login-head {
  font-family: var(--login-font);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--login-ink);
  margin: 0 0 10px;
}
.login-sub {
  font-size: 14.5px;
  color: var(--login-ink-soft);
  line-height: 1.55;
  margin: 0 0 28px;
}

.login-banner {
  margin-bottom: 18px;
  padding: 11px 14px;
  border-radius: var(--login-radius);
  font-size: 13px;
  line-height: 1.45;
}
.login-banner-error {
  background: var(--login-accent-tint);
  border: 1px solid var(--login-accent);
  color: var(--login-accent-deep);
}
.login-banner-ok {
  background: #E5F3EC;
  border: 1px solid #BCE0CC;
  color: #14593F;
}

.login-form { display: flex; flex-direction: column; gap: 16px; }
.login-field { display: flex; flex-direction: column; gap: 6px; }
.login-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.login-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--login-ink);
  letter-spacing: -0.005em;
}
.login-forgot-link {
  appearance: none;
  background: transparent;
  border: 0;
  font-family: var(--login-font);
  font-size: 12px;
  color: var(--login-ink-soft);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: var(--login-ink-faded);
}
.login-forgot-link:hover { color: var(--login-accent); text-decoration-color: var(--login-accent); }

.login-input {
  width: 100%;
  padding: 11px 14px;
  border-radius: var(--login-radius);
  border: 1px solid var(--login-line);
  background: var(--login-card);
  color: var(--login-ink);
  font-family: var(--login-font);
  font-size: 14px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.login-input::placeholder { color: var(--login-ink-faded); }
.login-input:focus {
  outline: none;
  border-color: var(--login-ink);
  box-shadow: 0 0 0 3px rgba(14, 16, 20, 0.08);
}

.login-turnstile {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.login-submit {
  appearance: none;
  border: 0;
  width: 100%;
  padding: 13px 18px;
  border-radius: 100px;
  font-family: var(--login-font);
  font-size: 14px;
  font-weight: 600;
  background: var(--login-ink-card);
  color: var(--login-bg);
  cursor: pointer;
  margin-top: 6px;
  transition: background 0.15s ease, transform 0.15s ease;
  box-shadow: 0 4px 16px rgba(14, 16, 20, 0.12);
}
.login-submit:hover:not(:disabled) { background: var(--login-accent); transform: translateY(-1px); }
.login-submit:active:not(:disabled) { transform: scale(0.98); }
.login-submit:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

.login-back {
  margin-top: 18px;
  text-align: center;
}
.login-back button {
  appearance: none;
  background: transparent;
  border: 0;
  font-family: var(--login-font);
  font-size: 13px;
  color: var(--login-ink-soft);
  cursor: pointer;
  padding: 0;
}
.login-back button:hover { color: var(--login-ink); }

/* ── Right: dark aside panel ──────────────────────────────────────────── */
.login-aside {
  position: relative;
  background: var(--login-ink-card);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 56px;
  overflow: hidden;
}
.login-aside::before {
  content: "";
  position: absolute;
  top: -120px;
  right: -120px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: var(--login-accent);
  opacity: 0.16;
  filter: blur(20px);
  pointer-events: none;
}
.login-aside::after {
  content: "";
  position: absolute;
  bottom: -140px;
  left: -100px;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: var(--login-accent);
  opacity: 0.08;
  filter: blur(28px);
  pointer-events: none;
}
.login-aside-content {
  position: relative;
  max-width: 440px;
  width: 100%;
}
.login-aside-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--login-font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--login-accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 5px 12px;
  border: 1px solid rgba(248, 112, 96, 0.4);
  border-radius: 100px;
  margin-bottom: 28px;
}
.login-aside-eyebrow .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--login-accent);
}
.login-aside h2 {
  font-family: var(--login-font);
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.08;
  margin: 0 0 18px;
  color: #FFFFFF;
}
.login-aside h2 .accent { color: var(--login-accent); font-weight: 500; }
.login-aside p {
  font-size: 15px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 28px;
}
.login-aside-bullets {
  list-style: none;
  padding: 0;
  margin: 0 0 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.login-aside-bullets li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}
.login-aside-bullets li svg {
  flex-shrink: 0;
  margin-top: 3px;
}
.login-aside-svg-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0 28px;
}
.login-aside-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--login-font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.6);
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
}
.login-aside-badge .pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--login-green);
  box-shadow: 0 0 0 4px rgba(29, 117, 86, 0.2);
}

/* ── Mobile breakpoint ────────────────────────────────────────────────── */
@media (max-width: 960px) {
  .login-shell {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .login-aside {
    order: -1;
    padding: 40px 32px 36px;
  }
  .login-aside-content { max-width: 540px; }
  .login-aside h2 { font-size: 26px; }
  .login-aside p { font-size: 14px; margin-bottom: 18px; }
  .login-aside-bullets { display: none; }
  .login-aside-svg-wrap { display: none; }
  .login-form-panel { padding: 36px 24px 48px; }
}
@media (max-width: 480px) {
  .login-aside { padding: 32px 20px 28px; }
  .login-aside h2 { font-size: 22px; }
  .login-form-inner { max-width: 100%; }
  .login-head { font-size: 26px; }
}
`;

// Tier-quadrant SVG illustration. Concentric rings = tier shells radiating
// from the user (centre); coral dot = the tier-1 target being hit.
function TierQuadrantSVG() {
  return (
    <svg
      viewBox="0 0 280 280"
      width="240"
      height="240"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer ring — Tier 3 */}
      <circle cx="140" cy="140" r="118" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="2 5" />
      {/* Middle ring — Tier 2 */}
      <circle cx="140" cy="140" r="80" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" strokeDasharray="2 5" />
      {/* Inner ring — Tier 1 */}
      <circle cx="140" cy="140" r="44" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />

      {/* Tier 3 nodes */}
      <circle cx="58" cy="92" r="3" fill="rgba(255,255,255,0.32)" />
      <circle cx="232" cy="182" r="3" fill="rgba(255,255,255,0.32)" />
      <circle cx="186" cy="38" r="3" fill="rgba(255,255,255,0.32)" />
      <circle cx="48" cy="206" r="3" fill="rgba(255,255,255,0.32)" />
      <circle cx="220" cy="68" r="3" fill="rgba(255,255,255,0.32)" />

      {/* Tier 2 nodes */}
      <circle cx="78" cy="178" r="3.5" fill="rgba(255,255,255,0.55)" />
      <circle cx="208" cy="98" r="3.5" fill="rgba(255,255,255,0.55)" />
      <circle cx="92" cy="78" r="3.5" fill="rgba(255,255,255,0.55)" />

      {/* Tier 1 nodes */}
      <circle cx="106" cy="160" r="4" fill="rgba(255,255,255,0.85)" />
      <circle cx="174" cy="118" r="4" fill="rgba(255,255,255,0.85)" />

      {/* Coral path: centre → target */}
      <path
        d="M 144 138 Q 162 142 178 152"
        stroke="#F87060"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Highlighted Tier 1 target with check */}
      <g>
        <circle cx="182" cy="156" r="14" fill="none" stroke="#F87060" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="182" cy="156" r="9" fill="#F87060" />
        <path
          d="M 177 156 L 181 160 L 187 152"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Centre "you" dot */}
      <circle cx="140" cy="140" r="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <circle cx="140" cy="140" r="5" fill="#FFFFFF" />

      {/* Ring labels */}
      <text x="140" y="34" textAnchor="middle" fontFamily="Geist Mono, ui-monospace, monospace" fontSize="9" fill="rgba(255,255,255,0.4)" letterSpacing="0.1em">TIER 3</text>
      <text x="140" y="72" textAnchor="middle" fontFamily="Geist Mono, ui-monospace, monospace" fontSize="9" fill="rgba(255,255,255,0.6)" letterSpacing="0.1em">TIER 2</text>
      <text x="140" y="108" textAnchor="middle" fontFamily="Geist Mono, ui-monospace, monospace" fontSize="9" fill="rgba(255,255,255,0.82)" letterSpacing="0.1em">TIER 1</text>
    </svg>
  );
}

function BulletCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="#F87060" strokeWidth="1" fill="rgba(248,112,96,0.15)" />
      <path d="M 5 8.2 L 7.2 10.2 L 11 6.3" stroke="#F87060" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// mode: "signin" | "signup" | "forgot"
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
  const signupCanSubmit =
    mode !== "signup" || (allChecksPass(passwordChecks) && !!captchaToken);

  const switchMode = (next) => {
    setError(null);
    setMessage(null);
    setCaptchaToken(null);
    // Drive mode via the URL — the useEffect above mirrors it into state.
    // Replace history so the back button doesn't pile up mode-switch entries.
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            captchaToken,
            // Without this, Supabase falls back to the Auth Site URL
            // (https://getajob.careers), so users who click the confirmation
            // link land on Landing and have to figure out how to get into the
            // app. Sending them straight to /Onboarding picks up the fresh
            // session via detectSessionInUrl. NOTE: /Onboarding must be in
            // Supabase Auth → URL Configuration → Redirect URLs, otherwise
            // Supabase rejects the value and falls back to Site URL anyway.
            emailRedirectTo: `${window.location.origin}/Onboarding`,
          },
        });
        if (error) {
          // Token is single-use server-side. Reset the widget so the user
          // can re-challenge without a manual refresh.
          setCaptchaToken(null);
          turnstileRef.current?.reset();
          throw error;
        }
        // signup_completed PostHog event can't fire directly from /login
        // (PostHog only loads inside AuthenticatedApp). One-shot flag that
        // PostHogProvider drains on first identify after email confirm.
        try { localStorage.setItem("gaj.signup_pending", "1"); } catch { /* private mode */ }
        setMessage("Check your email for a confirmation link!");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("Password reset email sent — check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const headline =
    mode === "signup" ? "Create your account"
    : mode === "forgot" ? "Reset your password"
    : "Welcome back";

  const subcopy =
    mode === "signup" ? "Free during the pilot. No credit card, no spam."
    : mode === "forgot" ? "Enter your email and we'll send a reset link."
    : "";

  const asideHead =
    mode === "signup" ? <>Your career, <span className="accent">operating system.</span></>
    : <>Welcome <span className="accent">back.</span></>;

  const asideSub =
    mode === "signup"
      ? "One workspace that remembers your background — so you stop re-pasting your CV into a fresh chat every time."
      : "Pick up exactly where you left off.";

  const submitLabel =
    loading ? "Loading..."
    : mode === "signup" ? "Create account"
    : mode === "forgot" ? "Send reset email"
    : "Sign in";

  return (
    <div className="login">
      <style>{LOGIN_CSS}</style>
      <div className="login-shell">
        {/* ── Form column (left on desktop, below aside on mobile) ─────── */}
        <main className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-brand">
              <span className="login-brand-mark">getajob</span>
              <span className="login-brand-dot" />
            </div>

            {mode !== "forgot" && (
              <div className="login-tabs" role="tablist" aria-label="Account mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  onClick={() => switchMode("signup")}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </button>
              </div>
            )}

            <h1 className="login-head">{headline}</h1>
            {subcopy && <p className="login-sub">{subcopy}</p>}

            {error && (
              <div className="login-banner login-banner-error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="login-banner login-banner-ok" role="status">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {mode === "signup" && (
                <div className="login-field">
                  <label className="login-label" htmlFor="login-fullname">Full name</label>
                  <input
                    id="login-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="login-input"
                    placeholder="John Doe"
                    required
                  />
                </div>
              )}

              <div className="login-field">
                <label className="login-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {mode !== "forgot" && (
                <div className="login-field">
                  <div className="login-label-row">
                    <label className="login-label" htmlFor="login-password">Password</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="login-forgot-link"
                        onClick={() => switchMode("forgot")}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    placeholder={mode === "signup" ? "Meets all 5 requirements below" : "••••••••"}
                    required
                    minLength={mode === "signup" ? MIN_LEN : 6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  {mode === "signup" && <PasswordRequirements checks={passwordChecks} />}
                </div>
              )}

              {mode === "signup" && (
                <div className="login-turnstile">
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
              )}

              <button
                type="submit"
                disabled={loading || !signupCanSubmit}
                className="login-submit"
              >
                {submitLabel}
              </button>
            </form>

            {mode === "forgot" && (
              <div className="login-back">
                <button type="button" onClick={() => switchMode("signin")}>
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── Aside (right on desktop, top on mobile) ──────────────────── */}
        <aside className="login-aside" aria-hidden="false">
          <div className="login-aside-content">
            <div className="login-aside-eyebrow">
              <span className="dot" />
              {mode === "signup" ? "Pilot · 100 invites" : "Career operating system"}
            </div>
            <h2>{asideHead}</h2>
            <p>{asideSub}</p>

            <ul className="login-aside-bullets">
              <li><BulletCheck /><span>Five specialised agents: career strategy, CV, interview, LinkedIn, and skill development</span></li>
              <li><BulletCheck /><span>Tier-scored roadmap built from your actual experience and target roles</span></li>
              <li><BulletCheck /><span>Application tracker, prep tasks, and weekly focus — all kept in sync</span></li>
            </ul>

            <div className="login-aside-svg-wrap">
              <TierQuadrantSVG />
            </div>

            <div className="login-aside-badge">
              <span className="pulse" />
              Aug–Nov 2026 · 100-student pilot cohort
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
