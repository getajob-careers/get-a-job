// Settings preview harness — DEV-only route at /_preview/settings/:state.
//
// HIGHEST-STAKES PAGE — the harness must NEVER execute destructive flows.
// Strategy:
//   1. Auth context provides a synthetic `user` with `email` populated.
//   2. The supabase client is patched to no-op every method the page can
//      call: auth.reauthenticate, auth.updateUser, auth.getSession,
//      auth.signOut, functions.invoke, rpc. All return {error: null} or
//      a benign session. The destructive handlers in Settings.jsx /
//      PasswordCard.jsx STILL run — but they never reach real Supabase.
//      The `?deleted=1` redirect is short-circuited by stubbing
//      window.location.href setter.
//   3. Post-mount DOM seeding drives the visual state per fixture:
//      typing into inputs, clicking the reset button once, etc. Real
//      React state machines (Settings.jsx setResetConfirming, PasswordCard
//      setStep) are NOT bypassed — they're driven exactly as a user would.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/settings/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import Settings from "@/pages/Settings";
import PasswordCard from "@/components/account/PasswordCard";
import { SETTINGS_FIXTURES } from "./fixtures/settings";

const SETTINGS_FIXTURE_UID = "settings-fixture-user";
const SETTINGS_FIXTURE_EMAIL = "eli@example.com";

// Patch the supabase client so every method Settings/PasswordCard can
// hit is a benign no-op. Returns a cleanup function that restores the
// originals on unmount.
function patchSupabase() {
  const originals = {
    reauthenticate: supabase.auth.reauthenticate?.bind(supabase.auth),
    updateUser: supabase.auth.updateUser?.bind(supabase.auth),
    getSession: supabase.auth.getSession?.bind(supabase.auth),
    signOut: supabase.auth.signOut?.bind(supabase.auth),
    functionsInvoke: supabase.functions.invoke?.bind(supabase.functions),
    rpc: supabase.rpc?.bind(supabase),
  };

  // Cast through `any` — the real supabase-js method signatures are
  // typed strictly via discriminated unions; our harness no-ops don't
  // satisfy those. Runtime shape is what matters for the page logic.
  /** @type {any} */ (supabase.auth).reauthenticate = async () => ({ data: null, error: null });
  /** @type {any} */ (supabase.auth).updateUser = async () => ({ data: null, error: null });
  /** @type {any} */ (supabase.auth).getSession = async () => ({
    data: { session: { access_token: "harness-token", user: { id: SETTINGS_FIXTURE_UID, email: SETTINGS_FIXTURE_EMAIL } } },
    error: null,
  });
  /** @type {any} */ (supabase.auth).signOut = async () => ({ error: null });
  /** @type {any} */ (supabase.functions).invoke = async () => ({ data: { ok: true }, error: null });
  /** @type {any} */ (supabase).rpc = async () => ({ data: null, error: null });

  return () => {
    if (originals.reauthenticate) supabase.auth.reauthenticate = originals.reauthenticate;
    if (originals.updateUser) supabase.auth.updateUser = originals.updateUser;
    if (originals.getSession) supabase.auth.getSession = originals.getSession;
    if (originals.signOut) supabase.auth.signOut = originals.signOut;
    if (originals.functionsInvoke) supabase.functions.invoke = originals.functionsInvoke;
    if (originals.rpc) supabase.rpc = originals.rpc;
  };
}

// Short-circuit window.location.href assignment so the ?deleted=1
// redirect doesn't navigate Playwright off the preview page. The
// destructive handler still runs; the navigation just no-ops.
function patchLocationHref() {
  const original = Object.getOwnPropertyDescriptor(window.Location.prototype, "href");
  try {
    Object.defineProperty(window.location, "href", {
      configurable: true,
      get() { return ""; },
      set(_v) { /* no-op for harness */ },
    });
  } catch {
    /* some browsers don't allow this; harmless */
  }
  return () => {
    try {
      if (original) Object.defineProperty(window.Location.prototype, "href", original);
    } catch {
      /* ignore */
    }
  };
}

// Drive the visual state for the requested fixture by simulating real
// user input. The state machines run normally; we just inject the
// keystrokes/clicks.
function applyFixturePostMount(fixture) {
  if (fixture.subtreeOnly === "password-card") {
    drivePasswordCard(fixture.passwordStep);
    return;
  }

  if (fixture.resetConfirming) {
    // Click "Reset onboarding" button once → resetConfirming flips true.
    const btn = Array.from(document.querySelectorAll("button"))
      .find((b) => (b.textContent || "").trim() === "Reset onboarding");
    if (btn instanceof HTMLElement) btn.click();
  }

  if (fixture.deleteInput) {
    const input = document.querySelector('input[aria-label="Type DELETE my account to confirm"]');
    if (input instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, fixture.deleteInput);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  if (fixture.passwordStep && fixture.passwordStep !== "compose") {
    drivePasswordCard(fixture.passwordStep);
  }
}

function drivePasswordCard(targetStep) {
  if (targetStep === "compose" || !targetStep) return;

  // Compose → verify: fill password fields with a policy-passing value,
  // confirm, then submit. The mocked reauthenticate resolves immediately
  // → component transitions to verify step.
  const password = "TestPass1!aB";
  const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
  if (passwordInputs.length >= 2) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(passwordInputs[0], password);
    passwordInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    setter.call(passwordInputs[1], password);
    passwordInputs[1].dispatchEvent(new Event("input", { bubbles: true }));
  }

  setTimeout(() => {
    const sendBtn = Array.from(document.querySelectorAll("button"))
      .find((b) => (b.textContent || "").includes("Send verification code"));
    if (sendBtn instanceof HTMLElement) sendBtn.click();

    if (targetStep === "done") {
      // verify → done: fill nonce + click confirm. updateUser is mocked
      // to resolve → component transitions to done step.
      setTimeout(() => {
        const nonceInput = document.querySelector('input[autocomplete="one-time-code"]');
        if (nonceInput instanceof HTMLInputElement) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          setter.call(nonceInput, "123456");
          nonceInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        setTimeout(() => {
          const confirmBtn = Array.from(document.querySelectorAll("button"))
            .find((b) => (b.textContent || "").includes("Confirm and update password"));
          if (confirmBtn instanceof HTMLElement) confirmBtn.click();
        }, 100);
      }, 200);
    }
  }, 100);
}

export default function SettingsPreview() {
  const { state } = useParams();
  const fixture =
    SETTINGS_FIXTURES[state] || SETTINGS_FIXTURES["settings-default"];

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      }),
    [state], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const cleanupRef = useRef(null);
  useEffect(() => {
    const cleanupSupabase = patchSupabase();
    const cleanupLocation = patchLocationHref();
    cleanupRef.current = () => {
      cleanupSupabase();
      cleanupLocation();
    };
    return () => {
      if (typeof cleanupRef.current === "function") cleanupRef.current();
    };
  }, [fixture]);

  useEffect(() => {
    const t = setTimeout(() => applyFixturePostMount(fixture), 250);
    return () => clearTimeout(t);
  }, [fixture]);

  const authValue = useMemo(
    () => ({
      user: { id: SETTINGS_FIXTURE_UID, email: SETTINGS_FIXTURE_EMAIL },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: async () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }),
    [],
  );

  if (fixture.subtreeOnly === "password-card") {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
            <div className="max-w-2xl mx-auto px-6 py-8">
              <PasswordCard />
            </div>
          </div>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Settings />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
