import { cleanPageTitle } from "../../lib/export/report";
import type { ExtractionErrorState } from "../../lib/messaging/protocol";
import type { ExtractionSnapshot } from "../../lib/types/track";
import { headerStatus } from "../../lib/utils/format";
import type { TrackAnalysis } from "../hooks/useTrackAnalysis";
import { AboutHelpButton } from "./AboutHelp";

export interface HeaderProps {
  snapshot: ExtractionSnapshot | null;
  extractionError: ExtractionErrorState | null;
  analysis: TrackAnalysis;
  refreshing: boolean;
  showExtractionHelp: boolean;
  onRefresh: () => void;
}

export function Header({
  snapshot,
  extractionError,
  analysis,
  refreshing,
  showExtractionHelp,
  onRefresh,
}: HeaderProps) {
  const { tracks, sortedTracks, filtersActive, filters, stats } = analysis;
  const title = snapshot?.pageTitle
    ? cleanPageTitle(snapshot.pageTitle)
    : extractionError?.pageTitle
      ? cleanPageTitle(extractionError.pageTitle)
      : "Open a Beatport track list page";
  const status = headerStatus({
    refreshing,
    showExtractionHelp,
    hasSnapshot: Boolean(snapshot),
    source: snapshot?.source,
    trackCount: tracks.length,
    visibleCount: sortedTracks.length,
    filtersActive,
  });

  return (
    <header className="panel-card header-card">
      <div>
        <div className="header-brand">
          <p className="eyebrow">Beatport Analyst</p>
          <AboutHelpButton />
        </div>
        <h1 className="header-title">{title}</h1>
        <p className="muted">{status}</p>
      </div>
      <div className="header-actions">
        {filtersActive ? (
          <button onClick={analysis.resetFilters} type="button">
            Reset filters
          </button>
        ) : null}
        <button disabled={refreshing} onClick={onRefresh} type="button">
          {refreshing ? "Reloading…" : "Refresh"}
        </button>
        <button
          onClick={analysis.exportCsv}
          disabled={!sortedTracks.length}
          type="button"
        >
          Export CSV
        </button>
        <button
          onClick={analysis.downloadReport}
          disabled={!tracks.length}
          type="button"
        >
          Download report
        </button>
      </div>
      {tracks.length ? (
        <div className="header-filters">
          <label className="header-search">
            <span className="visually-hidden">
              Search title, mix, or artists
            </span>
            <input
              type="search"
              value={filters.titleQuery}
              onChange={(event) => analysis.setTitleQuery(event.target.value)}
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
              disabled={stats.exclusiveCount === 0 && !filters.includeExclusiveOnly}
              onClick={analysis.toggleExclusive}
            >
              Exclusive
            </button>
            <button
              type="button"
              className={`brief-chip${filters.includeHypeOnly ? " selected" : ""}`}
              aria-pressed={filters.includeHypeOnly}
              disabled={stats.hypeCount === 0 && !filters.includeHypeOnly}
              onClick={analysis.toggleHype}
            >
              Hype
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
