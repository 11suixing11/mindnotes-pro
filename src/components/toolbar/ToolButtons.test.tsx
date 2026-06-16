import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToolButtons from './ToolButtons'

describe('ToolButtons', () => {
  const setTool = vi.fn()

  it('renders all tool buttons', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    expect(screen.getByLabelText('Select tool (0)')).toBeTruthy()
    expect(screen.getByLabelText('Pen tool (1)')).toBeTruthy()
    expect(screen.getByLabelText('Eraser tool (2)')).toBeTruthy()
    expect(screen.getByLabelText('Pan tool (3)')).toBeTruthy()
    expect(screen.getByLabelText('Text tool (6)')).toBeTruthy()
  })

  it('renders all shape buttons', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    expect(screen.getByLabelText('Rectangle tool (4)')).toBeTruthy()
    expect(screen.getByLabelText('Circle tool (5)')).toBeTruthy()
    expect(screen.getByLabelText('Line tool (7)')).toBeTruthy()
    expect(screen.getByLabelText('Arrow tool (8)')).toBeTruthy()
  })

  it('highlights the active tool', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    const penBtn = screen.getByLabelText('Pen tool (1)')
    expect(penBtn.className).toContain('on')
  })

  it('does not highlight inactive tools', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    const eraserBtn = screen.getByLabelText('Eraser tool (2)')
    expect(eraserBtn.className).not.toContain('on')
  })

  it('calls setTool when a tool button is clicked', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    fireEvent.click(screen.getByLabelText('Eraser tool (2)'))
    expect(setTool).toHaveBeenCalledWith('eraser')
  })

  it('calls setTool for shape buttons', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    fireEvent.click(screen.getByLabelText('Rectangle tool (4)'))
    expect(setTool).toHaveBeenCalledWith('rectangle')
  })

  it('renders keyboard shortcut hints', () => {
    render(<ToolButtons tool="pen" setTool={setTool} />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('renders separators', () => {
    const { container } = render(<ToolButtons tool="pen" setTool={setTool} />)
    const separators = container.querySelectorAll('.sb-sep')
    expect(separators.length).toBeGreaterThan(0)
  })
})
