// Pure builders for the Career live-jobs (`career_jobs`) TanStack query.
// Extracted from Career.jsx so two contracts are unit-testable without
// rendering the page (which pulls supabaseClient + a dozen hooks):
//
//   1. CACHE-KEY CONTRACT — every value the queryFn passes to the RPC MUST
//      appear in the key. The "disappearing Track 1 jobs" bug was p_work_types
//      (from profile.work_type) being used in the queryFn but missing from the
//      key, so a stale work-type filter stayed cached.
//   2. ENABLED GATE — the query must not fire until profile + experiences +
//      educations have settled (jobsInputsReady), because seniorityFilter and
//      p_work_types derive from them; firing early caches a wrong list under
//      the transient early_career key.

// work_type ids, sorted so order-only differences don't bust the cache.
export function workTypesKeyPart(workType) {
  return (Array.isArray(workType) ? [...workType].sort() : []).join(",");
}

export function careerJobsQueryKey({
  userId,
  selectedTrack,
  titles,
  seniorityFilter,
  workType,
}) {
  return [
    "career_jobs",
    userId,
    selectedTrack,
    (titles || []).join("|"),
    (seniorityFilter || []).join(","),
    workTypesKeyPart(workType),
  ];
}

export function careerJobsEnabled({ userId, rolesLength, jobsInputsReady }) {
  return !!userId && rolesLength > 0 && !!jobsInputsReady;
}
