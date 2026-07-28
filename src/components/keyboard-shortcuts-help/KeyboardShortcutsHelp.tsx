import { useState, useEffect, memo, useMemo } from 'react'
import {
  FIXED_SHORTCUT_HELP,
  SHORTCUT_DEFINITIONS,
  findShortcutAction,
  getShortcutCategoryLabel,
  getShortcutKeyParts,
  isEditableShortcutTarget,
  type ShortcutCategory,
} from '../../keyboard/shortcuts'
import { useShortcutStore } from '../../store/useShortcutStore'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
  onCustomize?: () => void
}

const CATEGORY_ORDER: ShortcutCategory[] = ['tools', 'edit', 'arrange', 'view', 'style', 'help']

function Keys({ parts }: { parts: string[] }) {
  return (
    <div className="flex items-center gap-[3px]">
      {parts.map((key, index) => (
        <span key={`${key}-${index}`}>
          <kbd className="inline-block px-[6px] py-[2px] text-[11px] font-semibold text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            {key}
          </kbd>
          {index < parts.length - 1 && (
            <span className="text-[var(--text-4)] text-[10px] mx-[1px]">+</span>
          )}
        </span>
      ))}
    </div>
  )
}

export default memo(function KeyboardShortcutsHelp({
  open,
  onClose,
  onCustomize,
}: KeyboardShortcutsHelpProps) {
  const [visible, setVisible] = useState(open)
  const bindings = useShortcutStore((s) => s.bindings)

  const groupedShortcuts = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => {
        const configurable = SHORTCUT_DEFINITIONS.filter(
          (definition) => definition.category === category
        ).map((definition) => ({
          id: definition.id,
          label: definition.label,
          keyParts: getShortcutKeyParts(bindings[definition.id]),
        }))

        const fixed = FIXED_SHORTCUT_HELP.filter((shortcut) => shortcut.category === category).map(
          (shortcut) => ({
            id: `${shortcut.category}-${shortcut.label}`,
            label: shortcut.label,
            keyParts: shortcut.keys,
          })
        )

        return { category, shortcuts: [...configurable, ...fixed] }
      }).filter((group) => group.shortcuts.length > 0),
    [bindings]
  )

  useEffect(() => {
    setVisible(open)
  }, [open])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (isEditableShortcutTarget(e.target)) return
      const action = findShortcutAction(e, useShortcutStore.getState().bindings)
      if (e.key === 'Escape' || action === 'help.shortcuts') {
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
        className="bg-[var(--card-solid)] rounded-[16px] py-[24px] px-[28px] max-w-[520px] w-[90vw] shadow-[0_8px_40px_rgba(0,0,0,0.2)] border border-[var(--border)]"
        style={{ animation: 'popIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="flex items-center justify-between gap-[12px] mb-[16px]">
          <div className="text-[16px] font-bold text-[var(--text)]">Keyboard Shortcuts</div>
          <div className="flex items-center gap-[8px]">
            {onCustomize && (
              <button
                onClick={onCustomize}
                className="h-[28px] px-[10px] rounded-[8px] border border-[var(--border)] text-[12px] text-[var(--text-3)] hover:text-[var(--primary)] hover:border-[var(--primary)]"
              >
                Customize
              </button>
            )}
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
        </div>
        <div className="grid grid-cols-1 gap-[10px] max-h-[56vh] overflow-y-auto pr-[4px]">
          {groupedShortcuts.map((group) => (
            <section key={group.category}>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-4)] mb-[4px]">
                {getShortcutCategoryLabel(group.category)}
              </div>
              <div className="grid grid-cols-1 gap-[2px]">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between gap-[12px] py-[6px] px-[8px] rounded-[8px] hover:bg-[var(--primary-bg)] transition-colors"
                  >
                    <span className="text-[13px] text-[var(--text-2)]">{shortcut.label}</span>
                    <Keys parts={shortcut.keyParts} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
})
