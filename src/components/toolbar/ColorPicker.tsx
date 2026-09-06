import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import type {
  SelectionStylePatch,
  SelectionStyleValue,
} from '../../store/slices/canvasElementStyle'
import { useToastStore } from '../../store/toastStore'
import { useDialogFocus } from '../useDialogFocus'
import { getStyleCommandMessage } from './styleCommandFeedback'

const GRAY_COLORS = ['#1A1A1A', '#4A4A4A', '#7A7A7A', '#A0A0A0', '#D0D0D0']
const BASE_COLORS = [
  '#E03131',
  '#F59F00',
  '#2B8A3E',
  '#1971C2',
  '#7950F2',
  '#BE4BDB',
  '#C2255C',
  '#3A2E22',
]
const LIGHT_COLORS = ['#FF8787', '#FFD43B', '#69DB7C', '#74C0FC', '#B197FC', '#F783AC']
const DARK_COLORS = ['#5C1A1A', '#5C4A1A', '#1A3C2E', '#1A365C', '#3A2A5C']
const COLORS = [...GRAY_COLORS, ...BASE_COLORS, ...LIGHT_COLORS, ...DARK_COLORS]

const SIZES = [
  { value: 2, dot: 4 },
  { value: 4, dot: 6 },
  { value: 8, dot: 9 },
  { value: 16, dot: 13 },
]

const COLOR_NAMES: Record<string, string> = {
  '#1A1A1A': '纯黑',
  '#4A4A4A': '深灰',
  '#7A7A7A': '中灰',
  '#A0A0A0': '浅灰',
  '#D0D0D0': '亮灰',
  '#E03131': '红色',
  '#F59F00': '橙色',
  '#2B8A3E': '绿色',
  '#1971C2': '蓝色',
  '#7950F2': '靛蓝',
  '#BE4BDB': '紫色',
  '#C2255C': '玫红',
  '#3A2E22': '棕色',
  '#FF8787': '亮红',
  '#FFD43B': '亮黄',
  '#69DB7C': '亮绿',
  '#74C0FC': '亮蓝',
  '#B197FC': '亮紫',
  '#F783AC': '亮粉',
  '#5C1A1A': '深红',
  '#5C4A1A': '深橙',
  '#1A3C2E': '深绿',
  '#1A365C': '深蓝',
  '#3A2A5C': '深紫',
}

const SIZE_LABELS: Record<number, string> = { 2: '极细', 4: '细', 8: '中等', 16: '粗' }

interface ColorPickerProps {
  colorValue?: SelectionStyleValue<string>
  sizeValue?: SelectionStyleValue<number>
  fillColorValue?: SelectionStyleValue<string>
  showColor?: boolean
  showSize?: boolean
  showFill?: boolean
  disabled?: boolean
  onChange?: (patch: SelectionStylePatch) => void
}

function valueState<T>(value: T): SelectionStyleValue<T> {
  return { kind: 'value', value }
}

const ColorPicker = memo(function ColorPicker({
  colorValue,
  sizeValue,
  fillColorValue,
  showColor = true,
  showSize = true,
  showFill,
  disabled = false,
  onChange,
}: ColorPickerProps) {
  const { tool, color, fillColor, size, colorHistory, applyStyle } = useAppStore(
    useShallow((state) => ({
      tool: state.tool,
      color: state.color,
      fillColor: state.fillColor,
      size: state.size,
      colorHistory: state.colorHistory,
      applyStyle: state.applyStyle,
    }))
  )
  const toast = useToastStore((state) => state.show)
  const resolvedColor = colorValue ?? valueState(color)
  const resolvedSize = sizeValue ?? valueState(size)
  const resolvedFill = fillColorValue ?? valueState(fillColor)
  const shouldShowFill = showFill ?? (tool === 'rectangle' || tool === 'circle')
  const currentColor = resolvedColor.kind === 'value' ? resolvedColor.value : color
  const currentFill = resolvedFill.kind === 'value' ? resolvedFill.value : fillColor

  const colorRef = useRef<HTMLInputElement>(null)
  const fillColorRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const paletteTriggerRef = useRef<HTMLButtonElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const runChange = useCallback(
    (patch: SelectionStylePatch) => {
      if (disabled) return
      if (onChange) {
        onChange(patch)
        return
      }
      const message = getStyleCommandMessage(applyStyle(patch))
      if (message) toast(message, 'warning')
    },
    [applyStyle, disabled, onChange, toast]
  )
  const closePalette = useCallback(() => setPaletteOpen(false), [])
  const selectPaletteColor = useCallback(
    (hex: string) => {
      runChange({ color: hex })
      closePalette()
    },
    [closePalette, runChange]
  )
  const popoverRef = useDialogFocus<HTMLDivElement>({
    open: paletteOpen,
    onClose: closePalette,
  })

  useEffect(() => {
    if (!paletteOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node
      if (!pickerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        closePalette()
      }
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    return () => window.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [closePalette, paletteOpen, popoverRef])

  return (
    <>
      {showColor && (
        <div className="color-picker" ref={pickerRef}>
          <button
            ref={paletteTriggerRef}
            type="button"
            className="abtn color-trigger"
            aria-label={resolvedColor.kind === 'mixed' ? '颜色：多种值' : '颜色'}
            aria-expanded={paletteOpen}
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={() => {
              if (!paletteOpen) paletteTriggerRef.current?.focus()
              setPaletteOpen((open) => !open)
            }}
          >
            <span
              className={`color-trigger-swatch ${resolvedColor.kind === 'mixed' ? 'is-mixed' : ''}`}
              style={
                resolvedColor.kind === 'value'
                  ? { backgroundColor: resolvedColor.value }
                  : undefined
              }
            />
          </button>

          {paletteOpen &&
            createPortal(
              <>
                <div className="em-overlay" aria-hidden="true" onClick={closePalette} />
                <div
                  ref={popoverRef}
                  className="color-popover panel"
                  role="dialog"
                  aria-label="颜色面板"
                  aria-modal="true"
                  tabIndex={-1}
                >
                  {colorHistory.length > 0 && (
                    <div className="color-popover-section" aria-label="最近使用的颜色">
                      {colorHistory.map((hex) => (
                        <button
                          key={`history-${hex}`}
                          onClick={() => selectPaletteColor(hex)}
                          type="button"
                          className={`cdot ${
                            resolvedColor.kind === 'value' && resolvedColor.value === hex
                              ? 'on'
                              : ''
                          }`}
                          style={{ backgroundColor: hex }}
                          aria-label={`最近颜色 ${hex}`}
                          aria-pressed={
                            resolvedColor.kind === 'value' && resolvedColor.value === hex
                          }
                        />
                      ))}
                    </div>
                  )}
                  <div className="color-popover-grid">
                    {COLORS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => selectPaletteColor(hex)}
                        type="button"
                        className={`cdot ${
                          resolvedColor.kind === 'value' && resolvedColor.value === hex
                            ? 'on'
                            : ''
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={COLOR_NAMES[hex] ?? hex}
                        aria-pressed={
                          resolvedColor.kind === 'value' && resolvedColor.value === hex
                        }
                      />
                    ))}
                    <button
                      onClick={() => colorRef.current?.click()}
                      type="button"
                      className="cdot custom-color-button"
                      aria-label="自定义颜色"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
        </div>
      )}

      {showSize && (
        <>
          <div className="tb-sep" role="separator" />
          <div
            className="tb-group"
            role="radiogroup"
            aria-label={resolvedSize.kind === 'mixed' ? '线宽，当前为多种值' : '线宽'}
          >
            {SIZES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => runChange({ size: option.value })}
                className={`szbtn ${
                  resolvedSize.kind === 'value' && resolvedSize.value === option.value ? 'on' : ''
                }`}
                role="radio"
                aria-label={`${SIZE_LABELS[option.value] ?? ''} ${option.value}像素`}
                aria-checked={
                  resolvedSize.kind === 'value' && resolvedSize.value === option.value
                }
                disabled={disabled}
              >
                <span className="dot" style={{ width: option.dot, height: option.dot }} />
              </button>
            ))}
          </div>
        </>
      )}

      {shouldShowFill && (
        <>
          <div className="tb-sep" role="separator" />
          <button
            type="button"
            onClick={() => {
              const next =
                resolvedFill.kind === 'value' && resolvedFill.value !== 'transparent'
                  ? 'transparent'
                  : currentColor
              runChange({ fillColor: next })
            }}
            className="abtn"
            title="切换填充"
            aria-label={
              resolvedFill.kind === 'mixed'
                ? '填充：多种值'
                : resolvedFill.kind === 'value' && resolvedFill.value !== 'transparent'
                  ? '有填充'
                  : '无填充'
            }
            aria-pressed={
              resolvedFill.kind === 'mixed'
                ? 'mixed'
                : resolvedFill.kind === 'value' && resolvedFill.value !== 'transparent'
            }
            disabled={disabled}
          >
            <span
              className={`fill-trigger-swatch ${
                resolvedFill.kind === 'mixed' ? 'is-mixed' : ''
              }`}
              style={
                resolvedFill.kind === 'value' && resolvedFill.value !== 'transparent'
                  ? { backgroundColor: resolvedFill.value }
                  : undefined
              }
            />
          </button>
          <button
            type="button"
            onClick={() => fillColorRef.current?.click()}
            className="abtn"
            title="填充色"
            aria-label="填充色"
            disabled={disabled}
          >
            <span className="text-[10px] text-[var(--text-4)]">填</span>
          </button>
        </>
      )}

      <input
        ref={colorRef}
        type="color"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="选择颜色"
        value={currentColor}
        onChange={(event) => runChange({ color: event.target.value })}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
      <input
        ref={fillColorRef}
        type="color"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="选择填充颜色"
        value={currentFill === 'transparent' ? '#ffffff' : currentFill}
        onChange={(event) => runChange({ fillColor: event.target.value })}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
    </>
  )
})

export default ColorPicker
