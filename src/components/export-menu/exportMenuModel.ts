import type { CanvasDoc } from '../../store/types'
import { formatExportTimestamp, sanitizeExportFilename } from '../../canvas/documentExport'

export const DEFAULT_JPEG_QUALITY = 85
export const LOSSY_EXPORT_MAX_PIXELS = 16_000_000

export interface ExportContext {
  doc: CanvasDoc
  visibleElements: CanvasDoc['elements']
}

export type RasterExport = ExportContext & {
  canvas: HTMLCanvasElement
  bounds: { x: number; y: number; w: number; h: number }
  scale: number
}

export function buildExportFilename(doc: CanvasDoc, extension: string, date = new Date()): string {
  return `${sanitizeExportFilename(doc.title)}-${formatExportTimestamp(date)}.${extension}`
}

export function formatExportBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
