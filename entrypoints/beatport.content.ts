import { browser } from 'wxt/browser';
import { extractSnapshotFromApiPayload } from '../src/lib/extract/api-payload';
import { extractSnapshotFromDom } from '../src/lib/extract/dom';
import { extractSnapshotFromNextData } from '../src/lib/extract/next-data';
import { mergeSnapshots, pickLargestSnapshot } from '../src/lib/extract/merge';
import { STORAGE_KEYS } from '../src/lib/messaging/protocol';
import { extensionStorageArea } from '../src/lib/messaging/storage';
import { type ExtractionSnapshot } from '../src/lib/types/track';

const PAYLOAD_EVENT = 'bp-analyst:payload';
const LOCATION_EVENT = 'bp-analyst:location-change';

const EXTRACTION_FAIL_DELAY_MS = 2500;
const SETTLE_MS = 2000;
const STARTUP_NAV_GRACE_MS = 500;

let currentSnapshot: ExtractionSnapshot | null = null;
let latestPayload: unknown;
let refreshTimer: number | null = null;
let failTimer: number | null = null;
let settleTimer: number | null = null;
let failurePublished = false;
let armed = true;
let lastHref = '';
let startedAt = 0;
let observer: MutationObserver | null = null;

function getContext(source: ExtractionSnapshot['source']) {
  return {
    pageUrl: location.href,
    pageTitle: document.title,
    source,
  };
}

function pathnameOf(href: string): string {
  try {
    return new URL(href).pathname;
  } catch {
    return href;
  }
}

function clearFailTimer(): void {
  if (failTimer === null) return;
  window.clearTimeout(failTimer);
  failTimer = null;
}

function clearSettleTimer(): void {
  if (settleTimer === null) return;
  window.clearTimeout(settleTimer);
  settleTimer = null;
}

function observeDom(): void {
  if (!observer) {
    observer = new MutationObserver(() => {
      scheduleExtraction(undefined, false, false);
    });
  }
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function disarm(): void {
  armed = false;
  clearSettleTimer();
  clearFailTimer();
  observer?.disconnect();
}

function bumpSettle(): void {
  if (!armed) return;
  clearSettleTimer();
  settleTimer = window.setTimeout(() => {
    settleTimer = null;
    disarm();
  }, SETTLE_MS);
}

function arm(): void {
  armed = true;
  lastHref = location.href;
  observeDom();
  bumpSettle();
}

async function publishSnapshot(snapshot: ExtractionSnapshot | null): Promise<void> {
  try {
    if (!snapshot) {
      if (!armed || failurePublished || failTimer !== null) return;
      failTimer = window.setTimeout(() => {
        failTimer = null;
        if (!armed) return;
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
  if (!armed) return;

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

function scheduleExtraction(payload?: unknown, reset = false, extendSettle = true): void {
  if (!armed) return;
  if (extendSettle) bumpSettle();
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
  }
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    if (!armed) return;
    void extractAndPublish(payload, reset);
  }, 150);
}

async function captureNow(): Promise<void> {
  arm();
  await extractAndPublish(latestPayload, true);
}

export default defineContentScript({
  matches: ['*://*.beatport.com/*'],
  runAt: 'document_start',
  async main() {
    lastHref = location.href;
    startedAt = Date.now();
    await injectScript('/beatport-fetch.js', { keepInDom: true });

    window.addEventListener(PAYLOAD_EVENT, (event) => {
      const customEvent = event as CustomEvent;
      latestPayload = customEvent.detail;
      scheduleExtraction(latestPayload);
    });

    window.addEventListener(LOCATION_EVENT, () => {
      if (location.href === lastHref) return;

      const pathChanged = pathnameOf(location.href) !== pathnameOf(lastHref);
      lastHref = location.href;
      if (pathChanged) latestPayload = undefined;

      // Next.js may rewrite the URL during hydration. Keep the first-load
      // capture window; later SPA navigations wait for a manual Refresh.
      if (Date.now() - startedAt < STARTUP_NAV_GRACE_MS) return;
      disarm();
    });

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'REQUEST_REFRESH') {
        void captureNow().then(() => sendResponse({ ok: true }));
        return true;
      }
      return false;
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== extensionStorageArea) return;
      if (changes[STORAGE_KEYS.refreshToken]) {
        void captureNow();
      }
    });

    observeDom();

    const onReady = () => {
      if (!armed) return;
      bumpSettle();
      void extractAndPublish(latestPayload);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  },
});
