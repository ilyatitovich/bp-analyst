import { browser } from 'wxt/browser';
import { filterTracks } from '../src/analysis/filters';
import { extractSnapshotFromApiPayload } from '../src/extract/api-payload';
import { extractSnapshotFromDom } from '../src/extract/dom';
import { extractSnapshotFromNextData } from '../src/extract/next-data';
import { applyRowHighlights } from '../src/highlight/rows';
import { STORAGE_KEYS } from '../src/messaging/protocol';
import { extensionStorage, extensionStorageArea } from '../src/messaging/storage';
import { DEFAULT_FILTERS, type ExtractionSnapshot, type TrackFilters } from '../src/types/track';

const PAYLOAD_EVENT = 'bp-analyst:payload';
const LOCATION_EVENT = 'bp-analyst:location-change';

let currentSnapshot: ExtractionSnapshot | null = null;
let refreshTimer: number | null = null;

function getContext(source: ExtractionSnapshot['source']) {
  return {
    pageUrl: location.href,
    pageTitle: document.title,
    source,
  };
}

async function readFilters(): Promise<TrackFilters> {
  const stored = await extensionStorage.get([STORAGE_KEYS.filters]);
  return (stored[STORAGE_KEYS.filters] as TrackFilters | undefined) ?? DEFAULT_FILTERS;
}

async function syncHighlights(): Promise<void> {
  if (!currentSnapshot) return;
  const filters = await readFilters();
  const visibleTracks = filterTracks(currentSnapshot.tracks, filters);
  applyRowHighlights(currentSnapshot.tracks, visibleTracks);
}

async function publishSnapshot(snapshot: ExtractionSnapshot | null): Promise<void> {
  if (!snapshot) return;
  currentSnapshot = snapshot;
  try {
    await browser.runtime.sendMessage({
      type: 'TRACKS_EXTRACTED',
      snapshot,
    });
  } catch {
    // Background or panel may not be listening yet.
  }
  await syncHighlights();
}

async function extractAndPublish(payload?: unknown): Promise<void> {
  const snapshot =
    (payload ? extractSnapshotFromApiPayload(payload, getContext('api-payload')) : null) ??
    extractSnapshotFromNextData(getContext('next-data')) ??
    extractSnapshotFromDom(getContext('dom'));

  await publishSnapshot(snapshot);
}

function scheduleExtraction(payload?: unknown): void {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
  }
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    void extractAndPublish(payload);
  }, 150);
}

export default defineContentScript({
  matches: ['*://*.beatport.com/*'],
  runAt: 'document_start',
  async main() {
    await injectScript('/beatport-fetch.js', { keepInDom: true });

    window.addEventListener(PAYLOAD_EVENT, (event) => {
      const customEvent = event as CustomEvent;
      scheduleExtraction(customEvent.detail);
    });

    window.addEventListener(LOCATION_EVENT, () => {
      scheduleExtraction();
    });

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'REQUEST_REFRESH') {
        void extractAndPublish().then(() => sendResponse({ ok: true }));
        return true;
      }
      return false;
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== extensionStorageArea) return;
      if (changes[STORAGE_KEYS.filters]) {
        void syncHighlights();
      }
      if (changes[STORAGE_KEYS.refreshToken]) {
        void extractAndPublish();
      }
    });

    const observer = new MutationObserver(() => {
      scheduleExtraction();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        void extractAndPublish();
      });
    } else {
      await extractAndPublish();
    }
  },
});
