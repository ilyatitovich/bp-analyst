import { buildSnapshot, looksLikeRawTrack, normalizeTrack, type NormalizeContext } from './normalize';
import type { ExtractionSnapshot } from '../types/track';

type QueryData = {
  results?: unknown[];
  pages?: Array<{ results?: unknown[] }>;
};

type NextData = {
  props?: {
    pageProps?: {
      dehydratedState?: {
        queries?: Array<{
          state?: {
            data?: QueryData;
          };
        }>;
      };
    };
  };
};

function collectQueryResults(data: QueryData | undefined): unknown[] {
  if (!data) return [];
  if (Array.isArray(data.pages)) {
    return data.pages.flatMap((page) => (Array.isArray(page?.results) ? page.results : []));
  }
  return Array.isArray(data.results) ? data.results : [];
}

export function extractSnapshotFromNextDataObject(
  parsed: NextData,
  context: NormalizeContext,
): ExtractionSnapshot | null {
  const queries = parsed.props?.pageProps?.dehydratedState?.queries ?? [];
  const ranked = queries
    .map((query) => collectQueryResults(query.state?.data).filter(looksLikeRawTrack))
    .sort((left, right) => right.length - left.length);
  const results = ranked[0];
  if (!results?.length) return null;

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
