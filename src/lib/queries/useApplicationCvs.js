// useApplicationCvs.js — the user's saved CVs (master + tailored copies) that
// back the CV Studio's CV/job dropdown, plus a detail hook for one CV's data.
//
// Source of truth: public.application_cvs (RLS own-row). A generated CV
// (generate-tailored-cv / refine-cv) INSERTs a row here, so it surfaces in the
// dropdown automatically — no extra wiring on the studio side.
//
// List vs detail split: the dropdown only needs metadata + a label, NOT the
// heavy cv_data jsonb on every row. So the list query omits cv_data and joins
// the linked application for its role/company label; useCvData fetches the
// structured cv_data for the ONE selected CV the editor is showing.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { withDbTimeout } from "@/lib/withDbTimeout";

export const applicationCvsQueryKey = (userId) => ["applicationCvs", userId];
export const cvDataQueryKey = (cvId) => ["applicationCvs", "data", cvId];

// Dropdown list — newest first, deduped to the latest row per application
// (generation INSERTs a fresh row each time; we only surface the most recent
// per job). The single master row is always included; standalone tailored CVs
// (application_id null) are each kept. cv_data is intentionally NOT selected.
export async function fetchApplicationCvs(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("application_cvs")
    .select(
      "id, application_id, is_master, source_jd, cv_url, version, created_at, applications(role_title, company)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const seenApp = new Set();
  const out = [];
  for (const r of rows) {
    if (!r.is_master && r.application_id) {
      if (seenApp.has(r.application_id)) continue;
      seenApp.add(r.application_id);
    }
    out.push(toCvOption(r));
  }
  // Master first, then tailored by recency (the list is already newest-first).
  out.sort((a, b) => (a.isMaster === b.isMaster ? 0 : a.isMaster ? -1 : 1));
  return out;
}

// Shape the dropdown consumes — mirrors the preview's CV_OPTIONS so the studio
// renders identically against real data. label/sub/tag drive the menu rows;
// role/company drive the in-document "Tailored for …" context chip.
function toCvOption(row) {
  const app = Array.isArray(row.applications)
    ? row.applications[0]
    : row.applications;
  const role = app?.role_title ?? null;
  const company = app?.company ?? null;
  if (row.is_master) {
    return {
      id: row.id,
      isMaster: true,
      tag: "Master",
      label: "Master CV",
      sub: "Your full, untailored CV",
      role: null,
      company: null,
      cvUrl: row.cv_url ?? null,
      applicationId: null,
    };
  }
  return {
    id: row.id,
    isMaster: false,
    tag: "Tailored",
    label: role || "Tailored CV",
    sub: company ? `${company} · tailored copy` : "tailored copy",
    role,
    company,
    cvUrl: row.cv_url ?? null,
    applicationId: row.application_id ?? null,
  };
}

const fetchApplicationCvsWithTimeout = withDbTimeout(
  fetchApplicationCvs,
  "application_cvs",
);

export function useApplicationCvs(userId) {
  return useQuery({
    queryKey: applicationCvsQueryKey(userId),
    queryFn: () => fetchApplicationCvsWithTimeout(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
    // A CV generated elsewhere (the tracker's "Generate tailored CV") must show
    // up the moment the studio opens via the deep-link, so always refetch on mount.
    refetchOnMount: "always",
  });
}

// ── Tailoring support (CV Studio "Tailor to a job") ─────────────────────────
// The studio holds a tracked application as a "pending tailor target" when it
// has no tailored CV row yet (deep-link or explicit action). These two reads
// give the studio what application_cvs does not carry: the application's role/
// company label and its job_description (the JD source for generate-tailored-cv).

export const applicationForTailorQueryKey = (applicationId) => [
  "applicationForTailor",
  applicationId,
];
export const applicationsWithJdQueryKey = (userId) => [
  "applicationsWithJd",
  userId,
];

// One application's tailoring context. hasJd decides the 53/68-vs-15/68 branch:
// true → tailor straight away; false → the no-JD card (paste / pick).
export async function fetchApplicationForTailor(applicationId) {
  if (!applicationId) return null;
  const { data, error } = await supabase
    .from("applications")
    .select("id, role_title, company, job_description")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const jd = (data.job_description ?? "").trim();
  return {
    applicationId: data.id,
    role: data.role_title ?? null,
    company: data.company ?? null,
    jobDescription: jd || null,
    hasJd: jd.length > 0,
  };
}

const fetchApplicationForTailorWithTimeout = withDbTimeout(
  fetchApplicationForTailor,
  "applications",
);

export function useApplicationForTailor(applicationId) {
  return useQuery({
    queryKey: applicationForTailorQueryKey(applicationId),
    queryFn: () => fetchApplicationForTailorWithTimeout(applicationId),
    enabled: !!applicationId,
    staleTime: 60 * 1000,
  });
}

// The user's tracked applications that actually carry a JD — the picker in the
// no-JD card. Server-filters NULL, then drops whitespace-only client-side.
export async function fetchApplicationsWithJd(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("applications")
    .select("id, role_title, company, job_description")
    .eq("user_id", userId)
    .not("job_description", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((r) => (r.job_description ?? "").trim().length > 0)
    .map((r) => ({
      applicationId: r.id,
      role: r.role_title ?? "Untitled role",
      company: r.company ?? null,
      jobDescription: r.job_description,
    }));
}

const fetchApplicationsWithJdWithTimeout = withDbTimeout(
  fetchApplicationsWithJd,
  "applications",
);

// `enabled` lets the studio fetch the picker only while the no-JD card is open.
export function useApplicationsWithJd(userId, enabled = true) {
  return useQuery({
    queryKey: applicationsWithJdQueryKey(userId),
    queryFn: () => fetchApplicationsWithJdWithTimeout(userId),
    enabled: !!userId && enabled,
    staleTime: 60 * 1000,
  });
}

// Detail — the structured cv_data for the selected CV (what the editor renders
// and writes back to). Keyed by row id so switching CVs swaps cleanly.
export async function fetchCvData(cvId) {
  if (!cvId) return null;
  const { data, error } = await supabase
    .from("application_cvs")
    .select("id, cv_data, cv_url, application_id, is_master, version")
    .eq("id", cvId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

const fetchCvDataWithTimeout = withDbTimeout(fetchCvData, "application_cvs");

export function useCvData(cvId) {
  return useQuery({
    queryKey: cvDataQueryKey(cvId),
    queryFn: () => fetchCvDataWithTimeout(cvId),
    enabled: !!cvId,
    staleTime: 30 * 1000,
  });
}
