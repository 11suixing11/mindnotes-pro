import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Tooltip from './Tooltip'

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children', () => {
    render(
      <Tooltip content="Test tip">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.getByText('Hover me')).toBeTruthy()
  })

  it('does not show tooltip initially', () => {
    render(
      <Tooltip content="Test tip">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.queryByText('Test tip')).toBeNull()
  })

  it('shows tooltip after delay on mouse enter', () => {
    render(
      <Tooltip content="Test tip">
        <button>Hover me</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByText('Hover me').parentElement!)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByText('Test tip')).toBeTruthy()
  })

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Test tip">
        <button>Hover me</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByText('Hover me').parentElement!)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByText('Test tip')).toBeTruthy()
    fireEvent.mouseLeave(screen.getByText('Hover me').parentElement!)
    expect(screen.queryByText('Test tip')).toBeNull()
  })

  it('shows shortcut key when provided', () => {
    render(
      <Tooltip content="Pen" shortcut="1">
        <button>Pen</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByText('Pen').parentElement!)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByText('1')).toBeTruthy()
  })

  it('does not show shortcut when not provided', () => {
    render(
      <Tooltip content="No shortcut">
        <button>Btn</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByText('Btn').parentElement!)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.queryByText('1')).toBeNull()
  })
})
