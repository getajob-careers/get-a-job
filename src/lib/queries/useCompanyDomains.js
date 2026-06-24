// useCompanyDomains — a cached company → domain lookup for rendering real
// company logos on job cards.
//
// The jobs rows carry company_slug + company_name but no domain. The
// companies table (RLS: "Authenticated view all companies") holds the
// registry domain on every row, joinable to jobs by ats_slug
// (companies.ats_slug ↔ jobs.company_slug — see the column comment in
// 20260529_companies_registry_columns.sql) with a normalized-name fallback
// for rows whose slug didn't match.
//
// One small query for the whole authenticated session: ~1k rows of three
// short text fields, cached a day. Every JobCard subscribes to the same
// queryKey so the fetch happens once and all cards read the shared result.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

// Reduce a display name to a comparable key: lowercase, drop legal
// suffixes + all punctuation. "Monday.com Ltd." → "mondaycom".
function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|limited|corp|corporation|gmbh|co|plc|sa|ag)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Pure resolver — given the maps from useCompanyDomains and a job row,
// return the bare domain ("monday.com") or null. Slug match wins (precise);
// normalized-name match is the fallback.
export function companyDomainFor(domains, job) {
  if (!domains || !job) return null;
  const slug = (job.company_slug || "").toLowerCase();
  if (slug && domains.bySlug[slug]) return domains.bySlug[slug];
  const nameKey = normalizeName(job.company_name);
  if (nameKey && domains.byName[nameKey]) return domains.byName[nameKey];
  return null;
}

export function useCompanyDomains() {
  return useQuery({
    queryKey: ["company_domains"],
    queryFn: async () => {
      const bySlug = {};
      const byName = {};
      // PostgREST caps a single response at ~1000 rows; the companies
      // registry is larger, so page through with .range() until exhausted.
      // Without this the map silently dropped every company past row 1000.
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("companies")
          .select("ats_slug, name, domain")
          .not("domain", "is", null)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const c of data) {
          const domain = (c.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
          if (!domain) continue;
          if (c.ats_slug) bySlug[c.ats_slug.toLowerCase()] = domain;
          const nk = normalizeName(c.name);
          // First writer wins so a curated row isn't overwritten by a
          // noisier duplicate; both are domain-equal in practice.
          if (nk && !byName[nk]) byName[nk] = domain;
        }
        if (data.length < PAGE) break;
      }
      return { bySlug, byName };
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
