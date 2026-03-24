import type { CommandId } from '../commands/types'

export type KeybindingPlatform = 'all' | 'mac' | 'windows' | 'linux'

export type ModifierKey = 'ctrl' | 'meta' | 'alt' | 'shift'

export interface Keybinding {
  id: string
  commandId: CommandId
  key: string
  modifiers?: ModifierKey[]
  platform?: KeybindingPlatform
  allowRepeat?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
  description?: string
  when?: (event: KeyboardEvent) => boolean
}

export interface KeybindingConflict {
  incoming: Keybinding
  existing: Keybinding
  signature: string
}
