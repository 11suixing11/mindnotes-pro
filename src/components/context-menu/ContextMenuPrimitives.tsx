import React from 'react'
import { createPortal } from 'react-dom'
import type { AlignmentType, DistributionType } from '../../store/types'
import {
  ALIGN_ACTIONS,
  DISTRIBUTE_ACTIONS,
  MENU_ITEM_HEIGHT,
  MENU_PADDING,
  SUBMENU_OFFSET,
} from './contextMenuModel'

interface MenuItemProps {
  onClick: () => void
  label: string
  shortcut?: string
  danger?: boolean
  hasSubmenu?: boolean
  ariaExpanded?: boolean
}

export const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ onClick, label, shortcut, danger, hasSubmenu, ariaExpanded }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      className="context-menu-item"
      aria-haspopup={hasSubmenu ? 'menu' : undefined}
      aria-expanded={hasSubmenu ? ariaExpanded : undefined}
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
        fontSize: 14,
        color: danger ? 'var(--danger)' : 'var(--text-1)',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-2)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {shortcut && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              letterSpacing: 0,
            }}
          >
            {shortcut}
          </span>
        )}
        {hasSubmenu && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        )}
      </div>
    </button>
  )
)

MenuItem.displayName = 'MenuItem'

export function MenuSeparator() {
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

interface SubmenuAction {
  key: string
  label: string
  onClick: () => void
}

interface ContextMenuSubmenuProps {
  menuX: number
  menuY: number
  menuWidth: number
  topOffset: number
  actions: SubmenuAction[]
  anchorRef?: React.RefObject<HTMLElement | null>
}

const ContextMenuSubmenu = React.forwardRef<HTMLDivElement, ContextMenuSubmenuProps>(
  ({ menuX, menuY, menuWidth, topOffset, actions, anchorRef }, ref) => {
    const anchorRect = anchorRef?.current?.getBoundingClientRect()
    const left = anchorRect ? anchorRect.right + SUBMENU_OFFSET : menuX + menuWidth + SUBMENU_OFFSET
    const top = anchorRect ? anchorRect.top : menuY + topOffset

    return createPortal(
      <div
        ref={ref}
        className="context-menu-submenu"
        role="menu"
        style={{
          position: 'fixed',
          left,
          top,
          minWidth: 140,
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          padding: MENU_PADDING,
          zIndex: 100000,
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            role="menuitem"
            onClick={action.onClick}
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
              fontSize: 14,
              color: 'var(--text-1)',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'var(--bg-2)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent'
            }}
          >
            {action.label}
          </button>
        ))}
      </div>,
      document.body
    )
  }
)

ContextMenuSubmenu.displayName = 'ContextMenuSubmenu'

interface AlignSubmenuProps {
  menuX: number
  menuY: number
  menuWidth: number
  anchorRef?: React.RefObject<HTMLElement | null>
  onAlign: (alignment: AlignmentType) => void
}

export const AlignSubmenu = React.forwardRef<HTMLDivElement, AlignSubmenuProps>(
  ({ menuX, menuY, menuWidth, anchorRef, onAlign }, ref) => (
    <ContextMenuSubmenu
      ref={ref}
      menuX={menuX}
      menuY={menuY}
      menuWidth={menuWidth}
      topOffset={MENU_PADDING + 5 * MENU_ITEM_HEIGHT + 16}
      anchorRef={anchorRef}
      actions={ALIGN_ACTIONS.map(({ label, alignment }) => ({
        key: alignment,
        label,
        onClick: () => onAlign(alignment),
      }))}
    />
  )
)

AlignSubmenu.displayName = 'AlignSubmenu'

interface DistributeSubmenuProps {
  menuX: number
  menuY: number
  menuWidth: number
  anchorRef?: React.RefObject<HTMLElement | null>
  onDistribute: (distribution: DistributionType) => void
}

export const DistributeSubmenu = React.forwardRef<HTMLDivElement, DistributeSubmenuProps>(
  ({ menuX, menuY, menuWidth, anchorRef, onDistribute }, ref) => (
    <ContextMenuSubmenu
      ref={ref}
      menuX={menuX}
      menuY={menuY}
      menuWidth={menuWidth}
      topOffset={MENU_PADDING + 6 * MENU_ITEM_HEIGHT + 24}
      anchorRef={anchorRef}
      actions={DISTRIBUTE_ACTIONS.map(({ label, distribution }) => ({
        key: distribution,
        label,
        onClick: () => onDistribute(distribution),
      }))}
    />
  )
)

DistributeSubmenu.displayName = 'DistributeSubmenu'
