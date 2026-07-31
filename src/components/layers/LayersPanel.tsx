import { useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Layers3,
  Lock,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import type { CanvasLayer } from '../../store/types'
import { getElementLayerId, getSortedLayers, isLayerWritable } from '../../store/layers'
import { useConfirm } from '../confirm-modal'

function layerElementsLabel(count: number) {
  return `${count} 个元素`
}

export default function LayersPanel() {
  const layers = useAppStore((state) => state.layers)
  const activeLayerId = useAppStore((state) => state.activeLayerId)
  const elements = useAppStore((state) => state.elements)
  const selectedIds = useAppStore((state) => state.selectedIds)
  const createLayer = useAppStore((state) => state.createLayer)
  const renameLayer = useAppStore((state) => state.renameLayer)
  const deleteLayer = useAppStore((state) => state.deleteLayer)
  const setActiveLayer = useAppStore((state) => state.setActiveLayer)
  const setLayerVisibility = useAppStore((state) => state.setLayerVisibility)
  const setLayerLocked = useAppStore((state) => state.setLayerLocked)
  const moveLayer = useAppStore((state) => state.moveLayer)
  const moveSelectedToLayer = useAppStore((state) => state.moveSelectedToLayer)
  const confirm = useConfirm()

  const [expanded, setExpanded] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const sortedLayers = useMemo(() => getSortedLayers(layers), [layers])
  const displayLayers = useMemo(() => [...sortedLayers].reverse(), [sortedLayers])
  const layerCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const layer of layers) counts.set(layer.id, 0)
    for (const element of elements) {
      const layerId = getElementLayerId(element)
      counts.set(layerId, (counts.get(layerId) ?? 0) + 1)
    }
    return counts
  }, [elements, layers])

  const minOrder = sortedLayers[0]?.order ?? 0
  const maxOrder = sortedLayers[sortedLayers.length - 1]?.order ?? 0
  const visibleCount = layers.filter((layer) => layer.visible).length

  const startRename = (layer: CanvasLayer) => {
    setRenamingId(layer.id)
    setRenameValue(layer.name)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  const commitRename = () => {
    if (!renamingId) return
    renameLayer(renamingId, renameValue)
    setRenamingId(null)
  }

  const requestDelete = async (layer: CanvasLayer) => {
    const accepted = await confirm(`删除“${layer.name}”？其中的元素会移动到其他图层。`, {
      confirmLabel: '删除',
      cancelLabel: '取消',
      danger: true,
    })
    if (accepted) deleteLayer(layer.id)
  }

  return (
    <section
      className={`layers-panel${expanded ? ' layers-panel-expanded' : ''}`}
      aria-label="图层"
    >
      <div className="layers-header">
        <button
          type="button"
          className="layers-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? '收起图层' : '展开图层'}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Layers3 size={16} aria-hidden="true" />
          <span className="layers-heading">
            <span className="layers-title">图层</span>
            <span className="layers-meta">
              {layers.length} 个图层 · 已选 {selectedIds.length} 个元素
            </span>
          </span>
        </button>
        {expanded && (
          <button
            type="button"
            className="layers-icon-btn layers-create-btn"
            aria-label="新建图层"
            title="新建图层"
            onClick={() => createLayer()}
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="layers-list" role="group" aria-label="画布图层">
          {displayLayers.map((layer) => {
            const isActive = layer.id === activeLayerId
            const canActivate = isLayerWritable(layers, layer.id)
            const canHide = layer.visible ? visibleCount > 1 : true
            const canMoveSelection = selectedIds.length > 0 && canActivate
            const count = layerCounts.get(layer.id) ?? 0

            return (
              <div
                key={layer.id}
                role="group"
                aria-label={layer.name}
                className={`layers-row${isActive ? ' layers-row-active' : ''}${
                  !layer.visible ? ' layers-row-muted' : ''
                }`}
              >
                <button
                  type="button"
                  className="layers-row-main"
                  aria-current={isActive ? 'true' : undefined}
                  disabled={!canActivate}
                  onClick={() => setActiveLayer(layer.id)}
                >
                  <span className="layers-swatch" aria-hidden="true" />
                  <span className="layers-row-text">
                    {renamingId === layer.id ? (
                      <input
                        ref={inputRef}
                        aria-label={`重命名 ${layer.name}`}
                        className="layers-name-input"
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            commitRename()
                          } else if (event.key === 'Escape') {
                            event.preventDefault()
                            setRenamingId(null)
                          }
                        }}
                      />
                    ) : (
                      <span className="layers-name">{layer.name}</span>
                    )}
                    <span className="layers-count">{layerElementsLabel(count)}</span>
                  </span>
                </button>

                <div className="layers-actions" aria-label={`${layer.name} 操作`}>
                  <button
                    type="button"
                    className="layers-icon-btn"
                    aria-label={layer.visible ? `隐藏 ${layer.name}` : `显示 ${layer.name}`}
                    title={layer.visible ? '隐藏图层' : '显示图层'}
                    disabled={!canHide}
                    onClick={() => setLayerVisibility(layer.id, !layer.visible)}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    type="button"
                    className="layers-icon-btn"
                    aria-label={layer.locked ? `解锁 ${layer.name}` : `锁定 ${layer.name}`}
                    title={layer.locked ? '解锁图层' : '锁定图层'}
                    onClick={() => setLayerLocked(layer.id, !layer.locked)}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    type="button"
                    className="layers-icon-btn"
                    aria-label={`上移 ${layer.name}`}
                    title="上移图层"
                    disabled={layer.order >= maxOrder}
                    onClick={() => moveLayer(layer.id, 'up')}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="layers-icon-btn"
                    aria-label={`下移 ${layer.name}`}
                    title="下移图层"
                    disabled={layer.order <= minOrder}
                    onClick={() => moveLayer(layer.id, 'down')}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="layers-icon-btn layers-move-btn"
                    aria-label={`将所选元素移到 ${layer.name}`}
                    title="将所选元素移到此图层"
                    disabled={!canMoveSelection}
                    onClick={() => moveSelectedToLayer(layer.id)}
                  >
                    <MoveRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="layers-icon-btn"
                    aria-label={`重命名 ${layer.name}`}
                    title="重命名图层"
                    onClick={() => startRename(layer)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="layers-icon-btn layers-danger-btn"
                    aria-label={`删除 ${layer.name}`}
                    title="删除图层"
                    disabled={layers.length <= 1}
                    onClick={() => void requestDelete(layer)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
