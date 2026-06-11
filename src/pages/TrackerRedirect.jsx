import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

// PR-A2: the live /Tracker route redirects to the absorbed Career
// pipeline board. ?app=<id> passthrough preserves deep links (Calendar
// event rows, chat-agent confirmation chips, anywhere referencing a
// specific application) so they continue to land on the right drawer.
//
// Tracker.jsx + TrackerPreview stay in the repo untouched — the kanban
// regression checks still mount the real Tracker via
// /_preview/tracker/:state. Only the production route swaps to this
// redirect so PR-A2 doesn't ship two pipeline surfaces.
export default function TrackerRedirect() {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get("app");
  const target = appId
    ? `/Career?pipeline=open&app=${encodeURIComponent(appId)}`
    : "/Career?pipeline=open";
  return <Navigate to={target} replace />;
}
