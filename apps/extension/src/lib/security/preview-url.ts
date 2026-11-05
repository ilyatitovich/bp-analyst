/** Beatport CDN hosts that serve track preview audio. */
const ALLOWED_PREVIEW_HOSTS = new Set([
  'geo-samples.beatport.com',
  'samples.beatport.com'
])

export function isAllowedPreviewUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    return ALLOWED_PREVIEW_HOSTS.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

/** Accept only https preview URLs on the Beatport sample CDN allowlist. */
export function asAllowedPreviewUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return isAllowedPreviewUrl(trimmed) ? trimmed : null
}
