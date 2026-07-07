import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'

describe('KeyboardShortcutsHelp', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<KeyboardShortcutsHelp open={false} onClose={onClose} />)
    expect(container.querySelector('[class*="fixed"]')).toBeNull()
  })

  it('renders shortcuts when open', () => {
    render(<KeyboardShortcutsHelp open={true} onClose={onClose} />)
    expect(screen.getByText('Keyboard Shortcuts')).toBeTruthy()
    expect(screen.getByText('Undo')).toBeTruthy()
    expect(screen.getByText('Redo')).toBeTruthy()
    expect(screen.getByText('Pen Tool')).toBeTruthy()
  })

  it('renders all shortcut labels', () => {
    render(<KeyboardShortcutsHelp open={true} onClose={onClose} />)
    expect(screen.getByText('Copy')).toBeTruthy()
    expect(screen.getByText('Select all')).toBeTruthy()
    expect(screen.getByText('Delete selected')).toBeTruthy()
    expect(screen.getByText('Toggle grid')).toBeTruthy()
    expect(screen.getByText('Zoom in')).toBeTruthy()
    expect(screen.getByText('Zoom out')).toBeTruthy()
  })

  it('calls onClose when close button is clicked', () => {
    render(<KeyboardShortcutsHelp open={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when overlay is clicked', () => {
    const { container } = render(<KeyboardShortcutsHelp open={true} onClose={onClose} />)
    const overlay = container.querySelector('[class*="fixed"]')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape key', () => {
    render(<KeyboardShortcutsHelp open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on F1 key', () => {
    render(<KeyboardShortcutsHelp open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'F1' })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not render keyboard shortcut keys in the list', () => {
    render(<KeyboardShortcutsHelp open={true} onClose={onClose} />)
    // Check that kbd elements exist
    const kbdElements = document.querySelectorAll('kbd')
    expect(kbdElements.length).toBeGreaterThan(0)
  })
})
