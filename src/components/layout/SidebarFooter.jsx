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
//
// Visual: peach-on-cream avatar with white initials, "About Get A Job" link
// to /Landing in muted eyebrow style. Matches the home mockup's sidebar
// footer (docs/design/redesign/getajob_home_locked_crowz_style.html).
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
    <div className="px-4 py-3 border-t border-rd-border-subtle">
      {user ? (
        <>
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl("Settings")}
              onClick={onNavigate}
              aria-label="Open Settings"
              title="Settings"
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-1"
              style={{ background: "var(--rd-peach)" }}
            >
              <span className="font-display text-[12px] font-bold text-white">
                {initials}
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-display font-semibold text-rd-text truncate">
                {fullName}
              </p>
              <p className="text-[10.5px] text-rd-text-secondary truncate">
                {email}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md hover:bg-rd-bg-soft text-rd-text-secondary hover:text-rd-text transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Subtle link to the public marketing page. /Landing (not /) so
              Landing.jsx's auth-redirect skips it — see PR notes. */}
          <Link
            to="/Landing"
            onClick={onNavigate}
            className="block mt-2.5 text-[10px] text-rd-text-secondary hover:text-rd-text tracking-[0.09em] uppercase font-mono text-center transition-colors"
          >
            About Get A Job
          </Link>
        </>
      ) : (
        <p className="text-[10px] text-rd-text-secondary tracking-[0.09em] uppercase font-mono text-center">
          Employability through reasoning
        </p>
      )}
    </div>
  );
}
