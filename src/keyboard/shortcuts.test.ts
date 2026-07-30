import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHORTCUT_BINDINGS,
  createShortcutExport,
  findShortcutAction,
  findShortcutConflict,
  formatShortcutBinding,
  mergeShortcutBindings,
  parseShortcutExport,
  shortcutBindingFromEvent,
} from './shortcuts'

function keyEvent(key: string, options: Partial<KeyboardEvent> = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...options,
  }
}

describe('keyboard shortcuts', () => {
  it('normalizes shifted punctuation as the printed key', () => {
    expect(shortcutBindingFromEvent(keyEvent('?', { shiftKey: true }))).toEqual({ key: '?' })
    expect(shortcutBindingFromEvent(keyEvent('+', { shiftKey: true }))).toEqual({ key: '+' })
  })

  it('keeps shift as a modifier for shortcut letters', () => {
    expect(shortcutBindingFromEvent(keyEvent('G', { shiftKey: true }))).toEqual({
      key: 'G',
      shift: true,
    })
  })

  it('matches default and fixed shortcut actions', () => {
    expect(findShortcutAction(keyEvent('1'), DEFAULT_SHORTCUT_BINDINGS)).toBe('tool.pen')
    expect(findShortcutAction(keyEvent('G', { shiftKey: true }), DEFAULT_SHORTCUT_BINDINGS)).toBe(
      'view.toggleGrid'
    )
    expect(findShortcutAction(keyEvent('F1'), DEFAULT_SHORTCUT_BINDINGS)).toBe('help.shortcuts')
    expect(findShortcutAction(keyEvent('y', { ctrlKey: true }), DEFAULT_SHORTCUT_BINDINGS)).toBe(
      'edit.redo'
    )
  })

  it('detects conflicts with assigned shortcuts and reserved fixed shortcuts', () => {
    expect(findShortcutConflict('tool.pen', { key: '0' }, DEFAULT_SHORTCUT_BINDINGS)?.label).toBe(
      '选择工具'
    )
    expect(
      findShortcutConflict('tool.pen', { key: 'Escape' }, DEFAULT_SHORTCUT_BINDINGS)?.label
    ).toBe('取消当前模式')
  })

  it('exports and parses shortcut configurations', () => {
    const bindings = mergeShortcutBindings({ 'tool.pen': { key: 'P' } })
    const parsed = parseShortcutExport(createShortcutExport(bindings))

    expect(parsed?.version).toBe(1)
    expect(parsed?.bindings['tool.pen']).toEqual({ key: 'P' })
    expect(formatShortcutBinding(bindings['tool.pen'])).toBe('P')
  })
})
