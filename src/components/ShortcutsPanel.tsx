import { useShortcuts, ShortcutConfig } from '../hooks/useShortcuts'

interface ShortcutsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShortcutsPanel({ isOpen, onClose }: ShortcutsPanelProps) {
  const { shortcuts } = useShortcuts()

  if (!isOpen) return null

  // 按类别分组
  const grouped = shortcuts.reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = []
      acc[s.category].push(s)
      return acc
    },
    {} as Record<string, ShortcutConfig[]>
  )

  const formatKey = (key: string, modifiers?: string[]) => {
    const symbols: Record<string, string> = {
      ctrl: 'Ctrl',
      meta: 'Cmd',
      shift: 'Shift',
      alt: 'Alt',
      '+': '+',
      '=': '+',
      '-': '-',
      '0': '0',
      ' ': '空格',
      '?': '?',
      '/': '/',
    }

    const parts = [...(modifiers || []), key].map((k) => symbols[k] || k.toUpperCase())
    return parts.join(' + ')
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl border border-[var(--border-color)] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">⌨️ 快捷键</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                {category === '工具' && '🛠️'}
                {category === '编辑' && '✏️'}
                {category === '视图' && '👁️'}
                {category === '文件' && '📁'}
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                  >
                    <span className="text-[var(--text-primary)]">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-[var(--bg-tertiary)] rounded text-sm font-mono text-[var(--text-secondary)] border border-[var(--border-color)]">
                      {formatKey(shortcut.key, shortcut.modifiers)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-secondary)]">
            💡 提示：快捷键可以在设置中自定义（即将推出）
          </p>
        </div>
      </div>
    </div>
  )
}
