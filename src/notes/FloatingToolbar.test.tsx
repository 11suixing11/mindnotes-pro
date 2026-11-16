import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FloatingToolbar from './FloatingToolbar'
import type { FloatingBridge, FloatingState } from './floating'

const initial: FloatingState = {
  tool: 'pointer',
  color: '#e05d52',
  size: 'medium',
  collapsed: true,
  capturing: false,
  count: 0,
  canUndo: false,
  canRedo: false,
  message: null,
  shortcutAvailable: false,
  frozen: false,
  recovered: false,
  saveState: 'saved',
  panel: null,
}

afterEach(() => {
  delete window.mindnotesFloating
})

async function mount(state = initial) {
  let listener: ((value: FloatingState) => void) | undefined
  const command = vi.fn().mockResolvedValue(undefined)
  window.mindnotesFloating = {
    surface: 'toolbar',
    getState: vi.fn().mockResolvedValue(state),
    subscribe: (receive) => {
      listener = receive
      return () => undefined
    },
    configure: vi.fn().mockResolvedValue(undefined),
    command,
  } satisfies FloatingBridge
  await act(async () => {
    render(<FloatingToolbar />)
  })
  return { command, change: (next: FloatingState) => act(() => listener?.(next)) }
}

describe('floating shortcut fallback', () => {
  it('explains an unavailable shortcut and keeps manual expansion and collapse working', async () => {
    const { command, change } = await mount()
    const expand = screen.getByRole('button', { name: '展开悬浮批注' })
    expect(expand.title).toContain('快捷键不可用')
    expect(expand.title).not.toContain('Alt+Shift+M')
    fireEvent.click(expand)
    expect(command).toHaveBeenCalledWith('expand')
    change({ ...initial, collapsed: false })
    expect(screen.getByText('快捷键不可用')).not.toBeNull()
    const collapse = screen.getByRole('button', { name: '收起悬浮批注' })
    expect(collapse.title).not.toContain('Alt+Shift+M')
    fireEvent.click(collapse)
    expect(command).toHaveBeenCalledWith('collapse')
  })

  it('shows the shortcut when registered and updates feedback without hiding a recovery notice', async () => {
    const { change } = await mount({ ...initial, shortcutAvailable: true })
    expect(screen.getByRole('button', { name: '展开悬浮批注' }).title).toContain('Alt+Shift+M')
    change({ ...initial, collapsed: false, shortcutAvailable: true })
    expect(screen.getByText('Alt+Shift+M')).not.toBeNull()
    change({ ...initial, collapsed: false })
    expect(screen.getByText('快捷键不可用')).not.toBeNull()
    expect(screen.queryByText('Alt+Shift+M')).toBeNull()
    change({ ...initial, recovered: true, count: 20 })
    const expand = screen.getByRole('button', { name: '展开悬浮批注' })
    expect(expand.title).toContain('上次批注已恢复')
    expect(expand.title).toContain('快捷键不可用')
  })
})

describe('Linux mouse-mode ink hint', () => {
  const hint = '鼠标模式暂时隐藏笔迹，切回画笔立即恢复'

  it('explains temporary hiding in the real pointer toolbar without changing its accessible controls', async () => {
    const { change } = await mount({
      ...initial,
      collapsed: false,
      count: 4,
      mouseModeHidesInk: true,
    })
    expect(screen.getByRole('status').textContent).toContain(hint)
    expect(screen.getByRole('button', { name: '鼠标' }).title).toContain(hint)
    expect(screen.getByRole('button', { name: '画笔' })).not.toBeNull()
    change({ ...initial, collapsed: false, frozen: true, mouseModeHidesInk: true })
    expect(screen.getByRole('status').textContent).toContain(hint)
    change({ ...initial, collapsed: false, tool: 'pen', mouseModeHidesInk: true })
    expect(screen.getByRole('status').textContent).toBe('实时屏幕 · Esc 返回鼠标')
  })

  it('retains recovery and save-error feedback while keeping the mouse-mode explanation available', async () => {
    const message = '上次的批注已恢复，展开后可继续。'
    const { change } = await mount({
      ...initial,
      collapsed: false,
      recovered: true,
      count: 4,
      mouseModeHidesInk: true,
      message,
    })
    expect(screen.getByRole('status').textContent).toBe(message)
    expect(screen.getByRole('button', { name: '鼠标' }).title).toContain(hint)
    change({ ...initial, collapsed: false, mouseModeHidesInk: true, saveState: 'error' })
    expect(screen.getByRole('status').textContent).toContain('自动保存失败')
    expect(screen.getByRole('button', { name: '重试自动保存' })).not.toBeNull()
  })

  it('keeps a failed IPC operation visible instead of replacing it with the Linux hint', async () => {
    const { command } = await mount({ ...initial, collapsed: false, mouseModeHidesInk: true })
    command.mockRejectedValue(new Error('数据库无法写入，请备份后重试。'))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '更多操作' })))
    expect(screen.getByRole('status').textContent).toBe('数据库无法写入，请备份后重试。')
    expect(screen.getByRole('button', { name: '鼠标' }).title).toContain(hint)
  })

  it('keeps the existing Windows toolbar when the optional runtime flag is absent', async () => {
    await mount({ ...initial, collapsed: false })
    expect(screen.getByRole('status').textContent).toBe('操作下层软件 · 草稿已保存')
    expect(screen.getByRole('button', { name: '鼠标' }).title).toBe('操作下层软件 · Esc')
    expect(screen.queryByText(hint)).toBeNull()
  })
})
