import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Toolbar from './Toolbar'
import { useAppStore } from '../../store/appStore'
import { useShortcutStore } from '../../store/useShortcutStore'
import { useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'

describe('Toolbar', () => {
  beforeEach(() => {
    localStorage.clear()
    useShortcutStore.getState().resetShortcuts()
    useAppStore.setState({
      tool: 'pen',
      brush: 'pen',
      color: '#3A2E22',
      fillColor: 'transparent',
      size: 4,
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      colorHistory: [],
      elements: [],
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
    useViewStore.setState({
      viewBox: { x: 0, y: 0, zoom: 1 },
      showGrid: false,
      snapToGrid: false,
      gridSize: 20,
    })
    useThemeStore.setState({ isDarkMode: false })
  })

  it('keeps templates before the color-heavy controls in the canvas toolbar', () => {
    render(<Toolbar />)

    const toolbar = screen.getByRole('toolbar', { name: 'Canvas tools' })
    const labels = Array.from(toolbar.querySelectorAll('button[aria-label]')).map((button) =>
      button.getAttribute('aria-label')
    )

    expect(labels.indexOf('模板库')).toBeGreaterThan(labels.indexOf('Brush: 钢笔'))
    expect(labels.indexOf('模板库')).toBeLessThan(labels.indexOf('纯黑'))
    expect(labels.indexOf('模板库')).toBeLessThan(labels.indexOf('背景设置'))
  })
})
