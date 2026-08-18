declare function defineBackground<T>(definition: T): T;
declare function defineContentScript<T>(definition: T): T;
declare function defineUnlistedScript(callback: () => void): unknown;
declare function injectScript(
  path: string,
  options?: { keepInDom?: boolean },
): Promise<{ script: HTMLScriptElement }>;
