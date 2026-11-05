import { useCallback, useEffect, useState } from 'react'
import { browser } from 'wxt/browser'
import {
  DEFAULT_KEY_NOTATION,
  STORAGE_KEYS,
  type ExtractionErrorState,
  type KeyNotation
} from '../../lib/messaging/protocol'
import {
  extensionStorage,
  extensionStorageArea
} from '../../lib/messaging/storage'
import { tabStorageKey } from '../../lib/messaging/tab-state'
import type { ExtractionSnapshot } from '../../lib/types/track'

function parseTabIdParam(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  return Number(value)
}

async function resolveActiveTabId(): Promise<number | null> {
  const [activeTab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true
  })
  return activeTab?.id ?? null
}

export function useStorageState(options?: { tabId?: number | null }) {
  const fixedTabId =
    options && 'tabId' in options
      ? (options.tabId ?? null)
      : parseTabIdParam(
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('tab')
            : null
        )

  const [tabId, setTabId] = useState<number | null>(fixedTabId)
  const [snapshot, setSnapshot] = useState<ExtractionSnapshot | null>(null)
  const [extractionError, setExtractionError] =
    useState<ExtractionErrorState | null>(null)
  const [keyNotation, setKeyNotationState] =
    useState<KeyNotation>(DEFAULT_KEY_NOTATION)

  useEffect(() => {
    if (fixedTabId != null) {
      setTabId(fixedTabId)
      return
    }

    let active = true

    void resolveActiveTabId().then(id => {
      if (active) setTabId(id)
    })

    const onActivated = ({ tabId: nextTabId }: { tabId: number }) => {
      setTabId(nextTabId)
    }
    const onUpdated = (
      updatedTabId: number,
      changeInfo: { url?: string },
      tab: { active?: boolean }
    ) => {
      if (!tab.active || changeInfo.url === undefined) return
      setTabId(updatedTabId)
    }
    const onRemoved = (removedTabId: number) => {
      setTabId(current => (current === removedTabId ? null : current))
    }

    browser.tabs.onActivated.addListener(onActivated)
    browser.tabs.onUpdated.addListener(onUpdated)
    browser.tabs.onRemoved.addListener(onRemoved)

    return () => {
      active = false
      browser.tabs.onActivated.removeListener(onActivated)
      browser.tabs.onUpdated.removeListener(onUpdated)
      browser.tabs.onRemoved.removeListener(onRemoved)
    }
  }, [fixedTabId])

  useEffect(() => {
    let active = true
    const snapshotKey = tabId == null ? null : tabStorageKey('snapshot', tabId)
    const errorKey =
      tabId == null ? null : tabStorageKey('extractionError', tabId)

    if (tabId == null) {
      setSnapshot(null)
      setExtractionError(null)
    }

    const keys = [
      STORAGE_KEYS.keyNotation,
      ...(snapshotKey ? [snapshotKey] : []),
      ...(errorKey ? [errorKey] : [])
    ]

    extensionStorage.get(keys).then(stored => {
      if (!active) return
      setKeyNotationState(
        (stored[STORAGE_KEYS.keyNotation] as KeyNotation | undefined) ??
          DEFAULT_KEY_NOTATION
      )
      if (!snapshotKey || !errorKey) return
      setSnapshot(
        (stored[snapshotKey] as ExtractionSnapshot | undefined) ?? null
      )
      setExtractionError(
        (stored[errorKey] as ExtractionErrorState | undefined) ?? null
      )
    })

    const listener: Parameters<
      typeof browser.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== extensionStorageArea) return
      if (changes[STORAGE_KEYS.keyNotation]) {
        setKeyNotationState(
          (changes[STORAGE_KEYS.keyNotation].newValue as
            KeyNotation | undefined) ?? DEFAULT_KEY_NOTATION
        )
      }
      if (snapshotKey && changes[snapshotKey]) {
        setSnapshot(
          (changes[snapshotKey].newValue as ExtractionSnapshot | undefined) ??
            null
        )
      }
      if (errorKey && changes[errorKey]) {
        setExtractionError(
          (changes[errorKey].newValue as ExtractionErrorState | undefined) ??
            null
        )
      }
    }

    browser.storage.onChanged.addListener(listener)
    return () => {
      active = false
      browser.storage.onChanged.removeListener(listener)
    }
  }, [tabId])

  const setKeyNotation = useCallback((notation: KeyNotation) => {
    setKeyNotationState(notation)
    void extensionStorage.set({
      [STORAGE_KEYS.keyNotation]: notation
    })
  }, [])

  return { tabId, snapshot, extractionError, keyNotation, setKeyNotation }
}
