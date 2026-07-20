import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
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
})
