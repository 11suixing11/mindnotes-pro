import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToolButtons from './ToolButtons'
import { useShortcutStore } from '../../store/useShortcutStore'

describe('ToolButtons', () => {
  const setTool = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    useShortcutStore.getState().resetShortcuts()
    setTool.mockClear()
  })

  it('renders all tool buttons', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    expect(screen.getByLabelText('选择工具（0）')).toBeTruthy()
    expect(screen.getByLabelText('画笔工具（1）')).toBeTruthy()
    expect(screen.getByLabelText('橡皮擦工具（2）')).toBeTruthy()
    expect(screen.getByLabelText('平移工具（3）')).toBeTruthy()
    expect(screen.getByLabelText('文字工具（6）')).toBeTruthy()
  })

  it('renders all shape buttons', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    expect(screen.getByLabelText('矩形工具（4）')).toBeTruthy()
    expect(screen.getByLabelText('圆形工具（5）')).toBeTruthy()
    expect(screen.getByLabelText('直线工具（7）')).toBeTruthy()
    expect(screen.getByLabelText('箭头工具（8）')).toBeTruthy()
  })

  it('highlights the active tool', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    const penBtn = screen.getByLabelText('画笔工具（1）')
    expect(penBtn.className).toContain('on')
  })

  it('does not highlight inactive tools', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    const eraserBtn = screen.getByLabelText('橡皮擦工具（2）')
    expect(eraserBtn.className).not.toContain('on')
  })

  it('calls setTool when a tool button is clicked', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    fireEvent.click(screen.getByLabelText('橡皮擦工具（2）'))
    expect(setTool).toHaveBeenCalledWith('eraser')
  })

  it('calls setTool for shape buttons', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    fireEvent.click(screen.getByLabelText('矩形工具（4）'))
    expect(setTool).toHaveBeenCalledWith('rectangle')
  })

  it('renders keyboard shortcut hints', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('renders customized shortcut hints', () => {
    useShortcutStore.getState().setShortcut('tool.pen', { key: 'P' })

    render(<ToolButtons tool="pen" setTool={setTool} />)

    expect(screen.getByLabelText('画笔工具（P）')).toBeTruthy()
    expect(screen.getByText('P')).toBeTruthy()
  })

  it('renders separators', () => {
    const { container } = render(<ToolButtons tool="pen" setTool={setTool} />)
    const separators = container.querySelectorAll('.sb-sep')
    expect(separators.length).toBeGreaterThan(0)
  })
})
