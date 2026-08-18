import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { computeTrackStats } from '../analysis/stats';
import { formatTrackKey } from '../analysis/camelot';
import { filterTracks } from '../analysis/filters';
import { buildCsvFilename, downloadCsv, tracksToCsv } from '../export/csv';
import { STORAGE_KEYS, type KeyNotation } from '../messaging/protocol';
import { extensionStorage, extensionStorageArea } from '../messaging/storage';
import { DEFAULT_FILTERS, type ExtractionSnapshot, type Track, type TrackFilters } from '../types/track';

function useStorageState() {
  const [snapshot, setSnapshot] = useState<ExtractionSnapshot | null>(null);
  const [filters, setFilters] = useState<TrackFilters>(DEFAULT_FILTERS);
  const [keyNotation, setKeyNotationState] = useState<KeyNotation>('camelot');

  useEffect(() => {
    let active = true;

    extensionStorage.get([STORAGE_KEYS.snapshot, STORAGE_KEYS.filters, STORAGE_KEYS.keyNotation]).then((stored) => {
      if (!active) return;
      setSnapshot((stored[STORAGE_KEYS.snapshot] as ExtractionSnapshot | undefined) ?? null);
      setFilters((stored[STORAGE_KEYS.filters] as TrackFilters | undefined) ?? DEFAULT_FILTERS);
      setKeyNotationState((stored[STORAGE_KEYS.keyNotation] as KeyNotation | undefined) ?? 'camelot');
    });

    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== extensionStorageArea) return;
      if (changes[STORAGE_KEYS.snapshot]) {
        setSnapshot((changes[STORAGE_KEYS.snapshot].newValue as ExtractionSnapshot | undefined) ?? null);
      }
      if (changes[STORAGE_KEYS.filters]) {
        setFilters((changes[STORAGE_KEYS.filters].newValue as TrackFilters | undefined) ?? DEFAULT_FILTERS);
      }
      if (changes[STORAGE_KEYS.keyNotation]) {
        setKeyNotationState((changes[STORAGE_KEYS.keyNotation].newValue as KeyNotation | undefined) ?? 'camelot');
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

  const setKeyNotation = useCallback((notation: KeyNotation) => {
    setKeyNotationState(notation);
    void extensionStorage.set({
      [STORAGE_KEYS.keyNotation]: notation,
    });
  }, []);

  return { snapshot, filters, updateFilters, keyNotation, setKeyNotation };
}

function ColumnHistogram({
  title,
  items,
  dense = false,
  formatLabel,
  headerExtra,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  dense?: boolean;
  formatLabel?: (label: string) => string;
  headerExtra?: ReactNode;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="panel-card">
      <div className="chart-header">
        <h3>{title}</h3>
        {headerExtra}
      </div>
      {items.length ? (
        <div className={`column-histogram${dense ? ' column-histogram-dense' : ''}`}>
          {items.map((item) => (
            <div className="hist-col" key={item.label}>
              <span className="hist-count">{item.count || ''}</span>
              <div className="hist-track">
                <div className="hist-fill" style={{ height: `${(item.count / max) * 100}%` }} />
              </div>
              <span className="hist-label">{formatLabel ? formatLabel(item.label) : item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No data</p>
      )}
    </section>
  );
}

function KeyHistogram({
  notation,
  onNotationChange,
  camelotItems,
  scaleItems,
}: {
  notation: KeyNotation;
  onNotationChange: (notation: KeyNotation) => void;
  camelotItems: Array<{ label: string; count: number }>;
  scaleItems: Array<{ label: string; count: number }>;
}) {
  return (
    <ColumnHistogram
      title="Keys"
      dense
      items={notation === 'camelot' ? camelotItems : scaleItems}
      headerExtra={
        <div className="segmented" role="group" aria-label="Key notation">
          <button
            className={notation === 'camelot' ? 'active' : undefined}
            onClick={() => onNotationChange('camelot')}
            type="button"
          >
            Camelot
          </button>
          <button
            className={notation === 'scale' ? 'active' : undefined}
            onClick={() => onNotationChange('scale')}
            type="button"
          >
            Scale
          </button>
        </div>
      }
    />
  );
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrackTable({ tracks, keyNotation }: { tracks: Track[]; keyNotation: KeyNotation }) {
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
              <th>{keyNotation === 'camelot' ? 'Camelot' : 'Scale'}</th>
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
                <td>{formatTrackKey(track.camelot, track.keyName, keyNotation) ?? '-'}</td>
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
  const { snapshot, filters, updateFilters, keyNotation, setKeyNotation } = useStorageState();

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
  const refreshStartedAt = useRef(snapshot?.extractedAt ?? null);

  const requestRefresh = useCallback(async () => {
    refreshStartedAt.current = snapshot?.extractedAt ?? new Date().toISOString();
    setRefreshing(true);
    try {
      await browser.runtime.sendMessage({ type: 'REQUEST_REFRESH' });
    } catch {
      setRefreshing(false);
    }
  }, [snapshot?.extractedAt]);

  useEffect(() => {
    if (!refreshing) return;
    if (snapshot?.extractedAt && snapshot.extractedAt !== refreshStartedAt.current) {
      setRefreshing(false);
      return;
    }
    const timeout = window.setTimeout(() => setRefreshing(false), 12000);
    return () => window.clearTimeout(timeout);
  }, [refreshing, snapshot?.extractedAt]);

  return (
    <main className="app-shell">
      <header className="panel-card header-card">
        <div>
          <p className="eyebrow">Beatport Analyst</p>
          <h1>{snapshot?.pageTitle ?? 'Open a Beatport track list page'}</h1>
          <p className="muted">
            {refreshing
              ? 'Reloading Beatport page…'
              : snapshot
                ? `${filteredTracks.length}/${snapshot.trackCount} tracks shown from ${snapshot.source}`
                : 'Waiting for a Beatport page snapshot.'}
          </p>
        </div>
        <div className="header-actions">
          <button disabled={refreshing} onClick={requestRefresh} type="button">
            {refreshing ? 'Reloading…' : 'Refresh'}
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

      <ColumnHistogram
        title="BPM Histogram"
        items={stats.bpmHistogram}
        formatLabel={(label) => label.replace(/-\d+$/, '')}
      />

      <KeyHistogram
        notation={keyNotation}
        onNotationChange={setKeyNotation}
        camelotItems={stats.camelotHistogram}
        scaleItems={stats.scaleHistogram}
      />

      <section className="chart-grid">
        <DistributionChart title="Genres" items={stats.genreDistribution} />
        <DistributionChart title="Labels" items={stats.labelDistribution} />
      </section>

      <TrackTable tracks={filteredTracks} keyNotation={keyNotation} />
    </main>
  );
}
