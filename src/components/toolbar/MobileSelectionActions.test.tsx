import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '../../store/appStore'
import { createDefaultLayer } from '../../store/layers'
import type { CanvasElement } from '../../store/types'
import MobileSelectionActions from './MobileSelectionActions'

const layer = createDefaultLayer(1)

const elements: CanvasElement[] = [
  {
    type: 'shape',
    id: 'left',
    layerId: layer.id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  },
  {
    type: 'shape',
    id: 'middle',
    layerId: layer.id,
    kind: 'rectangle',
    x: 40,
    y: 10,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  },
  {
    type: 'shape',
    id: 'right',
    layerId: layer.id,
    kind: 'rectangle',
    x: 80,
    y: 20,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  },
]

function setSelection(
  nextElements: CanvasElement[],
  selectedIds = nextElements.map(({ id }) => id)
) {
  useAppStore.setState({
    elements: nextElements,
    layers: [layer],
    activeLayerId: layer.id,
    selectedIds,
    idToElement: new Map(nextElements.map((element) => [element.id, element])),
    idToIndex: new Map(nextElements.map((element, index) => [element.id, index])),
  })
}

describe('MobileSelectionActions', () => {
  beforeEach(() => {
    setSelection(elements)
  })

  it('offers the complete touch selection action set', () => {
    const groupSelected = vi.fn()
    const duplicateSelected = vi.fn()
    const lockSelected = vi.fn()
    const alignSelected = vi.fn()
    const distributeSelected = vi.fn()
    const removeElements = vi.fn()
    useAppStore.setState({
      groupSelected,
      duplicateSelected,
      lockSelected,
      alignSelected,
      distributeSelected,
      removeElements,
    })

    render(<MobileSelectionActions />)

    fireEvent.click(screen.getByRole('button', { name: '分组' }))
    fireEvent.click(screen.getByRole('button', { name: '复制副本' }))
    fireEvent.click(screen.getByRole('button', { name: '锁定元素' }))
    fireEvent.change(screen.getByRole('combobox', { name: '对齐选中元素' }), {
      target: { value: 'alignLeft' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: '分布选中元素' }), {
      target: { value: 'distributeH' },
    })
    fireEvent.click(screen.getByRole('button', { name: '删除选中元素' }))

    expect(groupSelected).toHaveBeenCalledOnce()
    expect(duplicateSelected).toHaveBeenCalledOnce()
    expect(lockSelected).toHaveBeenCalledOnce()
    expect(alignSelected).toHaveBeenCalledWith('alignLeft')
    expect(distributeSelected).toHaveBeenCalledWith('distributeH')
    expect(removeElements).toHaveBeenCalledWith(['left', 'middle', 'right'])
  })

  it('keeps only copy and unlock for an element-locked selection', () => {
    const lockedElements = elements.map((element) =>
      element.id === 'middle' ? { ...element, locked: true } : element
    )
    const copySelected = vi.fn()
    const unlockSelected = vi.fn()
    const groupSelected = vi.fn()
    const duplicateSelected = vi.fn()
    const lockSelected = vi.fn()
    const removeElements = vi.fn()
    const alignSelected = vi.fn()
    const distributeSelected = vi.fn()
    setSelection(lockedElements)
    useAppStore.setState({
      copySelected,
      unlockSelected,
      groupSelected,
      duplicateSelected,
      lockSelected,
      removeElements,
      alignSelected,
      distributeSelected,
    })

    render(<MobileSelectionActions />)

    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    fireEvent.click(screen.getByRole('button', { name: '解锁元素' }))

    expect(screen.queryByRole('button', { name: '分组' })).toBeNull()
    expect(screen.queryByRole('button', { name: '复制副本' })).toBeNull()
    expect(screen.queryByRole('button', { name: '锁定元素' })).toBeNull()
    expect(screen.queryByRole('button', { name: '删除选中元素' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '对齐选中元素' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '分布选中元素' })).toBeNull()
    expect(copySelected).toHaveBeenCalledOnce()
    expect(unlockSelected).toHaveBeenCalledOnce()
    expect(groupSelected).not.toHaveBeenCalled()
    expect(duplicateSelected).not.toHaveBeenCalled()
    expect(lockSelected).not.toHaveBeenCalled()
    expect(removeElements).not.toHaveBeenCalled()
    expect(alignSelected).not.toHaveBeenCalled()
    expect(distributeSelected).not.toHaveBeenCalled()
  })

  it('unlocks every locked source layer before unlocking selected elements', () => {
    const lockedLayer = { ...layer, locked: true }
    const copySelected = vi.fn()
    const unlockSelected = vi.fn()
    const setLayerLocked = vi.fn()
    const groupSelected = vi.fn()
    const duplicateSelected = vi.fn()
    const removeElements = vi.fn()
    const alignSelected = vi.fn()
    const distributeSelected = vi.fn()
    setSelection(elements)
    useAppStore.setState({
      layers: [lockedLayer],
      copySelected,
      unlockSelected,
      setLayerLocked,
      groupSelected,
      duplicateSelected,
      removeElements,
      alignSelected,
      distributeSelected,
    })

    render(<MobileSelectionActions />)

    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    fireEvent.click(screen.getByRole('button', { name: '解锁元素' }))

    expect(screen.queryByRole('button', { name: '分组' })).toBeNull()
    expect(screen.queryByRole('button', { name: '复制副本' })).toBeNull()
    expect(screen.queryByRole('button', { name: '删除选中元素' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '对齐选中元素' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '分布选中元素' })).toBeNull()
    expect(copySelected).toHaveBeenCalledOnce()
    expect(setLayerLocked).toHaveBeenCalledWith(lockedLayer.id, false)
    expect(unlockSelected).toHaveBeenCalledOnce()
    expect(groupSelected).not.toHaveBeenCalled()
    expect(duplicateSelected).not.toHaveBeenCalled()
    expect(removeElements).not.toHaveBeenCalled()
    expect(alignSelected).not.toHaveBeenCalled()
    expect(distributeSelected).not.toHaveBeenCalled()
  })

  it('does not render when there is no selection', () => {
    useAppStore.setState({ selectedIds: [] })
    render(<MobileSelectionActions />)

    expect(screen.queryByRole('toolbar', { name: '选中元素操作' })).toBeNull()
  })
})
