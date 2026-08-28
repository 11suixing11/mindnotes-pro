import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useAppStore } from '../../store/appStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useViewStore } from '../../store/useViewStore'
import MobileToolbar from './MobileToolbar'

describe('MobileToolbar', () => {
  beforeEach(() => {
    useAppStore.setState({
      tool: 'pen',
      elements: [],
      selectedIds: [],
      undoStack: [],
      redoStack: [],
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
    })
    useViewStore.setState({
      viewBox: { x: 0, y: 0, zoom: 1 },
      showGrid: false,
      snapToGrid: false,
      gridSize: 20,
    })
    useThemeStore.setState({ isDarkMode: false })
  })

  it('keeps the eight core phone actions directly available', () => {
    render(<MobileToolbar />)

    const toolbar = screen.getByRole('navigation', { name: '移动绘图工具' })
    for (const label of ['选择', '画笔', '橡皮擦', '文字', '撤销', '重做', '文件', '更多工具']) {
      expect(within(toolbar).getByRole('button', { name: label })).toBeTruthy()
    }

    fireEvent.click(within(toolbar).getByRole('button', { name: '文字' }))
    expect(useAppStore.getState().tool).toBe('text')
  })

  it('exposes shapes and secondary view controls in the more sheet', () => {
    render(<MobileToolbar />)
    fireEvent.click(screen.getByRole('button', { name: '更多工具' }))

    const dialog = screen.getByRole('dialog', { name: '更多工具' })
    fireEvent.click(within(dialog).getByRole('button', { name: '矩形' }))
    expect(useAppStore.getState().tool).toBe('rectangle')

    fireEvent.click(within(dialog).getByRole('button', { name: '显示网格' }))
    expect(useViewStore.getState().showGrid).toBe(true)

    fireEvent.click(within(dialog).getByRole('button', { name: '网格大小 20 px' }))
    expect(useViewStore.getState().gridSize).toBe(40)
  })

  it('provides a keyboard-reachable custom background color trigger', () => {
    render(<MobileToolbar />)
    fireEvent.click(screen.getByRole('button', { name: '更多工具' }))

    const trigger = screen.getByRole('button', { name: '自定义背景色' })
    const input = screen.getByLabelText('自定义背景色输入')
    expect(trigger.getAttribute('type')).toBe('button')
    expect(input.getAttribute('tabindex')).toBe('-1')
  })

  it('opens the native color picker from Enter and Space', () => {
    render(<MobileToolbar />)
    fireEvent.click(screen.getByRole('button', { name: '更多工具' }))

    const trigger = screen.getByRole('button', { name: '自定义背景色' })
    const input = screen.getByLabelText('自定义背景色输入') as HTMLInputElement
    const click = vi.spyOn(input, 'click')

    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.keyDown(trigger, { key: ' ' })

    expect(click).toHaveBeenCalledTimes(2)
  })

  it('closes the more sheet with Escape', () => {
    render(<MobileToolbar />)
    fireEvent.click(screen.getByRole('button', { name: '更多工具' }))

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '更多工具' })).toBeNull()
  })
})
