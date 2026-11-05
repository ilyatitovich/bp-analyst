import { describe, expect, it } from 'vitest';
import {
  LEGACY_GLOBAL_TAB_KEYS,
  isTabScopedStorageKey,
  parseTabIdFromStorageKey,
  tabScopedStorageKeys,
  tabStorageKey,
} from '../../../src/lib/messaging/tab-state';

describe('tab storage keys', () => {
  it('keys snapshot and error state by tab id', () => {
    expect(tabStorageKey('snapshot', 42)).toBe('beatportAnalyst.snapshot.42');
    expect(tabStorageKey('extractionError', 42)).toBe(
      'beatportAnalyst.extractionError.42',
    );
  });

  it('lists every per-tab key that cleanup must remove', () => {
    expect(tabScopedStorageKeys(15)).toEqual([
      'beatportAnalyst.snapshot.15',
      'beatportAnalyst.extractionError.15',
      'beatportAnalyst.skipNextAutoRefresh.15',
    ]);
  });

  it('parses tab ids from scoped keys and rejects legacy globals', () => {
    expect(parseTabIdFromStorageKey('beatportAnalyst.snapshot.9', 'snapshot')).toBe(9);
    expect(parseTabIdFromStorageKey('beatportAnalyst.snapshot', 'snapshot')).toBeNull();
    expect(parseTabIdFromStorageKey('beatportAnalyst.snapshot.x', 'snapshot')).toBeNull();
    expect(isTabScopedStorageKey('beatportAnalyst.snapshot.3')).toBe(true);
    expect(isTabScopedStorageKey('beatportAnalyst.skipNextAutoRefresh.3')).toBe(true);
    expect(isTabScopedStorageKey('beatportAnalyst.snapshot')).toBe(false);
  });

  it('keeps legacy global keys distinct so startup can clear them', () => {
    expect(LEGACY_GLOBAL_TAB_KEYS).toEqual([
      'beatportAnalyst.snapshot',
      'beatportAnalyst.extractionError',
      'beatportAnalyst.skipNextAutoRefresh',
    ]);
    for (const key of LEGACY_GLOBAL_TAB_KEYS) {
      expect(isTabScopedStorageKey(key)).toBe(false);
      expect(tabScopedStorageKeys(1)).not.toContain(key);
    }
  });
});
