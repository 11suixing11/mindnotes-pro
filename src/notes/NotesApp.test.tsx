import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotesApp from './NotesApp'
import type { NotesBridge, NotesWorkspaceState } from './desktop'

const initial: NotesWorkspaceState = {
  pages: [],
  currentUrl: null,
  title: '',
  loading: false,
  canGoBack: false,
  canGoForward: false,
  canUndo: false,
  canRedo: false,
  tool: 'browse',
  color: '#e0a11b',
  activeAnnotationId: null,
  unresolvedAnnotationIds: [],
  saveState: 'saved',
  recoveryNotice: null,
  error: null,
}

afterEach(() => {
  delete window.mindnotes
  vi.unstubAllGlobals()
})

describe('reading workspace', () => {
  it('opens a real webpage URL from the small homepage workflow', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined)
    window.mindnotes = {
      isDesktop: true,
      getState: vi.fn().mockResolvedValue(initial),
      subscribe: vi.fn().mockReturnValue(() => undefined),
      setViewport: vi.fn(),
      navigate,
    } as unknown as NotesBridge
    await act(async () => {
      render(<NotesApp />)
    })
    fireEvent.change(screen.getByRole('textbox', { name: '要批注的网页地址' }), {
      target: { value: 'example.com/article' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '打开网页' }))
    })
    expect(navigate).toHaveBeenCalledWith('https://example.com/article')
    expect(screen.queryByRole('button', { name: '模板库' })).toBeNull()
  })

  it('shows saved original quotes and gives the browser a viewport separate from notes', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    )
    const page = {
      url: 'https://example.com/read',
      title: '文章',
      createdAt: 1,
      updatedAt: 2,
      annotations: [
        {
          id: 'quote',
          kind: 'quote' as const,
          color: '#e0a11b' as const,
          points: [{ x: 20, y: 30 }],
          anchor: null,
          quote: { exact: '阅读时产生的想法可以再次使用。', prefix: '', suffix: '' },
          comment: '我的想法',
          createdAt: 1,
          updatedAt: 2,
        },
      ],
    }
    const setViewport = vi.fn()
    const updateAnnotation = vi.fn().mockResolvedValue(undefined)
    window.mindnotes = {
      isDesktop: true,
      getState: vi
        .fn()
        .mockResolvedValue({ ...initial, currentUrl: page.url, title: page.title, pages: [page] }),
      subscribe: vi.fn().mockReturnValue(() => undefined),
      setViewport,
      updateAnnotation,
    } as unknown as NotesBridge
    await act(async () => {
      render(<NotesApp />)
    })
    expect(screen.getByRole('toolbar', { name: '页面批注工具' })).toBeTruthy()
    expect(screen.getByText(page.annotations[0].quote.exact)).toBeTruthy()
    expect(
      screen.getByRole('textbox', { name: '第 1 条批注的笔记' }).getAttribute('value') ??
        (screen.getByRole('textbox', { name: '第 1 条批注的笔记' }) as HTMLTextAreaElement).value
    ).toBe('我的想法')
    expect(setViewport).toHaveBeenCalledWith(
      expect.objectContaining({ x: expect.any(Number), width: expect.any(Number) })
    )
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: '第 1 条批注的笔记' }), {
        target: { value: '刚输入就离开页面，也要保存。' },
      })
    })
    expect(updateAnnotation).toHaveBeenCalledWith(page.url, 'quote', '刚输入就离开页面，也要保存。')
  })

  it('keeps the recovery notice visible while an operation reports another result', async () => {
    const recoveryNotice =
      '已从上一次成功保存的副本恢复网页笔记，最近修改可能缺失。请核对笔记，并导出备份。'
    window.mindnotes = {
      isDesktop: true,
      getState: vi.fn().mockResolvedValue({ ...initial, recoveryNotice }),
      subscribe: vi.fn().mockReturnValue(() => undefined),
      setViewport: vi.fn(),
      importNotes: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotesBridge
    await act(async () => {
      render(<NotesApp />)
    })
    const file = { size: 1, text: async () => '{}' } as File
    await act(async () => {
      fireEvent.change(screen.getByLabelText('导入笔记文件'), { target: { files: [file] } })
    })
    expect(screen.getByRole('status', { name: '网页笔记恢复提示' }).textContent).toBe(
      recoveryNotice
    )
    expect(screen.getByRole('alert').textContent).toContain('笔记已合并导入')
  })

  it('reports failed import persistence and keeps the storage error when a later export succeeds', async () => {
    let publish: ((state: NotesWorkspaceState) => void) | undefined
    const failure = '导入内容尚未保存，已保留在当前窗口。请导出备份后重试。'
    const storageError = '原笔记文件无法读取，请先备份 page-notes.json 再重新打开应用。'
    const importedPage = {
      url: 'https://example.com/imported',
      title: '未保存的网页笔记',
      createdAt: 1,
      updatedAt: 2,
      annotations: [
        {
          id: 'imported_ink',
          kind: 'ink' as const,
          color: '#e05d52' as const,
          points: [
            { x: 10, y: 20 },
            { x: 120, y: 20 },
          ],
          anchor: null,
          quote: null,
          comment: '当前窗口中的想法',
          createdAt: 1,
          updatedAt: 2,
        },
      ],
    }
    const importNotes = vi.fn(async () => {
      publish?.({ ...initial, pages: [importedPage], saveState: 'error', error: storageError })
      throw new Error(failure)
    })
    window.mindnotes = {
      isDesktop: true,
      getState: vi.fn().mockResolvedValue(initial),
      subscribe: vi.fn((listener: (state: NotesWorkspaceState) => void) => {
        publish = listener
        return () => undefined
      }),
      setViewport: vi.fn(),
      importNotes,
      exportNotes: vi.fn().mockResolvedValue('recovered.json'),
    } as unknown as NotesBridge
    await act(async () => {
      render(<NotesApp />)
    })
    const file = { size: 1, text: async () => '{}' } as File
    await act(async () => {
      fireEvent.change(screen.getByLabelText('导入笔记文件'), { target: { files: [file] } })
    })
    expect(importNotes).toHaveBeenCalledWith('{}')
    expect(screen.getByRole('alert').textContent).toContain(failure)
    expect(screen.getByRole('alert').textContent).toContain(storageError)
    expect(screen.getByRole('alert').textContent).not.toContain('笔记已合并导入')
    expect(screen.getByRole('status', { name: '笔记保存状态' }).textContent).toBe('保存失败')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '导出全部' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /可编辑备份/ }))
    })
    expect(screen.getByRole('alert').textContent).toContain(storageError)
    expect(screen.getByRole('alert').textContent).toContain('笔记已导出')
    expect(screen.getByRole('status', { name: '笔记保存状态' }).textContent).toBe('保存失败')
  })
})
