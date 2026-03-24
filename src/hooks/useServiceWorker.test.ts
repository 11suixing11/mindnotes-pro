import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useServiceWorker } from './useServiceWorker'
import { debugError, debugLog } from '../utils/logger'

// Mock the logger module
vi.mock('../utils/logger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
  isDebugLoggingEnabled: false,
}))

describe('useServiceWorker', () => {
  type Listener = () => void

  const createEventTarget = () => {
    const listeners = new Map<string, Set<Listener>>()
    return {
      addEventListener: vi.fn((event: string, cb: Listener) => {
        const set = listeners.get(event) ?? new Set<Listener>()
        set.add(cb)
        listeners.set(event, set)
      }),
      removeEventListener: vi.fn((event: string, cb: Listener) => {
        listeners.get(event)?.delete(cb)
      }),
      dispatch: (event: string) => {
        for (const cb of listeners.get(event) ?? []) {
          cb()
        }
      },
    }
  }

  const setupServiceWorker = ({
    hasActive = true,
    hasController = true,
  }: { hasActive?: boolean; hasController?: boolean } = {}) => {
    const workerEvents = createEventTarget()
    const registrationEvents = createEventTarget()

    const waiting = { postMessage: vi.fn() }
    const installing = {
      state: 'installing',
      ...workerEvents,
    } as any

    const registration = {
      scope: '/',
      active: hasActive ? ({} as ServiceWorker) : null,
      waiting,
      installing,
      update: vi.fn().mockResolvedValue(undefined),
      ...registrationEvents,
    } as any

    const controllerChange = createEventTarget()
    const serviceWorker = {
      register: vi.fn().mockResolvedValue(registration),
      controller: hasController ? ({} as ServiceWorker) : null,
      ...controllerChange,
    } as any

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: serviceWorker,
      configurable: true,
    })

    return {
      registration,
      serviceWorker,
      waiting,
      installing,
      dispatchRegistrationEvent: registrationEvents.dispatch,
      dispatchWorkerEvent: workerEvents.dispatch,
      dispatchControllerChange: controllerChange.dispatch,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('PROD', true)
    vi.stubEnv('MODE', 'test')
    vi.stubEnv('BASE_URL', '/')

    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should initialize with expected state after registration', async () => {
    setupServiceWorker()
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    expect(result.current.registration).not.toBeNull()
    expect(result.current.updateAvailable).toBe(false)
    expect(result.current.isOnline).toBe(true)
    expect(result.current.swReady).toBe(true)
  })

  it('should set isOnline based on navigator.onLine', async () => {
    setupServiceWorker()

    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    expect(result.current.isOnline).toBe(true)
  })

  it('should register service worker and expose ready state', async () => {
    const { serviceWorker } = setupServiceWorker({ hasActive: true })
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      type: 'module',
    })
    expect(result.current.swReady).toBe(true)
    expect(debugLog).toHaveBeenCalled()
  })

  it('should provide updateServiceWorker function', async () => {
    const { registration } = setupServiceWorker()
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    await act(async () => {
      await result.current.updateServiceWorker()
    })

    expect(typeof result.current.updateServiceWorker).toBe('function')
    expect(registration.update).toHaveBeenCalled()
  })

  it('should provide skipWaiting function', async () => {
    const { waiting } = setupServiceWorker()
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    act(() => {
      result.current.skipWaiting()
    })

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(typeof result.current.skipWaiting).toBe('function')
  })

  it('should mark update as available when installing worker is installed', async () => {
    const { installing, dispatchRegistrationEvent, dispatchWorkerEvent } = setupServiceWorker({
      hasController: true,
    })
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    act(() => {
      dispatchRegistrationEvent('updatefound')
      installing.state = 'installed'
      dispatchWorkerEvent('statechange')
    })

    expect(result.current.updateAvailable).toBe(true)
  })

  it('should handle online and offline events', async () => {
    setupServiceWorker()
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.isOnline).toBe(true)
  })

  it('should log registration errors', async () => {
    const serviceWorker = {
      register: vi.fn().mockRejectedValue(new Error('register failed')),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      controller: null,
    }

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: serviceWorker,
      configurable: true,
    })

    renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(debugError).toHaveBeenCalled()
    })
  })

  it('should log update errors when update fails', async () => {
    const { registration } = setupServiceWorker()
    registration.update.mockRejectedValueOnce(new Error('update failed'))
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })

    await act(async () => {
      await result.current.updateServiceWorker()
    })

    expect(debugError).toHaveBeenCalled()
  })
})
