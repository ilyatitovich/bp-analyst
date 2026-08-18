import { browser } from 'wxt/browser';
import { type ExtractionSnapshot } from '../src/types/track';
import {
  STORAGE_KEYS,
  type BeatportAnalystMessage,
  type ExtractionFailedMessage,
} from '../src/messaging/protocol';
import { extensionStorage } from '../src/messaging/storage';

async function ensureDefaults(): Promise<void> {
  if (browser.storage.session?.setAccessLevel) {
    await browser.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
    });
  }
}

async function persistSnapshot(snapshot: ExtractionSnapshot): Promise<void> {
  await extensionStorage.set({
    [STORAGE_KEYS.snapshot]: snapshot,
    [STORAGE_KEYS.extractionError]: null,
  });

  const badgeText = snapshot.trackCount ? String(Math.min(snapshot.trackCount, 999)) : '';
  await browser.action.setBadgeText({ text: badgeText });
  await browser.action.setBadgeBackgroundColor({ color: '#17181c' });
  if (browser.action.setBadgeTextColor) {
    await browser.action.setBadgeTextColor({ color: '#7ef3ad' });
  }
}

async function persistExtractionError(message: ExtractionFailedMessage): Promise<void> {
  await extensionStorage.set({
    [STORAGE_KEYS.snapshot]: null,
    [STORAGE_KEYS.extractionError]: {
      pageUrl: message.pageUrl,
      pageTitle: message.pageTitle,
      at: new Date().toISOString(),
    },
  });
  await browser.action.setBadgeText({ text: '' });
}

function isBeatportUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'beatport.com' || hostname.endsWith('.beatport.com');
  } catch {
    return false;
  }
}

async function findActiveBeatportTab(): Promise<{ id: number; url: string } | null> {
  const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab?.id && isBeatportUrl(activeTab.url)) {
    return { id: activeTab.id, url: activeTab.url ?? '' };
  }

  const [matched] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
    url: '*://*.beatport.com/*',
  });
  if (!matched?.id) return null;
  return { id: matched.id, url: matched.url ?? '' };
}

const AUTO_RELOAD_COOLDOWN_MS = 2000;
let lastAutoReload = { tabId: -1, url: '', at: 0 };
let openPanelCount = 0;
let reloadInFlight: Promise<{ reloaded: boolean }> | null = null;

async function reloadActiveBeatportPage(force = false): Promise<{ reloaded: boolean }> {
  if (reloadInFlight && !force) return reloadInFlight;

  reloadInFlight = (async () => {
    const tab = await findActiveBeatportTab();
    if (!tab) return { reloaded: false };

    const now = Date.now();
    if (
      !force &&
      lastAutoReload.tabId === tab.id &&
      lastAutoReload.url === tab.url &&
      now - lastAutoReload.at < AUTO_RELOAD_COOLDOWN_MS
    ) {
      return { reloaded: false };
    }

    lastAutoReload = { tabId: tab.id, url: tab.url, at: now };
    await browser.tabs.reload(tab.id);
    return { reloaded: true };
  })();

  try {
    return await reloadInFlight;
  } finally {
    reloadInFlight = null;
  }
}

function openFirefoxSidebar(): void {
  const sidebarAction = (
    browser as typeof browser & {
      sidebarAction?: { open: () => Promise<void> };
    }
  ).sidebarAction;

  if (sidebarAction?.open) {
    void sidebarAction.open();
  }
}

export default defineBackground({
  type: 'module',
  async main() {
    await ensureDefaults();
    if (browser.sidePanel?.setPanelBehavior) {
      await browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }

    browser.action.onClicked.addListener(() => {
      openFirefoxSidebar();
    });

    browser.runtime.onInstalled.addListener(() => {
      void ensureDefaults();
    });

    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== 'bp-analyst-panel') return;
      openPanelCount += 1;
      port.onDisconnect.addListener(() => {
        openPanelCount = Math.max(0, openPanelCount - 1);
      });
    });

    browser.tabs.onActivated.addListener(() => {
      if (openPanelCount === 0) return;
      void reloadActiveBeatportPage();
    });

    browser.runtime.onMessage.addListener((message: BeatportAnalystMessage, _sender, sendResponse) => {
      if (message.type === 'TRACKS_EXTRACTED') {
        void persistSnapshot(message.snapshot).then(() => sendResponse({ ok: true }));
        return true;
      }

      if (message.type === 'EXTRACTION_FAILED') {
        void persistExtractionError(message).then(() => sendResponse({ ok: true }));
        return true;
      }

      if (message.type === 'REQUEST_REFRESH') {
        void reloadActiveBeatportPage(Boolean(message.force)).then((result) => sendResponse(result));
        return true;
      }

      return false;
    });
  },
});
