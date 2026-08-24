interface TextEditorKeyEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  isComposing: boolean
  keyCode: number
}

export type TextIndentAction = 'indent' | 'outdent'

export interface TextIndentResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

export function getTextEditKeyAction(
  event: TextEditorKeyEvent
): 'commit' | 'indent' | 'outdent' | null {
  if (event.isComposing || event.keyCode === 229) return null
  if (event.key === 'Escape') return 'commit'
  if (event.key === 'Tab') return event.shiftKey ? 'outdent' : 'indent'
  return event.key === 'Enter' && (event.ctrlKey || event.metaKey) ? 'commit' : null
}

/**
 * Apply indentation to every line touched by the current selection. Keeping
 * this as a pure operation lets the textarea stay controlled by React while
 * preserving the user's selection just like a native code editor.
 */
export function applyTextIndentation(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: TextIndentAction,
  tabSize = 4
): TextIndentResult {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))
  const tab = ' '.repeat(tabSize)
  const firstLineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const selectedText = value.slice(firstLineStart, end)
  const lineStarts = [firstLineStart]

  for (let index = 0; index < selectedText.length; index += 1) {
    if (selectedText[index] === '\n') lineStarts.push(firstLineStart + index + 1)
  }

  if (action === 'indent') {
    let nextValue = value
    for (const lineStart of [...lineStarts].reverse()) {
      nextValue = `${nextValue.slice(0, lineStart)}${tab}${nextValue.slice(lineStart)}`
    }

    const startDelta = lineStarts.filter((lineStart) => lineStart <= start).length * tabSize
    const endDelta = lineStarts.filter((lineStart) => lineStart <= end).length * tabSize
    return {
      value: nextValue,
      selectionStart: start + startDelta,
      selectionEnd: end + endDelta,
    }
  }

  let nextValue = value
  const removedByLine = new Map<number, number>()
  for (const lineStart of lineStarts) {
    const match = nextValue.slice(lineStart, lineStart + tabSize).match(/^ {1,4}/)
    if (match) removedByLine.set(lineStart, match[0].length)
  }

  for (const [lineStart, removed] of [...removedByLine.entries()].reverse()) {
    nextValue = `${nextValue.slice(0, lineStart)}${nextValue.slice(lineStart + removed)}`
  }

  const startDelta = [...removedByLine.entries()]
    .filter(([lineStart]) => lineStart < start)
    .reduce((total, [, removed]) => total + removed, 0)
  const endDelta = [...removedByLine.entries()]
    .filter(([lineStart]) => lineStart < end)
    .reduce((total, [, removed]) => total + removed, 0)

  return {
    value: nextValue,
    selectionStart: Math.max(0, start - startDelta),
    selectionEnd: Math.max(0, end - endDelta),
  }
}
