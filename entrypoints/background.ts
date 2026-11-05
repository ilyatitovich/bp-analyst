import { browser } from 'wxt/browser';
import { type ExtractionSnapshot } from '../src/lib/types/track';
import {
  type BeatportAnalystMessage,
  type ExtractionFailedMessage,
} from '../src/lib/messaging/protocol';
import { extensionStorage } from '../src/lib/messaging/storage';
import {
  LEGACY_GLOBAL_TAB_KEYS,
  tabScopedStorageKeys,
  tabStorageKey,
} from '../src/lib/messaging/tab-state';

async function ensureDefaults(): Promise<void> {
  if (browser.storage.session?.setAccessLevel) {
    await browser.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
    });
  }
  await extensionStorage.remove([...LEGACY_GLOBAL_TAB_KEYS]);
}

async function clearTabBadge(tabId: number): Promise<void> {
  try {
    await browser.action.setBadgeText({ text: '', tabId });
  } catch {
    // Tab may already be gone.
  }
}

async function persistSnapshot(tabId: number, snapshot: ExtractionSnapshot): Promise<void> {
  await extensionStorage.set({
    [tabStorageKey('snapshot', tabId)]: snapshot,
    [tabStorageKey('extractionError', tabId)]: null,
  });

  const badgeText = snapshot.trackCount ? String(Math.min(snapshot.trackCount, 999)) : '';
  await browser.action.setBadgeText({ text: badgeText, tabId });
  await browser.action.setBadgeBackgroundColor({ color: '#17181c', tabId });
  if (browser.action.setBadgeTextColor) {
    await browser.action.setBadgeTextColor({ color: '#7ef3ad', tabId });
  }
}

async function persistExtractionError(
  tabId: number,
  message: ExtractionFailedMessage,
): Promise<void> {
  await extensionStorage.set({
    [tabStorageKey('snapshot', tabId)]: null,
    [tabStorageKey('extractionError', tabId)]: {
      pageUrl: message.pageUrl,
      pageTitle: message.pageTitle,
      at: new Date().toISOString(),
    },
  });
  await clearTabBadge(tabId);
}

async function removeTabState(tabId: number): Promise<void> {
  await extensionStorage.remove(tabScopedStorageKeys(tabId));
  await clearTabBadge(tabId);
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
let reloadInFlight: Promise<{ reloaded: boolean }> | null = null;

async function setSkipNextAutoRefresh(tabId: number, skip: boolean): Promise<void> {
  const key = tabStorageKey('skipNextAutoRefresh', tabId);
  if (skip) {
    await extensionStorage.set({ [key]: true });
    return;
  }
  await extensionStorage.remove(key);
}

async function consumeSkipNextAutoRefresh(tabId: number): Promise<boolean> {
  const key = tabStorageKey('skipNextAutoRefresh', tabId);
  const stored = await extensionStorage.get(key);
  if (!stored[key]) return false;
  await setSkipNextAutoRefresh(tabId, false);
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
    void setSkipNextAutoRefresh(tabId, true);
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

    browser.tabs.onRemoved.addListener((tabId) => {
      void removeTabState(tabId);
    });

    browser.runtime.onMessage.addListener((message: BeatportAnalystMessage, sender, sendResponse) => {
      if (message.type === 'TRACKS_EXTRACTED') {
        const tabId = sender.tab?.id;
        if (tabId == null) {
          sendResponse({ ok: false, error: 'missing-tab' });
          return false;
        }
        void persistSnapshot(tabId, message.snapshot).then(() => sendResponse({ ok: true }));
        return true;
      }

      if (message.type === 'EXTRACTION_FAILED') {
        const tabId = sender.tab?.id;
        if (tabId == null) {
          sendResponse({ ok: false, error: 'missing-tab' });
          return false;
        }
        void persistExtractionError(tabId, message).then(() => sendResponse({ ok: true }));
        return true;
      }

      if (message.type === 'REQUEST_REFRESH') {
        void (async () => {
          const tab = await findActiveBeatportTab();
          if (message.auto && tab && (await consumeSkipNextAutoRefresh(tab.id))) {
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
