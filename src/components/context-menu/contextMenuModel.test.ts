import { describe, expect, it } from 'vitest'
import type { ShapeElement } from '../../store/types'
import {
  getContextMenuPosition,
  getContextMenuSelectionState,
  getContextSubmenuPosition,
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

  it('clamps the measured menu inside the right and bottom viewport edges', () => {
    expect(
      getContextMenuPosition({
        x: 490,
        y: 390,
        menuWidth: 240,
        menuHeight: 300,
        viewportWidth: 500,
        viewportHeight: 400,
      })
    ).toEqual({
      x: 252,
      y: 92,
      menuWidth: 240,
      maxHeight: 384,
    })
  })

  it('preserves fitting coordinates and enforces the viewport margin', () => {
    expect(
      getContextMenuPosition({
        x: 20,
        y: 30,
        menuWidth: 200,
        menuHeight: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      })
    ).toEqual({ x: 20, y: 30, menuWidth: 200, maxHeight: 584 })

    expect(
      getContextMenuPosition({
        x: -20,
        y: -30,
        menuWidth: 200,
        menuHeight: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      })
    ).toMatchObject({ x: 8, y: 8 })
  })

  it('limits menus taller than the viewport to the available height', () => {
    expect(
      getContextMenuPosition({
        x: 100,
        y: 100,
        menuWidth: 200,
        menuHeight: 600,
        viewportWidth: 500,
        viewportHeight: 400,
      })
    ).toEqual({ x: 100, y: 8, menuWidth: 200, maxHeight: 384 })
  })

  it('places a submenu on the right when it fits and flips it left when needed', () => {
    expect(
      getContextSubmenuPosition({
        anchorLeft: 300,
        anchorRight: 340,
        anchorTop: 50,
        submenuWidth: 140,
        submenuHeight: 120,
        viewportWidth: 500,
        viewportHeight: 400,
      })
    ).toEqual({ x: 336, y: 50, maxHeight: 384, placement: 'right' })

    expect(
      getContextSubmenuPosition({
        anchorLeft: 450,
        anchorRight: 490,
        anchorTop: 340,
        submenuWidth: 140,
        submenuHeight: 200,
        viewportWidth: 500,
        viewportHeight: 400,
      })
    ).toEqual({ x: 314, y: 192, maxHeight: 384, placement: 'left' })
  })

  it('clamps oversized submenus and exposes the available scrolling height', () => {
    expect(
      getContextSubmenuPosition({
        anchorLeft: 80,
        anchorRight: 120,
        anchorTop: 200,
        submenuWidth: 180,
        submenuHeight: 600,
        viewportWidth: 200,
        viewportHeight: 400,
      })
    ).toEqual({ x: 12, y: 8, maxHeight: 384, placement: 'right' })
  })
})
