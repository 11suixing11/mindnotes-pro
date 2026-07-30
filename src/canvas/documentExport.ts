import type { CanvasBackgroundStyle, CanvasElement } from '../store/types'
import { elementBounds, preloadImage } from './canvasUtils'
import { drawCanvasBackground, drawElement } from './canvasDrawing'

export const DOCUMENT_EXPORT_PADDING = 24
export const DOCUMENT_EXPORT_MAX_DIMENSION = 8192
export const DOCUMENT_EXPORT_MAX_PIXELS = 32_000_000

export interface DocumentExportBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface RenderDocumentOptions {
  bgColor: string
  backgroundStyle?: CanvasBackgroundStyle
  isDarkMode?: boolean
  transparent?: boolean
  padding?: number
  maxDimension?: number
  maxPixels?: number
}

export interface RenderedDocument {
  canvas: HTMLCanvasElement
  bounds: DocumentExportBounds
  scale: number
}

export class EmptyDocumentError extends Error {
  constructor() {
    super('画布中没有可导出的内容')
    this.name = 'EmptyDocumentError'
  }
}

function rotatedBounds(el: CanvasElement): DocumentExportBounds {
  const bounds = elementBounds(el)
  if (el.type === 'stroke') return bounds
  const rotation = el.rotation ?? 0
  if (Math.abs(rotation) < 0.001) return bounds

  const nominal =
    el.type === 'shape'
      ? {
          x: Math.min(el.x, el.x + el.w),
          y: Math.min(el.y, el.y + el.h),
          w: Math.abs(el.w),
          h: Math.abs(el.h),
        }
      : { x: el.x, y: el.y, w: el.width, h: el.height }
  const cx = nominal.x + nominal.w / 2
  const cy = nominal.y + nominal.h / 2
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const corners = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.w, bounds.y],
    [bounds.x + bounds.w, bounds.y + bounds.h],
    [bounds.x, bounds.y + bounds.h],
  ]
  const rotated = corners.map(([x, y]) => ({
    x: cx + (x - cx) * cos - (y - cy) * sin,
    y: cy + (x - cx) * sin + (y - cy) * cos,
  }))
  const xs = rotated.map((point) => point.x)
  const ys = rotated.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function getDocumentExportBounds(
  elements: CanvasElement[],
  padding = DOCUMENT_EXPORT_PADDING
): DocumentExportBounds | null {
  if (elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const element of elements) {
    const bounds = rotatedBounds(element)
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

export function getDocumentExportScale(
  bounds: Pick<DocumentExportBounds, 'w' | 'h'>,
  maxDimension = DOCUMENT_EXPORT_MAX_DIMENSION,
  maxPixels = DOCUMENT_EXPORT_MAX_PIXELS
): number {
  const area = bounds.w * bounds.h
  const pixelScale = area > 0 ? Math.sqrt(maxPixels / area) : 1
  return Math.min(1, maxDimension / bounds.w, maxDimension / bounds.h, pixelScale)
}

export async function preloadDocumentImages(elements: CanvasElement[]): Promise<void> {
  const sources = new Set(
    elements.filter((element) => element.type === 'image').map((element) => element.dataUrl)
  )
  await Promise.all([...sources].map((source) => preloadImage(source)))
}

export async function renderDocumentToCanvas(
  elements: CanvasElement[],
  options: RenderDocumentOptions
): Promise<RenderedDocument> {
  const bounds = getDocumentExportBounds(elements, options.padding)
  if (!bounds) throw new EmptyDocumentError()

  await preloadDocumentImages(elements)

  const scale = getDocumentExportScale(bounds, options.maxDimension, options.maxPixels)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(bounds.w * scale))
  canvas.height = Math.max(1, Math.ceil(bounds.h * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器无法创建导出画布')

  if (!options.transparent) {
    drawCanvasBackground(
      context,
      { w: canvas.width, h: canvas.height },
      options.bgColor,
      options.isDarkMode ?? false,
      options.backgroundStyle ?? 'plain',
      { x: bounds.x, y: bounds.y, zoom: scale }
    )
  }

  context.save()
  context.scale(scale, scale)
  context.translate(-bounds.x, -bounds.y)
  for (const element of elements) drawElement(context, element, options.isDarkMode ?? false)
  context.restore()

  return { canvas, bounds, scale }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('浏览器无法生成导出文件'))),
      type,
      quality
    )
  })
}

export function sanitizeExportFilename(title: string): string {
  const withoutControlCharacters = [...title]
    .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
    .join('')
  const sanitized = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 80)
  return sanitized || 'MindNotes-Pro'
}
