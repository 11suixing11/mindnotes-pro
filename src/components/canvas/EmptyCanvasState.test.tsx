import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OPEN_FILE_EVENT, type OpenFileEventDetail } from '../../appEvents'
import { useAppStore } from '../../store/appStore'
import EmptyCanvasState from './EmptyCanvasState'

describe('EmptyCanvasState', () => {
  beforeEach(() => {
    useAppStore.setState({ elements: [], tool: 'select' })
  })

  it('requests the shared import entry point once with import intent', () => {
    const listener = vi.fn()
    window.addEventListener(OPEN_FILE_EVENT, listener)

    render(<EmptyCanvasState />)
    fireEvent.click(screen.getByRole('button', { name: '导入备份' }))

    expect(listener).toHaveBeenCalledOnce()
    const event = listener.mock.calls[0][0] as CustomEvent<OpenFileEventDetail>
    expect(event.detail).toEqual({ intent: 'import' })
    window.removeEventListener(OPEN_FILE_EVENT, listener)
  })
})
