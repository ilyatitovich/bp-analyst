import { toCamelot } from '../analysis/camelot';
import type { ExtractionSnapshot, Track, TrackFacet, TrackPerson, TrackSnapshotSource } from '../types/track';

type RawNamed = {
  id?: number;
  name?: string;
  slug?: string | null;
};

type RawImage = {
  uri?: string | null;
  dynamic_uri?: string | null;
};

type RawSampleMp3 = {
  url?: string | null;
  offset?: {
    start?: number | null;
    end?: number | null;
  } | null;
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
    image?: RawImage | null;
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
  sample_url?: string | null;
  sample_start_ms?: number | null;
  sample_end_ms?: number | null;
  sample?: {
    mp3_url?: string | null;
    mp3?: string | RawSampleMp3 | null;
  } | null;
  image?: RawImage | null;
};

export type NormalizeContext = {
  pageUrl: string;
  pageTitle: string;
  source: TrackSnapshotSource;
};

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizePeople(values: RawNamed[] | undefined): TrackPerson[] {
  return (values ?? []).flatMap((value) => {
    const name = blankToNull(value?.name);
    if (!name) return [];
    return [
      {
        id: value.id,
        name,
        slug: blankToNull(value.slug),
      },
    ];
  });
}

function normalizeFacet(value: RawNamed | null | undefined): TrackFacet | null {
  const name = blankToNull(value?.name);
  if (!name || !value) return null;
  return {
    id: value.id,
    name,
    slug: blankToNull(value.slug),
  };
}

function normalizeBpm(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value >= 400) {
    return null;
  }
  return value;
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function asMs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizePreviewUrl(rawTrack: RawTrack): string | null {
  const sample = rawTrack.sample;
  const mp3 = sample?.mp3;
  const nestedUrl = typeof mp3 === 'string' ? mp3 : mp3?.url;
  return asHttpUrl(rawTrack.sample_url) ?? asHttpUrl(sample?.mp3_url) ?? asHttpUrl(nestedUrl);
}

function normalizePreviewWindow(rawTrack: RawTrack): { start: number | null; end: number | null } {
  const mp3 = rawTrack.sample?.mp3;
  const offset = mp3 && typeof mp3 === 'object' ? mp3.offset : null;
  const start = asMs(rawTrack.sample_start_ms) ?? asMs(offset?.start);
  const end = asMs(rawTrack.sample_end_ms) ?? asMs(offset?.end);
  return {
    start,
    end: end !== null && start !== null && end <= start ? null : end,
  };
}

function normalizeArtworkUrl(image: RawImage | null | undefined): string | null {
  if (!image) return null;
  if (typeof image.dynamic_uri === 'string' && image.dynamic_uri.includes('{')) {
    return image.dynamic_uri.replace(/\{w(?:idth)?\}x\{h(?:eight)?\}/i, '80x80');
  }
  if (typeof image.uri === 'string') {
    return image.uri.replace(/image_size\/\d+x\d+\//, 'image_size/80x80/');
  }
  return asHttpUrl(image.dynamic_uri) ?? asHttpUrl(image.uri);
}

export function looksLikeRawTrack(value: unknown): value is RawTrack {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as RawTrack;
  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    candidate.id > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    'bpm' in candidate
  );
}

export function isUsableTrack(track: Track): boolean {
  return (
    Number.isFinite(track.id) &&
    track.id > 0 &&
    Boolean(track.title.trim()) &&
    track.artists.some((artist) => artist.name.trim()) &&
    normalizeBpm(track.bpm) !== null
  );
}

export function normalizeTrack(
  rawTrack: RawTrack,
  context: NormalizeContext,
  position: number | null,
): Track | null {
  if (!looksLikeRawTrack(rawTrack)) return null;

  const title = blankToNull(rawTrack.name);
  const artists = normalizePeople(rawTrack.artists);
  const bpm = normalizeBpm(rawTrack.bpm);
  if (!title || !artists.length || bpm === null) return null;

  const slug = blankToNull(rawTrack.slug);
  const pageTrackUrl = slug ? `https://www.beatport.com/track/${slug}/${rawTrack.id}` : null;
  const previewWindow = normalizePreviewWindow(rawTrack);
  const priceDisplay = blankToNull(rawTrack.price?.display);

  return {
    id: rawTrack.id!,
    position,
    title,
    mixName: rawTrack.mix_name?.trim() ?? '',
    artists,
    remixers: normalizePeople(rawTrack.remixers),
    bpm,
    keyName: blankToNull(rawTrack.key?.name),
    camelot: toCamelot(rawTrack.key?.camelot_number, rawTrack.key?.camelot_letter),
    genre: normalizeFacet(rawTrack.genre),
    subGenre: normalizeFacet(rawTrack.sub_genre),
    label: normalizeFacet(rawTrack.release?.label),
    releaseName: blankToNull(rawTrack.release?.name),
    length: blankToNull(rawTrack.length),
    lengthMs: asMs(rawTrack.length_ms),
    publishDate: blankToNull(rawTrack.publish_date),
    price: priceDisplay ?? (typeof rawTrack.price?.value === 'number' ? String(rawTrack.price.value) : null),
    exclusive: Boolean(rawTrack.exclusive),
    hype: Boolean(rawTrack.is_hype),
    isrc: blankToNull(rawTrack.isrc),
    slug,
    trackUrl: pageTrackUrl,
    previewUrl: normalizePreviewUrl(rawTrack),
    previewStartMs: previewWindow.start,
    previewEndMs: previewWindow.end,
    artworkUrl: normalizeArtworkUrl(rawTrack.image) ?? normalizeArtworkUrl(rawTrack.release?.image),
    pageUrl: context.pageUrl,
    pageTitle: context.pageTitle,
    extractedAt: new Date().toISOString(),
    source: context.source,
  };
}

export function trackRichness(track: Track): number {
  return [
    track.camelot,
    track.bpm,
    track.isrc,
    track.genre?.name,
    track.label?.name,
    track.previewUrl,
  ].filter(Boolean).length;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function trackIdentity(track: Track): string {
  const artists = track.artists
    .map((artist) => normalizeName(artist.name))
    .filter(Boolean)
    .sort()
    .join(',');
  return `${artists}\0${normalizeName(track.title)}`;
}

export function uniqueTracks(tracks: Track[]): Track[] {
  const betterById = new Map<number, Track>();
  const idOrder: number[] = [];

  for (const track of tracks) {
    if (!isUsableTrack(track)) continue;
    const existing = betterById.get(track.id);
    if (!existing) {
      betterById.set(track.id, track);
      idOrder.push(track.id);
      continue;
    }
    if (trackRichness(track) > trackRichness(existing)) {
      betterById.set(track.id, track);
    }
  }

  const betterByName = new Map<string, Track>();
  const nameOrder: string[] = [];

  for (const id of idOrder) {
    const track = betterById.get(id)!;
    const key = trackIdentity(track);
    const existing = betterByName.get(key);
    if (!existing) {
      betterByName.set(key, track);
      nameOrder.push(key);
      continue;
    }
    if (trackRichness(track) > trackRichness(existing)) {
      betterByName.set(key, track);
    }
  }

  return nameOrder.map((key, index) => {
    const track = betterByName.get(key)!;
    return { ...track, position: index + 1 };
  });
}

export function buildSnapshot(
  tracks: Track[],
  context: NormalizeContext,
): ExtractionSnapshot {
  const unique = uniqueTracks(tracks);
  return {
    pageUrl: context.pageUrl,
    pageTitle: context.pageTitle,
    extractedAt: new Date().toISOString(),
    source: context.source,
    trackCount: unique.length,
    tracks: unique,
  };
}
