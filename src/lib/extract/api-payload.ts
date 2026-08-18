import { buildSnapshot, looksLikeRawTrack, normalizeTrack, type NormalizeContext } from './normalize';
import type { ExtractionSnapshot } from '../types/track';

type ApiPayload = {
  results?: unknown[];
  pages?: Array<{ results?: unknown[] }>;
};

function collectPayloadResults(payload: ApiPayload): unknown[] {
  if (Array.isArray(payload.pages)) {
    return payload.pages.flatMap((page) => (Array.isArray(page.results) ? page.results : []));
  }
  return Array.isArray(payload.results) ? payload.results : [];
}

export function extractSnapshotFromApiPayload(
  payload: unknown,
  context: NormalizeContext,
): ExtractionSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;

  const results = collectPayloadResults(payload as ApiPayload);
  if (!results.some(looksLikeRawTrack)) return null;

  const tracks = results
    .map((item, index) => normalizeTrack(item as Parameters<typeof normalizeTrack>[0], context, index + 1))
    .filter((track): track is NonNullable<typeof track> => track !== null);

  if (!tracks.length) return null;
  return buildSnapshot(tracks, context);
}
