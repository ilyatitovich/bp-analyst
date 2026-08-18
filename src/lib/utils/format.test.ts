import { describe, expect, it } from 'vitest';
import {
  bpmBucketRangeLabel,
  bpmBucketStartLabel,
  coverageLabel,
  formatBpm,
  formatBpmRange,
  formatShare,
  headerStatus,
} from './format';

describe('formatShare', () => {
  it('renders percents and a dash for missing values', () => {
    expect(formatShare(null)).toBe('-');
    expect(formatShare(0)).toBe('0%');
    expect(formatShare(0.724)).toBe('72%');
  });
});

describe('formatBpm', () => {
  it('stringifies bpm values', () => {
    expect(formatBpm(null)).toBe('-');
    expect(formatBpm(124)).toBe('124');
  });
});

describe('formatBpmRange', () => {
  it('joins p25 and p75 with an en dash', () => {
    expect(formatBpmRange(null, 130)).toBe('-');
    expect(formatBpmRange(122, 128)).toBe('122–128');
  });
});

describe('coverageLabel', () => {
  it('hides coverage when the list is complete', () => {
    expect(coverageLabel(100, 100, true)).toBeNull();
  });

  it('shows N of M while pages are still loading', () => {
    expect(coverageLabel(25, 100, false)).toBe('Based on 25 of 100 tracks');
  });

  it('falls back to track count when list size is unknown', () => {
    expect(coverageLabel(25, null, false)).toBe('Based on 25 tracks');
  });
});

describe('headerStatus', () => {
  it('prefers refresh and extraction copy over snapshot counts', () => {
    expect(
      headerStatus({
        refreshing: true,
        showExtractionHelp: false,
        hasSnapshot: true,
        source: 'api-payload',
        trackCount: 100,
        visibleCount: 100,
        filtersActive: false,
      }),
    ).toBe('Reloading Beatport page…');
  });

  it('shows filtered counts against the live snapshot source', () => {
    expect(
      headerStatus({
        refreshing: false,
        showExtractionHelp: false,
        hasSnapshot: true,
        source: 'api-payload',
        trackCount: 100,
        visibleCount: 12,
        filtersActive: true,
      }),
    ).toBe('12 of 100 tracks from api-payload');
  });
});

describe('bpm bucket labels', () => {
  it('shows the bucket start on the axis and an en dash in chips', () => {
    expect(bpmBucketStartLabel('120-124')).toBe('120');
    expect(bpmBucketRangeLabel('120-124')).toBe('120–124');
  });
});
