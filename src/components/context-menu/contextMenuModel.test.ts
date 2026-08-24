import { describe, expect, it } from 'vitest'
import type { ShapeElement } from '../../store/types'
import {
  MENU_ITEM_HEIGHT,
  MENU_PADDING,
  MENU_WIDTH,
  getContextMenuPosition,
  getContextMenuSelectionState,
} from './contextMenuModel'

function makeShape(id: string, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
    ...overrides,
  }
}

describe('context menu model', () => {
  it('derives grouping, distribution, and lock capabilities from the selection', () => {
    const unlocked = makeShape('unlocked')
    const grouped = makeShape('grouped', { groupId: 'group-1', locked: true })
    const third = makeShape('third')

    expect(
      getContextMenuSelectionState([unlocked, grouped, third], [unlocked.id, grouped.id, third.id])
    ).toEqual({
      hasSelection: true,
      hasMultipleSelection: true,
      hasGroupableSelection: true,
      hasDistributableSelection: true,
      hasGroupedElements: true,
      hasLockedElements: true,
      hasUnlockedElements: true,
    })
  })

  it('ignores elements outside the current selection', () => {
    const selected = makeShape('selected')
    const unselected = makeShape('unselected', { groupId: 'group-1', locked: true })

    expect(getContextMenuSelectionState([selected, unselected], [selected.id])).toEqual({
      hasSelection: true,
      hasMultipleSelection: false,
      hasGroupableSelection: false,
      hasDistributableSelection: false,
      hasGroupedElements: false,
      hasLockedElements: false,
      hasUnlockedElements: true,
    })
  })

  it('keeps the menu inside the right and bottom viewport edges', () => {
    const menuHeight = MENU_PADDING * 2 + 5 * MENU_ITEM_HEIGHT + 3 * MENU_ITEM_HEIGHT + 2 * 8

    expect(
      getContextMenuPosition({
        x: 490,
        y: 390,
        viewportWidth: 500,
        viewportHeight: 400,
        hasSelection: true,
        hasMultipleSelection: true,
      })
    ).toEqual({
      x: 490 - MENU_WIDTH,
      y: 390 - menuHeight,
      menuWidth: MENU_WIDTH,
    })
  })

  it('preserves coordinates when the menu already fits', () => {
    expect(
      getContextMenuPosition({
        x: 20,
        y: 30,
        viewportWidth: 800,
        viewportHeight: 600,
        hasSelection: false,
        hasMultipleSelection: false,
      })
    ).toEqual({ x: 20, y: 30, menuWidth: MENU_WIDTH })
  })
})
