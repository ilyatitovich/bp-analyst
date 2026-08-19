import { browser } from 'wxt/browser';
import { type ExtractionSnapshot } from '../src/lib/types/track';
import {
  STORAGE_KEYS,
  type BeatportAnalystMessage,
  type ExtractionFailedMessage,
} from '../src/lib/messaging/protocol';
import { extensionStorage } from '../src/lib/messaging/storage';

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

type SidebarActionApi = {
  open?: () => Promise<void>;
  close?: () => Promise<void>;
};

type SidePanelApi = {
  setPanelBehavior?: (behavior: { openPanelOnActionClick: boolean }) => Promise<void>;
  setOptions?: (options: { tabId?: number; path?: string; enabled?: boolean }) => Promise<void>;
  open?: (options: { tabId?: number; windowId?: number }) => Promise<void>;
};

const SIDEPANEL_PATH = 'sidepanel.html';
const AUTO_RELOAD_COOLDOWN_MS = 2000;
let lastAutoReload = { tabId: -1, url: '', at: 0 };
let openPanelCount = 0;
let restoreFirefoxSidebar = false;
let skipNextAutoRefresh = false;
let reloadInFlight: Promise<{ reloaded: boolean }> | null = null;

async function setSkipNextAutoRefresh(skip: boolean): Promise<void> {
  skipNextAutoRefresh = skip;
  await extensionStorage.set({ [STORAGE_KEYS.skipNextAutoRefresh]: skip });
}

async function consumeSkipNextAutoRefresh(): Promise<boolean> {
  if (skipNextAutoRefresh) {
    await setSkipNextAutoRefresh(false);
    return true;
  }

  const stored = await extensionStorage.get(STORAGE_KEYS.skipNextAutoRefresh);
  if (!stored[STORAGE_KEYS.skipNextAutoRefresh]) return false;
  await setSkipNextAutoRefresh(false);
  return true;
}

function getSidebarAction(): SidebarActionApi | undefined {
  return (browser as typeof browser & { sidebarAction?: SidebarActionApi }).sidebarAction;
}

function getSidePanel(): SidePanelApi | undefined {
  const chromeApi = (globalThis as { chrome?: { sidePanel?: SidePanelApi } }).chrome?.sidePanel;
  return chromeApi ?? (browser as typeof browser & { sidePanel?: SidePanelApi }).sidePanel;
}

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

function openPanelForTab(tab: { id?: number; url?: string }): void {
  const sidebarAction = getSidebarAction();
  if (sidebarAction?.open) {
    restoreFirefoxSidebar = false;
    void sidebarAction.open();
    return;
  }

  if (!tab.id || !isBeatportUrl(tab.url)) return;
  const sidePanel = getSidePanel();
  if (!sidePanel?.open || !sidePanel.setOptions) return;

  void sidePanel.setOptions({ tabId: tab.id, path: SIDEPANEL_PATH, enabled: true });
  void sidePanel.open({ tabId: tab.id });
}

async function syncChromiumSidePanel(tabId: number, onBeatport: boolean): Promise<void> {
  const sidePanel = getSidePanel();
  if (!sidePanel?.setOptions) return;

  try {
    if (onBeatport) {
      await sidePanel.setOptions({ tabId, path: SIDEPANEL_PATH, enabled: true });
      return;
    }

    await sidePanel.setOptions({ tabId, enabled: false });
  } catch {
    // Tab may have closed before options were applied.
  }
}

async function syncFirefoxSidebar(onBeatport: boolean): Promise<void> {
  const sidebarAction = getSidebarAction();
  if (!sidebarAction) return;

  if (onBeatport) {
    if (!restoreFirefoxSidebar || !sidebarAction.open) return;
    try {
      await sidebarAction.open();
      restoreFirefoxSidebar = false;
    } catch {
      // Firefox only opens the sidebar from a user gesture.
    }
    return;
  }

  if (openPanelCount === 0 || !sidebarAction.close) return;
  restoreFirefoxSidebar = true;
  try {
    await sidebarAction.close();
  } catch {
    restoreFirefoxSidebar = false;
  }
}

async function syncPanelAvailability(tabId: number, url: string | undefined): Promise<void> {
  const onBeatport = isBeatportUrl(url);
  if (!onBeatport && openPanelCount > 0) {
    void setSkipNextAutoRefresh(true);
  }
  await syncChromiumSidePanel(tabId, onBeatport);
  await syncFirefoxSidebar(onBeatport);
}

async function syncPanelForTabId(tabId: number): Promise<void> {
  try {
    const tab = await browser.tabs.get(tabId);
    await syncPanelAvailability(tabId, tab.url);
  } catch {
    // Tab may have closed.
  }
}

async function syncPanelForExistingTabs(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await Promise.all(
    tabs.flatMap((tab) => (tab.id ? [syncPanelAvailability(tab.id, tab.url)] : [])),
  );
}

export default defineBackground({
  type: 'module',
  async main() {
    await ensureDefaults();
    const sidePanel = getSidePanel();
    if (sidePanel?.setPanelBehavior) {
      await sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
    if (sidePanel?.setOptions) {
      await sidePanel.setOptions({ enabled: false });
    }
    void syncPanelForExistingTabs();

    browser.action.onClicked.addListener((tab) => {
      openPanelForTab(tab);
    });

    browser.runtime.onInstalled.addListener(() => {
      void ensureDefaults();
    });

    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== 'bp-analyst-panel') return;
      openPanelCount += 1;
      restoreFirefoxSidebar = false;
      port.onDisconnect.addListener(() => {
        openPanelCount = Math.max(0, openPanelCount - 1);
      });
    });

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url === undefined && changeInfo.status !== 'complete') return;
      void syncPanelAvailability(tabId, tab.url ?? changeInfo.url);
    });

    browser.tabs.onActivated.addListener(({ tabId }) => {
      void syncPanelForTabId(tabId);
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
        void (async () => {
          if (message.auto && (await consumeSkipNextAutoRefresh())) {
            sendResponse({ reloaded: false, skipped: true });
            return;
          }

          sendResponse(await reloadActiveBeatportPage(Boolean(message.force)));
        })();
        return true;
      }

      return false;
    });
  },
});
