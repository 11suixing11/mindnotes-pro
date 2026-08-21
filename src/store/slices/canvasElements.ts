import type {
  AlignmentType,
  DistributionType,
  CanvasElement,
  CanvasLayer,
  UndoAction,
} from '../types'
import {
  createCanvasLayer,
  createDefaultLayer,
  getElementLayerId,
  getSortedLayers,
  getWritableLayerId,
  isElementLayerEditable,
  isLayerWritable,
} from '../layers'
import { shallowClone, snapshot } from '../helpers'
import { scheduleSave, incrementSaveGeneration } from '../saveManager'
import { MAX_HISTORY } from './history'
import type { SpatialIndex } from '../../eraser/SpatialIndex'
import { assignToWritableLayer, getEditableIds, getSelectableIds } from './canvasElementRules'
import {
  createCanvasElementCollectionRuntime,
  rebuildElementIndexes,
  replaceElementCollection,
  synchronizeElementCollection,
  synchronizeElementGeometry,
  synchronizeElementReferences,
} from './canvasElementCollection'
import { copySelectedElements, createOffsetCopyPlan } from './canvasElementClipboard'
import { createElementLockPlan, createGroupPlan, createUngroupPlan } from './canvasElementMetadata'
import { createAlignmentPlan, createDistributionPlan } from './canvasElementArrangement'
import {
  createMoveElementPlan,
  createMoveElementsPlan,
  createResizeElementPlan,
  createRotateElementPlan,
  createRotateElementsPlan,
} from './canvasElementGeometry'

export interface CanvasElementsState {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  activeLayerId: string
  selectedIds: string[]
  clipboard: CanvasElement[]
  spatialIndex: SpatialIndex
  // P0 性能优化: ID → 元素 映射，O(1) 查找
  // 大画布场景下渲染性能提升 10-100x
  idToElement: Map<string, CanvasElement>
  // P0-2 性能优化: ID → 数组索引 映射，O(1) 查找
  // 解决 moveElementById/resizeElementById 中 findIndex O(n) 问题
  idToIndex: Map<string, number>
  // P0-3 性能优化: 索引脏标记 - 懒更新策略
  // 删除元素时不立即更新后续索引，只标记为脏
  // 索引查询失败时才重建，大幅减少 O(n) 更新次数
  _indexDirty: boolean
}

export interface MoveElementsOptions {
  recordHistory?: boolean
}

export interface CommitElementsOptions {
  action?: UndoAction
  selectedIds?: string[]
  clearRedo?: boolean
  undoStack?: UndoAction[]
}

export interface CanvasElementsActions {
  addElement: (el: CanvasElement) => void
  addElements: (els: CanvasElement[]) => void
  createLayer: (name?: string) => string
  renameLayer: (id: string, name: string) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  setLayerVisibility: (id: string, visible: boolean) => void
  setLayerLocked: (id: string, locked: boolean) => void
  moveLayer: (id: string, direction: 'up' | 'down') => void
  moveElementsToLayer: (ids: string[], layerId: string) => void
  moveSelectedToLayer: (layerId: string) => void
  updateElement: (id: string, update: (el: CanvasElement) => CanvasElement) => void
  commitElements: (elements: CanvasElement[], options?: CommitElementsOptions) => void
  removeElement: (id: string) => void
  removeElements: (ids: string[]) => void
  moveElementById: (id: string, dx: number, dy: number) => void
  moveElementsById: (ids: string[], dx: number, dy: number, options?: MoveElementsOptions) => void
  resizeElementById: (id: string, ax: number, ay: number, sx: number, sy: number) => void
  // 元素旋转
  rotateElementById: (id: string, angle: number, cx?: number, cy?: number) => void
  // 批量旋转多个元素
  rotateElementsById: (
    ids: string[],
    angleDelta: number,
    commonCenterX?: number,
    commonCenterY?: number
  ) => void
  clearAll: () => void
  setSelectedIds: (ids: string[]) => void
  copySelected: () => void
  paste: () => void
  duplicateSelected: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  alignSelected: (alignment: AlignmentType) => void
  distributeSelected: (distribution: DistributionType) => void
  batchErase: (
    beforeSnap: CanvasElement[],
    added: CanvasElement[],
    baseUndoStack?: UndoAction[]
  ) => void
  restoreElementsSnapshot: (elements: CanvasElement[], selectedIds?: string[]) => void
  // 元素锁定
  // 专业设计工具标配：锁定元素防止误操作
  lockSelected: () => void
  unlockSelected: () => void
}

export function createCanvasElementsSlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: any
): CanvasElementsState & CanvasElementsActions {
  // 全局空间索引实例 - 实时维护，O(log n) 区域查询
  const collectionRuntime = createCanvasElementCollectionRuntime()
  const { spatialIndex, idToElement, idToIndex } = collectionRuntime
  // P0 性能优化: ID → 元素 映射，O(1) 查找
  // P0-2 性能优化: ID → 数组索引 映射，O(1) 查找
  // P0-3 性能优化: 索引脏标记 - 懒更新策略
  // 使用闭包变量作为内部状态，避免触发 store 更新
  // 这是安全的，因为索引映射只在 slice 内部使用
  let _indexDirty = false

  // P0-3 性能优化: 重建索引（懒更新策略）
  // 只在索引查询失败时调用，避免每次删除都做 O(n) 更新
  // 正确同步闭包 idToIndex 与 store 中的 idToIndex
  function rebuildIndexIfNeeded() {
    if (!_indexDirty) return
    const st = get()
    rebuildElementIndexes(collectionRuntime, st.elements, st)
    _indexDirty = false
  }

  function setElementCollection(next: CanvasElement[], st = get()) {
    replaceElementCollection(collectionRuntime, next, st)
    _indexDirty = false
  }

  function syncElementCollection(next: CanvasElement[], st = get()) {
    synchronizeElementCollection(collectionRuntime, next, st)
    _indexDirty = false
  }

  function commitElements(
    nextElements: CanvasElement[],
    options: CommitElementsOptions = {}
  ): void {
    const st = get()
    const hasElementChanges =
      st.elements.length !== nextElements.length ||
      st.elements.some((element: CanvasElement, index: number) => element !== nextElements[index])
    const nextIds = new Set(nextElements.map((element) => element.id))
    const nextSelectedIds = (options.selectedIds ?? st.selectedIds).filter((id: string) =>
      nextIds.has(id)
    )
    const selectionChanged =
      nextSelectedIds.length !== st.selectedIds.length ||
      nextSelectedIds.some((id: string, index: number) => id !== st.selectedIds[index])

    if (!hasElementChanges && !selectionChanged && !options.action && !options.undoStack) return

    incrementSaveGeneration()
    const nextUndoStack = options.undoStack
      ? options.action
        ? [...options.undoStack.slice(-MAX_HISTORY), options.action]
        : options.undoStack
      : options.action
        ? [...st.undoStack.slice(-MAX_HISTORY), options.action]
        : st.undoStack
    const shouldClearRedo = options.clearRedo ?? Boolean(options.action || options.undoStack)
    set({
      elements: nextElements,
      selectedIds: nextSelectedIds,
      undoStack: nextUndoStack,
      ...(shouldClearRedo ? { redoStack: [] } : {}),
    })
    syncElementCollection(nextElements, get())
    scheduleSave()
  }

  const defaultLayer = createDefaultLayer()

  return {
    // State
    elements: [],
    layers: [defaultLayer],
    activeLayerId: defaultLayer.id,
    selectedIds: [],
    clipboard: [],
    spatialIndex,
    idToElement,
    idToIndex,
    _indexDirty: false,

    // Actions
    setSelectedIds: (ids) => set({ selectedIds: getSelectableIds(ids, get()) }),

    createLayer: (name) => {
      const st = get()
      const order =
        st.layers.length === 0
          ? 0
          : Math.max(...st.layers.map((layer: CanvasLayer) => layer.order)) + 1
      const layer = createCanvasLayer(name ?? `图层 ${order + 1}`, order)
      incrementSaveGeneration()
      set({
        layers: [...st.layers, layer],
        activeLayerId: layer.id,
      })
      scheduleSave()
      return layer.id
    },

    renameLayer: (id, name) => {
      const nextName = name.trim()
      if (!nextName) return
      const st = get()
      const layer = st.layers.find((item: CanvasLayer) => item.id === id)
      if (!layer || layer.name === nextName) return
      incrementSaveGeneration()
      set({
        layers: st.layers.map((item: CanvasLayer) =>
          item.id === id ? { ...item, name: nextName, updatedAt: Date.now() } : item
        ),
      })
      scheduleSave()
    },

    deleteLayer: (id) => {
      const st = get()
      if (st.layers.length <= 1) return
      const target = st.layers.find((layer: CanvasLayer) => layer.id === id)
      if (!target) return

      const remaining = getSortedLayers(
        st.layers.filter((layer: CanvasLayer) => layer.id !== id)
      ).map((layer: CanvasLayer, order: number) => ({ ...layer, order }))
      const fallbackLayerId = getWritableLayerId(remaining, st.activeLayerId) ?? remaining[0].id
      const nextElements = st.elements.map((el: CanvasElement) =>
        getElementLayerId(el) === id ? { ...el, layerId: fallbackLayerId } : el
      )
      const selectedIds = st.selectedIds.filter((selectedId: string) => {
        const el = st.idToElement.get(selectedId)
        return el ? getElementLayerId(el) !== id : false
      })

      incrementSaveGeneration()
      set({
        layers: remaining,
        activeLayerId:
          st.activeLayerId === id
            ? fallbackLayerId
            : (getWritableLayerId(remaining, st.activeLayerId) ?? fallbackLayerId),
        elements: nextElements,
        selectedIds,
      })
      setElementCollection(nextElements, get())
      scheduleSave()
    },

    setActiveLayer: (id) => {
      const st = get()
      if (!isLayerWritable(st.layers, id) || st.activeLayerId === id) return
      set({ activeLayerId: id })
    },

    setLayerVisibility: (id, visible) => {
      const st = get()
      const layer = st.layers.find((item: CanvasLayer) => item.id === id)
      if (!layer || layer.visible === visible) return
      const visibleCount = st.layers.filter((item: CanvasLayer) => item.visible).length
      if (!visible && visibleCount <= 1) return

      const nextLayers = st.layers.map((item: CanvasLayer) =>
        item.id === id ? { ...item, visible, updatedAt: Date.now() } : item
      )
      const nextActiveLayerId =
        !visible && st.activeLayerId === id
          ? (getWritableLayerId(nextLayers) ?? nextLayers[0].id)
          : (getWritableLayerId(nextLayers, st.activeLayerId) ?? nextLayers[0].id)
      const hiddenIds = new Set(
        st.elements
          .filter((el: CanvasElement) => getElementLayerId(el) === id)
          .map((el: CanvasElement) => el.id)
      )

      incrementSaveGeneration()
      set({
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
        selectedIds: visible
          ? st.selectedIds
          : st.selectedIds.filter((selectedId: string) => !hiddenIds.has(selectedId)),
      })
      scheduleSave()
    },

    setLayerLocked: (id, locked) => {
      const st = get()
      const layer = st.layers.find((item: CanvasLayer) => item.id === id)
      if (!layer || layer.locked === locked) return

      const nextLayers = st.layers.map((item: CanvasLayer) =>
        item.id === id ? { ...item, locked, updatedAt: Date.now() } : item
      )
      const nextActiveLayerId =
        locked && st.activeLayerId === id
          ? (getWritableLayerId(nextLayers) ?? nextLayers[0].id)
          : (getWritableLayerId(nextLayers, st.activeLayerId) ?? nextLayers[0].id)
      const lockedIds = new Set(
        st.elements
          .filter((el: CanvasElement) => getElementLayerId(el) === id)
          .map((el: CanvasElement) => el.id)
      )

      incrementSaveGeneration()
      set({
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
        selectedIds: locked
          ? st.selectedIds.filter((selectedId: string) => !lockedIds.has(selectedId))
          : st.selectedIds,
      })
      scheduleSave()
    },

    moveLayer: (id, direction) => {
      const st = get()
      const sorted = getSortedLayers(st.layers)
      const index = sorted.findIndex((layer) => layer.id === id)
      if (index < 0) return
      const targetIndex = direction === 'up' ? index + 1 : index - 1
      if (targetIndex < 0 || targetIndex >= sorted.length) return

      const next = [...sorted]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      const reordered = next.map((layer, order) => ({ ...layer, order, updatedAt: Date.now() }))

      incrementSaveGeneration()
      set({ layers: reordered })
      scheduleSave()
    },

    moveElementsToLayer: (ids, layerId) => {
      const st = get()
      if (!isLayerWritable(st.layers, layerId)) return
      const editableIds = getEditableIds(ids, st)
      if (editableIds.length === 0) return
      const idSet = new Set(editableIds)
      let changed = false
      const next = st.elements.map((el: CanvasElement) => {
        if (!idSet.has(el.id) || getElementLayerId(el) === layerId) return el
        changed = true
        return { ...el, layerId }
      })
      if (!changed) return

      incrementSaveGeneration()
      set({ elements: next, selectedIds: editableIds })
      setElementCollection(next, get())
      scheduleSave()
    },

    moveSelectedToLayer: (layerId) => {
      get().moveElementsToLayer(get().selectedIds, layerId)
    },

    addElement: (el) => {
      const st = get()
      const layeredEl = assignToWritableLayer(el, st)
      if (!layeredEl) return
      incrementSaveGeneration()
      const action: UndoAction = {
        type: 'add',
        ids: [layeredEl.id],
        els: [shallowClone(layeredEl)],
      }
      const newIndex = st.elements.length
      set({
        elements: [...st.elements, layeredEl],
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
      })
      // 同步更新 ID 映射（闭包和 store 都更新）
      idToElement.set(layeredEl.id, layeredEl)
      st.idToElement.set(layeredEl.id, layeredEl)
      idToIndex.set(layeredEl.id, newIndex)
      st.idToIndex.set(layeredEl.id, newIndex)
      spatialIndex.insert(layeredEl)
      scheduleSave()
    },

    addElements: (els) => {
      const st = get()
      const layeredEls = els
        .map((el) => assignToWritableLayer(el, st))
        .filter((el: CanvasElement | null): el is CanvasElement => !!el)
      if (layeredEls.length === 0) return
      incrementSaveGeneration()
      const action: UndoAction = {
        type: 'add',
        ids: layeredEls.map((e) => e.id),
        els: layeredEls.map(shallowClone),
      }
      const baseIndex = st.elements.length
      set({
        elements: [...st.elements, ...layeredEls],
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
      })
      // 同步更新 ID 映射（闭包和 store 都更新）
      layeredEls.forEach((el, i) => {
        idToElement.set(el.id, el)
        st.idToElement.set(el.id, el)
        idToIndex.set(el.id, baseIndex + i)
        st.idToIndex.set(el.id, baseIndex + i)
        spatialIndex.insert(el)
      })
      scheduleSave()
    },

    updateElement: (id, update) => {
      incrementSaveGeneration()
      // P0 性能优化: 使用 idToIndex O(1) 查找，替代 map O(n) 遍历
      // 单元素更新性能提升 10-100x（元素越多提升越明显）
      const st = get()
      // 懒索引重建 - 查询失败时先重建再重试
      rebuildIndexIfNeeded()
      let idx: number | undefined = idToIndex.get(id)
      if (idx === undefined) {
        idx = st.elements.findIndex((e: CanvasElement) => e.id === id)
      }
      if (idx === undefined || idx < 0) return
      const oldEl = st.elements[idx]
      if (!isElementLayerEditable(oldEl, st.layers)) return
      const newEl = update(oldEl)
      // 原地修改数组副本，避免创建全新数组
      const next = [...st.elements]
      next[idx] = newEl
      // 同步更新 ID 映射（闭包和 store 都更新）
      idToElement.set(id, newEl)
      st.idToElement.set(id, newEl)
      spatialIndex.update(newEl)
      set({ elements: next })
      scheduleSave()
    },

    commitElements,

    removeElement: (id) => {
      incrementSaveGeneration()
      const st = get()
      // 懒索引重建 - 查询失败时先重建再重试
      rebuildIndexIfNeeded()
      // 使用 idToIndex O(1) 查找替代 findIndex O(n)
      // fallback: 如果 idToIndex 中找不到，回退到 findIndex（兼容测试环境和历史数据）
      let idx: number | undefined = idToIndex.get(id)
      if (idx === undefined) {
        idx = st.elements.findIndex((e: CanvasElement) => e.id === id)
      }
      if (idx === undefined || idx < 0) return
      // 跳过锁定或不可见/锁定图层中的元素，禁止删除
      if (!isElementLayerEditable(st.elements[idx], st.layers)) return
      const el = st.elements[idx]
      const action: UndoAction = {
        type: 'remove',
        items: [{ el: shallowClone(el), index: idx }],
      }
      const next = [...st.elements]
      next.splice(idx, 1)
      set({
        elements: next,
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: st.selectedIds.filter((i: string) => i !== id),
      })
      // 同步更新 ID 映射（闭包和 store 都更新）
      idToElement.delete(id)
      st.idToElement.delete(id)
      idToIndex.delete(id)
      st.idToIndex.delete(id)
      // 懒更新策略 - 只标记脏，不立即更新后续所有元素的索引
      // 性能提升: 删除操作从 O(n) → O(1)，大画布场景提升 100x+
      _indexDirty = true
      spatialIndex.remove(id)
      scheduleSave()
    },

    removeElements: (ids) => {
      incrementSaveGeneration()
      const st = get()
      // 过滤掉锁定或不可见/锁定图层中的元素，禁止删除
      const unlockedIds = getEditableIds(ids, st)
      if (unlockedIds.length === 0) return
      const idSet = new Set(unlockedIds)
      const items: { el: CanvasElement; index: number }[] = []
      st.elements.forEach((el: CanvasElement, i: number) => {
        if (idSet.has(el.id)) items.push({ el: shallowClone(el), index: i })
      })
      const action: UndoAction = { type: 'remove', items }
      const newElements = st.elements.filter((e: CanvasElement) => !idSet.has(e.id))
      set({
        elements: newElements,
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: [],
      })
      // 同步更新 ID 映射（闭包和 store 都更新）
      unlockedIds.forEach((id) => {
        idToElement.delete(id)
        st.idToElement.delete(id)
        idToIndex.delete(id)
        st.idToIndex.delete(id)
        spatialIndex.remove(id)
      })
      // 懒更新策略 - 只标记脏，不立即重建所有索引
      // 性能提升: 批量删除从 O(n) → O(k)，k 为删除元素数量
      _indexDirty = true
      scheduleSave()
    },

    moveElementById: (id, dx, dy) => {
      // P0 性能优化: 跳过无意义的移动
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
      incrementSaveGeneration()

      const st = get()
      // 懒索引重建 - 查询失败时先重建再重试
      rebuildIndexIfNeeded()
      // 使用 idToIndex O(1) 查找替代 findIndex O(n)
      // fallback: 如果 idToIndex 中找不到，回退到 findIndex（兼容测试环境和历史数据）
      let idx: number | undefined = idToIndex.get(id)
      if (idx === undefined) {
        idx = st.elements.findIndex((e: CanvasElement) => e.id === id)
      }
      if (idx === undefined || idx < 0) return
      // 跳过锁定或不可见/锁定图层中的元素，禁止移动
      if (!isElementLayerEditable(st.elements[idx], st.layers)) return
      const plan = createMoveElementPlan(st.elements, idx, dx, dy, idToElement, idToIndex)
      synchronizeElementGeometry(
        collectionRuntime,
        plan.elements,
        plan.updatedElements.map((element) => element.id),
        st
      )
      set({ elements: plan.elements })
      scheduleSave()
    },

    moveElementsById: (ids, dx, dy, options = {}) => {
      // P0 性能优化: 跳过无意义的移动
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
      if (ids.length === 0) return
      incrementSaveGeneration()

      const st = get()
      // 过滤掉锁定或不可见/锁定图层中的元素，禁止移动
      const unlockedIds = getEditableIds(ids, st)
      if (unlockedIds.length === 0) return

      const recordHistory = options.recordHistory !== false
      const plan = createMoveElementsPlan(
        st.elements,
        unlockedIds,
        dx,
        dy,
        idToElement,
        idToIndex,
        recordHistory
      )
      if (!plan) {
        scheduleSave()
        return
      }

      synchronizeElementGeometry(
        collectionRuntime,
        plan.elements,
        plan.updatedElements.map((element) => element.id),
        st
      )
      set({
        elements: plan.elements,
        ...(plan.action
          ? {
              undoStack: [...st.undoStack.slice(-MAX_HISTORY), plan.action],
              redoStack: [],
            }
          : {}),
      })
      scheduleSave()
    },

    resizeElementById: (id, ax, ay, sx, sy) => {
      // P0 性能优化: 跳过无意义的缩放
      if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return
      incrementSaveGeneration()

      const st = get()
      // 懒索引重建 - 查询失败时先重建再重试
      rebuildIndexIfNeeded()
      // 使用 idToIndex O(1) 查找替代 findIndex O(n)
      // fallback: 如果 idToIndex 中找不到，回退到 findIndex（兼容测试环境和历史数据）
      let idx: number | undefined = idToIndex.get(id)
      if (idx === undefined) {
        idx = st.elements.findIndex((e: CanvasElement) => e.id === id)
      }
      if (idx === undefined || idx < 0) return
      // 跳过锁定或不可见/锁定图层中的元素，禁止缩放
      if (!isElementLayerEditable(st.elements[idx], st.layers)) return
      const plan = createResizeElementPlan(st.elements, idx, ax, ay, sx, sy)
      synchronizeElementGeometry(collectionRuntime, plan.elements, [id], st)
      set({ elements: plan.elements })
      scheduleSave()
    },

    // 元素旋转
    // 专业白板标准功能：绕中心点旋转元素
    rotateElementById: (id, angle, cx, cy) => {
      // P0 性能优化: 跳过无意义的旋转
      if (Math.abs(angle) < 0.0001) return
      incrementSaveGeneration()

      const st = get()
      // 懒索引重建 - 查询失败时先重建再重试
      rebuildIndexIfNeeded()
      // 使用 idToIndex O(1) 查找替代 findIndex O(n)
      let idx: number | undefined = idToIndex.get(id)
      if (idx === undefined) {
        idx = st.elements.findIndex((e: CanvasElement) => e.id === id)
      }
      if (idx === undefined || idx < 0) return
      // 跳过锁定或不可见/锁定图层中的元素，禁止旋转
      if (!isElementLayerEditable(st.elements[idx], st.layers)) return
      const plan = createRotateElementPlan(st.elements, idx, angle, cx, cy)
      synchronizeElementGeometry(collectionRuntime, plan.elements, [id], st)
      set({ elements: plan.elements })
      scheduleSave()
    },
    // 批量旋转多个元素
    // 专业设计工具标准：选中多个元素，拖拽旋转手柄一起旋转
    rotateElementsById: (ids, angleDelta, commonCenterX, commonCenterY) => {
      if (Math.abs(angleDelta) < 0.0001) return
      if (ids.length === 0) return
      incrementSaveGeneration()
      const st = get()
      // 过滤掉锁定或不可见/锁定图层中的元素，禁止旋转
      const unlockedIds = getEditableIds(ids, st)
      if (unlockedIds.length === 0) return
      const plan = createRotateElementsPlan(
        st.elements,
        unlockedIds,
        angleDelta,
        commonCenterX,
        commonCenterY
      )
      if (!plan) {
        scheduleSave()
        return
      }

      synchronizeElementGeometry(collectionRuntime, plan.elements, unlockedIds, st)
      set({ elements: plan.elements })
      scheduleSave()
    },

    clearAll: () => {
      incrementSaveGeneration()
      const st = get()
      const action: UndoAction = { type: 'clear', snapshot: snapshot(st.elements) }
      set({
        elements: [],
        undoStack: [...st.undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
        selectedIds: [],
      })
      // 同步更新 ID 映射（闭包和 store 都更新）
      idToElement.clear()
      st.idToElement.clear()
      idToIndex.clear()
      st.idToIndex.clear()
      spatialIndex.clear()
      // 清空后索引干净，重置脏标记
      _indexDirty = false
      scheduleSave()
    },

    copySelected: () => {
      const { elements, selectedIds } = get()
      if (selectedIds.length === 0) return
      set({ clipboard: copySelectedElements(elements, selectedIds) })
    },

    paste: () => {
      const st = get()
      const { clipboard, elements } = st
      if (clipboard.length === 0) return
      const { elements: pasted, ids: newIds } = createOffsetCopyPlan(clipboard, st, Date.now())
      if (pasted.length === 0) return
      incrementSaveGeneration()
      const action: UndoAction = { type: 'add', ids: newIds, els: pasted.map(shallowClone) }
      const baseIndex = elements.length
      set({
        elements: [...elements, ...pasted],
        selectedIds: newIds,
        clipboard: pasted.map(shallowClone),
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
      })
      // 同步更新 ID 映射（闭包和 store 都更新）
      pasted.forEach((el: CanvasElement, i: number) => {
        idToElement.set(el.id, el)
        st.idToElement.set(el.id, el)
        idToIndex.set(el.id, baseIndex + i)
        st.idToIndex.set(el.id, baseIndex + i)
        spatialIndex.insert(el)
      })
      scheduleSave()
    },

    // Ctrl+D 快速复制
    // 一键复制选中元素并偏移 20px，比 Ctrl+C/V 少一次按键操作
    // 常见设计工具通常支持此快捷键
    duplicateSelected: () => {
      const st = get()
      const { elements, selectedIds } = st
      if (selectedIds.length === 0) return
      const now = Date.now()
      const editableIds = getEditableIds(selectedIds, st)
      if (editableIds.length === 0) return
      const selSet = new Set(editableIds)
      const { elements: duplicated, ids: newIds } = createOffsetCopyPlan(
        elements.filter((element: CanvasElement) => selSet.has(element.id)),
        st,
        now
      )
      if (duplicated.length === 0) return
      incrementSaveGeneration()
      const action: UndoAction = { type: 'add', ids: newIds, els: duplicated.map(shallowClone) }
      const baseIndex = elements.length
      set({
        elements: [...elements, ...duplicated],
        selectedIds: newIds,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), action],
        redoStack: [],
      })
      // 同步更新 ID 映射（闭包和 store 都更新）
      duplicated.forEach((el: CanvasElement, i: number) => {
        idToElement.set(el.id, el)
        st.idToElement.set(el.id, el)
        idToIndex.set(el.id, baseIndex + i)
        st.idToIndex.set(el.id, baseIndex + i)
        spatialIndex.insert(el)
      })
      scheduleSave()
    },

    // Ctrl+G 元素分组
    // 将选中的多个元素组合成一个组，点击组内任意元素选中整个组
    // 常见设计工具通常支持此功能
    groupSelected: () => {
      const st = get()
      const { elements, selectedIds } = st
      if (selectedIds.length < 2) return
      const editableIds = getEditableIds(selectedIds, st)
      if (editableIds.length < 2) return

      const plan = createGroupPlan(elements, editableIds, `group-${Date.now()}`)
      synchronizeElementReferences(collectionRuntime, plan.updatedElements, st)

      incrementSaveGeneration()
      set({
        elements: plan.elements,
        selectedIds: editableIds,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), plan.action],
        redoStack: [],
      })
      scheduleSave()
    },

    ungroupSelected: () => {
      const st = get()
      const { elements, selectedIds } = st
      if (selectedIds.length === 0) return
      const editableIds = getEditableIds(selectedIds, st)
      if (editableIds.length === 0) return

      const plan = createUngroupPlan(elements, editableIds)
      if (!plan) return
      synchronizeElementReferences(collectionRuntime, plan.updatedElements, st)

      incrementSaveGeneration()
      set({
        elements: plan.elements,
        selectedIds: editableIds,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), plan.action],
        redoStack: [],
      })
      scheduleSave()
    },

    alignSelected: (alignment) => {
      const st = get()
      const { elements, selectedIds } = st
      if (selectedIds.length < 2) return
      const editableIds = getEditableIds(selectedIds, st)
      if (editableIds.length < 2) return

      const plan = createAlignmentPlan(elements, editableIds, alignment)
      if (!plan) return
      synchronizeElementGeometry(collectionRuntime, plan.elements, editableIds, st)

      incrementSaveGeneration()
      set({
        elements: plan.elements,
        selectedIds: editableIds,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), plan.action],
        redoStack: [],
      })
      scheduleSave()
    },

    distributeSelected: (distribution) => {
      const st = get()
      const { elements, selectedIds } = st
      if (selectedIds.length < 3) return
      const editableIds = getEditableIds(selectedIds, st)
      if (editableIds.length < 3) return

      const plan = createDistributionPlan(elements, editableIds, distribution)
      if (!plan) return
      synchronizeElementGeometry(collectionRuntime, plan.elements, editableIds, st)

      incrementSaveGeneration()
      set({
        elements: plan.elements,
        selectedIds: editableIds,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), plan.action],
        redoStack: [],
      })
      scheduleSave()
    },

    batchErase: (beforeSnap, _added, baseUndoStack) => {
      const st = get()
      const action: UndoAction = {
        type: 'erase',
        before: beforeSnap.map(shallowClone),
        after: st.elements.map(shallowClone),
      }
      commitElements(st.elements, {
        action,
        selectedIds: [],
        undoStack: baseUndoStack,
      })
    },

    restoreElementsSnapshot: (elements, selectedIds = get().selectedIds) => {
      const nextElements = elements.map(shallowClone)
      const nextIds = new Set(nextElements.map((element) => element.id))
      incrementSaveGeneration()
      set({
        elements: nextElements,
        selectedIds: selectedIds.filter((id) => nextIds.has(id)),
      })
      setElementCollection(nextElements, get())
      scheduleSave()
    },

    // 锁定选中元素
    // 专业设计工具标配：锁定元素防止误操作
    // 用户痛点："背景元素经常被不小心移动/删除"
    lockSelected: () => {
      incrementSaveGeneration()
      const st = get()
      const { elements, selectedIds } = st
      if (selectedIds.length === 0) return

      const plan = createElementLockPlan(elements, selectedIds, st.layers, true)
      if (!plan) return
      synchronizeElementReferences(collectionRuntime, plan.updatedElements, st)

      set({
        elements: plan.elements,
        selectedIds,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), plan.action],
        redoStack: [],
      })
      scheduleSave()
    },

    unlockSelected: () => {
      incrementSaveGeneration()
      const st = get()
      const { elements, selectedIds } = st
      if (selectedIds.length === 0) return

      const plan = createElementLockPlan(elements, selectedIds, st.layers, false)
      if (!plan) return
      synchronizeElementReferences(collectionRuntime, plan.updatedElements, st)

      set({
        elements: plan.elements,
        selectedIds,
        undoStack: [...get().undoStack.slice(-MAX_HISTORY), plan.action],
        redoStack: [],
      })
      scheduleSave()
    },
  }
}
