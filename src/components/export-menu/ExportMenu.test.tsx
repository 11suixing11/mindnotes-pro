import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExportMenu from './ExportMenu'

const { addElementsMock, showToastMock } = vi.hoisted(() => ({
  addElementsMock: vi.fn(),
  showToastMock: vi.fn(),
}))

vi.mock('../../store/appStore', () => ({
  useAppStore: {
    getState: () => ({
      addElements: addElementsMock,
      elements: [],
    }),
  },
}))

vi.mock('../../store/useThemeStore', () => ({
  useThemeStore: (selector: (state: { isDarkMode: boolean }) => unknown) =>
    selector({ isDarkMode: false }),
}))

vi.mock('../../store/toastStore', () => ({
  useToastStore: (selector: (state: { show: typeof showToastMock }) => unknown) =>
    selector({ show: showToastMock }),
}))

const canvasContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
} as unknown as CanvasRenderingContext2D

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

describe('ExportMenu JPEG export', () => {
  beforeEach(() => {
    document.body.innerHTML = ''

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,aGVsbG8gd29ybGQ='
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback, type?: string) => {
        callback(new Blob(['jpeg'], { type: type ?? 'image/jpeg' }))
      }),
    })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })

    const canvas = document.createElement('canvas')
    canvas.id = 'main-canvas'
    canvas.width = 200
    canvas.height = 100
    document.body.appendChild(canvas)
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
    showToastMock.mockReset()
    addElementsMock.mockReset()
  })

  it('shows JPEG quality controls with the default quality and size estimate', async () => {
    render(<ExportMenu />)

    fireEvent.click(screen.getByRole('button', { name: '导出' }))

    expect(screen.getByRole('menuitem', { name: 'JPEG 图片' })).toBeTruthy()
    expect((screen.getByLabelText('JPEG 质量') as HTMLInputElement).value).toBe('85')
    expect(await screen.findByText('预计大小：11 B')).toBeTruthy()
  })

  it('exports JPEG using the selected quality', async () => {
    render(<ExportMenu />)

    fireEvent.click(screen.getByRole('button', { name: '导出' }))
    const slider = screen.getByLabelText('JPEG 质量') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '60' } })

    await waitFor(() => expect(slider.value).toBe('60'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'JPEG 图片' }))

    const toBlob = HTMLCanvasElement.prototype.toBlob as unknown as {
      mock: { calls: Array<[BlobCallback, string | undefined, number | undefined]> }
    }
    const lastCall = toBlob.mock.calls[toBlob.mock.calls.length - 1]
    expect(lastCall?.[1]).toBe('image/jpeg')
    expect(lastCall?.[2]).toBe(0.6)
  })
})
