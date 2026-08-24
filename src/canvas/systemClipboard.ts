import type { CanvasElement } from '../store/types'
import { elementBounds } from './canvasUtils'
import { drawElement } from './canvasDrawing'

export const SYSTEM_CLIPBOARD_PADDING = 8

export interface SystemClipboardBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface SystemClipboardOptions {
  isDarkMode?: boolean
  devicePixelRatio?: number
  createCanvas?: () => HTMLCanvasElement
  toBlob?: (canvas: HTMLCanvasElement) => Promise<Blob | null>
  writePng?: (blob: Blob) => Promise<void>
}

/**
 * Calculate the smallest padded canvas that contains the selected elements.
 * This intentionally follows the historical system-copy behavior rather than
 * the document-export bounds (which use a larger padding and rotated bounds).
 */
export function getSystemClipboardBounds(
  elements: CanvasElement[],
  padding = SYSTEM_CLIPBOARD_PADDING
): SystemClipboardBounds | null {
  if (elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const element of elements) {
    const bounds = elementBounds(element)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.w)
    maxY = Math.max(maxY, bounds.y + bounds.h)
  }

  return {
    x: minX - padding,
    y: minY - padding,
    w: Math.max(1, maxX - minX + padding * 2),
    h: Math.max(1, maxY - minY + padding * 2),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

async function writePngToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('System clipboard image writing is unavailable')
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/**
 * Render selected elements to a PNG and write it to the system clipboard.
 * Browser-specific allocation and clipboard APIs are injectable for tests.
 */
export async function copyElementsToSystemClipboard(
  elements: CanvasElement[],
  options: SystemClipboardOptions = {}
): Promise<boolean> {
  const bounds = getSystemClipboardBounds(elements)
  if (!bounds) return false

  const devicePixelRatio =
    options.devicePixelRatio ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
  const canvas = options.createCanvas
    ? options.createCanvas()
    : typeof document === 'undefined'
      ? null
      : document.createElement('canvas')
  if (!canvas) return false

  canvas.width = bounds.w * devicePixelRatio
  canvas.height = bounds.h * devicePixelRatio
  const context = canvas.getContext('2d')
  if (!context) return false

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  context.translate(-bounds.x, -bounds.y)
  const isDarkMode = options.isDarkMode ?? false
  for (const element of elements) drawElement(context, element, isDarkMode)

  try {
    const blob = await (options.toBlob ?? canvasToBlob)(canvas)
    if (!blob) return false
    await (options.writePng ?? writePngToClipboard)(blob)
    return true
  } catch {
    // Clipboard permissions and browser security policies may reject writes.
    return false
  }
}
