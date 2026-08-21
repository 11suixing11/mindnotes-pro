import { describe, expect, it } from 'vitest'
import type { CanvasDoc } from '../../store/types'
import { CANVAS_SCHEMA_VERSION } from '../../store/schema'
import { buildExportFilename, formatExportBytes } from './exportMenuModel'

function makeDoc(title: string): CanvasDoc {
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: 'doc-1',
    title,
    elements: [],
    layers: [],
    activeLayerId: 'layer-1',
    bgColor: '#ffffff',
    backgroundStyle: 'plain',
    folderId: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('export menu model', () => {
  it('formats byte estimates at readable units', () => {
    expect(formatExportBytes(512)).toBe('512 B')
    expect(formatExportBytes(2048)).toBe('2.0 KB')
    expect(formatExportBytes(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('sanitizes document titles while preserving the requested extension', () => {
    expect(buildExportFilename(makeDoc('Road / Map'), 'png', new Date(2026, 6, 31, 13, 4, 5))).toBe(
      'Road - Map-2026-07-31-13-04-05.png'
    )
  })
})
