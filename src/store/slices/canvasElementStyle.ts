import { getBrushDefaultOpacity } from '../../canvas/brushPresets'
import {
  MAX_TEXT_BOX_WIDTH,
  getOriginalTextContent,
  getTextLayout,
  isAutoResizeText,
  normalizeTextFormat,
  toStoredTextFormat,
  type TextFormatState,
  type TextWidthMeasurer,
} from '../../canvas/textFormatting'
import { snapshot } from '../helpers'
import { isElementLayerEditable } from '../layers'
import type {
  BrushType,
  CanvasElement,
  CanvasLayer,
  TextAlign,
  TextDecoration,
  TextElement,
  TextFontStyle,
  TextFontWeight,
  UndoAction,
} from '../types'

export interface SelectionStylePatch {
  color?: string
  size?: number
  brush?: BrushType
  fillColor?: string
  fontSize?: number
  fontWeight?: TextFontWeight
  fontStyle?: TextFontStyle
  textDecoration?: TextDecoration
  textAlign?: TextAlign
  backgroundColor?: string | null
}

export type SelectionStyleKey = keyof SelectionStylePatch

export type SelectionStyleValue<T> =
  { kind: 'value'; value: T } | { kind: 'mixed' } | { kind: 'unsupported' }

export interface SelectionStyleModel {
  selectedIds: string[]
  count: number
  elementTypes: CanvasElement['type'][]
  lockedIds: string[]
  isLocked: boolean
  color: SelectionStyleValue<string>
  size: SelectionStyleValue<number>
  brush: SelectionStyleValue<BrushType>
  fillColor: SelectionStyleValue<string>
  fontSize: SelectionStyleValue<number>
  fontWeight: SelectionStyleValue<TextFontWeight>
  fontStyle: SelectionStyleValue<TextFontStyle>
  textDecoration: SelectionStyleValue<TextDecoration>
  textAlign: SelectionStyleValue<TextAlign>
  backgroundColor: SelectionStyleValue<string | null>
}

export interface SelectionStyleContext {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  selectedIds: string[]
  idToElement?: ReadonlyMap<string, CanvasElement>
}

interface SelectionStyleResultBase {
  affectedIds: string[]
  applicableKeys: SelectionStyleKey[]
  ignoredKeys: SelectionStyleKey[]
}

export type SelectionStyleApplyResult =
  | (SelectionStyleResultBase & { status: 'applied' | 'unchanged' })
  | (SelectionStyleResultBase & {
      status: 'blocked'
      reason: 'empty-selection' | 'locked-selection' | 'incompatible'
      lockedIds: string[]
    })

export interface CanvasElementStylePlan {
  elements: CanvasElement[]
  action: UndoAction
}

export type SelectionStylePlanResult =
  | (SelectionStyleResultBase & { status: 'applied'; plan: CanvasElementStylePlan })
  | (SelectionStyleResultBase & { status: 'unchanged' })
  | (SelectionStyleResultBase & {
      status: 'blocked'
      reason: 'empty-selection' | 'locked-selection' | 'incompatible'
      lockedIds: string[]
    })

const STYLE_KEYS: SelectionStyleKey[] = [
  'color',
  'size',
  'brush',
  'fillColor',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textAlign',
  'backgroundColor',
]

const unsupported = <T>(): SelectionStyleValue<T> => ({ kind: 'unsupported' })

function commonValue<T>(values: T[]): SelectionStyleValue<T> {
  if (values.length === 0) return unsupported()
  const first = values[0]
  return values.every((value) => Object.is(value, first))
    ? { kind: 'value', value: first }
    : { kind: 'mixed' }
}

function getSelectedElements(context: SelectionStyleContext): CanvasElement[] {
  const seen = new Set<string>()
  const result: CanvasElement[] = []
  for (const id of context.selectedIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const element =
      context.idToElement?.get(id) ?? context.elements.find((candidate) => candidate.id === id)
    if (element) result.push(element)
  }
  return result
}

export function getSelectionStyleModel(context: SelectionStyleContext): SelectionStyleModel {
  const selected = getSelectedElements(context)
  const selectedIds = selected.map((element) => element.id)
  const elementTypes = [...new Set(selected.map((element) => element.type))]
  const lockedIds = selected
    .filter((element) => !isElementLayerEditable(element, context.layers))
    .map((element) => element.id)
  const allStrokes = selected.length > 0 && selected.every((element) => element.type === 'stroke')
  const allShapes = selected.length > 0 && selected.every((element) => element.type === 'shape')
  const allTexts = selected.length > 0 && selected.every((element) => element.type === 'text')
  const allLineStyled =
    selected.length > 0 &&
    selected.every((element) => element.type === 'stroke' || element.type === 'shape')
  const allColorStyled =
    selected.length > 0 && selected.every((element) => element.type !== 'image')
  const supportsFill =
    allShapes &&
    selected.every(
      (element) =>
        element.type === 'shape' && (element.kind === 'rectangle' || element.kind === 'circle')
    )
  const textFormats = allTexts
    ? selected.map((element) => normalizeTextFormat(element as TextElement))
    : []

  return {
    selectedIds,
    count: selected.length,
    elementTypes,
    lockedIds,
    isLocked: lockedIds.length > 0,
    color: allColorStyled
      ? commonValue(
          selected.map((element) => (element as Exclude<CanvasElement, { type: 'image' }>).color)
        )
      : unsupported(),
    size: allLineStyled
      ? commonValue(
          selected.map((element) =>
            element.type === 'stroke' || element.type === 'shape' ? element.size : 0
          )
        )
      : unsupported(),
    brush: allStrokes
      ? commonValue(selected.map((element) => (element.type === 'stroke' ? element.brush : 'pen')))
      : unsupported(),
    fillColor: supportsFill
      ? commonValue(
          selected.map((element) =>
            element.type === 'shape' ? (element.fillColor ?? 'transparent') : 'transparent'
          )
        )
      : unsupported(),
    fontSize: allTexts ? commonValue(textFormats.map((format) => format.fontSize)) : unsupported(),
    fontWeight: allTexts
      ? commonValue(textFormats.map((format) => format.fontWeight))
      : unsupported(),
    fontStyle: allTexts
      ? commonValue(textFormats.map((format) => format.fontStyle))
      : unsupported(),
    textDecoration: allTexts
      ? commonValue(textFormats.map((format) => format.textDecoration))
      : unsupported(),
    textAlign: allTexts
      ? commonValue(textFormats.map((format) => format.textAlign))
      : unsupported(),
    backgroundColor: allTexts
      ? commonValue(textFormats.map((format) => format.backgroundColor ?? null))
      : unsupported(),
  }
}

function requestedStyleKeys(patch: SelectionStylePatch): SelectionStyleKey[] {
  return STYLE_KEYS.filter((key) => patch[key] !== undefined)
}

function isSupported(model: SelectionStyleModel, key: SelectionStyleKey): boolean {
  return model[key].kind !== 'unsupported'
}

function sameTextFormat(left: TextFormatState, right: TextFormatState): boolean {
  return (
    left.fontSize === right.fontSize &&
    left.color === right.color &&
    left.fontWeight === right.fontWeight &&
    left.fontStyle === right.fontStyle &&
    left.textDecoration === right.textDecoration &&
    left.textAlign === right.textAlign &&
    left.backgroundColor === right.backgroundColor
  )
}

export function applyTextFormatPatch(
  element: TextElement,
  patch: SelectionStylePatch,
  measureText?: TextWidthMeasurer
): TextElement {
  const current = normalizeTextFormat(element)
  const next = normalizeTextFormat({
    ...current,
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize } : {}),
    ...(patch.fontWeight !== undefined ? { fontWeight: patch.fontWeight } : {}),
    ...(patch.fontStyle !== undefined ? { fontStyle: patch.fontStyle } : {}),
    ...(patch.textDecoration !== undefined ? { textDecoration: patch.textDecoration } : {}),
    ...(patch.textAlign !== undefined ? { textAlign: patch.textAlign } : {}),
    ...(patch.backgroundColor !== undefined
      ? { backgroundColor: patch.backgroundColor ?? undefined }
      : {}),
  })
  if (sameTextFormat(current, next)) return element

  const shouldRelayout =
    current.fontSize !== next.fontSize ||
    current.fontWeight !== next.fontWeight ||
    current.fontStyle !== next.fontStyle
  const layout = shouldRelayout
    ? getTextLayout(getOriginalTextContent(element), next, {
        autoResize: isAutoResizeText(element),
        width: element.width,
        maxWidth: MAX_TEXT_BOX_WIDTH,
        measureText,
      })
    : null

  return {
    ...element,
    ...(layout
      ? {
          width: layout.width,
          height: layout.height,
          content: layout.renderedContent,
          originalContent: layout.originalContent,
        }
      : {}),
    fontSize: next.fontSize,
    color: next.color,
    ...toStoredTextFormat(next),
  }
}

function applyPatchToElement(
  element: CanvasElement,
  patch: SelectionStylePatch,
  applicable: ReadonlySet<SelectionStyleKey>
): CanvasElement {
  if (element.type === 'stroke') {
    let changed = false
    let color = element.color
    let size = element.size
    let brush = element.brush
    let opacity = element.opacity

    if (applicable.has('color') && patch.color !== undefined && patch.color !== color) {
      color = patch.color
      changed = true
    }
    if (applicable.has('size') && patch.size !== undefined && patch.size !== size) {
      size = patch.size
      changed = true
    }
    if (applicable.has('brush') && patch.brush !== undefined && patch.brush !== brush) {
      brush = patch.brush
      opacity = getBrushDefaultOpacity(brush)
      changed = true
    }
    return changed ? { ...element, color, size, brush, opacity } : element
  }

  if (element.type === 'shape') {
    let changed = false
    let color = element.color
    let size = element.size
    let fillColor = element.fillColor

    if (applicable.has('color') && patch.color !== undefined && patch.color !== color) {
      color = patch.color
      changed = true
    }
    if (applicable.has('size') && patch.size !== undefined && patch.size !== size) {
      size = patch.size
      changed = true
    }
    if (applicable.has('fillColor') && patch.fillColor !== undefined) {
      const nextFillColor = patch.fillColor === 'transparent' ? undefined : patch.fillColor
      if (nextFillColor !== fillColor) {
        fillColor = nextFillColor
        changed = true
      }
    }
    return changed ? { ...element, color, size, fillColor } : element
  }

  if (element.type === 'text') {
    return applyTextFormatPatch(element, {
      ...(applicable.has('color') ? { color: patch.color } : {}),
      ...(applicable.has('fontSize') ? { fontSize: patch.fontSize } : {}),
      ...(applicable.has('fontWeight') ? { fontWeight: patch.fontWeight } : {}),
      ...(applicable.has('fontStyle') ? { fontStyle: patch.fontStyle } : {}),
      ...(applicable.has('textDecoration') ? { textDecoration: patch.textDecoration } : {}),
      ...(applicable.has('textAlign') ? { textAlign: patch.textAlign } : {}),
      ...(applicable.has('backgroundColor') ? { backgroundColor: patch.backgroundColor } : {}),
    })
  }

  return element
}

export function createSelectionStylePlan(
  context: SelectionStyleContext,
  patch: SelectionStylePatch
): SelectionStylePlanResult {
  const model = getSelectionStyleModel(context)
  const requestedKeys = requestedStyleKeys(patch)
  const applicableKeys = requestedKeys.filter((key) => isSupported(model, key))
  const ignoredKeys = requestedKeys.filter((key) => !isSupported(model, key))
  const base = { affectedIds: model.selectedIds, applicableKeys, ignoredKeys }

  if (model.count === 0) {
    return { ...base, status: 'blocked', reason: 'empty-selection', lockedIds: [] }
  }
  if (model.isLocked) {
    return {
      ...base,
      status: 'blocked',
      reason: 'locked-selection',
      lockedIds: model.lockedIds,
    }
  }
  if (applicableKeys.length === 0) {
    return { ...base, status: 'blocked', reason: 'incompatible', lockedIds: [] }
  }

  const selected = new Set(model.selectedIds)
  const applicable = new Set(applicableKeys)
  const nextElements = context.elements.map((element) =>
    selected.has(element.id) ? applyPatchToElement(element, patch, applicable) : element
  )
  const changed = context.elements.some((element, index) => element !== nextElements[index])
  if (!changed) return { ...base, status: 'unchanged' }

  return {
    ...base,
    status: 'applied',
    plan: {
      elements: nextElements,
      action: {
        type: 'snapshot',
        before: snapshot(context.elements),
        after: snapshot(nextElements),
        label: 'Style selected elements',
        affectedIds: model.selectedIds,
      },
    },
  }
}

export function getStylePatchFromElement(element: CanvasElement): SelectionStylePatch | null {
  if (element.type === 'stroke') {
    return { color: element.color, size: element.size, brush: element.brush }
  }
  if (element.type === 'shape') {
    return {
      color: element.color,
      size: element.size,
      ...(element.kind === 'rectangle' || element.kind === 'circle'
        ? { fillColor: element.fillColor ?? 'transparent' }
        : {}),
    }
  }
  if (element.type === 'text') {
    const format = normalizeTextFormat(element)
    return {
      color: format.color,
      fontSize: format.fontSize,
      fontWeight: format.fontWeight,
      fontStyle: format.fontStyle,
      textDecoration: format.textDecoration,
      textAlign: format.textAlign,
      backgroundColor: format.backgroundColor ?? null,
    }
  }
  return null
}
