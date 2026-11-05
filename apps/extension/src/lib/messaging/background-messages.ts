import { browser } from 'wxt/browser'
import { enablePanelForTab } from './panel-control'
import { refreshActiveBeatportPage } from './refresh'
import { persistExtractionError, persistSnapshot } from './tab-persist'
import { isExtensionSender, parseBeatportAnalystMessage } from './validate'

type SendResponse = (response?: unknown) => void

function requireSenderTabId(
  sender: Browser.runtime.MessageSender,
  sendResponse: SendResponse
): number | null {
  const tabId = sender.tab?.id
  if (tabId == null) {
    sendResponse({ ok: false, error: 'missing-tab' })
    return null
  }
  return tabId
}

/** MV3 onMessage handler. Returns true when sendResponse will be called async. */
export function handleBackgroundMessage(
  rawMessage: unknown,
  sender: Browser.runtime.MessageSender,
  sendResponse: SendResponse
): boolean {
  if (!isExtensionSender(sender, browser.runtime.id)) {
    return false
  }

  const message = parseBeatportAnalystMessage(rawMessage)
  if (!message) {
    sendResponse({ ok: false, error: 'invalid-message' })
    return false
  }

  if (message.type === 'CONTENT_HELLO') {
    const tabId = requireSenderTabId(sender, sendResponse)
    if (tabId == null) return false
    void enablePanelForTab(tabId).then(() => sendResponse({ ok: true }))
    return true
  }

  if (message.type === 'TRACKS_EXTRACTED') {
    const tabId = requireSenderTabId(sender, sendResponse)
    if (tabId == null) return false
    void persistSnapshot(tabId, message.snapshot)
      .then(() => enablePanelForTab(tabId))
      .then(() => sendResponse({ ok: true }))
    return true
  }

  if (message.type === 'EXTRACTION_FAILED') {
    const tabId = requireSenderTabId(sender, sendResponse)
    if (tabId == null) return false
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
