import { browser } from 'wxt/browser'

export type SidebarActionApi = {
  open?: () => Promise<void>
  close?: () => Promise<void>
}

export type SidePanelApi = {
  setPanelBehavior?: (behavior: {
    openPanelOnActionClick: boolean
  }) => Promise<void>
  setOptions?: (options: {
    tabId?: number
    path?: string
    enabled?: boolean
  }) => Promise<void>
  open?: (options: { tabId?: number; windowId?: number }) => Promise<void>
}

export const SIDEPANEL_PATH = 'sidepanel.html'

export function getSidebarAction(): SidebarActionApi | undefined {
  return (browser as typeof browser & { sidebarAction?: SidebarActionApi })
    .sidebarAction
}

export function getSidePanel(): SidePanelApi | undefined {
  const chromeApi = (globalThis as { chrome?: { sidePanel?: SidePanelApi } })
    .chrome?.sidePanel
  return (
    chromeApi ??
    (browser as typeof browser & { sidePanel?: SidePanelApi }).sidePanel
  )
}
