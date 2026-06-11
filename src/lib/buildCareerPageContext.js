// PR-B2 Career page-context shape — pure helper consumed by Career.jsx
// inside its useEffect and re-tested in isolation via
// src/test/career-page-context.test.js. Lives outside Career.jsx so the
// test can import it without dragging Career's supabaseClient
// transitive import chain (which requires VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY env vars CI doesn't provide).
//
// Career emits this shape every time selectedTrack / effectiveExpandedId
// / drawerAppId change; the drawer forwards it verbatim to ai-chat,
// which sanitizes + fetches each entity scoped to the user's auth.
//
// Contract: every falsy entity ID is omitted so the server's sanitizer
// doesn't have to filter undefined/empty values.
export function buildCareerPageContext({ selectedTrack, roleId, applicationId }) {
  const ctx = { page: "Career" };
  if (selectedTrack) ctx.track = selectedTrack;
  if (roleId) ctx.role_id = roleId;
  if (applicationId) ctx.application_id = applicationId;
  return ctx;
}
