import { describe, expect, it } from 'vitest'
import {
  CANVAS_BACKUP_FORMAT,
  CanvasImportError,
  createCanvasBackup,
  parseCanvasImport,
  parseCanvasImportJSON,
} from './backup'
import { createDefaultLayer } from './layers'
import { CANVAS_SCHEMA_VERSION } from './schema'
import type { CanvasDoc } from './types'

function makeDocument(): CanvasDoc {
  const layer = createDefaultLayer(1)
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: 'doc-1',
    title: '项目画布',
    elements: [
      {
        type: 'text',
        id: 'text-1',
        layerId: layer.id,
        groupId: 'group-1',
        x: 10,
        y: 20,
        width: 180,
        height: 32,
        content: '可编辑文本',
        fontSize: 18,
        color: '#111827',
        fontWeight: 'bold',
      },
    ],
    layers: [layer],
    activeLayerId: layer.id,
    bgColor: '#ffffff',
    backgroundStyle: 'grid',
    folderId: null,
    createdAt: 1,
    updatedAt: 2,
  }
}

describe('canvas backup format', () => {
  it('creates a versioned v4 backup without document storage metadata', () => {
    const backup = createCanvasBackup(makeDocument())

    expect(backup.format).toBe(CANVAS_BACKUP_FORMAT)
    expect(backup.version).toBe(4)
    expect(backup.document.title).toBe('项目画布')
    expect(backup.document.elements[0]).toMatchObject({
      id: 'text-1',
      content: '可编辑文本',
      groupId: 'group-1',
    })
    expect(backup).not.toHaveProperty('document.id')
    expect(backup).not.toHaveProperty('document.undoStack')
  })

  it('roundtrips a v4 backup', () => {
    const imported = parseCanvasImport(createCanvasBackup(makeDocument()))

    expect(imported.title).toBe('项目画布')
    expect(imported.backgroundStyle).toBe('grid')
    expect(imported.elements[0]).toMatchObject({ id: 'text-1', layerId: 'layer-default' })
  })

  it('imports the previous v3 JSON format and assigns a writable layer', () => {
    const imported = parseCanvasImport({
      version: 3,
      title: '旧版 JSON',
      bgColor: '#f8fafc',
      elements: [
        {
          type: 'shape',
          id: 'shape-1',
          kind: 'rectangle',
          x: 1,
          y: 2,
          w: 30,
          h: 40,
          color: '#000000',
          size: 2,
        },
      ],
    })

    expect(imported.title).toBe('旧版 JSON')
    expect(imported.layers).toHaveLength(1)
    expect(imported.elements[0].layerId).toBe(imported.activeLayerId)
  })

  it('recovers valid strokes and shapes from the legacy local-storage format', () => {
    const imported = parseCanvasImport({
      strokes: [
        {
          id: 'stroke-1',
          points: [
            [0, 0],
            [20, 20],
          ],
          color: '#123456',
          size: 3,
        },
      ],
      shapes: [
        {
          id: 'shape-1',
          type: 'circle',
          startX: 50,
          startY: 60,
          endX: 90,
          endY: 100,
          color: '#654321',
          size: 2,
        },
      ],
      canvasBg: '#fffdf5',
    })

    expect(imported.elements.map((element) => element.id)).toEqual(['stroke-1', 'shape-1'])
    expect(imported.bgColor).toBe('#fffdf5')
  })

  it('rejects unsupported backup versions', () => {
    expect(() =>
      parseCanvasImport({
        format: CANVAS_BACKUP_FORMAT,
        version: 99,
        document: {},
      })
    ).toThrow(CanvasImportError)
  })

  it('rejects malformed elements instead of silently losing them', () => {
    expect(() =>
      parseCanvasImport({
        version: 3,
        elements: [{ type: 'stroke', id: 'broken', points: [['x', 2]] }],
      })
    ).toThrow('笔迹坐标格式无效')
  })

  it('reports invalid JSON with a user-facing import error', () => {
    expect(() => parseCanvasImportJSON('{not-json')).toThrow('JSON 文件格式无效')
  })
})
