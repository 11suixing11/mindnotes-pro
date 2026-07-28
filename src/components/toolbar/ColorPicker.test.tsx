import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ColorPicker from './ColorPicker'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { COLOR_HISTORY_KEY } from '../../store/slices/toolSettings'
import { getTemplateBounds } from '../../templates/canvasTemplates'

// Mock useConfirm
vi.mock('../confirm-modal', () => ({
  useConfirm: () => vi.fn(async () => false),
}))

describe('ColorPicker', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      tool: 'pen',
      color: '#3A2E22',
      fillColor: 'transparent',
      size: 4,
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      colorHistory: [],
      elements: [],
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
    useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1 } })
  })

  it('renders color buttons', () => {
    render(<ColorPicker />)
    // 灰度色系
    expect(screen.getByLabelText('纯黑')).toBeTruthy()
    expect(screen.getByLabelText('深灰')).toBeTruthy()
    expect(screen.getByLabelText('中灰')).toBeTruthy()
    // 基础色系
    expect(screen.getByLabelText('红色')).toBeTruthy()
    expect(screen.getByLabelText('橙色')).toBeTruthy()
    expect(screen.getByLabelText('绿色')).toBeTruthy()
    expect(screen.getByLabelText('蓝色')).toBeTruthy()
    expect(screen.getByLabelText('紫色')).toBeTruthy()
    expect(screen.getByLabelText('棕色')).toBeTruthy()
    // 亮色系
    expect(screen.getByLabelText('亮红')).toBeTruthy()
    expect(screen.getByLabelText('亮黄')).toBeTruthy()
    expect(screen.getByLabelText('亮绿')).toBeTruthy()
    // 深色系
    expect(screen.getByLabelText('深红')).toBeTruthy()
    expect(screen.getByLabelText('深绿')).toBeTruthy()
    expect(screen.getByLabelText('深蓝')).toBeTruthy()
    expect(screen.getByLabelText('深紫')).toBeTruthy()
  })

  it('renders custom color button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('自定义颜色')).toBeTruthy()
  })

  it('renders size buttons', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('极细 2像素')).toBeTruthy()
    expect(screen.getByLabelText('细 4像素')).toBeTruthy()
    expect(screen.getByLabelText('中等 8像素')).toBeTruthy()
    expect(screen.getByLabelText('粗 16像素')).toBeTruthy()
  })

  it('renders background settings button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('背景设置')).toBeTruthy()
  })

  it('changes the document background style', () => {
    render(<ColorPicker />)
    fireEvent.click(screen.getByLabelText('背景设置'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /点阵/ }))
    expect(useAppStore.getState().backgroundStyle).toBe('dots')
  })

  it('renders image import button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('插入图片')).toBeTruthy()
  })

  it('renders template library button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('模板库')).toBeTruthy()
  })

  it('renders clear button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('清屏')).toBeTruthy()
  })

  it('renders fullscreen button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('全屏')).toBeTruthy()
  })

  it('highlights active color', () => {
    render(<ColorPicker />)
    const brownBtn = screen.getByLabelText('棕色')
    expect(brownBtn.className).toContain('on')
  })

  it('highlights active size', () => {
    render(<ColorPicker />)
    const sizeBtn = screen.getByLabelText('细 4像素')
    expect(sizeBtn.className).toContain('on')
  })

  it('shows fill controls for rectangle tool', () => {
    useAppStore.setState({ tool: 'rectangle' })
    render(<ColorPicker />)
    expect(screen.getByLabelText('无填充')).toBeTruthy()
    expect(screen.getByLabelText('填充色')).toBeTruthy()
  })

  it('shows fill controls for circle tool', () => {
    useAppStore.setState({ tool: 'circle' })
    render(<ColorPicker />)
    expect(screen.getByLabelText('无填充')).toBeTruthy()
  })

  it('hides fill controls for pen tool', () => {
    render(<ColorPicker />)
    expect(screen.queryByLabelText('无填充')).toBeNull()
    expect(screen.queryByLabelText('填充色')).toBeNull()
  })

  it('renders hidden file inputs', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('选择图片文件')).toBeTruthy()
    expect(screen.getByLabelText('选择颜色')).toBeTruthy()
    expect(screen.getByLabelText('选择填充颜色')).toBeTruthy()
    expect(screen.getByLabelText('选择背景颜色')).toBeTruthy()
  })

  it('shows color history when available', () => {
    useAppStore.setState({ colorHistory: ['#ff0000', '#00ff00'] })
    render(<ColorPicker />)
    expect(screen.getByLabelText('最近使用的颜色')).toBeTruthy()
    expect(screen.getByLabelText('最近颜色 #ff0000')).toBeTruthy()
    expect(screen.getByLabelText('最近颜色 #00ff00')).toBeTruthy()
  })

  it('hides color history when empty', () => {
    render(<ColorPicker />)
    expect(screen.queryByLabelText('最近使用的颜色')).toBeNull()
  })

  it('adds selected palette colors to recent colors and persists them', () => {
    render(<ColorPicker />)

    fireEvent.click(screen.getByLabelText('红色'))

    expect(screen.getByLabelText('最近使用的颜色')).toBeTruthy()
    expect(screen.getByLabelText('最近颜色 #E03131')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(COLOR_HISTORY_KEY) ?? '[]')).toEqual(['#E03131'])
  })

  it('opens the template picker and inserts a built-in template', () => {
    useViewStore.setState({ viewBox: { x: 100, y: 200, zoom: 2 } })
    render(<ColorPicker />)

    fireEvent.click(screen.getByLabelText('模板库'))
    fireEvent.click(screen.getByRole('button', { name: '插入 Flowchart 模板' }))

    const state = useAppStore.getState()
    expect(state.elements.length).toBeGreaterThan(0)
    expect(state.selectedIds).toEqual([])
    expect(state.undoStack[state.undoStack.length - 1]?.type).toBe('add')
  })

  it('uses the visible browser viewport instead of oversized canvas dimensions for insertion', () => {
    const canvas = document.createElement('canvas')
    canvas.id = 'main-canvas'
    canvas.width = 1040
    canvas.height = 7580
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 240,
      y: 0,
      left: 240,
      top: 0,
      right: 1280,
      bottom: 7580,
      width: 1040,
      height: 7580,
      toJSON: () => ({}),
    })
    document.body.appendChild(canvas)

    render(<ColorPicker />)

    fireEvent.click(screen.getByLabelText('模板库'))
    fireEvent.click(screen.getByRole('button', { name: '插入 Flowchart 模板' }))

    const bounds = getTemplateBounds(useAppStore.getState().elements)
    if (!bounds) throw new Error('Expected inserted template bounds')
    expect(bounds.x + bounds.w / 2).toBeCloseTo(632 - 240, 5)
    expect(bounds.y + bounds.h / 2).toBeCloseTo(768 / 2, 5)
  })
})
