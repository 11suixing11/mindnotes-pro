import { create } from 'zustand'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CanvasElement } from '../types'
import type { SelectionStyleApplyResult, SelectionStylePatch } from './canvasElementStyle'
import {
  COLOR_HISTORY_KEY,
  MAX_COLOR_HISTORY,
  createToolSettingsSlice,
  type ToolSettingsActions,
  type ToolSettingsState,
} from './toolSettings'

function createToolSettingsStore() {
  return create<ToolSettingsState & ToolSettingsActions>()((set, get) =>
    createToolSettingsSlice(set, get)
  )
}

type StyleCommandHarness = ToolSettingsState &
  ToolSettingsActions & {
    selectedIds: string[]
    idToElement: Map<string, CanvasElement>
    applyStyleToSelected: (patch: SelectionStylePatch) => SelectionStyleApplyResult
  }

function createStyleCommandStore(result: SelectionStyleApplyResult) {
  return create<StyleCommandHarness>()((set, get) => ({
    ...createToolSettingsSlice(set, get),
    selectedIds: [],
    idToElement: new Map(),
    applyStyleToSelected: vi.fn(() => result),
  }))
}

describe('toolSettings slice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads recent colors from localStorage on initialization', () => {
    localStorage.setItem(COLOR_HISTORY_KEY, JSON.stringify(['#111111', '#222222', 123, '']))

    const store = createToolSettingsStore()

    expect(store.getState().colorHistory).toEqual(['#111111', '#222222'])
  })

  it('falls back to an empty recent color list when localStorage data is invalid', () => {
    localStorage.setItem(COLOR_HISTORY_KEY, 'not-json{{')

    const store = createToolSettingsStore()

    expect(store.getState().colorHistory).toEqual([])
  })

  it('deduplicates, limits, and persists recent colors', () => {
    const store = createToolSettingsStore()
    const colors = Array.from(
      { length: MAX_COLOR_HISTORY + 1 },
      (_, index) => `#${index.toString(16).padStart(6, '0')}`
    )

    for (const color of colors) {
      store.getState().setColor(color)
    }
    store.getState().setColor(colors[3])

    const expected = [
      colors[3],
      ...colors
        .filter((color) => color !== colors[3])
        .reverse()
        .slice(0, MAX_COLOR_HISTORY - 1),
    ]

    expect(store.getState().colorHistory).toEqual(expected)
    expect(JSON.parse(localStorage.getItem(COLOR_HISTORY_KEY) ?? '[]')).toEqual(expected)
  })

  it('updates only creation defaults when there is no selection', () => {
    const store = createStyleCommandStore({
      status: 'blocked',
      reason: 'empty-selection',
      affectedIds: [],
      lockedIds: [],
      applicableKeys: [],
      ignoredKeys: [],
    })

    const result = store.getState().applyStyle({
      color: '#123456',
      size: 8,
      brush: 'marker',
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      backgroundColor: '#fff3bf',
    })

    expect(result.status).toBe('defaults-updated')
    expect(store.getState()).toMatchObject({
      color: '#123456',
      size: 8,
      brush: 'marker',
      textDefaults: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#fff3bf',
      },
    })
    expect(store.getState().applyStyleToSelected).not.toHaveBeenCalled()
  })

  it('updates selection and creation defaults after a successful style command', () => {
    const store = createStyleCommandStore({
      status: 'applied',
      affectedIds: ['shape-1'],
      applicableKeys: ['color'],
      ignoredKeys: ['brush'],
    })
    store.setState({ selectedIds: ['shape-1'] })

    const patch: SelectionStylePatch = { color: '#abcdef', brush: 'pencil' }
    const result = store.getState().applyStyle(patch)

    expect(result.status).toBe('applied')
    expect(store.getState().applyStyleToSelected).toHaveBeenCalledWith(patch)
    expect(store.getState()).toMatchObject({ color: '#abcdef', brush: 'pencil' })
  })

  it('does not update defaults when a selected batch is locked', () => {
    const store = createStyleCommandStore({
      status: 'blocked',
      reason: 'locked-selection',
      affectedIds: ['shape-1'],
      lockedIds: ['shape-1'],
      applicableKeys: ['color'],
      ignoredKeys: [],
    })
    store.setState({ selectedIds: ['shape-1'] })

    const result = store.getState().applyStyle({ color: '#abcdef' })

    expect(result.status).toBe('blocked')
    expect(store.getState().color).toBe('#2c2416')
    expect(store.getState().colorHistory).toEqual([])
  })
})
