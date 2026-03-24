import type { Command, CommandDescriptor, CommandHandler, CommandId, CommandPayload } from './types'
import { debugError, debugLog } from '../../utils/logger'

export const COMMAND_EXECUTION_ERROR_EVENT = 'mindnotes-command-error'

export interface CommandExecutionErrorDetail {
  commandId: CommandId
  message: string
  payload?: CommandPayload
}

class CommandRegistry {
  private readonly commands = new Map<CommandId, Command>()

  register(descriptor: CommandDescriptor, handler: CommandHandler): void {
    if (this.commands.has(descriptor.id)) {
      debugLog('[CommandRegistry] Command already exists, replacing handler:', descriptor.id)
    }

    this.commands.set(descriptor.id, {
      ...descriptor,
      handler,
      enabled: descriptor.enabled ?? true,
    })
  }

  unregister(commandId: CommandId): void {
    this.commands.delete(commandId)
  }

  has(commandId: CommandId): boolean {
    return this.commands.has(commandId)
  }

  getCommand(commandId: CommandId): Command | null {
    return this.commands.get(commandId) ?? null
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values())
  }

  setEnabled(commandId: CommandId, enabled: boolean): boolean {
    const command = this.commands.get(commandId)
    if (!command) {
      return false
    }

    this.commands.set(commandId, {
      ...command,
      enabled,
    })

    return true
  }

  async execute(commandId: CommandId, payload?: CommandPayload): Promise<boolean> {
    const command = this.commands.get(commandId)
    if (!command || command.enabled === false) {
      return false
    }

    try {
      await command.handler(payload)
      return true
    } catch (error) {
      this.dispatchExecutionError(commandId, payload, error)
      debugError('[CommandRegistry] Command execution failed:', commandId, error)
      return false
    }
  }

  private dispatchExecutionError(commandId: CommandId, payload: CommandPayload | undefined, error: unknown): void {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
      return
    }

    const message = error instanceof Error ? error.message : String(error)
    const detail: CommandExecutionErrorDetail = {
      commandId,
      message,
      payload,
    }

    window.dispatchEvent(new CustomEvent(COMMAND_EXECUTION_ERROR_EVENT, { detail }))
  }

  clear(): void {
    this.commands.clear()
  }
}

export const commandRegistry = new CommandRegistry()
