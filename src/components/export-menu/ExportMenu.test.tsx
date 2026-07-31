import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as DocumentExportModule from '../../canvas/documentExport'
import ExportMenu from './ExportMenu'

const {
  appState,
  baseElement,
  baseLayer,
  canvasToBlobMock,
  importDocMock,
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
  const importDoc = vi.fn(async (_document: unknown) => 'imported-doc')

  return {
    appState: {
      currentDocId: 'doc-1',
      docs: [
        {
          schemaVersion: 4 as const,
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
      importDoc,
    },
    baseElement: element,
    baseLayer: layer,
    canvasToBlobMock: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })),
    importDocMock: importDoc,
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
    importDocMock.mockClear()
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
    fireEvent.click(screen.getByRole('button', { name: '导出' }))

    expect(screen.getByRole('dialog', { name: '导出选项' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PNG 图片' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'JPEG 图片' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PDF 文档' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'SVG 矢量图' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'JSON 备份' })).toBeTruthy()
    expect(screen.queryByText('Word 文档')).toBeNull()
  })

  it('focuses the export dialog and restores focus when Escape closes it', async () => {
    render(<ExportMenu />)
    const trigger = screen.getByRole('button', { name: '导出' })
    fireEvent.click(trigger)

    const firstAction = screen.getByRole('button', { name: 'PNG 图片' })
    await waitFor(() => expect(document.activeElement).toBe(firstAction))

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: '导出选项' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('renders the full document and applies the selected JPEG quality', async () => {
    render(<ExportMenu />)
    fireEvent.click(screen.getByRole('button', { name: '导出' }))
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
    fireEvent.click(screen.getByRole('button', { name: '导出' }))

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
    fireEvent.click(screen.getByRole('button', { name: '导出' }))
    fireEvent.click(screen.getByRole('button', { name: 'PNG 图片' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('画布中没有可导出的内容', 'warning')
    )
    expect(renderDocumentMock).not.toHaveBeenCalled()
    expect(canvasToBlobMock).not.toHaveBeenCalled()
  })

  it('imports a backup as a separate editable document', async () => {
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

    await waitFor(() => expect(importDocMock).toHaveBeenCalledTimes(1))
    expect(importDocMock.mock.calls[0][0]).toMatchObject({ title: '导入测试' })
    expect(showToastMock).toHaveBeenCalledWith('已导入为新的可编辑画布', 'success')
  })
})
