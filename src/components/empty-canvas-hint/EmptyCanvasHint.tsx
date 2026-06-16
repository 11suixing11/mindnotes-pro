import { memo } from 'react'
import { useAppStore } from '../../store/appStore'
import { useShallow } from 'zustand/react/shallow'

const EmptyCanvasHint = memo(function EmptyCanvasHint() {
  const elements = useAppStore(useShallow((s) => s.elements))

  if (elements.length > 0) return null

  return (
    <div
      className="fixed inset-0 z-[2] flex items-center justify-center pointer-events-none select-none"
      style={{ animation: 'fadeIn 0.4s ease' }}
    >
      <div className="text-center" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="text-[48px] mb-[12px]" style={{ filter: 'grayscale(0.3)' }}>
          ✏️
        </div>
        <div className="text-[18px] font-bold text-[var(--text-3)] mb-[8px]">Start drawing!</div>
        <div className="text-[13px] text-[var(--text-4)] leading-[1.7]">
          在画布上自由创作，按{' '}
          <kbd className="inline-block px-[5px] py-[1px] text-[11px] font-semibold text-[var(--text-3)] bg-[var(--bg)] border border-[var(--border)] rounded-[4px] mx-[2px]">
            ?
          </kbd>{' '}
          查看快捷键
        </div>
      </div>
    </div>
  )
})

export default EmptyCanvasHint
