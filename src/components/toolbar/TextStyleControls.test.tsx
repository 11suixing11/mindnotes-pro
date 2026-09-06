import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TextStyleControls from './TextStyleControls'

describe('TextStyleControls', () => {
  it('renders uniform values and emits precise text style patches', () => {
    const onChange = vi.fn()
    render(
      <TextStyleControls
        fontSize={{ kind: 'value', value: 24 }}
        fontWeight={{ kind: 'value', value: 'bold' }}
        fontStyle={{ kind: 'value', value: 'normal' }}
        textDecoration={{ kind: 'value', value: 'underline' }}
        textAlign={{ kind: 'value', value: 'right' }}
        backgroundColor={{ kind: 'value', value: '#FFE066' }}
        onChange={onChange}
      />
    )

    expect((screen.getByLabelText('字号') as HTMLSelectElement).value).toBe('24')
    expect(screen.getByRole('button', { name: '粗体' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '斜体' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: '下划线' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '右对齐' }).getAttribute('aria-pressed')).toBe('true')
    expect((screen.getByLabelText('文字背景色') as HTMLInputElement).value).toBe('#ffe066')

    fireEvent.change(screen.getByLabelText('字号'), { target: { value: '32' } })
    fireEvent.click(screen.getByRole('button', { name: '粗体' }))
    fireEvent.click(screen.getByRole('button', { name: '斜体' }))
    fireEvent.click(screen.getByRole('button', { name: '下划线' }))
    fireEvent.click(screen.getByRole('button', { name: '左对齐' }))
    fireEvent.change(screen.getByLabelText('文字背景色'), { target: { value: '#1971c2' } })
    fireEvent.click(screen.getByRole('button', { name: '清除文字背景色' }))

    expect(onChange.mock.calls.map(([patch]) => patch)).toEqual([
      { fontSize: 32 },
      { fontWeight: 'normal' },
      { fontStyle: 'italic' },
      { textDecoration: 'none' },
      { textAlign: 'left' },
      { backgroundColor: '#1971c2' },
      { backgroundColor: null },
    ])
  })

  it('exposes mixed values and resolves them through the selected control', () => {
    const onChange = vi.fn()
    const mixed = { kind: 'mixed' } as const
    render(
      <TextStyleControls
        fontSize={mixed}
        fontWeight={mixed}
        fontStyle={mixed}
        textDecoration={mixed}
        textAlign={mixed}
        backgroundColor={mixed}
        onChange={onChange}
      />
    )

    expect((screen.getByLabelText('字号：多种值') as HTMLSelectElement).value).toBe('')
    for (const label of ['粗体', '斜体', '下划线', '左对齐', '居中对齐', '右对齐']) {
      expect(screen.getByRole('button', { name: label }).getAttribute('aria-pressed')).toBe('mixed')
    }
    const backgroundInput = screen.getByLabelText('文字背景色：多种值') as HTMLInputElement
    expect(backgroundInput.closest('label')?.classList.contains('is-mixed')).toBe(true)

    fireEvent.change(screen.getByLabelText('字号：多种值'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: '粗体' }))
    fireEvent.click(screen.getByRole('button', { name: '居中对齐' }))
    fireEvent.change(backgroundInput, { target: { value: '#be4bdb' } })

    expect(onChange.mock.calls.map(([patch]) => patch)).toEqual([
      { fontSize: 20 },
      { fontWeight: 'bold' },
      { textAlign: 'center' },
      { backgroundColor: '#be4bdb' },
    ])
  })
})
