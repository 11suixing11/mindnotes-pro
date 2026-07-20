import type { CanvasElement } from '../store/types'

export function shouldPreserveResizeAspectRatio(
  elementType: CanvasElement['type'] | undefined,
  handle: number,
  shiftPressed: boolean
): boolean {
  const isCornerHandle = handle >= 0 && handle <= 3
  if (!isCornerHandle) return false

  // Images follow common editor behavior: keep aspect ratio by default, hold Shift for freeform.
  if (elementType === 'image') return !shiftPressed

  // Existing behavior for non-image elements: hold Shift to preserve aspect ratio.
  return shiftPressed
}

export function lockResizeScalesToAspectRatio(sx: number, sy: number): { sx: number; sy: number } {
  const scale = Math.max(Math.abs(sx), Math.abs(sy))
  const signX = Math.sign(sx) || 1
  const signY = Math.sign(sy) || 1
  return { sx: scale * signX, sy: scale * signY }
}
