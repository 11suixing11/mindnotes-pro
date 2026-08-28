import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHORTCUT_BINDINGS,
  createShortcutExport,
  findShortcutAction,
  findShortcutConflict,
  formatShortcutBinding,
  getShortcutKeyParts,
  isInteractiveShortcutTarget,
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
  describe('interactive shortcut targets', () => {
    it.each(['input', 'textarea', 'select', 'button', 'a'])('recognizes %s elements', (tagName) => {
      const element = document.createElement(tagName)
      expect(isInteractiveShortcutTarget(element)).toBe(true)
    })

    it('recognizes contenteditable elements and descendants of controls', () => {
      const editable = document.createElement('div')
      editable.setAttribute('contenteditable', 'true')
      const editableChild = document.createElement('span')
      editable.append(editableChild)
      const nonEditableChild = document.createElement('span')
      nonEditableChild.setAttribute('contenteditable', 'false')
      editable.append(nonEditableChild)

      const button = document.createElement('button')
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      icon.setAttribute('contenteditable', 'false')
      button.append(icon)

      expect(isInteractiveShortcutTarget(editable)).toBe(true)
      expect(isInteractiveShortcutTarget(editableChild)).toBe(true)
      expect(isInteractiveShortcutTarget(nonEditableChild)).toBe(false)
      expect(isInteractiveShortcutTarget(icon)).toBe(true)
    })

    it('does not classify the canvas or an unrelated element as interactive', () => {
      expect(isInteractiveShortcutTarget(document.createElement('canvas'))).toBe(false)
      expect(isInteractiveShortcutTarget(document.createElement('div'))).toBe(false)
      expect(isInteractiveShortcutTarget(null)).toBe(false)
    })
  })

  it('normalizes shifted punctuation as the printed key', () => {
    expect(shortcutBindingFromEvent(keyEvent('?', { shiftKey: true }))).toEqual({ key: '?' })
    expect(shortcutBindingFromEvent(keyEvent('+', { shiftKey: true }))).toEqual({ key: '+' })
  })

  it('keeps the plus key intact when rendering shortcut key caps', () => {
    expect(getShortcutKeyParts({ key: '+' })).toEqual(['+'])
    expect(getShortcutKeyParts({ key: '+', mod: true })).toEqual(['Ctrl', '+'])
    expect(formatShortcutBinding({ key: '+', mod: true })).toBe('Ctrl++')
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
    expect(findShortcutConflict('tool.pen', { key: 'Tab' }, DEFAULT_SHORTCUT_BINDINGS)?.label).toBe(
      '浏览器焦点移动'
    )
    expect(
      findShortcutConflict('tool.pen', { key: 'Shift' }, DEFAULT_SHORTCUT_BINDINGS)?.label
    ).toBe('不能只使用修饰键')
  })

  it('does not record browser focus and modal control keys', () => {
    expect(shortcutBindingFromEvent(keyEvent('Tab'))).toBeNull()
    expect(shortcutBindingFromEvent(keyEvent('Escape'))).toBeNull()
    expect(shortcutBindingFromEvent(keyEvent('Shift'))).toBeNull()
  })

  it('exports and parses shortcut configurations', () => {
    const bindings = mergeShortcutBindings({ 'tool.pen': { key: 'P' } })
    const parsed = parseShortcutExport(createShortcutExport(bindings))

    expect(parsed?.version).toBe(1)
    expect(parsed?.bindings['tool.pen']).toEqual({ key: 'P' })
    expect(formatShortcutBinding(bindings['tool.pen'])).toBe('P')
  })

  it('rejects imported bindings reserved for browser or modal controls', () => {
    const invalid = JSON.stringify({
      version: 1,
      bindings: { 'tool.pen': { key: 'Tab' } },
    })
    expect(parseShortcutExport(invalid)).toBeNull()
  })
})
