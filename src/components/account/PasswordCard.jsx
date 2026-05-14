import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

const MIN_LEN = 8;

function validateNewPassword(password) {
  if (!password) return "Pick a new password.";
  if (password.length < MIN_LEN) return `At least ${MIN_LEN} characters.`;
  return null;
}

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

  const handleRequestNonce = async (e) => {
    e?.preventDefault();
    setError(null);

    const validation = validateNewPassword(newPassword);
    if (validation) { setError(validation); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }

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
      setError(updateErr.message || "Couldn't update your password. The code may have expired — try again.");
      return;
    }

    setStep("done");
    toast.success("Password updated.");
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
          <KeyRound className="w-4 h-4 text-[#525252]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">Change password</h3>
          <p className="text-xs text-[#525252] mt-0.5">
            Signed in as <span className="text-[#0A0A0A]">{user?.email}</span>. For your security we'll email a 6-digit code to confirm the change.
          </p>
        </div>
      </div>

      {step === "compose" && (
        <form onSubmit={handleRequestNonce} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">New password</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
              placeholder={`At least ${MIN_LEN} characters`}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Confirm new password</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
              placeholder="Repeat the password above"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}
          <Button type="submit" disabled={busy} className="bg-[#0A0A0A] hover:bg-[#262626]">
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
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Mail className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900">
              We emailed a 6-digit code to <strong>{user?.email}</strong>. It expires in a few minutes.
            </p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">6-digit code</label>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={nonce}
              onChange={(e) => setNonce(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 tracking-[0.3em] font-mono"
              placeholder="123456"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={busy || nonce.length !== 6} className="bg-[#0A0A0A] hover:bg-[#262626]">
              {busy ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
              ) : (
                <>Confirm and update password</>
              )}
            </Button>
            <button type="button" onClick={reset} className="text-xs text-[#A3A3A3] hover:text-[#525252] underline">
              Start over
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900">
              Your password is updated. You'll stay signed in on this device.
            </p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-[#A3A3A3] hover:text-[#525252] underline">
            Change it again
          </button>
        </div>
      )}
    </div>
  );
}
