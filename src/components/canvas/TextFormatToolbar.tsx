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
  onChange: (patch: Partial<TextFormatState>) => void
  onInteractionStart?: (kind: 'toolbar' | 'color-picker') => void
  onInteractionEnd?: () => void
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
  fontWeight: 600,
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

const colorInputContainerStyle: CSSProperties = {
  position: 'relative',
  width: 30,
  height: 30,
  flex: '0 0 auto',
}

const noBackgroundIndicatorStyle: CSSProperties = {
  position: 'absolute',
  inset: 3,
  zIndex: 1,
  border: '1px solid var(--border)',
  borderRadius: 4,
  background:
    'linear-gradient(135deg, var(--card-solid) 0 46%, var(--text-3) 47% 53%, var(--card-solid) 54% 100%)',
  pointerEvents: 'none',
}

function includeCurrentSize(fontSize: number): number[] {
  const normalized = clampTextFontSize(fontSize)
  if (TEXT_FONT_SIZE_OPTIONS.includes(normalized as (typeof TEXT_FONT_SIZE_OPTIONS)[number])) {
    return [...TEXT_FONT_SIZE_OPTIONS]
  }
  return [...TEXT_FONT_SIZE_OPTIONS, normalized].sort((a, b) => a - b)
}

const TEXT_ALIGN_LABELS = {
  left: '左对齐',
  center: '居中对齐',
  right: '右对齐',
} as const

const TextFormatToolbar = memo(function TextFormatToolbar({
  editingText,
  toolbarRef,
  textAreaRef,
  left,
  top,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  onBlurOutside,
}: TextFormatToolbarProps) {
  const fontSizeOptions = includeCurrentSize(editingText.fontSize)
  const hasBackgroundColor = isVisibleTextBackground(editingText.backgroundColor)
  const backgroundColor = hasBackgroundColor ? editingText.backgroundColor : '#FFF3BF'

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="文字格式"
      style={{
        ...toolbarStyle,
        left,
        top,
        // `left` already represents the visible left edge. Do not apply a
        // second right-anchor transform; it causes overflow on narrow screens.
        transform: undefined,
      }}
      onPointerDownCapture={(event) => {
        const target = event.target
        onInteractionStart?.(
          target instanceof HTMLInputElement && target.type === 'color' ? 'color-picker' : 'toolbar'
        )
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
          aria-label="粗体"
          aria-pressed={editingText.fontWeight === 'bold'}
          title="粗体"
          style={editingText.fontWeight === 'bold' ? activeButtonStyle : buttonStyle}
          onClick={() => {
            onChange({ fontWeight: editingText.fontWeight === 'bold' ? 'normal' : 'bold' })
            onInteractionEnd?.()
          }}
        >
          B
        </button>
        <button
          type="button"
          aria-label="斜体"
          aria-pressed={editingText.fontStyle === 'italic'}
          title="斜体"
          style={{
            ...(editingText.fontStyle === 'italic' ? activeButtonStyle : buttonStyle),
            fontStyle: 'italic',
          }}
          onClick={() => {
            onChange({ fontStyle: editingText.fontStyle === 'italic' ? 'normal' : 'italic' })
            onInteractionEnd?.()
          }}
        >
          I
        </button>
        <button
          type="button"
          aria-label="下划线"
          aria-pressed={editingText.textDecoration === 'underline'}
          title="下划线"
          style={{
            ...(editingText.textDecoration === 'underline' ? activeButtonStyle : buttonStyle),
            textDecoration: 'underline',
          }}
          onClick={() => {
            onChange({
              textDecoration: editingText.textDecoration === 'underline' ? 'none' : 'underline',
            })
            onInteractionEnd?.()
          }}
        >
          U
        </button>
      </div>

      <div style={groupStyle}>
        <select
          aria-label="字号"
          value={editingText.fontSize}
          onChange={(event) => {
            onChange({ fontSize: clampTextFontSize(Number(event.target.value)) })
            onInteractionEnd?.()
          }}
          style={{
            width: 66,
            height: 30,
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--card)',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 500,
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
            aria-label={TEXT_ALIGN_LABELS[align]}
            aria-pressed={editingText.textAlign === align}
            title={TEXT_ALIGN_LABELS[align]}
            style={editingText.textAlign === align ? activeButtonStyle : buttonStyle}
            onClick={() => {
              onChange({ textAlign: align })
              onInteractionEnd?.()
            }}
          >
            {align[0].toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ ...groupStyle, borderRight: 'none', paddingRight: 0 }}>
        <input
          aria-label="文字颜色"
          title="文字颜色"
          type="color"
          value={editingText.color}
          onChange={(event) => {
            onChange({ color: event.target.value })
            onInteractionEnd?.()
          }}
          style={colorInputStyle}
        />
        <div style={colorInputContainerStyle}>
          <input
            aria-label="文字背景色"
            title={hasBackgroundColor ? '文字背景色' : '文字背景色（无）'}
            type="color"
            value={backgroundColor}
            onChange={(event) => {
              onChange({ backgroundColor: event.target.value })
              onInteractionEnd?.()
            }}
            style={colorInputStyle}
          />
          {!hasBackgroundColor && (
            <span
              aria-hidden="true"
              data-testid="text-background-none-indicator"
              style={noBackgroundIndicatorStyle}
            />
          )}
        </div>
        <button
          type="button"
          aria-label="清除文字背景色"
          title="清除文字背景色"
          style={hasBackgroundColor ? activeButtonStyle : buttonStyle}
          onClick={() => {
            onChange({ backgroundColor: undefined })
            onInteractionEnd?.()
          }}
        >
          X
        </button>
      </div>
    </div>
  )
})

export default TextFormatToolbar
