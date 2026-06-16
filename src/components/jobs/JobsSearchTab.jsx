import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Briefcase, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { scoreJobFit } from "@/lib/scoreJobFit";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import {
  applyFacetsAndRank,
  searchFacetsKey,
  buildLocationOptions,
} from "@/lib/jobsSearchFacets";
import { toggleSeniority } from "@/lib/unifiedJobsFilter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import JobCard from "./JobCard";

// Tab 2 "Search All Jobs" (PR B). Whole-corpus faceted search, PURE
// client-side per the locked design:
//   1. fetch the whole active-IL corpus ONCE (light projection, no
//      description — lazy-loaded on card expand), cached by react-query;
//   2. score every job ONCE against the profile, cached in a useMemo;
//   3. apply facets (seniority, work-type, function, location, track) as
//      client-side filters over the cached scored array and re-sort by fit —
//      NO re-fetch and NO re-score on facet change;
//   4. render a single fit-ranked list with band labels (no picks/stretch).
//
// Default (no facets) = the whole corpus, fit-ranked. Facets AND-compose.

// Light projection — only what scoreJobFit + the card need. NO `description`
// (11 MB across the corpus); lazy-loaded on card expand. ~1.7 MB total.
const CORPUS_SELECT =
  "id, ats_source, external_id, title, company_name, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence";

// PostgREST page size for the corpus fetch — must be ≤ the project's
// db-max-rows (Supabase default 1000) or pages truncate silently.
const CORPUS_FETCH_PAGE = 1000;
const SEARCH_PAGE = 24;
const SENIORITY_CHIPS = [
  ["entry", "Entry"],
  ["mid", "Mid"],
  ["senior", "Senior"],
];
const WORK_TYPE_CHIPS = [
  ["remote_ok", "Remote OK"],
  ["onsite_only", "On-site only"],
];
// Top-volume families only (the long tail is hidden — empty options are dead
// ends). Admin_GA stays selectable here: in SEARCH the user's explicit pick
// governs (it's only excluded from the Tab-1 early-career widening).
const FAMILY_OPTIONS = [
  ["", "All functions"],
  ["Engineering", "Engineering"],
  ["Product", "Product"],
  ["Data", "Data"],
  ["Design_UX", "Design & UX"],
  ["AI_ML", "AI & ML"],
  ["IT_Security", "IT & Security"],
  ["Sales", "Sales"],
  ["Marketing", "Marketing"],
  ["Customer_Experience", "Customer Experience"],
  ["Support", "Support"],
  ["Operations", "Operations"],
  ["Finance", "Finance"],
  ["Consulting", "Consulting"],
  ["HR_People", "HR & People"],
  ["Admin_GA", "Admin & GA"],
];
const TRACK_CHIPS = [
  ["track_1", "Track 1"],
  ["track_2", "Track 2"],
  ["track_3", "Track 3"],
];

export default function JobsSearchTab({ profile, experiences, educations }) {
  // 1. Whole active-IL corpus, fetched ONCE, light projection, cached. Fires
  //    only when this tab mounts (the user opted into Search), and is reused
  //    across tab switches via the react-query cache.
  const {
    data: corpus = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["jobsCorpusLight"],
    queryFn: async () => {
      // Paginate in PostgREST-cap-sized pages: a bare unbounded select
      // silently truncates at db-max-rows (Supabase default 1000), so we'd
      // miss most of the ~4,200-row corpus. Loop until a short page.
      const all = [];
      let from = 0;
      for (;;) {
        const { data, error: qErr } = await supabase
          .from("jobs")
          .select(CORPUS_SELECT)
          .eq("is_il", true)
          .eq("is_active", true)
          .order("date_posted", { ascending: false, nullsFirst: false })
          .range(from, from + CORPUS_FETCH_PAGE - 1);
        if (qErr) throw qErr;
        all.push(...(data || []));
        if (!data || data.length < CORPUS_FETCH_PAGE) break;
        from += CORPUS_FETCH_PAGE;
      }
      return all;
    },
    enabled: !!profile,
    staleTime: 10 * 60 * 1000,
  });

  // 2. Score every job ONCE. Recomputes only when the corpus or profile
  //    changes — NOT on facet change.
  const scored = useMemo(() => {
    if (!profile || corpus.length === 0) return [];
    return corpus.map((job) => ({
      job,
      score: scoreJobFit({ profile, experiences, educations }, job),
    }));
  }, [corpus, profile, experiences, educations]);

  // 3. Facet state. PR B: seniority + work-type (track/family/location → PR C).
  const [seniorities, setSeniorities] = useState([]); // [] = no filter (all)
  const [workTypeMode, setWorkTypeMode] = useState("remote_ok"); // default = all
  const [family, setFamily] = useState(""); // "" = all functions
  const [location, setLocation] = useState(""); // "" = anywhere
  const [track, setTrack] = useState(null); // null = all tracks

  // Location picker options derived from the ALREADY-cached corpus (no extra
  // query): every real city with its live count + the region groups.
  const locationOptions = useMemo(() => buildLocationOptions(corpus), [corpus]);

  // 4. Filter + rank over the cached scored set. Re-runs only on facet/scored
  //    change (no re-fetch, no re-score).
  const facets = { seniorities, workTypeMode, track, family, location };
  const ranked = useMemo(
    () => applyFacetsAndRank(scored, facets),
    [scored, seniorities, workTypeMode, track, family, location],
  );

  // 5. Client-side pagination; reset to the first page when facets change.
  const facetsKey = searchFacetsKey(facets);
  const hasActiveFacets =
    seniorities.length > 0 ||
    workTypeMode !== "remote_ok" ||
    track !== null ||
    family !== "" ||
    location !== "";
  const clearFacets = () => {
    setSeniorities([]);
    setWorkTypeMode("remote_ok");
    setTrack(null);
    setFamily("");
    setLocation("");
  };
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE);
  useEffect(() => {
    setVisibleCount(SEARCH_PAGE);
  }, [facetsKey]);
  const visible = ranked.slice(0, visibleCount);

  if (!profile) {
    return (
      <div className="rounded-[18px] border border-rd-border bg-rd-bg-soft px-6 py-10 text-center text-[13px] text-rd-text-secondary">
        Complete your onboarding first so we can rank jobs for you.
      </div>
    );
  }

  return (
    <div>
      {/* Facets */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary mr-0.5">
            Seniority
          </span>
          {SENIORITY_CHIPS.map(([value, label]) => {
            const on = seniorities.includes(value);
            return (
              <FacetChip
                key={value}
                label={label}
                active={on}
                onClick={() =>
                  setSeniorities(toggleSeniority(seniorities, value))
                }
              />
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary mr-0.5">
            Work type
          </span>
          <div className="inline-flex rounded-full bg-rd-bg-soft p-0.5">
            {WORK_TYPE_CHIPS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={workTypeMode === value}
                onClick={() => setWorkTypeMode(value)}
                className={`inline-flex items-center text-[12px] font-display font-semibold rounded-full px-3 py-1 transition-colors ${
                  workTypeMode === value
                    ? "bg-rd-coral text-white"
                    : "text-rd-text-secondary hover:text-rd-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary mr-0.5">
            Function
          </span>
          <FacetSelect value={family} onChange={setFamily} options={FAMILY_OPTIONS} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary mr-0.5">
            Location
          </span>
          <LocationCombobox value={location} onChange={setLocation} options={locationOptions} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary mr-0.5">
            Track
          </span>
          {TRACK_CHIPS.map(([value, label]) => (
            <FacetChip
              key={value}
              label={label}
              active={track === value}
              onClick={() => setTrack(track === value ? null : value)}
            />
          ))}
        </div>
        {hasActiveFacets && (
          <button
            type="button"
            onClick={clearFacets}
            className="text-[12px] font-display font-semibold text-rd-coral-dark hover:text-rd-coral underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Count */}
      <div className="mb-4">
        <p className="font-display font-bold text-[15px] text-rd-text">
          {isLoading
            ? "Loading the board…"
            : `${ranked.length} job${ranked.length === 1 ? "" : "s"} match, best fit first`}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
          Couldn&rsquo;t load the board — try again.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-12 shadow-rd text-center">
          <Loader2 className="w-6 h-6 animate-spin text-rd-text-secondary mx-auto mb-2" />
          <p className="text-[13px] text-rd-text-secondary">
            Scoring the board against your profile…
          </p>
        </div>
      ) : ranked.length === 0 ? (
        // Honest-empty for a zero-result facet stack (e.g. Entry + On-site +
        // a thin region in PR C). Same pattern as JobsEmpty.
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-10 shadow-rd text-center">
          <Briefcase className="w-10 h-10 text-rd-coral mx-auto mb-3" />
          <p className="text-[14px] font-display font-bold text-rd-text">
            No jobs match these filters.
          </p>
          <p className="text-[12.5px] text-rd-text-secondary mt-1.5 max-w-md mx-auto leading-[1.55]">
            Try removing a filter to widen the search.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map(({ job, score }) => {
              const trackRdColor = score?.track
                ? TRACK_CONFIG[score.track]?.rdColor
                : null;
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  scoreResult={score}
                  trackColor={trackRdColor}
                  showAttainabilityBand
                  lazyDescription
                />
              );
            })}
          </div>
          {visibleCount < ranked.length && (
            <div className="text-center mt-7">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + SEARCH_PAGE)}
                className="inline-flex items-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-5 py-2.5 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Searchable single-select location picker (no volume cutoff): every real city
// in the corpus (district tags excluded) plus the region groups, each with its
// live count. Type-ahead via cmdk so the ~31 cities aren't an unwieldy list.
function LocationCombobox({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const all = [
    { key: "", label: "Anywhere", count: null },
    ...options.regions,
    ...options.cities,
  ];
  const current = all.find((o) => o.key === value) || {
    label: value || "Anywhere",
    count: null,
  };
  const select = (key) => {
    onChange(key);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-[12px] font-display font-semibold rounded-full bg-rd-bg-soft text-rd-text px-3 py-1 border border-rd-border hover:border-rd-coral focus:outline-none"
        >
          {current.label}
          {current.count != null && (
            <span className="text-rd-text-tertiary">({current.count})</span>
          )}
          <ChevronsUpDown className="w-3 h-3 text-rd-text-tertiary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px]" align="start">
        <Command>
          <CommandInput placeholder="Search a city or area…" />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup heading="Areas">
              <ComboItem
                opt={{ key: "", label: "Anywhere", count: null }}
                value={value}
                onSelect={select}
              />
              {options.regions.map((r) => (
                <ComboItem key={r.key} opt={r} value={value} onSelect={select} />
              ))}
            </CommandGroup>
            <CommandGroup heading="Cities">
              {options.cities.map((c) => (
                <ComboItem key={c.key} opt={c} value={value} onSelect={select} />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ComboItem({ opt, value, onSelect }) {
  return (
    <CommandItem
      value={opt.label}
      onSelect={() => onSelect(opt.key)}
      className="text-[13px]"
    >
      <Check
        className={`w-3.5 h-3.5 mr-1.5 ${value === opt.key ? "opacity-100" : "opacity-0"}`}
      />
      <span>{opt.label}</span>
      {opt.count != null && (
        <span className="ml-auto text-[11px] text-rd-text-tertiary">
          {opt.count}
        </span>
      )}
    </CommandItem>
  );
}

function FacetSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[12px] font-display font-semibold rounded-full bg-rd-bg-soft text-rd-text px-2.5 py-1 border border-rd-border focus:outline-none focus:border-rd-coral"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function FacetChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center text-[12px] font-display font-semibold rounded-full px-2.5 py-1 transition-colors ${
        active
          ? "bg-rd-coral text-white"
          : "bg-rd-bg-soft text-rd-text-secondary hover:text-rd-text"
      }`}
    >
      {label}
    </button>
  );
}
