import { describe, expect, it } from 'vitest'
import {
  clampTextFontSize,
  getTextAnchorX,
  getTextFont,
  getTextLineHeight,
  isVisibleTextBackground,
  normalizeTextFormat,
  toStoredTextFormat,
} from './textFormatting'

describe('textFormatting', () => {
  it('normalizes missing text formatting to defaults', () => {
    const format = normalizeTextFormat({ color: '#333333', fontSize: 16 })

    expect(format).toEqual({
      fontSize: 16,
      color: '#333333',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      backgroundColor: undefined,
    })
  })

  it('clamps font sizes to the supported editing range', () => {
    expect(clampTextFontSize(4)).toBe(8)
    expect(clampTextFontSize(128)).toBe(96)
    expect(clampTextFontSize(Number.NaN)).toBe(16)
  })

  it('builds a canvas font string with style and weight', () => {
    expect(getTextFont({ fontSize: 24, fontStyle: 'italic', fontWeight: 'bold' })).toBe(
      "italic 700 24px 'Noto Sans SC', 'PingFang SC', sans-serif"
    )
  })

  it('computes line height and alignment anchors', () => {
    expect(getTextLineHeight(20)).toBe(32)
    expect(getTextAnchorX(10, 100, 'left')).toBe(10)
    expect(getTextAnchorX(10, 100, 'center')).toBe(60)
    expect(getTextAnchorX(10, 100, 'right')).toBe(110)
  })

  it('stores only non-default formatting fields', () => {
    expect(
      toStoredTextFormat({
        fontSize: 16,
        color: '#000000',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'underline',
        textAlign: 'left',
      })
    ).toEqual({
      fontWeight: 'bold',
      fontStyle: undefined,
      textDecoration: 'underline',
      textAlign: undefined,
      backgroundColor: undefined,
    })
  })

  it('treats transparent backgrounds as not visible', () => {
    expect(isVisibleTextBackground(undefined)).toBe(false)
    expect(isVisibleTextBackground('transparent')).toBe(false)
    expect(isVisibleTextBackground('#fff3bf')).toBe(true)
  })
})
