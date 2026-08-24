import { describe, expect, it } from 'vitest'
import { applyTextIndentation, getTextEditKeyAction } from './textEditorKeyboard'

describe('getTextEditKeyAction', () => {
  it('keeps plain Enter for newlines and only commits on the explicit shortcut', () => {
    const baseEvent = {
      key: 'Enter',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      keyCode: 13,
    }

    expect(getTextEditKeyAction(baseEvent)).toBeNull()
    expect(getTextEditKeyAction({ ...baseEvent, ctrlKey: true })).toBe('commit')
    expect(getTextEditKeyAction({ ...baseEvent, metaKey: true })).toBe('commit')
  })

  it('commits on Escape', () => {
    const event = {
      key: 'Escape',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      keyCode: 27,
    }

    expect(getTextEditKeyAction(event)).toBe('commit')
  })

  it('indents on Tab and outdents on Shift+Tab', () => {
    const event = {
      key: 'Tab',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      keyCode: 9,
    }

    expect(getTextEditKeyAction(event)).toBe('indent')
    expect(getTextEditKeyAction({ ...event, shiftKey: true })).toBe('outdent')
  })

  it('does nothing while composing, including legacy keyCode 229 events', () => {
    const baseEvent = {
      key: 'Enter',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      isComposing: false,
      keyCode: 13,
    }

    expect(getTextEditKeyAction({ ...baseEvent, ctrlKey: true, isComposing: true })).toBeNull()
    expect(getTextEditKeyAction({ ...baseEvent, keyCode: 229, ctrlKey: true })).toBeNull()
    expect(getTextEditKeyAction({ ...baseEvent, key: 'Escape', isComposing: true })).toBeNull()
    expect(getTextEditKeyAction({ ...baseEvent, key: 'Tab', keyCode: 229 })).toBeNull()
  })
})

describe('applyTextIndentation', () => {
  it('indents the current line and keeps the caret beside the same character', () => {
    expect(applyTextIndentation('hello', 2, 2, 'indent')).toEqual({
      value: '    hello',
      selectionStart: 6,
      selectionEnd: 6,
    })
  })

  it('indents every selected line and preserves the selected text range', () => {
    expect(applyTextIndentation('one\ntwo\nthree', 1, 10, 'indent')).toEqual({
      value: '    one\n    two\n    three',
      selectionStart: 5,
      selectionEnd: 22,
    })
  })

  it('outdents one to four leading spaces from every selected line', () => {
    expect(applyTextIndentation('    one\n  two\nthree', 0, 13, 'outdent')).toEqual({
      value: 'one\ntwo\nthree',
      selectionStart: 0,
      selectionEnd: 7,
    })
  })

  it('moves a caret inside removed indentation to the line start', () => {
    expect(applyTextIndentation('  hello', 1, 1, 'outdent')).toEqual({
      value: 'hello',
      selectionStart: 0,
      selectionEnd: 0,
    })
  })

  it('leaves unindented lines and the selection unchanged', () => {
    expect(applyTextIndentation('one\ntwo', 0, 7, 'outdent')).toEqual({
      value: 'one\ntwo',
      selectionStart: 0,
      selectionEnd: 7,
    })
  })
})
