import { memo, type CSSProperties, type RefObject } from 'react'
import {
  TEXT_FONT_SIZE_OPTIONS,
  clampTextFontSize,
  isVisibleTextBackground,
  type TextFormatState,
} from '../../canvas/textFormatting'
import type { EditingText } from './useTextEditor'

interface TextFormatToolbarProps {
  editingText: EditingText
  toolbarRef: RefObject<HTMLDivElement | null>
  textAreaRef: RefObject<HTMLTextAreaElement | null>
  left: number
  top: number
  alignRight: boolean
  onChange: (patch: Partial<TextFormatState>) => void
  onBlurOutside: () => void
}

const toolbarStyle: CSSProperties = {
  position: 'fixed',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  maxWidth: 'calc(100vw - 16px)',
  padding: '6px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--card-solid)',
  boxShadow: 'var(--shadow-md)',
  zIndex: 140,
  flexWrap: 'wrap',
}

const groupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  paddingRight: 6,
  borderRight: '1px solid var(--border)',
}

const buttonStyle: CSSProperties = {
  width: 30,
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--card)',
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const activeButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'var(--primary)',
  color: 'white',
  border: '1px solid var(--primary)',
}

const colorInputStyle: CSSProperties = {
  width: 30,
  height: 30,
  padding: 2,
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--card)',
  cursor: 'pointer',
}

function includeCurrentSize(fontSize: number): number[] {
  const normalized = clampTextFontSize(fontSize)
  if (TEXT_FONT_SIZE_OPTIONS.includes(normalized as (typeof TEXT_FONT_SIZE_OPTIONS)[number])) {
    return [...TEXT_FONT_SIZE_OPTIONS]
  }
  return [...TEXT_FONT_SIZE_OPTIONS, normalized].sort((a, b) => a - b)
}

const TextFormatToolbar = memo(function TextFormatToolbar({
  editingText,
  toolbarRef,
  textAreaRef,
  left,
  top,
  alignRight,
  onChange,
  onBlurOutside,
}: TextFormatToolbarProps) {
  const fontSizeOptions = includeCurrentSize(editingText.fontSize)
  const backgroundColor = isVisibleTextBackground(editingText.backgroundColor)
    ? editingText.backgroundColor
    : '#FFF3BF'

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Text formatting"
      style={{
        ...toolbarStyle,
        left,
        top,
        transform: alignRight ? 'translateX(-100%)' : undefined,
      }}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') event.preventDefault()
      }}
      onBlur={(event) => {
        const relatedTarget = event.relatedTarget as Node | null
        if (
          relatedTarget &&
          (toolbarRef.current?.contains(relatedTarget) || textAreaRef.current === relatedTarget)
        ) {
          return
        }
        onBlurOutside()
      }}
    >
      <div style={groupStyle}>
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={editingText.fontWeight === 'bold'}
          title="Bold"
          style={editingText.fontWeight === 'bold' ? activeButtonStyle : buttonStyle}
          onClick={() =>
            onChange({ fontWeight: editingText.fontWeight === 'bold' ? 'normal' : 'bold' })
          }
        >
          B
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={editingText.fontStyle === 'italic'}
          title="Italic"
          style={{
            ...(editingText.fontStyle === 'italic' ? activeButtonStyle : buttonStyle),
            fontStyle: 'italic',
          }}
          onClick={() =>
            onChange({ fontStyle: editingText.fontStyle === 'italic' ? 'normal' : 'italic' })
          }
        >
          I
        </button>
        <button
          type="button"
          aria-label="Underline"
          aria-pressed={editingText.textDecoration === 'underline'}
          title="Underline"
          style={{
            ...(editingText.textDecoration === 'underline' ? activeButtonStyle : buttonStyle),
            textDecoration: 'underline',
          }}
          onClick={() =>
            onChange({
              textDecoration: editingText.textDecoration === 'underline' ? 'none' : 'underline',
            })
          }
        >
          U
        </button>
      </div>

      <div style={groupStyle}>
        <select
          aria-label="Font size"
          value={editingText.fontSize}
          onChange={(event) =>
            onChange({ fontSize: clampTextFontSize(Number(event.target.value)) })
          }
          style={{
            width: 66,
            height: 30,
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--card)',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {fontSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      </div>

      <div style={groupStyle}>
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            type="button"
            aria-label={`Align ${align}`}
            aria-pressed={editingText.textAlign === align}
            title={`Align ${align}`}
            style={editingText.textAlign === align ? activeButtonStyle : buttonStyle}
            onClick={() => onChange({ textAlign: align })}
          >
            {align[0].toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ ...groupStyle, borderRight: 'none', paddingRight: 0 }}>
        <input
          aria-label="Text color"
          title="Text color"
          type="color"
          value={editingText.color}
          onChange={(event) => onChange({ color: event.target.value })}
          style={colorInputStyle}
        />
        <input
          aria-label="Text background color"
          title="Text background color"
          type="color"
          value={backgroundColor}
          onChange={(event) => onChange({ backgroundColor: event.target.value })}
          style={colorInputStyle}
        />
        <button
          type="button"
          aria-label="Clear text background"
          title="Clear text background"
          style={
            isVisibleTextBackground(editingText.backgroundColor) ? activeButtonStyle : buttonStyle
          }
          onClick={() => onChange({ backgroundColor: undefined })}
        >
          X
        </button>
      </div>
    </div>
  )
})

export default TextFormatToolbar
