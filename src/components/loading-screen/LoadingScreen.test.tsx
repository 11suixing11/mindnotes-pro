import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingScreen from './LoadingScreen'

describe('LoadingScreen', () => {
  it('renders the MindNotes Pro branding', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('MindNotes Pro')).toBeTruthy()
  })

  it('renders the M logo', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('M')).toBeTruthy()
  })

  it('announces the loading state', () => {
    render(<LoadingScreen />)
    expect(screen.getByRole('status', { name: '正在打开 MindNotes Pro' })).toBeTruthy()
  })

  it('renders loading dots', () => {
    const { container } = render(<LoadingScreen />)
    const dots = container.querySelectorAll('.loading-dots span')
    expect(dots).toHaveLength(3)
  })
})
