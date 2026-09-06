import React from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import type { AlignmentType, DistributionType } from '../../store/types'
import {
  ALIGN_ACTIONS,
  DISTRIBUTE_ACTIONS,
  MENU_ITEM_HEIGHT,
  MENU_PADDING,
  SUBMENU_OFFSET,
  getContextSubmenuPosition,
} from './contextMenuModel'

interface MenuItemProps {
  onClick: () => void
  label: string
  shortcut?: string
  danger?: boolean
  hasSubmenu?: boolean
  ariaExpanded?: boolean
  disabled?: boolean
}

export const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ onClick, label, shortcut, danger, hasSubmenu, ariaExpanded, disabled = false }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="context-menu-item"
      role="menuitem"
      aria-haspopup={hasSubmenu ? 'menu' : undefined}
      aria-expanded={hasSubmenu ? ariaExpanded : undefined}
      aria-disabled={disabled}
      disabled={disabled}
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
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        color: danger ? 'var(--danger)' : 'var(--text)',
        textAlign: 'left',
        transition: 'background 0.1s',
        opacity: disabled ? 0.38 : 1,
      }}
      onMouseEnter={(event) => {
        if (!disabled) event.currentTarget.style.background = 'var(--primary-bg)'
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
        {hasSubmenu && <ChevronRight size={12} aria-hidden="true" />}
      </div>
    </button>
  )
)

MenuItem.displayName = 'MenuItem'

export function MenuSeparator() {
  return (
    <div
      role="separator"
      style={{
        height: 1,
        background: 'var(--border)',
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
  ariaLabel?: string
}

const ContextMenuSubmenu = React.forwardRef<HTMLDivElement, ContextMenuSubmenuProps>(
  ({ menuX, menuY, menuWidth, topOffset, actions, anchorRef, ariaLabel }, ref) => {
    const submenuRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState<{
      x: number
      y: number
      maxHeight: number
      placement: 'left' | 'right'
      ready: boolean
    }>({
      x: menuX + menuWidth + SUBMENU_OFFSET,
      y: menuY + topOffset,
      maxHeight: Math.max(0, window.innerHeight - 16),
      placement: 'right' as const,
      ready: false,
    })
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        submenuRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      },
      [ref]
    )
    const updatePosition = React.useCallback(() => {
      const submenu = submenuRef.current
      if (!submenu) return

      const submenuRect = submenu.getBoundingClientRect()
      const anchorRect = anchorRef?.current?.getBoundingClientRect()
      const next = getContextSubmenuPosition({
        anchorLeft: anchorRect?.left ?? menuX,
        anchorRight: anchorRect?.right ?? menuX + menuWidth,
        anchorTop: anchorRect?.top ?? menuY + topOffset,
        submenuWidth: submenuRect.width || submenu.offsetWidth || 140,
        submenuHeight: submenu.scrollHeight || submenuRect.height || submenu.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
      setPosition((current) =>
        current.x === next.x &&
        current.y === next.y &&
        current.maxHeight === next.maxHeight &&
        current.placement === next.placement &&
        current.ready
          ? current
          : { ...next, ready: true }
      )
    }, [anchorRef, menuWidth, menuX, menuY, topOffset])

    React.useLayoutEffect(() => {
      const submenu = submenuRef.current
      if (!submenu) return

      updatePosition()
      window.addEventListener('resize', updatePosition)
      const observer =
        typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition)
      observer?.observe(submenu)
      if (anchorRef?.current) observer?.observe(anchorRef.current)

      return () => {
        window.removeEventListener('resize', updatePosition)
        observer?.disconnect()
      }
    }, [anchorRef, updatePosition])

    return createPortal(
      <div
        ref={setRefs}
        className="context-menu-submenu"
        role="menu"
        aria-label={ariaLabel}
        tabIndex={-1}
        data-placement={position.placement}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          minWidth: 140,
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: position.maxHeight,
          overflowY: 'auto',
          boxSizing: 'border-box',
          visibility: position.ready ? 'visible' : 'hidden',
          background: 'var(--card-solid)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-lg)',
          padding: MENU_PADDING,
          zIndex: 100000,
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
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
              color: 'var(--text)',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'var(--primary-bg)'
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
      ariaLabel="对齐选项"
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
      ariaLabel="分布选项"
      actions={DISTRIBUTE_ACTIONS.map(({ label, distribution }) => ({
        key: distribution,
        label,
        onClick: () => onDistribute(distribution),
      }))}
    />
  )
)

DistributeSubmenu.displayName = 'DistributeSubmenu'
