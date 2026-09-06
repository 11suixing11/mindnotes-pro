import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import Toolbar from './Toolbar'
import { useAppStore } from '../../store/appStore'
import { createDefaultLayer } from '../../store/layers'
import type { CanvasElement } from '../../store/types'
import { useShortcutStore } from '../../store/useShortcutStore'
import { useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'
import { queue, type ConfirmOptions } from '../confirm-modal/useConfirm'

const layer = createDefaultLayer(1)

function shape(id: string, extra: Partial<CanvasElement> = {}): CanvasElement {
  return {
    type: 'shape',
    id,
    layerId: layer.id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#3A2E22',
    size: 4,
    ...extra,
  } as CanvasElement
}

function setSelection(elements: CanvasElement[], selectedIds: string[]) {
  useAppStore.setState({
    elements,
    selectedIds,
    idToElement: new Map(elements.map((element) => [element.id, element])),
    idToIndex: new Map(elements.map((element, index) => [element.id, index])),
  })
}

describe('Toolbar', () => {
  beforeEach(() => {
    localStorage.clear()
    queue.length = 0
    useShortcutStore.getState().resetShortcuts()
    useAppStore.setState({
      tool: 'pen',
      brush: 'pen',
      color: '#3A2E22',
      fillColor: 'transparent',
      size: 4,
      textDefaults: {
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
      },
      activeTextEditingId: null,
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      colorHistory: [],
      elements: [],
      layers: [layer],
      activeLayerId: layer.id,
      selectedIds: [],
      idToElement: new Map(),
      idToIndex: new Map(),
      undoStack: [],
      redoStack: [],
    })
    useViewStore.setState({
      viewBox: { x: 0, y: 0, zoom: 1 },
      showGrid: false,
      snapToGrid: false,
      gridSize: 20,
    })
    useThemeStore.setState({ isDarkMode: false })
  })

  it('keeps brand and file actions in fixed groups around the scrollable center', () => {
    render(<Toolbar />)
    const toolbar = screen.getByRole('toolbar', { name: '画布工具' })

    expect(within(toolbar).getByRole('group', { name: '品牌' })).toBeTruthy()
    expect(within(toolbar).getByRole('group', { name: '当前工具与选择' })).toBeTruthy()
    const tail = within(toolbar).getByRole('group', { name: '模板与文件' })
    expect(within(tail).getByRole('button', { name: '模板库' })).toBeTruthy()
    expect(within(tail).getByRole('button', { name: '插入图片' })).toBeTruthy()
    expect(within(tail).getByRole('button', { name: '画布更多' })).toBeTruthy()
    expect(within(tail).getByRole('button', { name: '文件' })).toBeTruthy()
  })

  it('shows creation styles for the active drawing tool', () => {
    render(<Toolbar />)
    const toolbar = screen.getByRole('toolbar', { name: '画布工具' })

    expect(within(toolbar).getByRole('button', { name: '画笔：钢笔' })).toBeTruthy()
    expect(within(toolbar).getByRole('button', { name: '颜色' })).toBeTruthy()
    expect(within(toolbar).getByRole('radiogroup', { name: '线宽' })).toBeTruthy()
  })

  it('atomically edits a selection and remembers the value for new elements', () => {
    setSelection([shape('shape-1')], ['shape-1'])
    render(<Toolbar />)
    const toolbar = screen.getByRole('toolbar', { name: '画布工具' })

    expect(within(toolbar).getByText('已选择 1 项', { selector: '.selection-count' })).toBeTruthy()
    fireEvent.click(within(toolbar).getByRole('radio', { name: '中等 8像素' }))

    expect(useAppStore.getState().elements[0]).toMatchObject({ id: 'shape-1', size: 8 })
    expect(useAppStore.getState().size).toBe(8)
    expect(useAppStore.getState().undoStack).toHaveLength(1)
  })

  it('shows only the common color for a text and shape selection', () => {
    const text: CanvasElement = {
      type: 'text',
      id: 'text-1',
      layerId: layer.id,
      x: 0,
      y: 0,
      width: 80,
      height: 30,
      content: 'Note',
      fontSize: 16,
      color: '#3A2E22',
    }
    setSelection([shape('shape-1'), text], ['shape-1', 'text-1'])
    render(<Toolbar />)
    const toolbar = screen.getByRole('toolbar', { name: '画布工具' })

    expect(within(toolbar).getByRole('button', { name: '颜色' })).toBeTruthy()
    expect(within(toolbar).queryByRole('radiogroup', { name: /线宽/ })).toBeNull()
    expect(within(toolbar).queryByRole('combobox', { name: /字号/ })).toBeNull()
  })

  it('keeps only copy and unlock for a locked selection', () => {
    setSelection([shape('shape-1', { locked: true })], ['shape-1'])
    render(<Toolbar />)
    const toolbar = screen.getByRole('toolbar', { name: '画布工具' })

    expect(within(toolbar).getByRole('button', { name: '复制' })).toBeTruthy()
    expect(within(toolbar).getByRole('button', { name: '解锁' })).toBeTruthy()
    expect(within(toolbar).queryByRole('button', { name: '颜色' })).toBeNull()
    expect(within(toolbar).queryByRole('button', { name: '排列' })).toBeNull()
    expect(within(toolbar).queryByRole('button', { name: '删除选中内容' })).toBeNull()
  })

  it('isolates the topbar while text is actively being edited', () => {
    setSelection([shape('shape-1')], ['shape-1'])
    useAppStore.setState({ activeTextEditingId: 'text-draft' })
    render(<Toolbar />)
    const toolbar = screen.getByRole('toolbar', { name: '画布工具' })

    expect(
      within(toolbar).getByText('正在编辑文字', { selector: '.toolbar-editing-status span' }),
    ).toBeTruthy()
    expect(within(toolbar).queryByRole('button', { name: '颜色' })).toBeNull()
    expect(within(toolbar).queryByRole('button', { name: '删除选中内容' })).toBeNull()
  })

  it('exposes grouping, alignment, distribution, and layer ordering in Arrange', () => {
    setSelection([shape('a'), shape('b'), shape('c')], ['a', 'b', 'c'])
    render(<Toolbar />)
    fireEvent.click(screen.getByRole('button', { name: '排列' }))

    const menu = screen.getByRole('menu', { name: '排列选中内容' })
    expect(within(menu).getByRole('menuitem', { name: '分组' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '左对齐' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '水平分布' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '置于顶层' })).toBeTruthy()
  })

  it('uses a clear localized confirmation before clearing the canvas', () => {
    setSelection([shape('clear-test-shape')], [])
    const details: ConfirmOptions[] = []
    const onConfirm = (event: Event) => {
      details.push((event as CustomEvent<ConfirmOptions>).detail)
    }
    window.addEventListener('app-confirm', onConfirm)

    render(<Toolbar />)
    fireEvent.click(screen.getByRole('button', { name: '清空画布' }))

    window.removeEventListener('app-confirm', onConfirm)
    expect(details[0]?.message).toContain('确定清空当前画布吗？')
  })

  it('offers install from the canvas More menu', () => {
    const onInstall = vi.fn()
    render(<Toolbar canInstall onInstall={onInstall} />)

    fireEvent.click(screen.getByRole('button', { name: '画布更多' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '安装 MindNotes Pro' }))

    expect(onInstall).toHaveBeenCalledOnce()
  })
})
