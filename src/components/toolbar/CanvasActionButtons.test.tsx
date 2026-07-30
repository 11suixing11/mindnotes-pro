import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CanvasActionButtons from './CanvasActionButtons'
import { useAppStore } from '../../store/appStore'

describe('CanvasActionButtons', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      elements: [],
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
  })

  it('renders canvas-level actions separately from color controls', () => {
    render(<CanvasActionButtons />)

    expect(screen.getByLabelText('背景设置')).toBeTruthy()
    expect(screen.getByLabelText('插入图片')).toBeTruthy()
    expect(screen.getByLabelText('全屏')).toBeTruthy()
  })

  it('changes the document background style', () => {
    render(<CanvasActionButtons />)

    fireEvent.click(screen.getByLabelText('背景设置'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /点阵/ }))

    expect(useAppStore.getState().backgroundStyle).toBe('dots')
  })

  it('renders hidden inputs for image import and custom background color', () => {
    render(<CanvasActionButtons />)

    expect(screen.getByLabelText('选择图片文件')).toBeTruthy()
    expect(screen.getByLabelText('选择背景颜色')).toBeTruthy()
  })
})
