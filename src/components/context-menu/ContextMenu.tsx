import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store/appStore'
import { useConfirm } from '../confirm-modal'
import { requestClearCanvas } from '../confirm-modal/requestClearCanvas'
import { useDialogFocus } from '../useDialogFocus'
import type { AlignmentType, DistributionType } from '../../store/types'
import { getSelectionCapabilities } from '../../store/slices/selectionCapabilities'
import { AlignSubmenu, DistributeSubmenu, MenuItem, MenuSeparator } from './ContextMenuPrimitives'
import {
  MENU_PADDING,
  MENU_WIDTH,
  getContextMenuPosition,
} from './contextMenuModel'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
}

// 右键上下文菜单
// 专业白板/设计工具标配功能，集成所有常用操作
export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const submenuRef = useRef<HTMLDivElement>(null)
  const alignTriggerRef = useRef<HTMLButtonElement>(null)
  const distributeTriggerRef = useRef<HTMLButtonElement>(null)
  const [openSubmenu, setOpenSubmenu] = useState<'align' | 'distribute' | null>(null)
  const menuRef = useDialogFocus<HTMLDivElement>({
    open: true,
    onClose,
    additionalRef: submenuRef,
  })
  const [pos, setPos] = useState({
    x,
    y,
    menuWidth: MENU_WIDTH,
    maxHeight: Math.max(0, window.innerHeight - 16),
    ready: false,
  })

  const selectedIds = useAppStore((s) => s.selectedIds)
  const elements = useAppStore((s) => s.elements)
  const layers = useAppStore((s) => s.layers)
  const idToElement = useAppStore((s) => s.idToElement)
  const capabilities = getSelectionCapabilities({ elements, layers, selectedIds, idToElement })
  const hasSelection = capabilities.count > 0

  // Actions
  const copySelected = useAppStore((s) => s.copySelected)
  const paste = useAppStore((s) => s.paste)
  const duplicateSelected = useAppStore((s) => s.duplicateSelected)
  const removeElements = useAppStore((s) => s.removeElements)
  const groupSelected = useAppStore((s) => s.groupSelected)
  const ungroupSelected = useAppStore((s) => s.ungroupSelected)
  const alignSelected = useAppStore((s) => s.alignSelected)
  const distributeSelected = useAppStore((s) => s.distributeSelected)
  const reorderSelected = useAppStore((s) => s.reorderSelected)
  const setSelectedIds = useAppStore((s) => s.setSelectedIds)
  const clearAll = useAppStore((s) => s.clearAll)
  const confirm = useConfirm()
  // 锁定/解锁元素
  const lockSelected = useAppStore((s) => s.lockSelected)
  const unlockSelected = useAppStore((s) => s.unlockSelected)
  // 全选功能 - 选择所有元素
  const selectAll = useCallback(() => {
    setSelectedIds(elements.map((el) => el.id))
  }, [elements, setSelectedIds])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('[data-modal-layer="true"]')) return
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        (!submenuRef.current || !submenuRef.current.contains(target))
      ) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuRef, onClose])

  useEffect(() => {
    if (!openSubmenu) return
    const focusTimer = window.setTimeout(() => {
      submenuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }, 0)
    return () => window.clearTimeout(focusTimer)
  }, [openSubmenu])

  const updateMenuPosition = useCallback(() => {
    const menu = menuRef.current
    if (!menu) return

    const rect = menu.getBoundingClientRect()
    const next = getContextMenuPosition({
      x,
      y,
      menuWidth: rect.width || menu.offsetWidth || MENU_WIDTH,
      menuHeight: menu.scrollHeight || rect.height || menu.offsetHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })
    setPos((current) =>
      current.x === next.x &&
      current.y === next.y &&
      current.menuWidth === next.menuWidth &&
      current.maxHeight === next.maxHeight &&
      current.ready
        ? current
        : { ...next, ready: true }
    )
  }, [menuRef, x, y])

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateMenuPosition)
    observer?.observe(menu)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      observer?.disconnect()
    }
  }, [
    capabilities.canAlign,
    capabilities.canDistribute,
    capabilities.canGroup,
    capabilities.canLock,
    capabilities.canUnlock,
    capabilities.canUngroup,
    hasSelection,
    menuRef,
    updateMenuPosition,
  ])

  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  const handleAlign = (alignment: AlignmentType) => {
    alignSelected(alignment)
    onClose()
  }

  const handleDistribute = (distribution: DistributionType) => {
    distributeSelected(distribution)
    onClose()
  }

  // 剪切功能 - 复制然后删除
  const handleCut = () => {
    copySelected()
    removeElements(selectedIds)
    onClose()
  }

  const handleClearAll = async () => {
    const cleared = await requestClearCanvas(elements.length, confirm, clearAll, {
      onEmpty: onClose,
    })
    if (cleared) onClose()
  }

  const menuContent = (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label="画布上下文菜单"
      tabIndex={-1}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        minWidth: MENU_WIDTH,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: pos.maxHeight,
        overflowY: 'auto',
        boxSizing: 'border-box',
        visibility: pos.ready ? 'visible' : 'hidden',
        background: 'var(--card-solid)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-lg)',
        padding: MENU_PADDING,
        zIndex: 99999,
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 剪贴板操作 */}
      {capabilities.canDelete && (
        <>
          <MenuItem onClick={handleCut} label="剪切" shortcut="Ctrl+X" />
        </>
      )}
      {capabilities.canCopy && (
        <MenuItem onClick={() => handleAction(copySelected)} label="复制" shortcut="Ctrl+C" />
      )}
      <MenuItem onClick={() => handleAction(paste)} label="粘贴" shortcut="Ctrl+V" />
      {capabilities.canDuplicate && (
        <MenuItem
          onClick={() => handleAction(duplicateSelected)}
          label="复制副本"
          shortcut="Ctrl+D"
        />
      )}

      {hasSelection && <MenuSeparator />}

      {/* 删除操作 */}
      {capabilities.canDelete && (
        <MenuItem
          onClick={() => handleAction(() => removeElements(selectedIds))}
          label="删除"
          shortcut="Delete"
          danger
        />
      )}

      {/* 锁定/解锁操作 */}
      {(capabilities.canLock || capabilities.canUnlock) && (
        <>
          <MenuSeparator />
          {capabilities.canLock && (
            <MenuItem
              onClick={() => handleAction(lockSelected)}
              label="锁定元素"
              shortcut="Ctrl+L"
            />
          )}
          {capabilities.canUnlock && (
            <MenuItem
              onClick={() => handleAction(unlockSelected)}
              label="解锁元素"
              shortcut="Ctrl+Shift+L"
            />
          )}
        </>
      )}

      {/* 分组操作 */}
      {(capabilities.canGroup || capabilities.canUngroup) && (
        <>
          <MenuSeparator />
          {capabilities.canGroup && (
            <MenuItem onClick={() => handleAction(groupSelected)} label="分组" shortcut="Ctrl+G" />
          )}
          {capabilities.canUngroup && (
            <MenuItem
              onClick={() => handleAction(ungroupSelected)}
              label="取消分组"
              shortcut="Ctrl+Shift+G"
            />
          )}
        </>
      )}

      {/* 对齐子菜单 */}
      {capabilities.canAlign && (
        <>
          <MenuSeparator />
          <MenuItem
            ref={alignTriggerRef}
            onClick={() => setOpenSubmenu((current) => (current === 'align' ? null : 'align'))}
            label="对齐"
            hasSubmenu
            ariaExpanded={openSubmenu === 'align'}
          />
          {openSubmenu === 'align' && (
            <AlignSubmenu
              ref={submenuRef}
              anchorRef={alignTriggerRef}
              menuX={pos.x}
              menuY={pos.y}
              menuWidth={pos.menuWidth}
              onAlign={handleAlign}
            />
          )}
        </>
      )}

      {/* 分布子菜单 */}
      {capabilities.canDistribute && (
        <>
          <MenuSeparator />
          <MenuItem
            ref={distributeTriggerRef}
            onClick={() =>
              setOpenSubmenu((current) => (current === 'distribute' ? null : 'distribute'))
            }
            label="分布"
            hasSubmenu
            ariaExpanded={openSubmenu === 'distribute'}
          />
          {openSubmenu === 'distribute' && (
            <DistributeSubmenu
              ref={submenuRef}
              anchorRef={distributeTriggerRef}
              menuX={pos.x}
              menuY={pos.y}
              menuWidth={pos.menuWidth}
              onDistribute={handleDistribute}
            />
          )}
        </>
      )}

      {hasSelection && !capabilities.isLocked && (
        <>
          <MenuSeparator />
          <MenuItem
            onClick={() => handleAction(() => reorderSelected('front'))}
            label="置于顶层"
            disabled={!capabilities.canReorder.front}
          />
          <MenuItem
            onClick={() => handleAction(() => reorderSelected('forward'))}
            label="上移一层"
            disabled={!capabilities.canReorder.forward}
          />
          <MenuItem
            onClick={() => handleAction(() => reorderSelected('backward'))}
            label="下移一层"
            disabled={!capabilities.canReorder.backward}
          />
          <MenuItem
            onClick={() => handleAction(() => reorderSelected('back'))}
            label="置于底层"
            disabled={!capabilities.canReorder.back}
          />
        </>
      )}

      <MenuSeparator />

      {/* 选择操作 */}
      <MenuItem onClick={() => handleAction(selectAll)} label="全选" shortcut="Ctrl+A" />
      <MenuItem onClick={() => void handleClearAll()} label="清空画布" danger />
    </div>
  )

  return createPortal(menuContent, document.body)
}

export { AlignSubmenu, DistributeSubmenu }
