export const PANEL_STORAGE_KEYS = {
  sessions: 'beatportAnalyst.panelSessions',
  restoreFirefoxSidebar: 'beatportAnalyst.restoreFirefoxSidebar',
} as const;

export type PanelSessions = Record<string, true>;

export function panelSessionCount(sessions: PanelSessions | null | undefined): number {
  return sessions ? Object.keys(sessions).length : 0;
}

export function addPanelSession(
  sessions: PanelSessions | null | undefined,
  sessionId: string,
): PanelSessions {
  return { ...(sessions ?? {}), [sessionId]: true };
}

export function removePanelSession(
  sessions: PanelSessions | null | undefined,
  sessionId: string,
): PanelSessions {
  if (!sessions || !(sessionId in sessions)) return { ...(sessions ?? {}) };
  const next = { ...sessions };
  delete next[sessionId];
  return next;
}
