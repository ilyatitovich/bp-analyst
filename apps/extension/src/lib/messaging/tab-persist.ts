import { browser } from 'wxt/browser'
import type { ExtractionSnapshot } from '../types/track'
import { badgeTextForTrackCount } from '../utils/format'
import type { ExtractionFailedMessage } from './protocol'
import { extensionStorage } from './storage'
import {
  LEGACY_GLOBAL_TAB_KEYS,
  tabScopedStorageKeys,
  tabStorageKey
} from './tab-state'

const BADGE_BACKGROUND = '#17181c'
const BADGE_TEXT = '#7ef3ad'

export async function ensureStorageDefaults(): Promise<void> {
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

export async function persistSnapshot(
  tabId: number,
  snapshot: ExtractionSnapshot
): Promise<void> {
  await extensionStorage.set({
    [tabStorageKey('snapshot', tabId)]: snapshot,
    [tabStorageKey('extractionError', tabId)]: null
  })

  await browser.action.setBadgeText({
    text: badgeTextForTrackCount(snapshot.trackCount),
    tabId
  })
  await browser.action.setBadgeBackgroundColor({
    color: BADGE_BACKGROUND,
    tabId
  })
  if (browser.action.setBadgeTextColor) {
    await browser.action.setBadgeTextColor({ color: BADGE_TEXT, tabId })
  }
}

export async function persistExtractionError(
  tabId: number,
  message: ExtractionFailedMessage
): Promise<void> {
  await extensionStorage.set({
    [tabStorageKey('snapshot', tabId)]: null,
    [tabStorageKey('extractionError', tabId)]: {
      pageUrl: message.pageUrl,
      pageTitle: message.pageTitle,
      at: new Date().toISOString(),
      ...(message.diagnostics ? { diagnostics: message.diagnostics } : {})
    }
  })
  await clearTabBadge(tabId)
}

export async function removeTabState(tabId: number): Promise<void> {
  await extensionStorage.remove(tabScopedStorageKeys(tabId))
  await clearTabBadge(tabId)
}
