import { describe, expect, it } from 'vitest'
import { shouldReloadForRefresh } from '../../../src/lib/messaging/refresh-strategy'

describe('shouldReloadForRefresh', () => {
  it('reloads only when the content script is missing', () => {
    expect(shouldReloadForRefresh(false)).toBe(true)
    expect(shouldReloadForRefresh(true)).toBe(false)
  })
})
