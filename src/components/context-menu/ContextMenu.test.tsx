import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import type { ShapeElement } from '../../store/types'
import { ContextMenu } from './ContextMenu'

const confirmMock = vi.hoisted(() => vi.fn(async () => true))

vi.mock('../confirm-modal', () => ({
  useConfirm: () => confirmMock,
}))

function makeShape(id: string, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
    ...overrides,
  }
}

describe('ContextMenu', () => {
  const onClose = vi.fn()
  const copySelected = vi.fn()
  const paste = vi.fn()
  const removeElements = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    copySelected.mockClear()
    paste.mockClear()
    removeElements.mockClear()
    confirmMock.mockReset()
    confirmMock.mockResolvedValue(true)
    useAppStore.setState({
      elements: [],
      selectedIds: [],
      copySelected,
      paste,
      removeElements,
      clearAll: vi.fn(() => true),
    })
  })

  it('shows only selection-independent actions without a selection', () => {
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    expect(screen.getByRole('menuitem', { name: /粘贴/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /全选/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: '清空画布' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /复制 Ctrl\+C/ })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /删除/ })).toBeNull()
  })

  it('cuts the current selection and closes the menu', () => {
    const shape = makeShape('shape-1')
    useAppStore.setState({ elements: [shape], selectedIds: [shape.id] })
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    fireEvent.click(screen.getByRole('menuitem', { name: /剪切/ }))

    expect(copySelected).toHaveBeenCalledOnce()
    expect(removeElements).toHaveBeenCalledWith([shape.id])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape and outside pointer presses', () => {
    const { unmount } = render(<ContextMenu x={20} y={30} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()

    onClose.mockClear()
    fireEvent.mouseDown(document.body)
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
  })

  it('stays mounted while a nested confirmation layer handles pointer input', () => {
    render(<ContextMenu x={20} y={30} onClose={onClose} />)
    const modalLayer = document.createElement('div')
    modalLayer.dataset.modalLayer = 'true'
    const modalButton = document.createElement('button')
    modalLayer.appendChild(modalButton)
    document.body.appendChild(modalLayer)

    fireEvent.mouseDown(modalButton)

    expect(onClose).not.toHaveBeenCalled()
    modalLayer.remove()
  })

  it('opens and closes submenus with ArrowRight and ArrowLeft', async () => {
    const shapes = [makeShape('one'), makeShape('two'), makeShape('three')]
    useAppStore.setState({ elements: shapes, selectedIds: shapes.map((shape) => shape.id) })
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    const align = screen.getByRole('menuitem', { name: '对齐' })
    align.focus()
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    const firstAlignment = await screen.findByRole('menuitem', { name: '左对齐' })
    await waitFor(() => expect(document.activeElement).toBe(firstAlignment))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.queryByRole('menu', { name: '对齐选项' })).toBeNull()
    expect(document.activeElement).toBe(align)
  })

  it('confirms clearing a non-empty canvas from the context menu', async () => {
    const clearAll = vi.fn(() => true)
    useAppStore.setState({ elements: [makeShape('shape-1')], clearAll })
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    fireEvent.click(screen.getByRole('menuitem', { name: '清空画布' }))

    await vi.waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('1 个元素'))
      expect(clearAll).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  it('does not prompt when clearing an empty canvas', () => {
    render(<ContextMenu x={20} y={30} onClose={onClose} />)
    fireEvent.click(screen.getByRole('menuitem', { name: '清空画布' }))

    expect(confirmMock).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('leaves the canvas unchanged when clearing is cancelled', async () => {
    const clearAll = vi.fn(() => true)
    confirmMock.mockResolvedValueOnce(false)
    useAppStore.setState({ elements: [makeShape('shape-1')], clearAll })
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    fireEvent.click(screen.getByRole('menuitem', { name: '清空画布' }))

    await vi.waitFor(() => expect(confirmMock).toHaveBeenCalledOnce())
    expect(clearAll).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
