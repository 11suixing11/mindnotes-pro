import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import type { ShapeElement } from '../../store/types'
import { ContextMenu } from './ContextMenu'

const confirmMock = vi.hoisted(() => vi.fn(async () => true))

vi.mock('../confirm-modal', () => ({
  useConfirm: () => confirmMock,
}))

const defaultViewport = { width: window.innerWidth, height: window.innerHeight }

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  }
}

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

  afterEach(() => {
    vi.restoreAllMocks()
    setViewport(defaultViewport.width, defaultViewport.height)
  })

  it('shows only selection-independent actions without a selection', () => {
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    expect(screen.getByRole('menuitem', { name: /粘贴/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /全选/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: '清空画布' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /复制 Ctrl\+C/ })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /删除/ })).toBeNull()
  })

  it('uses existing theme tokens and clamps the measured menu to the viewport', async () => {
    setViewport(500, 400)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.classList.contains('context-menu')) return makeRect(0, 0, 240, 300)
      return makeRect(0, 0, 0, 0)
    })

    render(<ContextMenu x={490} y={390} onClose={onClose} />)
    const menu = screen.getByRole('menu', { name: '画布上下文菜单' })

    await waitFor(() => expect(menu.style.visibility).toBe('visible'))
    expect(menu.style.left).toBe('252px')
    expect(menu.style.top).toBe('92px')
    expect(menu.style.maxHeight).toBe('384px')
    expect(menu.style.overflowY).toBe('auto')
    expect(menu.style.background).toBe('var(--card-solid)')
    expect(menu.style.border).toContain('var(--border)')
    expect(menu.style.color).toBe('var(--text)')
  })

  it('flips a measured submenu left and makes an oversized submenu scrollable', async () => {
    setViewport(500, 400)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.classList.contains('context-menu')) return makeRect(20, 30, 200, 350)
      if (this.classList.contains('context-menu-submenu')) return makeRect(0, 0, 140, 600)
      if (this.getAttribute('aria-haspopup') === 'menu') return makeRect(450, 340, 40, 32)
      return makeRect(0, 0, 0, 0)
    })
    const shapes = [makeShape('one'), makeShape('two'), makeShape('three')]
    useAppStore.setState({ elements: shapes, selectedIds: shapes.map((shape) => shape.id) })
    render(<ContextMenu x={20} y={30} onClose={onClose} />)

    fireEvent.click(screen.getByRole('menuitem', { name: '对齐' }))
    const submenu = await screen.findByRole('menu', { name: '对齐选项' })

    await waitFor(() => expect(submenu.style.visibility).toBe('visible'))
    expect(submenu.dataset.placement).toBe('left')
    expect(submenu.style.left).toBe('314px')
    expect(submenu.style.top).toBe('8px')
    expect(submenu.style.maxHeight).toBe('384px')
    expect(submenu.style.overflowY).toBe('auto')
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
