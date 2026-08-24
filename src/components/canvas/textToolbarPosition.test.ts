import { describe, expect, it } from 'vitest'
import { getTextToolbarPosition } from './textToolbarPosition'

const base = {
  anchorX: 120,
  anchorY: 140,
  editorHeight: 40,
  toolbarWidth: 420,
  toolbarHeight: 56,
  viewportWidth: 900,
  viewportHeight: 600,
}

describe('getTextToolbarPosition', () => {
  it('places the toolbar above the editor with a clear gap', () => {
    expect(getTextToolbarPosition(base)).toMatchObject({
      left: 118,
      top: 76,
      placement: 'above',
    })
  })

  it('flips below when there is not enough room above', () => {
    expect(getTextToolbarPosition({ ...base, anchorY: 40, editorHeight: 32 })).toMatchObject({
      top: 80,
      placement: 'below',
    })
  })

  it('keeps the toolbar inside the right viewport edge', () => {
    expect(getTextToolbarPosition({ ...base, anchorX: 860, toolbarWidth: 300 })).toMatchObject({
      left: 592,
    })
  })

  it('clamps a wrapped toolbar to a narrow viewport using its visible left edge', () => {
    const result = getTextToolbarPosition({
      ...base,
      anchorX: 300,
      toolbarWidth: 520,
      toolbarHeight: 120,
      viewportWidth: 320,
      viewportHeight: 240,
    })

    expect(result.left).toBeGreaterThanOrEqual(8)
    expect(result.left + Math.min(520, 304)).toBeLessThanOrEqual(312)
  })

  it('does not produce a negative left edge for an extremely narrow viewport', () => {
    const result = getTextToolbarPosition({
      ...base,
      anchorX: 6,
      viewportWidth: 12,
      viewportHeight: 120,
    })

    expect(result.left).toBeGreaterThanOrEqual(0)
  })

  it('prefers the side with more usable space when neither side fully fits', () => {
    expect(
      getTextToolbarPosition({
        ...base,
        anchorY: 260,
        editorHeight: 260,
        toolbarHeight: 220,
        viewportHeight: 420,
      })
    ).toMatchObject({
      placement: 'above',
      top: 32,
    })
  })
})
