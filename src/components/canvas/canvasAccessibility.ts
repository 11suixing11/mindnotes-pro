import type { CanvasElement, CanvasLayer } from '../../store/types'

export interface CanvasAccessibilityItem {
  id: string
  elementType: CanvasElement['type']
  elementTypeLabel: string
  label: string
  layerName: string
  selected: boolean
  hidden: boolean
  locked: boolean
}

const SHAPE_LABELS: Record<string, string> = {
  rectangle: '矩形',
  circle: '圆形',
  line: '直线',
  arrow: '箭头',
}

function getElementLabel(element: CanvasElement): string {
  switch (element.type) {
    case 'stroke':
      return '手绘笔迹'
    case 'shape':
      return SHAPE_LABELS[element.kind] ?? '图形'
    case 'text':
      return (element.originalContent ?? element.content) || '空文字'
    case 'image':
      return '图片'
  }
}

function getElementTypeLabel(element: CanvasElement): string {
  switch (element.type) {
    case 'stroke':
      return '手绘笔迹'
    case 'shape':
      return SHAPE_LABELS[element.kind] ?? '图形'
    case 'text':
      return '文字'
    case 'image':
      return '图片'
  }
}

/** Build a screen-reader-friendly summary of the rendered canvas elements. */
export function getCanvasAccessibilityItems(
  elements: CanvasElement[],
  layers: CanvasLayer[],
  selectedIds: string[]
): CanvasAccessibilityItem[] {
  const layerById = new Map(layers.map((layer) => [layer.id, layer]))
  const selected = new Set(selectedIds)

  return elements.map((element) => {
    const layer = element.layerId ? layerById.get(element.layerId) : undefined
    const hidden = layer?.visible === false
    const locked = Boolean(element.locked || layer?.locked)

    return {
      id: element.id,
      elementType: element.type,
      elementTypeLabel: getElementTypeLabel(element),
      label: getElementLabel(element),
      layerName: layer?.name ?? '未命名图层',
      selected: selected.has(element.id),
      hidden,
      locked,
    }
  })
}

export function formatCanvasAccessibilityItem(item: CanvasAccessibilityItem): string {
  const states = [
    `图层：${item.layerName}`,
    item.selected ? '已选中' : '未选中',
    item.hidden ? '已隐藏' : null,
    item.locked ? '已锁定' : null,
  ].filter((value): value is string => value !== null)

  return `${item.label}，${states.join('，')}`
}
