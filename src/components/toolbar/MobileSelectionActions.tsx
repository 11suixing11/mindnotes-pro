import { useMemo } from 'react'
import {
  AlignCenterHorizontal,
  Copy,
  CopyPlus,
  Group,
  Lock,
  Rows3,
  Split,
  Trash2,
  Unlock,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getElementLayerId } from '../../store/layers'
import { getSelectionCapabilities } from '../../store/slices/selectionCapabilities'
import type { AlignmentType, DistributionType } from '../../store/types'

const ALIGN_OPTIONS: Array<{ value: AlignmentType; label: string }> = [
  { value: 'alignLeft', label: '左对齐' },
  { value: 'alignCenterH', label: '水平居中' },
  { value: 'alignRight', label: '右对齐' },
  { value: 'alignTop', label: '顶对齐' },
  { value: 'alignCenterV', label: '垂直居中' },
  { value: 'alignBottom', label: '底对齐' },
]

const DISTRIBUTE_OPTIONS: Array<{ value: DistributionType; label: string }> = [
  { value: 'distributeH', label: '水平分布' },
  { value: 'distributeV', label: '垂直分布' },
]

export default function MobileSelectionActions() {
  const elements = useAppStore((state) => state.elements)
  const layers = useAppStore((state) => state.layers)
  const selectedIds = useAppStore((state) => state.selectedIds)
  const idToElement = useAppStore((state) => state.idToElement)
  const copySelected = useAppStore((state) => state.copySelected)
  const duplicateSelected = useAppStore((state) => state.duplicateSelected)
  const groupSelected = useAppStore((state) => state.groupSelected)
  const ungroupSelected = useAppStore((state) => state.ungroupSelected)
  const lockSelected = useAppStore((state) => state.lockSelected)
  const unlockSelected = useAppStore((state) => state.unlockSelected)
  const setLayerLocked = useAppStore((state) => state.setLayerLocked)
  const alignSelected = useAppStore((state) => state.alignSelected)
  const distributeSelected = useAppStore((state) => state.distributeSelected)
  const removeElements = useAppStore((state) => state.removeElements)

  const capabilities = useMemo(
    () => getSelectionCapabilities({ elements, layers, selectedIds, idToElement }),
    [elements, idToElement, layers, selectedIds]
  )

  if (capabilities.count === 0) return null

  const unlockSelection = () => {
    const lockedLayerIds = new Set<string>()
    for (const id of capabilities.selectedIds) {
      const element = idToElement.get(id) ?? elements.find((candidate) => candidate.id === id)
      if (!element) continue
      const layerId = getElementLayerId(element)
      if (layers.find((layer) => layer.id === layerId)?.locked) lockedLayerIds.add(layerId)
    }
    for (const layerId of lockedLayerIds) setLayerLocked(layerId, false)
    unlockSelected()
  }

  return (
    <section className="mobile-selection-actions" role="toolbar" aria-label="选中元素操作">
      <span className="mobile-selection-count" aria-live="polite">
        已选 {capabilities.count}
      </span>
      <div className="mobile-selection-buttons">
        {capabilities.isLocked ? (
          <>
            {capabilities.canCopy && (
              <button
                type="button"
                className="mobile-action-button"
                onClick={copySelected}
                aria-label="复制"
                title="复制"
              >
                <Copy size={18} aria-hidden="true" />
                <span>复制</span>
              </button>
            )}
            {capabilities.canUnlock && (
              <button
                type="button"
                className="mobile-action-button"
                onClick={unlockSelection}
                aria-label="解锁元素"
                title="解锁元素"
              >
                <Unlock size={18} aria-hidden="true" />
                <span>解锁</span>
              </button>
            )}
          </>
        ) : (
          <>
            {capabilities.canGroup && (
              <button
                type="button"
                className="mobile-action-button"
                onClick={groupSelected}
                aria-label="分组"
                title="分组"
              >
                <Group size={18} aria-hidden="true" />
                <span>分组</span>
              </button>
            )}
            {capabilities.canUngroup && (
              <button
                type="button"
                className="mobile-action-button"
                onClick={ungroupSelected}
                aria-label="取消分组"
                title="取消分组"
              >
                <Split size={18} aria-hidden="true" />
                <span>取消分组</span>
              </button>
            )}
            {capabilities.canDuplicate && (
              <button
                type="button"
                className="mobile-action-button"
                onClick={duplicateSelected}
                aria-label="复制副本"
                title="复制副本"
              >
                <CopyPlus size={18} aria-hidden="true" />
                <span>副本</span>
              </button>
            )}
            {capabilities.canLock && (
              <button
                type="button"
                className="mobile-action-button"
                onClick={lockSelected}
                aria-label="锁定元素"
                title="锁定元素"
              >
                <Lock size={18} aria-hidden="true" />
                <span>锁定</span>
              </button>
            )}
            {capabilities.canDelete && (
              <button
                type="button"
                className="mobile-action-button mobile-action-danger"
                onClick={() => removeElements(capabilities.selectedIds)}
                aria-label="删除选中元素"
                title="删除选中元素"
              >
                <Trash2 size={18} aria-hidden="true" />
                <span>删除</span>
              </button>
            )}
          </>
        )}
      </div>

      {capabilities.canAlign && (
        <label className="mobile-selection-select">
          <AlignCenterHorizontal size={17} aria-hidden="true" />
          <span className="sr-only">对齐</span>
          <select
            aria-label="对齐选中元素"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value as AlignmentType
              if (value) alignSelected(value)
              event.currentTarget.value = ''
            }}
          >
            <option value="">对齐</option>
            {ALIGN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {capabilities.canDistribute && (
        <label className="mobile-selection-select">
          <Rows3 size={17} aria-hidden="true" />
          <span className="sr-only">分布</span>
          <select
            aria-label="分布选中元素"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value as DistributionType
              if (value) distributeSelected(value)
              event.currentTarget.value = ''
            }}
          >
            <option value="">分布</option>
            {DISTRIBUTE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  )
}
