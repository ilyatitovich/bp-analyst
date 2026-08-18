import { browser } from 'wxt/browser';
import { type ExtractionSnapshot } from '../src/types/track';
import { STORAGE_KEYS, type BeatportAnalystMessage } from '../src/messaging/protocol';
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
  });

  const badgeText = snapshot.trackCount ? String(Math.min(snapshot.trackCount, 999)) : '';
  await browser.action.setBadgeText({ text: badgeText });
  await browser.action.setBadgeBackgroundColor({ color: '#17181c' });
  if (browser.action.setBadgeTextColor) {
    await browser.action.setBadgeTextColor({ color: '#7ef3ad' });
  }
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

async function reloadBeatportPage(): Promise<void> {
  const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab?.id && isBeatportUrl(activeTab.url)) {
    await browser.tabs.reload(activeTab.id);
    return;
  }

  const windowTabs = activeTab?.windowId
    ? await browser.tabs.query({ windowId: activeTab.windowId, url: '*://*.beatport.com/*' })
    : [];
  const tabs = windowTabs.length
    ? windowTabs
    : await browser.tabs.query({ url: '*://*.beatport.com/*' });
  const tab = tabs.find((candidate) => candidate.active) ?? tabs[0];
  if (tab?.id) {
    await browser.tabs.reload(tab.id);
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

    browser.runtime.onMessage.addListener((message: BeatportAnalystMessage, _sender, sendResponse) => {
      if (message.type === 'TRACKS_EXTRACTED') {
        void persistSnapshot(message.snapshot).then(() => sendResponse({ ok: true }));
        return true;
      }

      if (message.type === 'REQUEST_REFRESH') {
        void reloadBeatportPage().then(() => sendResponse({ ok: true }));
        return true;
      }

      return false;
    });
  },
});
