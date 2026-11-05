import { describe, expect, it, vi } from 'vitest';
import {
  createCatalogFetch,
  isCatalogUrl,
  isJsonContentType,
  resolveFetchUrl,
} from '../../../src/lib/extract/fetch-hook';

const CATALOG_URL = 'https://api.beatport.com/v4/catalog/tracks/?page=1';
const OTHER_URL = 'https://www.beatport.com/_next/data/abc/genre.json';

function jsonResponse(body: unknown, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': contentType },
  });
}

describe('resolveFetchUrl', () => {
  it('resolves string, URL, and Request inputs', () => {
    expect(resolveFetchUrl(CATALOG_URL)).toBe(CATALOG_URL);
    expect(resolveFetchUrl(new URL(CATALOG_URL))).toBe(CATALOG_URL);
    expect(resolveFetchUrl(new Request(CATALOG_URL))).toBe(CATALOG_URL);
  });
});

describe('isCatalogUrl', () => {
  it('matches catalog paths only', () => {
    expect(isCatalogUrl(CATALOG_URL)).toBe(true);
    expect(isCatalogUrl(OTHER_URL)).toBe(false);
  });
});

describe('isJsonContentType', () => {
  it('accepts application/json and +json subtypes', () => {
    expect(isJsonContentType('application/json')).toBe(true);
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true);
    expect(isJsonContentType('application/vnd.api+json')).toBe(true);
    expect(isJsonContentType('text/html')).toBe(false);
    expect(isJsonContentType(null)).toBe(false);
  });
});

describe('createCatalogFetch', () => {
  it('does not clone non-catalog responses', async () => {
    const payload = { results: [] };
    const response = jsonResponse(payload);
    const clone = vi.spyOn(response, 'clone');

    const originalFetch = vi.fn(async () => response);
    const onCatalog = vi.fn();
    const wrapped = createCatalogFetch(originalFetch, onCatalog);

    const result = await wrapped(OTHER_URL);

    expect(result).toBe(response);
    expect(clone).not.toHaveBeenCalled();
    expect(onCatalog).not.toHaveBeenCalled();
  });

  it('does not clone catalog responses that are not JSON', async () => {
    const response = new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
    const clone = vi.spyOn(response, 'clone');

    const originalFetch = vi.fn(async () => response);
    const onCatalog = vi.fn();
    const wrapped = createCatalogFetch(originalFetch, onCatalog);

    await wrapped(CATALOG_URL);

    expect(clone).not.toHaveBeenCalled();
    expect(onCatalog).not.toHaveBeenCalled();
  });

  it('clones and forwards catalog JSON for string, URL, and Request inputs', async () => {
    const payload = { results: [{ id: 1 }] };
    const inputs: Array<RequestInfo | URL> = [
      CATALOG_URL,
      new URL(CATALOG_URL),
      new Request(CATALOG_URL),
    ];

    for (const input of inputs) {
      const response = jsonResponse(payload);
      const clone = vi.spyOn(response, 'clone');
      const originalFetch = vi.fn(async () => response);
      const onCatalog = vi.fn();
      const wrapped = createCatalogFetch(originalFetch, onCatalog);

      const result = await wrapped(input);
      await vi.waitFor(() => expect(onCatalog).toHaveBeenCalled());

      expect(result).toBe(response);
      expect(clone).toHaveBeenCalledTimes(1);
      expect(onCatalog).toHaveBeenCalledWith(CATALOG_URL, payload);
    }
  });
});
