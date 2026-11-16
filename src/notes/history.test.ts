import { describe, expect, it } from 'vitest'
import { commitHistory, redoHistory, startHistory, undoHistory } from './history'
import type { PageAnnotation } from './model'

const mark: PageAnnotation = {
  id: 'stroke',
  kind: 'ink',
  color: '#3979cf',
  points: [
    { x: 10, y: 20 },
    { x: 30, y: 50 },
  ],
  anchor: null,
  quote: null,
  comment: '',
  createdAt: 1,
  updatedAt: 1,
}

describe('annotation history', () => {
  it('restores a whole drawing and clears redo when a different edit follows undo', () => {
    const added = commitHistory(startHistory([]), [mark])
    const undone = undoHistory(added)
    expect(undone.present).toEqual([])
    expect(redoHistory(undone).present).toEqual([mark])
    const edited = commitHistory(undone, [{ ...mark, id: 'another' }])
    expect(edited.future).toEqual([])
    expect(redoHistory(edited)).toBe(edited)
  })
})
