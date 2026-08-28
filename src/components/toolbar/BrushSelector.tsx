import { useRef, useState, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import type { BrushType, ToolType } from '../../store/types'
import { BRUSH_PRESETS, getBrushPreset } from '../../canvas/brushPresets'
import { useDialogFocus } from '../useDialogFocus'

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
  const closeBrush = useCallback(() => setShowBrush(false), [])
  const menuRef = useDialogFocus<HTMLDivElement>({
    open: showBrush,
    onClose: closeBrush,
  })

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
            ref={menuRef}
            id="brush-selector-menu"
            className="panel fixed min-w-[200px] p-[5px] z-[100]"
            role="menu"
            aria-label="画笔选择"
            tabIndex={-1}
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
                  closeBrush()
                }}
                className={`ditem ${brush === b.id ? 'bg-[var(--primary-bg)]' : ''}`}
                role="menuitemradio"
                aria-checked={brush === b.id}
                type="button"
                aria-label={b.label}
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
                  <span className="ml-auto text-[var(--primary)]">
                    <Check size={15} aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="fixed inset-0 z-[79]" aria-hidden="true" onClick={closeBrush} />
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
        aria-label={`画笔：${currentBrush.label}`}
        aria-haspopup="menu"
        aria-expanded={showBrush}
        aria-controls="brush-selector-menu"
      >
        <span>{currentBrush.label}</span>
        <ChevronDown size={12} aria-hidden="true" className="opacity-50" />
      </button>
      <div className="tb-sep" />
      {dropdown}
    </>
  )
})

export default BrushSelector
