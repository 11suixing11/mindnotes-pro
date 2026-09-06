import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as DocumentExportModule from '../../canvas/documentExport'
import { createOpenFileEvent } from '../../appEvents'
import { CANVAS_IMPORT_MAX_JSON_BYTES } from '../../store/importLimits'
import ExportMenu from './ExportMenu'

const {
  appState,
  baseElement,
  baseLayer,
  canvasToBlobMock,
  confirmMock,
  replaceCurrentDocMock,
  renderDocumentMock,
  showToastMock,
} = vi.hoisted(() => {
  const layer = {
    id: 'layer-default',
    name: '图层 1',
    visible: true,
    locked: false,
    order: 0,
    createdAt: 1,
    updatedAt: 1,
  }
  const element = {
    type: 'shape' as const,
    id: 'shape-1',
    layerId: layer.id,
    kind: 'rectangle' as const,
    x: 10,
    y: 20,
    w: 100,
    h: 80,
    color: '#111827',
    size: 2,
  }
  const replaceCurrentDoc = vi.fn(async (_document: unknown) => 'replaced-doc')

  return {
    appState: {
      currentDocId: 'doc-1',
      docs: [
        {
          schemaVersion: 5 as const,
          id: 'doc-1',
          title: '测试画布',
          elements: [element],
          layers: [layer],
          activeLayerId: layer.id,
          bgColor: '#ffffff',
          backgroundStyle: 'plain' as const,
          folderId: null,
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      elements: [element],
      layers: [layer],
      activeLayerId: layer.id,
      bgColor: '#ffffff',
      backgroundStyle: 'plain' as const,
      replaceCurrentDoc,
    },
    baseElement: element,
    baseLayer: layer,
    canvasToBlobMock: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })),
    confirmMock: vi.fn(async () => true),
    replaceCurrentDocMock: replaceCurrentDoc,
    renderDocumentMock: vi.fn(async () => ({
      canvas: document.createElement('canvas'),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      scale: 1,
    })),
    showToastMock: vi.fn(),
  }
})

vi.mock('../../store/appStore', () => ({
  useAppStore: { getState: () => appState },
}))

vi.mock('../../store/useThemeStore', () => ({
  useThemeStore: (selector: (state: { isDarkMode: boolean }) => unknown) =>
    selector({ isDarkMode: false }),
}))

vi.mock('../../store/toastStore', () => ({
  useToastStore: (selector: (state: { show: typeof showToastMock }) => unknown) =>
    selector({ show: showToastMock }),
}))

vi.mock('../confirm-modal', () => ({
  useConfirm: () => confirmMock,
}))

vi.mock('../../canvas/documentExport', async (importOriginal) => {
  const actual = await importOriginal<typeof DocumentExportModule>()
  return {
    ...actual,
    canvasToBlob: canvasToBlobMock,
    renderDocumentToCanvas: renderDocumentMock,
  }
})

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

describe('ExportMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    appState.currentDocId = 'doc-1'
    appState.docs = [
      {
        ...appState.docs[0],
        elements: [baseElement],
        layers: [baseLayer],
        activeLayerId: baseLayer.id,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      },
    ]
    appState.elements = [baseElement]
    appState.layers = [baseLayer]
    appState.activeLayerId = baseLayer.id
    appState.bgColor = '#ffffff'
    appState.backgroundStyle = 'plain'
    showToastMock.mockReset()
    confirmMock.mockReset()
    confirmMock.mockResolvedValue(true)
    replaceCurrentDocMock.mockClear()
    renderDocumentMock.mockClear()
    canvasToBlobMock.mockClear()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    })
    document.body.innerHTML = ''
  })

  it('offers the supported formats without the fake Word export', () => {
    render(<ExportMenu />)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))

    expect(screen.getByRole('dialog', { name: '文件操作' })).toBeTruthy()
    expect(screen.getByText('导出文件')).toBeTruthy()
    expect(screen.getByText('导入备份')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PNG 图片' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'JPEG 图片' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PDF 文档' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'SVG 矢量图' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'JSON 备份' })).toBeTruthy()
    expect(screen.queryByText('Word 文档')).toBeNull()
  })

  it('hides the native file input from assistive technology and names its visible trigger', () => {
    const { container } = render(<ExportMenu />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')

    expect(input).toBeTruthy()
    expect(input?.getAttribute('aria-hidden')).toBe('true')
    expect(input?.getAttribute('tabindex')).toBe('-1')

    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    expect(screen.getByRole('button', { name: '导入 JSON 备份' })).toBeTruthy()
  })

  it('focuses the export dialog and restores focus when Escape closes it', async () => {
    render(<ExportMenu />)
    const trigger = screen.getByRole('button', { name: '文件' })
    fireEvent.click(trigger)

    const firstAction = screen.getByRole('button', { name: 'PNG 图片' })
    await waitFor(() => expect(document.activeElement).toBe(firstAction))

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: '文件操作' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('keeps keyboard focus inside the file dialog', async () => {
    render(<ExportMenu />)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))

    const firstAction = screen.getByRole('button', { name: 'PNG 图片' })
    const importAction = screen.getByRole('button', { name: '导入 JSON 备份' })
    await waitFor(() => expect(document.activeElement).toBe(firstAction))

    importAction.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(firstAction)

    firstAction.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(importAction)
  })

  it('uses one event handler to open the file menu without opening the picker', async () => {
    render(<ExportMenu />)
    const input = screen.getByLabelText('选择 JSON 文件') as HTMLInputElement
    const inputClick = vi.spyOn(input, 'click')

    window.dispatchEvent(createOpenFileEvent('menu'))

    await waitFor(() => expect(screen.getByRole('dialog', { name: '文件操作' })).toBeTruthy())
    expect(inputClick).not.toHaveBeenCalled()
  })

  it('opens the import picker exactly once for the import intent', () => {
    render(<ExportMenu />)
    const input = screen.getByLabelText('选择 JSON 文件') as HTMLInputElement
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => undefined)

    window.dispatchEvent(createOpenFileEvent('import'))

    expect(inputClick).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: '文件操作' })).toBeNull()
  })

  it('renders the full document and applies the selected JPEG quality', async () => {
    render(<ExportMenu />)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    const slider = screen.getByLabelText('JPEG 质量') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'JPEG 图片' }))

    await waitFor(() => expect(canvasToBlobMock).toHaveBeenCalled())
    expect(renderDocumentMock).toHaveBeenCalledWith(
      appState.elements,
      expect.objectContaining({ bgColor: '#ffffff', maxPixels: 16_000_000, transparent: false })
    )
    expect(canvasToBlobMock).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), 'image/jpeg', 0.6)
  })

  it('reuses the opaque render while estimating and exporting JPEG', async () => {
    render(<ExportMenu />)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))

    await waitFor(() => expect(canvasToBlobMock).toHaveBeenCalledTimes(1))
    expect(renderDocumentMock).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText('JPEG 质量'), { target: { value: '70' } })
    await waitFor(() => expect(canvasToBlobMock).toHaveBeenCalledTimes(2))
    expect(renderDocumentMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'JPEG 图片' }))

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('JPEG 导出成功', 'success'))
    expect(renderDocumentMock).toHaveBeenCalledTimes(1)
    expect(canvasToBlobMock).toHaveBeenCalledTimes(3)
    expect(canvasToBlobMock.mock.calls[2]).toEqual([
      expect.any(HTMLCanvasElement),
      'image/jpeg',
      0.7,
    ])
  })

  it('warns instead of exporting an empty document', async () => {
    appState.docs[0] = { ...appState.docs[0], elements: [] }
    appState.elements = []

    render(<ExportMenu />)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    fireEvent.click(screen.getByRole('button', { name: 'PNG 图片' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('画布中没有可导出的内容', 'warning')
    )
    expect(renderDocumentMock).not.toHaveBeenCalled()
    expect(canvasToBlobMock).not.toHaveBeenCalled()
  })

  it('imports a backup into the current single board', async () => {
    render(<ExportMenu />)
    const input = screen.getByLabelText('选择 JSON 文件') as HTMLInputElement
    const serialized = JSON.stringify({
      format: 'mindnotes-pro-backup',
      version: 4,
      exportedAt: '2026-07-31T00:00:00.000Z',
      document: {
        title: '导入测试',
        elements: appState.elements,
        layers: appState.layers,
        activeLayerId: appState.activeLayerId,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      },
    })
    const file = new File([serialized], 'backup.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: vi.fn(async () => serialized) })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(replaceCurrentDocMock).toHaveBeenCalledTimes(1))
    expect(replaceCurrentDocMock.mock.calls[0][0]).toMatchObject({ title: '导入测试' })
    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining('将替换当前画板'),
      expect.objectContaining({ confirmLabel: '替换并导入' })
    )
    expect(showToastMock).toHaveBeenCalledWith('已导入并替换当前画板', 'success')
  })

  it('keeps the current board unchanged when import replacement is cancelled', async () => {
    confirmMock.mockResolvedValueOnce(false)
    render(<ExportMenu />)
    const input = screen.getByLabelText('选择 JSON 文件') as HTMLInputElement
    const serialized = JSON.stringify({
      format: 'mindnotes-pro-backup',
      version: 4,
      exportedAt: '2026-07-31T00:00:00.000Z',
      document: {
        title: '取消导入',
        elements: appState.elements,
        layers: appState.layers,
        activeLayerId: appState.activeLayerId,
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      },
    })
    const file = new File([serialized], 'cancel.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: vi.fn(async () => serialized) })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
    expect(replaceCurrentDocMock).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith('已取消导入', 'info')
  })

  it('rejects oversized JSON files before reading them', async () => {
    render(<ExportMenu />)
    const input = screen.getByLabelText('选择 JSON 文件') as HTMLInputElement
    const file = new File(['{}'], 'large-backup.json', { type: 'application/json' })
    const text = vi.fn(async () => '{}')
    Object.defineProperties(file, {
      size: { configurable: true, value: CANVAS_IMPORT_MAX_JSON_BYTES + 1 },
      text: { configurable: true, value: text },
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('导入失败：JSON 文件过大，无法导入', 'error')
    )
    expect(text).not.toHaveBeenCalled()
    expect(replaceCurrentDocMock).not.toHaveBeenCalled()
  })
})
