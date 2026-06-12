// PR-B2 Career page-context shape — pure helper consumed by Career.jsx
// inside its useEffect and re-tested in isolation via
// src/test/career-page-context.test.js. Lives outside Career.jsx so the
// test can import it without dragging Career's supabaseClient
// transitive import chain (which requires VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY env vars CI doesn't provide).
//
// Career emits this shape every time selectedTrack / effectiveExpandedId
// / drawerAppId / the visible job+role id lists change; the drawer forwards
// it verbatim to ai-chat, which sanitizes + fetches each entity scoped to
// the user's auth.
//
// Contract: every falsy entity ID is omitted so the server's sanitizer
// doesn't have to filter undefined/empty values.
//
// B3 (visible-list IDs): visible_items carries the ORDERED ids of the lists
// currently rendered (jobs pane + roadmap roles) so the agent can answer
// "which one on this page is best" from the real list instead of guessing.
// THRASH FIX: AgentDrawerContext.setPageContext does a shallow-equal guard by
// reference, so a fresh visible_items array every render would thrash state.
// We memoize the visible_items array behind a stable key (the joined ids), so
// the SAME array reference is returned while the ids are unchanged. The memo
// lives here (the producer), not in the shared setPageContext guard.

let _viCache = { key: null, value: undefined };

function buildVisibleItems({ visibleJobIds, visibleRoleIds }) {
  const jobIds = Array.isArray(visibleJobIds) ? visibleJobIds : [];
  const roleIds = Array.isArray(visibleRoleIds) ? visibleRoleIds : [];
  if (jobIds.length === 0 && roleIds.length === 0) return undefined;
  // Stable key from content + order. Same key → same array reference.
  const key = `job:${jobIds.join(",")}|role:${roleIds.join(",")}`;
  if (key === _viCache.key) return _viCache.value;
  const lists = [];
  if (jobIds.length) lists.push({ type: "job", ids: jobIds });
  if (roleIds.length) lists.push({ type: "role", ids: roleIds });
  _viCache = { key, value: lists };
  return lists;
}

export function buildCareerPageContext({
  selectedTrack,
  roleId,
  applicationId,
  visibleJobIds,
  visibleRoleIds,
}) {
  const ctx = { page: "Career" };
  if (selectedTrack) ctx.track = selectedTrack;
  if (roleId) ctx.role_id = roleId;
  if (applicationId) ctx.application_id = applicationId;
  const visibleItems = buildVisibleItems({ visibleJobIds, visibleRoleIds });
  if (visibleItems) ctx.visible_items = visibleItems;
  return ctx;
}
