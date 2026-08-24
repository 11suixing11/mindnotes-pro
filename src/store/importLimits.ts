export const CANVAS_IMPORT_MAX_JSON_BYTES = 25 * 1024 * 1024
export const CANVAS_IMPORT_MAX_ELEMENTS = 10_000
export const CANVAS_IMPORT_MAX_LAYERS = 500
export const CANVAS_IMPORT_MAX_STROKE_POINTS = 100_000
export const CANVAS_IMPORT_MAX_TOTAL_STROKE_POINTS = 1_000_000
export const CANVAS_IMPORT_MAX_TEXT_LENGTH = 100_000
export const CANVAS_IMPORT_MAX_STRING_LENGTH = 1_024
export const CANVAS_IMPORT_MAX_IMAGE_DATA_URL_LENGTH = 12 * 1024 * 1024

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}
