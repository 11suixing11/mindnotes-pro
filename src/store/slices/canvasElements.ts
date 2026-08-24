import type {
  AlignmentType,
  DistributionType,
  CanvasElement,
  CanvasLayer,
  UndoAction,
} from '../types'
import { createDefaultLayer } from '../layers'
import { scheduleSave, incrementSaveGeneration } from '../saveManager'
import type { SpatialIndex } from '../../eraser/SpatialIndex'
import { getSelectableIds } from './canvasElementRules'
import {
  appendElementCollection,
  createCanvasElementCollectionRuntime,
  rebuildElementIndexes,
  removeElementCollection,
  replaceElementCollection,
  synchronizeElementCollection,
  synchronizeElementGeometry,
  synchronizeElementReplacement,
  synchronizeElementReferences,
} from './canvasElementCollection'
import { createCanvasElementCommitPlan, type CommitElementsOptions } from './canvasElementCommit'
import { createCanvasElementLayerActions } from './canvasElementLayerActions'
import { createCanvasElementClipboardActions } from './canvasElementClipboardActions'
import { createCanvasElementMetadataActions } from './canvasElementMetadataActions'
import { createCanvasElementArrangementActions } from './canvasElementArrangementActions'
import {
  createCanvasElementMutationActions,
  type UpdateElementOptions,
} from './canvasElementMutationActions'
import {
  createCanvasElementGeometryActions,
  type MoveElementsOptions,
} from './canvasElementGeometryActions'
import { createCanvasElementSnapshotActions } from './canvasElementSnapshotActions'

export type { CommitElementsOptions } from './canvasElementCommit'
export type { MoveElementsOptions } from './canvasElementGeometryActions'

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

export interface CanvasElementsActions {
  addElement: (el: CanvasElement) => boolean
  addElements: (els: CanvasElement[]) => boolean
  createLayer: (name?: string) => string
  renameLayer: (id: string, name: string) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  setLayerVisibility: (id: string, visible: boolean) => void
  setLayerLocked: (id: string, locked: boolean) => void
  moveLayer: (id: string, direction: 'up' | 'down') => void
  moveElementsToLayer: (ids: string[], layerId: string) => void
  moveSelectedToLayer: (layerId: string) => void
  updateElement: (
    id: string,
    update: (el: CanvasElement) => CanvasElement,
    options?: UpdateElementOptions
  ) => boolean
  commitElements: (elements: CanvasElement[], options?: CommitElementsOptions) => void
  removeElement: (id: string) => boolean
  removeElements: (ids: string[]) => boolean
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
  clearAll: () => boolean
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
    const plan = createCanvasElementCommitPlan(st, nextElements, options)
    if (!plan) return

    incrementSaveGeneration()
    set({
      elements: plan.elements,
      selectedIds: plan.selectedIds,
      undoStack: plan.undoStack,
      ...(plan.clearRedo ? { redoStack: [] } : {}),
    })
    syncElementCollection(plan.elements, get())
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
    ...createCanvasElementLayerActions({
      set,
      get,
      replaceElementCollection: setElementCollection,
    }),
    ...createCanvasElementClipboardActions({
      set,
      get,
      appendElementCollection: (elements, startIndex, state) =>
        appendElementCollection(collectionRuntime, elements, startIndex, state),
    }),
    ...createCanvasElementMetadataActions({
      set,
      get,
      synchronizeElementReferences: (elements, state) =>
        synchronizeElementReferences(collectionRuntime, elements, state),
    }),
    ...createCanvasElementArrangementActions({
      set,
      get,
      synchronizeElementGeometry: (elements, elementIds, state) =>
        synchronizeElementGeometry(collectionRuntime, elements, elementIds, state),
    }),
    ...createCanvasElementMutationActions({
      set,
      get,
      rebuildIndexIfNeeded,
      appendElementCollection: (elements, startIndex, state) =>
        appendElementCollection(collectionRuntime, elements, startIndex, state),
      synchronizeElementReplacement: (elements, index, previousId, state) =>
        synchronizeElementReplacement(collectionRuntime, elements, index, previousId, state),
      removeElementCollection: (elementIds, state) =>
        removeElementCollection(collectionRuntime, elementIds, state),
      replaceElementCollection: setElementCollection,
      markIndexDirty: () => {
        _indexDirty = true
      },
    }),
    ...createCanvasElementGeometryActions({
      set,
      get,
      rebuildIndexIfNeeded,
      synchronizeElementGeometry: (elements, elementIds, state) =>
        synchronizeElementGeometry(collectionRuntime, elements, elementIds, state),
    }),
    ...createCanvasElementSnapshotActions({
      set,
      get,
      commitElements,
      replaceElementCollection: setElementCollection,
    }),

    commitElements,
  }
}
