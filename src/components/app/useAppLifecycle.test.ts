import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import { useShortcutStore } from '../../store/useShortcutStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useAppLifecycle } from './useAppLifecycle'

describe('useAppLifecycle', () => {
  beforeEach(() => {
    useShortcutStore.getState().resetShortcuts()
    useThemeStore.setState({ initTheme: vi.fn() })
    useAppStore.setState({
      init: vi.fn(async () => undefined),
      saveNow: vi.fn(async () => undefined),
    })
  })

  it('initializes theme and documents, then saves on beforeunload', () => {
    const initTheme = useThemeStore.getState().initTheme
    const init = useAppStore.getState().init
    const saveNow = useAppStore.getState().saveNow

    const { unmount } = renderHook(() => useAppLifecycle(vi.fn()))

    expect(initTheme).toHaveBeenCalledTimes(1)
    expect(init).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('beforeunload'))
    expect(saveNow).toHaveBeenCalledTimes(1)

    unmount()
    window.dispatchEvent(new Event('beforeunload'))
    expect(saveNow).toHaveBeenCalledTimes(1)
  })

  it('toggles shortcut help only for the configured action and ignores editable targets', () => {
    const toggle = vi.fn()
    renderHook(() => useAppLifecycle(toggle))

    const helpEvent = new KeyboardEvent('keydown', { key: '?', cancelable: true })
    window.dispatchEvent(helpEvent)
    expect(toggle).toHaveBeenCalledTimes(1)
    expect(helpEvent.defaultPrevented).toBe(true)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', cancelable: true, bubbles: true }))
    expect(toggle).toHaveBeenCalledTimes(1)
    input.remove()
  })

  it('exposes and consumes a deferred PWA install prompt', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    let resolveChoice: (value: { outcome: string }) => void = () => undefined
    const userChoice = new Promise<{ outcome: string }>((resolve) => {
      resolveChoice = resolve
    })
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice,
    })
    const { result } = renderHook(() => useAppLifecycle(vi.fn()))

    act(() => {
      window.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
    await waitFor(() => expect(result.current.canInstall).toBe(true))

    let installPromise: Promise<void> | undefined
    act(() => {
      installPromise = result.current.installApp()
    })
    expect(prompt).toHaveBeenCalledTimes(1)
    resolveChoice({ outcome: 'accepted' })
    await act(async () => {
      await installPromise
    })
    expect(result.current.canInstall).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.canInstall).toBe(false)
  })
})
