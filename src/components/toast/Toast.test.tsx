import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToastContainer from './Toast'
import { useToastStore } from '../../store/toastStore'

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a toast message', () => {
    useToastStore.getState().show('Test message', 'success')
    render(<ToastContainer />)
    expect(screen.getByText('Test message')).toBeTruthy()
  })

  it('renders the correct icon for success type', () => {
    useToastStore.getState().show('Success!', 'success')
    render(<ToastContainer />)
    expect(screen.getByText('✓')).toBeTruthy()
  })

  it('renders the correct icon for error type', () => {
    useToastStore.getState().show('Error!', 'error')
    render(<ToastContainer />)
    expect(screen.getByText('✕')).toBeTruthy()
  })

  it('renders the correct icon for warning type', () => {
    useToastStore.getState().show('Warning!', 'warning')
    render(<ToastContainer />)
    expect(screen.getByText('⚠')).toBeTruthy()
  })

  it('renders the correct icon for info type', () => {
    useToastStore.getState().show('Info!', 'info')
    render(<ToastContainer />)
    expect(screen.getByText('ℹ')).toBeTruthy()
  })

  it('dismisses toast on click', () => {
    useToastStore.getState().show('Click me', 'info')
    render(<ToastContainer />)
    const toast = screen.getByText('Click me').closest('[role="status"]')!
    fireEvent.click(toast)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('renders multiple toasts', () => {
    useToastStore.getState().show('First', 'info')
    useToastStore.getState().show('Second', 'success')
    render(<ToastContainer />)
    expect(screen.getByText('First')).toBeTruthy()
    expect(screen.getByText('Second')).toBeTruthy()
  })

  it('has correct aria attributes', () => {
    useToastStore.getState().show('Test', 'info')
    render(<ToastContainer />)
    const container = screen.getByRole('alert')
    expect(container.getAttribute('aria-live')).toBe('polite')
  })
})
