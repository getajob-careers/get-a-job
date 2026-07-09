import React, { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getPasswordChecks, allChecksPass } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/account/PasswordRequirements";

// Two-step password change for authenticated users, matching Supabase's
// "Secure password change" requirement:
//   1. User submits new password → we call auth.reauthenticate() which
//      emails them a 6-digit nonce.
//   2. User enters the 6-digit nonce from email → we call
//      updateUser({ password, nonce }) to actually rotate the password.
//
// We never ask for the current password. Email possession is the second
// factor — this defends against XSS-stolen sessions where the attacker
// already has the current password.
//
// Password rules + visual checklist live in passwordPolicy + PasswordRequirements
// so the signup form shares the exact same logic. See lib/passwordPolicy.js.

export default function PasswordCard() {
  const { user } = useAuth();
  const [step, setStep] = useState("compose"); // 'compose' → 'verify' → 'done'
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nonce, setNonce] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setStep("compose");
    setNewPassword("");
    setConfirmPassword("");
    setNonce("");
    setError(null);
  };

  const checks = useMemo(() => getPasswordChecks(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmitCompose = allChecksPass(checks) && passwordsMatch;

  const handleRequestNonce = async (e) => {
    e?.preventDefault();
    setError(null);

    if (!canSubmitCompose) {
      // Submit shouldn't be reachable when the button is disabled, but guard
      // against keyboard form submission anyway.
      if (!allChecksPass(checks)) { setError("Password doesn't meet all requirements yet."); return; }
      if (!passwordsMatch) { setError("Passwords don't match."); return; }
    }

    setBusy(true);
    const { error: reauthErr } = await supabase.auth.reauthenticate();
    setBusy(false);

    if (reauthErr) {
      setError(reauthErr.message || "Couldn't send the verification email. Please try again.");
      return;
    }
    setStep("verify");
  };

  const handleConfirm = async (e) => {
    e?.preventDefault();
    setError(null);

    const code = nonce.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: code,
    });
    setBusy(false);

    if (updateErr) {
      setError(updateErr.message || "Couldn't update your password. The code may have expired - try again.");
      return;
    }

    setStep("done");
    toast.success("Password updated.");
  };

  return (
    <div className="bg-rd-bg-card rounded-[14px] border border-rd-border p-6 space-y-5 shadow-rd">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-rd-coral-tint flex items-center justify-center flex-shrink-0">
          <KeyRound className="w-4 h-4 text-rd-coral" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-display font-bold text-rd-text">Change password</h3>
          <p className="text-xs text-rd-text-secondary mt-0.5">
            Signed in as <span className="text-rd-text font-display font-semibold">{user?.email}</span>. For your security we&apos;ll email a 6-digit code to confirm the change.
          </p>
        </div>
      </div>

      {step === "compose" && (
        <form onSubmit={handleRequestNonce} className="space-y-4">
          <div>
            <label className="text-[10.5px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow">New password</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
              placeholder="Meets all 5 requirements below"
            />
            <PasswordRequirements checks={checks} />
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow">Confirm new password</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
              placeholder="Repeat the password above"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-[11px] text-rd-coral-dark mt-1.5">Doesn&apos;t match the password above.</p>
            )}
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rd-coral-tint border border-rd-coral/30 rounded-[10px]">
              <AlertCircle className="w-4 h-4 text-rd-coral flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rd-coral-dark">{error}</p>
            </div>
          )}
          <Button
            type="submit"
            disabled={busy || !canSubmitCompose}
            className="bg-rd-coral hover:bg-rd-coral-dark text-white rounded-full font-display font-bold"
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending code…</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" />Send verification code</>
            )}
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-rd-bg-soft border border-rd-border rounded-[10px]">
            <Mail className="w-4 h-4 text-rd-coral flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rd-text">
              We emailed a 6-digit code to <strong className="font-display font-semibold">{user?.email}</strong>. It expires in a few minutes.
            </p>
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow">6-digit code</label>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={nonce}
              onChange={(e) => setNonce(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 tracking-[0.3em] font-mono border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
              placeholder="123456"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rd-coral-tint border border-rd-coral/30 rounded-[10px]">
              <AlertCircle className="w-4 h-4 text-rd-coral flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rd-coral-dark">{error}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={busy || nonce.length !== 6}
              className="bg-rd-coral hover:bg-rd-coral-dark text-white rounded-full font-display font-bold"
            >
              {busy ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
              ) : (
                <>Confirm and update password</>
              )}
            </Button>
            <button type="button" onClick={reset} className="text-xs text-rd-text-tertiary hover:text-rd-text-secondary underline">
              Start over
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-rd-teal-tint border border-rd-teal/30 rounded-[10px]">
            <CheckCircle2 className="w-4 h-4 text-rd-teal-dark flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rd-teal-dark">
              Your password is updated. You&apos;ll stay signed in on this device.
            </p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-rd-text-tertiary hover:text-rd-text-secondary underline">
            Change it again
          </button>
        </div>
      )}
    </div>
  );
}
