import type { CanvasElement } from './model'
import { elementBounds, moveElement } from './geometry'

export type AlignmentType =
  'alignLeft' | 'alignCenterH' | 'alignRight' | 'alignTop' | 'alignCenterV' | 'alignBottom'

export type DistributionType = 'distributeH' | 'distributeV'

export function getCommonBounds(elements: CanvasElement[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  centerX: number
  centerY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const element of elements) {
    const bounds = elementBounds(element)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.w)
    maxY = Math.max(maxY, bounds.y + bounds.h)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

export function alignElements(
  elements: CanvasElement[],
  selectedIds: string[],
  alignment: AlignmentType
): CanvasElement[] {
  if (selectedIds.length < 2) return elements
  const selectedSet = new Set(selectedIds)
  const selectedElements = elements.filter((element) => selectedSet.has(element.id))
  const bounds = getCommonBounds(selectedElements)

  return elements.map((element) => {
    if (!selectedSet.has(element.id)) return element
    const elementBoundsValue = elementBounds(element)
    let dx = 0
    let dy = 0
    switch (alignment) {
      case 'alignLeft':
        dx = bounds.minX - elementBoundsValue.x
        break
      case 'alignCenterH':
        dx = bounds.centerX - (elementBoundsValue.x + elementBoundsValue.w / 2)
        break
      case 'alignRight':
        dx = bounds.maxX - (elementBoundsValue.x + elementBoundsValue.w)
        break
      case 'alignTop':
        dy = bounds.minY - elementBoundsValue.y
        break
      case 'alignCenterV':
        dy = bounds.centerY - (elementBoundsValue.y + elementBoundsValue.h / 2)
        break
      case 'alignBottom':
        dy = bounds.maxY - (elementBoundsValue.y + elementBoundsValue.h)
        break
    }
    return Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 ? element : moveElement(element, dx, dy)
  })
}

export function distributeElements(
  elements: CanvasElement[],
  selectedIds: string[],
  distribution: DistributionType
): CanvasElement[] {
  if (selectedIds.length < 3) return elements
  const selectedSet = new Set(selectedIds)
  const selectedElements = elements.filter((element) => selectedSet.has(element.id))
  const bounds = getCommonBounds(selectedElements)
  const sorted = [...selectedElements].sort((a, b) => {
    const aBounds = elementBounds(a)
    const bBounds = elementBounds(b)
    return distribution === 'distributeH' ? aBounds.x - bBounds.x : aBounds.y - bBounds.y
  })
  const totalElementSpace = sorted.reduce((sum, element) => {
    const elementBoundsValue = elementBounds(element)
    return sum + (distribution === 'distributeH' ? elementBoundsValue.w : elementBoundsValue.h)
  }, 0)
  const totalSpace =
    distribution === 'distributeH' ? bounds.maxX - bounds.minX : bounds.maxY - bounds.minY
  const gapSize = (totalSpace - totalElementSpace) / (sorted.length - 1)
  const newPositions = new Map<string, { dx: number; dy: number }>()
  let currentPos = distribution === 'distributeH' ? bounds.minX : bounds.minY

  for (const element of sorted) {
    const elementBoundsValue = elementBounds(element)
    if (distribution === 'distributeH') {
      newPositions.set(element.id, { dx: currentPos - elementBoundsValue.x, dy: 0 })
      currentPos += elementBoundsValue.w + gapSize
    } else {
      newPositions.set(element.id, { dx: 0, dy: currentPos - elementBoundsValue.y })
      currentPos += elementBoundsValue.h + gapSize
    }
  }

  return elements.map((element) => {
    const position = newPositions.get(element.id)
    if (!position || (Math.abs(position.dx) < 0.01 && Math.abs(position.dy) < 0.01)) return element
    return moveElement(element, position.dx, position.dy)
  })
}
