import { useAppStore } from '../store/useAppStore'

export default function ColorPicker() {
  const { color, setColor } = useAppStore()

  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316',
    '#f59e0b', '#84cc16', '#22c55e', '#10b981',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ]

  return (
    <div className="p-2 space-y-2">
      <div className="grid grid-cols-8 gap-1">
        {presetColors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
              color === c ? 'border-primary scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-full h-8 cursor-pointer"
      />
    </div>
  )
}
