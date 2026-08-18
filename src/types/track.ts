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
};

export type TrackFilters = {
  bpmMin: number | null;
  bpmMax: number | null;
  bpmBuckets: string[];
  camelotKeys: string[];
  compatibleWith: string | null;
  genreNames: string[];
  labelNames: string[];
  labelQuery: string;
  titleQuery: string;
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
  labelQuery: '',
  titleQuery: '',
  includeExclusiveOnly: false,
  includeHypeOnly: false,
};
