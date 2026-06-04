import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToastStore } from './toastStore'

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([])
  })

  it('should show a toast', () => {
    useToastStore.getState().show('Test message')
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Test message')
    expect(toasts[0].type).toBe('info')
  })

  it('should show a toast with custom type', () => {
    useToastStore.getState().show('Error!', 'error')
    expect(useToastStore.getState().toasts[0].type).toBe('error')
  })

  it('should show a toast with custom duration', () => {
    useToastStore.getState().show('Warning', 'warning', 5000)
    expect(useToastStore.getState().toasts[0].duration).toBe(5000)
  })

  it('should auto-dismiss after duration', () => {
    useToastStore.getState().show('Test', 'info', 1000)
    expect(useToastStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('should dismiss a specific toast', () => {
    useToastStore.getState().show('First')
    useToastStore.getState().show('Second')
    expect(useToastStore.getState().toasts).toHaveLength(2)

    const firstId = useToastStore.getState().toasts[0].id
    useToastStore.getState().dismiss(firstId)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('Second')
  })

  it('should generate unique IDs for toasts', () => {
    useToastStore.getState().show('A')
    useToastStore.getState().show('B')
    const ids = useToastStore.getState().toasts.map((t) => t.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('should support all toast types', () => {
    const types = ['info', 'success', 'error', 'warning'] as const
    types.forEach((type) => {
      useToastStore.getState().show(type, type)
    })
    expect(useToastStore.getState().toasts).toHaveLength(4)
    types.forEach((type, i) => {
      expect(useToastStore.getState().toasts[i].type).toBe(type)
    })
  })
})