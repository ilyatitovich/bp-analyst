import { describe, expect, it } from 'vitest'
import { shouldReloadForRefresh } from '../../../src/lib/messaging/refresh-strategy'

describe('shouldReloadForRefresh', () => {
  it('reloads when the content script is missing', () => {
    expect(shouldReloadForRefresh(false)).toBe(true)
    expect(shouldReloadForRefresh(true)).toBe(false)
  })

  it('always reloads on forced manual refresh', () => {
    expect(shouldReloadForRefresh(true, true)).toBe(true)
    expect(shouldReloadForRefresh(false, true)).toBe(true)
  })
})
