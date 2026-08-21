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
}

export function MenuItem({ onClick, label, shortcut, danger, hasSubmenu }: MenuItemProps) {
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
              fontSize: 11,
              color: 'var(--text-3)',
              letterSpacing: 0.5,
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
}

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
}

const ContextMenuSubmenu = React.forwardRef<HTMLDivElement, ContextMenuSubmenuProps>(
  ({ menuX, menuY, menuWidth, topOffset, actions }, ref) =>
    createPortal(
      <div
        ref={ref}
        className="context-menu-submenu"
        style={{
          position: 'fixed',
          left: menuX + menuWidth + SUBMENU_OFFSET,
          top: menuY + topOffset,
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
              fontSize: 13,
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
)

ContextMenuSubmenu.displayName = 'ContextMenuSubmenu'

interface AlignSubmenuProps {
  menuX: number
  menuY: number
  menuWidth: number
  onAlign: (alignment: AlignmentType) => void
}

export const AlignSubmenu = React.forwardRef<HTMLDivElement, AlignSubmenuProps>(
  ({ menuX, menuY, menuWidth, onAlign }, ref) => (
    <ContextMenuSubmenu
      ref={ref}
      menuX={menuX}
      menuY={menuY}
      menuWidth={menuWidth}
      topOffset={MENU_PADDING + 5 * MENU_ITEM_HEIGHT + 16}
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
  onDistribute: (distribution: DistributionType) => void
}

export function DistributeSubmenu({
  menuX,
  menuY,
  menuWidth,
  onDistribute,
}: DistributeSubmenuProps) {
  return (
    <ContextMenuSubmenu
      menuX={menuX}
      menuY={menuY}
      menuWidth={menuWidth}
      topOffset={MENU_PADDING + 6 * MENU_ITEM_HEIGHT + 24}
      actions={DISTRIBUTE_ACTIONS.map(({ label, distribution }) => ({
        key: distribution,
        label,
        onClick: () => onDistribute(distribution),
      }))}
    />
  )
}
