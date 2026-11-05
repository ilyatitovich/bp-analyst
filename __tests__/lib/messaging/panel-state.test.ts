import { describe, expect, it } from 'vitest';
import {
  PANEL_STORAGE_KEYS,
  addPanelSession,
  panelSessionCount,
  removePanelSession,
} from '../../../src/lib/messaging/panel-state';

describe('panel session storage helpers', () => {
  it('exposes stable storage keys for SW-safe panel state', () => {
    expect(PANEL_STORAGE_KEYS.sessions).toBe('beatportAnalyst.panelSessions');
    expect(PANEL_STORAGE_KEYS.restoreFirefoxSidebar).toBe(
      'beatportAnalyst.restoreFirefoxSidebar',
    );
  });

  it('adds and removes panel sessions without mutating the input', () => {
    const initial = { a: true } as const;
    const withB = addPanelSession(initial, 'b');
    expect(withB).toEqual({ a: true, b: true });
    expect(initial).toEqual({ a: true });

    const withoutA = removePanelSession(withB, 'a');
    expect(withoutA).toEqual({ b: true });
    expect(withB).toEqual({ a: true, b: true });
  });

  it('counts open panel sessions for Firefox sidebar sync', () => {
    expect(panelSessionCount(undefined)).toBe(0);
    expect(panelSessionCount(null)).toBe(0);
    expect(panelSessionCount({})).toBe(0);
    expect(panelSessionCount(addPanelSession(undefined, 'x'))).toBe(1);
    expect(panelSessionCount(addPanelSession({ x: true }, 'y'))).toBe(2);
  });
});
