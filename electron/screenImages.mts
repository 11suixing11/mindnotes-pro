import { PNG } from 'pngjs'
import { MAX_SCREEN_NOTE_BYTES, MAX_SCREEN_NOTE_PIXELS } from '../src/notes/screenNotebook.js'

export function validScreenPng(png: Uint8Array): boolean {
  if (png.byteLength < 33 || png.byteLength > MAX_SCREEN_NOTE_BYTES) return false
  const bytes = Buffer.from(png.buffer, png.byteOffset, png.byteLength)
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return false
  if (bytes.subarray(12, 16).toString('ascii') !== 'IHDR') return false
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  return (
    width > 0 &&
    height > 0 &&
    width <= 30_000 &&
    height <= 30_000 &&
    width * height <= MAX_SCREEN_NOTE_PIXELS
  )
}

/** Decode only one image at a time in the storage worker, including its CRCs. */
export function importedScreenThumbnail(png: Uint8Array): string {
  if (!validScreenPng(png)) throw new Error('批注图片无效或过大。')
  let original
  try {
    original = PNG.sync.read(Buffer.from(png))
  } catch {
    throw new Error('批注图片无法读取。')
  }
  const width = Math.min(original.width, 360)
  const height = Math.max(1, Math.round((original.height * width) / original.width))
  const thumbnail = new PNG({ width, height })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset =
        (Math.floor((y * original.height) / height) * original.width +
          Math.floor((x * original.width) / width)) *
        4
      original.data.copy(thumbnail.data, (y * width + x) * 4, offset, offset + 4)
    }
  }
  return `data:image/png;base64,${PNG.sync.write(thumbnail).toString('base64')}`
}
