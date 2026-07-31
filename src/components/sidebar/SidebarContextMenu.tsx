import { useEffect, useRef } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import type { CanvasDoc } from '../../store/types'
import { useAppStore } from '../../store/appStore'
import { useConfirm } from '../confirm-modal'
import { useToastStore } from '../../store/toastStore'

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
  const toast = useToastStore((state) => state.show)

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
      aria-label="文档菜单"
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
        <Pencil size={14} aria-hidden="true" />
        <span>重命名</span>
      </button>
      <button
        role="menuitem"
        className="sb-ctx-item"
        onClick={async () => {
          try {
            await duplicateDoc(doc.id)
            onClose()
          } catch {
            toast('文档复制失败，请重试', 'error')
          }
        }}
      >
        <Copy size={14} aria-hidden="true" />
        <span>创建副本</span>
      </button>
      <div className="sb-ctx-divider" />
      <button
        role="menuitem"
        className="sb-ctx-item sb-ctx-item-danger"
        onClick={async () => {
          const accepted = await confirm(`删除“${doc.title}”？此操作无法撤销。`, {
            confirmLabel: '删除',
            cancelLabel: '取消',
            danger: true,
          })
          if (!accepted) {
            onClose()
            return
          }
          try {
            await deleteDoc(doc.id)
            onClose()
          } catch {
            toast('文档删除失败，请重试', 'error')
          }
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
        <span>删除</span>
      </button>
    </div>
  )
}
