import type { BrowserId } from '../data/downloads'

/** Prefer Edge / Firefox when unambiguous; otherwise treat as Chromium. */
export function detectPreferredBrowser(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): BrowserId {
  if (/Edg\//.test(userAgent)) return 'edge'
  if (/Firefox\//.test(userAgent)) return 'firefox'
  return 'chrome'
}
