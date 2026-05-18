import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { LogOut } from "lucide-react";

// `profileFullName` (optional) — preferred name source from profiles.full_name,
// which is populated by CV extraction during onboarding. Falls back to auth
// metadata, then email, mirroring the previous behavior. The prop is optional
// so this component still renders if Layout hasn't fetched the profile chrome
// yet (mid-signup users have no profile row).
export default function SidebarFooter({ profileFullName = null }) {
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
    <div className="px-4 py-4 border-t border-[#F0F0F0]">
      {user ? (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white">{initials}</span>
          </div>
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
      ) : (
        <p className="text-[10px] text-[#A3A3A3] tracking-wide uppercase text-center">
          Employability through reasoning
        </p>
      )}
    </div>
  );
}
