import { useCallback, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

const COLORS = [
  { hex: '#1a1a2e', label: '黑' },
  { hex: '#ffffff', label: '白' },
  { hex: '#dc2626', label: '红' },
  { hex: '#16a34a', label: '绿' },
  { hex: '#6366f1', label: '蓝' },
  { hex: '#d97706', label: '橙' },
  { hex: '#7c3aed', label: '紫' },
]

export default function TextStylePanel() {
  const {
    selectedLayerId,
    textElements,
    viewBox,
    updateTextStyle,
  } = useAppStore()

  // 找到选中的文字元素
  const selectedText = useMemo(
    () => textElements.find((t) => t.id === selectedLayerId) ?? null,
    [textElements, selectedLayerId]
  )

  // 计算面板位置（显示在选中框右侧）
  const panelPos = useMemo(() => {
    if (!selectedText || !selectedText.text) return null
    const lines = selectedText.text.split('\n')
    const maxLineLen = Math.max(...lines.map((l) => l.length), 1)
    const w = maxLineLen * selectedText.fontSize * 0.6
    const x = (selectedText.x - viewBox.x) * viewBox.zoom + w * viewBox.zoom + 12
    const y = (selectedText.y - viewBox.y) * viewBox.zoom
    return { x, y }
  }, [selectedText, viewBox])

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedLayerId) return
      updateTextStyle(selectedLayerId, { fontSize: Number(e.target.value) })
    },
    [selectedLayerId, updateTextStyle]
  )

  const handleColorChange = useCallback(
    (color: string) => {
      if (!selectedLayerId) return
      updateTextStyle(selectedLayerId, { color })
    },
    [selectedLayerId, updateTextStyle]
  )

  const handleBoldToggle = useCallback(() => {
    if (!selectedLayerId || !selectedText) return
    updateTextStyle(selectedLayerId, { bold: !selectedText.bold })
  }, [selectedLayerId, selectedText, updateTextStyle])

  // 不在文字编辑模式，且选中的是文字元素时显示
  if (!selectedText || !panelPos) return null

  const fontSize = selectedText.fontSize
  const bold = selectedText.bold ?? false

  return (
    <div
      className="fixed glass-toolbar rounded-xl px-3 py-2.5 flex flex-col gap-2.5 z-30"
      style={{
        left: Math.min(panelPos.x, window.innerWidth - 220),
        top: Math.max(panelPos.y, 8),
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 字体大小 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)] w-6 tabular-nums">{fontSize}</span>
        <input
          type="range"
          min={12}
          max={72}
          value={fontSize}
          onChange={handleFontSizeChange}
          className="w-28 accent-indigo-500"
        />
      </div>

      {/* 颜色 */}
      <div className="flex items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => handleColorChange(c.hex)}
            title={c.label}
            className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c.hex,
              borderColor: selectedText.color === c.hex ? '#6366f1' : 'transparent',
              boxShadow: selectedText.color === c.hex ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
            }}
          />
        ))}
      </div>

      {/* 粗体开关 */}
      <button
        onClick={handleBoldToggle}
        className={`toolbar-btn text-sm font-bold ${bold ? 'active' : ''}`}
        title="粗体"
      >
        B
      </button>
    </div>
  )
}
