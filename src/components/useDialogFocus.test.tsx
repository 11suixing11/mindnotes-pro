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

function NestedDialogHarness() {
  const [parentOpen, setParentOpen] = useState(false)
  const [childOpen, setChildOpen] = useState(false)
  const parentRef = useDialogFocus<HTMLDivElement>({
    open: parentOpen,
    onClose: () => setParentOpen(false),
  })
  const childRef = useDialogFocus<HTMLDivElement>({
    open: childOpen,
    onClose: () => setChildOpen(false),
  })

  return (
    <>
      <button type="button" onClick={() => setParentOpen(true)}>
        Open parent
      </button>
      {parentOpen && (
        <div ref={parentRef} role="dialog" aria-label="Parent dialog" tabIndex={-1}>
          <button type="button" onClick={() => setChildOpen(true)}>
            Open child
          </button>
          <button type="button">Parent last</button>
        </div>
      )}
      {childOpen && (
        <div ref={childRef} role="dialog" aria-label="Child dialog" tabIndex={-1}>
          <button type="button">Child first</button>
          <button type="button">Child last</button>
        </div>
      )}
    </>
  )
}

function MenuHarness() {
  const [open, setOpen] = useState(false)
  const menuRef = useDialogFocus<HTMLDivElement>({ open, onClose: () => setOpen(false) })

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>
      {open && (
        <div ref={menuRef} role="menu" aria-label="Test menu" tabIndex={-1}>
          <button type="button" role="menuitem">
            First item
          </button>
          <button type="button" role="menuitemradio" aria-checked="false">
            Middle item
          </button>
          <button type="button" role="menuitem">
            Last item
          </button>
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

  it('keeps the parent focus scope suspended while a child dialog is open', async () => {
    render(<NestedDialogHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open parent' }))
    const childTrigger = screen.getByRole('button', { name: 'Open child' })
    await waitFor(() => expect(document.activeElement).toBe(childTrigger))

    fireEvent.click(childTrigger)
    const childFirst = screen.getByRole('button', { name: 'Child first' })
    const childLast = screen.getByRole('button', { name: 'Child last' })
    await waitFor(() => expect(document.activeElement).toBe(childFirst))

    childLast.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(childFirst)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Child dialog' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Parent dialog' })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(childTrigger))
  })

  it('supports arrow, Home, and End navigation for menu roles', async () => {
    render(<MenuHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const first = screen.getByRole('menuitem', { name: 'First item' })
    const middle = screen.getByRole('menuitemradio', { name: 'Middle item' })
    const last = screen.getByRole('menuitem', { name: 'Last item' })
    await waitFor(() => expect(document.activeElement).toBe(first))

    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(middle)
    fireEvent.keyDown(window, { key: 'End' })
    expect(document.activeElement).toBe(last)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(window, { key: 'Home' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(last)
  })
})
