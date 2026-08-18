export type TrackPerson = {
  id?: number;
  name: string;
  slug?: string | null;
};

export type TrackFacet = {
  id?: number;
  name: string;
  slug?: string | null;
};

export type TrackSnapshotSource = 'next-data' | 'api-payload' | 'dom';

export type Track = {
  id: number;
  position: number | null;
  title: string;
  mixName: string;
  artists: TrackPerson[];
  remixers: TrackPerson[];
  bpm: number | null;
  keyName: string | null;
  camelot: string | null;
  genre: TrackFacet | null;
  subGenre: TrackFacet | null;
  label: TrackFacet | null;
  releaseName: string | null;
  length: string | null;
  lengthMs: number | null;
  publishDate: string | null;
  price: string | null;
  exclusive: boolean;
  hype: boolean;
  isrc: string | null;
  slug: string | null;
  trackUrl: string | null;
  previewUrl: string | null;
  previewStartMs: number | null;
  previewEndMs: number | null;
  artworkUrl: string | null;
  pageUrl: string;
  pageTitle: string;
  extractedAt: string;
  source: TrackSnapshotSource;
};

export type ExtractionSnapshot = {
  pageUrl: string;
  pageTitle: string;
  extractedAt: string;
  source: TrackSnapshotSource;
  trackCount: number;
  tracks: Track[];
  listCount?: number | null;
  complete?: boolean;
};

export type TrackFilters = {
  bpmMin: number | null;
  bpmMax: number | null;
  bpmBuckets: string[];
  camelotKeys: string[];
  compatibleWith: string | null;
  genreNames: string[];
  labelNames: string[];
  artistNames: string[];
  labelQuery: string;
  titleQuery: string;
  mixTypes: string[];
  publishedWithinDays: 7 | 30 | null;
  includeExclusiveOnly: boolean;
  includeHypeOnly: boolean;
};

export const DEFAULT_FILTERS: TrackFilters = {
  bpmMin: null,
  bpmMax: null,
  bpmBuckets: [],
  camelotKeys: [],
  compatibleWith: null,
  genreNames: [],
  labelNames: [],
  artistNames: [],
  labelQuery: '',
  titleQuery: '',
  mixTypes: [],
  publishedWithinDays: null,
  includeExclusiveOnly: false,
  includeHypeOnly: false,
};
