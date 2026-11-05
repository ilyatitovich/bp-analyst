import { browser } from 'wxt/browser'
import { handleBackgroundMessage } from '../src/lib/messaging/background-messages'
import {
  configureDefaultPanelBehavior,
  openPanelForTab,
  setRestoreFirefoxSidebar,
  syncPanelAvailability,
  syncPanelForExistingTabs,
  syncPanelForTabId
} from '../src/lib/messaging/panel-control'
import {
  ensureStorageDefaults,
  removeTabState
} from '../src/lib/messaging/tab-persist'

export default defineBackground({
  type: 'module',
  async main() {
    await ensureStorageDefaults()
    await configureDefaultPanelBehavior()
    void syncPanelForExistingTabs()

    browser.action.onClicked.addListener(tab => {
      openPanelForTab(tab)
    })

    browser.runtime.onInstalled.addListener(() => {
      void ensureStorageDefaults()
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

    browser.runtime.onMessage.addListener(handleBackgroundMessage)
  }
})
