import { formatTrackKey } from "../../lib/analysis/camelot";
import type { KeyNotation } from "../../lib/messaging/protocol";
import type { PreviewPlayerHandle } from "../hooks/usePreviewPlayer";
import type { TrackAnalysis } from "../hooks/useTrackAnalysis";
import { PauseIcon } from "./icons/PauseIcon";
import { PlayIcon } from "./icons/PlayIcon";
import { SortHeader } from "./SortHeader";

export interface TrackTableProps {
  analysis: TrackAnalysis;
  keyNotation: KeyNotation;
  player: PreviewPlayerHandle;
}

export function TrackTable({ analysis, keyNotation, player }: TrackTableProps) {
  const { sortedTracks, tracks, sort, cycleSort } = analysis;
  const { currentTrack, playing, playTrack } = player;
  const filtered = sortedTracks.length !== tracks.length;

  return (
    <section className="panel-card">
      <div className="chart-header">
        <h3>Tracks</h3>
        {filtered ? (
          <span className="muted">
            {sortedTracks.length} of {tracks.length}
          </span>
        ) : null}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortHeader column="position" label="#" sort={sort} onSort={cycleSort} />
              <th>Title</th>
              <th>Artists</th>
              <SortHeader column="bpm" label="BPM" sort={sort} onSort={cycleSort} />
              <SortHeader
                column="key"
                label={keyNotation === "camelot" ? "Camelot" : "Scale"}
                sort={sort}
                onSort={cycleSort}
              />
              <th>Genre</th>
              <SortHeader column="label" label="Label" sort={sort} onSort={cycleSort} />
              <SortHeader column="date" label="Date" sort={sort} onSort={cycleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedTracks.length ? (
              sortedTracks.map((track) => {
                const current = track.id === currentTrack?.id;
                const playLabel =
                  current && playing ? `Pause ${track.title}` : `Play preview of ${track.title}`;

                return (
                  <tr className={current ? "track-row playing" : "track-row"} key={track.id}>
                    <td>{track.position ?? "-"}</td>
                    <td>
                      <div className="track-title-cell">
                        <button
                          type="button"
                          className="track-play-btn"
                          disabled={!track.previewUrl}
                          onClick={() => playTrack(track)}
                          aria-label={
                            track.previewUrl ? playLabel : `${track.title} has no preview`
                          }
                        >
                          {current && playing ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <div>
                          <div className="track-title-line">
                            {track.previewUrl ? (
                              <button
                                type="button"
                                className="track-title-button"
                                onClick={() => playTrack(track)}
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
                      {formatTrackKey(track.camelot, track.keyName, keyNotation) ?? "-"}
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
