import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BrushType, ToolType } from '../../store/types'

const BRUSHES: { id: BrushType; label: string; desc: string }[] = [
  { id: 'pen', label: '\u94a2\u7b14', desc: '\u5e73\u6ed1\u6d41\u7545' },
  { id: 'highlighter', label: '\u8367\u5149\u7b14', desc: '\u534a\u900f\u660e\u5bbd\u7b14' },
  { id: 'pencil', label: '\u94c5\u7b14', desc: '\u7c97\u7cd9\u8d28\u611f' },
  { id: 'calligraphy', label: '\u4e66\u6cd5\u7b14', desc: '\u7c97\u7ec6\u53d8\u5316' },
  { id: 'dashed', label: '\u865a\u7ebf\u7b14', desc: '\u865a\u7ebf\u7b14\u8ff9' },
  { id: 'glow', label: '\u5f69\u8679\u7b14', desc: '\u53d1\u5149\u6548\u679c' },
]

const ARROW = '\u25BE'
const CHECK = '\u2713'

interface BrushSelectorProps {
  brush: BrushType
  setBrush: (b: BrushType) => void
  tool: ToolType
}

export default function BrushSelector({ brush, setBrush, tool }: BrushSelectorProps) {
  const brushBtnRef = useRef<HTMLButtonElement>(null)
  const [showBrush, setShowBrush] = useState(false)
  const [brushPos, setBrushPos] = useState({ top: 0, left: 0 })

  const handleToggle = () => {
    if (!showBrush && brushBtnRef.current) {
      const r = brushBtnRef.current.getBoundingClientRect()
      setBrushPos({ top: r.bottom + 8, left: r.left })
    }
    setShowBrush(!showBrush)
  }

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
            {BRUSHES.map((b) => (
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
                  <span className="dd">{b.desc}</span>
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
      >
        <span>{BRUSHES.find((b) => b.id === brush)?.label}</span>
        <span className="text-[9px] opacity-50">{ARROW}</span>
      </button>
      <div className="tb-sep" />
      {dropdown}
    </>
  )
}
