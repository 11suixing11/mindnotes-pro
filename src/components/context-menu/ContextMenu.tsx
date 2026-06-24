import React, { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store/appStore'
import type { AlignmentType } from '../../store/types'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
}

const MENU_ITEM_HEIGHT = 32
const MENU_PADDING = 4
const SUBMENU_OFFSET = -4

// P17 新功能: 右键上下文菜单 (来源 Excalidraw / Figma / tldraw 标准交互)
// 专业白板/设计工具标配功能，集成所有常用操作
export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  const selectedIds = useAppStore((s) => s.selectedIds)
  const elements = useAppStore((s) => s.elements)
  const hasSelection = selectedIds.length > 0
  const hasMultipleSelection = selectedIds.length > 1
  const hasGroupableSelection = selectedIds.length >= 2

  // 检查是否选中了组中的元素（通过 groupId 属性）
  const selectedElements = elements.filter((el) => selectedIds.includes(el.id))
  const hasGroupedElements = selectedElements.some((el) => el.groupId)

  // Actions
  const copySelected = useAppStore((s) => s.copySelected)
  const paste = useAppStore((s) => s.paste)
  const duplicateSelected = useAppStore((s) => s.duplicateSelected)
  const removeElements = useAppStore((s) => s.removeElements)
  const groupSelected = useAppStore((s) => s.groupSelected)
  const ungroupSelected = useAppStore((s) => s.ungroupSelected)
  const alignSelected = useAppStore((s) => s.alignSelected)
  const setSelectedIds = useAppStore((s) => s.setSelectedIds)
  const clearAll = useAppStore((s) => s.clearAll)

  // P17: 全选功能 - 选择所有元素
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

  // 计算菜单位置，确保不超出视口
  const adjustPosition = useCallback(() => {
    const menuWidth = 200
    const menuHeight =
      MENU_PADDING * 2 +
      (hasSelection ? 5 : 2) * MENU_ITEM_HEIGHT + // 基础项
      (hasMultipleSelection ? 2 : 0) * MENU_ITEM_HEIGHT + // 分组/取消分组
      (hasMultipleSelection ? 1 : 0) * MENU_ITEM_HEIGHT + // 对齐子菜单
      2 * 8 // 分隔符
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    if (x + menuWidth > viewportWidth) {
      adjustedX = Math.max(0, x - menuWidth)
    }
    if (y + menuHeight > viewportHeight) {
      adjustedY = Math.max(0, y - menuHeight)
    }

    return { x: adjustedX, y: adjustedY, menuWidth }
  }, [x, y, hasSelection, hasMultipleSelection])

  const pos = adjustPosition()

  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  const handleAlign = (alignment: AlignmentType) => {
    alignSelected(alignment)
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
        minWidth: 200,
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

      {/* 分组操作 */}
      {hasMultipleSelection && (
        <>
          <MenuSeparator />
          {hasGroupableSelection && !hasGroupedElements && (
            <MenuItem
              onClick={() => handleAction(groupSelected)}
              label="分组"
              shortcut="Ctrl+G"
            />
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
          <AlignSubmenu
            ref={submenuRef}
            menuX={pos.x}
            menuY={pos.y}
            menuWidth={pos.menuWidth}
            onAlign={handleAlign}
          />
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

interface MenuItemProps {
  onClick: () => void
  label: string
  shortcut?: string
  danger?: boolean
  hasSubmenu?: boolean
}

function MenuItem({ onClick, label, shortcut, danger, hasSubmenu }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="context-menu-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: MENU_ITEM_HEIGHT,
        padding: '0 12px',
        border: 'none',
        background: 'transparent',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 13,
        color: danger ? 'var(--danger)' : 'var(--text-1)',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {shortcut && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              letterSpacing: 0.5,
            }}
          >
            {shortcut}
          </span>
        )}
        {hasSubmenu && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        )}
      </div>
    </button>
  )
}

function MenuSeparator() {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--border-1)',
        margin: '4px 8px',
      }}
    />
  )
}

interface AlignSubmenuProps {
  menuX: number
  menuY: number
  menuWidth: number
  onAlign: (alignment: AlignmentType) => void
}

const AlignSubmenu = React.forwardRef<HTMLDivElement, AlignSubmenuProps>(
  ({ menuX, menuY, menuWidth, onAlign }, ref) => {
    const submenuX = menuX + menuWidth + SUBMENU_OFFSET

    const alignActions: { label: string; alignment: AlignmentType }[] = [
      { label: '左对齐', alignment: 'alignLeft' },
      { label: '水平居中', alignment: 'alignCenterH' },
      { label: '右对齐', alignment: 'alignRight' },
      { label: '顶对齐', alignment: 'alignTop' },
      { label: '垂直居中', alignment: 'alignCenterV' },
      { label: '底对齐', alignment: 'alignBottom' },
    ]

    return createPortal(
      <div
        ref={ref}
        className="context-menu-submenu"
        style={{
          position: 'fixed',
          left: submenuX,
          top: menuY + MENU_PADDING + 5 * MENU_ITEM_HEIGHT + 16,
          minWidth: 140,
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          padding: MENU_PADDING,
          zIndex: 100000,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {alignActions.map(({ label, alignment }) => (
          <button
            key={alignment}
            onClick={() => onAlign(alignment)}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              height: MENU_ITEM_HEIGHT,
              padding: '0 12px',
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text-1)',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {label}
          </button>
        ))}
      </div>,
      document.body
    )
  }
)

AlignSubmenu.displayName = 'AlignSubmenu'
export { AlignSubmenu }
