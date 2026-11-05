/**
 * Prefer content-script capture from the per-tab payload cache.
 * Reload only when no content script is present (e.g. tabs open before install).
 */
export function shouldReloadForRefresh(
  contentScriptAvailable: boolean
): boolean {
  return !contentScriptAvailable
}
