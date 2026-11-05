import { describe, expect, it } from 'vitest'
import {
  asAllowedPreviewUrl,
  isAllowedPreviewUrl
} from '../../../src/lib/security/preview-url'

describe('preview URL allowlist', () => {
  it('accepts Beatport sample CDN hosts over https', () => {
    expect(
      isAllowedPreviewUrl('https://geo-samples.beatport.com/track/abc.LOFI.mp3')
    ).toBe(true)
    expect(
      isAllowedPreviewUrl('https://samples.beatport.com/track/abc.LOFI.mp3')
    ).toBe(true)
    expect(
      asAllowedPreviewUrl(
        '  https://geo-samples.beatport.com/track/abc.LOFI.mp3  '
      )
    ).toBe('https://geo-samples.beatport.com/track/abc.LOFI.mp3')
  })

  it('rejects non-allowlisted hosts, http, and malformed values', () => {
    expect(isAllowedPreviewUrl('https://evil.example/track/abc.LOFI.mp3')).toBe(
      false
    )
    expect(
      isAllowedPreviewUrl('https://geo-media.beatport.com/image.jpg')
    ).toBe(false)
    expect(
      isAllowedPreviewUrl('http://geo-samples.beatport.com/track/abc.LOFI.mp3')
    ).toBe(false)
    expect(
      isAllowedPreviewUrl('https://geo-samples.beatport.com.evil.example/x.mp3')
    ).toBe(false)
    expect(asAllowedPreviewUrl(null)).toBeNull()
    expect(asAllowedPreviewUrl(42)).toBeNull()
    expect(asAllowedPreviewUrl('not-a-url')).toBeNull()
  })
})
