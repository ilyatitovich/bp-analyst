import { formatTrackKey } from "../../lib/analysis/camelot";
import type { TrackSort, TrackSortColumn } from "../../lib/analysis/filters";
import type { KeyNotation } from "../../lib/messaging/protocol";
import type { Track } from "../../lib/types/track";
import { PauseIcon, PlayIcon } from "./icons";

function SortHeader({
  column,
  label,
  sort,
  onSort,
}: {
  column: TrackSortColumn;
  label: string;
  sort: TrackSort;
  onSort: (column: TrackSortColumn) => void;
}) {
  const active = sort.column === column;
  const ariaSort = active
    ? sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  const sortLabel = column === "position" ? "position" : label.toLowerCase();
  const ariaLabel = active
    ? `Sorted by ${sortLabel}, ${sort.direction === "asc" ? "ascending" : "descending"}`
    : `Sort by ${sortLabel}`;

  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className={`sort-btn${active ? " active" : ""}`}
        onClick={() => onSort(column)}
        aria-label={ariaLabel}
      >
        <span>{label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {active ? (sort.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

export function TrackTable({
  tracks,
  totalCount,
  keyNotation,
  sort,
  onSort,
  currentTrackId,
  playing,
  onPlayTrack,
}: {
  tracks: Track[];
  totalCount: number;
  keyNotation: KeyNotation;
  sort: TrackSort;
  onSort: (column: TrackSortColumn) => void;
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
              <SortHeader column="position" label="#" sort={sort} onSort={onSort} />
              <th>Title</th>
              <th>Artists</th>
              <SortHeader column="bpm" label="BPM" sort={sort} onSort={onSort} />
              <SortHeader
                column="key"
                label={keyNotation === "camelot" ? "Camelot" : "Scale"}
                sort={sort}
                onSort={onSort}
              />
              <th>Genre</th>
              <SortHeader column="label" label="Label" sort={sort} onSort={onSort} />
              <SortHeader column="date" label="Date" sort={sort} onSort={onSort} />
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
