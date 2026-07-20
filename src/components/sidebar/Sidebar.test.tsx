import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import type { CanvasDoc } from '../../store/types'
import Sidebar from './Sidebar'

const { confirmMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
}))

vi.mock('../confirm-modal', () => ({
  useConfirm: () => confirmMock,
}))

const doc: CanvasDoc = {
  id: 'doc-1',
  title: 'Original',
  elements: [],
  bgColor: '#ffffff',
  folderId: null,
  createdAt: 1,
  updatedAt: 1,
}

function makeDoc(overrides: Partial<CanvasDoc>): CanvasDoc {
  return {
    ...doc,
    ...overrides,
    elements: overrides.elements ?? doc.elements,
  }
}

describe('Sidebar document rename', () => {
  const renameDoc = vi.fn(async (id: string, title: string) => {
    useAppStore.setState((state) => ({
      docs: state.docs.map((item) => (item.id === id ? { ...item, title } : item)),
    }))
  })

  beforeEach(() => {
    localStorage.clear()
    confirmMock.mockReset()
    renameDoc.mockClear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    useAppStore.setState({
      docs: [doc],
      currentDocId: doc.id,
      sidebarOpen: true,
      documentSearchQuery: '',
      recentDocumentSearches: [],
      renameDoc,
      openDoc: vi.fn(async () => undefined),
      createDoc: vi.fn(async () => 'doc-2'),
      duplicateDoc: vi.fn(async () => undefined),
      deleteDoc: vi.fn(async () => undefined),
    })
  })

  it('confirms an inline rename with Enter and updates the sidebar', async () => {
    confirmMock.mockResolvedValue(true)
    render(<Sidebar />)

    fireEvent.doubleClick(screen.getByText('Original'))
    const input = screen.getByRole('textbox', { name: 'Rename Original' })
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith('Rename "Original" to "Renamed"?', {
        confirmLabel: 'Rename',
        cancelLabel: 'Keep editing',
        danger: false,
      })
    )
    await waitFor(() => expect(renameDoc).toHaveBeenCalledWith(doc.id, 'Renamed'))
    expect(screen.getByText('Renamed')).toBeTruthy()
  })

  it('cancels an inline rename with Escape', () => {
    render(<Sidebar />)

    fireEvent.doubleClick(screen.getByText('Original'))
    const input = screen.getByRole('textbox', { name: 'Rename Original' })
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(renameDoc).not.toHaveBeenCalled()
    expect(screen.getByText('Original')).toBeTruthy()
  })

  it('keeps editing and restores focus when blur confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false)
    render(<Sidebar />)

    fireEvent.doubleClick(screen.getByText('Original'))
    const input = screen.getByRole('textbox', { name: 'Rename Original' })
    fireEvent.change(input, { target: { value: 'Maybe Later' } })
    fireEvent.blur(input)

    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    await waitFor(() => expect(document.activeElement).toBe(input))
    expect(renameDoc).not.toHaveBeenCalled()
    expect((input as HTMLInputElement).value).toBe('Maybe Later')
  })

  it('starts inline editing from the document context menu', () => {
    render(<Sidebar />)

    fireEvent.contextMenu(screen.getByRole('listitem'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))

    expect(screen.getByRole('textbox', { name: 'Rename Original' })).toBeTruthy()
  })

  it('uses the real document background color for the active canvas preview', async () => {
    const fillStyles: string[] = []
    const context = {
      set fillStyle(value: string) {
        fillStyles.push(value)
      },
      get fillStyle() {
        return fillStyles[fillStyles.length - 1] ?? '#000000'
      },
      setTransform: vi.fn(),
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    useAppStore.setState({
      docs: [makeDoc({ bgColor: '#fef3c7' })],
      currentDocId: doc.id,
    })

    render(<Sidebar />)

    await waitFor(() => expect(fillStyles).toContain('#fef3c7'))
    expect(fillStyles).not.toContain('var(--primary-bg)')
  })

  it('filters documents by title and highlights matching text', () => {
    useAppStore.setState({
      docs: [
        doc,
        makeDoc({
          id: 'doc-2',
          title: 'Project Plan',
          updatedAt: 2,
        }),
      ],
    })
    render(<Sidebar />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search documents' }), {
      target: { value: 'project' },
    })

    expect(screen.getByText('Project')).toBeTruthy()
    expect(screen.getByText('Project').closest('mark')).toBeTruthy()
    expect(screen.getByText('1 of 2 documents')).toBeTruthy()
    expect(screen.queryByText('Original')).toBeNull()
  })

  it('searches document text elements and shows a highlighted snippet', () => {
    useAppStore.setState({
      docs: [
        doc,
        makeDoc({
          id: 'doc-2',
          title: 'Meeting Notes',
          elements: [
            {
              type: 'text',
              id: 'text-1',
              x: 0,
              y: 0,
              width: 200,
              height: 40,
              content: 'Budget timeline and launch checklist',
              fontSize: 16,
              color: '#111111',
            },
          ],
          updatedAt: 2,
        }),
      ],
    })
    render(<Sidebar />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search documents' }), {
      target: { value: 'timeline' },
    })

    expect(screen.getByText('Meeting Notes')).toBeTruthy()
    expect(screen.getByText('timeline')).toBeTruthy()
    expect(screen.getByText('timeline').closest('mark')).toBeTruthy()
    expect(screen.getByText('1 of 2 documents')).toBeTruthy()
    expect(screen.queryByText('Original')).toBeNull()
  })

  it('stores recent searches and can run them again', () => {
    render(<Sidebar />)

    const input = screen.getByRole('searchbox', { name: 'Search documents' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'original' } })
    fireEvent.submit(input.closest('form')!)

    expect(screen.getByRole('button', { name: 'Search again: original' })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('mn-sidebar-searches') ?? '[]')).toEqual(['original'])

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search again: original' }))

    expect(input.value).toBe('original')
    expect(screen.getByText('Original')).toBeTruthy()
  })
})
