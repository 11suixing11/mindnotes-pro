import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getTemplateBounds } from '../../templates/canvasTemplates'
import {
  createTemplateFromElements,
  deleteCustomTemplate,
  getBuiltInTemplates,
  instantiateTemplate,
  loadCustomTemplates,
  saveCustomTemplate,
  type CanvasTemplate,
} from '../../templates/canvasTemplates'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useToastStore } from '../../store/toastStore'
import { useConfirm } from '../confirm-modal'
import { getMainCanvas, getVisibleCanvasViewport } from '../canvas/viewport'
import { CANVAS_INVALIDATED_EVENT } from '../canvas/renderEvents'
import { icons } from '../toolbar/icons'
import TemplatePicker from './TemplatePicker'

const TemplateMenu = memo(function TemplateMenu() {
  const toast = useToastStore((state) => state.show)
  const confirm = useConfirm()
  const [showTemplates, setShowTemplates] = useState(false)
  const [customTemplates, setCustomTemplates] = useState(() => loadCustomTemplates())
  const builtInTemplates = useMemo(() => getBuiltInTemplates(), [])
  const { addElements, setSelectedIds, setTool, elements, selectedIds } = useAppStore(
    useShallow((state) => ({
      addElements: state.addElements,
      setSelectedIds: state.setSelectedIds,
      setTool: state.setTool,
      elements: state.elements,
      selectedIds: state.selectedIds,
    }))
  )

  useEffect(() => {
    if (showTemplates) setCustomTemplates(loadCustomTemplates())
  }, [showTemplates])

  const getTemplateSourceElements = useCallback(() => {
    const state = useAppStore.getState()
    if (state.selectedIds.length > 0) {
      const selected = new Set(state.selectedIds)
      const selectedElements = state.elements.filter((element) => selected.has(element.id))
      if (selectedElements.length > 0) return selectedElements
    }
    return state.elements
  }, [])

  const insertTemplate = useCallback(
    (template: CanvasTemplate) => {
      const viewport = getVisibleCanvasViewport(getMainCanvas())
      const inserted = instantiateTemplate(template, viewport.centerX, viewport.centerY)

      if (inserted.length === 0) {
        toast('模板为空', 'warning')
        return
      }

      addElements(inserted)
      setTool('select')
      setSelectedIds(inserted.map((element) => element.id))

      const bounds = getTemplateBounds(inserted)
      if (bounds) useViewStore.getState().zoomToFit(bounds)

      window.dispatchEvent(new Event(CANVAS_INVALIDATED_EVENT))
      setShowTemplates(false)
      toast(`已插入并选中 ${template.name}`, 'success')
    },
    [addElements, setSelectedIds, setTool, toast]
  )

  const saveTemplate = useCallback(
    (name: string) => {
      const template = createTemplateFromElements(name, getTemplateSourceElements())
      if (!template) {
        toast('没有可保存的元素', 'warning')
        return
      }

      try {
        setCustomTemplates(saveCustomTemplate(template))
        toast(`已保存 ${template.name}`, 'success')
      } catch {
        toast('模板保存失败，请检查浏览器存储权限', 'error')
      }
    },
    [getTemplateSourceElements, toast]
  )

  const removeCustomTemplate = useCallback(
    async (templateId: string) => {
      if (!(await confirm('删除这个模板？'))) return
      try {
        setCustomTemplates(deleteCustomTemplate(templateId))
        toast('已删除模板', 'success')
      } catch {
        toast('模板删除失败，请重试', 'error')
      }
    },
    [confirm, toast]
  )

  const sourceElementCount =
    selectedIds.length > 0
      ? elements.filter((element) => selectedIds.includes(element.id)).length
      : elements.length

  return (
    <>
      <button
        type="button"
        onClick={() => setShowTemplates(true)}
        className="pill-btn ghost"
        aria-label="模板库"
        title="插入可编辑模板"
      >
        {icons.file}
        <span>模板</span>
      </button>
      <TemplatePicker
        isOpen={showTemplates}
        builtInTemplates={builtInTemplates}
        customTemplates={customTemplates}
        sourceElementCount={sourceElementCount}
        onClose={() => setShowTemplates(false)}
        onInsert={insertTemplate}
        onSaveCustom={saveTemplate}
        onDeleteCustom={removeCustomTemplate}
      />
    </>
  )
})

export default TemplateMenu
