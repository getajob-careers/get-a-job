import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { LogOut } from "lucide-react";

// `profileFullName` (optional) — preferred name source from profiles.full_name,
// which is populated by CV extraction during onboarding. Falls back to auth
// metadata, then email, mirroring the previous behavior. The prop is optional
// so this component still renders if Layout hasn't fetched the profile chrome
// yet (mid-signup users have no profile row).
//
// `onNavigate` (optional) — fires when the avatar is clicked. Layout uses this
// to close the mobile sidebar overlay so the user lands on /Settings without
// the overlay still covering the page.
export default function SidebarFooter({ profileFullName = null, onNavigate }) {
  const { user, logout } = useAuth();

  const fullName =
    (typeof profileFullName === "string" && profileFullName.trim()) ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "";
  const email = user?.email || "";
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="px-4 py-3 border-t border-[#F0F0F0]">
      {user ? (
        <>
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl("Settings")}
              onClick={onNavigate}
              aria-label="Open Settings"
              title="Settings"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-[#A3A3A3]/30 hover:ring-offset-1 transition-all focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/40 focus:ring-offset-1"
            >
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#0A0A0A] truncate">{fullName}</p>
              <p className="text-[10px] text-[#A3A3A3] truncate">{email}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md hover:bg-[#F5F5F5] text-[#A3A3A3] hover:text-[#525252] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Subtle link to the public marketing page. /Landing (not /) so
              Landing.jsx's auth-redirect skips it — see PR notes. */}
          <Link
            to="/Landing"
            onClick={onNavigate}
            className="block mt-2.5 text-[10px] text-[#A3A3A3] hover:text-[#525252] tracking-wide uppercase text-center transition-colors"
          >
            About Get A Job
          </Link>
        </>
      ) : (
        <p className="text-[10px] text-[#A3A3A3] tracking-wide uppercase text-center">
          Employability through reasoning
        </p>
      )}
    </div>
  );
}
