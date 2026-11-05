const CATALOG_PATH = '/catalog/'

/** Resolve fetch input to a URL string for catalog matching. */
export function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (typeof Request !== 'undefined' && input instanceof Request)
    return input.url
  return ''
}

export function isCatalogUrl(url: string): boolean {
  return url.includes(CATALOG_PATH)
}

export function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false
  const normalized = contentType.toLowerCase()
  return normalized.includes('application/json') || normalized.includes('+json')
}

/**
 * Wrap `fetch` so only Beatport catalog JSON responses are cloned and parsed.
 * Non-catalog and non-JSON responses pass through without clone/parse cost.
 */
export function createCatalogFetch(
  originalFetch: typeof fetch,
  onCatalogPayload: (url: string, payload: unknown) => void
): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const response = await originalFetch(input, init)
    const url = resolveFetchUrl(input)

    if (!isCatalogUrl(url)) return response
    if (!isJsonContentType(response.headers.get('content-type')))
      return response

    response
      .clone()
      .json()
      .then(payload => {
        onCatalogPayload(url, payload)
      })
      .catch(() => {
        // Ignore non-JSON catalog bodies that still advertised JSON.
      })

    return response
  }
}
