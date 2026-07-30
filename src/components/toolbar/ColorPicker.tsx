import { useEffect, useRef, useState, memo } from 'react'
import { useAppStore } from '../../store/appStore'
import { useShallow } from 'zustand/react/shallow'

// 扩展调色板 - 基于 tldraw #1665 用户需求
// 灰度色系 (5)
const GRAY_COLORS = ['#1A1A1A', '#4A4A4A', '#7A7A7A', '#A0A0A0', '#D0D0D0']
// 基础色系 (8)
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
// 亮色系 (6)
const LIGHT_COLORS = ['#FF8787', '#FFD43B', '#69DB7C', '#74C0FC', '#B197FC', '#F783AC']
// 深色系 (5)
const DARK_COLORS = ['#5C1A1A', '#5C4A1A', '#1A3C2E', '#1A365C', '#3A2A5C']

const COLORS = [...GRAY_COLORS, ...BASE_COLORS, ...LIGHT_COLORS, ...DARK_COLORS]
const SIZES = [
  { value: 2, dot: 4 },
  { value: 4, dot: 6 },
  { value: 8, dot: 9 },
  { value: 16, dot: 13 },
]

const COLOR_NAMES: Record<string, string> = {
  // 灰度色系
  '#1A1A1A': '纯黑',
  '#4A4A4A': '深灰',
  '#7A7A7A': '中灰',
  '#A0A0A0': '浅灰',
  '#D0D0D0': '亮灰',
  // 基础色系
  '#E03131': '红色',
  '#F59F00': '橙色',
  '#2B8A3E': '绿色',
  '#1971C2': '蓝色',
  '#7950F2': '靛蓝',
  '#BE4BDB': '紫色',
  '#C2255C': '玫红',
  '#3A2E22': '棕色',
  // 亮色系
  '#FF8787': '亮红',
  '#FFD43B': '亮黄',
  '#69DB7C': '亮绿',
  '#74C0FC': '亮蓝',
  '#B197FC': '亮紫',
  '#F783AC': '亮粉',
  // 深色系
  '#5C1A1A': '深红',
  '#5C4A1A': '深橙',
  '#1A3C2E': '深绿',
  '#1A365C': '深蓝',
  '#3A2A5C': '深紫',
}
const SIZE_LABELS: Record<number, string> = { 2: '极细', 4: '细', 8: '中等', 16: '粗' }
const ColorPicker = memo(function ColorPicker() {
  const { tool, color, setColor, fillColor, setFillColor, size, setSize, colorHistory } =
    useAppStore(
      useShallow((s) => ({
        tool: s.tool,
        color: s.color,
        setColor: s.setColor,
        fillColor: s.fillColor,
        setFillColor: s.setFillColor,
        size: s.size,
        setSize: s.setSize,
        colorHistory: s.colorHistory,
      }))
    )

  const colorRef = useRef<HTMLInputElement>(null)
  const fillColorRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    if (!paletteOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPaletteOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    return () => window.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [paletteOpen])

  return (
    <>
      <div className="color-picker" ref={pickerRef}>
        <button
          type="button"
          className="abtn color-trigger"
          aria-label="颜色"
          aria-expanded={paletteOpen}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <span className="color-trigger-swatch" style={{ backgroundColor: color }} />
        </button>

        {paletteOpen && (
          <div className="color-popover panel" role="dialog" aria-label="颜色面板">
            {colorHistory.length > 0 && (
              <div className="color-popover-section" aria-label="最近使用的颜色">
                {colorHistory.map((hex) => (
                  <button
                    key={`history-${hex}`}
                    onClick={() => setColor(hex)}
                    className={`cdot ${color === hex ? 'on' : ''}`}
                    style={{ backgroundColor: hex }}
                    aria-label={`最近颜色 ${hex}`}
                  />
                ))}
              </div>
            )}
            <div className="color-popover-grid">
              {COLORS.map((hex) => (
                <button
                  key={hex}
                  onClick={() => setColor(hex)}
                  className={`cdot ${color === hex ? 'on' : ''}`}
                  style={{ backgroundColor: hex }}
                  aria-label={COLOR_NAMES[hex] ?? hex}
                />
              ))}
              <button
                onClick={() => colorRef.current?.click()}
                className="cdot custom-color-button"
                aria-label="自定义颜色"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="tb-sep" role="separator" />

      <div className="tb-group">
        {SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSize(s.value)}
            className={`szbtn ${size === s.value ? 'on' : ''}`}
            aria-label={`${SIZE_LABELS[s.value] ?? ''} ${s.value}像素`}
          >
            <span className="dot" style={{ width: s.dot, height: s.dot }} />
          </button>
        ))}
      </div>

      {(tool === 'rectangle' || tool === 'circle') && (
        <>
          <div className="tb-sep" role="separator" />
          <button
            onClick={() => {
              const next = fillColor === 'transparent' ? color : 'transparent'
              setFillColor(next)
            }}
            className="abtn"
            data-tip={fillColor === 'transparent' ? '无填充' : '有填充'}
            aria-label={fillColor === 'transparent' ? '无填充' : '有填充'}
          >
            <span
              className="inline-block w-[14px] h-[14px] rounded-[4px] border-[1.5px] border-[var(--border)] relative overflow-hidden"
              style={{ background: fillColor === 'transparent' ? 'transparent' : fillColor }}
            >
              {fillColor === 'transparent' && (
                <span className="absolute top-1/2 -left-[2px] -right-[2px] h-[1.5px] bg-[var(--danger)] -rotate-45" />
              )}
            </span>
          </button>
          <button
            onClick={() => fillColorRef.current?.click()}
            className="abtn"
            data-tip="填充色"
            aria-label="填充色"
          >
            <span className="text-[10px] text-[var(--text-4)]">填</span>
          </button>
        </>
      )}

      <input
        ref={colorRef}
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        aria-label="选择颜色"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
      <input
        ref={fillColorRef}
        type="color"
        value={fillColor === 'transparent' ? '#ffffff' : fillColor}
        onChange={(e) => setFillColor(e.target.value)}
        aria-label="选择填充颜色"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
    </>
  )
})

export default ColorPicker
