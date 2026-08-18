import { browser } from 'wxt/browser';
import { DEFAULT_FILTERS, type ExtractionSnapshot, type TrackFilters } from '../src/types/track';
import { STORAGE_KEYS, type BeatportAnalystMessage } from '../src/messaging/protocol';
import { extensionStorage } from '../src/messaging/storage';

async function ensureDefaults(): Promise<void> {
  const current = await extensionStorage.get([STORAGE_KEYS.filters]);
  if (!current[STORAGE_KEYS.filters]) {
    await extensionStorage.set({
      [STORAGE_KEYS.filters]: DEFAULT_FILTERS,
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

      if (message.type === 'SET_FILTERS') {
        void extensionStorage
          .set({ [STORAGE_KEYS.filters]: message.filters as TrackFilters })
          .then(() => sendResponse({ ok: true }));
        return true;
      }

      if (message.type === 'REQUEST_REFRESH') {
        sendResponse({ ok: true });
        return false;
      }

      return false;
    });
  },
});
