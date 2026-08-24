import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { AppStatusBar } from './AppStatusBar'

describe('AppStatusBar', () => {
  beforeEach(() => {
    useAppStore.setState({
      tool: 'rectangle',
      elements: [],
      docs: [],
      saveStatus: 'saved',
    })
    useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1 } })
  })

  it('projects single-board, element, zoom, save, feedback, and help state', () => {
    useAppStore.setState({
      elements: [
        {
          type: 'shape',
          id: 'shape-1',
          kind: 'rectangle',
          x: 10,
          y: 20,
          w: 40,
          h: 30,
          color: '#000000',
          size: 2,
        },
      ],
      docs: [
        {
          schemaVersion: 5,
          id: 'doc-1',
          title: 'Canvas',
          elements: [],
          bgColor: '#ffffff',
          folderId: null,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      saveStatus: 'saving',
    })
    useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1.25 } })
    const onOpenShortcuts = vi.fn()

    render(<AppStatusBar onOpenShortcuts={onOpenShortcuts} />)

    expect(screen.getByRole('status', { name: '应用状态' })).toBeTruthy()
    expect(screen.getByText('矩形')).toBeTruthy()
    expect(screen.getByText('1 个元素')).toBeTruthy()
    expect(screen.getByText('单画板')).toBeTruthy()
    expect(screen.getByText('125%')).toBeTruthy()
    expect(screen.getByLabelText('正在保存')).toBeTruthy()
    expect(screen.getByText('保存中')).toBeTruthy()
    expect(screen.getByRole('link', { name: '提交反馈' }).getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('button', { name: '键盘快捷键' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '键盘快捷键' }))
    expect(onOpenShortcuts).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['idle', '自动保存', '自动保存已开启'],
    ['saving', '保存中', '正在保存'],
    ['saved', '已保存', '已保存'],
    ['error', '保存失败', '保存失败'],
  ] as const)('shows a visible %s save state', (saveStatus, label, ariaLabel) => {
    useAppStore.setState({ saveStatus })

    render(<AppStatusBar onOpenShortcuts={vi.fn()} />)

    const feedback = screen.getByLabelText(ariaLabel)
    expect(feedback.textContent).toBe(label)
    expect(feedback.classList.contains(`status-save-${saveStatus}`)).toBe(true)
  })

  it('fits the current content from click and keyboard activation', () => {
    useAppStore.setState({
      elements: [
        {
          type: 'shape',
          id: 'shape-1',
          kind: 'rectangle',
          x: 100,
          y: 80,
          w: 200,
          h: 100,
          color: '#000000',
          size: 2,
        },
      ],
    })
    const zoomToFit = vi.spyOn(useViewStore.getState(), 'zoomToFit')
    render(<AppStatusBar onOpenShortcuts={vi.fn()} />)
    const zoomButton = screen.getByRole('button', { name: /缩放 100%/ })

    fireEvent.click(zoomButton)
    fireEvent.keyDown(zoomButton, { key: 'Enter' })

    expect(zoomToFit).toHaveBeenCalledTimes(2)
    expect(zoomToFit).toHaveBeenCalledWith({ x: 95, y: 75, w: 210, h: 110 })
    zoomToFit.mockRestore()
  })
})
