import type { CanvasElement, UndoAction } from '../types'
import { applyMoveDelta, reverseMoveDelta, shallowClone, snapshot } from '../helpers'

export interface HistoryTransition {
  elements: CanvasElement[]
  inverseAction: UndoAction
}

export function getAffectedElementIds(action: UndoAction): string[] {
  switch (action.type) {
    case 'add':
      return action.ids
    case 'remove':
      return action.items.map((item) => item.el.id)
    case 'move':
      return action.deltas.map((delta) => delta.id)
    case 'snapshot':
      return action.affectedIds
    case 'erase':
      return [
        ...new Set([
          ...action.before.map((element) => element.id),
          ...action.after.map((element) => element.id),
        ]),
      ]
    case 'group':
    case 'lock':
    case 'unlock':
      return action.elementIds
    case 'ungroup':
      return action.beforeUngroup.map((item) => item.id)
    case 'clear':
      return action.snapshot.map((element) => element.id)
  }
}

function cloneAddAction(action: Extract<UndoAction, { type: 'add' }>): UndoAction {
  return { type: 'add', ids: action.ids, els: (action.els ?? []).map(shallowClone) }
}

function cloneRemoveAction(action: Extract<UndoAction, { type: 'remove' }>): UndoAction {
  return {
    type: 'remove',
    items: action.items.map((item) => ({ el: shallowClone(item.el), index: item.index })),
  }
}

function cloneEraseAction(action: Extract<UndoAction, { type: 'erase' }>): UndoAction {
  return {
    type: 'erase',
    before: snapshot(action.before),
    after: snapshot(action.after),
  }
}

function cloneSnapshotAction(action: Extract<UndoAction, { type: 'snapshot' }>): UndoAction {
  return {
    type: 'snapshot',
    before: snapshot(action.before),
    after: snapshot(action.after),
    label: action.label,
    affectedIds: [...action.affectedIds],
  }
}

function cloneGroupAction(action: Extract<UndoAction, { type: 'group' }>): UndoAction {
  return {
    type: 'group',
    groupId: action.groupId,
    elementIds: action.elementIds,
    beforeGroup: action.beforeGroup.map((item) => ({ ...item })),
  }
}

function cloneUngroupAction(action: Extract<UndoAction, { type: 'ungroup' }>): UndoAction {
  return {
    type: 'ungroup',
    groupIds: [...action.groupIds],
    beforeUngroup: action.beforeUngroup.map((item) => ({ ...item })),
  }
}

function cloneLockAction(action: Extract<UndoAction, { type: 'lock' | 'unlock' }>): UndoAction {
  if (action.type === 'lock') {
    return {
      type: 'lock',
      elementIds: [...action.elementIds],
      beforeLock: action.beforeLock.map((item) => ({ ...item })),
    }
  }
  return {
    type: 'unlock',
    elementIds: [...action.elementIds],
    beforeUnlock: action.beforeUnlock.map((item) => ({ ...item })),
  }
}

function restoreGroupIds(
  elements: CanvasElement[],
  previousGroups: Array<{ id: string; oldGroupId?: string }>
): CanvasElement[] {
  const restoreMap = new Map(previousGroups.map((item) => [item.id, item.oldGroupId]))
  return elements.map((element) =>
    restoreMap.has(element.id) ? { ...element, groupId: restoreMap.get(element.id) } : element
  )
}

function restoreLockState(
  elements: CanvasElement[],
  previousLocks: Array<{ id: string; wasLocked: boolean }>
): CanvasElement[] {
  const restoreMap = new Map(previousLocks.map((item) => [item.id, item.wasLocked]))
  return elements.map((element) =>
    restoreMap.has(element.id) ? { ...element, locked: restoreMap.get(element.id) } : element
  )
}

export function createUndoTransition(
  elements: CanvasElement[],
  action: UndoAction
): HistoryTransition {
  switch (action.type) {
    case 'add': {
      const addedIds = new Set((action.els ?? []).map((element) => element.id))
      return {
        elements: elements.filter((element) => !addedIds.has(element.id)),
        inverseAction: cloneAddAction(action),
      }
    }
    case 'remove': {
      const restored = [...elements]
      for (const { el, index } of [...action.items].sort((a, b) => a.index - b.index)) {
        restored.splice(index, 0, el)
      }
      return { elements: restored, inverseAction: cloneRemoveAction(action) }
    }
    case 'move': {
      const deltas = new Map(action.deltas.map((delta) => [delta.id, delta]))
      return {
        elements: elements.map((element) => {
          const delta = deltas.get(element.id)
          return delta ? reverseMoveDelta(element, delta.dx, delta.dy) : element
        }),
        inverseAction: action,
      }
    }
    case 'erase':
      return { elements: snapshot(action.before), inverseAction: cloneEraseAction(action) }
    case 'snapshot':
      return { elements: snapshot(action.before), inverseAction: cloneSnapshotAction(action) }
    case 'group':
      return {
        elements: restoreGroupIds(elements, action.beforeGroup),
        inverseAction: cloneGroupAction(action),
      }
    case 'ungroup':
      return {
        elements: restoreGroupIds(elements, action.beforeUngroup),
        inverseAction: cloneUngroupAction(action),
      }
    case 'lock':
      return {
        elements: restoreLockState(elements, action.beforeLock),
        inverseAction: cloneLockAction(action),
      }
    case 'unlock':
      return {
        elements: restoreLockState(elements, action.beforeUnlock),
        inverseAction: cloneLockAction(action),
      }
    case 'clear':
      return {
        elements: action.snapshot,
        inverseAction: { type: 'clear', snapshot: snapshot(elements) },
      }
  }
}

export function createRedoTransition(
  elements: CanvasElement[],
  action: UndoAction
): HistoryTransition {
  switch (action.type) {
    case 'add':
      return {
        elements: [...elements, ...(action.els ?? []).map(shallowClone)],
        inverseAction: cloneAddAction(action),
      }
    case 'remove': {
      const removedIds = new Set(action.items.map((item) => item.el.id))
      return {
        elements: elements.filter((element) => !removedIds.has(element.id)),
        inverseAction: cloneRemoveAction(action),
      }
    }
    case 'move': {
      const deltas = new Map(action.deltas.map((delta) => [delta.id, delta]))
      return {
        elements: elements.map((element) => {
          const delta = deltas.get(element.id)
          return delta ? applyMoveDelta(element, delta.dx, delta.dy) : element
        }),
        inverseAction: action,
      }
    }
    case 'erase':
      return { elements: snapshot(action.after), inverseAction: cloneEraseAction(action) }
    case 'snapshot':
      return { elements: snapshot(action.after), inverseAction: cloneSnapshotAction(action) }
    case 'group': {
      const groupedIds = new Set(action.elementIds)
      return {
        elements: elements.map((element) =>
          groupedIds.has(element.id) ? { ...element, groupId: action.groupId } : element
        ),
        inverseAction: cloneGroupAction(action),
      }
    }
    case 'ungroup': {
      const groupIds = new Set(action.groupIds)
      return {
        elements: elements.map((element) =>
          element.groupId && groupIds.has(element.groupId)
            ? { ...element, groupId: undefined }
            : element
        ),
        inverseAction: cloneUngroupAction(action),
      }
    }
    case 'lock': {
      const lockedIds = new Set(action.elementIds)
      return {
        elements: elements.map((element) =>
          lockedIds.has(element.id) ? { ...element, locked: true } : element
        ),
        inverseAction: cloneLockAction(action),
      }
    }
    case 'unlock': {
      const unlockedIds = new Set(action.elementIds)
      return {
        elements: elements.map((element) =>
          unlockedIds.has(element.id) ? { ...element, locked: false } : element
        ),
        inverseAction: cloneLockAction(action),
      }
    }
    case 'clear':
      return {
        elements: action.snapshot,
        inverseAction: { type: 'clear', snapshot: snapshot(elements) },
      }
  }
}
