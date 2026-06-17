import type { useScreenPen } from './useScreenPen'

type ScreenPenControlsProps = {
  screenPen: ReturnType<typeof useScreenPen>
}

const COLORS = [
  '#ff0000', // Red
  '#00ff00', // Green
  '#0000ff', // Blue
  '#ffff00', // Yellow
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ffffff', // White
  '#000000', // Black
]

export function ScreenPenControls({ screenPen }: ScreenPenControlsProps) {
  const { enabled, color, size, tool, setColor, setSize, setTool, clearAll, undo, toggle } =
    screenPen

  if (!enabled) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000000,
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Title */}
      <div
        style={{
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: '4px',
        }}
      >
        Screen Pen
      </div>

      {/* Tool selection */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['pen', 'highlighter', 'eraser'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            style={{
              flex: 1,
              padding: '8px',
              background: tool === t ? '#7c6df0' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t === 'pen' ? '✏️' : t === 'highlighter' ? '🖍️' : '🧹'}
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: '24px',
              height: '24px',
              background: c,
              border: color === c ? '2px solid white' : '2px solid transparent',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* Size slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'white', fontSize: '12px' }}>Size:</span>
        <input
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ color: 'white', fontSize: '12px', minWidth: '20px' }}>{size}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={undo}
          style={{
            flex: 1,
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ↩️ Undo
        </button>
        <button
          onClick={clearAll}
          style={{
            flex: 1,
            padding: '8px',
            background: 'rgba(255,0,0,0.3)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Close button */}
      <button
        onClick={toggle}
        style={{
          padding: '8px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        ❌ Close (Esc)
      </button>

      {/* Shortcuts hint */}
      <div
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '10px',
          textAlign: 'center',
        }}
      >
        Ctrl+Shift+P to toggle
      </div>
    </div>
  )
}
