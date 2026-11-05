export type BrowserId = 'chrome' | 'edge' | 'firefox'

/** Shared portfolio download endpoint until per-browser archives exist. */
const DEFAULT_ARCHIVE_URL =
  'https://ilyatitov.vercel.app/api/cases/beatport-analyst/download'

export const DOWNLOAD_URLS: Record<BrowserId, string> = {
  chrome: DEFAULT_ARCHIVE_URL,
  edge: DEFAULT_ARCHIVE_URL,
  firefox: DEFAULT_ARCHIVE_URL
}

export const BROWSERS: ReadonlyArray<{
  id: BrowserId
  label: string
  shortLabel: string
}> = [
  { id: 'chrome', label: 'Chrome', shortLabel: 'Chromium' },
  { id: 'edge', label: 'Edge', shortLabel: 'Edge' },
  { id: 'firefox', label: 'Firefox', shortLabel: 'Firefox' }
]

export const GITHUB_REPO_URL = 'https://github.com/ilyatitovich/bp-analyst'
export const GITHUB_README_URL = `${GITHUB_REPO_URL}#install-from-source`
export const SUPPORT_PAGE_URL = 'https://ilyatitov.vercel.app/support'
export const SUPPORT_EMAIL = 'ilyatitovdev@gmail.com'
