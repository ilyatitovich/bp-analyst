import { buildSnapshot, trackRichness } from './normalize';
import type { ExtractionSnapshot, Track } from '../types/track';

export function pickLargestSnapshot(
  ...snapshots: Array<ExtractionSnapshot | null | undefined>
): ExtractionSnapshot | null {
  return snapshots.reduce<ExtractionSnapshot | null>((best, next) => {
    if (!next) return best;
    if (!best || next.trackCount > best.trackCount) return next;
    return best;
  }, null);
}

export function mergeSnapshots(
  current: ExtractionSnapshot | null,
  incoming: ExtractionSnapshot | null,
): ExtractionSnapshot | null {
  if (!incoming) return current;
  if (!current || current.pageUrl !== incoming.pageUrl) {
    return buildSnapshot(incoming.tracks, {
      pageUrl: incoming.pageUrl,
      pageTitle: incoming.pageTitle,
      source: incoming.source,
    });
  }

  const currentIds = new Set(current.tracks.map((track) => track.id));
  const overlap = incoming.tracks.filter((track) => currentIds.has(track.id)).length;
  if (incoming.tracks.length < current.tracks.length && overlap === 0) {
    return current;
  }

  const preferIncomingOrder = incoming.tracks.length > current.tracks.length;
  const primary = preferIncomingOrder ? incoming.tracks : current.tracks;
  const secondary = preferIncomingOrder ? current.tracks : incoming.tracks;
  const betterById = new Map<number, Track>();

  for (const track of [...current.tracks, ...incoming.tracks]) {
    const existing = betterById.get(track.id);
    if (!existing || trackRichness(track) > trackRichness(existing)) {
      betterById.set(track.id, track);
    }
  }

  const ordered: Track[] = [];
  const seen = new Set<number>();

  for (const track of primary) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    ordered.push(betterById.get(track.id) ?? track);
  }

  let nextPosition = ordered.length;
  for (const track of secondary) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    nextPosition += 1;
    const richer = betterById.get(track.id) ?? track;
    ordered.push({ ...richer, position: nextPosition });
  }

  return buildSnapshot(
    ordered.map((track, index) => ({ ...track, position: track.position ?? index + 1 })),
    {
      pageUrl: incoming.pageUrl,
      pageTitle: incoming.pageTitle || current.pageTitle,
      source: preferIncomingOrder ? incoming.source : current.source,
    },
  );
}
