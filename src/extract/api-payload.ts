import { buildSnapshot, looksLikeRawTrack, normalizeTrack, type NormalizeContext } from './normalize';
import type { ExtractionSnapshot } from '../types/track';

type ApiPayload = {
  results?: unknown[];
};

export function extractSnapshotFromApiPayload(
  payload: unknown,
  context: NormalizeContext,
): ExtractionSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;

  const results = (payload as ApiPayload).results;
  if (!Array.isArray(results) || !results.some(looksLikeRawTrack)) return null;

  const tracks = results
    .map((item, index) => normalizeTrack(item as Parameters<typeof normalizeTrack>[0], context, index + 1))
    .filter((track): track is NonNullable<typeof track> => track !== null);

  if (!tracks.length) return null;
  return buildSnapshot(tracks, context);
}
