import { browser } from 'wxt/browser';

export const extensionStorage = browser.storage.session ?? browser.storage.local;

export const extensionStorageArea: 'session' | 'local' = browser.storage.session
  ? 'session'
  : 'local';
