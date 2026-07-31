import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBuiltInTemplates, type CanvasTemplate } from '../../templates/canvasTemplates'
import TemplatePicker from './TemplatePicker'

function renderPicker(overrides: Partial<ComponentProps<typeof TemplatePicker>> = {}) {
  const props: ComponentProps<typeof TemplatePicker> = {
    isOpen: true,
    builtInTemplates: getBuiltInTemplates(),
    customTemplates: [],
    sourceElementCount: 1,
    onClose: vi.fn(),
    onInsert: vi.fn(),
    onSaveCustom: vi.fn(),
    onDeleteCustom: vi.fn(),
    ...overrides,
  }

  render(<TemplatePicker {...props} />)
  return props
}

describe('TemplatePicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders built-in templates with previews', () => {
    renderPicker()

    expect(screen.getByRole('dialog', { name: '模板库' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '插入 流程图 模板' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '插入 思维导图 模板' })).toBeTruthy()
    expect(document.querySelectorAll('.template-preview').length).toBeGreaterThan(0)
  })

  it('inserts a selected template', () => {
    const props = renderPicker()

    fireEvent.click(screen.getByRole('button', { name: '插入 流程图 模板' }))

    expect(props.onInsert).toHaveBeenCalledTimes(1)
    expect(props.onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'template-flowchart-basic' })
    )
  })

  it('saves the current selection as a named custom template', () => {
    const props = renderPicker()

    fireEvent.change(screen.getByLabelText('自定义模板名称'), {
      target: { value: 'Decision tree' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存为模板' }))

    expect(props.onSaveCustom).toHaveBeenCalledWith('Decision tree')
  })

  it('disables saving when the canvas has no source elements', () => {
    renderPicker({ sourceElementCount: 0 })

    expect((screen.getByRole('button', { name: '保存为模板' }) as HTMLButtonElement).disabled).toBe(
      true
    )
  })

  it('renders and deletes custom templates', () => {
    const customTemplate: CanvasTemplate = {
      ...getBuiltInTemplates()[0],
      id: 'custom-one',
      name: 'Custom flow',
      category: 'custom',
    }
    const props = renderPicker({ customTemplates: [customTemplate] })

    fireEvent.click(screen.getByRole('button', { name: '删除 Custom flow 模板' }))

    expect(props.onDeleteCustom).toHaveBeenCalledWith('custom-one')
  })

  it('closes on Escape', () => {
    const props = renderPicker()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(props.onClose).toHaveBeenCalled()
  })

  it('traps focus inside the dialog and restores focus to its trigger', async () => {
    const trigger = document.createElement('button')
    trigger.type = 'button'
    document.body.appendChild(trigger)
    trigger.focus()

    const props: ComponentProps<typeof TemplatePicker> = {
      isOpen: true,
      builtInTemplates: getBuiltInTemplates(),
      customTemplates: [],
      sourceElementCount: 1,
      onClose: vi.fn(),
      onInsert: vi.fn(),
      onSaveCustom: vi.fn(),
      onDeleteCustom: vi.fn(),
    }
    const view = render(<TemplatePicker {...props} />)

    const dialog = screen.getByRole('dialog', { name: '模板库' })
    const first = screen.getByRole('button', { name: '关闭模板库' })
    const buttons = within(dialog).getAllByRole('button')
    const last = buttons[buttons.length - 1]

    await waitFor(() => expect(document.activeElement).toBe(first))
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    view.rerender(<TemplatePicker {...props} isOpen={false} />)
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
