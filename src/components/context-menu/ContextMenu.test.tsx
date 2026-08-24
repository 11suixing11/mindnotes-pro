import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import type { ShapeElement } from '../../store/types'
import { ContextMenu } from './ContextMenu'

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
    useAppStore.setState({
      elements: [],
      selectedIds: [],
      copySelected,
      paste,
      removeElements,
    })
  })

  it('shows only selection-independent actions without a selection', () => {
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    expect(screen.getByRole('button', { name: /粘贴/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /全选/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: '清空画布' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /复制 Ctrl\+C/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull()
  })

  it('cuts the current selection and closes the menu', () => {
    const shape = makeShape('shape-1')
    useAppStore.setState({ elements: [shape], selectedIds: [shape.id] })
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /剪切/ }))

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
})
