import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Briefcase,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
import JobGridCard from "./JobGridCard";
import JobDetailModal from "./JobDetailModal";

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
  ["onsite", "On-site"],
  ["remote", "Remote"],
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
// Persisted across remounts (tab switches unmount this component) so a user who
// collapsed the filters doesn't get them re-expanded when they jump away and back.
let filtersOpenPref = true;

export default function JobsSearchTab({
  profile,
  experiences,
  educations,
  singleColumn = false,
  initialKeyword = "",
}) {
  // 1. Whole active-IL corpus, light projection, cached. Loaded PROGRESSIVELY
  //    so the user sees results fast instead of waiting for all ~4,200 rows:
  //    a quick first-page query paints in one round-trip (~350ms), while the
  //    full-corpus query fills in the rest in the background. We render
  //    whichever is larger, so the list seamlessly grows as the rest arrive.
  //    (Both fire only when the Search tab mounts; cached across tab switches.)
  const fetchPage = async (from) => {
    const { data, error: qErr } = await supabase
      .from("jobs")
      .select(CORPUS_SELECT)
      .eq("is_il", true)
      .eq("is_active", true)
      .order("date_posted", { ascending: false, nullsFirst: false })
      .range(from, from + CORPUS_FETCH_PAGE - 1);
    if (qErr) throw qErr;
    return data || [];
  };

  const { data: firstPage = [], isLoading: firstLoading, error: firstError } = useQuery({
    queryKey: ["jobsCorpusFirstPage"],
    queryFn: () => fetchPage(0),
    enabled: !!profile,
    staleTime: 10 * 60 * 1000,
  });

  const { data: fullCorpus = [], error: fullError } = useQuery({
    queryKey: ["jobsCorpusLight"],
    queryFn: async () => {
      // Paginate in PostgREST-cap-sized pages: a bare unbounded select
      // silently truncates at db-max-rows (Supabase default 1000).
      const all = [];
      let from = 0;
      for (;;) {
        const page = await fetchPage(from);
        all.push(...page);
        if (page.length < CORPUS_FETCH_PAGE) break;
        from += CORPUS_FETCH_PAGE;
      }
      return all;
    },
    enabled: !!profile,
    staleTime: 10 * 60 * 1000,
  });

  // Render the fuller of the two; spinner only blocks until the first page.
  const corpus = fullCorpus.length > firstPage.length ? fullCorpus : firstPage;
  const isLoading = firstLoading && corpus.length === 0;
  const error = firstError || fullError;

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
  // Seeded from initialKeyword for the /Career?role= deep link (PR3); "" = no
  // keyword filter. One-time seed (useState initializer) — the user can clear
  // or edit it freely afterward without the URL param re-applying.
  const [keyword, setKeyword] = useState(initialKeyword);
  const [seniorities, setSeniorities] = useState([]); // [] = no filter (all)
  const [workTypes, setWorkTypes] = useState([]); // [] = no filter (all)
  const [family, setFamily] = useState(""); // "" = all functions
  const [location, setLocation] = useState(""); // "" = anywhere
  const [track, setTrack] = useState(null); // null = all tracks
  // Filter bar (search + facets) is collapsible to reclaim vertical space;
  // the open/closed choice persists across remounts (see filtersOpenPref).
  const [filtersOpen, setFiltersOpen] = useState(filtersOpenPref);

  // Location picker options derived from the ALREADY-cached corpus (no extra
  // query): every real city with its live count + the region groups.
  const locationOptions = useMemo(() => buildLocationOptions(corpus), [corpus]);

  // 4. Filter + rank over the cached scored set. Re-runs only on facet/scored
  //    change (no re-fetch, no re-score).
  const facets = { keyword, seniorities, workTypes, track, family, location };
  const ranked = useMemo(
    () => applyFacetsAndRank(scored, facets),
    [scored, keyword, seniorities, workTypes, track, family, location],
  );

  // 5. Client-side pagination; reset to the first page when facets change.
  const facetsKey = searchFacetsKey(facets);
  const hasActiveFacets =
    keyword.trim() !== "" ||
    seniorities.length > 0 ||
    workTypes.length > 0 ||
    track !== null ||
    family !== "" ||
    location !== "";
  const activeFilterCount =
    (keyword.trim() !== "" ? 1 : 0) +
    (seniorities.length > 0 ? 1 : 0) +
    (workTypes.length > 0 ? 1 : 0) +
    (family !== "" ? 1 : 0) +
    (location !== "" ? 1 : 0);
  const clearFacets = () => {
    setKeyword("");
    setSeniorities([]);
    setWorkTypes([]);
    setTrack(null);
    setFamily("");
    setLocation("");
  };
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE);
  const [openJob, setOpenJob] = useState(null);
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
      {/* Search + facets stick to the top of the scrolling jobs column, just
          below the sticky tab bar, so the filters stay while results scroll.
          Collapsible to reclaim vertical space for the results. */}
      <div className="md:sticky md:top-[48px] md:z-[9] md:bg-rd-bg-page md:pt-2">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => { filtersOpenPref = !o; return !o; })}
          aria-expanded={filtersOpen}
          className="inline-flex items-center gap-2 font-display font-bold text-[13px] text-rd-text-secondary hover:text-rd-text transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rd-coral-tint text-[10.5px] font-semibold text-rd-coral-dark tabular-nums">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          />
        </button>
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
      {filtersOpen && (
      <>
      {/* Keyword — match-as-you-type over the cached corpus (title + company
          only; description is lazy-loaded, out of scope). AND-composes with
          the facets below. */}
      <div className="flex items-center gap-2.5 rounded-[14px] border border-rd-border bg-rd-bg-card px-4 py-2.5 shadow-rd mb-3">
        <Search className="w-4 h-4 text-rd-text-tertiary flex-shrink-0" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search title or company…"
          className="flex-1 bg-transparent border-0 outline-none text-[13.5px] text-rd-text placeholder:text-rd-text-tertiary"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword("")}
            aria-label="Clear keyword"
            className="p-1 rounded-full hover:bg-rd-bg-soft text-rd-text-tertiary hover:text-rd-text transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

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
          {WORK_TYPE_CHIPS.map(([value, label]) => (
            <FacetChip
              key={value}
              label={label}
              active={workTypes.includes(value)}
              onClick={() => setWorkTypes(toggleSeniority(workTypes, value))}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary mr-0.5">
            Function
          </span>
          <FacetSelect
            value={family}
            onChange={setFamily}
            options={FAMILY_OPTIONS}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary mr-0.5">
            Location
          </span>
          <LocationCombobox
            value={location}
            onChange={setLocation}
            options={locationOptions}
          />
        </div>
      </div>
      </>
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
          Couldn&rsquo;t load the board - try again.
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
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {visible.map(({ job, score }) => {
              const trackRdColor = score?.track
                ? TRACK_CONFIG[score.track]?.rdColor
                : null;
              return (
                <JobGridCard
                  key={job.id}
                  job={job}
                  scoreResult={score}
                  trackColor={trackRdColor}
                  unified
                  onOpen={(j, s) => setOpenJob({ job: j, scoreResult: s, trackColor: trackRdColor })}
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
          {openJob && (
            <JobDetailModal
              job={openJob.job}
              scoreResult={openJob.scoreResult}
              trackColor={openJob.trackColor}
              unified
              onClose={() => setOpenJob(null)}
            />
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
                <ComboItem
                  key={r.key}
                  opt={r}
                  value={value}
                  onSelect={select}
                />
              ))}
            </CommandGroup>
            <CommandGroup heading="Cities">
              {options.cities.map((c) => (
                <ComboItem
                  key={c.key}
                  opt={c}
                  value={value}
                  onSelect={select}
                />
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
