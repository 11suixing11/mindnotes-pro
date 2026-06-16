import { useState, useEffect, memo } from 'react'

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], label: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo' },
  { keys: ['Ctrl', 'C'], label: 'Copy' },
  { keys: ['Ctrl', 'V'], label: 'Paste (image/text)' },
  { keys: ['Ctrl', 'A'], label: 'Select all' },
  { keys: ['Delete'], label: 'Delete selected' },
  { keys: ['1'], label: 'Pen' },
  { keys: ['2'], label: 'Eraser' },
  { keys: ['3'], label: 'Pan' },
  { keys: ['4'], label: 'Rectangle' },
  { keys: ['5'], label: 'Circle' },
  { keys: ['6'], label: 'Text' },
  { keys: ['7'], label: 'Line' },
  { keys: ['8'], label: 'Arrow' },
  { keys: ['0'], label: 'Select' },
  { keys: ['+'], label: 'Zoom in' },
  { keys: ['-'], label: 'Zoom out' },
  { keys: ['G'], label: 'Toggle grid' },
  { keys: ['Arrow Keys'], label: 'Move selected' },
  { keys: ['Shift', 'Arrow'], label: 'Fast move (10px)' },
  { keys: ['Shift', 'Click'], label: 'Multi-select' },
  { keys: ['DblClick'], label: 'Edit text' },
  { keys: ['?'], label: 'Toggle this panel' },
]

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

export default memo(function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const [visible, setVisible] = useState(open)

  useEffect(() => {
    setVisible(open)
  }, [open])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F1') {
        e.preventDefault()
        setVisible(false)
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[500] bg-[rgba(0,0,0,0.35)] backdrop-blur-[3px] flex items-center justify-center"
      style={{ animation: 'fadeIn 0.15s ease' }}
      onClick={() => {
        setVisible(false)
        onClose()
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--card-solid)] rounded-[16px] py-[24px] px-[28px] max-w-[420px] w-[90vw] shadow-[0_8px_40px_rgba(0,0,0,0.2)] border border-[var(--border)]"
        style={{ animation: 'popIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="flex items-center justify-between mb-[16px]">
          <div className="text-[16px] font-bold text-[var(--text)]">Keyboard Shortcuts</div>
          <button
            onClick={() => {
              setVisible(false)
              onClose()
            }}
            className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[var(--text-3)] hover:bg-[var(--primary-bg)] transition-colors text-[16px]"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="grid grid-cols-1 gap-[2px] max-h-[50vh] overflow-y-auto pr-[4px]">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between py-[6px] px-[8px] rounded-[8px] hover:bg-[var(--primary-bg)] transition-colors"
            >
              <span className="text-[13px] text-[var(--text-2)]">{s.label}</span>
              <div className="flex items-center gap-[3px]">
                {s.keys.map((k, i) => (
                  <span key={i}>
                    <kbd className="inline-block px-[6px] py-[2px] text-[11px] font-semibold text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                      {k}
                    </kbd>
                    {i < s.keys.length - 1 && (
                      <span className="text-[var(--text-4)] text-[10px] mx-[1px]">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[14px] text-center text-[11px] text-[var(--text-4)]">
          Press{' '}
          <kbd className="inline-block px-[5px] py-[1px] text-[10px] font-semibold text-[var(--text-3)] bg-[var(--bg)] border border-[var(--border)] rounded-[4px]">
            ?
          </kbd>{' '}
          or{' '}
          <kbd className="inline-block px-[5px] py-[1px] text-[10px] font-semibold text-[var(--text-3)] bg-[var(--bg)] border border-[var(--border)] rounded-[4px]">
            F1
          </kbd>{' '}
          to toggle
        </div>
      </div>
    </div>
  )
})
