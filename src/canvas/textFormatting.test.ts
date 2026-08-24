import { describe, expect, it } from 'vitest'
import {
  clampTextFontSize,
  getTextAnchorX,
  getTextFont,
  getTextLayout,
  getTextLineHeight,
  isVisibleTextBackground,
  normalizeTextFormat,
  TEXT_FONT_FAMILY,
  toStoredTextFormat,
  wrapTextLines,
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
      `italic 700 24px ${TEXT_FONT_FAMILY}`
    )
  })

  it('uses one wrap pipeline for words, CJK, and blank lines', () => {
    const measureText = (value: string) => Array.from(value).length * 10

    expect(wrapTextLines('Hello world', 60, measureText)).toEqual(['Hello', 'world'])
    expect(wrapTextLines('你好世界', 20, measureText)).toEqual(['你好', '世界'])
    expect(wrapTextLines('first\n\nthird', 200, measureText)).toEqual(['first', '', 'third'])
  })

  it('wraps a long unbroken token at grapheme boundaries', () => {
    const measureText = (value: string) => Array.from(value).length * 10

    expect(wrapTextLines('abcdefghijkl', 40, measureText)).toEqual(['abcd', 'efgh', 'ijkl'])
  })

  it('preserves decomposed Unicode text while wrapping by grapheme', () => {
    const decomposed = 'e\u0301'

    expect(wrapTextLines(decomposed, 20, () => 10)).toEqual([decomposed])
  })

  it('auto-sizes new text and switches to wrapping at the width cap', () => {
    const format = normalizeTextFormat({ color: '#333333', fontSize: 16 })
    const measureText = (value: string) => Array.from(value).length * 10
    const short = getTextLayout('Hello', format, {
      autoResize: true,
      maxWidth: 200,
      measureText,
    })
    const long = getTextLayout('Hello world again', format, {
      autoResize: true,
      maxWidth: 80,
      measureText,
    })

    expect(short.width).toBe(52)
    expect(short.lines).toEqual(['Hello'])
    expect(short.wraps).toBe(false)
    expect(long.width).toBe(80)
    expect(long.lines).toEqual(['Hello', 'world', 'again'])
    expect(long.wraps).toBe(true)
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
