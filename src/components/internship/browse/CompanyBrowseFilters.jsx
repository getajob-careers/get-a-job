import React, { useMemo } from "react";
import { Search, X } from "lucide-react";
import {
  INDUSTRY_FILTERS,
  STAGE_FILTERS,
  LOCATION_FILTERS,
  ORIGIN_FILTERS,
} from "./filterConfig";
import { SIZE_BUCKETS } from "./sizeBuckets";
import { facetCounts } from "./applyFilters";

// Filter bar: search input + 5 pill rows + faceted counts + clear-all.
// Counts update live as filters narrow — for each pill, the count is
// "how many companies would I see if I clicked this pill alone in
// this row (other rows stay as-is)". Standard faceted-search semantic.
//
// Toggle: clicking an active pill removes it; clicking inactive adds it.
// Multiple pills in one row = OR; across rows = AND.

function Pill({ active, count, onClick, children }) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center gap-1 px-3 py-1 rounded-full border font-body text-[12px] cursor-pointer transition-colors whitespace-nowrap",
        active
          ? "bg-rd-coral text-white border-rd-coral font-display font-semibold"
          : "bg-rd-bg-card text-rd-text-secondary border-rd-border font-medium hover:border-rd-border-hover hover:text-rd-text",
      ].join(" ")}
      data-selected={active ? "true" : "false"}
      onClick={onClick}
      disabled={count === 0 && !active}
      style={count === 0 && !active ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
    >
      <span>{children}</span>
      <span className="brz-count" aria-hidden="true">({count})</span>
    </button>
  );
}

function FilterRow({ label, axis, axisValues, getId, getLabel, filters, setFilters, companies, search, scoresById }) {
  const counts = useMemo(
    () => facetCounts({ companies, filters, search, scoresById, axis, axisValues: axisValues.map(getId) }),
    [companies, filters, search, scoresById, axis, axisValues, getId],
  );
  const toggle = (id) => {
    setFilters((prev) => {
      const next = { ...prev };
      const setCopy = new Set(prev[axis]);
      if (setCopy.has(id)) setCopy.delete(id);
      else setCopy.add(id);
      next[axis] = setCopy;
      return next;
    });
  };
  return (
    <div className="brz-filter-row">
      <span className="brz-filter-row-label">{label}</span>
      {axisValues.map((v) => {
        const id = getId(v);
        const active = filters[axis].has(id);
        const count = counts.get(id) ?? 0;
        return (
          <Pill key={id} active={active} count={count} onClick={() => toggle(id)}>
            {getLabel(v)}
          </Pill>
        );
      })}
    </div>
  );
}

export default function CompanyBrowseFilters({
  filters,
  setFilters,
  search,
  setSearch,
  companies,
  scoresById,
  onClear,
}) {
  const anyActive =
    filters.industry.size > 0 ||
    filters.stage.size > 0 ||
    filters.size.size > 0 ||
    filters.location.size > 0 ||
    filters.origin.size > 0 ||
    (search?.length ?? 0) > 0;

  const stringId = (v) => v;
  const stringLabel = (v) => v;

  return (
    <div className="brz-filter-bar">
      <div className="brz-search-row">
        <div className="brz-search" style={{ position: "relative" }}>
          <Search
            className="w-4 h-4 text-rd-text-tertiary"
            aria-hidden="true"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="search"
            className="w-full px-3.5 py-2.5 rounded-[14px] border border-rd-border bg-rd-bg-card text-rd-text font-body text-[14px] placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]"
            placeholder="Search by name, sector, or industry"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
            aria-label="Search companies"
          />
        </div>
        {anyActive && (
          <button type="button" className="brz-clear" onClick={onClear}>
            <X className="w-3 h-3" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      <FilterRow
        label="Industry"
        axis="industry"
        axisValues={INDUSTRY_FILTERS}
        getId={stringId}
        getLabel={stringLabel}
        filters={filters}
        setFilters={setFilters}
        companies={companies}
        search={search}
        scoresById={scoresById}
      />
      <FilterRow
        label="Stage"
        axis="stage"
        axisValues={STAGE_FILTERS}
        getId={stringId}
        getLabel={stringLabel}
        filters={filters}
        setFilters={setFilters}
        companies={companies}
        search={search}
        scoresById={scoresById}
      />
      <FilterRow
        label="Size"
        axis="size"
        axisValues={SIZE_BUCKETS}
        getId={(b) => b.id}
        getLabel={(b) => b.label}
        filters={filters}
        setFilters={setFilters}
        companies={companies}
        search={search}
        scoresById={scoresById}
      />
      <FilterRow
        label="Location"
        axis="location"
        axisValues={LOCATION_FILTERS}
        getId={stringId}
        getLabel={stringLabel}
        filters={filters}
        setFilters={setFilters}
        companies={companies}
        search={search}
        scoresById={scoresById}
      />
      <FilterRow
        label="Origin"
        axis="origin"
        axisValues={ORIGIN_FILTERS}
        getId={(o) => o.id}
        getLabel={(o) => o.label}
        filters={filters}
        setFilters={setFilters}
        companies={companies}
        search={search}
        scoresById={scoresById}
      />
    </div>
  );
}
