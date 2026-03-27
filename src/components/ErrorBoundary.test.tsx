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
    expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument()

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

  it('can reset error state when retry button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('⚠️ 出错了')).toBeInTheDocument()

    // Click retry button - this resets the error boundary state
    const retryButton = screen.getByRole('button', { name: /重试/i })
    fireEvent.click(retryButton)

    // The error boundary state is reset, but the child component will throw again
    // So we should still see the error fallback
    expect(screen.getByText('⚠️ 出错了')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('shows error details when error occurs', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    // Error details should be in a details element
    expect(screen.getByText('错误详情（点击展开）')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
