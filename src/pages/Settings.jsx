import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Trash2, AlertCircle } from "lucide-react";
import PasswordCard from "@/components/account/PasswordCard";

const DELETE_CONFIRM_PHRASE = "DELETE my account";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Reset-onboarding flow. Two-step: first click sets resetConfirming=true,
  // second click runs the RPC. Mirrors the previous Home.jsx pattern so
  // returning users find the destructive flow familiar.
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Delete-account flow. Typed-phrase confirmation; the call only fires when
  // the input matches DELETE_CONFIRM_PHRASE exactly.
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleResetOnboarding = async () => {
    if (!user?.id) return;
    if (!resetConfirming) {
      setResetConfirming(true);
      return;
    }
    setResetBusy(true);
    setResetError(null);
    try { localStorage.removeItem(`careerRoles:${user.id}:hadData`); } catch { /* ignore */ }
    const { error } = await supabase.rpc("reset_user_data", { p_user_id: user.id });
    if (error) {
      console.error("[settings] reset_user_data failed:", error);
      setResetError("Reset failed. Please try again.");
      setResetBusy(false);
      return;
    }
    queryClient.removeQueries({ queryKey: ["userProfile"] });
    queryClient.removeQueries({ queryKey: ["careerRoles"] });
    queryClient.removeQueries({ queryKey: ["tasks"] });
    queryClient.removeQueries({ queryKey: ["applications"] });
    queryClient.removeQueries({ queryKey: ["experiences"] });
    queryClient.removeQueries({ queryKey: ["projects"] });
    queryClient.removeQueries({ queryKey: ["certifications"] });
    queryClient.removeQueries({ queryKey: ["jobSuggestions"] });
    navigate(createPageUrl("Onboarding"));
  };

  // Case-insensitive + whitespace-tolerant — the phrase is a deliberate
  // consent gate, not a Shibboleth. Forcing exact capitalization just makes
  // people type it twice; lowercasing keeps the intent (typed-phrase consent)
  // without the friction.
  const canConfirmDelete =
    deleteInput.trim().toLowerCase() === DELETE_CONFIRM_PHRASE.toLowerCase();

  const handleDeleteAccount = async () => {
    if (!canConfirmDelete || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setDeleteError("Not signed in.");
      setDeleteBusy(false);
      return;
    }
    const { data, error } = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      console.error("[settings] delete-account failed:", error);
      setDeleteError(data?.error || "Account deletion failed. Please try again or contact support.");
      setDeleteBusy(false);
      return;
    }
    // Account is gone. Sign-out locally (shouldRedirect=false so we control
    // the destination) and route to login with the ?deleted=1 flag the Login
    // page reads to show the confirmation banner. A hard reload here would
    // strip the query string before Login mounted.
    await logout(false);
    window.location.href = "/Login?deleted=1";
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8 bg-rd-bg-page min-h-screen font-body text-rd-text">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1">Account</p>
        <h1 className="font-display font-extrabold text-[27px] sm:text-[32px] leading-[1.08] tracking-tight text-rd-text">Settings</h1>
        <p className="text-sm text-rd-text-secondary mt-2">Manage your password, onboarding state, and account.</p>
      </div>

      {/* ── Account section: password change ──────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-[14px] text-rd-text">Account</h2>
        <PasswordCard />
      </section>

      {/* ── Onboarding section: redo onboarding from scratch ───────────── */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-[14px] text-rd-text">Onboarding</h2>
        <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 shadow-rd">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-rd-text-secondary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-display font-semibold text-rd-text">Reset onboarding</p>
              <p className="text-xs text-rd-text-secondary mt-1 leading-relaxed">
                Clears your profile, career roadmap, applications, tasks, experiences, projects, and certifications,
                then sends you back through onboarding. Your account stays - only the data you entered is wiped.
              </p>
              {resetError && (
                <p className="text-xs text-rd-coral-dark mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {resetError}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                {resetConfirming ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleResetOnboarding}
                      disabled={resetBusy}
                      className="gap-1.5 bg-rd-coral hover:bg-rd-coral-dark text-white rounded-full font-display font-bold"
                    >
                      {resetBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Confirm reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetConfirming(false)}
                      disabled={resetBusy}
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetOnboarding}
                    className="gap-2 text-rd-coral-dark border-rd-coral/30 hover:bg-rd-coral-tint rounded-full font-display font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset onboarding
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Danger zone: permanent account deletion ──────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-[14px] text-rd-coral-dark">Danger zone</h2>
        <div className="bg-rd-bg-card border border-rd-coral/30 rounded-[14px] p-5 shadow-rd">
          <div className="flex items-start gap-3">
            <Trash2 className="w-4 h-4 text-rd-coral flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-display font-semibold text-rd-text">Delete account</p>
              <p className="text-xs text-rd-text-secondary mt-1 leading-relaxed">
                Permanently removes your account, all data tied to it, and any files you&apos;ve uploaded. This action is
                immediate and cannot be undone. To confirm, type <code className="bg-rd-bg-soft text-rd-text px-1 py-0.5 rounded text-[11px] font-mono">{DELETE_CONFIRM_PHRASE}</code> below.
              </p>
              {deleteError && (
                <p className="text-xs text-rd-coral-dark mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {deleteError}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={DELETE_CONFIRM_PHRASE}
                  disabled={deleteBusy}
                  className="text-sm max-w-xs border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                  autoComplete="off"
                  aria-label="Type DELETE my account to confirm"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={!canConfirmDelete || deleteBusy}
                  className="gap-1.5 bg-rd-coral hover:bg-rd-coral-dark text-white rounded-full font-display font-bold disabled:opacity-40"
                >
                  {deleteBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer-style link back to the public marketing page. /Landing (not /)
          so Landing.jsx's auth-redirect skips it. */}
      <div className="pt-2 text-center">
        <a
          href="/Landing"
          className="text-xs text-rd-text-tertiary hover:text-rd-text-secondary underline underline-offset-2"
        >
          About Get A Job
        </a>
      </div>
    </div>
  );
}
