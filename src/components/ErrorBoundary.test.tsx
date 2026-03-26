import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('ErrorBoundary', () => {
  const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error')
    }
    return <div>Test Content</div>
  }

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders fallback when error occurs', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('⚠️ 出错了')).toBeInTheDocument()
    expect(screen.getByText('重试')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary onError={onError}>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('can retry after error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )

    expect(screen.getByText('⚠️ 出错了')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByText('重试'))

    rerender(
      <ErrorBoundary>
        <TestComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
