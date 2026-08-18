import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { browser } from "wxt/browser";
import { computeTrackStats } from "../analysis/stats";
import { formatTrackKey, scaleToCamelot } from "../analysis/camelot";
import {
  filterTracks,
  hasActiveFilters,
  toggleListValue,
} from "../analysis/filters";
import { buildCsvFilename, downloadCsv, tracksToCsv } from "../export/csv";
import {
  STORAGE_KEYS,
  type ExtractionErrorState,
  type KeyNotation,
} from "../messaging/protocol";
import { extensionStorage, extensionStorageArea } from "../messaging/storage";
import { uniqueTracks } from "../extract/normalize";
import { ExtractionHelpCard } from "./ContactSupport";
import { PreviewPlayer, PauseIcon, PlayIcon, usePreviewPlayer } from "./PreviewPlayer";
import {
  DEFAULT_FILTERS,
  type ExtractionSnapshot,
  type Track,
  type TrackFilters,
} from "../types/track";

type FilterListKey = "bpmBuckets" | "camelotKeys" | "genreNames" | "labelNames";

function useStorageState() {
  const [snapshot, setSnapshot] = useState<ExtractionSnapshot | null>(null);
  const [extractionError, setExtractionError] =
    useState<ExtractionErrorState | null>(null);
  const [keyNotation, setKeyNotationState] = useState<KeyNotation>("camelot");

  useEffect(() => {
    let active = true;

    extensionStorage
      .get([
        STORAGE_KEYS.snapshot,
        STORAGE_KEYS.keyNotation,
        STORAGE_KEYS.extractionError,
      ])
      .then((stored) => {
        if (!active) return;
        setSnapshot(
          (stored[STORAGE_KEYS.snapshot] as ExtractionSnapshot | undefined) ??
            null,
        );
        setKeyNotationState(
          (stored[STORAGE_KEYS.keyNotation] as KeyNotation | undefined) ??
            "camelot",
        );
        setExtractionError(
          (stored[STORAGE_KEYS.extractionError] as
            | ExtractionErrorState
            | undefined) ?? null,
        );
      });

    const listener: Parameters<
      typeof browser.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== extensionStorageArea) return;
      if (changes[STORAGE_KEYS.snapshot]) {
        setSnapshot(
          (changes[STORAGE_KEYS.snapshot].newValue as
            | ExtractionSnapshot
            | undefined) ?? null,
        );
      }
      if (changes[STORAGE_KEYS.keyNotation]) {
        setKeyNotationState(
          (changes[STORAGE_KEYS.keyNotation].newValue as
            | KeyNotation
            | undefined) ?? "camelot",
        );
      }
      if (changes[STORAGE_KEYS.extractionError]) {
        setExtractionError(
          (changes[STORAGE_KEYS.extractionError].newValue as
            | ExtractionErrorState
            | undefined) ?? null,
        );
      }
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  const setKeyNotation = useCallback((notation: KeyNotation) => {
    setKeyNotationState(notation);
    void extensionStorage.set({
      [STORAGE_KEYS.keyNotation]: notation,
    });
  }, []);

  return { snapshot, extractionError, keyNotation, setKeyNotation };
}

function AccordionChevron() {
  return (
    <svg
      className="accordion-chevron-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapsiblePanel({
  title,
  headerExtra,
  children,
  defaultOpen = true,
}: {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `${useId()}-content`;

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  return (
    <section className={`panel-card accordion-card${open ? "" : " collapsed"}`}>
      <div className="accordion-header">
        <button
          type="button"
          className="accordion-trigger"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggle}
        >
          <h3>{title}</h3>
        </button>
        {open ? headerExtra : null}
        <button
          type="button"
          className={`accordion-chevron${open ? " open" : ""}`}
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          onClick={toggle}
        >
          <AccordionChevron />
        </button>
      </div>
      <div
        className={`accordion-body${open ? " open" : ""}`}
        id={contentId}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="accordion-body-inner">{children}</div>
      </div>
    </section>
  );
}

function FilterChips({
  values,
  formatValue,
  onRemove,
  onReset,
}: {
  values: string[];
  formatValue?: (value: string) => string;
  onRemove: (value: string) => void;
  onReset: () => void;
}) {
  if (!values.length) return null;
  const visible = values.slice(0, 3);
  const hiddenCount = values.length - visible.length;

  return (
    <div className="filter-summary">
      {visible.map((value) => {
        const label = formatValue ? formatValue(value) : value;
        return (
          <button
            key={value}
            type="button"
            className="filter-chip"
            onClick={() => onRemove(value)}
            aria-label={`Remove ${label} filter`}
          >
            <span className="filter-chip-label">{label}</span>
            <span aria-hidden="true">×</span>
          </button>
        );
      })}
      {hiddenCount > 0 ? (
        <span className="filter-chip filter-chip-static">+{hiddenCount}</span>
      ) : null}
      <button className="filter-reset" onClick={onReset} type="button">
        Reset
      </button>
    </div>
  );
}

function ColumnHistogram({
  title,
  items,
  dense = false,
  formatLabel,
  headerExtra,
  selectedLabels,
  onToggle,
  leading,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  dense?: boolean;
  formatLabel?: (label: string) => string;
  headerExtra?: ReactNode;
  selectedLabels?: Set<string>;
  onToggle?: (label: string) => void;
  leading?: ReactNode;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  const hasSelection = Boolean(selectedLabels?.size);

  return (
    <CollapsiblePanel title={title} headerExtra={headerExtra}>
      {leading}
      {items.length ? (
        <div
          className={`column-histogram${dense ? " column-histogram-dense" : ""}`}
        >
          {items.map((item) => {
            const selected = selectedLabels?.has(item.label) ?? false;
            const label = formatLabel ? formatLabel(item.label) : item.label;
            const className = [
              "hist-col",
              selected ? "selected" : "",
              hasSelection && !selected ? "dimmed" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                className={className}
                disabled={!item.count || !onToggle}
                key={item.label}
                onClick={() => onToggle?.(item.label)}
                aria-pressed={selected}
                aria-label={
                  selected ? `Remove ${label} filter` : `Filter ${label}`
                }
                type="button"
              >
                <span className="hist-count">{item.count || ""}</span>
                <div className="hist-track">
                  <span className="hist-popup" aria-hidden="true">
                    {item.label.replace("-", "–")}
                  </span>
                  <div
                    className="hist-fill"
                    style={{ height: `${(item.count / max) * 100}%` }}
                  />
                </div>
                <span className="hist-label">{label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="muted">No data</p>
      )}
    </CollapsiblePanel>
  );
}

function KeyHistogram({
  notation,
  onNotationChange,
  camelotItems,
  scaleItems,
  selectedKeys,
  onToggle,
  onReset,
  medianKey,
  modeKey,
}: {
  notation: KeyNotation;
  onNotationChange: (notation: KeyNotation) => void;
  camelotItems: Array<{ label: string; count: number }>;
  scaleItems: Array<{ label: string; count: number }>;
  selectedKeys: string[];
  onToggle: (camelot: string) => void;
  onReset: () => void;
  medianKey: string | null;
  modeKey: string | null;
}) {
  const selectedLabels = useMemo(() => {
    if (notation === "camelot") return new Set(selectedKeys);
    return new Set(
      selectedKeys.map(
        (key) => formatTrackKey(key, null, "scale") ?? key,
      ),
    );
  }, [notation, selectedKeys]);

  return (
    <ColumnHistogram
      title="Keys"
      dense
      items={notation === "camelot" ? camelotItems : scaleItems}
      selectedLabels={selectedLabels}
      onToggle={(label) => {
        const camelot =
          notation === "camelot" ? label : scaleToCamelot(label);
        if (camelot) onToggle(camelot);
      }}
      leading={
        <div className="panel-stats">
          <StatCard
            label="Median"
            value={formatTrackKey(medianKey, null, notation) ?? "-"}
          />
          <StatCard
            label="Mode"
            value={formatTrackKey(modeKey, null, notation) ?? "-"}
          />
        </div>
      }
      headerExtra={
        <>
          <FilterChips
            values={selectedKeys}
            formatValue={(key) =>
              formatTrackKey(key, null, notation) ?? key
            }
            onRemove={onToggle}
            onReset={onReset}
          />
          <div className="segmented" role="group" aria-label="Key notation">
            <button
              className={notation === "camelot" ? "active" : undefined}
              onClick={() => onNotationChange("camelot")}
              type="button"
            >
              Camelot
            </button>
            <button
              className={notation === "scale" ? "active" : undefined}
              onClick={() => onNotationChange("scale")}
              type="button"
            >
              Scale
            </button>
          </div>
        </>
      }
    />
  );
}

function DistributionChart({
  title,
  items,
  selectedLabels,
  onToggle,
  onReset,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  selectedLabels: string[];
  onToggle: (label: string) => void;
  onReset: () => void;
}) {
  if (items.length <= 1) return null;
  const max = Math.max(1, ...items.map((item) => item.count));
  const selected = new Set(selectedLabels);
  const hasSelection = selected.size > 0;

  return (
    <CollapsiblePanel
      title={title}
      headerExtra={
        <FilterChips
          values={selectedLabels}
          onRemove={onToggle}
          onReset={onReset}
        />
      }
    >
      <div className="bars">
        {items.map((item) => {
          const isSelected = selected.has(item.label);
          return (
            <button
              className={[
                "bar-row",
                isSelected ? "selected" : "",
                hasSelection && !isSelected ? "dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={item.label}
              onClick={() => onToggle(item.label)}
              aria-pressed={isSelected}
              title={
                isSelected
                  ? `Remove ${item.label} filter`
                  : `Filter ${item.label}`
              }
              type="button"
            >
              <div className="bar-meta">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}

function CountTable({
  title,
  nameHeader,
  items,
  selectedLabels,
  onToggle,
  onReset,
}: {
  title: string;
  nameHeader: string;
  items: Array<{ label: string; count: number }>;
  selectedLabels: string[];
  onToggle: (label: string) => void;
  onReset: () => void;
}) {
  if (items.length <= 1) return null;
  const selected = new Set(selectedLabels);
  const hasSelection = selected.size > 0;

  return (
    <CollapsiblePanel
      title={title}
      headerExtra={
        <FilterChips
          values={selectedLabels}
          onRemove={onToggle}
          onReset={onReset}
        />
      }
    >
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{nameHeader}</th>
              <th className="count-cell">Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = selected.has(item.label);
              return (
                <tr
                  className={[
                    "filter-row",
                    isSelected ? "selected" : "",
                    hasSelection && !isSelected ? "dimmed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={item.label}
                  onClick={() => onToggle(item.label)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggle(item.label);
                    }
                  }}
                  aria-pressed={isSelected}
                  role="button"
                  tabIndex={0}
                  title={
                    isSelected
                      ? `Remove ${item.label} filter`
                      : `Filter ${item.label}`
                  }
                >
                  <td>{item.label}</td>
                  <td className="count-cell">{item.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrackTable({
  tracks,
  totalCount,
  keyNotation,
  currentTrackId,
  playing,
  onPlayTrack,
}: {
  tracks: Track[];
  totalCount: number;
  keyNotation: KeyNotation;
  currentTrackId: number | null;
  playing: boolean;
  onPlayTrack: (track: Track) => void;
}) {
  const filtered = tracks.length !== totalCount;

  return (
    <section className="panel-card">
      <div className="chart-header">
        <h3>Tracks</h3>
        {filtered ? (
          <span className="muted">
            {tracks.length} of {totalCount}
          </span>
        ) : null}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Artists</th>
              <th>BPM</th>
              <th>{keyNotation === "camelot" ? "Camelot" : "Scale"}</th>
              <th>Genre</th>
              <th>Label</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {tracks.length ? (
              tracks.map((track) => {
                const current = track.id === currentTrackId;
                const playLabel = current && playing ? `Pause ${track.title}` : `Play preview of ${track.title}`;

                return (
                  <tr className={current ? "track-row playing" : "track-row"} key={track.id}>
                    <td>{track.position ?? "-"}</td>
                    <td>
                      <div className="track-title-cell">
                        <button
                          type="button"
                          className="track-play-btn"
                          disabled={!track.previewUrl}
                          onClick={() => onPlayTrack(track)}
                          aria-label={track.previewUrl ? playLabel : `${track.title} has no preview`}
                        >
                          {current && playing ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <div>
                          <div className="track-title-line">
                            {track.previewUrl ? (
                              <button
                                type="button"
                                className="track-title-button"
                                onClick={() => onPlayTrack(track)}
                              >
                                {track.title}
                              </button>
                            ) : track.trackUrl ? (
                              <a href={track.trackUrl} target="_blank" rel="noreferrer">
                                {track.title}
                              </a>
                            ) : (
                              track.title
                            )}
                            {track.trackUrl && track.previewUrl ? (
                              <a
                                className="track-open-link"
                                href={track.trackUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${track.title} on Beatport`}
                              >
                                ↗
                              </a>
                            ) : null}
                          </div>
                          {track.mixName ? (
                            <div className="cell-subtle">{track.mixName}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>{track.artists.map((artist) => artist.name).join(", ")}</td>
                    <td>{track.bpm ?? "-"}</td>
                    <td>
                      {formatTrackKey(track.camelot, track.keyName, keyNotation) ??
                        "-"}
                    </td>
                    <td>{track.genre?.name ?? "-"}</td>
                    <td>{track.label?.name ?? "-"}</td>
                    <td>{track.publishDate ?? "-"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="muted" colSpan={8}>
                  No matching tracks
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function App() {
  const { snapshot, extractionError, keyNotation, setKeyNotation } =
    useStorageState();
  const [filters, setFilters] = useState<TrackFilters>(DEFAULT_FILTERS);
  const tracks = useMemo(
    () => uniqueTracks(snapshot?.tracks ?? []),
    [snapshot],
  );
  const stats = useMemo(() => computeTrackStats(tracks), [tracks]);
  const filteredTracks = useMemo(
    () => filterTracks(tracks, filters),
    [filters, tracks],
  );
  const filteredStats = useMemo(
    () => computeTrackStats(filteredTracks),
    [filteredTracks],
  );
  const filtersActive = hasActiveFilters(filters);
  const player = usePreviewPlayer(filteredTracks);

  useEffect(() => {
    player.stop();
  }, [player.stop, snapshot?.pageUrl]);

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

  const exportCsv = useCallback(() => {
    if (!snapshot) return;
    downloadCsv(
      buildCsvFilename(snapshot.pageUrl),
      tracksToCsv(filteredTracks),
    );
  }, [filteredTracks, snapshot]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [beatportReloadAttempted, setBeatportReloadAttempted] = useState(false);
  const refreshStartedAt = useRef(snapshot?.extractedAt ?? null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const requestRefresh = useCallback(async (force = false) => {
    refreshStartedAt.current = snapshotRef.current?.extractedAt ?? new Date().toISOString();
    setRefreshFailed(false);
    setRefreshing(true);
    try {
      const result = (await browser.runtime.sendMessage({
        type: 'REQUEST_REFRESH',
        force,
      })) as { reloaded?: boolean } | undefined;
      setBeatportReloadAttempted(Boolean(result?.reloaded));
      if (!result?.reloaded) {
        setRefreshing(false);
      }
    } catch {
      setRefreshing(false);
      setRefreshFailed(true);
    }
  }, []);

  useEffect(() => {
    const port = browser.runtime.connect({ name: 'bp-analyst-panel' });
    void requestRefresh();
    return () => port.disconnect();
  }, [requestRefresh]);

  useEffect(() => {
    if (!refreshing) return;
    if (
      snapshot?.extractedAt &&
      snapshot.extractedAt !== refreshStartedAt.current
    ) {
      setRefreshing(false);
      return;
    }
    const startedAt = refreshStartedAt.current;
    if (extractionError?.at && startedAt && extractionError.at > startedAt) {
      setRefreshing(false);
      return;
    }
    const timeout = window.setTimeout(() => setRefreshing(false), 12000);
    return () => window.clearTimeout(timeout);
  }, [extractionError?.at, refreshing, snapshot?.extractedAt]);

  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
  }, [snapshot?.pageUrl]);

  const showExtractionHelp =
    !refreshing &&
    tracks.length === 0 &&
    (Boolean(extractionError) || refreshFailed || beatportReloadAttempted);

  return (
    <div className="app">
      <main className="app-shell">
      <header className="panel-card header-card">
        <div>
          <p className="eyebrow">Beatport Analyst</p>
          <h1>
            {snapshot?.pageTitle ??
              extractionError?.pageTitle ??
              "Open a Beatport track list page"}
          </h1>
          <p className="muted">
            {refreshing
              ? "Reloading Beatport page…"
              : showExtractionHelp
                ? "No tracks could be read from this Beatport page."
                : snapshot
                  ? filtersActive
                    ? `${filteredTracks.length} of ${tracks.length} tracks from ${snapshot.source}`
                    : `${tracks.length} tracks from ${snapshot.source}`
                  : "Waiting for a Beatport page snapshot."}
          </p>
        </div>
        <div className="header-actions">
          {filtersActive ? (
            <button onClick={resetFilters} type="button">
              Reset filters
            </button>
          ) : null}
          <button disabled={refreshing} onClick={() => void requestRefresh(true)} type="button">
            {refreshing ? "Reloading…" : "Refresh"}
          </button>
          <button onClick={exportCsv} disabled={!filteredTracks.length} type="button">
            Export CSV
          </button>
        </div>
      </header>

      {showExtractionHelp ? (
        <ExtractionHelpCard />
      ) : (
        <>
      <ColumnHistogram
        title="BPM"
        items={stats.bpmHistogram}
        formatLabel={(label) => label.replace(/-\d+$/, "")}
        selectedLabels={new Set(filters.bpmBuckets)}
        onToggle={(label) => toggleFilter("bpmBuckets", label)}
        headerExtra={
          <FilterChips
            values={filters.bpmBuckets}
            formatValue={(label) => label.replace("-", "–")}
            onRemove={(label) => toggleFilter("bpmBuckets", label)}
            onReset={() => clearFilter("bpmBuckets")}
          />
        }
        leading={
          <div className="panel-stats">
            <StatCard
              label="Range"
              value={
                filteredStats.bpmMin !== null && filteredStats.bpmMax !== null
                  ? `${filteredStats.bpmMin}–${filteredStats.bpmMax}`
                  : "-"
              }
            />
            <StatCard
              label="Median"
              value={
                filteredStats.bpmMedian !== null
                  ? String(filteredStats.bpmMedian)
                  : "-"
              }
            />
            <StatCard
              label="Mode"
              value={
                filteredStats.bpmMode !== null
                  ? String(filteredStats.bpmMode)
                  : "-"
              }
            />
          </div>
        }
      />

      <KeyHistogram
        notation={keyNotation}
        onNotationChange={setKeyNotation}
        camelotItems={stats.camelotHistogram}
        scaleItems={stats.scaleHistogram}
        selectedKeys={filters.camelotKeys}
        onToggle={(key) => toggleFilter("camelotKeys", key)}
        onReset={() => clearFilter("camelotKeys")}
        medianKey={filteredStats.camelotMedian}
        modeKey={filteredStats.camelotMode}
      />

      {(stats.genreDistribution.length > 1 || stats.labelDistribution.length > 1) && (
        <section className="chart-grid">
          <DistributionChart
            title="Genres"
            items={stats.genreDistribution}
            selectedLabels={filters.genreNames}
            onToggle={(label) => toggleFilter("genreNames", label)}
            onReset={() => clearFilter("genreNames")}
          />
          <CountTable
            title="Labels"
            nameHeader="Label"
            items={stats.labelDistribution}
            selectedLabels={filters.labelNames}
            onToggle={(label) => toggleFilter("labelNames", label)}
            onReset={() => clearFilter("labelNames")}
          />
        </section>
      )}

      <TrackTable
        tracks={filteredTracks}
        totalCount={tracks.length}
        keyNotation={keyNotation}
        currentTrackId={player.currentTrack?.id ?? null}
        playing={player.playing}
        onPlayTrack={player.playTrack}
      />
        </>
      )}
      </main>
      <PreviewPlayer player={player} />
    </div>
  );
}
