import {
  findTemplateInsertionCenter,
  getTemplateBounds,
  instantiateTemplate,
  type CanvasTemplate,
} from '../../templates/canvasTemplates'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { getMainCanvas, getVisibleCanvasViewport } from '../canvas/viewport'
import { CANVAS_INVALIDATED_EVENT } from '../canvas/renderEvents'

/**
 * Shared template insertion used by the template menu and the empty-state
 * quick-start cards. Drops the template near the viewport center while dodging
 * existing elements, selects the result and zooms to fit.
 * Returns the inserted elements (empty when the template has no elements).
 */
export function insertTemplateIntoCanvas(template: CanvasTemplate) {
  const viewport = getVisibleCanvasViewport(getMainCanvas())
  const center = findTemplateInsertionCenter({
    templateElements: template.elements,
    existingElements: useAppStore.getState().elements,
    preferredCenter: { x: viewport.centerX, y: viewport.centerY },
  })
  const inserted = instantiateTemplate(template, center.x, center.y)
  if (inserted.length === 0) return inserted

  const { addElements, setSelectedIds, setTool } = useAppStore.getState()
  addElements(inserted)
  setTool('select')
  setSelectedIds(inserted.map((element) => element.id))

  const bounds = getTemplateBounds(inserted)
  if (bounds) useViewStore.getState().zoomToFit(bounds)

  window.dispatchEvent(new Event(CANVAS_INVALIDATED_EVENT))
  return inserted
}
