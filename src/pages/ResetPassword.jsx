import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  // Without a valid recovery token in the URL hash, PASSWORD_RECOVERY never fires
  // and the "Verifying…" state would hang forever (expired/reused/direct-visit
  // links). Time out so we can show an honest error with a way back, not a
  // permanent spinner.
  const [linkInvalid, setLinkInvalid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it detects a recovery token in the URL hash
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    const timer = setTimeout(() => {
      setReady((isReady) => {
        if (!isReady) setLinkInvalid(true);
        return isReady;
      });
    }, 8000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-[#E5E5E5] text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] mb-2">
            Get A Job
          </h1>
          <p className="text-sm text-[#A3A3A3] mb-6 tracking-wide uppercase">
            Career Operating System
          </p>
          {linkInvalid ? (
            <>
              <h2 className="text-lg font-semibold text-[#0A0A0A] mb-2">
                This reset link isn&apos;t valid
              </h2>
              <p className="text-sm text-[#525252] mb-6">
                It may have expired or already been used. Request a new one from
                the sign-in page.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full py-2.5 bg-gradient-to-r from-[#0A0A0A] to-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:ring-offset-2 disabled:opacity-50"
              >
                Back to sign in
              </button>
            </>
          ) : (
            <p className="text-sm text-[#525252]">Verifying reset link…</p>
          )}
        </div>
      </div>
    );
  }

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
          Choose a new password
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-[#0A0A0A] to-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
