import { describe, expect, it, vi } from 'vitest'
import { createDefaultLayer } from './layers'
import type { CanvasBackgroundImage, CanvasElement, CanvasLayer, ShapeElement } from './types'

const { incrementSaveGeneration, scheduleSave } = vi.hoisted(() => ({
  incrementSaveGeneration: vi.fn(),
  scheduleSave: vi.fn(),
}))

import type * as SaveManagerModule from './saveManager'

// 守卫测试：凡修改文档承载状态（elements/layers/activeLayerId/bgColor/
// backgroundStyle/backgroundImage/undoStack/redoStack）的公开 action，
// 都必须同时触发 incrementSaveGeneration（标脏）与 scheduleSave（调度保存）。
// 缺了标脏，saveDocNow 会因 generation 相等而跳过写入——静默丢数据。
vi.mock('./saveManager', async (importOriginal) => {
  const actual = await importOriginal<typeof SaveManagerModule>()
  return {
    ...actual,
    incrementSaveGeneration,
    scheduleSave,
  }
})

import { useAppStore } from './appStore'
import { beginHydration, endHydration } from './saveManager'

function shape(id: string, layerId: string, x = 20): ShapeElement {
  return {
    type: 'shape',
    id,
    layerId,
    kind: 'rectangle',
    x,
    y: 20,
    w: 20,
    h: 20,
    color: '#111111',
    size: 2,
  }
}

const backgroundImage: CanvasBackgroundImage = {
  dataUrl: 'data:image/png;base64,guard',
  fit: 'cover',
  width: 100,
  height: 60,
}

/** 重置为空白基线并返回真实图层夹具（元素必须绑在这个图层上）。 */
function resetGuardStore(): CanvasLayer {
  const layer = createDefaultLayer(1)
  const state = useAppStore.getState()
  state.idToElement.clear()
  state.idToIndex.clear()
  state.spatialIndex.clear()
  useAppStore.setState({
    elements: [],
    layers: [layer],
    activeLayerId: layer.id,
    selectedIds: [],
    clipboard: [],
    undoStack: [],
    redoStack: [],
    bgColor: '#ffffff',
    backgroundStyle: 'plain',
    backgroundImage: undefined,
    currentDocId: 'doc-guard',
    docs: [],
  })
  incrementSaveGeneration.mockClear()
  scheduleSave.mockClear()
  return layer
}

function installFixtures(elements: CanvasElement[], selectedIds: string[] = []) {
  useAppStore.getState().addElements(elements)
  if (selectedIds.length > 0) useAppStore.getState().setSelectedIds(selectedIds)
  incrementSaveGeneration.mockClear()
  scheduleSave.mockClear()
}

function expectScheduled() {
  expect(incrementSaveGeneration).toHaveBeenCalled()
  expect(scheduleSave).toHaveBeenCalled()
}

function expectNotScheduled() {
  expect(incrementSaveGeneration).not.toHaveBeenCalled()
  expect(scheduleSave).not.toHaveBeenCalled()
}

describe('document save scheduling guard', () => {
  it('schedules for addElement and addElements', () => {
    const layer = resetGuardStore()

    useAppStore.getState().addElement(shape('add-1', layer.id))
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().addElements([shape('add-2', layer.id)])
    expectScheduled()
  })

  it('schedules for updateElement / removeElement / removeElements / clearAll', () => {
    const layer = resetGuardStore()
    useAppStore.getState().addElement(shape('u1', layer.id))

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().updateElement('u1', (element) => ({ ...element, x: 99 }))
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().removeElement('u1')
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().addElement(shape('u2', layer.id))
    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().removeElements(['u2'])
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().addElement(shape('u3', layer.id))
    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    expect(useAppStore.getState().clearAll()).toBe(true)
    expectScheduled()
  })

  it('schedules for direct commitElements', () => {
    const layer = resetGuardStore()
    useAppStore.getState().commitElements([shape('c1', layer.id)], { clearRedo: true })
    expectScheduled()
  })

  it('schedules for geometry mutations (move/resize/rotate)', () => {
    const layer = resetGuardStore()
    useAppStore.getState().addElement(shape('g1', layer.id))

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().moveElementById('g1', 5, 5)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().moveElementsById(['g1'], 3, 3)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().resizeElementById('g1', 0, 0, 1.5, 1.5)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().rotateElementById('g1', Math.PI / 6)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().rotateElementsById(['g1'], Math.PI / 6)
    expectScheduled()
  })

  it('schedules for clipboard paste and duplicate', () => {
    const layer = resetGuardStore()
    installFixtures([shape('p1', layer.id)], ['p1'])

    useAppStore.getState().copySelected()
    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().paste()
    expectScheduled()

    const layer2 = resetGuardStore()
    installFixtures([shape('p2', layer2.id)], ['p2'])
    useAppStore.getState().duplicateSelected()
    expectScheduled()
  })

  it('schedules for grouping and locking', () => {
    const layer = resetGuardStore()
    installFixtures([shape('g1', layer.id), shape('g2', layer.id, 60)], ['g1', 'g2'])

    useAppStore.getState().groupSelected()
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().ungroupSelected()
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().lockSelected()
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().unlockSelected()
    expectScheduled()
  })

  it('schedules for alignSelected', () => {
    const layer = resetGuardStore()
    installFixtures([shape('a1', layer.id, 0), shape('a2', layer.id, 100)], ['a1', 'a2'])

    useAppStore.getState().alignSelected('alignLeft')
    expectScheduled()
  })

  it('schedules for distributeSelected', () => {
    const layer = resetGuardStore()
    installFixtures(
      [shape('d1', layer.id, 0), shape('d2', layer.id, 40), shape('d3', layer.id, 200)],
      ['d1', 'd2', 'd3']
    )

    useAppStore.getState().distributeSelected('distributeH')
    expectScheduled()
  })

  it('schedules for reorderSelected and applyStyleToSelected', () => {
    const layer = resetGuardStore()
    installFixtures([shape('r1', layer.id, 0), shape('r2', layer.id, 100)], ['r1'])

    const reorder = useAppStore.getState().reorderSelected('front')
    expect(reorder.status).toBe('applied')
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    const style = useAppStore.getState().applyStyleToSelected({ color: '#ff0000' })
    expect(style.status).toBe('applied')
    expectScheduled()
  })

  it('schedules for eraser commits and snapshot restoration', () => {
    const layer = resetGuardStore()
    installFixtures([shape('e1', layer.id)])

    const before = useAppStore.getState().elements.map((element) => element)
    useAppStore.getState().batchErase(before, [])
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().restoreElementsSnapshot([shape('e2', layer.id)])
    expectScheduled()
  })

  it('schedules for layer operations', () => {
    const layer = resetGuardStore()
    installFixtures([shape('l1', layer.id)])
    const firstLayerId = layer.id

    const createdId = useAppStore.getState().createLayer('图层 2')
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().renameLayer(createdId, '改名')
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().moveLayer(createdId, 'down')
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().setActiveLayer(firstLayerId)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().moveElementsToLayer(['l1'], createdId)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().setLayerLocked(createdId, true)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().setLayerLocked(createdId, false)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().setSelectedIds(['l1'])
    useAppStore.getState().moveSelectedToLayer(firstLayerId)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().setLayerVisibility(createdId, false)
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().deleteLayer(createdId)
    expectScheduled()
  })

  it('schedules for undo and redo', () => {
    const layer = resetGuardStore()
    useAppStore.getState().addElement(shape('h1', layer.id))

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().undo()
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().redo()
    expectScheduled()
  })

  it('schedules for persisted workspace settings (bg color / style / image)', () => {
    resetGuardStore()

    useAppStore.getState().setBgColor('#f5f5f5')
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().setBackgroundStyle('grid')
    expectScheduled()

    incrementSaveGeneration.mockClear()
    scheduleSave.mockClear()
    useAppStore.getState().setBackgroundImage(backgroundImage)
    expectScheduled()
  })

  it('schedules for commitBackgroundImage', () => {
    resetGuardStore()
    useAppStore.getState().commitBackgroundImage(backgroundImage, '导入背景图')
    expectScheduled()
  })

  it('does not schedule while hydrating the workspace', () => {
    const layer = resetGuardStore()

    beginHydration()
    try {
      useAppStore.setState({ elements: [shape('hyd-1', layer.id)] })
    } finally {
      endHydration()
    }
    expectNotScheduled()

    useAppStore.setState({ elements: [shape('hyd-2', layer.id)] })
    expectScheduled()
  })

  it('does not schedule for non-document tool settings', () => {
    resetGuardStore()
    const store = useAppStore.getState()

    store.setTool(store.tool)
    store.setBrush(store.brush)
    store.setColor('#0055ff')
    store.setSize(16)
    store.setTextDefaults({ fontSize: 28 })
    expectNotScheduled()
  })

  it('does not schedule for pure selection or clipboard reads', () => {
    const layer = resetGuardStore()
    installFixtures([shape('s1', layer.id)], ['s1'])

    useAppStore.getState().setSelectedIds([])
    useAppStore.getState().setSelectedIds(['s1'])
    useAppStore.getState().copySelected()
    expectNotScheduled()
  })

  it('does not schedule when style commands only update defaults (no selection)', () => {
    resetGuardStore()
    const result = useAppStore.getState().applyStyle({ color: '#0055ff' })
    expect(result.status).toBe('defaults-updated')
    expectNotScheduled()
  })
})
