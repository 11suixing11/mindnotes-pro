import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import {
  ALT_COLOR_PRESETS,
  SHIFT_COLOR_PALETTE,
  executeShortcutAction,
  handleEscapeShortcut,
  handleKeyboardNudge,
  handleQuickColorShortcut,
} from './keyboardShortcutActions'

function keyEvent(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...options })
}

describe('keyboard shortcut actions', () => {
  beforeEach(() => {
    useAppStore.setState({
      elements: [],
      selectedIds: [],
      color: '#000000',
      styleEyedropperActive: false,
      styleEyedropperPreview: null,
      undoStack: [],
      redoStack: [],
    })
  })

  it('maps Shift+digits and Alt+digits to their existing color palettes', () => {
    const shiftEvent = keyEvent('0', { shiftKey: true })
    const altEvent = keyEvent('1', { altKey: true })

    expect(handleQuickColorShortcut(shiftEvent)).toBe(true)
    expect(useAppStore.getState().color).toBe(SHIFT_COLOR_PALETTE[9])
    expect(shiftEvent.defaultPrevented).toBe(true)

    expect(handleQuickColorShortcut(altEvent)).toBe(true)
    expect(useAppStore.getState().color).toBe(ALT_COLOR_PRESETS[0])
    expect(altEvent.defaultPrevented).toBe(true)
  })

  it('leaves unrelated keys available to later shortcut handlers', () => {
    expect(handleQuickColorShortcut(keyEvent('x'))).toBe(false)
  })

  it.each([
    ['ArrowRight', {}, 1, 0],
    ['ArrowLeft', { ctrlKey: true }, -10, 0],
    ['ArrowDown', { shiftKey: true }, 0, 50],
    ['ArrowUp', { ctrlKey: true, shiftKey: true }, 0, -10],
  ] as const)('nudges %s with the expected modifier step', (key, options, dx, dy) => {
    useAppStore.setState({ selectedIds: ['shape-1'] })
    const moveSpy = vi.spyOn(useAppStore.getState(), 'moveElementsById')
    const event = keyEvent(key, options)

    expect(handleKeyboardNudge(event)).toBe(true)
    expect(moveSpy).toHaveBeenCalledWith(['shape-1'], dx, dy)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not consume arrow keys without a selection', () => {
    const event = keyEvent('ArrowRight')

    expect(handleKeyboardNudge(event)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('consumes Escape only while the style eyedropper is active', () => {
    const inactiveEvent = keyEvent('Escape')
    expect(handleEscapeShortcut(inactiveEvent)).toBe(false)

    useAppStore.setState({ styleEyedropperActive: true })
    const activeEvent = keyEvent('Escape')
    expect(handleEscapeShortcut(activeEvent)).toBe(true)
    expect(activeEvent.defaultPrevented).toBe(true)
    expect(useAppStore.getState().styleEyedropperActive).toBe(false)
  })

  it('leaves the help action for the App-level shortcut dialog handler', () => {
    const event = keyEvent('?')

    expect(executeShortcutAction('help.shortcuts', event, { current: {} })).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })
})
