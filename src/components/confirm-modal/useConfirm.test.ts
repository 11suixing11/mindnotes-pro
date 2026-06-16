import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConfirm, queue } from './useConfirm'

describe('useConfirm', () => {
  beforeEach(() => {
    queue.length = 0
  })

  it('returns a function', () => {
    const { result } = renderHook(() => useConfirm())
    expect(typeof result.current).toBe('function')
  })

  it('adds entry to queue when called', () => {
    const { result } = renderHook(() => useConfirm())
    act(() => {
      result.current('Are you sure?')
    })
    expect(queue).toHaveLength(1)
    expect(queue[0].options.message).toBe('Are you sure?')
  })

  it('dispatches app-confirm event for first entry', () => {
    const handler = vi.fn()
    window.addEventListener('app-confirm', handler)
    const { result } = renderHook(() => useConfirm())
    act(() => {
      result.current('Confirm?')
    })
    expect(handler).toHaveBeenCalled()
    window.removeEventListener('app-confirm', handler)
  })

  it('does not dispatch event for subsequent entries', () => {
    const handler = vi.fn()
    window.addEventListener('app-confirm', handler)
    const { result } = renderHook(() => useConfirm())
    act(() => {
      result.current('First')
      result.current('Second')
    })
    // Only dispatched once for the first entry
    expect(handler).toHaveBeenCalledTimes(1)
    expect(queue).toHaveLength(2)
    window.removeEventListener('app-confirm', handler)
  })

  it('resolves with boolean', async () => {
    const { result } = renderHook(() => useConfirm())
    let promise: Promise<boolean>
    act(() => {
      promise = result.current('Test')
    })
    // Resolve the queue entry
    queue[0].resolve(true)
    const value = await promise!
    expect(value).toBe(true)
  })

  it('passes custom options', () => {
    const { result } = renderHook(() => useConfirm())
    act(() => {
      result.current('Delete?', { confirmLabel: 'Yes', cancelLabel: 'No', danger: false })
    })
    expect(queue[0].options.confirmLabel).toBe('Yes')
    expect(queue[0].options.cancelLabel).toBe('No')
    expect(queue[0].options.danger).toBe(false)
  })
})
