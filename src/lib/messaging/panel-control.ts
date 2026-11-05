import { browser } from 'wxt/browser'
import { isBeatportUrl } from '../utils/page'
import {
  PANEL_STORAGE_KEYS,
  panelSessionCount,
  type PanelSessions
} from './panel-state'
import { getSidebarAction, getSidePanel, SIDEPANEL_PATH } from './panel-api'
import { extensionStorage } from './storage'

export async function getOpenPanelCount(): Promise<number> {
  const stored = await extensionStorage.get(PANEL_STORAGE_KEYS.sessions)
  return panelSessionCount(
    stored[PANEL_STORAGE_KEYS.sessions] as PanelSessions | undefined
  )
}

export async function getRestoreFirefoxSidebar(): Promise<boolean> {
  const stored = await extensionStorage.get(
    PANEL_STORAGE_KEYS.restoreFirefoxSidebar
  )
  return Boolean(stored[PANEL_STORAGE_KEYS.restoreFirefoxSidebar])
}

export async function setRestoreFirefoxSidebar(
  restore: boolean
): Promise<void> {
  if (restore) {
    await extensionStorage.set({
      [PANEL_STORAGE_KEYS.restoreFirefoxSidebar]: true
    })
    return
  }
  await extensionStorage.remove(PANEL_STORAGE_KEYS.restoreFirefoxSidebar)
}

export function openPanelForTab(tab: {
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

export async function syncPanelAvailability(
  tabId: number,
  url: string | undefined
): Promise<void> {
  // Without the `tabs` permission, non-Beatport tabs omit `url`. Treat that as off-Beatport.
  const onBeatport = isBeatportUrl(url)
  await syncChromiumSidePanel(tabId, onBeatport)
  await syncFirefoxSidebar(onBeatport)
}

export async function enablePanelForTab(tabId: number): Promise<void> {
  await syncChromiumSidePanel(tabId, true)
  await syncFirefoxSidebar(true)
}

export async function syncPanelForTabId(tabId: number): Promise<void> {
  try {
    const tab = await browser.tabs.get(tabId)
    await syncPanelAvailability(tabId, tab.url)
  } catch {
    // Tab may have closed.
  }
}

export async function syncPanelForExistingTabs(): Promise<void> {
  // Host permissions expose Beatport URLs without the broad `tabs` permission.
  const tabs = await browser.tabs.query({
    url: ['*://*.beatport.com/*', '*://beatport.com/*']
  })
  await Promise.all(
    tabs.flatMap(tab => (tab.id ? [enablePanelForTab(tab.id)] : []))
  )
}

export async function configureDefaultPanelBehavior(): Promise<void> {
  const sidePanel = getSidePanel()
  if (sidePanel?.setPanelBehavior) {
    await sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  }
  if (sidePanel?.setOptions) {
    await sidePanel.setOptions({ enabled: false })
  }
}
