import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useInputSettingsStore } from '../../store/useInputSettingsStore'
import { useDialogFocus } from '../useDialogFocus'

export default function PenInputSettings() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 8, left: 8 })
  const { pressureEnabled, pressureSensitivity, stylusEraserEnabled, secondaryButtonAction } =
    useInputSettingsStore()
  const close = useCallback(() => setOpen(false), [])
  const panelRef = useDialogFocus<HTMLDivElement>({ open, onClose: close })

  const toggle = useCallback(() => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const panelWidth = Math.min(260, window.innerWidth - 16)
      setPosition({
        top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 220)),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8)),
      })
    }
    setOpen((value) => !value)
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="abtn"
        onClick={toggle}
        aria-label="笔输入设置"
        title="笔输入设置"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="pen-input-settings"
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <>
            <div className="em-overlay" aria-hidden="true" onClick={close} />
            <div
              ref={panelRef}
              id="pen-input-settings"
              className="panel fixed z-[100] w-[min(260px,calc(100vw-16px))] max-h-[calc(100vh-16px)] overflow-y-auto p-[14px]"
              style={{ top: position.top, left: position.left, background: 'var(--card-solid)' }}
              role="dialog"
              aria-modal="true"
              aria-label="笔输入设置"
              tabIndex={-1}
            >
              <div className="mb-[12px] text-[13px] font-medium text-[var(--text)]">笔输入</div>
              <label className="flex min-h-[36px] items-center justify-between gap-[12px] text-[13px] text-[var(--text-2)]">
                <span>使用笔压</span>
                <input
                  type="checkbox"
                  checked={pressureEnabled}
                  onChange={(event) =>
                    useInputSettingsStore.getState().setPressureEnabled(event.currentTarget.checked)
                  }
                  aria-label="使用笔压"
                />
              </label>
              <label className="mt-[8px] block">
                <span className="flex items-center justify-between gap-[8px] text-[12px] text-[var(--text-2)]">
                  <span>压力响应</span>
                  <span className="tabular-nums text-[var(--text-3)]">
                    {pressureSensitivity < 35 ? '偏硬' : pressureSensitivity > 65 ? '偏软' : '标准'}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={pressureSensitivity}
                  disabled={!pressureEnabled}
                  onChange={(event) =>
                    useInputSettingsStore
                      .getState()
                      .setPressureSensitivity(Number(event.currentTarget.value))
                  }
                  className="mt-[8px] w-full accent-[var(--primary)] disabled:opacity-40"
                  aria-label="压力响应"
                  aria-valuetext={
                    pressureSensitivity < 35 ? '偏硬' : pressureSensitivity > 65 ? '偏软' : '标准'
                  }
                />
                <span className="flex justify-between text-[11px] text-[var(--text-4)]">
                  <span>硬</span>
                  <span>软</span>
                </span>
              </label>
              <label className="mt-[10px] flex min-h-[36px] items-center justify-between gap-[12px] text-[13px] text-[var(--text-2)]">
                <span>笔尾自动擦除</span>
                <input
                  type="checkbox"
                  checked={stylusEraserEnabled}
                  onChange={(event) =>
                    useInputSettingsStore
                      .getState()
                      .setStylusEraserEnabled(event.currentTarget.checked)
                  }
                  aria-label="笔尾自动擦除"
                />
              </label>
              <label className="mt-[10px] block text-[12px] text-[var(--text-2)]">
                <span>笔侧键（驱动映射为右键时）</span>
                <select
                  value={secondaryButtonAction}
                  onChange={(event) =>
                    useInputSettingsStore
                      .getState()
                      .setSecondaryButtonAction(
                        event.currentTarget.value as typeof secondaryButtonAction
                      )
                  }
                  className="mt-[6px] h-[34px] w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-[8px] text-[12px] text-[var(--text)]"
                  aria-label="笔侧键动作"
                >
                  <option value="pan">按住平移</option>
                  <option value="eraser">按住擦除</option>
                  <option value="ignore">忽略</option>
                </select>
              </label>
              <p className="mt-[10px] text-[11px] leading-[1.45] text-[var(--text-4)]">
                针对 GAOMON 1060PRO（含旧版 8192）/ Huion H1060P
                的标准笔输入适配。压感仅影响钢笔笔刷；关闭后使用固定笔宽。工作区和实体按键仍由系统驱动配置。
              </p>
            </div>
          </>,
          document.body
        )}
    </>
  )
}
