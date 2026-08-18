export default defineUnlistedScript(() => {
  const PAYLOAD_EVENT = 'bp-analyst:payload';
  const LOCATION_EVENT = 'bp-analyst:location-change';

  function dispatch(name: string, detail?: unknown): void {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const request = args[0];
    const url = typeof request === 'string' ? request : request instanceof Request ? request.url : '';

    if (url.includes('/catalog/')) {
      response
        .clone()
        .json()
        .then((payload) => {
          dispatch(PAYLOAD_EVENT, payload);
        })
        .catch(() => {});
    }

    return response;
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
