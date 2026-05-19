import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { MIN_LEN, getPasswordChecks, allChecksPass } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/account/PasswordRequirements";
import { Turnstile } from "@marsidev/react-turnstile";

// Cloudflare Turnstile site key. Public — ships in the frontend bundle
// regardless. Hardcoded inline (no env var) per Eli's call. Bound to the
// site key configured in Supabase Auth → CAPTCHA settings, which holds
// the matching secret server-side. Both halves of the pair must match
// for signup to succeed.
const TURNSTILE_SITE_KEY = "0x4AAAAAADSlsvzNPw5Qejvq";

// mode: "signin" | "signup" | "forgot"
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  // Turnstile state. captchaToken is fed into supabase.auth.signUp's options.
  // It expires (~5min default), is cleared on expiry or error, and is
  // required to enable the signup submit button. The turnstileRef lets us
  // programmatically reset the widget after a failed signUp so the user
  // can re-challenge without manually refreshing.
  const [captchaToken, setCaptchaToken] = useState(null);
  const turnstileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Show a confirmation banner after self-service deletion (Settings redirects
  // here with ?deleted=1). Cleared on the first user keystroke so it doesn't
  // linger forever — handleSubmit also clears it via setMessage(null).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("deleted") === "1") {
      setMessage("Your account has been deleted.");
    }
  }, [location.search]);

  // Live password validation in signup mode only. Signin/forgot must not
  // nag returning users about character-class rules.
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  // Submit-button gate. Signup requires BOTH password policy + captcha
  // token. Signin and forgot are unaffected by captcha (per-IP rate
  // limits handle failed logins fine).
  const signupCanSubmit =
    mode !== "signup" || (allChecksPass(passwordChecks) && !!captchaToken);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setMessage(null);
    setCaptchaToken(null);
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
          options: { data: { full_name: fullName }, captchaToken },
        });
        if (error) {
          // Token is single-use on the server side. Reset the widget so
          // the user can re-challenge without manually clicking it,
          // regardless of whether the failure was captcha-related or
          // something else (email already exists, password policy, etc.).
          setCaptchaToken(null);
          turnstileRef.current?.reset();
          throw error;
        }
        // signup_completed PostHog event can't fire directly from /login
        // (PostHog only loads inside AuthenticatedApp). Set a one-shot
        // flag in localStorage that PostHogProvider drains on first
        // identify after the user confirms their email and signs in.
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-[#E5E5E5]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Get A Job
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1 tracking-wide uppercase">
            Career Operating System
          </p>
        </div>

        <h2 className="text-xl font-semibold text-[#0A0A0A] mb-6">
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent transition-all"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[#525252]">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-[#525252] hover:text-[#0A0A0A] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent transition-all"
                placeholder={mode === "signup" ? "Meets all 5 requirements below" : "••••••••"}
                required
                minLength={mode === "signup" ? MIN_LEN : 6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {mode === "signup" && <PasswordRequirements checks={passwordChecks} />}
            </div>
          )}

          {mode === "signup" && (
            <div className="flex w-full justify-center">
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
            className="w-full py-2.5 bg-gradient-to-r from-[#0A0A0A] to-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading
              ? "Loading..."
              : mode === "signup"
              ? "Create Account"
              : mode === "forgot"
              ? "Send Reset Email"
              : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === "forgot" ? (
            <button
              onClick={() => switchMode("signin")}
              className="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors"
            >
              Back to sign in
            </button>
          ) : (
            <button
              onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
              className="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors"
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
