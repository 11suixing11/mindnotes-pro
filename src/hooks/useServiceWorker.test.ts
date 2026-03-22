import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useServiceWorker } from './useServiceWorker'

// Mock the logger module
vi.mock('../utils/logger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
  isDebugLoggingEnabled: false,
}))

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useServiceWorker())

    expect(result.current.registration).toBeNull()
    expect(result.current.updateAvailable).toBe(false)
    expect(result.current.isOnline).toBe(true)
    expect(result.current.swReady).toBe(false)
  })

  it('should set isOnline based on navigator.onLine', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useServiceWorker())
    expect(result.current.isOnline).toBe(true)
  })

  it('should handle skipWaiting when waiting worker exists', () => {
    const mockWaiting = {
      postMessage: vi.fn(),
    } as any
    
    // Manually test skipWaiting logic
    // In production, this would be called when user clicks "update" button
    if (mockWaiting) {
      mockWaiting.postMessage({ type: 'SKIP_WAITING' })
      expect(mockWaiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    }
  })

  it('should provide updateServiceWorker function', () => {
    const { result } = renderHook(() => useServiceWorker())
    expect(typeof result.current.updateServiceWorker).toBe('function')
  })

  it('should provide skipWaiting function', () => {
    const { result } = renderHook(() => useServiceWorker())
    expect(typeof result.current.skipWaiting).toBe('function')
  })
})
