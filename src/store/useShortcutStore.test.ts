import { beforeEach, describe, expect, it } from 'vitest'
import { createShortcutExport, DEFAULT_SHORTCUT_BINDINGS } from '../keyboard/shortcuts'
import { SHORTCUT_STORAGE_KEY, useShortcutStore } from './useShortcutStore'

describe('useShortcutStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useShortcutStore.getState().resetShortcuts()
  })

  it('sets and persists a custom shortcut', () => {
    const result = useShortcutStore.getState().setShortcut('tool.pen', { key: 'P' })

    expect(result.ok).toBe(true)
    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual({ key: 'P' })
    expect(localStorage.getItem(SHORTCUT_STORAGE_KEY)).toContain('"tool.pen"')
  })

  it('rejects conflicting custom shortcuts', () => {
    const result = useShortcutStore.getState().setShortcut('tool.pen', { key: '0' })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Select tool')
    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual(
      DEFAULT_SHORTCUT_BINDINGS['tool.pen']
    )
  })

  it('imports exported shortcut JSON', () => {
    const json = createShortcutExport({
      ...DEFAULT_SHORTCUT_BINDINGS,
      'tool.pen': { key: 'P' },
    })

    const result = useShortcutStore.getState().importShortcuts(json)

    expect(result.ok).toBe(true)
    expect(useShortcutStore.getState().bindings['tool.pen']).toEqual({ key: 'P' })
  })

  it('rejects invalid import JSON', () => {
    const result = useShortcutStore.getState().importShortcuts('not-json{{')

    expect(result.ok).toBe(false)
    expect(useShortcutStore.getState().bindings).toEqual(DEFAULT_SHORTCUT_BINDINGS)
  })

  it('resets shortcuts and clears persisted configuration', () => {
    useShortcutStore.getState().setShortcut('tool.pen', { key: 'P' })

    useShortcutStore.getState().resetShortcuts()

    expect(useShortcutStore.getState().bindings).toEqual(DEFAULT_SHORTCUT_BINDINGS)
    expect(localStorage.getItem(SHORTCUT_STORAGE_KEY)).toBeNull()
  })
})
