import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundaryClass } from './ui/ErrorBoundary'
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
      <ErrorBoundaryClass>
        <TestComponent shouldThrow={false} />
      </ErrorBoundaryClass>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders fallback when error occurs', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundaryClass>
        <TestComponent shouldThrow={true} />
      </ErrorBoundaryClass>
    )

    expect(screen.getByText('出错了！')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundaryClass fallback={<div>Custom Error</div>}>
        <TestComponent shouldThrow={true} />
      </ErrorBoundaryClass>
    )

    expect(screen.getByText('Custom Error')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundaryClass onError={onError}>
        <TestComponent shouldThrow={true} />
      </ErrorBoundaryClass>
    )

    expect(onError).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('can reset error state when retry button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundaryClass>
        <TestComponent shouldThrow={true} />
      </ErrorBoundaryClass>
    )

    expect(screen.getByText('出错了！')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /重试/i })
    fireEvent.click(retryButton)

    expect(screen.getByText('出错了！')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
