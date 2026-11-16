import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './AppWrapper'

function BrokenView(): never {
  throw new Error('sensitive raw exception details')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    delete window.mindnotes
    delete window.mindnotesScreen
    delete window.mindnotesFloating
  })

  it('shows stable recovery actions without exposing raw exception text', () => {
    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>
    )

    expect(screen.getByRole('heading', { name: '应用暂时无法显示' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '导出恢复备份' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '刷新页面' })).toBeTruthy()
    expect(screen.queryByText('sensitive raw exception details')).toBeNull()
  })

  it('exports the page-note library when the desktop view fails', () => {
    const exportNotes = vi.fn().mockResolvedValue('recovery.json')
    window.mindnotes = { isDesktop: true, exportNotes } as unknown as NonNullable<
      typeof window.mindnotes
    >
    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: '导出恢复备份' }))
    expect(exportNotes).toHaveBeenCalledWith('json', 'all')
  })

  it('releases screen input and stays transparent when the ink renderer fails', () => {
    const releasePointer = vi.fn()
    window.mindnotesScreen = { releasePointer } as unknown as NonNullable<
      typeof window.mindnotesScreen
    >
    const view = render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>
    )
    expect(releasePointer).toHaveBeenCalledOnce()
    expect(view.container.querySelector('.screen-ink-surface')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '导出恢复备份' })).toBeNull()
  })
})
