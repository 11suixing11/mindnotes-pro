import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingScreen from './LoadingScreen'

describe('LoadingScreen', () => {
  it('renders the MindNotes branding', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('MindNotes')).toBeTruthy()
  })

  it('renders the Pro text', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('Pro')).toBeTruthy()
  })

  it('renders the M logo', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('M')).toBeTruthy()
  })

  it('renders the branding text', () => {
    render(<LoadingScreen />)
    expect(screen.getByText('Local-first whiteboard')).toBeTruthy()
  })

  it('renders loading dots', () => {
    const { container } = render(<LoadingScreen />)
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots.length).toBeGreaterThanOrEqual(3)
  })
})
