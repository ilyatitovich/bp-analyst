export default defineUnlistedScript(() => {
  const PAYLOAD_EVENT = 'bp-analyst:payload';
  const LOCATION_EVENT = 'bp-analyst:location-change';

  function dispatch(name: string, detail?: unknown): void {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  const originalFetch = window.fetch;

  function forwardCatalog(url: string, payload: unknown): void {
    if (!url.includes('/catalog/')) return;
    dispatch(PAYLOAD_EVENT, payload);
  }

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const request = args[0];
    const url = typeof request === 'string' ? request : request instanceof Request ? request.url : '';

    response
      .clone()
      .json()
      .then((payload) => {
        forwardCatalog(url, payload);
      })
      .catch(() => {});

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    (this as XMLHttpRequest & { __bpAnalystUrl?: string }).__bpAnalystUrl = String(url);
    return originalOpen.apply(this, [method, url, ...rest] as Parameters<typeof originalOpen>);
  };

  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: unknown[]) {
    this.addEventListener('load', () => {
      try {
        const requestUrl = (this as XMLHttpRequest & { __bpAnalystUrl?: string }).__bpAnalystUrl ?? '';
        forwardCatalog(requestUrl, JSON.parse(this.responseText) as unknown);
      } catch {
        // Ignore non-JSON catalog responses.
      }
    });
    return originalSend.apply(this, args as Parameters<typeof originalSend>);
  };

  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = pushState.apply(this, args);
    dispatch(LOCATION_EVENT, location.href);
    return result;
  };

  history.replaceState = function (...args) {
    const result = replaceState.apply(this, args);
    dispatch(LOCATION_EVENT, location.href);
    return result;
  };

  window.addEventListener('popstate', () => {
    dispatch(LOCATION_EVENT, location.href);
  });
});
