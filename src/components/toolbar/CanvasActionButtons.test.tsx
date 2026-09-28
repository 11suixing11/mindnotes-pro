import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CanvasActionButtons from './CanvasActionButtons'
import { useAppStore } from '../../store/appStore'
import { useToastStore } from '../../store/toastStore'

describe('CanvasActionButtons', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      elements: [],
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
    useToastStore.setState({ toasts: [] })
  })

  it('keeps image insertion visible and moves low-frequency controls into More', () => {
    render(<CanvasActionButtons />)

    expect(screen.getByLabelText('插入图片')).toBeTruthy()
    expect(screen.getByLabelText('画布更多')).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: '进入全屏' })).toBeNull()

    fireEvent.click(screen.getByLabelText('画布更多'))
    expect(screen.getByRole('menuitem', { name: '进入全屏' })).toBeTruthy()
    expect(screen.getByRole('menuitemcheckbox', { name: '显示网格' })).toBeTruthy()
  })

  it('updates the fullscreen action label and reports failed requests', async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    render(<CanvasActionButtons />)
    fireEvent.click(screen.getByLabelText('画布更多'))
    fireEvent.click(screen.getByRole('menuitem', { name: '进入全屏' }))

    await vi.waitFor(() => {
      expect(requestFullscreen).toHaveBeenCalledOnce()
      const toasts = useToastStore.getState().toasts
      expect(toasts[toasts.length - 1]?.message).toContain('全屏切换失败')
    })
  })

  it('changes the document background style', () => {
    render(<CanvasActionButtons />)

    fireEvent.click(screen.getByLabelText('画布更多'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /点阵/ }))

    expect(useAppStore.getState().backgroundStyle).toBe('dots')
  })

  it('offers background image import and removal in the More menu', () => {
    useAppStore.setState({
      backgroundImage: {
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        fit: 'cover',
        x: 0,
        y: 0,
        width: 100,
        height: 80,
      },
    })
    render(<CanvasActionButtons />)

    fireEvent.click(screen.getByLabelText('画布更多'))
    expect(screen.getByRole('menuitem', { name: '导入背景图片…' })).toBeTruthy()
    expect(screen.getByRole('menuitemradio', { name: '铺满当前视图' })).toBeTruthy()
    expect(screen.getByRole('menuitemradio', { name: '平铺' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: '移除背景图片' })).toBeTruthy()

    fireEvent.click(screen.getByRole('menuitem', { name: '移除背景图片' }))
    expect(useAppStore.getState().backgroundImage).toBeUndefined()
    // 移除后菜单关闭，相关菜单项不再渲染
    expect(screen.queryByRole('menuitem', { name: '移除背景图片' })).toBeNull()
  })

  it('hides placement and removal controls until a background image exists', () => {
    render(<CanvasActionButtons />)

    fireEvent.click(screen.getByLabelText('画布更多'))
    expect(screen.getByRole('menuitem', { name: '导入背景图片…' })).toBeTruthy()
    expect(screen.queryByRole('menuitemradio', { name: '铺满当前视图' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: '移除背景图片' })).toBeNull()
  })

  it('renders a hidden file input for background image import', () => {
    render(<CanvasActionButtons />)
    expect(screen.getByLabelText('选择背景图片文件')).toBeTruthy()
  })

  it('renders hidden inputs for image import and custom background color', () => {
    render(<CanvasActionButtons />)

    const imageInput = screen.getByLabelText('选择图片文件')
    const backgroundInput = screen.getByLabelText('选择背景颜色')
    expect(imageInput.getAttribute('tabindex')).toBe('-1')
    expect(imageInput.getAttribute('aria-hidden')).toBe('true')
    expect(backgroundInput.getAttribute('tabindex')).toBe('-1')
    expect(backgroundInput.getAttribute('aria-hidden')).toBe('true')
  })
})
