import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createShortcutExport, DEFAULT_SHORTCUT_BINDINGS } from '../../keyboard/shortcuts'
import { useShortcutStore } from '../../store/useShortcutStore'
import { KeyboardShortcutSettings } from './KeyboardShortcutSettings'

describe('KeyboardShortcutSettings', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    useShortcutStore.getState().resetShortcuts()
    onClose.mockClear()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<KeyboardShortcutSettings open={false} onClose={onClose} />)

    expect(container.textContent).toBe('')
  })

  it('captures and saves a custom shortcut', () => {
    render(<KeyboardShortcutSettings open={true} onClose={onClose} />)
    const penButton = screen.getByLabelText('设置画笔工具快捷键')

    fireEvent.click(penButton)
    fireEvent.keyDown(penButton, { key: 'p' })

    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual({ key: 'P' })
    expect(screen.getByText('画笔工具已设为 P。')).toBeTruthy()
  })

  it('shows a conflict when assigning a used shortcut', () => {
    render(<KeyboardShortcutSettings open={true} onClose={onClose} />)
    const penButton = screen.getByLabelText('设置画笔工具快捷键')

    fireEvent.click(penButton)
    fireEvent.keyDown(penButton, { key: '0' })

    expect(screen.getByText(/已被“选择工具”使用/)).toBeTruthy()
    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual(
      DEFAULT_SHORTCUT_BINDINGS['tool.pen']
    )
  })

  it('imports shortcut JSON from the textarea', () => {
    const json = createShortcutExport({
      ...DEFAULT_SHORTCUT_BINDINGS,
      'tool.pen': { key: 'P' },
    })
    render(<KeyboardShortcutSettings open={true} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('导入'), { target: { value: json } })
    fireEvent.click(screen.getByText('导入 JSON'))

    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual({ key: 'P' })
    expect(screen.getByText('快捷键已导入。')).toBeTruthy()
  })

  it('resets all shortcuts', () => {
    useShortcutStore.getState().setShortcut('tool.pen', { key: 'P' })
    render(<KeyboardShortcutSettings open={true} onClose={onClose} />)

    fireEvent.click(screen.getByText('全部重置'))

    expect(useShortcutStore.getState().bindings).toEqual(DEFAULT_SHORTCUT_BINDINGS)
    expect(screen.getByText('快捷键已恢复默认设置。')).toBeTruthy()
  })
})
