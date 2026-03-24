import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import Root from './AppWrapper'
import { COMMAND_EXECUTION_ERROR_EVENT } from './core/commands/registry'

const mockShowWarning = vi.fn()
const mockShowError = vi.fn()
const mockSkipWaiting = vi.fn()

vi.mock('./App', () => ({
  default: () => <div>App</div>,
}))

vi.mock('./components/ui/LoadingScreen', () => ({
  default: ({ onLoad }: { onLoad: () => void }) => {
    const React = require('react') as typeof import('react')
    React.useEffect(() => {
      onLoad()
    }, [onLoad])
    return null
  },
}))

vi.mock('./components/ui/Toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    showWarning: mockShowWarning,
    showError: mockShowError,
  }),
}))

vi.mock('./components/ui/ErrorBoundary', () => ({
  ErrorBoundaryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ErrorFallback: () => <div>Error</div>,
  useErrorBoundary: () => ({
    hasError: false,
    error: null,
    resetError: vi.fn(),
  }),
}))

vi.mock('./hooks/useServiceWorker', () => ({
  useServiceWorker: () => ({
    updateAvailable: false,
    skipWaiting: mockSkipWaiting,
  }),
}))

describe('AppWrapper command error handling', () => {
  let mockNow = 0

  beforeEach(() => {
    mockNow = 0
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow)

    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    })

    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: class {
        onload: null | (() => void) = null
        onerror: null | (() => void) = null

        set src(_value: string) {
          this.onload?.()
        }
      },
    })

    mockShowWarning.mockClear()
    mockShowError.mockClear()
    mockSkipWaiting.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deduplicates command execution errors in a short window', async () => {
    render(<Root />)

    window.dispatchEvent(
      new CustomEvent(COMMAND_EXECUTION_ERROR_EVENT, {
        detail: {
          commandId: 'save-note',
          message: 'failed',
        },
      })
    )

    window.dispatchEvent(
      new CustomEvent(COMMAND_EXECUTION_ERROR_EVENT, {
        detail: {
          commandId: 'save-note',
          message: 'failed',
        },
      })
    )

    expect(mockShowError).toHaveBeenCalledTimes(1)

    mockNow = 2101

    window.dispatchEvent(
      new CustomEvent(COMMAND_EXECUTION_ERROR_EVENT, {
        detail: {
          commandId: 'save-note',
          message: 'failed',
        },
      })
    )

    expect(mockShowError).toHaveBeenCalledTimes(2)
  })

  it('provides shortcuts action that dispatches toggle event', async () => {
    render(<Root />)

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    window.dispatchEvent(
      new CustomEvent(COMMAND_EXECUTION_ERROR_EVENT, {
        detail: {
          commandId: 'undo',
          message: 'boom',
        },
      })
    )

    const action = mockShowError.mock.calls[0]?.[1]
    expect(action?.label).toBe('查看快捷键')

    action?.onClick()

    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent))

    const customEvents = dispatchSpy.mock.calls
      .map((call) => call[0])
      .filter((event): event is CustomEvent => event instanceof CustomEvent)

    expect(customEvents.some((event) => event.type === 'toggle-shortcuts')).toBe(true)

    dispatchSpy.mockRestore()
  })
})
