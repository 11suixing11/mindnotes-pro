import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useDialogFocus } from './useDialogFocus'

function DialogHarness() {
  const [open, setOpen] = useState(false)
  const dialogRef = useDialogFocus<HTMLDivElement>({
    open,
    onClose: () => setOpen(false),
  })

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open && (
        <div ref={dialogRef} role="dialog" aria-label="Test dialog" tabIndex={-1}>
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      )}
    </>
  )
}

describe('useDialogFocus', () => {
  it('focuses the dialog, traps Tab, closes on Escape, and restores the trigger focus', async () => {
    render(<DialogHarness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Test dialog' })
    const first = screen.getByRole('button', { name: 'First action' })
    const last = screen.getByRole('button', { name: 'Last action' })
    await waitFor(() => expect(document.activeElement).toBe(first))

    last.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Test dialog' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(dialog).not.toBe(document.activeElement)
  })
})
