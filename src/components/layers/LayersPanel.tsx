import { useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import type { CanvasLayer } from '../../store/types'
import { getElementLayerId, getSortedLayers, isLayerWritable } from '../../store/layers'
import { useConfirm } from '../confirm-modal'

function layerElementsLabel(count: number) {
  return `${count} ${count === 1 ? 'element' : 'elements'}`
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
    const accepted = await confirm(
      `Delete "${layer.name}"? Its elements will move to another layer.`,
      {
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      }
    )
    if (accepted) deleteLayer(layer.id)
  }

  return (
    <section className="layers-panel" aria-label="Layers">
      <div className="layers-header">
        <div>
          <div className="layers-title">Layers</div>
          <div className="layers-meta">{selectedIds.length} selected</div>
        </div>
        <button
          type="button"
          className="layers-icon-btn"
          aria-label="Create layer"
          title="Create layer"
          onClick={() => createLayer()}
        >
          +
        </button>
      </div>

      <div className="layers-list" role="group" aria-label="Canvas layers">
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
                      aria-label={`Rename ${layer.name}`}
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

              <div className="layers-actions" aria-label={`${layer.name} actions`}>
                <button
                  type="button"
                  className="layers-icon-btn"
                  aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  disabled={!canHide}
                  onClick={() => setLayerVisibility(layer.id, !layer.visible)}
                >
                  {layer.visible ? 'V' : 'H'}
                </button>
                <button
                  type="button"
                  className="layers-icon-btn"
                  aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  onClick={() => setLayerLocked(layer.id, !layer.locked)}
                >
                  {layer.locked ? 'L' : 'U'}
                </button>
                <button
                  type="button"
                  className="layers-icon-btn"
                  aria-label={`Move ${layer.name} up`}
                  title="Move layer up"
                  disabled={layer.order >= maxOrder}
                  onClick={() => moveLayer(layer.id, 'up')}
                >
                  ^
                </button>
                <button
                  type="button"
                  className="layers-icon-btn"
                  aria-label={`Move ${layer.name} down`}
                  title="Move layer down"
                  disabled={layer.order <= minOrder}
                  onClick={() => moveLayer(layer.id, 'down')}
                >
                  v
                </button>
                <button
                  type="button"
                  className="layers-icon-btn layers-move-btn"
                  aria-label={`Move selected elements to ${layer.name}`}
                  title="Move selected elements to this layer"
                  disabled={!canMoveSelection}
                  onClick={() => moveSelectedToLayer(layer.id)}
                >
                  M
                </button>
                <button
                  type="button"
                  className="layers-icon-btn layers-danger-btn"
                  aria-label={`Delete ${layer.name}`}
                  title="Delete layer"
                  disabled={layers.length <= 1}
                  onClick={() => void requestDelete(layer)}
                >
                  -
                </button>
                <button
                  type="button"
                  className="layers-icon-btn"
                  aria-label={`Rename ${layer.name}`}
                  title="Rename layer"
                  onClick={() => startRename(layer)}
                >
                  R
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
