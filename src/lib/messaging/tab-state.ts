export const TAB_STORAGE_PREFIXES = {
  snapshot: 'beatportAnalyst.snapshot.',
  extractionError: 'beatportAnalyst.extractionError.',
  skipNextAutoRefresh: 'beatportAnalyst.skipNextAutoRefresh.',
} as const;

export type TabStorageKind = keyof typeof TAB_STORAGE_PREFIXES;

/** Legacy single-key entries replaced by per-tab keys. */
export const LEGACY_GLOBAL_TAB_KEYS = [
  'beatportAnalyst.snapshot',
  'beatportAnalyst.extractionError',
  'beatportAnalyst.skipNextAutoRefresh',
] as const;

export function tabStorageKey(kind: TabStorageKind, tabId: number): string {
  return `${TAB_STORAGE_PREFIXES[kind]}${tabId}`;
}

export function parseTabIdFromStorageKey(key: string, kind: TabStorageKind): number | null {
  const prefix = TAB_STORAGE_PREFIXES[kind];
  if (!key.startsWith(prefix)) return null;
  const raw = key.slice(prefix.length);
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export function tabScopedStorageKeys(tabId: number): string[] {
  return [
    tabStorageKey('snapshot', tabId),
    tabStorageKey('extractionError', tabId),
    tabStorageKey('skipNextAutoRefresh', tabId),
  ];
}

export function isTabScopedStorageKey(key: string): boolean {
  return (Object.keys(TAB_STORAGE_PREFIXES) as TabStorageKind[]).some(
    (kind) => parseTabIdFromStorageKey(key, kind) !== null,
  );
}
