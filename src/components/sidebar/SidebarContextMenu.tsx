import { useAppStore } from '../../store/appStore'
import { useConfirm } from '../confirm-modal'

type CtxState = { x: number; y: number; type: 'doc' | 'folder'; id: string } | null

interface SidebarContextMenuProps {
  ctx: CtxState
  setCtx: (v: CtxState) => void
  setRenamingId: (id: string | null) => void
  setRenameVal: (v: string) => void
}

export default function SidebarContextMenu({
  ctx,
  setCtx,
  setRenamingId,
  setRenameVal,
}: SidebarContextMenuProps) {
  const folders = useAppStore((s) => s.folders)
  const docs = useAppStore((s) => s.docs)
  const createDoc = useAppStore((s) => s.createDoc)
  const deleteDoc = useAppStore((s) => s.deleteDoc)
  const duplicateDoc = useAppStore((s) => s.duplicateDoc)
  const deleteFolder = useAppStore((s) => s.deleteFolder)
  const confirm = useConfirm()

  if (!ctx) return null

  return (
    <>
      <div aria-hidden="true" className="sb-ctx-backdrop" onClick={() => setCtx(null)} />
      <div
        role="menu"
        aria-label={ctx.type === 'folder' ? '文件夹菜单' : '画布菜单'}
        className="panel sb-ctx-menu"
        style={{ left: ctx.x, top: ctx.y }}
      >
        {ctx.type === 'folder' ? (
          <>
            <button
              role="menuitem"
              aria-label="在文件夹中新建画布"
              onClick={() => {
                createDoc('未命名画布', ctx.id)
                setCtx(null)
              }}
              className="sb-ctx-item"
            >
              新建画布
            </button>
            <button
              role="menuitem"
              aria-label="重命名文件夹"
              onClick={() => {
                const f = folders.find((x) => x.id === ctx.id)
                if (f) {
                  setRenamingId(f.id)
                  setRenameVal(f.name)
                }
                setCtx(null)
              }}
              className="sb-ctx-item"
            >
              重命名
            </button>
            <div className="sb-ctx-divider" />
            <button
              role="menuitem"
              aria-label="删除文件夹"
              onClick={async () => {
                if (await confirm('删除文件夹？')) deleteFolder(ctx.id)
                setCtx(null)
              }}
              className="sb-ctx-item sb-ctx-item-danger"
            >
              删除
            </button>
          </>
        ) : (
          <>
            <button
              role="menuitem"
              aria-label="复制画布"
              onClick={() => {
                duplicateDoc(ctx.id)
                setCtx(null)
              }}
              className="sb-ctx-item"
            >
              复制
            </button>
            <button
              role="menuitem"
              aria-label="重命名画布"
              onClick={() => {
                const d = docs.find((x) => x.id === ctx.id)
                if (d) {
                  setRenamingId(d.id)
                  setRenameVal(d.title)
                }
                setCtx(null)
              }}
              className="sb-ctx-item"
            >
              重命名
            </button>
            <div className="sb-ctx-divider" />
            <button
              role="menuitem"
              aria-label="删除画布"
              onClick={async () => {
                if (await confirm('删除此画布？')) deleteDoc(ctx.id)
                setCtx(null)
              }}
              className="sb-ctx-item sb-ctx-item-danger"
            >
              删除
            </button>
          </>
        )}
      </div>
    </>
  )
}
