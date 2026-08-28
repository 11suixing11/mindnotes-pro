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

  it('renders canvas-level actions separately from color controls', () => {
    render(<CanvasActionButtons />)

    expect(screen.getByLabelText('背景设置')).toBeTruthy()
    expect(screen.getByLabelText('插入图片')).toBeTruthy()
    expect(screen.getByLabelText('进入全屏')).toBeTruthy()
  })

  it('updates the fullscreen action label and reports failed requests', async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    render(<CanvasActionButtons />)
    fireEvent.click(screen.getByLabelText('进入全屏'))

    await vi.waitFor(() => {
      expect(requestFullscreen).toHaveBeenCalledOnce()
      const toasts = useToastStore.getState().toasts
      expect(toasts[toasts.length - 1]?.message).toContain('全屏切换失败')
    })
  })

  it('changes the document background style', () => {
    render(<CanvasActionButtons />)

    fireEvent.click(screen.getByLabelText('背景设置'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /点阵/ }))

    expect(useAppStore.getState().backgroundStyle).toBe('dots')
  })

  it('renders hidden inputs for image import and custom background color', () => {
    render(<CanvasActionButtons />)

    expect(screen.getByLabelText('选择图片文件').getAttribute('tabindex')).toBe('-1')
    expect(screen.getByLabelText('选择背景颜色').getAttribute('tabindex')).toBe('-1')
  })
})
