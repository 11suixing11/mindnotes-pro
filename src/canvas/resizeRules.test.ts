import { describe, expect, it } from 'vitest'
import { lockResizeScalesToAspectRatio, shouldPreserveResizeAspectRatio } from './resizeRules'

describe('resizeRules', () => {
  describe('shouldPreserveResizeAspectRatio', () => {
    it('preserves image aspect ratio by default on corner handles', () => {
      expect(shouldPreserveResizeAspectRatio('image', 0, false)).toBe(true)
    })

    it('allows freeform image resizing when Shift is held', () => {
      expect(shouldPreserveResizeAspectRatio('image', 0, true)).toBe(false)
    })

    it('keeps Shift-to-preserve behavior for non-image elements', () => {
      expect(shouldPreserveResizeAspectRatio('shape', 0, false)).toBe(false)
      expect(shouldPreserveResizeAspectRatio('shape', 0, true)).toBe(true)
    })

    it('does not preserve aspect ratio for edge handles', () => {
      expect(shouldPreserveResizeAspectRatio('image', 4, false)).toBe(false)
      expect(shouldPreserveResizeAspectRatio('shape', 4, true)).toBe(false)
    })
  })

  describe('lockResizeScalesToAspectRatio', () => {
    it('locks both resize scales to the dominant axis while preserving sign', () => {
      expect(lockResizeScalesToAspectRatio(1.5, 0.75)).toEqual({ sx: 1.5, sy: 1.5 })
      expect(lockResizeScalesToAspectRatio(-0.5, 2)).toEqual({ sx: -2, sy: 2 })
    })

    it('uses a positive sign when a scale is zero', () => {
      expect(lockResizeScalesToAspectRatio(0, -3)).toEqual({ sx: 3, sy: -3 })
    })
  })
})
