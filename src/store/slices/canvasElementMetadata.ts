import type { CanvasElement, CanvasLayer, UndoAction } from '../types'
import { getElementLayerId, isElementLayerEditable, isLayerWritable } from '../layers'

interface ElementMetadataPlan {
  elements: CanvasElement[]
  updatedElements: CanvasElement[]
  action: UndoAction
}

export function createGroupPlan(
  elements: CanvasElement[],
  elementIds: string[],
  groupId: string
): ElementMetadataPlan {
  const selected = new Set(elementIds)
  const beforeGroup = elements
    .filter((element) => selected.has(element.id))
    .map((element) => ({ id: element.id, oldGroupId: element.groupId }))
  const updatedElements: CanvasElement[] = []
  const nextElements = elements.map((element) => {
    if (!selected.has(element.id)) return element
    const updated = { ...element, groupId }
    updatedElements.push(updated)
    return updated
  })

  return {
    elements: nextElements,
    updatedElements,
    action: {
      type: 'group',
      groupId,
      elementIds,
      beforeGroup,
    },
  }
}

export function createUngroupPlan(
  elements: CanvasElement[],
  selectedIds: string[]
): ElementMetadataPlan | null {
  const selected = new Set(selectedIds)
  const affectedGroups = new Set<string>()

  elements.forEach((element) => {
    if (selected.has(element.id) && element.groupId) affectedGroups.add(element.groupId)
  })
  if (affectedGroups.size === 0) return null

  const beforeUngroup: { id: string; oldGroupId: string | undefined }[] = []
  const updatedElements: CanvasElement[] = []
  const nextElements = elements.map((element) => {
    if (!element.groupId || !affectedGroups.has(element.groupId)) return element
    beforeUngroup.push({ id: element.id, oldGroupId: element.groupId })
    const updated = { ...element, groupId: undefined }
    updatedElements.push(updated)
    return updated
  })

  return {
    elements: nextElements,
    updatedElements,
    action: {
      type: 'ungroup',
      groupIds: Array.from(affectedGroups),
      beforeUngroup,
    },
  }
}

export function createElementLockPlan(
  elements: CanvasElement[],
  selectedIds: string[],
  layers: CanvasLayer[],
  locked: boolean
): ElementMetadataPlan | null {
  const selected = new Set(selectedIds)
  const beforeLock = elements
    .filter((element) => {
      if (!selected.has(element.id)) return false
      return locked
        ? isElementLayerEditable(element, layers)
        : element.locked && isLayerWritable(layers, getElementLayerId(element))
    })
    .map((element) => ({ id: element.id, wasLocked: !!element.locked }))
  if (beforeLock.length === 0) return null

  const elementIds = beforeLock.map((item) => item.id)
  const affected = new Set(elementIds)
  const updatedElements: CanvasElement[] = []
  const nextElements = elements.map((element) => {
    if (!affected.has(element.id)) return element
    const updated = { ...element, locked }
    updatedElements.push(updated)
    return updated
  })

  return {
    elements: nextElements,
    updatedElements,
    action: locked
      ? { type: 'lock', elementIds, beforeLock }
      : { type: 'unlock', elementIds, beforeUnlock: beforeLock },
  }
}
