import { useCallback, useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import { computeTrackStats } from "../../lib/analysis/stats";
import {
  DEFAULT_TRACK_SORT,
  filterTracks,
  hasActiveFilters,
  nextTrackSort,
  sortTracks,
  toggleListValue,
  type FilterListKey,
  type TrackSort,
  type TrackSortColumn,
} from "../../lib/analysis/filters";
import { buildCsvFilename, downloadCsv, tracksToCsv } from "../../lib/export/csv";
import { uniqueTracks } from "../../lib/extract/normalize";
import {
  DEFAULT_FILTERS,
  type ExtractionSnapshot,
  type TrackFilters,
} from "../../lib/types/track";

export function useTrackAnalysis(snapshot: ExtractionSnapshot | null) {
  const [filters, setFilters] = useState<TrackFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<TrackSort>(DEFAULT_TRACK_SORT);
  const tracks = useMemo(
    () => uniqueTracks(snapshot?.tracks ?? []),
    [snapshot],
  );
  const stats = useMemo(() => computeTrackStats(tracks), [tracks]);
  const filteredTracks = useMemo(
    () => filterTracks(tracks, filters),
    [filters, tracks],
  );
  const sortedTracks = useMemo(
    () => sortTracks(filteredTracks, sort),
    [filteredTracks, sort],
  );
  const filteredStats = useMemo(
    () => computeTrackStats(filteredTracks),
    [filteredTracks],
  );
  const filtersActive = hasActiveFilters(filters);

  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_TRACK_SORT);
  }, [snapshot?.pageUrl]);

  const toggleFilter = useCallback((key: FilterListKey, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: toggleListValue(current[key], value),
    }));
  }, []);

  const clearFilter = useCallback((key: FilterListKey) => {
    setFilters((current) => ({ ...current, [key]: [] }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const setTitleQuery = useCallback((titleQuery: string) => {
    setFilters((current) => ({ ...current, titleQuery }));
  }, []);

  const toggleExclusive = useCallback(() => {
    setFilters((current) => ({
      ...current,
      includeExclusiveOnly: !current.includeExclusiveOnly,
    }));
  }, []);

  const toggleHype = useCallback(() => {
    setFilters((current) => ({
      ...current,
      includeHypeOnly: !current.includeHypeOnly,
    }));
  }, []);

  const cycleSort = useCallback((column: TrackSortColumn) => {
    setSort((current) => nextTrackSort(current, column));
  }, []);

  const toggleFreshness = useCallback((days: 7 | 30) => {
    setFilters((current) => ({
      ...current,
      publishedWithinDays: current.publishedWithinDays === days ? null : days,
    }));
  }, []);

  const exportCsv = useCallback(() => {
    if (!snapshot) return;
    downloadCsv(
      buildCsvFilename(snapshot.pageUrl),
      tracksToCsv(sortedTracks),
    );
  }, [sortedTracks, snapshot]);

  const downloadReport = useCallback(() => {
    const url = new URL(browser.runtime.getURL("/report.html"));
    url.searchParams.set("print", "1");
    url.searchParams.set("t", String(Date.now()));
    const opened = window.open(url.href, "bp-analyst-report");
    if (!opened) {
      void browser.tabs.create({ url: url.href });
    }
  }, []);

  return {
    tracks,
    stats,
    sortedTracks,
    filteredStats,
    filters,
    sort,
    filtersActive,
    toggleFilter,
    clearFilter,
    resetFilters,
    setTitleQuery,
    toggleExclusive,
    toggleHype,
    toggleFreshness,
    cycleSort,
    exportCsv,
    downloadReport,
  };
}

export type TrackAnalysis = ReturnType<typeof useTrackAnalysis>;
