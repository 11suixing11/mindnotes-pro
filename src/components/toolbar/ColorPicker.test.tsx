import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ColorPicker from './ColorPicker'
import { useAppStore } from '../../store/appStore'

// Mock useConfirm
vi.mock('../confirm-modal', () => ({
  useConfirm: () => vi.fn(async () => false),
}))

describe('ColorPicker', () => {
  beforeEach(() => {
    useAppStore.setState({
      tool: 'pen',
      color: '#3A2E22',
      fillColor: 'transparent',
      size: 4,
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      colorHistory: [],
      elements: [],
    })
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

  it('renders background color button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('背景色')).toBeTruthy()
  })

  it('changes the document background style', () => {
    render(<ColorPicker />)
    fireEvent.click(screen.getByLabelText('背景色'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /点阵/ }))
    expect(useAppStore.getState().backgroundStyle).toBe('dots')
  })

  it('renders image import button', () => {
    render(<ColorPicker />)
    expect(screen.getByLabelText('插入图片')).toBeTruthy()
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
})
