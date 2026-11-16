import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PageNotebook } from './model'
import type { ScreenNotebookBridge, ScreenNoteSummary } from './screenNotebook'
import ScreenNotebookLibrary from './ScreenNotebookLibrary'

function summary(index: number, trash = false): ScreenNoteSummary {
  return {
    id: `note-${index}`,
    title: `笔记 ${index}`,
    preview: '可继续编辑的批注',
    source: { app: '演示软件', title: '演示页面', display: '屏幕' },
    createdAt: 1,
    updatedAt: index + 1,
    strokeCount: 1,
    trashedAt: trash ? 1 : null,
    thumbnail: 'data:image/png;base64,',
  }
}

function notebook(count = 2, trash = false) {
  let notes = Array.from({ length: count }, (_, index) => summary(index + 1, trash))
  const listeners = new Set<() => void>()
  const changed = () => listeners.forEach((listener) => listener())
  const list = vi.fn(async (query = '', offset = 0, onlyTrash = false) => {
    const matches = notes.filter(
      (note) =>
        Boolean(note.trashedAt) === onlyTrash &&
        note.title.toLowerCase().includes(query.toLowerCase())
    )
    return { notes: matches.slice(offset, offset + 50), total: matches.length, offset }
  })
  const bridge: ScreenNotebookBridge = {
    isDesktop: true,
    list,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getNote: vi.fn(),
    getImage: vi.fn(),
    updateNote: vi.fn(async (id, patch) => {
      const note = notes.find((entry) => entry.id === id)!
      notes = notes.map((entry) =>
        entry.id === id ? { ...entry, trashedAt: patch.trashedAt ?? null } : entry
      )
      changed()
      return {
        id,
        title: note.title,
        comment: '',
        updatedAt: note.updatedAt + 1,
        revision: 2,
        trashedAt: patch.trashedAt ?? null,
      }
    }),
    exportNote: vi.fn(),
    exportRecovery: vi.fn(),
    exportAll: vi.fn(),
    importBackup: vi.fn(),
    flushEdits: vi.fn(),
  }
  window.mindnotesNotebook = bridge
  return {
    bridge,
    list,
    changed,
    replace(next: ScreenNoteSummary[]) {
      notes = next
      changed()
    },
  }
}

const page: PageNotebook = {
  url: 'https://example.com/article',
  title: '阅读笔记',
  createdAt: 1,
  updatedAt: 2,
  annotations: [
    {
      id: 'quote',
      kind: 'quote',
      color: '#e0a11b',
      points: [{ x: 10, y: 20 }],
      anchor: null,
      quote: { exact: '可以复用的原文', prefix: '', suffix: '' },
      comment: '阅读结论',
      createdAt: 1,
      updatedAt: 2,
    },
  ],
}

function screenCards() {
  return screen.queryAllByRole('button', { name: /^打开屏幕笔记 / })
}

afterEach(() => {
  delete window.mindnotesNotebook
})

describe('screen notebook library recovery', () => {
  it.each([51, 101])('returns to the last valid page after trashing note %i', async (total) => {
    notebook(total)
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screenCards()).toHaveLength(50))
    for (let offset = 50; offset < total; offset += 50) {
      fireEvent.click(screen.getByRole('button', { name: '下一页' }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: `打开屏幕笔记 笔记 ${offset + 1}` })).toBeTruthy()
      )
    }
    fireEvent.click(screen.getByRole('button', { name: `移到回收站 笔记 ${total}` }))
    await waitFor(() => expect(screenCards()).toHaveLength(50))
    expect(screen.getByRole('button', { name: `打开屏幕笔记 笔记 ${total - 1}` })).toBeTruthy()
    expect(screen.queryByText('点击悬浮条“保存笔记”，或打开网页开始记录。')).toBeNull()
    expect(screen.getByText('笔记已移到回收站，可随时恢复。')).toBeTruthy()
    if (total === 51) expect(screen.queryByRole('button', { name: '上一页' })).toBeNull()
    else expect(screen.getByText('51–100 / 100')).toBeTruthy()
  })

  it('returns to the remaining trash after restoring the only note on the last page', async () => {
    notebook(51, true)
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '回收站' }))
    await waitFor(() => expect(screenCards()).toHaveLength(50))
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() => expect(screenCards()).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: '恢复屏幕笔记 笔记 51' }))
    await waitFor(() => expect(screenCards()).toHaveLength(50))
    expect(screen.getByRole('button', { name: '打开屏幕笔记 笔记 50' })).toBeTruthy()
    expect(screen.queryByText('回收站是空的。')).toBeNull()
  })

  it('returns to offset zero if a change removes every note while viewing the last page', async () => {
    const store = notebook(51)
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screenCards()).toHaveLength(50))
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() => expect(screenCards()).toHaveLength(1))
    act(() => store.replace([]))
    await waitFor(() => expect(screenCards()).toHaveLength(0))
    await waitFor(() => expect(store.list).toHaveBeenLastCalledWith('', 0, false))
    expect(screen.getByText('点击悬浮条“保存笔记”，或打开网页开始记录。')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '上一页' })).toBeNull()
  })

  it('offers direct retry after an initial read failure and clears the error on success', async () => {
    const store = notebook()
    store.list.mockRejectedValueOnce(new Error('读取暂时失败。'))
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/读取暂时失败/)).toBeTruthy())
    expect(screen.queryByText('点击悬浮条“保存笔记”，或打开网页开始记录。')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重试读取' }))
    await waitFor(() => expect(screenCards()).toHaveLength(2))
    expect(screen.queryByText(/读取暂时失败/)).toBeNull()
    expect(screen.queryByRole('button', { name: '重试读取' })).toBeNull()
  })

  it('does not present a failed read as a successfully empty library', async () => {
    const store = notebook(0)
    store.list.mockRejectedValue(new Error('读取暂时失败。'))
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/读取暂时失败/)).toBeTruthy())
    expect(screen.queryByText('点击悬浮条“保存笔记”，或打开网页开始记录。')).toBeNull()
    expect(screen.queryByText('没有匹配的笔记。')).toBeNull()
  })

  it('clears an old read error when switching filters successfully reloads notes', async () => {
    const store = notebook()
    store.list.mockRejectedValueOnce(new Error('读取暂时失败。'))
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/读取暂时失败/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '屏幕批注' }))
    await waitFor(() => expect(screenCards()).toHaveLength(2))
    expect(screen.queryByText(/读取暂时失败/)).toBeNull()
  })

  it('does not relabel ordinary notes as trash when reading the trash fails', async () => {
    const store = notebook()
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screenCards()).toHaveLength(2))
    store.list.mockRejectedValueOnce(new Error('回收站读取暂时失败。'))
    fireEvent.click(screen.getByRole('button', { name: '回收站' }))
    await waitFor(() => expect(screen.getByText(/回收站读取暂时失败/)).toBeTruthy())
    expect(screenCards()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /^恢复屏幕笔记 / })).toBeNull()
    expect(screen.queryByText('回收站是空的。')).toBeNull()
  })

  it('does not show unrelated cached notes when a different search fails', async () => {
    const store = notebook()
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screenCards()).toHaveLength(2))
    store.list.mockRejectedValueOnce(new Error('搜索读取暂时失败。'))
    fireEvent.change(screen.getByRole('textbox', { name: '搜索全部笔记' }), {
      target: { value: '笔记 2' },
    })
    await waitFor(() => expect(screen.getByText(/搜索读取暂时失败/)).toBeTruthy())
    expect(screenCards()).toHaveLength(0)
    expect(screen.queryByText('没有匹配的笔记。')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重试读取' }))
    await waitFor(() => expect(screenCards()).toHaveLength(1))
    expect(screen.getByRole('button', { name: '打开屏幕笔记 笔记 2' })).toBeTruthy()
  })

  it('keeps the last successful view through a refresh failure and replaces it after retry', async () => {
    const store = notebook()
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screenCards()).toHaveLength(2))
    store.list.mockRejectedValueOnce(new Error('刷新暂时失败。'))
    act(() => store.replace([summary(2)]))
    await waitFor(() => expect(screen.getByText(/刷新暂时失败/)).toBeTruthy())
    expect(screenCards()).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '重试读取' }))
    await waitFor(() => expect(screenCards()).toHaveLength(1))
    expect(screen.queryByRole('button', { name: '打开屏幕笔记 笔记 1' })).toBeNull()
    expect(screen.queryByText(/刷新暂时失败/)).toBeNull()
  })

  it('disables repeat retries and keeps failure guidance until the pending read succeeds', async () => {
    const store = notebook()
    store.list.mockRejectedValueOnce(new Error('读取暂时失败。'))
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/读取暂时失败/)).toBeTruthy())
    let resolveRead!: (result: {
      notes: ScreenNoteSummary[]
      total: number
      offset: number
    }) => void
    store.list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve
        })
    )
    fireEvent.click(screen.getByRole('button', { name: '重试读取' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: '重试读取' }) as HTMLButtonElement).disabled).toBe(
        true
      )
    )
    expect(screen.queryByText('点击悬浮条“保存笔记”，或打开网页开始记录。')).toBeNull()
    await act(async () => resolveRead({ notes: [summary(1)], total: 1, offset: 0 }))
    await waitFor(() => expect(screenCards()).toHaveLength(1))
    expect(screen.queryByText(/读取暂时失败/)).toBeNull()
  })

  it('ignores an outdated response after a new search has completed', async () => {
    const store = notebook()
    let resolveInitial!: (result: {
      notes: ScreenNoteSummary[]
      total: number
      offset: number
    }) => void
    store.list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve
        })
    )
    render(<ScreenNotebookLibrary pages={[]} openPage={vi.fn()} />)
    await waitFor(() => expect(store.list).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('textbox', { name: '搜索全部笔记' }), {
      target: { value: '笔记 2' },
    })
    await waitFor(() => expect(screenCards()).toHaveLength(1))
    await act(async () => resolveInitial({ notes: [summary(1), summary(2)], total: 2, offset: 0 }))
    expect(screenCards()).toHaveLength(1)
    expect(screen.queryByRole('button', { name: '打开屏幕笔记 笔记 1' })).toBeNull()
  })

  it('keeps webpage notes usable without another screen-library read', async () => {
    const store = notebook()
    const openPage = vi.fn()
    store.list.mockRejectedValue(new Error('屏幕读取暂时失败。'))
    render(<ScreenNotebookLibrary pages={[page]} openPage={openPage} />)
    await waitFor(() => expect(screen.getByText(/屏幕读取暂时失败/)).toBeTruthy())
    const reads = store.list.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: '网页笔记' }))
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(store.list).toHaveBeenCalledTimes(reads)
    expect(screen.queryByText(/屏幕读取暂时失败/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '打开网页笔记 阅读笔记' }))
    expect(openPage).toHaveBeenCalledWith(page.url)
  })
})
