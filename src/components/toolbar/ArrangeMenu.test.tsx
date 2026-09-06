import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import type { SelectionCapabilities } from '../../store/slices/selectionCapabilities'
import ArrangeMenu from './ArrangeMenu'

const groupSelected = vi.fn()
const ungroupSelected = vi.fn()
const alignSelected = vi.fn()
const distributeSelected = vi.fn()
const reorderSelected = vi.fn()

const enabledCapabilities: SelectionCapabilities = {
  selectedIds: ['one', 'two', 'three'],
  count: 3,
  isLocked: false,
  canCopy: true,
  canDuplicate: true,
  canDelete: true,
  canLock: true,
  canUnlock: false,
  canGroup: true,
  canUngroup: true,
  canAlign: true,
  canDistribute: true,
  canReorder: {
    front: true,
    forward: true,
    backward: true,
    back: true,
  },
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: '排列' }))
  return screen.getByRole('menu', { name: '排列选中内容' })
}

function runCommand(label: string) {
  openMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: label }))
}

describe('ArrangeMenu', () => {
  beforeEach(() => {
    groupSelected.mockReset()
    ungroupSelected.mockReset()
    alignSelected.mockReset()
    distributeSelected.mockReset()
    reorderSelected.mockReset()
    useAppStore.setState({
      groupSelected,
      ungroupSelected,
      alignSelected,
      distributeSelected,
      reorderSelected,
    })
  })

  it('runs grouping, alignment, distribution, and layer-order commands', () => {
    render(<ArrangeMenu capabilities={enabledCapabilities} />)

    runCommand('分组')
    expect(groupSelected).toHaveBeenCalledOnce()
    runCommand('取消分组')
    expect(ungroupSelected).toHaveBeenCalledOnce()

    for (const [label, alignment] of [
      ['左对齐', 'alignLeft'],
      ['水平居中', 'alignCenterH'],
      ['右对齐', 'alignRight'],
      ['顶部对齐', 'alignTop'],
      ['垂直居中', 'alignCenterV'],
      ['底部对齐', 'alignBottom'],
    ] as const) {
      runCommand(label)
      expect(alignSelected).toHaveBeenLastCalledWith(alignment)
    }

    runCommand('水平分布')
    expect(distributeSelected).toHaveBeenLastCalledWith('distributeH')
    runCommand('垂直分布')
    expect(distributeSelected).toHaveBeenLastCalledWith('distributeV')

    for (const [label, mode] of [
      ['置于顶层', 'front'],
      ['上移一层', 'forward'],
      ['下移一层', 'backward'],
      ['置于底层', 'back'],
    ] as const) {
      runCommand(label)
      expect(reorderSelected).toHaveBeenLastCalledWith(mode)
    }

    expect(screen.getByRole('button', { name: '排列' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('maps capability flags to disabled menu items', () => {
    render(
      <ArrangeMenu
        capabilities={{
          ...enabledCapabilities,
          canGroup: false,
          canAlign: false,
          canDistribute: false,
          canReorder: {
            front: true,
            forward: false,
            backward: true,
            back: false,
          },
        }}
      />
    )
    openMenu()

    expect((screen.getByRole('menuitem', { name: '分组' }) as HTMLButtonElement).disabled).toBe(
      true
    )
    expect((screen.getByRole('menuitem', { name: '取消分组' }) as HTMLButtonElement).disabled).toBe(
      false
    )
    expect((screen.getByRole('menuitem', { name: '左对齐' }) as HTMLButtonElement).disabled).toBe(
      true
    )
    expect((screen.getByRole('menuitem', { name: '水平分布' }) as HTMLButtonElement).disabled).toBe(
      true
    )
    expect((screen.getByRole('menuitem', { name: '置于顶层' }) as HTMLButtonElement).disabled).toBe(
      false
    )
    expect((screen.getByRole('menuitem', { name: '上移一层' }) as HTMLButtonElement).disabled).toBe(
      true
    )
    expect((screen.getByRole('menuitem', { name: '下移一层' }) as HTMLButtonElement).disabled).toBe(
      false
    )
    expect((screen.getByRole('menuitem', { name: '置于底层' }) as HTMLButtonElement).disabled).toBe(
      true
    )

    fireEvent.click(screen.getByRole('menuitem', { name: '分组' }))
    expect(groupSelected).not.toHaveBeenCalled()
    expect(screen.getByRole('menu', { name: '排列选中内容' })).toBeTruthy()
  })
})
