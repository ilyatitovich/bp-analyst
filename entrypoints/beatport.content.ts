import { browser } from 'wxt/browser';
import { extractSnapshotFromApiPayload } from '../src/lib/extract/api-payload';
import { extractSnapshotFromDom } from '../src/lib/extract/dom';
import { extractSnapshotFromNextData } from '../src/lib/extract/next-data';
import { mergeSnapshots, pickLargestSnapshot } from '../src/lib/extract/merge';
import { STORAGE_KEYS } from '../src/lib/messaging/protocol';
import { extensionStorage, extensionStorageArea } from '../src/lib/messaging/storage';
import { type ExtractionSnapshot } from '../src/lib/types/track';

const PAYLOAD_EVENT = 'bp-analyst:payload';
const LOCATION_EVENT = 'bp-analyst:location-change';

const EXTRACTION_FAIL_DELAY_MS = 2500;

let currentSnapshot: ExtractionSnapshot | null = null;
let refreshTimer: number | null = null;
let failTimer: number | null = null;
let failurePublished = false;

function getContext(source: ExtractionSnapshot['source']) {
  return {
    pageUrl: location.href,
    pageTitle: document.title,
    source,
  };
}

function clearFailTimer(): void {
  if (failTimer === null) return;
  window.clearTimeout(failTimer);
  failTimer = null;
}

async function publishSnapshot(snapshot: ExtractionSnapshot | null): Promise<void> {
  try {
    if (!snapshot) {
      if (failurePublished || failTimer !== null) return;
      failTimer = window.setTimeout(() => {
        failTimer = null;
        failurePublished = true;
        void browser.runtime
          .sendMessage({
            type: 'EXTRACTION_FAILED',
            pageUrl: location.href,
            pageTitle: document.title,
          })
          .catch(() => {
            failurePublished = false;
          });
      }, EXTRACTION_FAIL_DELAY_MS);
      return;
    }

    clearFailTimer();
    failurePublished = false;
    currentSnapshot = snapshot;
    await browser.runtime.sendMessage({
      type: 'TRACKS_EXTRACTED',
      snapshot,
    });
  } catch {
    // Background or panel may not be listening yet.
  }
}

async function extractAndPublish(payload?: unknown, reset = false): Promise<void> {
  if (reset) {
    currentSnapshot = null;
    failurePublished = false;
    clearFailTimer();
  }

  const incoming = pickLargestSnapshot(
    payload ? extractSnapshotFromApiPayload(payload, getContext('api-payload')) : null,
    extractSnapshotFromNextData(getContext('next-data')),
    extractSnapshotFromDom(getContext('dom')),
  );

  const snapshot = mergeSnapshots(currentSnapshot, incoming);
  await publishSnapshot(snapshot);
}

function scheduleExtraction(payload?: unknown, reset = false): void {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
  }
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    void extractAndPublish(payload, reset);
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
      scheduleExtraction(undefined, true);
    });

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'REQUEST_REFRESH') {
        void extractAndPublish(undefined, true).then(() => sendResponse({ ok: true }));
        return true;
      }
      return false;
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== extensionStorageArea) return;
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
