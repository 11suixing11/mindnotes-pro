import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PenInputSettings from './PenInputSettings'
import { DEFAULT_INPUT_SETTINGS, useInputSettingsStore } from '../../store/useInputSettingsStore'

describe('PenInputSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    useInputSettingsStore.getState().resetInputSettings()
  })

  it('edits and persists pressure, sensitivity and side-button behavior', () => {
    render(<PenInputSettings />)
    fireEvent.click(screen.getByRole('button', { name: '笔输入设置' }))

    fireEvent.click(screen.getByRole('checkbox', { name: '使用笔压' }))
    fireEvent.change(screen.getByRole('slider', { name: '压力响应' }), {
      target: { value: '82' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: '笔侧键动作' }), {
      target: { value: 'eraser' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: '笔尾自动擦除' }))

    expect(useInputSettingsStore.getState()).toMatchObject({
      pressureEnabled: false,
      pressureSensitivity: 82,
      secondaryButtonAction: 'eraser',
      stylusEraserEnabled: false,
    })
    expect(JSON.parse(localStorage.getItem('mindnotes-input-settings-v1') ?? '{}')).toMatchObject({
      pressureEnabled: false,
      pressureSensitivity: 82,
      secondaryButtonAction: 'eraser',
      stylusEraserEnabled: false,
    })
    expect(DEFAULT_INPUT_SETTINGS).toMatchObject({ secondaryButtonAction: 'pan' })
  })
})
