import type { FilterListKey, TrackSort, TrackSortColumn } from "../../lib/analysis/filters";
import type { TrackStats } from "../../lib/analysis/stats";
import type { KeyNotation } from "../../lib/messaging/protocol";
import type { Track, TrackFilters } from "../../lib/types/track";
import {
  bpmBucketRangeLabel,
  bpmBucketStartLabel,
  formatBpm,
  formatBpmRange,
} from "../../lib/utils/format";
import { scopedFacetFromPageUrl } from "../../lib/utils/page";
import { ColumnHistogram, CountTable, DistributionChart, KeyHistogram } from "./charts";
import { MarketBrief } from "./MarketBrief";
import { TrackTable } from "./TrackTable";
import { FilterChips, StatCard } from "./ui";

export function AnalysisView({
  tracks,
  stats,
  filteredStats,
  sortedTracks,
  filters,
  sort,
  keyNotation,
  listCount,
  complete,
  pageUrl,
  currentTrackId,
  playing,
  onKeyNotationChange,
  onToggleFilter,
  onClearFilter,
  onToggleExclusive,
  onToggleHype,
  onToggleFreshness,
  onSort,
  onPlayTrack,
}: {
  tracks: Track[];
  stats: TrackStats;
  filteredStats: TrackStats;
  sortedTracks: Track[];
  filters: TrackFilters;
  sort: TrackSort;
  keyNotation: KeyNotation;
  listCount?: number | null;
  complete?: boolean;
  pageUrl?: string | null;
  currentTrackId: number | null;
  playing: boolean;
  onKeyNotationChange: (notation: KeyNotation) => void;
  onToggleFilter: (key: FilterListKey, value: string) => void;
  onClearFilter: (key: FilterListKey) => void;
  onToggleExclusive: () => void;
  onToggleHype: () => void;
  onToggleFreshness: (days: 7 | 30) => void;
  onSort: (column: TrackSortColumn) => void;
  onPlayTrack: (track: Track) => void;
}) {
  const scopedFacet = scopedFacetFromPageUrl(pageUrl);
  const showGenrePanel = scopedFacet !== "genre" && stats.genreDistribution.length > 1;
  const showLabelPanel = scopedFacet !== "label" && stats.labelDistribution.length > 1;
  const showArtistPanel = scopedFacet !== "artist" && stats.artistDistribution.length > 1;

  return (
    <>
      <MarketBrief
        stats={stats}
        trackCount={tracks.length}
        listCount={listCount}
        complete={complete}
        exclusiveOnly={filters.includeExclusiveOnly}
        hypeOnly={filters.includeHypeOnly}
        mixTypes={filters.mixTypes}
        publishedWithinDays={filters.publishedWithinDays}
        keyNotation={keyNotation}
        scopedFacet={scopedFacet}
        onToggleExclusive={onToggleExclusive}
        onToggleHype={onToggleHype}
        onToggleMixType={(mixType) => onToggleFilter("mixTypes", mixType)}
        onToggleFreshness={onToggleFreshness}
      />

      <ColumnHistogram
        title="BPM"
        items={stats.bpmHistogram}
        formatLabel={bpmBucketStartLabel}
        selectedLabels={new Set(filters.bpmBuckets)}
        onToggle={(label) => onToggleFilter("bpmBuckets", label)}
        headerExtra={
          <FilterChips
            values={filters.bpmBuckets}
            formatValue={bpmBucketRangeLabel}
            onRemove={(label) => onToggleFilter("bpmBuckets", label)}
            onReset={() => onClearFilter("bpmBuckets")}
          />
        }
        leading={
          <div className="panel-stats">
            <StatCard
              label="p25–p75"
              value={formatBpmRange(filteredStats.bpmP25, filteredStats.bpmP75)}
            />
            <StatCard label="Median" value={formatBpm(filteredStats.bpmMedian)} />
            <StatCard label="Mode" value={formatBpm(filteredStats.bpmMode)} />
          </div>
        }
      />

      <KeyHistogram
        notation={keyNotation}
        onNotationChange={onKeyNotationChange}
        camelotItems={stats.camelotHistogram}
        scaleItems={stats.scaleHistogram}
        selectedKeys={filters.camelotKeys}
        onToggle={(key) => onToggleFilter("camelotKeys", key)}
        onReset={() => onClearFilter("camelotKeys")}
        medianKey={filteredStats.camelotMedian}
        modeKey={filteredStats.camelotMode}
      />

      {(showGenrePanel || showLabelPanel || showArtistPanel) && (
        <section className="chart-grid">
          {showGenrePanel ? (
            <DistributionChart
              title="Genres"
              items={stats.genreDistribution}
              selectedLabels={filters.genreNames}
              onToggle={(label) => onToggleFilter("genreNames", label)}
              onReset={() => onClearFilter("genreNames")}
            />
          ) : null}
          {showLabelPanel ? (
            <CountTable
              title="Labels"
              nameHeader="Label"
              items={stats.labelDistribution}
              selectedLabels={filters.labelNames}
              onToggle={(label) => onToggleFilter("labelNames", label)}
              onReset={() => onClearFilter("labelNames")}
            />
          ) : null}
          {showArtistPanel ? (
            <CountTable
              title="Artists"
              nameHeader="Artist"
              items={stats.artistDistribution}
              selectedLabels={filters.artistNames}
              onToggle={(label) => onToggleFilter("artistNames", label)}
              onReset={() => onClearFilter("artistNames")}
            />
          ) : null}
        </section>
      )}

      <TrackTable
        tracks={sortedTracks}
        totalCount={tracks.length}
        keyNotation={keyNotation}
        sort={sort}
        onSort={onSort}
        currentTrackId={currentTrackId}
        playing={playing}
        onPlayTrack={onPlayTrack}
      />
    </>
  );
}
