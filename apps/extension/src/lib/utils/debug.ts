import { extensionStorage } from '../messaging/storage'

/** Session/local flag; set from the console to enable logging in production builds. */
const DEBUG_LOGGING_KEY = 'beatportAnalyst.debugLogging'

let debugEnabled = Boolean(import.meta.env.DEV)

function setDebugLogging(enabled: boolean): void {
  debugEnabled = enabled || Boolean(import.meta.env.DEV)
}

export async function loadDebugLoggingFlag(): Promise<void> {
  try {
    const stored = await extensionStorage.get(DEBUG_LOGGING_KEY)
    if (stored[DEBUG_LOGGING_KEY] === true) {
      setDebugLogging(true)
    }
  } catch {
    // Storage may be unavailable in some test contexts.
  }
}

export function debugLog(message: string, data?: unknown): void {
  if (!debugEnabled) return
  if (data !== undefined) {
    console.debug(`[bp-analyst] ${message}`, data)
    return
  }
  console.debug(`[bp-analyst] ${message}`)
}
