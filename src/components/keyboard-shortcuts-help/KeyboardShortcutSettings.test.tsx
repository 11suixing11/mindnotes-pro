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
    const penButton = screen.getByLabelText('Set shortcut for Pen tool')

    fireEvent.click(penButton)
    fireEvent.keyDown(penButton, { key: 'p' })

    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual({ key: 'P' })
    expect(screen.getByText('Pen tool set to P.')).toBeTruthy()
  })

  it('shows a conflict when assigning a used shortcut', () => {
    render(<KeyboardShortcutSettings open={true} onClose={onClose} />)
    const penButton = screen.getByLabelText('Set shortcut for Pen tool')

    fireEvent.click(penButton)
    fireEvent.keyDown(penButton, { key: '0' })

    expect(screen.getByText(/already used by Select tool/i)).toBeTruthy()
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

    fireEvent.change(screen.getByLabelText('Import'), { target: { value: json } })
    fireEvent.click(screen.getByText('Import JSON'))

    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual({ key: 'P' })
    expect(screen.getByText('Shortcuts imported.')).toBeTruthy()
  })

  it('resets all shortcuts', () => {
    useShortcutStore.getState().setShortcut('tool.pen', { key: 'P' })
    render(<KeyboardShortcutSettings open={true} onClose={onClose} />)

    fireEvent.click(screen.getByText('Reset All'))

    expect(useShortcutStore.getState().bindings).toEqual(DEFAULT_SHORTCUT_BINDINGS)
    expect(screen.getByText('Shortcuts reset to defaults.')).toBeTruthy()
  })
})
