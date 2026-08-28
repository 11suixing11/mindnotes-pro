import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './AppWrapper'

function BrokenView(): never {
  throw new Error('sensitive raw exception details')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
})
