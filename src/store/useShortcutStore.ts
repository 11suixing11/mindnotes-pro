import { create } from 'zustand'
import {
  createShortcutExport,
  DEFAULT_SHORTCUT_BINDINGS,
  findShortcutConflict,
  formatShortcutBinding,
  mergeShortcutBindings,
  normalizeShortcutBinding,
  parseShortcutExport,
  validateShortcutBindings,
  type ShortcutActionId,
  type ShortcutBinding,
  type ShortcutBindingMap,
} from '../keyboard/shortcuts'

export const SHORTCUT_STORAGE_KEY = 'mindnotes-keyboard-shortcuts-v1'

export interface ShortcutResult {
  ok: boolean
  error?: string
}

interface ShortcutStore {
  bindings: ShortcutBindingMap
  setShortcut: (actionId: ShortcutActionId, binding: ShortcutBinding | null) => ShortcutResult
  resetShortcut: (actionId: ShortcutActionId) => void
  resetShortcuts: () => void
  exportShortcuts: () => string
  importShortcuts: (json: string) => ShortcutResult
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function persistShortcutBindings(bindings: ShortcutBindingMap): void {
  if (!canUseLocalStorage()) return
  try {
    localStorage.setItem(SHORTCUT_STORAGE_KEY, createShortcutExport(bindings))
  } catch {
    // Persisting shortcuts is best-effort. The active in-memory bindings still work.
  }
}

function loadShortcutBindings(): ShortcutBindingMap {
  if (!canUseLocalStorage()) return { ...DEFAULT_SHORTCUT_BINDINGS }

  try {
    const raw = localStorage.getItem(SHORTCUT_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SHORTCUT_BINDINGS }

    const parsed = parseShortcutExport(raw)
    if (!parsed) return { ...DEFAULT_SHORTCUT_BINDINGS }

    const bindings = mergeShortcutBindings(parsed.bindings)
    if (validateShortcutBindings(bindings)) return { ...DEFAULT_SHORTCUT_BINDINGS }
    return bindings
  } catch {
    return { ...DEFAULT_SHORTCUT_BINDINGS }
  }
}

function shortcutConflictMessage(conflictLabel: string, binding: ShortcutBinding | null): string {
  if (!binding) return ''
  const label = formatShortcutBinding(binding)
  return `${label} 已被“${conflictLabel}”使用。`
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  bindings: loadShortcutBindings(),

  setShortcut: (actionId, binding) => {
    const normalized = binding ? normalizeShortcutBinding(binding) : null
    const conflict = findShortcutConflict(actionId, normalized, get().bindings)
    if (conflict) {
      return {
        ok: false,
        error: shortcutConflictMessage(conflict.label, normalized),
      }
    }

    const bindings = { ...get().bindings, [actionId]: normalized }
    set({ bindings })
    persistShortcutBindings(bindings)
    return { ok: true }
  },

  resetShortcut: (actionId) => {
    const bindings = { ...get().bindings, [actionId]: DEFAULT_SHORTCUT_BINDINGS[actionId] }
    set({ bindings })
    persistShortcutBindings(bindings)
  },

  resetShortcuts: () => {
    const bindings = { ...DEFAULT_SHORTCUT_BINDINGS }
    set({ bindings })
    if (!canUseLocalStorage()) return
    try {
      localStorage.removeItem(SHORTCUT_STORAGE_KEY)
    } catch {
      persistShortcutBindings(bindings)
    }
  },

  exportShortcuts: () => createShortcutExport(get().bindings),

  importShortcuts: (json) => {
    const parsed = parseShortcutExport(json)
    if (!parsed) return { ok: false, error: '快捷键配置必须是有效的 MindNotes Pro JSON。' }

    const bindings = mergeShortcutBindings(parsed.bindings)
    const conflict = validateShortcutBindings(bindings)
    if (conflict) return { ok: false, error: conflict.label }

    set({ bindings })
    persistShortcutBindings(bindings)
    return { ok: true }
  },
}))
