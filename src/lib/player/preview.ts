export const DEFAULT_PREVIEW_MS = 120_000;

export type PreviewWindow = {
  startSec: number;
  endSec: number;
  durationSec: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function previewWindow(track: {
  previewStartMs: number | null;
  previewEndMs: number | null;
}): PreviewWindow {
  const startMs = track.previewStartMs ?? 0;
  const endMs =
    track.previewEndMs !== null && track.previewEndMs > startMs
      ? track.previewEndMs
      : startMs + DEFAULT_PREVIEW_MS;
  const startSec = startMs / 1000;
  const endSec = endMs / 1000;
  return {
    startSec,
    endSec,
    durationSec: Math.max(0.001, endSec - startSec),
  };
}

export function resolvedPreviewWindow(
  track: {
    previewStartMs: number | null;
    previewEndMs: number | null;
  },
  durationSec: number | null,
): PreviewWindow {
  const clip = previewWindow(track);
  if (durationSec == null || !Number.isFinite(durationSec) || durationSec <= 0) {
    return clip;
  }
  if (clip.startSec < durationSec) {
    const endSec = Math.min(clip.endSec, durationSec);
    return {
      startSec: clip.startSec,
      endSec,
      durationSec: Math.max(0.001, endSec - clip.startSec),
    };
  }
  const endSec = Math.min(durationSec, DEFAULT_PREVIEW_MS / 1000);
  return {
    startSec: 0,
    endSec,
    durationSec: Math.max(0.001, endSec),
  };
}

export function previewProgress(currentTime: number, window: PreviewWindow): number {
  return clamp((currentTime - window.startSec) / window.durationSec, 0, 1);
}

export function previewElapsedSec(currentTime: number, window: PreviewWindow): number {
  return clamp(currentTime - window.startSec, 0, window.durationSec);
}

export function seekTimeFromProgress(progress: number, window: PreviewWindow): number {
  return window.startSec + clamp(progress, 0, 1) * window.durationSec;
}

export function formatPreviewTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds + Number.EPSILON));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
