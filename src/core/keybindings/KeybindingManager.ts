import type { CommandId, CommandPayload } from '../commands/types'
import type { Keybinding, KeybindingConflict, KeybindingPlatform, ModifierKey } from './types'

type CommandExecutor = (commandId: CommandId, payload?: CommandPayload) => void | Promise<void>

class KeybindingManager {
  private readonly bindings = new Map<string, Keybinding>()
  private readonly signatures = new Map<string, string>()
  private executor: CommandExecutor | null = null
  private listening = false

  setExecutor(executor: CommandExecutor): void {
    this.executor = executor
  }

  register(binding: Keybinding): { ok: true } | { ok: false; conflict: KeybindingConflict } {
    const normalized = this.normalizeBinding(binding)
    const signature = this.bindingSignature(normalized)
    const existingId = this.signatures.get(signature)

    if (existingId) {
      const existing = this.bindings.get(existingId)
      if (existing) {
        return {
          ok: false,
          conflict: {
            incoming: normalized,
            existing,
            signature,
          },
        }
      }
    }

    this.bindings.set(normalized.id, normalized)
    this.signatures.set(signature, normalized.id)
    return { ok: true }
  }

  unregister(bindingId: string): void {
    const current = this.bindings.get(bindingId)
    if (!current) {
      return
    }

    const signature = this.bindingSignature(current)
    this.bindings.delete(bindingId)
    this.signatures.delete(signature)
  }

  clear(): void {
    this.bindings.clear()
    this.signatures.clear()
  }

  getBindings(): Keybinding[] {
    return Array.from(this.bindings.values())
  }

  startListening(): void {
    if (this.listening) {
      return
    }

    window.addEventListener('keydown', this.handleKeydown)
    this.listening = true
  }

  stopListening(): void {
    if (!this.listening) {
      return
    }

    window.removeEventListener('keydown', this.handleKeydown)
    this.listening = false
  }

  private readonly handleKeydown = async (event: KeyboardEvent): Promise<void> => {
    if (!this.executor) {
      return
    }

    if (this.shouldIgnoreEvent(event)) {
      return
    }

    const platform = this.detectPlatform()
    const pressedKey = this.normalizeKey(event.key)
    const pressedModifiers = this.modifiersFromEvent(event)

    for (const binding of this.bindings.values()) {
      if (!this.matchesPlatform(binding.platform ?? 'all', platform)) {
        continue
      }

      if (pressedKey !== this.normalizeKey(binding.key)) {
        continue
      }

      const required = new Set(binding.modifiers ?? [])
      if (!this.equalModifierSets(required, pressedModifiers)) {
        continue
      }

      if (binding.when && !binding.when(event)) {
        continue
      }

      if (binding.preventDefault ?? true) {
        event.preventDefault()
      }

      if (binding.stopPropagation ?? true) {
        event.stopPropagation()
      }

      await this.executor(binding.commandId, { event })
      return
    }
  }

  private normalizeBinding(binding: Keybinding): Keybinding {
    return {
      ...binding,
      key: this.normalizeKey(binding.key),
      modifiers: [...new Set(binding.modifiers ?? [])].sort() as ModifierKey[],
      platform: binding.platform ?? 'all',
      preventDefault: binding.preventDefault ?? true,
      stopPropagation: binding.stopPropagation ?? true,
    }
  }

  private bindingSignature(binding: Keybinding): string {
    const platform = binding.platform ?? 'all'
    const key = this.normalizeKey(binding.key)
    const modifiers = (binding.modifiers ?? []).slice().sort().join('+')
    return `${platform}|${modifiers}|${key}`
  }

  private normalizeKey(key: string): string {
    if (key === ' ') {
      return 'space'
    }
    return key.toLowerCase()
  }

  private modifiersFromEvent(event: KeyboardEvent): Set<ModifierKey> {
    const modifiers = new Set<ModifierKey>()
    if (event.ctrlKey) modifiers.add('ctrl')
    if (event.metaKey) modifiers.add('meta')
    if (event.altKey) modifiers.add('alt')
    if (event.shiftKey) modifiers.add('shift')
    return modifiers
  }

  private equalModifierSets(required: Set<ModifierKey>, actual: Set<ModifierKey>): boolean {
    if (required.size !== actual.size) {
      return false
    }

    for (const item of required) {
      if (!actual.has(item)) {
        return false
      }
    }

    return true
  }

  private detectPlatform(): KeybindingPlatform {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('mac')) return 'mac'
    if (ua.includes('win')) return 'windows'
    if (ua.includes('linux')) return 'linux'
    return 'all'
  }

  private matchesPlatform(bindingPlatform: KeybindingPlatform, current: KeybindingPlatform): boolean {
    return bindingPlatform === 'all' || bindingPlatform === current
  }

  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return false
    }

    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true
    }

    return target.isContentEditable
  }
}

export const keybindingManager = new KeybindingManager()
