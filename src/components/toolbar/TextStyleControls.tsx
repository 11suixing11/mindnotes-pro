import { AlignCenter, AlignLeft, AlignRight, Ban } from 'lucide-react'
import { TEXT_FONT_SIZE_OPTIONS, clampTextFontSize } from '../../canvas/textFormatting'
import type {
  SelectionStylePatch,
  SelectionStyleValue,
} from '../../store/slices/canvasElementStyle'
import type { TextAlign, TextDecoration, TextFontStyle, TextFontWeight } from '../../store/types'

interface TextStyleControlsProps {
  fontSize: SelectionStyleValue<number>
  fontWeight: SelectionStyleValue<TextFontWeight>
  fontStyle: SelectionStyleValue<TextFontStyle>
  textDecoration: SelectionStyleValue<TextDecoration>
  textAlign: SelectionStyleValue<TextAlign>
  backgroundColor: SelectionStyleValue<string | null>
  onChange: (patch: SelectionStylePatch) => void
  disabled?: boolean
}

function toggleValue<T>(state: SelectionStyleValue<T>, active: T, inactive: T): T {
  return state.kind === 'value' && state.value === active ? inactive : active
}

export default function TextStyleControls({
  fontSize,
  fontWeight,
  fontStyle,
  textDecoration,
  textAlign,
  backgroundColor,
  onChange,
  disabled = false,
}: TextStyleControlsProps) {
  const backgroundValue =
    backgroundColor.kind === 'value' && backgroundColor.value ? backgroundColor.value : '#FFF3BF'

  return (
    <div className="text-style-controls" role="group" aria-label="文字样式">
      <select
        className="toolbar-select"
        aria-label={fontSize.kind === 'mixed' ? '字号：多种值' : '字号'}
        value={fontSize.kind === 'value' ? fontSize.value : ''}
        disabled={disabled}
        onChange={(event) => onChange({ fontSize: clampTextFontSize(Number(event.target.value)) })}
      >
        {fontSize.kind !== 'value' && <option value="">混合</option>}
        {TEXT_FONT_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}px
          </option>
        ))}
      </select>

      <button
        type="button"
        className="abtn text-style-button"
        aria-label="粗体"
        aria-pressed={
          fontWeight.kind === 'mixed'
            ? 'mixed'
            : fontWeight.kind === 'value' && fontWeight.value === 'bold'
        }
        disabled={disabled}
        onClick={() => onChange({ fontWeight: toggleValue(fontWeight, 'bold', 'normal') })}
      >
        <strong aria-hidden="true">B</strong>
      </button>
      <button
        type="button"
        className="abtn text-style-button"
        aria-label="斜体"
        aria-pressed={
          fontStyle.kind === 'mixed'
            ? 'mixed'
            : fontStyle.kind === 'value' && fontStyle.value === 'italic'
        }
        disabled={disabled}
        onClick={() => onChange({ fontStyle: toggleValue(fontStyle, 'italic', 'normal') })}
      >
        <em aria-hidden="true">I</em>
      </button>
      <button
        type="button"
        className="abtn text-style-button"
        aria-label="下划线"
        aria-pressed={
          textDecoration.kind === 'mixed'
            ? 'mixed'
            : textDecoration.kind === 'value' && textDecoration.value === 'underline'
        }
        disabled={disabled}
        onClick={() =>
          onChange({ textDecoration: toggleValue(textDecoration, 'underline', 'none') })
        }
      >
        <span className="text-style-underline" aria-hidden="true">
          U
        </span>
      </button>

      <div className="tb-sep" role="separator" />
      {(
        [
          ['left', '左对齐', AlignLeft],
          ['center', '居中对齐', AlignCenter],
          ['right', '右对齐', AlignRight],
        ] as const
      ).map(([align, label, Icon]) => (
        <button
          key={align}
          type="button"
          className="abtn"
          aria-label={label}
          aria-pressed={
            textAlign.kind === 'mixed'
              ? 'mixed'
              : textAlign.kind === 'value' && textAlign.value === align
          }
          disabled={disabled}
          onClick={() => onChange({ textAlign: align })}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}

      <div className="tb-sep" role="separator" />
      <label
        className={`text-background-control ${backgroundColor.kind === 'mixed' ? 'is-mixed' : ''}`}
      >
        <span className="sr-only">
          {backgroundColor.kind === 'mixed' ? '文字背景色：多种值' : '文字背景色'}
        </span>
        <input
          type="color"
          value={backgroundValue}
          disabled={disabled}
          onChange={(event) => onChange({ backgroundColor: event.target.value })}
        />
      </label>
      <button
        type="button"
        className="abtn"
        aria-label="清除文字背景色"
        title="清除文字背景色"
        disabled={disabled}
        onClick={() => onChange({ backgroundColor: null })}
      >
        <Ban size={15} aria-hidden="true" />
      </button>
    </div>
  )
}
