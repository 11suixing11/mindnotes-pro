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
