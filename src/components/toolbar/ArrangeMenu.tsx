import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ListTree } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import type { SelectionCapabilities } from '../../store/slices/selectionCapabilities'
import type { AlignmentType, DistributionType } from '../../store/types'
import { useDialogFocus } from '../useDialogFocus'

interface ArrangeMenuProps {
  capabilities: SelectionCapabilities
}

const ALIGNMENTS: Array<[AlignmentType, string]> = [
  ['alignLeft', '左对齐'],
  ['alignCenterH', '水平居中'],
  ['alignRight', '右对齐'],
  ['alignTop', '顶部对齐'],
  ['alignCenterV', '垂直居中'],
  ['alignBottom', '底部对齐'],
]

const DISTRIBUTIONS: Array<[DistributionType, string]> = [
  ['distributeH', '水平分布'],
  ['distributeV', '垂直分布'],
]

export default function ArrangeMenu({ capabilities }: ArrangeMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 8, top: 8, ready: false })
  const close = useCallback(() => setOpen(false), [])
  const menuRef = useDialogFocus<HTMLDivElement>({ open, onClose: close })
  const {
    groupSelected,
    ungroupSelected,
    alignSelected,
    distributeSelected,
    reorderSelected,
  } = useAppStore(
    useShallow((state) => ({
      groupSelected: state.groupSelected,
      ungroupSelected: state.ungroupSelected,
      alignSelected: state.alignSelected,
      distributeSelected: state.distributeSelected,
      reorderSelected: state.reorderSelected,
    }))
  )

  useLayoutEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return
    const menu = menuRef.current.getBoundingClientRect()
    const trigger = triggerRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(trigger.left, window.innerWidth - menu.width - 8))
    const top = Math.max(8, Math.min(trigger.bottom + 8, window.innerHeight - menu.height - 8))
    setPosition({ left, top, ready: true })
  }, [menuRef, open])

  const run = (action: () => void) => {
    action()
    close()
  }

  const item = (label: string, enabled: boolean, action: () => void) => (
    <button
      key={label}
      type="button"
      role="menuitem"
      className="toolbar-menu-item"
      disabled={!enabled}
      onClick={() => run(action)}
    >
      {label}
    </button>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="pill-btn ghost"
        aria-label="排列"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setPosition((current) => ({ ...current, ready: false }))
          setOpen((value) => !value)
        }}
      >
        <ListTree size={15} aria-hidden="true" />
        <span>排列</span>
      </button>
      {open &&
        createPortal(
          <>
            <div
              ref={menuRef}
              className="panel toolbar-menu arrange-menu"
              role="menu"
              aria-label="排列选中内容"
              tabIndex={-1}
              style={{
                position: 'fixed',
                left: position.left,
                top: position.top,
                visibility: position.ready ? 'visible' : 'hidden',
              }}
            >
              {item('分组', capabilities.canGroup, groupSelected)}
              {item('取消分组', capabilities.canUngroup, ungroupSelected)}
              <div className="toolbar-menu-separator" role="separator" />
              <div className="toolbar-menu-label">对齐</div>
              {ALIGNMENTS.map(([alignment, label]) =>
                item(label, capabilities.canAlign, () => alignSelected(alignment))
              )}
              <div className="toolbar-menu-label">分布</div>
              {DISTRIBUTIONS.map(([distribution, label]) =>
                item(label, capabilities.canDistribute, () => distributeSelected(distribution))
              )}
              <div className="toolbar-menu-separator" role="separator" />
              {item('置于顶层', capabilities.canReorder.front, () => reorderSelected('front'))}
              {item('上移一层', capabilities.canReorder.forward, () => reorderSelected('forward'))}
              {item('下移一层', capabilities.canReorder.backward, () =>
                reorderSelected('backward')
              )}
              {item('置于底层', capabilities.canReorder.back, () => reorderSelected('back'))}
            </div>
            <div className="em-overlay" aria-hidden="true" onClick={close} />
          </>,
          document.body
        )}
    </>
  )
}
