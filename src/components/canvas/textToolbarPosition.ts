export type TextToolbarPlacement = 'above' | 'below'

export interface TextToolbarPositionInput {
  anchorX: number
  anchorY: number
  editorHeight: number
  toolbarWidth: number
  toolbarHeight: number
  viewportWidth: number
  viewportHeight: number
  /** Visual clearance from the active editor/selection chrome. */
  gap?: number
  margin?: number
}

export interface TextToolbarPosition {
  left: number
  top: number
  placement: TextToolbarPlacement
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/**
 * Place the floating text toolbar without covering the active text editor.
 * The returned `top` is the toolbar's actual top edge, so it remains stable
 * even when the toolbar wraps to multiple rows on a narrow viewport.
 */
export function getTextToolbarPosition({
  anchorX,
  anchorY,
  editorHeight,
  toolbarWidth,
  toolbarHeight,
  viewportWidth,
  viewportHeight,
  gap = 8,
  margin = 8,
}: TextToolbarPositionInput): TextToolbarPosition {
  const width = Math.max(1, toolbarWidth)
  const height = Math.max(1, toolbarHeight)
  const edge = Math.min(Math.max(0, margin), Math.max(0, viewportWidth / 2))
  const safeWidth = Math.max(1, viewportWidth - edge * 2)
  const clampedWidth = Math.min(width, safeWidth)
  const leftEdge = anchorX - 2
  const maxLeft = viewportWidth - edge - clampedWidth
  // `left` is always the actual visible left edge. Keeping the coordinate
  // semantic explicit avoids a second `translateX(-100%)` pass in the view.
  const left = clamp(leftEdge, edge, maxLeft)

  const aboveTop = anchorY - gap - height
  const belowTop = anchorY + Math.max(0, editorHeight) + gap
  const fitsAbove = aboveTop >= margin
  const fitsBelow = belowTop + height <= viewportHeight - margin

  if (fitsAbove) {
    return {
      left,
      top: aboveTop,
      placement: 'above',
    }
  }

  if (fitsBelow) {
    return { left, top: belowTop, placement: 'below' }
  }

  const availableAbove = Math.max(0, anchorY - gap - margin)
  const availableBelow = Math.max(0, viewportHeight - margin - belowTop)
  if (availableAbove >= availableBelow) {
    return {
      left,
      top: Math.max(margin, Math.min(aboveTop, viewportHeight - margin - height)),
      placement: 'above',
    }
  }

  return {
    left,
    top: Math.max(margin, Math.min(belowTop, viewportHeight - margin - height)),
    placement: 'below',
  }
}
