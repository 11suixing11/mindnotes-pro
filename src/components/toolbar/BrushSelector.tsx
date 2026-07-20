import { useRef, useState, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import type { BrushType, ToolType } from '../../store/types'
import { BRUSH_PRESETS, getBrushPreset } from '../../canvas/brushPresets'

const ARROW = '\u25BE'
const CHECK = '\u2713'

interface BrushSelectorProps {
  brush: BrushType
  setBrush: (b: BrushType) => void
  tool: ToolType
}

const BrushSelector = memo(function BrushSelector({ brush, setBrush, tool }: BrushSelectorProps) {
  const brushBtnRef = useRef<HTMLButtonElement>(null)
  const [showBrush, setShowBrush] = useState(false)
  const [brushPos, setBrushPos] = useState({ top: 0, left: 0 })
  const currentBrush = getBrushPreset(brush)

  const handleToggle = useCallback(() => {
    if (!showBrush && brushBtnRef.current) {
      const r = brushBtnRef.current.getBoundingClientRect()
      setBrushPos({ top: r.bottom + 8, left: r.left })
    }
    setShowBrush(!showBrush)
  }, [showBrush])

  const dropdown = showBrush
    ? createPortal(
        <>
          <div
            className="panel fixed min-w-[200px] p-[5px] z-[100]"
            role="menu"
            style={{
              top: brushPos.top,
              left: brushPos.left,
              animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {BRUSH_PRESETS.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBrush(b.id)
                  setShowBrush(false)
                }}
                className={`ditem ${brush === b.id ? 'bg-[var(--primary-bg)]' : ''}`}
                role="menuitem"
              >
                <span
                  className="di"
                  style={{ whiteSpace: 'nowrap', width: 'auto', minWidth: '48px' }}
                >
                  {b.label}
                </span>
                <div className="flex flex-col">
                  <span className="dd">{b.description}</span>
                </div>
                {brush === b.id && (
                  <span className="ml-auto text-[var(--primary)] font-bold text-[14px]">
                    {CHECK}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="fixed inset-0 z-[5]" onClick={() => setShowBrush(false)} />
        </>,
        document.body
      )
    : null

  if (tool !== 'pen') return null

  return (
    <>
      <button
        ref={brushBtnRef}
        onClick={handleToggle}
        className="pill-btn ghost"
        style={{ whiteSpace: 'nowrap' }}
        aria-label={`Brush: ${currentBrush.label}`}
        aria-haspopup="true"
        aria-expanded={showBrush}
      >
        <span>{currentBrush.label}</span>
        <span className="text-[9px] opacity-50">{ARROW}</span>
      </button>
      <div className="tb-sep" />
      {dropdown}
    </>
  )
})

export default BrushSelector
