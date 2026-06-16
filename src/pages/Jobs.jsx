import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

// PR3 (consolidation) — /Jobs is retired as a standalone surface. The unified
// two-tab feed (Top Matches + Search All Jobs) now lives on /Career, mounted
// there via <UnifiedJobsFeed>. This route stays registered ONLY as a redirect
// target so existing links + bookmarks don't 404.
//
// Deep-link translation: a ?role=<title> param (from RoleCard's "See {role}
// jobs" link, or any older /Jobs?role= link) is forwarded to
// /Career?role=<title>, which opens the Search tab with the role prefilled
// (see UnifiedJobsFeed + JobsSearchTab). Plain /Jobs forwards to /Career.
//
// The legacy Track 1/2/3 tabs feed and the ?flag=legacy_track_tabs rollback
// hatch were removed in this PR — the unified feed is the only path now.
export default function JobsRedirect() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const target = role
    ? `${createPageUrl("Career")}?role=${encodeURIComponent(role)}`
    : createPageUrl("Career");
  return <Navigate to={target} replace />;
}
