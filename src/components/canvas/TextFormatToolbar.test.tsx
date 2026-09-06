import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TextFormatToolbar from './TextFormatToolbar'
import type { EditingText } from './useTextEditor'

function makeEditingText(overrides: Partial<EditingText> = {}): EditingText {
  return {
    id: 'text-1',
    isNew: false,
    layerId: 'layer-default',
    x: 0,
    y: 0,
    screenX: 0,
    screenY: 0,
    width: 240,
    height: 30,
    content: 'Hello',
    autoResize: true,
    wraps: false,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    ...overrides,
  }
}

describe('TextFormatToolbar', () => {
  it('renders text formatting controls', () => {
    render(
      <TextFormatToolbar
        editingText={makeEditingText()}
        toolbarRef={{ current: null }}
        textAreaRef={{ current: null }}
        left={10}
        top={20}
        onChange={vi.fn()}
        onBlurOutside={vi.fn()}
      />
    )

    expect(screen.getByRole('toolbar', { name: '文字格式' })).toBeTruthy()
    expect(screen.getByLabelText('粗体')).toBeTruthy()
    expect(screen.getByLabelText('斜体')).toBeTruthy()
    expect(screen.getByLabelText('下划线')).toBeTruthy()
    expect(screen.getByLabelText('字号')).toBeTruthy()
    expect(screen.getByLabelText('左对齐')).toBeTruthy()
    expect(screen.getByLabelText('文字颜色')).toBeTruthy()
    expect(screen.getByLabelText('文字背景色')).toBeTruthy()
  })

  it('toggles inline styles', () => {
    const onChange = vi.fn()
    render(
      <TextFormatToolbar
        editingText={makeEditingText({ fontWeight: 'bold' })}
        toolbarRef={{ current: null }}
        textAreaRef={{ current: null }}
        left={10}
        top={20}
        onChange={onChange}
        onBlurOutside={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText('粗体'))
    fireEvent.click(screen.getByLabelText('斜体'))
    fireEvent.click(screen.getByLabelText('下划线'))

    expect(onChange).toHaveBeenNthCalledWith(1, { fontWeight: 'normal' })
    expect(onChange).toHaveBeenNthCalledWith(2, { fontStyle: 'italic' })
    expect(onChange).toHaveBeenNthCalledWith(3, { textDecoration: 'underline' })
  })

  it('changes font size, alignment, and colors', () => {
    const onChange = vi.fn()
    render(
      <TextFormatToolbar
        editingText={makeEditingText()}
        toolbarRef={{ current: null }}
        textAreaRef={{ current: null }}
        left={10}
        top={20}
        onChange={onChange}
        onBlurOutside={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('字号'), { target: { value: '24' } })
    fireEvent.click(screen.getByLabelText('居中对齐'))
    fireEvent.change(screen.getByLabelText('文字颜色'), { target: { value: '#1971c2' } })
    fireEvent.change(screen.getByLabelText('文字背景色'), {
      target: { value: '#ffe066' },
    })
    fireEvent.click(screen.getByLabelText('清除文字背景色'))

    expect(onChange).toHaveBeenNthCalledWith(1, { fontSize: 24 })
    expect(onChange).toHaveBeenNthCalledWith(2, { textAlign: 'center' })
    expect(onChange).toHaveBeenNthCalledWith(3, { color: '#1971c2' })
    expect(onChange).toHaveBeenNthCalledWith(4, { backgroundColor: '#ffe066' })
    expect(onChange).toHaveBeenNthCalledWith(5, { backgroundColor: undefined })
  })

  it('shows a none indicator instead of implying a background color', () => {
    const { rerender } = render(
      <TextFormatToolbar
        editingText={makeEditingText()}
        toolbarRef={{ current: null }}
        textAreaRef={{ current: null }}
        left={10}
        top={20}
        onChange={vi.fn()}
        onBlurOutside={vi.fn()}
      />
    )

    expect(screen.getByTestId('text-background-none-indicator')).toBeTruthy()
    expect(screen.getByLabelText('文字背景色').getAttribute('title')).toBe('文字背景色（无）')

    rerender(
      <TextFormatToolbar
        editingText={makeEditingText({ backgroundColor: '#ffe066' })}
        toolbarRef={{ current: null }}
        textAreaRef={{ current: null }}
        left={10}
        top={20}
        onChange={vi.fn()}
        onBlurOutside={vi.fn()}
      />
    )

    expect(screen.queryByTestId('text-background-none-indicator')).toBeNull()
    expect((screen.getByLabelText('文字背景色') as HTMLInputElement).value).toBe('#ffe066')
  })
})
