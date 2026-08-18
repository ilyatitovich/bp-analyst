import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { computeTrackStats } from '../analysis/stats';
import { filterTracks } from '../analysis/filters';
import { buildCsvFilename, downloadCsv, tracksToCsv } from '../export/csv';
import { STORAGE_KEYS } from '../messaging/protocol';
import { extensionStorage, extensionStorageArea } from '../messaging/storage';
import { DEFAULT_FILTERS, type ExtractionSnapshot, type Track, type TrackFilters } from '../types/track';

function useStorageState() {
  const [snapshot, setSnapshot] = useState<ExtractionSnapshot | null>(null);
  const [filters, setFilters] = useState<TrackFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    let active = true;

    extensionStorage.get([STORAGE_KEYS.snapshot, STORAGE_KEYS.filters]).then((stored) => {
      if (!active) return;
      setSnapshot((stored[STORAGE_KEYS.snapshot] as ExtractionSnapshot | undefined) ?? null);
      setFilters((stored[STORAGE_KEYS.filters] as TrackFilters | undefined) ?? DEFAULT_FILTERS);
    });

    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== extensionStorageArea) return;
      if (changes[STORAGE_KEYS.snapshot]) {
        setSnapshot((changes[STORAGE_KEYS.snapshot].newValue as ExtractionSnapshot | undefined) ?? null);
      }
      if (changes[STORAGE_KEYS.filters]) {
        setFilters((changes[STORAGE_KEYS.filters].newValue as TrackFilters | undefined) ?? DEFAULT_FILTERS);
      }
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  const updateFilters = useCallback((nextFilters: TrackFilters) => {
    void extensionStorage.set({
      [STORAGE_KEYS.filters]: nextFilters,
    });
  }, []);

  return { snapshot, filters, updateFilters };
}

function DistributionChart({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="panel-card">
      <h3>{title}</h3>
      <div className="bars">
        {items.length ? (
          items.map((item) => (
            <div className="bar-row" key={item.label}>
              <div className="bar-meta">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No data</p>
        )}
      </div>
    </section>
  );
}

function BpmHistogram({ items }: { items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="panel-card bpm-histogram-card">
      <h3>BPM Histogram</h3>
      {items.length ? (
        <div className="bpm-histogram">
          {items.map((item) => (
            <div className="bpm-col" key={item.label}>
              <span className="bpm-count">{item.count || ''}</span>
              <div className="bpm-track">
                <div className="bpm-fill" style={{ height: `${(item.count / max) * 100}%` }} />
              </div>
              <span className="bpm-label">{item.label.replace(/-\d+$/, '')}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No data</p>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrackTable({ tracks }: { tracks: Track[] }) {
  return (
    <section className="panel-card">
      <h3>Tracks</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Artists</th>
              <th>BPM</th>
              <th>Camelot</th>
              <th>Genre</th>
              <th>Label</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => (
              <tr key={track.id}>
                <td>{track.position ?? '-'}</td>
                <td>
                  {track.trackUrl ? (
                    <a href={track.trackUrl} target="_blank" rel="noreferrer">
                      {track.title}
                    </a>
                  ) : (
                    track.title
                  )}
                  {track.mixName ? <div className="cell-subtle">{track.mixName}</div> : null}
                </td>
                <td>{track.artists.map((artist) => artist.name).join(', ')}</td>
                <td>{track.bpm ?? '-'}</td>
                <td>{track.camelot ?? track.keyName ?? '-'}</td>
                <td>{track.genre?.name ?? '-'}</td>
                <td>{track.label?.name ?? '-'}</td>
                <td>{track.publishDate ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function App() {
  const { snapshot, filters, updateFilters } = useStorageState();

  const filteredTracks = useMemo(
    () => (snapshot ? filterTracks(snapshot.tracks, filters) : []),
    [snapshot, filters],
  );
  const stats = useMemo(() => computeTrackStats(filteredTracks), [filteredTracks]);

  const genreOptions = useMemo(
    () =>
      snapshot
        ? Array.from(new Set(snapshot.tracks.flatMap((track) => (track.genre?.name ? [track.genre.name] : [])))).sort()
        : [],
    [snapshot],
  );

  const camelotOptions = useMemo(
    () =>
      snapshot
        ? Array.from(new Set(snapshot.tracks.flatMap((track) => (track.camelot ? [track.camelot] : [])))).sort(
            (left, right) => left.localeCompare(right, undefined, { numeric: true }),
          )
        : [],
    [snapshot],
  );

  const setPartialFilters = useCallback(
    (partial: Partial<TrackFilters>) => {
      updateFilters({ ...filters, ...partial });
    },
    [filters, updateFilters],
  );

  const exportFiltered = useCallback(() => {
    if (!snapshot) return;
    downloadCsv(buildCsvFilename(snapshot.pageUrl), tracksToCsv(filteredTracks));
  }, [filteredTracks, snapshot]);

  const exportAll = useCallback(() => {
    if (!snapshot) return;
    downloadCsv(buildCsvFilename(snapshot.pageUrl), tracksToCsv(snapshot.tracks));
  }, [snapshot]);

  const [refreshing, setRefreshing] = useState(false);

  const requestRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await browser.runtime.sendMessage({ type: 'REQUEST_REFRESH' });
    } catch {
      // No Beatport tab is listening yet.
    } finally {
      window.setTimeout(() => setRefreshing(false), 500);
    }
  }, []);

  return (
    <main className="app-shell">
      <header className="panel-card header-card">
        <div>
          <p className="eyebrow">Beatport Analyst</p>
          <h1>{snapshot?.pageTitle ?? 'Open a Beatport track list page'}</h1>
          <p className="muted">
            {refreshing
              ? 'Refreshing current Beatport page…'
              : snapshot
                ? `${filteredTracks.length}/${snapshot.trackCount} tracks shown from ${snapshot.source}`
                : 'Waiting for a Beatport page snapshot.'}
          </p>
        </div>
        <div className="header-actions">
          <button disabled={refreshing} onClick={requestRefresh} type="button">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button onClick={exportFiltered} disabled={!filteredTracks.length} type="button">
            Export CSV
          </button>
          <button onClick={exportAll} disabled={!snapshot?.tracks.length} type="button">
            Export All
          </button>
        </div>
      </header>

      <section className="panel-card">
        <h3>Filters</h3>
        <div className="filters-grid">
          <label>
            BPM Min
            <input
              type="number"
              value={filters.bpmMin ?? ''}
              onChange={(event) =>
                setPartialFilters({
                  bpmMin: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </label>
          <label>
            BPM Max
            <input
              type="number"
              value={filters.bpmMax ?? ''}
              onChange={(event) =>
                setPartialFilters({
                  bpmMax: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </label>
          <label>
            Label Search
            <input
              type="text"
              value={filters.labelQuery}
              onChange={(event) => setPartialFilters({ labelQuery: event.target.value })}
            />
          </label>
          <label>
            Track Search
            <input
              type="text"
              value={filters.titleQuery}
              onChange={(event) => setPartialFilters({ titleQuery: event.target.value })}
            />
          </label>
          <label>
            Compatible With
            <select
              value={filters.compatibleWith ?? ''}
              onChange={(event) => setPartialFilters({ compatibleWith: event.target.value || null })}
            >
              <option value="">Any</option>
              {camelotOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Camelot Keys
            <select
              multiple
              value={filters.camelotKeys}
              onChange={(event) =>
                setPartialFilters({
                  camelotKeys: Array.from(event.target.selectedOptions, (option) => option.value),
                })
              }
            >
              {camelotOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Genres
            <select
              multiple
              value={filters.genreNames}
              onChange={(event) =>
                setPartialFilters({
                  genreNames: Array.from(event.target.selectedOptions, (option) => option.value),
                })
              }
            >
              {genreOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={filters.includeExclusiveOnly}
              onChange={(event) => setPartialFilters({ includeExclusiveOnly: event.target.checked })}
            />
            Exclusive only
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={filters.includeHypeOnly}
              onChange={(event) => setPartialFilters({ includeHypeOnly: event.target.checked })}
            />
            Hype only
          </label>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Tracks" value={String(stats.count)} />
        <StatCard label="BPM Range" value={stats.bpmMin !== null && stats.bpmMax !== null ? `${stats.bpmMin}-${stats.bpmMax}` : '-'} />
        <StatCard label="Median BPM" value={stats.bpmMedian !== null ? String(stats.bpmMedian) : '-'} />
        <StatCard label="Mode BPM" value={stats.bpmMode !== null ? String(stats.bpmMode) : '-'} />
      </section>

      <BpmHistogram items={stats.bpmHistogram} />

      <section className="chart-grid">
        <DistributionChart title="Camelot" items={stats.camelotDistribution} />
        <DistributionChart title="Genres" items={stats.genreDistribution} />
        <DistributionChart title="Labels" items={stats.labelDistribution} />
      </section>

      <TrackTable tracks={filteredTracks} />
    </main>
  );
}
