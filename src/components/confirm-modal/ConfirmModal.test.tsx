import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ConfirmModal from './ConfirmModal'
import { queue } from './useConfirm'

describe('ConfirmModal', () => {
  beforeEach(() => {
    queue.length = 0
  })

  it('renders nothing when no confirm is pending', () => {
    const { container } = render(<ConfirmModal />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows dialog when app-confirm event is dispatched', () => {
    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Are you sure?' },
        })
      )
    })
    expect(screen.getByText('Are you sure?')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('shows default button labels', () => {
    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Confirm?' },
        })
      )
    })
    expect(screen.getByText('取消')).toBeTruthy()
    expect(screen.getByText('确定')).toBeTruthy()
  })

  it('shows custom button labels', () => {
    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: {
            message: 'Delete?',
            confirmLabel: 'Yes',
            cancelLabel: 'No',
          },
        })
      )
    })
    expect(screen.getByText('Yes')).toBeTruthy()
    expect(screen.getByText('No')).toBeTruthy()
  })

  it('resolves with false when cancel is clicked', async () => {
    const resolve = vi.fn()
    queue.push({
      resolve,
      options: { message: 'Test' },
    })

    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Test' },
        })
      )
    })

    fireEvent.click(screen.getByLabelText('取消'))
    expect(resolve).toHaveBeenCalledWith(false)
  })

  it('resolves with true when confirm is clicked', async () => {
    const resolve = vi.fn()
    queue.push({
      resolve,
      options: { message: 'Test' },
    })

    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Test' },
        })
      )
    })

    fireEvent.click(screen.getByLabelText('确认'))
    expect(resolve).toHaveBeenCalledWith(true)
  })

  it('resolves with false when background is clicked', async () => {
    const resolve = vi.fn()
    queue.push({
      resolve,
      options: { message: 'Test' },
    })

    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Test' },
        })
      )
    })

    const bg = document.querySelector('.confirm-modal-bg')!
    fireEvent.click(bg)
    expect(resolve).toHaveBeenCalledWith(false)
  })

  it('applies danger class by default', () => {
    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Danger?' },
        })
      )
    })
    const confirmBtn = screen.getByLabelText('确认')
    expect(confirmBtn.className).toContain('btn-danger')
  })

  it('applies cancel class when danger is false', () => {
    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Safe?', danger: false },
        })
      )
    })
    const confirmBtn = screen.getByLabelText('确认')
    expect(confirmBtn.className).toContain('btn-cancel')
  })

  it('hides modal after closing', () => {
    const resolve = vi.fn()
    queue.push({
      resolve,
      options: { message: 'Gone' },
    })

    render(<ConfirmModal />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-confirm', {
          detail: { message: 'Gone' },
        })
      )
    })

    fireEvent.click(screen.getByLabelText('确认'))
    // After closing, the dialog should be gone
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
