import { toCamelot } from '../analysis/camelot';
import type { ExtractionSnapshot, Track, TrackFacet, TrackPerson, TrackSnapshotSource } from '../types/track';

type RawNamed = {
  id?: number;
  name?: string;
  slug?: string | null;
};

type RawTrack = {
  id?: number;
  name?: string;
  mix_name?: string;
  artists?: RawNamed[];
  remixers?: RawNamed[];
  bpm?: number | null;
  key?: {
    name?: string | null;
    camelot_number?: number | null;
    camelot_letter?: string | null;
  } | null;
  genre?: RawNamed | null;
  sub_genre?: RawNamed | null;
  release?: {
    name?: string | null;
    label?: RawNamed | null;
  } | null;
  length?: string | null;
  length_ms?: number | null;
  publish_date?: string | null;
  price?: {
    display?: string | null;
    value?: number | null;
  } | null;
  exclusive?: boolean;
  is_hype?: boolean;
  isrc?: string | null;
  slug?: string | null;
};

export type NormalizeContext = {
  pageUrl: string;
  pageTitle: string;
  source: TrackSnapshotSource;
};

function normalizePeople(values: RawNamed[] | undefined): TrackPerson[] {
  return (values ?? [])
    .filter((value): value is Required<Pick<RawNamed, 'name'>> & RawNamed => Boolean(value?.name))
    .map((value) => ({
      id: value.id,
      name: value.name!,
      slug: value.slug ?? null,
    }));
}

function normalizeFacet(value: RawNamed | null | undefined): TrackFacet | null {
  if (!value?.name) return null;
  return {
    id: value.id,
    name: value.name,
    slug: value.slug ?? null,
  };
}

export function looksLikeRawTrack(value: unknown): value is RawTrack {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as RawTrack;
  return typeof candidate.id === 'number' && typeof candidate.name === 'string' && 'bpm' in candidate;
}

export function normalizeTrack(
  rawTrack: RawTrack,
  context: NormalizeContext,
  position: number | null,
): Track | null {
  if (!looksLikeRawTrack(rawTrack)) return null;

  const pageTrackUrl = rawTrack.slug ? `https://www.beatport.com/track/${rawTrack.slug}/${rawTrack.id}` : null;

  return {
    id: rawTrack.id!,
    position,
    title: rawTrack.name!,
    mixName: rawTrack.mix_name ?? '',
    artists: normalizePeople(rawTrack.artists),
    remixers: normalizePeople(rawTrack.remixers),
    bpm: typeof rawTrack.bpm === 'number' ? rawTrack.bpm : null,
    keyName: rawTrack.key?.name ?? null,
    camelot: toCamelot(rawTrack.key?.camelot_number, rawTrack.key?.camelot_letter),
    genre: normalizeFacet(rawTrack.genre),
    subGenre: normalizeFacet(rawTrack.sub_genre),
    label: normalizeFacet(rawTrack.release?.label),
    releaseName: rawTrack.release?.name ?? null,
    length: rawTrack.length ?? null,
    lengthMs: rawTrack.length_ms ?? null,
    publishDate: rawTrack.publish_date ?? null,
    price:
      rawTrack.price?.display ??
      (typeof rawTrack.price?.value === 'number' ? String(rawTrack.price.value) : null),
    exclusive: Boolean(rawTrack.exclusive),
    hype: Boolean(rawTrack.is_hype),
    isrc: rawTrack.isrc ?? null,
    slug: rawTrack.slug ?? null,
    trackUrl: pageTrackUrl,
    pageUrl: context.pageUrl,
    pageTitle: context.pageTitle,
    extractedAt: new Date().toISOString(),
    source: context.source,
  };
}

export function buildSnapshot(
  tracks: Track[],
  context: NormalizeContext,
): ExtractionSnapshot {
  return {
    pageUrl: context.pageUrl,
    pageTitle: context.pageTitle,
    extractedAt: new Date().toISOString(),
    source: context.source,
    trackCount: tracks.length,
    tracks,
  };
}
