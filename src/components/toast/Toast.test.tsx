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

  it('dismisses a toast only from its close button', () => {
    useToastStore.getState().show('Click me', 'info')
    render(<ToastContainer />)

    fireEvent.click(screen.getByText('Click me'))
    expect(useToastStore.getState().toasts).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '关闭通知：Click me' }))
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('renders multiple toasts', () => {
    useToastStore.getState().show('First', 'info')
    useToastStore.getState().show('Second', 'success')
    render(<ToastContainer />)
    expect(screen.getByText('First')).toBeTruthy()
    expect(screen.getByText('Second')).toBeTruthy()
  })

  it('uses one live-region role per message based on notification type', () => {
    useToastStore.getState().show('Info', 'info')
    useToastStore.getState().show('Success', 'success')
    useToastStore.getState().show('Warning', 'warning')
    useToastStore.getState().show('Error', 'error')
    render(<ToastContainer />)

    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(document.querySelector('[aria-live]')).toBeNull()
    for (const message of [...screen.getAllByRole('status'), ...screen.getAllByRole('alert')]) {
      expect(message.querySelector('[role="status"], [role="alert"]')).toBeNull()
    }
  })
})
