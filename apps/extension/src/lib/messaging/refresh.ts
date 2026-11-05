import { browser } from 'wxt/browser'
import { isBeatportUrl } from '../utils/page'
import type { RequestTabCaptureResponse } from './protocol'
import { shouldReloadForRefresh } from './refresh-strategy'

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

export async function refreshActiveBeatportPage(): Promise<{
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
