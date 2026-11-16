import { describe, expect, it } from 'vitest'
import {
  resizeScreenDraft,
  screenPreferences,
  validateScreenDraft,
  validateScreenNote,
  validateScreenPatch,
  validScreenStrokes,
} from './screenNotebook'
import type { ScreenDraft, ScreenNote } from './screenNotebook'

const draft: ScreenDraft = {
  displayId: 'display_1',
  width: 1000,
  height: 600,
  strokes: [
    {
      id: 'ink_1',
      tool: 'pen',
      color: '#e05d52',
      width: 4,
      points: [
        { x: 100, y: 120 },
        { x: 300, y: 150 },
      ],
    },
  ],
  backgroundId: null,
  source: { app: 'PowerPoint', title: '课件', display: '主屏幕' },
  updatedAt: 10,
}
const note: ScreenNote = {
  id: 'note_1',
  title: '会议结论',
  comment: '下周复查',
  width: draft.width,
  height: draft.height,
  strokes: draft.strokes,
  source: draft.source,
  createdAt: 10,
  updatedAt: 20,
  revision: 1,
  trashedAt: null,
}

describe('screen notebook data contracts', () => {
  it('preserves editable ink and rejects malformed documents before they reach storage', () => {
    expect(validateScreenNote(note)).toEqual(note)
    for (const patch of [
      { id: '../note' },
      { title: '' },
      { width: Infinity },
      { updatedAt: 9 },
      { revision: 0 },
      { source: null },
      { strokes: [draft.strokes[0], draft.strokes[0]] },
    ])
      expect(() => validateScreenNote({ ...note, ...patch })).toThrow()
    expect(validScreenStrokes([{ ...draft.strokes[0], points: [{ x: NaN, y: 2 }] }])).toBe(false)
    expect(validateScreenNote({ ...note, untrustedField: 'discard' })).not.toHaveProperty(
      'untrustedField'
    )
  })
  it('permits only editable patch fields and validates revision conflicts and recovery actions', () => {
    expect(
      validateScreenPatch({ title: '  新标题  ', id: 'overwrite', revision: 900, trashedAt: null })
    ).toEqual({ title: '新标题', trashedAt: null })
    for (const patch of [
      { title: ' ' },
      { comment: 'x'.repeat(20_001) },
      { strokes: [{}] },
      { expectedRevision: 0 },
      { trashedAt: -1 },
    ])
      expect(() => validateScreenPatch(patch)).toThrow()
    expect(() => validateScreenDraft({ ...draft, backgroundId: '../../file' })).toThrow()
  })
  it('rescales live ink after a logical display size change without moving frozen image anchors', () => {
    const resized = resizeScreenDraft(draft, 500, 300)
    expect(resized.strokes[0].points).toEqual([
      { x: 50, y: 60 },
      { x: 150, y: 75 },
    ])
    expect(resized.strokes[0].width).toBe(2)
    expect(resized.width).toBe(500)
    expect(draft.strokes[0].points[0]).toEqual({ x: 100, y: 120 })
    const frozen = { ...draft, backgroundId: 'image_1' }
    expect(resizeScreenDraft(frozen, 500, 300)).toBe(frozen)
  })
  it('starts with a small entry and falls back from invalid preferences', () => {
    expect(
      screenPreferences({ color: 'bad', toolbar: { x: Infinity, y: 0 }, size: 'huge' })
    ).toMatchObject({ color: '#e05d52', size: 'medium', collapsed: true, toolbar: null })
  })
})
