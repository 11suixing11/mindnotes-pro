import { useEffect, useRef } from 'react'
import type { CanvasDoc } from '../../store/types'
import { useAppStore } from '../../store/appStore'
import { useConfirm } from '../confirm-modal'

export interface SidebarContextState {
  x: number
  y: number
  docId: string
}

interface SidebarContextMenuProps {
  context: SidebarContextState | null
  onClose: () => void
  onRename: (doc: CanvasDoc) => void
}

export default function SidebarContextMenu({
  context,
  onClose,
  onRename,
}: SidebarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const docs = useAppStore((state) => state.docs)
  const duplicateDoc = useAppStore((state) => state.duplicateDoc)
  const deleteDoc = useAppStore((state) => state.deleteDoc)
  const confirm = useConfirm()

  useEffect(() => {
    if (!context) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [context, onClose])

  if (!context) return null
  const doc = docs.find((item) => item.id === context.docId)
  if (!doc) return null

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Document menu"
      className="panel sb-ctx-menu"
      style={{ left: context.x, top: context.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        role="menuitem"
        className="sb-ctx-item"
        onClick={() => {
          onRename(doc)
          onClose()
        }}
      >
        Rename
      </button>
      <button
        role="menuitem"
        className="sb-ctx-item"
        onClick={() => {
          void duplicateDoc(doc.id)
          onClose()
        }}
      >
        Duplicate
      </button>
      <div className="sb-ctx-divider" />
      <button
        role="menuitem"
        className="sb-ctx-item sb-ctx-item-danger"
        onClick={async () => {
          const accepted = await confirm(`Delete "${doc.title}"?`)
          if (accepted) await deleteDoc(doc.id)
          onClose()
        }}
      >
        Delete
      </button>
    </div>
  )
}
