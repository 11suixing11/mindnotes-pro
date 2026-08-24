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
import {
  CANVAS_IMPORT_MAX_ELEMENTS,
  CANVAS_IMPORT_MAX_IMAGE_DATA_URL_LENGTH,
  CANVAS_IMPORT_MAX_JSON_BYTES,
  CANVAS_IMPORT_MAX_LAYERS,
  CANVAS_IMPORT_MAX_STROKE_POINTS,
  CANVAS_IMPORT_MAX_TOTAL_STROKE_POINTS,
  CANVAS_IMPORT_MAX_TEXT_LENGTH,
} from './importLimits'
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
        originalContent: '可编辑文本',
        autoResize: true,
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
  it('creates a versioned v5 backup without document storage metadata', () => {
    const backup = createCanvasBackup(makeDocument())

    expect(backup.format).toBe(CANVAS_BACKUP_FORMAT)
    expect(backup.version).toBe(CANVAS_SCHEMA_VERSION)
    expect(backup.document.title).toBe('项目画布')
    expect(backup.document.elements[0]).toMatchObject({
      id: 'text-1',
      content: '可编辑文本',
      groupId: 'group-1',
    })
    expect(backup).not.toHaveProperty('document.id')
    expect(backup).not.toHaveProperty('document.undoStack')
  })

  it('roundtrips a v5 backup', () => {
    const imported = parseCanvasImport(createCanvasBackup(makeDocument()))

    expect(imported.title).toBe('项目画布')
    expect(imported.backgroundStyle).toBe('grid')
    expect(imported.elements[0]).toMatchObject({
      id: 'text-1',
      layerId: 'layer-default',
      originalContent: '可编辑文本',
      autoResize: true,
    })
  })

  it('imports a v4 backup through the read-only compatibility boundary', () => {
    const backup = createCanvasBackup(makeDocument())
    const imported = parseCanvasImport({ ...backup, version: 4 })

    expect(imported.title).toBe(makeDocument().title)
    expect(imported.elements[0]).toMatchObject({ id: 'text-1' })
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

  it('rejects incomplete pressure data and truncates harmless trailing samples', () => {
    const stroke = {
      type: 'stroke',
      id: 'pressure-stroke',
      points: [
        [0, 0],
        [10, 10],
      ],
      color: '#000000',
      size: 2,
      brush: 'pen',
    }

    expect(() =>
      parseCanvasImport({ version: 3, elements: [{ ...stroke, pressures: [0.4] }] })
    ).toThrow('笔压数据数量不能少于笔迹坐标数量')

    const imported = parseCanvasImport({
      version: 3,
      elements: [{ ...stroke, pressures: [0.2, 0.8, 1] }],
    })
    expect(imported.elements[0]).toMatchObject({ pressures: [0.2, 0.8] })
  })

  it('sanitizes imported SVG image data before it reaches the canvas', () => {
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle cx="5" cy="5" r="5"/></svg>'
    )}`
    const imported = parseCanvasImport({
      version: 3,
      elements: [
        {
          type: 'image',
          id: 'svg-image',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          dataUrl,
        },
      ],
    })
    const image = imported.elements[0]
    if (image.type !== 'image') throw new Error('Expected an image element')
    const sanitized = decodeURIComponent(image.dataUrl.split(',')[1])

    expect(sanitized).toContain('<circle')
    expect(sanitized).not.toContain('<script')
    expect(sanitized).not.toContain('onload')
  })

  it('rejects forged and oversized image data URLs', () => {
    const image = {
      type: 'image',
      id: 'unsafe-image',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    }

    expect(() =>
      parseCanvasImport({
        version: 3,
        elements: [{ ...image, dataUrl: 'data:image/png;base64,abc" onerror="alert(1)' }],
      })
    ).toThrow('图片必须使用受支持的 data:image URL')
    expect(() =>
      parseCanvasImport({
        version: 3,
        elements: [
          {
            ...image,
            dataUrl: `data:image/png;base64,${'a'.repeat(CANVAS_IMPORT_MAX_IMAGE_DATA_URL_LENGTH)}`,
          },
        ],
      })
    ).toThrow('字段 dataUrl 超过长度限制')
  })

  it('rejects documents that exceed element or layer limits before mapping entries', () => {
    expect(() =>
      parseCanvasImport({
        version: 3,
        elements: new Array(CANVAS_IMPORT_MAX_ELEMENTS + 1).fill(null),
      })
    ).toThrow(`画布不能超过 ${CANVAS_IMPORT_MAX_ELEMENTS} 个元素`)
    expect(() =>
      parseCanvasImport({
        version: 3,
        elements: [],
        layers: new Array(CANVAS_IMPORT_MAX_LAYERS + 1).fill(null),
      })
    ).toThrow(`画布不能超过 ${CANVAS_IMPORT_MAX_LAYERS} 个图层`)
  })

  it('rejects oversized stroke and text payloads', () => {
    expect(() =>
      parseCanvasImport({
        version: 3,
        elements: [
          {
            type: 'stroke',
            id: 'large-stroke',
            points: new Array(CANVAS_IMPORT_MAX_STROKE_POINTS + 1).fill([0, 0]),
          },
        ],
      })
    ).toThrow(`单条笔迹不能超过 ${CANVAS_IMPORT_MAX_STROKE_POINTS} 个坐标点`)
    expect(() =>
      parseCanvasImport({
        version: 3,
        elements: [
          {
            type: 'text',
            id: 'large-text',
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            content: 'a'.repeat(CANVAS_IMPORT_MAX_TEXT_LENGTH + 1),
            fontSize: 16,
            color: '#000000',
          },
        ],
      })
    ).toThrow(`文本内容不能超过 ${CANVAS_IMPORT_MAX_TEXT_LENGTH} 个字符`)
  })

  it('rejects documents that exceed the aggregate stroke point budget', () => {
    const strokePoints = new Array(100_000).fill([0, 0])
    const strokes = new Array(Math.floor(CANVAS_IMPORT_MAX_TOTAL_STROKE_POINTS / 100_000))
      .fill(null)
      .map((_, index) => ({
        type: 'stroke',
        id: `stroke-${index}`,
        points: strokePoints,
        color: '#000000',
        size: 2,
        brush: 'pen',
      }))
    strokes.push({
      type: 'stroke',
      id: 'stroke-over-budget',
      points: [[0, 0]],
      color: '#000000',
      size: 2,
      brush: 'pen',
    })

    expect(() => parseCanvasImport({ version: 3, elements: strokes })).toThrow(
      `画布笔迹坐标总数不能超过 ${CANVAS_IMPORT_MAX_TOTAL_STROKE_POINTS} 个坐标点`
    )
  })

  it('rejects JSON strings that exceed the byte budget before parsing', () => {
    expect(() => parseCanvasImportJSON(' '.repeat(CANVAS_IMPORT_MAX_JSON_BYTES + 1))).toThrow(
      'JSON 文件过大，无法导入'
    )
  })

  it('reports invalid JSON with a user-facing import error', () => {
    expect(() => parseCanvasImportJSON('{not-json')).toThrow('JSON 文件格式无效')
  })

  it('rejects duplicate element ids in an import', () => {
    const stroke = {
      type: 'stroke',
      id: 'duplicate',
      points: [
        [0, 0],
        [1, 1],
      ],
      color: '#000000',
      size: 2,
      brush: 'pen',
    }
    expect(() =>
      parseCanvasImport({
        format: 'mindnotes-pro-backup',
        version: 5,
        document: { elements: [stroke, stroke] },
      })
    ).toThrow('元素 ID 必须唯一')
  })
})
