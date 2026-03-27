import React from 'react'
import { useDrawingStore } from '../../store/useDrawingStore'

const COLORS = [
  { value: '#000000', label: '黑色' },
  { value: '#e03131', label: '红色' },
  { value: '#1864ab', label: '蓝色' },
  { value: '#2b8a3e', label: '绿色' },
  { value: '#e8590c', label: '橙色' },
  { value: '#9c36b5', label: '紫色' },
]

const SIZES = [
  { value: 2, label: '细' },
  { value: 4, label: '中' },
  { value: 6, label: '粗' },
  { value: 8, label: '特粗' },
]

interface PropertyPanelProps {
  onPropertyChange?: (property: 'color' | 'size', value: string | number) => void
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ onPropertyChange }) => {
  const { color, size, setColor, setSize } = useDrawingStore()

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    onPropertyChange?.('color', newColor)
  }

  const handleSizeChange = (newSize: number) => {
    setSize(newSize)
    onPropertyChange?.('size', newSize)
  }

  return (
    <div className="property-panel" role="group" aria-label="属性设置">
      {/* 颜色选择 */}
      <div className="property-section">
        <label className="property-label">颜色</label>
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => handleColorChange(c.value)}
              className={`color-button ${color === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              title={c.label}
              aria-label={c.label}
              aria-pressed={color === c.value}
            />
          ))}
        </div>
      </div>

      {/* 粗细选择 */}
      <div className="property-section">
        <label className="property-label">粗细</label>
        <div className="size-picker">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleSizeChange(s.value)}
              className={`size-button ${size === s.value ? 'active' : ''}`}
              title={s.label}
              aria-label={s.label}
              aria-pressed={size === s.value}
            >
              <div
                className="size-indicator"
                style={{ height: `${s.value}px` }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PropertyPanel
