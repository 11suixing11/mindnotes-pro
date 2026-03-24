import type { Command, CommandDescriptor, CommandHandler, CommandId, CommandPayload } from './types'

class CommandRegistry {
  private readonly commands = new Map<CommandId, Command>()

  register(descriptor: CommandDescriptor, handler: CommandHandler): void {
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

  async execute(commandId: CommandId, payload?: CommandPayload): Promise<boolean> {
    const command = this.commands.get(commandId)
    if (!command || command.enabled === false) {
      return false
    }

    await command.handler(payload)
    return true
  }

  clear(): void {
    this.commands.clear()
  }
}

export const commandRegistry = new CommandRegistry()
