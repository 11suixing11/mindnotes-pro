import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BrushSelector from './BrushSelector'

describe('BrushSelector', () => {
  const setBrush = vi.fn()

  it('renders nothing when tool is not pen', () => {
    const { container } = render(<BrushSelector brush="pen" setBrush={setBrush} tool="eraser" />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('renders brush selector when tool is pen', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    expect(screen.getByText('钢笔')).toBeTruthy()
  })

  it('shows current brush label', () => {
    render(<BrushSelector brush="highlighter" setBrush={setBrush} tool="pen" />)
    expect(screen.getByText('荧光笔')).toBeTruthy()
  })

  it('opens dropdown on click', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    fireEvent.click(screen.getByText('钢笔').closest('button')!)
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('shows all brush options in dropdown', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    fireEvent.click(screen.getByText('钢笔').closest('button')!)
    expect(screen.getAllByText('钢笔').length).toBeGreaterThan(0)
    expect(screen.getByText('荧光笔')).toBeTruthy()
    expect(screen.getByText('铅笔')).toBeTruthy()
    expect(screen.getByText('书法笔')).toBeTruthy()
    expect(screen.getByText('马克笔')).toBeTruthy()
    expect(screen.getByText('水彩笔')).toBeTruthy()
    expect(screen.getByText('蜡笔')).toBeTruthy()
    expect(screen.getByText('虚线笔')).toBeTruthy()
    expect(screen.getByText('彩虹笔')).toBeTruthy()
  })

  it('calls setBrush when a brush is selected', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    fireEvent.click(screen.getByText('钢笔').closest('button')!)
    fireEvent.click(screen.getByText('荧光笔').closest('[role="menuitem"]')!)
    expect(setBrush).toHaveBeenCalledWith('highlighter')
  })

  it('calls setBrush for new brush types', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    fireEvent.click(screen.getByText('钢笔').closest('button')!)
    fireEvent.click(screen.getByText('水彩笔').closest('[role="menuitem"]')!)
    expect(setBrush).toHaveBeenCalledWith('watercolor')
  })

  it('shows check mark for current brush', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    fireEvent.click(screen.getByText('钢笔').closest('button')!)
    expect(screen.getByText('✓')).toBeTruthy()
  })

  it('closes dropdown on overlay click', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    fireEvent.click(screen.getByText('钢笔').closest('button')!)
    expect(screen.getByRole('menu')).toBeTruthy()
    // Click the overlay
    const overlay = document.querySelector('.fixed.inset-0')!
    fireEvent.click(overlay)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('renders arrow indicator', () => {
    render(<BrushSelector brush="pen" setBrush={setBrush} tool="pen" />)
    expect(screen.getByText('▾')).toBeTruthy()
  })
})
