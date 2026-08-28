import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import FirstUseNotice from './FirstUseNotice'

describe('FirstUseNotice', () => {
  beforeEach(() => localStorage.clear())

  it('shows the local-only explanation once', () => {
    const view = render(<FirstUseNotice />)
    expect(screen.getByText(/不会自动同步到其他设备/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭本地保存说明' }))
    expect(screen.queryByText(/不会自动同步到其他设备/)).toBeNull()

    view.unmount()
    render(<FirstUseNotice />)
    expect(screen.queryByText(/不会自动同步到其他设备/)).toBeNull()
  })
})
