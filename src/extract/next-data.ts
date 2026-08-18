import { buildSnapshot, looksLikeRawTrack, normalizeTrack, type NormalizeContext } from './normalize';
import type { ExtractionSnapshot } from '../types/track';

type NextData = {
  props?: {
    pageProps?: {
      dehydratedState?: {
        queries?: Array<{
          state?: {
            data?: {
              results?: unknown[];
            };
          };
        }>;
      };
    };
  };
};

export function extractSnapshotFromNextDataObject(
  parsed: NextData,
  context: NormalizeContext,
): ExtractionSnapshot | null {
  const queries = parsed.props?.pageProps?.dehydratedState?.queries ?? [];
  const trackQuery = queries.find((query) => {
    const results = query.state?.data?.results;
    return Array.isArray(results) && results.some(looksLikeRawTrack);
  });

  const results = trackQuery?.state?.data?.results;
  if (!Array.isArray(results)) return null;

  const tracks = results
    .map((item, index) => normalizeTrack(item as Parameters<typeof normalizeTrack>[0], context, index + 1))
    .filter((track): track is NonNullable<typeof track> => track !== null);

  if (!tracks.length) return null;
  return buildSnapshot(tracks, context);
}

export function extractSnapshotFromNextData(context: NormalizeContext): ExtractionSnapshot | null {
  const script = document.getElementById('__NEXT_DATA__');
  if (!script?.textContent) return null;

  let parsed: NextData;
  try {
    parsed = JSON.parse(script.textContent) as NextData;
  } catch {
    return null;
  }
  return extractSnapshotFromNextDataObject(parsed, context);
}
