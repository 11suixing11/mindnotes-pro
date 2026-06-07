import { useRef, useState } from 'react'
import type { BrushType, ToolType } from '../../store/types'

const BRUSHES: { id: BrushType; label: string; desc: string }[] = [
  { id: 'pen', label: '钢笔', desc: '平滑流畅' },
  { id: 'highlighter', label: '荧光笔', desc: '半透明宽笔' },
  { id: 'pencil', label: '铅笔', desc: '粗糙质感' },
  { id: 'calligraphy', label: '书法笔', desc: '粗细变化' },
  { id: 'dashed', label: '虚线笔', desc: '虚线笔迹' },
  { id: 'glow', label: '霓虹笔', desc: '发光效果' },
]

interface BrushSelectorProps {
  brush: BrushType
  setBrush: (b: BrushType) => void
  tool: ToolType
}

export default function BrushSelector({ brush, setBrush, tool }: BrushSelectorProps) {
  const brushBtnRef = useRef<HTMLButtonElement>(null)
  const [showBrush, setShowBrush] = useState(false)
  const [brushPos, setBrushPos] = useState({ top: 0, left: 0 })

  return (
    <>
      {tool === 'pen' && (
        <>
          <button ref={brushBtnRef} onClick={() => {
            if (!showBrush && brushBtnRef.current) { const r = brushBtnRef.current.getBoundingClientRect(); setBrushPos({ top: r.bottom + 8, left: r.left }) }
            setShowBrush(!showBrush)
          }} className="pill-btn ghost">
            <span>{BRUSHES.find(b => b.id === brush)?.label}</span>
            <span style={{ fontSize: '9px', opacity: 0.5 }}>▾</span>
          </button>
          <div className="tb-sep" />
        </>
      )}

      {showBrush && (
        <div className="panel" role="menu" style={{ position: 'fixed', top: brushPos.top, left: brushPos.left, minWidth: '200px', padding: '5px', zIndex: 100, animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
          {BRUSHES.map((b) => (
            <button key={b.id} onClick={() => { setBrush(b.id); setShowBrush(false) }}
              className="ditem" style={{ background: brush === b.id ? 'var(--primary-bg)' : undefined }}
              role="menuitem" aria-label={`${b.label} - ${b.desc}`}>
              <span className="di">{b.label.split(' ')[0]}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="dl">{b.label.split(' ').slice(1).join(' ')}</span>
                <span className="dd">{b.desc}</span>
              </div>
              {brush === b.id && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700, fontSize: '14px' }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      {showBrush && <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setShowBrush(false)} />}
    </>
  )
}
