import { browser } from 'wxt/browser'
import { type ExtractionSnapshot } from '../src/lib/types/track'
import {
  type ExtractionFailedMessage,
  type RequestTabCaptureResponse
} from '../src/lib/messaging/protocol'
import {
  PANEL_STORAGE_KEYS,
  panelSessionCount,
  type PanelSessions
} from '../src/lib/messaging/panel-state'
import { shouldReloadForRefresh } from '../src/lib/messaging/refresh-strategy'
import { extensionStorage } from '../src/lib/messaging/storage'
import {
  LEGACY_GLOBAL_TAB_KEYS,
  tabScopedStorageKeys,
  tabStorageKey
} from '../src/lib/messaging/tab-state'
import {
  isExtensionSender,
  parseBeatportAnalystMessage
} from '../src/lib/messaging/validate'

async function ensureDefaults(): Promise<void> {
  if (browser.storage.session?.setAccessLevel) {
    await browser.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    })
  }
  await extensionStorage.remove([...LEGACY_GLOBAL_TAB_KEYS])
}

async function clearTabBadge(tabId: number): Promise<void> {
  try {
    await browser.action.setBadgeText({ text: '', tabId })
  } catch {
    // Tab may already be gone.
  }
}

async function persistSnapshot(
  tabId: number,
  snapshot: ExtractionSnapshot
): Promise<void> {
  await extensionStorage.set({
    [tabStorageKey('snapshot', tabId)]: snapshot,
    [tabStorageKey('extractionError', tabId)]: null
  })

  const badgeText = snapshot.trackCount
    ? String(Math.min(snapshot.trackCount, 999))
    : ''
  await browser.action.setBadgeText({ text: badgeText, tabId })
  await browser.action.setBadgeBackgroundColor({ color: '#17181c', tabId })
  if (browser.action.setBadgeTextColor) {
    await browser.action.setBadgeTextColor({ color: '#7ef3ad', tabId })
  }
}

async function persistExtractionError(
  tabId: number,
  message: ExtractionFailedMessage
): Promise<void> {
  await extensionStorage.set({
    [tabStorageKey('snapshot', tabId)]: null,
    [tabStorageKey('extractionError', tabId)]: {
      pageUrl: message.pageUrl,
      pageTitle: message.pageTitle,
      at: new Date().toISOString()
    }
  })
  await clearTabBadge(tabId)
}

async function removeTabState(tabId: number): Promise<void> {
  await extensionStorage.remove(tabScopedStorageKeys(tabId))
  await clearTabBadge(tabId)
}

function isBeatportUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const hostname = new URL(url).hostname
    return hostname === 'beatport.com' || hostname.endsWith('.beatport.com')
  } catch {
    return false
  }
}

async function findActiveBeatportTab(): Promise<{
  id: number
  url: string
} | null> {
  const [activeTab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true
  })
  if (activeTab?.id && isBeatportUrl(activeTab.url)) {
    return { id: activeTab.id, url: activeTab.url ?? '' }
  }

  const [matched] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
    url: '*://*.beatport.com/*'
  })
  if (!matched?.id) return null
  return { id: matched.id, url: matched.url ?? '' }
}

type SidebarActionApi = {
  open?: () => Promise<void>
  close?: () => Promise<void>
}

type SidePanelApi = {
  setPanelBehavior?: (behavior: {
    openPanelOnActionClick: boolean
  }) => Promise<void>
  setOptions?: (options: {
    tabId?: number
    path?: string
    enabled?: boolean
  }) => Promise<void>
  open?: (options: { tabId?: number; windowId?: number }) => Promise<void>
}

const SIDEPANEL_PATH = 'sidepanel.html'

async function getOpenPanelCount(): Promise<number> {
  const stored = await extensionStorage.get(PANEL_STORAGE_KEYS.sessions)
  return panelSessionCount(
    stored[PANEL_STORAGE_KEYS.sessions] as PanelSessions | undefined
  )
}

async function getRestoreFirefoxSidebar(): Promise<boolean> {
  const stored = await extensionStorage.get(
    PANEL_STORAGE_KEYS.restoreFirefoxSidebar
  )
  return Boolean(stored[PANEL_STORAGE_KEYS.restoreFirefoxSidebar])
}

async function setRestoreFirefoxSidebar(restore: boolean): Promise<void> {
  if (restore) {
    await extensionStorage.set({
      [PANEL_STORAGE_KEYS.restoreFirefoxSidebar]: true
    })
    return
  }
  await extensionStorage.remove(PANEL_STORAGE_KEYS.restoreFirefoxSidebar)
}

function getSidebarAction(): SidebarActionApi | undefined {
  return (browser as typeof browser & { sidebarAction?: SidebarActionApi })
    .sidebarAction
}

function getSidePanel(): SidePanelApi | undefined {
  const chromeApi = (globalThis as { chrome?: { sidePanel?: SidePanelApi } })
    .chrome?.sidePanel
  return (
    chromeApi ??
    (browser as typeof browser & { sidePanel?: SidePanelApi }).sidePanel
  )
}

async function requestTabCapture(
  tabId: number
): Promise<RequestTabCaptureResponse | null> {
  try {
    const response = (await browser.tabs.sendMessage(tabId, {
      type: 'REQUEST_TAB_CAPTURE'
    })) as RequestTabCaptureResponse | undefined
    if (!response?.ok) return null
    return response
  } catch {
    return null
  }
}

async function refreshActiveBeatportPage(): Promise<{
  reloaded: boolean
  captured?: boolean
}> {
  const tab = await findActiveBeatportTab()
  if (!tab) return { reloaded: false }

  const capture = await requestTabCapture(tab.id)
  if (!shouldReloadForRefresh(capture != null)) {
    return { reloaded: false, captured: true }
  }

  await browser.tabs.reload(tab.id)
  return { reloaded: true }
}

function openPanelForTab(tab: {
  id?: number | undefined
  url?: string | undefined
}): void {
  const sidebarAction = getSidebarAction()
  if (sidebarAction?.open) {
    void setRestoreFirefoxSidebar(false)
    void sidebarAction.open()
    return
  }

  if (!tab.id || !isBeatportUrl(tab.url)) return
  const sidePanel = getSidePanel()
  if (!sidePanel?.open || !sidePanel.setOptions) return

  void sidePanel.setOptions({
    tabId: tab.id,
    path: SIDEPANEL_PATH,
    enabled: true
  })
  void sidePanel.open({ tabId: tab.id })
}

async function syncChromiumSidePanel(
  tabId: number,
  onBeatport: boolean
): Promise<void> {
  const sidePanel = getSidePanel()
  if (!sidePanel?.setOptions) return

  try {
    if (onBeatport) {
      await sidePanel.setOptions({ tabId, path: SIDEPANEL_PATH, enabled: true })
      return
    }

    await sidePanel.setOptions({ tabId, enabled: false })
  } catch {
    // Tab may have closed before options were applied.
  }
}

async function syncFirefoxSidebar(onBeatport: boolean): Promise<void> {
  const sidebarAction = getSidebarAction()
  if (!sidebarAction) return

  if (onBeatport) {
    const shouldRestore = await getRestoreFirefoxSidebar()
    if (!shouldRestore || !sidebarAction.open) return
    try {
      await sidebarAction.open()
      await setRestoreFirefoxSidebar(false)
    } catch {
      // Firefox only opens the sidebar from a user gesture.
    }
    return
  }

  const openPanelCount = await getOpenPanelCount()
  if (openPanelCount === 0 || !sidebarAction.close) return
  await setRestoreFirefoxSidebar(true)
  try {
    await sidebarAction.close()
  } catch {
    await setRestoreFirefoxSidebar(false)
  }
}

async function syncPanelAvailability(
  tabId: number,
  url: string | undefined
): Promise<void> {
  // Without the `tabs` permission, non-Beatport tabs omit `url`. Treat that as off-Beatport.
  const onBeatport = isBeatportUrl(url)
  await syncChromiumSidePanel(tabId, onBeatport)
  await syncFirefoxSidebar(onBeatport)
}

async function enablePanelForTab(tabId: number): Promise<void> {
  await syncChromiumSidePanel(tabId, true)
  await syncFirefoxSidebar(true)
}

async function syncPanelForTabId(tabId: number): Promise<void> {
  try {
    const tab = await browser.tabs.get(tabId)
    await syncPanelAvailability(tabId, tab.url)
  } catch {
    // Tab may have closed.
  }
}

async function syncPanelForExistingTabs(): Promise<void> {
  // Host permissions expose Beatport URLs without the broad `tabs` permission.
  const tabs = await browser.tabs.query({
    url: ['*://*.beatport.com/*', '*://beatport.com/*']
  })
  await Promise.all(
    tabs.flatMap(tab => (tab.id ? [enablePanelForTab(tab.id)] : []))
  )
}

export default defineBackground({
  type: 'module',
  async main() {
    await ensureDefaults()
    const sidePanel = getSidePanel()
    if (sidePanel?.setPanelBehavior) {
      await sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    }
    if (sidePanel?.setOptions) {
      await sidePanel.setOptions({ enabled: false })
    }
    void syncPanelForExistingTabs()

    browser.action.onClicked.addListener(tab => {
      openPanelForTab(tab)
    })

    browser.runtime.onInstalled.addListener(() => {
      void ensureDefaults()
    })

    browser.runtime.onConnect.addListener(port => {
      if (port.name !== 'bp-analyst-panel') return
      void setRestoreFirefoxSidebar(false)
    })

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url === undefined && changeInfo.status !== 'complete')
        return
      void syncPanelAvailability(tabId, tab.url ?? changeInfo.url)
    })

    browser.tabs.onActivated.addListener(({ tabId }) => {
      void syncPanelForTabId(tabId)
    })

    browser.tabs.onRemoved.addListener(tabId => {
      void removeTabState(tabId)
    })

    browser.runtime.onMessage.addListener(
      (rawMessage, sender, sendResponse) => {
        if (!isExtensionSender(sender, browser.runtime.id)) {
          return false
        }

        const message = parseBeatportAnalystMessage(rawMessage)
        if (!message) {
          sendResponse({ ok: false, error: 'invalid-message' })
          return false
        }

        if (message.type === 'CONTENT_HELLO') {
          const tabId = sender.tab?.id
          if (tabId == null) {
            sendResponse({ ok: false, error: 'missing-tab' })
            return false
          }
          void enablePanelForTab(tabId).then(() => sendResponse({ ok: true }))
          return true
        }

        if (message.type === 'TRACKS_EXTRACTED') {
          const tabId = sender.tab?.id
          if (tabId == null) {
            sendResponse({ ok: false, error: 'missing-tab' })
            return false
          }
          void persistSnapshot(tabId, message.snapshot)
            .then(() => enablePanelForTab(tabId))
            .then(() => sendResponse({ ok: true }))
          return true
        }

        if (message.type === 'EXTRACTION_FAILED') {
          const tabId = sender.tab?.id
          if (tabId == null) {
            sendResponse({ ok: false, error: 'missing-tab' })
            return false
          }
          void persistExtractionError(tabId, message)
            .then(() => enablePanelForTab(tabId))
            .then(() => sendResponse({ ok: true }))
          return true
        }

        if (message.type === 'REQUEST_REFRESH') {
          void refreshActiveBeatportPage().then(result => sendResponse(result))
          return true
        }

        return false
      }
    )
  }
})
