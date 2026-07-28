import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TextFormatToolbar from './TextFormatToolbar'
import type { EditingText } from './useTextEditor'

function makeEditingText(overrides: Partial<EditingText> = {}): EditingText {
  return {
    id: 'text-1',
    x: 0,
    y: 0,
    screenX: 0,
    screenY: 0,
    width: 240,
    height: 30,
    content: 'Hello',
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
        alignRight={false}
        onChange={vi.fn()}
        onBlurOutside={vi.fn()}
      />
    )

    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeTruthy()
    expect(screen.getByLabelText('Bold')).toBeTruthy()
    expect(screen.getByLabelText('Italic')).toBeTruthy()
    expect(screen.getByLabelText('Underline')).toBeTruthy()
    expect(screen.getByLabelText('Font size')).toBeTruthy()
    expect(screen.getByLabelText('Align left')).toBeTruthy()
    expect(screen.getByLabelText('Text color')).toBeTruthy()
    expect(screen.getByLabelText('Text background color')).toBeTruthy()
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
        alignRight={false}
        onChange={onChange}
        onBlurOutside={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText('Bold'))
    fireEvent.click(screen.getByLabelText('Italic'))
    fireEvent.click(screen.getByLabelText('Underline'))

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
        alignRight={false}
        onChange={onChange}
        onBlurOutside={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Font size'), { target: { value: '24' } })
    fireEvent.click(screen.getByLabelText('Align center'))
    fireEvent.change(screen.getByLabelText('Text color'), { target: { value: '#1971c2' } })
    fireEvent.change(screen.getByLabelText('Text background color'), {
      target: { value: '#ffe066' },
    })
    fireEvent.click(screen.getByLabelText('Clear text background'))

    expect(onChange).toHaveBeenNthCalledWith(1, { fontSize: 24 })
    expect(onChange).toHaveBeenNthCalledWith(2, { textAlign: 'center' })
    expect(onChange).toHaveBeenNthCalledWith(3, { color: '#1971c2' })
    expect(onChange).toHaveBeenNthCalledWith(4, { backgroundColor: '#ffe066' })
    expect(onChange).toHaveBeenNthCalledWith(5, { backgroundColor: undefined })
  })
})
