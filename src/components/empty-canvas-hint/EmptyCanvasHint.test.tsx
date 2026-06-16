import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyCanvasHint from './EmptyCanvasHint'
import { useAppStore } from '../../store/appStore'

describe('EmptyCanvasHint', () => {
  beforeEach(() => {
    useAppStore.setState({ elements: [] })
  })

  it('shows hint when canvas is empty', () => {
    render(<EmptyCanvasHint />)
    expect(screen.getByText('Start drawing!')).toBeTruthy()
  })

  it('renders keyboard shortcut hint', () => {
    render(<EmptyCanvasHint />)
    expect(screen.getByText('?')).toBeTruthy()
  })

  it('hides hint when canvas has elements', () => {
    useAppStore.setState({
      elements: [
        { type: 'stroke', id: 's1', points: [[0, 0]], color: '#000', size: 2, brush: 'pen' },
      ],
    })
    const { container } = render(<EmptyCanvasHint />)
    expect(container.firstChild).toBeNull()
  })
})
