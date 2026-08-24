import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store/appStore'
import type { AlignmentType, DistributionType } from '../../store/types'
import { AlignSubmenu, DistributeSubmenu, MenuItem, MenuSeparator } from './ContextMenuPrimitives'
import {
  MENU_PADDING,
  MENU_WIDTH,
  getContextMenuPosition,
  getContextMenuSelectionState,
} from './contextMenuModel'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
}

// 右键上下文菜单
// 专业白板/设计工具标配功能，集成所有常用操作
export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const alignTriggerRef = useRef<HTMLButtonElement>(null)
  const distributeTriggerRef = useRef<HTMLButtonElement>(null)
  const [openSubmenu, setOpenSubmenu] = useState<'align' | 'distribute' | null>(null)

  const selectedIds = useAppStore((s) => s.selectedIds)
  const elements = useAppStore((s) => s.elements)
  const selectionState = getContextMenuSelectionState(elements, selectedIds)
  const {
    hasSelection,
    hasMultipleSelection,
    hasGroupableSelection,
    hasDistributableSelection,
    hasGroupedElements,
    hasLockedElements,
    hasUnlockedElements,
  } = selectionState

  // Actions
  const copySelected = useAppStore((s) => s.copySelected)
  const paste = useAppStore((s) => s.paste)
  const duplicateSelected = useAppStore((s) => s.duplicateSelected)
  const removeElements = useAppStore((s) => s.removeElements)
  const groupSelected = useAppStore((s) => s.groupSelected)
  const ungroupSelected = useAppStore((s) => s.ungroupSelected)
  const alignSelected = useAppStore((s) => s.alignSelected)
  const distributeSelected = useAppStore((s) => s.distributeSelected)
  const setSelectedIds = useAppStore((s) => s.setSelectedIds)
  const clearAll = useAppStore((s) => s.clearAll)
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
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        (!submenuRef.current || !submenuRef.current.contains(e.target as Node))
      ) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const pos = getContextMenuPosition({
    x,
    y,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    hasSelection,
    hasMultipleSelection,
  })

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

  const menuContent = (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        minWidth: MENU_WIDTH,
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: MENU_PADDING,
        zIndex: 99999,
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 剪贴板操作 */}
      {hasSelection && (
        <>
          <MenuItem onClick={handleCut} label="剪切" shortcut="Ctrl+X" />
          <MenuItem onClick={() => handleAction(copySelected)} label="复制" shortcut="Ctrl+C" />
        </>
      )}
      <MenuItem onClick={() => handleAction(paste)} label="粘贴" shortcut="Ctrl+V" />
      {hasSelection && (
        <MenuItem
          onClick={() => handleAction(duplicateSelected)}
          label="复制副本"
          shortcut="Ctrl+D"
        />
      )}

      {hasSelection && <MenuSeparator />}

      {/* 删除操作 */}
      {hasSelection && (
        <MenuItem
          onClick={() => handleAction(() => removeElements(selectedIds))}
          label="删除"
          shortcut="Delete"
          danger
        />
      )}

      {/* 锁定/解锁操作 */}
      {hasSelection && (
        <>
          <MenuSeparator />
          {hasUnlockedElements && (
            <MenuItem
              onClick={() => handleAction(lockSelected)}
              label="锁定元素"
              shortcut="Ctrl+L"
            />
          )}
          {hasLockedElements && (
            <MenuItem
              onClick={() => handleAction(unlockSelected)}
              label="解锁元素"
              shortcut="Ctrl+Shift+L"
            />
          )}
        </>
      )}

      {/* 分组操作 */}
      {hasMultipleSelection && (
        <>
          <MenuSeparator />
          {hasGroupableSelection && !hasGroupedElements && (
            <MenuItem onClick={() => handleAction(groupSelected)} label="分组" shortcut="Ctrl+G" />
          )}
          {hasGroupedElements && (
            <MenuItem
              onClick={() => handleAction(ungroupSelected)}
              label="取消分组"
              shortcut="Ctrl+Shift+G"
            />
          )}
        </>
      )}

      {/* 对齐子菜单 */}
      {hasMultipleSelection && (
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
      {hasDistributableSelection && (
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

      <MenuSeparator />

      {/* 选择操作 */}
      <MenuItem onClick={() => handleAction(selectAll)} label="全选" shortcut="Ctrl+A" />
      <MenuItem onClick={() => handleAction(clearAll)} label="清空画布" danger />
    </div>
  )

  return createPortal(menuContent, document.body)
}

export { AlignSubmenu, DistributeSubmenu }
