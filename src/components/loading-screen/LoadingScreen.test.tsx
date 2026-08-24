import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingScreen from './LoadingScreen'

describe('LoadingScreen', () => {
  it('announces loading without a visual splash', () => {
    render(<LoadingScreen />)
    const status = screen.getByRole('status', { name: '正在打开 MindNotes Pro' })
    expect(status.querySelector('.sr-only')?.textContent).toBe('正在打开 MindNotes Pro')
    expect(status.querySelector('.loading-logo')).toBeNull()
    expect(status.querySelector('.loading-dots')).toBeNull()
  })
})
