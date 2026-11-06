import { browser } from 'wxt/browser'
import { isBeatportUrl } from '../utils/page'
import type { RequestTabCaptureResponse } from './protocol'

/**
 * Manual Refresh (force) always reloads so the page-world fetch hook can
 * re-intercept catalog responses. Auto open prefers in-tab capture and only
 * reloads when no content script is present (e.g. tabs open before install).
 */
function shouldReloadForRefresh(
  contentScriptAvailable: boolean,
  force = false
): boolean {
  return force || !contentScriptAvailable
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

export async function refreshActiveBeatportPage(options?: {
  force?: boolean
}): Promise<{
  reloaded: boolean
  captured?: boolean
}> {
  const tab = await findActiveBeatportTab()
  if (!tab) return { reloaded: false }

  const force = Boolean(options?.force)
  // Forced Refresh skips capture — only a full reload re-hooks catalog fetches.
  const capture = force ? null : await requestTabCapture(tab.id)
  if (!shouldReloadForRefresh(capture != null, force)) {
    return { reloaded: false, captured: true }
  }

  await browser.tabs.reload(tab.id)
  return { reloaded: true }
}
