import { useEffect, useState } from "react";
import {
  formatPreviewTime,
  previewElapsedSec,
  previewProgress,
  resolvedPreviewWindow,
  seekTimeFromProgress,
} from "../../lib/player/preview";
import type { PreviewPlayerHandle } from "../hooks/usePreviewPlayer";
import { PauseIcon } from "./icons/PauseIcon";
import { PlayIcon } from "./icons/PlayIcon";
import { SkipIcon } from "./icons/SkipIcon";

export interface PreviewPlayerProps {
  player: PreviewPlayerHandle;
}

export function PreviewPlayer({ player }: PreviewPlayerProps) {
  const { currentTrack, playing, error, audioRef, playAdjacent, togglePlay, stop } = player;
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const clip = resolvedPreviewWindow(
      currentTrack,
      Number.isFinite(audio.duration) ? audio.duration : null,
    );
    const sync = () => setCurrentTime(audio.currentTime);
    setCurrentTime(audio.currentTime || clip.startSec);
    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("seeked", sync);
    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("seeked", sync);
    };
  }, [audioRef, currentTrack]);

  if (!currentTrack) return null;

  const audioDuration = audioRef.current?.duration;
  const clip = resolvedPreviewWindow(
    currentTrack,
    audioDuration !== undefined && Number.isFinite(audioDuration) ? audioDuration : null,
  );
  const progress = previewProgress(currentTime, clip);
  const artists = currentTrack.artists.map((artist) => artist.name).join(", ");

  return (
    <aside className="preview-player" aria-label="Preview player">
      {currentTrack.artworkUrl ? (
        <img
          className="preview-artwork"
          src={currentTrack.artworkUrl}
          alt=""
          width={40}
          height={40}
        />
      ) : (
        <div className="preview-artwork preview-artwork-empty" aria-hidden="true" />
      )}
      <div className="preview-meta">
        <strong className="preview-title">{currentTrack.title}</strong>
        <span className="preview-artists">
          {artists || "Unknown artist"}
          {currentTrack.mixName ? ` · ${currentTrack.mixName}` : ""}
        </span>
        {error ? <span className="preview-error">Preview unavailable</span> : null}
      </div>
      <div className="preview-controls">
        <button
          type="button"
          className="preview-icon-btn"
          onClick={() => playAdjacent(-1)}
          aria-label="Previous preview"
        >
          <SkipIcon direction={-1} />
        </button>
        <button
          type="button"
          className="preview-icon-btn preview-play-btn"
          onClick={togglePlay}
          aria-label={playing ? `Pause ${currentTrack.title}` : `Play ${currentTrack.title}`}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className="preview-icon-btn"
          onClick={() => playAdjacent(1)}
          aria-label="Next preview"
        >
          <SkipIcon direction={1} />
        </button>
      </div>
      <div className="preview-timeline">
        <span>{formatPreviewTime(previewElapsedSec(currentTime, clip))}</span>
        <input
          aria-label="Preview position"
          className="preview-seek"
          max={1}
          min={0}
          onChange={(event) => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.currentTime = seekTimeFromProgress(Number(event.target.value), clip);
          }}
          step={0.001}
          type="range"
          value={progress}
        />
        <span>{formatPreviewTime(clip.durationSec)}</span>
      </div>
      <div className="preview-actions">
        {currentTrack.trackUrl ? (
          <a
            className="preview-open"
            href={currentTrack.trackUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open
          </a>
        ) : null}
        <button
          type="button"
          className="preview-icon-btn"
          onClick={stop}
          aria-label="Close player"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
