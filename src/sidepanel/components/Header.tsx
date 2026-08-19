import { headerStatus } from "../../lib/utils/format";
import type { TrackFilters } from "../../lib/types/track";

interface HeaderProps {
  title: string;
  refreshing: boolean;
  showExtractionHelp: boolean;
  hasSnapshot: boolean;
  source?: string;
  trackCount: number;
  visibleCount: number;
  filtersActive: boolean;
  canExport: boolean;
  canDownloadReport: boolean;
  filters: TrackFilters;
  exclusiveCount: number;
  hypeCount: number;
  onResetFilters: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onDownloadReport: () => void;
  onTitleQueryChange: (value: string) => void;
  onToggleExclusive: () => void;
  onToggleHype: () => void;
}

export function Header({
  title,
  refreshing,
  showExtractionHelp,
  hasSnapshot,
  source,
  trackCount,
  visibleCount,
  filtersActive,
  canExport,
  canDownloadReport,
  filters,
  exclusiveCount,
  hypeCount,
  onResetFilters,
  onRefresh,
  onExport,
  onDownloadReport,
  onTitleQueryChange,
  onToggleExclusive,
  onToggleHype,
}: HeaderProps) {
  const status = headerStatus({
    refreshing,
    showExtractionHelp,
    hasSnapshot,
    source,
    trackCount,
    visibleCount,
    filtersActive,
  });

  return (
    <header className="panel-card header-card">
      <div>
        <p className="eyebrow">Beatport Analyst</p>
        <h1 className="header-title">{title}</h1>
        <p className="muted">{status}</p>
      </div>
      <div className="header-actions">
        {filtersActive ? (
          <button onClick={onResetFilters} type="button">
            Reset filters
          </button>
        ) : null}
        <button disabled={refreshing} onClick={onRefresh} type="button">
          {refreshing ? "Reloading…" : "Refresh"}
        </button>
        <button onClick={onExport} disabled={!canExport} type="button">
          Export CSV
        </button>
        <button onClick={onDownloadReport} disabled={!canDownloadReport} type="button">
          Download report
        </button>
      </div>
      {trackCount ? (
        <div className="header-filters">
          <label className="header-search">
            <span className="visually-hidden">
              Search title, mix, or artists
            </span>
            <input
              type="search"
              value={filters.titleQuery}
              onChange={(event) => onTitleQueryChange(event.target.value)}
              placeholder="Search title, mix, artists"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="header-filter-chips">
            <button
              type="button"
              className={`brief-chip${filters.includeExclusiveOnly ? " selected" : ""}`}
              aria-pressed={filters.includeExclusiveOnly}
              disabled={exclusiveCount === 0 && !filters.includeExclusiveOnly}
              onClick={onToggleExclusive}
            >
              Exclusive
            </button>
            <button
              type="button"
              className={`brief-chip${filters.includeHypeOnly ? " selected" : ""}`}
              aria-pressed={filters.includeHypeOnly}
              disabled={hypeCount === 0 && !filters.includeHypeOnly}
              onClick={onToggleHype}
            >
              Hype
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
