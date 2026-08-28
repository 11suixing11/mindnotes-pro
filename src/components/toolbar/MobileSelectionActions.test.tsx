import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '../../store/appStore'
import type { CanvasElement } from '../../store/types'
import MobileSelectionActions from './MobileSelectionActions'

const elements: CanvasElement[] = [
  {
    type: 'shape',
    id: 'left',
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  },
  {
    type: 'shape',
    id: 'middle',
    kind: 'rectangle',
    x: 40,
    y: 10,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  },
  {
    type: 'shape',
    id: 'right',
    kind: 'rectangle',
    x: 80,
    y: 20,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  },
]

describe('MobileSelectionActions', () => {
  beforeEach(() => {
    useAppStore.setState({ elements, selectedIds: elements.map((element) => element.id) })
  })

  it('offers the complete touch selection action set', () => {
    const groupSelected = vi.fn()
    const lockSelected = vi.fn()
    const alignSelected = vi.fn()
    const distributeSelected = vi.fn()
    const removeElements = vi.fn()
    useAppStore.setState({
      groupSelected,
      lockSelected,
      alignSelected,
      distributeSelected,
      removeElements,
    })

    render(<MobileSelectionActions />)

    fireEvent.click(screen.getByRole('button', { name: '分组' }))
    fireEvent.click(screen.getByRole('button', { name: '锁定元素' }))
    fireEvent.change(screen.getByRole('combobox', { name: '对齐选中元素' }), {
      target: { value: 'alignLeft' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: '分布选中元素' }), {
      target: { value: 'distributeH' },
    })
    fireEvent.click(screen.getByRole('button', { name: '删除选中元素' }))

    expect(groupSelected).toHaveBeenCalledOnce()
    expect(lockSelected).toHaveBeenCalledOnce()
    expect(alignSelected).toHaveBeenCalledWith('alignLeft')
    expect(distributeSelected).toHaveBeenCalledWith('distributeH')
    expect(removeElements).toHaveBeenCalledWith(['left', 'middle', 'right'])
  })

  it('does not render when there is no selection', () => {
    useAppStore.setState({ selectedIds: [] })
    render(<MobileSelectionActions />)

    expect(screen.queryByRole('toolbar', { name: '选中元素操作' })).toBeNull()
  })
})
