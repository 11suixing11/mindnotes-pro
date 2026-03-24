import { beforeEach, describe, expect, it, vi } from 'vitest'
import { keybindingManager } from './KeybindingManager'

function waitTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('keybindingManager', () => {
  beforeEach(() => {
    keybindingManager.stopListening()
    keybindingManager.clear()
    keybindingManager.setExecutor(() => undefined)
    vi.clearAllMocks()
  })

  it('registers and detects conflicts by signature', () => {
    const first = keybindingManager.register({
      id: 'save.1',
      commandId: 'file.save',
      key: 's',
      modifiers: ['ctrl'],
      platform: 'all',
    })

    const second = keybindingManager.register({
      id: 'save.2',
      commandId: 'file.save',
      key: 'S',
      modifiers: ['ctrl'],
      platform: 'all',
    })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.conflict.signature).toBe('all|ctrl|s')
      expect(second.conflict.existing.id).toBe('save.1')
    }
  })

  it('executes matching binding on keydown', async () => {
    const executor = vi.fn()
    keybindingManager.setExecutor(executor)

    keybindingManager.register({
      id: 'zoom.in',
      commandId: 'view.zoomIn',
      key: '=',
      modifiers: ['ctrl'],
      platform: 'all',
    })

    keybindingManager.startListening()

    const event = new KeyboardEvent('keydown', {
      key: '=',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })

    window.dispatchEvent(event)
    await waitTick()

    expect(executor).toHaveBeenCalledTimes(1)
    expect(executor).toHaveBeenCalledWith('view.zoomIn', expect.any(Object))
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not execute when typing inside input controls', async () => {
    const executor = vi.fn()
    keybindingManager.setExecutor(executor)

    keybindingManager.register({
      id: 'help.shortcuts',
      commandId: 'help.shortcuts',
      key: '/',
      modifiers: ['shift'],
      platform: 'all',
    })

    keybindingManager.startListening()

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', {
      key: '/',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })

    input.dispatchEvent(event)
    await waitTick()

    expect(executor).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('supports custom when guard and preventDefault override', async () => {
    const executor = vi.fn()
    keybindingManager.setExecutor(executor)

    keybindingManager.register({
      id: 'toggle.grid',
      commandId: 'view.toggleGrid',
      key: 'g',
      modifiers: ['alt'],
      platform: 'all',
      preventDefault: false,
      stopPropagation: false,
      when: (event) => event.altKey,
    })

    keybindingManager.startListening()

    const missEvent = new KeyboardEvent('keydown', {
      key: 'g',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(missEvent)

    const hitEvent = new KeyboardEvent('keydown', {
      key: 'g',
      altKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(hitEvent)

    await waitTick()

    expect(executor).toHaveBeenCalledTimes(1)
    expect(hitEvent.defaultPrevented).toBe(false)
  })

  it('ignores repeated keydown by default', async () => {
    const executor = vi.fn()
    keybindingManager.setExecutor(executor)

    keybindingManager.register({
      id: 'tool.pen',
      commandId: 'tool.pen',
      key: '1',
      platform: 'all',
    })

    keybindingManager.startListening()

    const event = new KeyboardEvent('keydown', {
      key: '1',
      repeat: true,
      bubbles: true,
      cancelable: true,
    })

    window.dispatchEvent(event)
    await waitTick()

    expect(executor).not.toHaveBeenCalled()
  })

  it('supports repeated keydown when allowRepeat is true', async () => {
    const executor = vi.fn()
    keybindingManager.setExecutor(executor)

    keybindingManager.register({
      id: 'view.zoomIn.repeat',
      commandId: 'view.zoomIn',
      key: '=',
      modifiers: ['ctrl'],
      allowRepeat: true,
      platform: 'all',
    })

    keybindingManager.startListening()

    const event = new KeyboardEvent('keydown', {
      key: '=',
      ctrlKey: true,
      repeat: true,
      bubbles: true,
      cancelable: true,
    })

    window.dispatchEvent(event)
    await waitTick()

    expect(executor).toHaveBeenCalledTimes(1)
  })

  it('unregisters and clears bindings', () => {
    keybindingManager.register({
      id: 'tool.pen',
      commandId: 'tool.pen',
      key: '1',
      platform: 'all',
    })
    keybindingManager.register({
      id: 'tool.eraser',
      commandId: 'tool.eraser',
      key: '2',
      platform: 'all',
    })

    keybindingManager.unregister('tool.pen')
    expect(keybindingManager.getBindings().map((item) => item.id)).toEqual(['tool.eraser'])

    keybindingManager.clear()
    expect(keybindingManager.getBindings()).toHaveLength(0)
  })
})
