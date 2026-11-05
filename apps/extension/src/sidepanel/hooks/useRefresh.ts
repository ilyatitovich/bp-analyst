import { useCallback, useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import type { ExtractionErrorState } from '../../lib/messaging/protocol'
import {
  PANEL_STORAGE_KEYS,
  addPanelSession,
  removePanelSession,
  type PanelSessions
} from '../../lib/messaging/panel-state'
import { extensionStorage } from '../../lib/messaging/storage'
import type { ExtractionSnapshot } from '../../lib/types/track'

const PANEL_PORT_NAME = 'bp-analyst-panel'
const PORT_RECONNECT_MS = 100

async function registerPanelSession(sessionId: string): Promise<void> {
  const stored = await extensionStorage.get(PANEL_STORAGE_KEYS.sessions)
  const sessions = stored[PANEL_STORAGE_KEYS.sessions] as
    PanelSessions | undefined
  await extensionStorage.set({
    [PANEL_STORAGE_KEYS.sessions]: addPanelSession(sessions, sessionId)
  })
}

async function unregisterPanelSession(sessionId: string): Promise<void> {
  const stored = await extensionStorage.get(PANEL_STORAGE_KEYS.sessions)
  const sessions = stored[PANEL_STORAGE_KEYS.sessions] as
    PanelSessions | undefined
  await extensionStorage.set({
    [PANEL_STORAGE_KEYS.sessions]: removePanelSession(sessions, sessionId)
  })
}

export function useRefresh(
  snapshot: ExtractionSnapshot | null,
  extractionError: ExtractionErrorState | null
) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [beatportReloadAttempted, setBeatportReloadAttempted] = useState(false)
  const refreshStartedAt = useRef(snapshot?.extractedAt ?? null)
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  const requestRefresh = useCallback(async (force = false, auto = false) => {
    refreshStartedAt.current =
      snapshotRef.current?.extractedAt ?? new Date().toISOString()
    if (!auto) {
      setRefreshFailed(false)
      setRefreshing(true)
    }
    try {
      const result = (await browser.runtime.sendMessage({
        type: 'REQUEST_REFRESH',
        force,
        auto
      })) as { reloaded?: boolean; captured?: boolean } | undefined
      if (auto) {
        setRefreshFailed(false)
        if (result?.reloaded) setRefreshing(true)
      }
      setBeatportReloadAttempted(Boolean(result?.reloaded))
      if (!result?.reloaded) {
        setRefreshing(false)
      }
    } catch {
      setRefreshing(false)
      setRefreshFailed(true)
    }
  }, [])

  useEffect(() => {
    const sessionId = crypto.randomUUID()
    let cancelled = false
    let port: ReturnType<typeof browser.runtime.connect> | undefined
    let reconnectTimer: number | undefined

    void registerPanelSession(sessionId)

    const connect = () => {
      if (cancelled) return
      port = browser.runtime.connect({ name: PANEL_PORT_NAME })
      port.onDisconnect.addListener(() => {
        if (cancelled) return
        reconnectTimer = window.setTimeout(connect, PORT_RECONNECT_MS)
      })
    }

    connect()
    void requestRefresh(false, true)

    return () => {
      cancelled = true
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      port?.disconnect()
      void unregisterPanelSession(sessionId)
    }
  }, [requestRefresh])

  useEffect(() => {
    if (!refreshing) return
    if (
      snapshot?.extractedAt &&
      snapshot.extractedAt !== refreshStartedAt.current
    ) {
      setRefreshing(false)
      return
    }
    const startedAt = refreshStartedAt.current
    if (extractionError?.at && startedAt && extractionError.at > startedAt) {
      setRefreshing(false)
      return
    }
    const timeout = window.setTimeout(() => setRefreshing(false), 12000)
    return () => window.clearTimeout(timeout)
  }, [extractionError?.at, refreshing, snapshot?.extractedAt])

  return {
    refreshing,
    refreshFailed,
    beatportReloadAttempted,
    requestRefresh
  }
}
