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
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Account</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Settings</h1>
        <p className="text-sm text-[#525252] mt-2">Manage your password, onboarding state, and account.</p>
      </div>

      {/* ── Account section: password change ──────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Account</h2>
        <PasswordCard />
      </section>

      {/* ── Onboarding section: redo onboarding from scratch ───────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Onboarding</h2>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-[#525252] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0A0A0A]">Reset onboarding</p>
              <p className="text-xs text-[#525252] mt-1 leading-relaxed">
                Clears your profile, career roadmap, applications, tasks, experiences, projects, and certifications,
                then sends you back through onboarding. Your account stays — only the data you entered is wiped.
              </p>
              {resetError && (
                <p className="text-xs text-red-700 mt-2 flex items-center gap-1.5">
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
                      className="gap-1.5 bg-red-600 hover:bg-red-700"
                    >
                      {resetBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Confirm reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetConfirming(false)}
                      disabled={resetBusy}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetOnboarding}
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
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
        <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
        <div className="bg-white border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Trash2 className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0A0A0A]">Delete account</p>
              <p className="text-xs text-[#525252] mt-1 leading-relaxed">
                Permanently removes your account, all data tied to it, and any files you've uploaded. This action is
                immediate and cannot be undone. To confirm, type <code className="bg-[#F5F5F5] text-[#0A0A0A] px-1 py-0.5 rounded text-[11px] font-mono">{DELETE_CONFIRM_PHRASE}</code> below.
              </p>
              {deleteError && (
                <p className="text-xs text-red-700 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {deleteError}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={DELETE_CONFIRM_PHRASE}
                  disabled={deleteBusy}
                  className="text-sm max-w-xs"
                  autoComplete="off"
                  aria-label="Type DELETE my account to confirm"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={!canConfirmDelete || deleteBusy}
                  className="gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40"
                >
                  {deleteBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
