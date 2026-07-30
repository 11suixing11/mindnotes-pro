import { normalizeElementLayers, normalizeLayers } from './layers'
import { CANVAS_SCHEMA_VERSION } from './schema'
import type {
  Binding,
  BrushType,
  CanvasBackgroundStyle,
  CanvasDoc,
  CanvasElement,
  CanvasLayer,
  ImageElement,
  ShapeElement,
  ShapeKind,
  StrokeElement,
  TextElement,
} from './types'

export const CANVAS_BACKUP_FORMAT = 'mindnotes-pro-backup' as const

export interface CanvasBackupDocument {
  title: string
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  bgColor: string
  backgroundStyle: CanvasBackgroundStyle
}

export interface CanvasBackupV4 {
  format: typeof CANVAS_BACKUP_FORMAT
  version: typeof CANVAS_SCHEMA_VERSION
  exportedAt: string
  document: CanvasBackupDocument
}

export class CanvasImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CanvasImportError'
  }
}

const BRUSH_TYPES = new Set<BrushType>([
  'pen',
  'highlighter',
  'pencil',
  'calligraphy',
  'marker',
  'watercolor',
  'crayon',
  'dashed',
  'glow',
])
const SHAPE_KINDS = new Set<ShapeKind>(['rectangle', 'circle', 'line', 'arrow'])
const BACKGROUND_STYLES = new Set<CanvasBackgroundStyle>([
  'plain',
  'grid',
  'dots',
  'ruled',
  'notebook',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new CanvasImportError(`字段 ${key} 必须是非空字符串`)
  }
  return value
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value ? value : undefined
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new CanvasImportError(`字段 ${key} 必须是有限数字`)
  }
  return value
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseBinding(value: unknown): Binding | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new CanvasImportError('连接绑定格式无效')
  return {
    targetId: requiredString(value, 'targetId'),
    anchorX: requiredNumber(value, 'anchorX'),
    anchorY: requiredNumber(value, 'anchorY'),
  }
}

function elementMetadata(record: Record<string, unknown>) {
  return {
    layerId: optionalString(record, 'layerId'),
    groupId: optionalString(record, 'groupId'),
    rotation: optionalNumber(record, 'rotation'),
    locked: record.locked === true ? true : undefined,
  }
}

function parseStroke(record: Record<string, unknown>): StrokeElement {
  if (!Array.isArray(record.points) || record.points.length === 0) {
    throw new CanvasImportError('笔迹 points 必须是非空数组')
  }
  const points = record.points.map((point) => {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof point[0] !== 'number' ||
      !Number.isFinite(point[0]) ||
      typeof point[1] !== 'number' ||
      !Number.isFinite(point[1])
    ) {
      throw new CanvasImportError('笔迹坐标格式无效')
    }
    return [point[0], point[1]]
  })
  const brush = optionalString(record, 'brush') ?? 'pen'
  if (!BRUSH_TYPES.has(brush as BrushType)) throw new CanvasImportError('画笔类型无效')

  const pressures = Array.isArray(record.pressures)
    ? record.pressures.map((pressure) => {
        if (typeof pressure !== 'number' || !Number.isFinite(pressure)) {
          throw new CanvasImportError('笔压数据格式无效')
        }
        return pressure
      })
    : undefined

  return {
    type: 'stroke',
    id: requiredString(record, 'id'),
    points,
    color: requiredString(record, 'color'),
    size: requiredNumber(record, 'size'),
    brush: brush as BrushType,
    opacity: optionalNumber(record, 'opacity'),
    pressures,
    ...elementMetadata(record),
  }
}

function parseShape(record: Record<string, unknown>): ShapeElement {
  const kind = requiredString(record, 'kind')
  if (!SHAPE_KINDS.has(kind as ShapeKind)) throw new CanvasImportError('形状类型无效')
  return {
    type: 'shape',
    id: requiredString(record, 'id'),
    kind: kind as ShapeKind,
    x: requiredNumber(record, 'x'),
    y: requiredNumber(record, 'y'),
    w: requiredNumber(record, 'w'),
    h: requiredNumber(record, 'h'),
    color: requiredString(record, 'color'),
    size: requiredNumber(record, 'size'),
    fillColor: optionalString(record, 'fillColor'),
    startBinding: parseBinding(record.startBinding),
    endBinding: parseBinding(record.endBinding),
    ...elementMetadata(record),
  }
}

function parseText(record: Record<string, unknown>): TextElement {
  const fontWeight = record.fontWeight === 'bold' ? 'bold' : 'normal'
  const fontStyle = record.fontStyle === 'italic' ? 'italic' : 'normal'
  const textDecoration = record.textDecoration === 'underline' ? 'underline' : 'none'
  const textAlign =
    record.textAlign === 'center' || record.textAlign === 'right' ? record.textAlign : 'left'
  return {
    type: 'text',
    id: requiredString(record, 'id'),
    x: requiredNumber(record, 'x'),
    y: requiredNumber(record, 'y'),
    width: requiredNumber(record, 'width'),
    height: requiredNumber(record, 'height'),
    content: typeof record.content === 'string' ? record.content : '',
    fontSize: requiredNumber(record, 'fontSize'),
    color: requiredString(record, 'color'),
    fontWeight,
    fontStyle,
    textDecoration,
    textAlign,
    backgroundColor: optionalString(record, 'backgroundColor'),
    ...elementMetadata(record),
  }
}

function parseImage(record: Record<string, unknown>): ImageElement {
  const dataUrl = requiredString(record, 'dataUrl')
  if (!dataUrl.startsWith('data:image/')) {
    throw new CanvasImportError('图片必须使用 data:image URL')
  }
  return {
    type: 'image',
    id: requiredString(record, 'id'),
    x: requiredNumber(record, 'x'),
    y: requiredNumber(record, 'y'),
    width: requiredNumber(record, 'width'),
    height: requiredNumber(record, 'height'),
    dataUrl,
    opacity: optionalNumber(record, 'opacity'),
    ...elementMetadata(record),
  }
}

function parseElement(value: unknown): CanvasElement {
  if (!isRecord(value)) throw new CanvasImportError('元素格式无效')
  switch (value.type) {
    case 'stroke':
      return parseStroke(value)
    case 'shape':
      return parseShape(value)
    case 'text':
      return parseText(value)
    case 'image':
      return parseImage(value)
    default:
      throw new CanvasImportError('包含不支持的元素类型')
  }
}

function parseLayer(value: unknown, index: number): CanvasLayer {
  if (!isRecord(value)) throw new CanvasImportError('图层格式无效')
  const now = Date.now()
  return {
    id: requiredString(value, 'id'),
    name: requiredString(value, 'name'),
    visible: value.visible !== false,
    locked: value.locked === true,
    order: optionalNumber(value, 'order') ?? index,
    createdAt: optionalNumber(value, 'createdAt') ?? now,
    updatedAt: optionalNumber(value, 'updatedAt') ?? now,
  }
}

function normalizeImportedDocument(value: Record<string, unknown>): CanvasBackupDocument {
  if (!Array.isArray(value.elements)) throw new CanvasImportError('缺少 elements 数组')
  const elements = value.elements.map(parseElement)
  const rawLayers = Array.isArray(value.layers)
    ? value.layers.map((layer, index) => parseLayer(layer, index))
    : undefined
  const normalized = normalizeLayers(rawLayers, optionalString(value, 'activeLayerId'))
  const backgroundStyle = optionalString(value, 'backgroundStyle') ?? 'plain'

  if (!BACKGROUND_STYLES.has(backgroundStyle as CanvasBackgroundStyle)) {
    throw new CanvasImportError('画布背景样式无效')
  }

  return {
    title: optionalString(value, 'title') ?? '导入的画布',
    elements: normalizeElementLayers(elements, normalized.layers),
    layers: normalized.layers,
    activeLayerId: normalized.activeLayerId,
    bgColor: optionalString(value, 'bgColor') ?? '#ffffff',
    backgroundStyle: backgroundStyle as CanvasBackgroundStyle,
  }
}

function legacyElements(value: Record<string, unknown>): CanvasElement[] {
  const elements: CanvasElement[] = []

  for (const item of Array.isArray(value.strokes) ? value.strokes : []) {
    if (!isRecord(item) || !Array.isArray(item.points) || item.points.length === 0) continue
    const firstPoint = item.points[0]
    if (!Array.isArray(firstPoint) || firstPoint.length < 2) continue

    try {
      if (typeof item.imageData === 'string') {
        elements.push(
          parseImage({
            type: 'image',
            id: item.id,
            x: firstPoint[0],
            y: firstPoint[1],
            width: item.imageWidth ?? 200,
            height: item.imageHeight ?? 200,
            dataUrl: item.imageData,
            opacity: item.opacity,
          })
        )
      } else if (typeof item.name === 'string') {
        elements.push(
          parseText({
            type: 'text',
            id: item.id,
            x: firstPoint[0],
            y: firstPoint[1],
            width: 200,
            height: 30,
            content: item.name,
            fontSize:
              typeof item.size === 'number' && Number.isFinite(item.size)
                ? Math.max(item.size * 4, 16)
                : 16,
            color: item.color ?? '#111827',
          })
        )
      } else {
        elements.push(
          parseStroke({
            type: 'stroke',
            id: item.id,
            points: item.points,
            color: item.color ?? '#111827',
            size: item.size ?? 2,
            brush: item.brush ?? 'pen',
            opacity: item.opacity,
          })
        )
      }
    } catch {
      // Invalid legacy entries are skipped so valid work can still be recovered.
    }
  }

  for (const item of Array.isArray(value.shapes) ? value.shapes : []) {
    if (!isRecord(item) || !SHAPE_KINDS.has(item.type as ShapeKind)) continue
    const x = optionalNumber(item, 'startX') ?? optionalNumber(item, 'x')
    const y = optionalNumber(item, 'startY') ?? optionalNumber(item, 'y')
    const endX =
      optionalNumber(item, 'endX') ??
      (x !== undefined && optionalNumber(item, 'width') !== undefined
        ? x + (optionalNumber(item, 'width') ?? 0)
        : undefined)
    const endY =
      optionalNumber(item, 'endY') ??
      (y !== undefined && optionalNumber(item, 'height') !== undefined
        ? y + (optionalNumber(item, 'height') ?? 0)
        : undefined)
    if (x === undefined || y === undefined || endX === undefined || endY === undefined) continue

    try {
      elements.push(
        parseShape({
          type: 'shape',
          id: item.id,
          kind: item.type,
          x: Math.min(x, endX),
          y: Math.min(y, endY),
          w: Math.abs(endX - x),
          h: Math.abs(endY - y),
          color: item.color ?? '#111827',
          size: item.size ?? 2,
        })
      )
    } catch {
      // Invalid legacy entries are skipped so valid work can still be recovered.
    }
  }

  return elements
}

function parseLegacyDocument(value: Record<string, unknown>): CanvasBackupDocument {
  const elements = legacyElements(value)
  if (elements.length === 0) throw new CanvasImportError('旧版文件中没有可导入的元素')
  return normalizeImportedDocument({
    title: optionalString(value, 'title') ?? '导入的旧版画布',
    elements,
    bgColor: optionalString(value, 'canvasBg') ?? '#ffffff',
    backgroundStyle: 'plain',
  })
}

export function createCanvasBackup(doc: CanvasDoc): CanvasBackupV4 {
  const document = normalizeImportedDocument({
    title: doc.title,
    elements: doc.elements,
    layers: doc.layers,
    activeLayerId: doc.activeLayerId,
    bgColor: doc.bgColor,
    backgroundStyle: doc.backgroundStyle,
  })
  return {
    format: CANVAS_BACKUP_FORMAT,
    version: CANVAS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    document,
  }
}

export function parseCanvasImport(value: unknown): CanvasBackupDocument {
  if (!isRecord(value)) throw new CanvasImportError('文件根节点必须是对象')

  if (value.format === CANVAS_BACKUP_FORMAT) {
    if (value.version !== CANVAS_SCHEMA_VERSION || !isRecord(value.document)) {
      throw new CanvasImportError('不支持的 MindNotes Pro 备份版本')
    }
    return normalizeImportedDocument(value.document)
  }

  if (value.schemaVersion === CANVAS_SCHEMA_VERSION && Array.isArray(value.elements)) {
    return normalizeImportedDocument(value)
  }

  if (value.version === 3 && Array.isArray(value.elements)) {
    return normalizeImportedDocument(value)
  }

  if (Array.isArray(value.strokes) || Array.isArray(value.shapes)) {
    return parseLegacyDocument(value)
  }

  throw new CanvasImportError('无法识别的 MindNotes Pro 文件')
}

export function parseCanvasImportJSON(serialized: string): CanvasBackupDocument {
  try {
    return parseCanvasImport(JSON.parse(serialized) as unknown)
  } catch (error) {
    if (error instanceof CanvasImportError) throw error
    throw new CanvasImportError('JSON 文件格式无效')
  }
}
