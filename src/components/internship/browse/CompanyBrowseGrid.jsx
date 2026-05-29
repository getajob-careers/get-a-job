import React from "react";
import CompanyBrowseCard from "./CompanyBrowseCard";

// Paginated grid — renders `pageSize` cards at a time. Load-more
// button only renders when there's actually more to show — closes the
// previously-open "Load more sticks around when nothing's left" bug.

export default function CompanyBrowseGrid({
  companies,
  scoresById,
  page,
  pageSize,
  onLoadMore,
  onCardClick,
}) {
  const total = companies.length;
  const visibleCount = Math.min(page * pageSize, total);
  const visible = companies.slice(0, visibleCount);
  const hasMore = visibleCount < total;

  if (total === 0) {
    return (
      <div className="brz-empty">
        <p className="brz-empty-title">No companies match these filters.</p>
        <p className="brz-empty-sub">Try removing a filter, or clear them all to see the full catalog.</p>
      </div>
    );
  }

  return (
    <>
      <p className="brz-result-count">
        Showing {visibleCount} of {total}
      </p>
      <div className="brz-grid">
        {visible.map((c) => (
          <CompanyBrowseCard
            key={c.id}
            company={c}
            score={scoresById.get(c.id)}
            onClick={onCardClick}
          />
        ))}
      </div>
      {hasMore && (
        <div className="brz-load-more">
          <button type="button" className="act-btn act-btn-outline" onClick={onLoadMore}>
            Load {Math.min(pageSize, total - visibleCount)} more
          </button>
        </div>
      )}
    </>
  );
}
