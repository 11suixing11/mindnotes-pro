import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/logger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}))

import { COMMAND_EXECUTION_ERROR_EVENT, commandRegistry } from './registry'
import type { CommandDescriptor } from './types'

const baseDescriptor: CommandDescriptor = {
  id: 'tool.pen',
  description: 'Switch to pen tool',
  category: 'tool',
}

describe('commandRegistry', () => {
  beforeEach(() => {
    commandRegistry.clear()
    vi.clearAllMocks()
  })

  it('registers and retrieves command', () => {
    const handler = vi.fn()

    commandRegistry.register(baseDescriptor, handler)

    const command = commandRegistry.getCommand('tool.pen')
    expect(command).not.toBeNull()
    expect(command?.enabled).toBe(true)
    expect(commandRegistry.has('tool.pen')).toBe(true)
  })

  it('executes registered command with payload', async () => {
    const handler = vi.fn()

    commandRegistry.register(baseDescriptor, handler)

    const payload = { size: 8 }
    const result = await commandRegistry.execute('tool.pen', payload)

    expect(result).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('returns false when command is disabled', async () => {
    const handler = vi.fn()

    commandRegistry.register({ ...baseDescriptor, enabled: false }, handler)

    const result = await commandRegistry.execute('tool.pen')

    expect(result).toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('can toggle command enabled state', async () => {
    const handler = vi.fn()

    commandRegistry.register(baseDescriptor, handler)
    const disabled = commandRegistry.setEnabled('tool.pen', false)
    const executeWhenDisabled = await commandRegistry.execute('tool.pen')
    const enabled = commandRegistry.setEnabled('tool.pen', true)
    const executeWhenEnabled = await commandRegistry.execute('tool.pen')

    expect(disabled).toBe(true)
    expect(enabled).toBe(true)
    expect(executeWhenDisabled).toBe(false)
    expect(executeWhenEnabled).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('returns false when execution throws', async () => {
    const errorHandler = vi.fn(async () => {
      throw new Error('boom')
    })

    commandRegistry.register(baseDescriptor, errorHandler)

    await expect(commandRegistry.execute('tool.pen')).resolves.toBe(false)
  })

  it('dispatches command execution error event when handler fails', async () => {
    const eventListener = vi.fn()
    window.addEventListener(COMMAND_EXECUTION_ERROR_EVENT, eventListener as EventListener)

    const payload = { source: 'test' }
    commandRegistry.register(baseDescriptor, async () => {
      throw new Error('handler failed')
    })

    await expect(commandRegistry.execute('tool.pen', payload)).resolves.toBe(false)

    expect(eventListener).toHaveBeenCalledTimes(1)
    const event = eventListener.mock.calls[0]?.[0] as CustomEvent | undefined
    expect(event?.detail).toEqual({
      commandId: 'tool.pen',
      message: 'handler failed',
      payload,
    })

    window.removeEventListener(COMMAND_EXECUTION_ERROR_EVENT, eventListener as EventListener)
  })

  it('does not dispatch command execution error event on success', async () => {
    const eventListener = vi.fn()
    window.addEventListener(COMMAND_EXECUTION_ERROR_EVENT, eventListener as EventListener)

    commandRegistry.register(baseDescriptor, async () => {
      return
    })

    await expect(commandRegistry.execute('tool.pen')).resolves.toBe(true)
    expect(eventListener).not.toHaveBeenCalled()

    window.removeEventListener(COMMAND_EXECUTION_ERROR_EVENT, eventListener as EventListener)
  })

  it('replaces duplicate registrations and runs latest handler', async () => {
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()

    commandRegistry.register(baseDescriptor, firstHandler)
    commandRegistry.register(baseDescriptor, secondHandler)

    await commandRegistry.execute('tool.pen')

    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledTimes(1)
    expect(commandRegistry.getCommands()).toHaveLength(1)
  })

  it('unregisters and clears commands', () => {
    commandRegistry.register(baseDescriptor, vi.fn())
    commandRegistry.register(
      {
        id: 'edit.undo',
        description: 'Undo change',
        category: 'edit',
      },
      vi.fn()
    )

    commandRegistry.unregister('tool.pen')
    expect(commandRegistry.has('tool.pen')).toBe(false)
    expect(commandRegistry.has('edit.undo')).toBe(true)

    commandRegistry.clear()
    expect(commandRegistry.getCommands()).toHaveLength(0)
  })
})
