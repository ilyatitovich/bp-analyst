import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { resolvedPreviewWindow } from "../../lib/player/preview";
import type { Track } from "../../lib/types/track";

export type PreviewPlayerHandle = {
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
