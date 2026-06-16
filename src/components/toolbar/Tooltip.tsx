import { useState, useRef, useCallback, memo } from 'react'

const TOOLTIP_DELAY = 600

interface TooltipProps {
  content: string
  shortcut?: string
  children: React.ReactNode
}

const Tooltip = memo(function Tooltip({ content, shortcut, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPos({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        })
        setShow(true)
      }
    }, TOOLTIP_DELAY)
  }, [])

  const handleLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setShow(false)
  }, [])

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {show && (
        <div
          className="fixed z-[600] pointer-events-none"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translateX(-50%)',
            animation: 'fadeIn 0.12s ease',
          }}
        >
          <div className="bg-[var(--card-solid)] text-[var(--text)] text-[11px] font-medium px-[10px] py-[5px] rounded-[8px] border border-[var(--border)] shadow-[var(--shadow-md)] whitespace-nowrap flex items-center gap-[6px]">
            <span>{content}</span>
            {shortcut && (
              <kbd className="text-[10px] text-[var(--text-3)] bg-[var(--bg)] border border-[var(--border)] rounded-[4px] px-[4px] py-[1px] font-semibold">
                {shortcut}
              </kbd>
            )}
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-[4px] w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '5px solid var(--card-solid)',
            }}
          />
        </div>
      )}
    </div>
  )
})

export default Tooltip
