import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useAppStore } from './store/appStore'

vi.mock('./components/canvas', () => ({
  Canvas: () => <canvas id="main-canvas" tabIndex={0} />,
}))

vi.mock('./components/toolbar', () => ({
  Toolbar: () => null,
}))

vi.mock('./components/layers/LayersPanel', () => ({
  default: () => null,
}))

vi.mock('./components/toast', () => ({
  ToastContainer: () => null,
}))

vi.mock('./components/confirm-modal', () => ({
  ConfirmModal: () => null,
}))

vi.mock('./components/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => null,
  KeyboardShortcutSettings: () => null,
}))

vi.mock('./components/loading-screen', () => ({
  LoadingScreen: () => <div role="status">正在加载</div>,
}))

vi.mock('./components/app/AppStatusBar', () => ({
  AppStatusBar: () => null,
}))

vi.mock('./components/app/useAppLifecycle', () => ({
  useAppLifecycle: () => ({ canInstall: false, installApp: vi.fn() }),
}))

vi.mock('./components/app/FirstUseNotice', () => ({
  default: () => null,
}))

describe('App', () => {
  beforeEach(() => {
    useAppStore.setState({ loaded: true, bgColor: '#ffffff' })
  })

  it('exposes the whiteboard workspace as the named main landmark', () => {
    render(<App />)

    expect(screen.getByRole('main', { name: 'MindNotes Pro 画板' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'MindNotes Pro 画板' })).toBeTruthy()
  })
})
