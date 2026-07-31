import { memo, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  SHORTCUT_DEFINITIONS,
  formatShortcutBinding,
  getDefinition,
  getShortcutCategoryLabel,
  getShortcutKeyParts,
  shortcutBindingFromEvent,
  type ShortcutActionId,
  type ShortcutCategory,
} from '../../keyboard/shortcuts'
import { useShortcutStore } from '../../store/useShortcutStore'

interface KeyboardShortcutSettingsProps {
  open: boolean
  onClose: () => void
}

type Message = { type: 'success' | 'error'; text: string } | null

const CATEGORY_ORDER: ShortcutCategory[] = ['tools', 'edit', 'arrange', 'view', 'style', 'help']

function ShortcutKeys({ actionId }: { actionId: ShortcutActionId }) {
  const binding = useShortcutStore((s) => s.bindings[actionId])
  return (
    <div className="flex items-center gap-[3px]">
      {getShortcutKeyParts(binding).map((part, index, parts) => (
        <span key={`${part}-${index}`}>
          <kbd className="inline-block px-[6px] py-[2px] text-[11px] font-semibold text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            {part}
          </kbd>
          {index < parts.length - 1 && (
            <span className="text-[var(--text-4)] text-[10px] mx-[1px]">+</span>
          )}
        </span>
      ))}
    </div>
  )
}

export const KeyboardShortcutSettings = memo(function KeyboardShortcutSettings({
  open,
  onClose,
}: KeyboardShortcutSettingsProps) {
  const bindings = useShortcutStore((s) => s.bindings)
  const setShortcut = useShortcutStore((s) => s.setShortcut)
  const resetShortcut = useShortcutStore((s) => s.resetShortcut)
  const resetShortcuts = useShortcutStore((s) => s.resetShortcuts)
  const exportShortcuts = useShortcutStore((s) => s.exportShortcuts)
  const importShortcuts = useShortcutStore((s) => s.importShortcuts)
  const [editingAction, setEditingAction] = useState<ShortcutActionId | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const [importText, setImportText] = useState('')
  const [exportText, setExportText] = useState('')

  const definitionsByCategory = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: SHORTCUT_DEFINITIONS.filter((definition) => definition.category === category),
      })).filter((group) => group.items.length > 0),
    []
  )

  useEffect(() => {
    if (!open) return
    setEditingAction(null)
    setMessage(null)
    setImportText('')
    setExportText('')
  }, [open])

  if (!open) return null

  const handleCapture = (e: ReactKeyboardEvent<HTMLButtonElement>, actionId: ShortcutActionId) => {
    if (editingAction !== actionId) return

    e.preventDefault()
    e.stopPropagation()

    const binding = shortcutBindingFromEvent(e.nativeEvent)
    if (!binding) {
      setMessage({ type: 'error', text: '请输入字母、数字、符号或组合快捷键。' })
      return
    }

    const result = setShortcut(actionId, binding)
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error ?? '无法设置这个快捷键。' })
      return
    }

    setEditingAction(null)
    setMessage({
      type: 'success',
      text: `${getDefinition(actionId).label}已设为 ${formatShortcutBinding(binding)}。`,
    })
  }

  const handleExport = () => {
    const json = exportShortcuts()
    setExportText(json)

    const writeText = navigator.clipboard?.writeText?.bind(navigator.clipboard)
    if (!writeText) {
      setMessage({ type: 'success', text: '快捷键 JSON 已生成，可以复制。' })
      return
    }

    writeText(json)
      .then(() => setMessage({ type: 'success', text: '快捷键 JSON 已复制到剪贴板。' }))
      .catch(() => setMessage({ type: 'success', text: '快捷键 JSON 已生成，可以复制。' }))
  }

  const handleImport = () => {
    const result = importShortcuts(importText)
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error ?? '快捷键导入失败。' })
      return
    }
    setImportText('')
    setExportText('')
    setMessage({ type: 'success', text: '快捷键已导入。' })
  }

  return (
    <div
      className="fixed inset-0 z-[520] bg-[rgba(0,0,0,0.35)] backdrop-blur-[3px] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card-solid)] rounded-[16px] py-[22px] px-[24px] w-[min(760px,94vw)] max-h-[86vh] shadow-[0_8px_40px_rgba(0,0,0,0.2)] border border-[var(--border)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px] mb-[16px]">
          <div>
            <div className="text-[16px] font-bold text-[var(--text)]">自定义键盘快捷键</div>
            <div className="text-[12px] text-[var(--text-4)] mt-[4px]">更改仅保存在当前设备。</div>
          </div>
          <button
            onClick={onClose}
            className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[var(--text-3)] hover:bg-[var(--primary-bg)] transition-colors text-[16px]"
            aria-label="关闭快捷键设置"
          >
            &times;
          </button>
        </div>

        {message && (
          <div
            className="mb-[12px] rounded-[8px] border px-[10px] py-[8px] text-[12px]"
            style={{
              borderColor: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
              color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
              background:
                message.type === 'error' ? 'rgba(200,90,90,0.08)' : 'rgba(106,154,88,0.08)',
            }}
          >
            {message.text}
          </div>
        )}

        <div className="overflow-y-auto pr-[4px] flex-1">
          {definitionsByCategory.map(({ category, items }) => (
            <section key={category} className="mb-[16px]">
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-4)] mb-[6px]">
                {getShortcutCategoryLabel(category)}
              </div>
              <div className="grid grid-cols-1 gap-[4px]">
                {items.map((definition) => {
                  const binding = bindings[definition.id]
                  const isEditing = editingAction === definition.id
                  const fixedLabels = definition.fixedBindings?.map(formatShortcutBinding) ?? []

                  return (
                    <div
                      key={definition.id}
                      className="grid grid-cols-[minmax(130px,1fr)_minmax(130px,180px)_auto] max-[640px]:grid-cols-1 gap-[8px] items-center py-[8px] px-[10px] rounded-[8px] hover:bg-[var(--primary-bg)]"
                    >
                      <div>
                        <div className="text-[13px] font-medium text-[var(--text)]">
                          {definition.label}
                        </div>
                        {fixedLabels.length > 0 && (
                          <div className="text-[11px] text-[var(--text-4)] mt-[2px]">
                            另可使用：{fixedLabels.join('、')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditingAction(isEditing ? null : definition.id)
                          setMessage(null)
                        }}
                        onKeyDown={(e) => handleCapture(e, definition.id)}
                        className="min-h-[34px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-[10px] flex items-center justify-center text-[12px] text-[var(--text)] hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                        aria-label={`设置${definition.label}快捷键`}
                      >
                        {isEditing ? (
                          <span className="font-semibold text-[var(--primary)]">请按快捷键</span>
                        ) : (
                          <ShortcutKeys actionId={definition.id} />
                        )}
                      </button>
                      <div className="flex items-center gap-[6px] justify-end max-[640px]:justify-start">
                        <button
                          onClick={() => {
                            resetShortcut(definition.id)
                            setMessage({
                              type: 'success',
                              text: `${definition.label}已重置为 ${formatShortcutBinding(
                                definition.defaultBinding
                              )}。`,
                            })
                          }}
                          className="h-[30px] px-[10px] rounded-[7px] border border-[var(--border)] text-[11px] text-[var(--text-3)] hover:text-[var(--primary)] hover:border-[var(--primary)]"
                        >
                          重置
                        </button>
                        <button
                          onClick={() => {
                            const result = setShortcut(definition.id, null)
                            setMessage(
                              result.ok
                                ? { type: 'success', text: `${definition.label}已停用。` }
                                : {
                                    type: 'error',
                                    text: result.error ?? '无法停用这个快捷键。',
                                  }
                            )
                          }}
                          disabled={binding === null}
                          className="h-[30px] px-[10px] rounded-[7px] border border-[var(--border)] text-[11px] text-[var(--text-3)] hover:text-[var(--danger)] hover:border-[var(--danger)] disabled:opacity-40"
                        >
                          停用
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          <section className="border-t border-[var(--border)] pt-[14px] mt-[6px]">
            <div className="flex flex-wrap items-center gap-[8px] mb-[10px]">
              <button
                onClick={() => {
                  resetShortcuts()
                  setExportText('')
                  setImportText('')
                  setMessage({ type: 'success', text: '快捷键已恢复默认设置。' })
                }}
                className="h-[34px] px-[12px] rounded-[8px] border border-[var(--border)] text-[12px] text-[var(--text)] hover:border-[var(--primary)]"
              >
                全部重置
              </button>
              <button
                onClick={handleExport}
                className="h-[34px] px-[12px] rounded-[8px] border border-[var(--border)] text-[12px] text-[var(--text)] hover:border-[var(--primary)]"
              >
                导出 JSON
              </button>
              <button
                onClick={handleImport}
                disabled={importText.trim().length === 0}
                className="h-[34px] px-[12px] rounded-[8px] border border-[var(--border)] text-[12px] text-[var(--text)] hover:border-[var(--primary)] disabled:opacity-40"
              >
                导入 JSON
              </button>
            </div>
            <div className="grid grid-cols-2 max-[720px]:grid-cols-1 gap-[10px]">
              <label className="block">
                <span className="block text-[12px] font-medium text-[var(--text-3)] mb-[5px]">
                  导入
                </span>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full min-h-[100px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] text-[12px] text-[var(--text)] p-[10px] font-mono resize-y"
                  spellCheck={false}
                />
              </label>
              <label className="block">
                <span className="block text-[12px] font-medium text-[var(--text-3)] mb-[5px]">
                  导出
                </span>
                <textarea
                  value={exportText}
                  onChange={(e) => setExportText(e.target.value)}
                  className="w-full min-h-[100px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] text-[12px] text-[var(--text)] p-[10px] font-mono resize-y"
                  spellCheck={false}
                  readOnly={exportText.length > 0}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
})
