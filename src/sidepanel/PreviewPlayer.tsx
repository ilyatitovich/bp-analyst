import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  formatPreviewTime,
  previewElapsedSec,
  previewProgress,
  resolvedPreviewWindow,
  seekTimeFromProgress,
} from "../player/preview";
import type { Track } from "../types/track";

type PreviewPlayerHandle = {
  currentTrack: Track | null;
  playing: boolean;
  error: boolean;
  playTrack: (track: Track) => void;
  playAdjacent: (direction: -1 | 1) => void;
  togglePlay: () => void;
  stop: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
};

function revokeBlobUrl(urlRef: { current: string | null }): void {
  if (!urlRef.current) return;
  URL.revokeObjectURL(urlRef.current);
  urlRef.current = null;
}

export function usePreviewPlayer(queue: Track[]): PreviewPlayerHandle {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const trackRef = useRef<Track | null>(null);
  const queueRef = useRef(queue);
  const generationRef = useRef(0);
  queueRef.current = queue;

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const errorRef = useRef(false);
  errorRef.current = error;

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const audio = getAudio();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      const track = trackRef.current;
      if (!track) return;
      audio.currentTime = resolvedPreviewWindow(
        track,
        Number.isFinite(audio.duration) ? audio.duration : null,
      ).startSec;
      setPlaying(false);
    };
    const onTimeUpdate = () => {
      const track = trackRef.current;
      if (!track) return;
      const clip = resolvedPreviewWindow(
        track,
        Number.isFinite(audio.duration) ? audio.duration : null,
      );
      if (audio.currentTime >= clip.endSec - 0.05) {
        audio.pause();
        audio.currentTime = clip.startSec;
      }
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      generationRef.current += 1;
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      revokeBlobUrl(blobUrlRef);
      audioRef.current = null;
    };
  }, [getAudio]);

  const loadAndPlay = useCallback(
    async (track: Track, src: string, generation: number, allowBlobFallback: boolean) => {
      const audio = getAudio();

      const seekAndPlay = () => {
        if (generation !== generationRef.current || trackRef.current?.id !== track.id) return;
        const readyClip = resolvedPreviewWindow(
          track,
          Number.isFinite(audio.duration) ? audio.duration : null,
        );
        audio.currentTime = readyClip.startSec;
        void audio.play().catch(() => {
          if (generation !== generationRef.current) return;
          setError(true);
          setPlaying(false);
        });
      };

      const onError = async () => {
        if (generation !== generationRef.current) return;
        if (!allowBlobFallback || !track.previewUrl) {
          setError(true);
          setPlaying(false);
          return;
        }
        try {
          const response = await fetch(track.previewUrl);
          if (!response.ok) throw new Error("preview fetch failed");
          const blobUrl = URL.createObjectURL(await response.blob());
          if (generation !== generationRef.current) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          revokeBlobUrl(blobUrlRef);
          blobUrlRef.current = blobUrl;
          await loadAndPlay(track, blobUrl, generation, false);
        } catch {
          if (generation !== generationRef.current) return;
          setError(true);
          setPlaying(false);
        }
      };

      audio.addEventListener("loadedmetadata", seekAndPlay, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.src = src;
      audio.load();
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        seekAndPlay();
      }
    },
    [getAudio],
  );

  const playTrack = useCallback(
    (track: Track) => {
      if (!track.previewUrl) return;
      const audio = getAudio();
      if (trackRef.current?.id === track.id && audio.src && !errorRef.current) {
        if (audio.src) {
          if (audio.paused) {
            void audio.play().catch(() => {
              setError(true);
              setPlaying(false);
            });
          } else {
            audio.pause();
          }
        }
        return;
      }

      const generation = generationRef.current + 1;
      generationRef.current = generation;
      revokeBlobUrl(blobUrlRef);
      setError(false);
      trackRef.current = track;
      setCurrentTrack(track);
      void loadAndPlay(track, track.previewUrl, generation, true);
    },
    [getAudio, loadAndPlay],
  );

  const togglePlay = useCallback(() => {
    const track = trackRef.current;
    if (track) playTrack(track);
  }, [playTrack]);

  const playAdjacent = useCallback(
    (direction: -1 | 1) => {
      const playable = queueRef.current.filter((track) => track.previewUrl);
      if (!playable.length) return;
      const currentId = trackRef.current?.id;
      const index = playable.findIndex((track) => track.id === currentId);
      const nextIndex =
        index === -1
          ? direction === 1
            ? 0
            : playable.length - 1
          : (index + direction + playable.length) % playable.length;
      playTrack(playable[nextIndex]!);
    },
    [playTrack],
  );

  const stop = useCallback(() => {
    generationRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    revokeBlobUrl(blobUrlRef);
    trackRef.current = null;
    setCurrentTrack(null);
    setPlaying(false);
    setError(false);
  }, []);

  return {
    currentTrack,
    playing,
    error,
    playTrack,
    playAdjacent,
    togglePlay,
    stop,
    audioRef,
  };
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M5 3.2v9.6L13 8 5 3.2z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4 3h3v10H4V3zm5 0h3v10H9V3z" fill="currentColor" />
    </svg>
  );
}

function SkipIcon({ direction }: { direction: -1 | 1 }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      style={direction === -1 ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M3 3h2v10H3V3zm3 0l8 5-8 5V3z" fill="currentColor" />
    </svg>
  );
}

export function PreviewPlayer({
  player,
}: {
  player: PreviewPlayerHandle;
}) {
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
