import { shallowClone } from '../store/helpers'
import { elementBounds, moveElement, type Binding, type CanvasElement } from '../store/types'
import { loadFromStorage, saveToStorage } from '../store/storage'

export type TemplateCategory =
  'flowchart' | 'mind-map' | 'wireframe' | 'diagram' | 'notes' | 'custom'

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  width: number
  height: number
  elements: CanvasElement[]
  createdAt?: number
  updatedAt?: number
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  flowchart: '流程图',
  'mind-map': '思维导图',
  wireframe: '线框图',
  diagram: '图表',
  notes: '笔记',
  custom: '自定义',
}

export const CUSTOM_TEMPLATE_STORAGE_KEY = 'mindnotes.customTemplates.v1'

let idCounter = 0

function createRuntimeId(prefix: string): string {
  idCounter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${idCounter}`
}

function shape(
  id: string,
  kind: 'rectangle' | 'circle' | 'line' | 'arrow',
  x: number,
  y: number,
  w: number,
  h: number,
  color = '#334155',
  fillColor?: string,
  rotation?: number
): CanvasElement {
  return {
    type: 'shape',
    id,
    kind,
    x,
    y,
    w,
    h,
    color,
    size: kind === 'line' || kind === 'arrow' ? 3 : 2,
    fillColor,
    rotation,
  }
}

function text(
  id: string,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize = 18,
  color = '#1F2937'
): CanvasElement {
  return {
    type: 'text',
    id,
    x,
    y,
    width,
    height,
    content,
    fontSize,
    color,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
  }
}

const BUILT_IN_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'template-flowchart-basic',
    name: '流程图',
    description: '开始、处理、判断和结束节点',
    category: 'flowchart',
    width: 320,
    height: 500,
    elements: [
      shape('flow-start', 'circle', 210, 10, 140, 58, '#2B8A3E', '#E9F7EF'),
      text('flow-start-text', '开始', 230, 25, 100, 28, 18, '#14532D'),
      shape('flow-arrow-1', 'arrow', 280, 68, 0, 58, '#475569'),
      shape('flow-process', 'rectangle', 180, 126, 200, 74, '#2563EB', '#EFF6FF'),
      text('flow-process-text', '处理', 215, 150, 130, 28, 18, '#1D4ED8'),
      shape('flow-arrow-2', 'arrow', 280, 200, 0, 58, '#475569'),
      shape('flow-decision', 'rectangle', 216, 252, 128, 128, '#C2410C', '#FFF7ED', Math.PI / 4),
      text('flow-decision-text', '判断', 220, 304, 120, 28, 17, '#9A3412'),
      shape('flow-arrow-3', 'arrow', 280, 380, 0, 54, '#475569'),
      shape('flow-end', 'circle', 210, 434, 140, 58, '#7C3AED', '#F5F3FF'),
      text('flow-end-text', '结束', 230, 449, 100, 28, 18, '#5B21B6'),
      shape('flow-no-arrow', 'arrow', 344, 316, 120, 0, '#475569'),
      text('flow-no-text', '否', 390, 285, 50, 24, 14, '#64748B'),
    ],
  },
  {
    id: 'template-mind-map-basic',
    name: '思维导图',
    description: '中心主题和均衡分支',
    category: 'mind-map',
    width: 640,
    height: 380,
    elements: [
      shape('mind-center', 'circle', 250, 140, 140, 90, '#2563EB', '#DBEAFE'),
      text('mind-center-text', '主题', 270, 170, 100, 28, 20, '#1E40AF'),
      shape('mind-line-1', 'line', 250, 180, -130, -88, '#64748B'),
      shape('mind-line-2', 'line', 250, 190, -135, 96, '#64748B'),
      shape('mind-line-3', 'line', 390, 180, 140, -84, '#64748B'),
      shape('mind-line-4', 'line', 390, 190, 140, 96, '#64748B'),
      shape('mind-node-1', 'rectangle', 20, 64, 132, 56, '#16A34A', '#ECFDF5'),
      text('mind-node-1-text', '分支', 38, 79, 96, 24, 16, '#166534'),
      shape('mind-node-2', 'rectangle', 14, 258, 140, 56, '#C2410C', '#FFF7ED'),
      text('mind-node-2-text', '分支', 36, 273, 96, 24, 16, '#9A3412'),
      shape('mind-node-3', 'rectangle', 500, 68, 132, 56, '#7C3AED', '#F5F3FF'),
      text('mind-node-3-text', '分支', 518, 83, 96, 24, 16, '#5B21B6'),
      shape('mind-node-4', 'rectangle', 494, 258, 140, 56, '#0F766E', '#F0FDFA'),
      text('mind-node-4-text', '分支', 516, 273, 96, 24, 16, '#115E59'),
    ],
  },
  {
    id: 'template-wireframe-dashboard',
    name: '界面线框',
    description: '顶部栏、侧栏、卡片和表单控件',
    category: 'wireframe',
    width: 640,
    height: 420,
    elements: [
      shape('wire-frame', 'rectangle', 20, 20, 600, 360, '#334155', '#F8FAFC'),
      shape('wire-header', 'rectangle', 20, 20, 600, 56, '#334155', '#E2E8F0'),
      shape('wire-dot-1', 'circle', 42, 40, 10, 10, '#EF4444', '#FEE2E2'),
      shape('wire-dot-2', 'circle', 62, 40, 10, 10, '#F59E0B', '#FEF3C7'),
      shape('wire-dot-3', 'circle', 82, 40, 10, 10, '#22C55E', '#DCFCE7'),
      shape('wire-sidebar', 'rectangle', 44, 104, 142, 232, '#64748B', '#F1F5F9'),
      shape('wire-nav-1', 'rectangle', 66, 128, 98, 18, '#94A3B8', '#CBD5E1'),
      shape('wire-nav-2', 'rectangle', 66, 166, 98, 18, '#94A3B8', '#E2E8F0'),
      shape('wire-nav-3', 'rectangle', 66, 204, 98, 18, '#94A3B8', '#E2E8F0'),
      shape('wire-card-1', 'rectangle', 222, 104, 160, 98, '#2563EB', '#EFF6FF'),
      shape('wire-card-2', 'rectangle', 412, 104, 160, 98, '#16A34A', '#ECFDF5'),
      shape('wire-input', 'rectangle', 222, 238, 350, 42, '#94A3B8', '#FFFFFF'),
      shape('wire-button', 'rectangle', 422, 306, 150, 42, '#2563EB', '#DBEAFE'),
      text('wire-button-text', '按钮', 450, 316, 94, 22, 15, '#1D4ED8'),
    ],
  },
  {
    id: 'template-diagram-network',
    name: '网络图',
    description: '客户端、网关、服务和数据库',
    category: 'diagram',
    width: 620,
    height: 360,
    elements: [
      shape('net-client', 'circle', 30, 130, 92, 92, '#2563EB', '#DBEAFE'),
      text('net-client-text', '客户端', 46, 161, 60, 24, 16, '#1D4ED8'),
      shape('net-arrow-1', 'arrow', 122, 176, 116, 0, '#475569'),
      shape('net-gateway', 'rectangle', 238, 128, 124, 96, '#0F766E', '#CCFBF1'),
      text('net-gateway-text', '网关', 256, 163, 88, 24, 16, '#115E59'),
      shape('net-arrow-2', 'arrow', 362, 176, 120, -84, '#475569'),
      shape('net-arrow-3', 'arrow', 362, 176, 120, 84, '#475569'),
      shape('net-service', 'circle', 482, 46, 104, 86, '#7C3AED', '#F5F3FF'),
      text('net-service-text', '服务', 504, 76, 60, 24, 16, '#5B21B6'),
      shape('net-db', 'rectangle', 482, 226, 104, 86, '#C2410C', '#FFF7ED'),
      text('net-db-text', '数据库', 496, 256, 76, 24, 15, '#9A3412'),
    ],
  },
  {
    id: 'template-notes-cornell',
    name: '康奈尔笔记',
    description: '提示、笔记和总结区布局',
    category: 'notes',
    width: 640,
    height: 480,
    elements: [
      shape('cornell-page', 'rectangle', 30, 20, 580, 420, '#334155', '#FFFBEB'),
      shape('cornell-cue-line', 'line', 210, 82, 0, 270, '#94A3B8'),
      shape('cornell-summary-line', 'line', 30, 352, 580, 0, '#94A3B8'),
      text('cornell-title', '主题', 62, 42, 210, 28, 22, '#92400E'),
      text('cornell-cues', '提示', 70, 102, 90, 24, 16, '#475569'),
      text('cornell-notes', '笔记', 252, 102, 110, 24, 16, '#475569'),
      text('cornell-summary', '总结', 70, 374, 120, 24, 16, '#475569'),
      shape('cornell-note-line-1', 'line', 252, 154, 300, 0, '#CBD5E1'),
      shape('cornell-note-line-2', 'line', 252, 202, 300, 0, '#CBD5E1'),
      shape('cornell-note-line-3', 'line', 252, 250, 300, 0, '#CBD5E1'),
      shape('cornell-cue-dot-1', 'circle', 78, 158, 10, 10, '#F59E0B', '#FEF3C7'),
      shape('cornell-cue-dot-2', 'circle', 78, 206, 10, 10, '#F59E0B', '#FEF3C7'),
    ],
  },
]

function cloneBinding(
  binding: Binding | undefined,
  idMap?: Map<string, string>
): Binding | undefined {
  if (!binding) return undefined
  const targetId = idMap?.get(binding.targetId)
  if (idMap && !targetId) return undefined
  return { ...binding, targetId: targetId ?? binding.targetId }
}

function cloneElement(
  el: CanvasElement,
  idMap?: Map<string, string>,
  groupMap?: Map<string, string>
): CanvasElement {
  const id = idMap?.get(el.id) ?? el.id
  const groupId = el.groupId ? (groupMap?.get(el.groupId) ?? el.groupId) : undefined
  const base = shallowClone(el)

  if (base.type === 'shape') {
    return {
      ...base,
      id,
      groupId,
      startBinding: cloneBinding(base.startBinding, idMap),
      endBinding: cloneBinding(base.endBinding, idMap),
    }
  }

  return { ...base, id, groupId } as CanvasElement
}

function unlockTemplateElement(el: CanvasElement): CanvasElement {
  if (!el.locked) return el
  return { ...el, locked: false }
}

export function cloneTemplate(template: CanvasTemplate): CanvasTemplate {
  return { ...template, elements: template.elements.map((el) => cloneElement(el)) }
}

export function getBuiltInTemplates(): CanvasTemplate[] {
  return BUILT_IN_TEMPLATES.map(cloneTemplate)
}

export function getTemplateBounds(
  elements: CanvasElement[]
): { x: number; y: number; w: number; h: number } | null {
  if (elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    const bounds = elementBounds(el)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.w)
    maxY = Math.max(maxY, bounds.y + bounds.h)
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function instantiateTemplate(
  template: CanvasTemplate,
  centerX: number,
  centerY: number
): CanvasElement[] {
  const bounds = getTemplateBounds(template.elements)
  if (!bounds) return []

  const idMap = new Map(template.elements.map((el) => [el.id, createRuntimeId(el.type)]))
  const groupIds = new Set(template.elements.map((el) => el.groupId).filter(Boolean) as string[])
  const groupMap = new Map([...groupIds].map((groupId) => [groupId, createRuntimeId('group')]))
  const dx = centerX - (bounds.x + bounds.w / 2)
  const dy = centerY - (bounds.y + bounds.h / 2)

  return template.elements.map((el) =>
    unlockTemplateElement(moveElement(cloneElement(el, idMap, groupMap), dx, dy))
  )
}

export function createTemplateFromElements(
  name: string,
  elements: CanvasElement[]
): CanvasTemplate | null {
  const bounds = getTemplateBounds(elements)
  if (!bounds) return null

  const now = Date.now()
  const normalized = elements.map((el) =>
    unlockTemplateElement(moveElement(cloneElement(el), -bounds.x, -bounds.y))
  )
  const trimmedName = name.trim() || '未命名模板'

  return {
    id: createRuntimeId('custom-template'),
    name: trimmedName,
    description: `${elements.length} element${elements.length === 1 ? '' : 's'}`,
    category: 'custom',
    width: Math.round(bounds.w),
    height: Math.round(bounds.h),
    elements: normalized,
    createdAt: now,
    updatedAt: now,
  }
}

function isCanvasTemplate(value: unknown): value is CanvasTemplate {
  if (!value || typeof value !== 'object') return false
  const maybe = value as Partial<CanvasTemplate>
  return (
    typeof maybe.id === 'string' &&
    typeof maybe.name === 'string' &&
    typeof maybe.description === 'string' &&
    maybe.category === 'custom' &&
    typeof maybe.width === 'number' &&
    typeof maybe.height === 'number' &&
    Array.isArray(maybe.elements)
  )
}

export function loadCustomTemplates(): CanvasTemplate[] {
  const stored = loadFromStorage<unknown>(CUSTOM_TEMPLATE_STORAGE_KEY, [])
  if (!Array.isArray(stored)) return []
  return stored.filter(isCanvasTemplate).map(cloneTemplate)
}

export function saveCustomTemplate(template: CanvasTemplate): CanvasTemplate[] {
  const customTemplate: CanvasTemplate = {
    ...cloneTemplate(template),
    category: 'custom',
    updatedAt: Date.now(),
  }
  const templates = loadCustomTemplates()
  const next = [customTemplate, ...templates.filter((item) => item.id !== customTemplate.id)].slice(
    0,
    24
  )
  saveToStorage(CUSTOM_TEMPLATE_STORAGE_KEY, next)
  return next
}

export function deleteCustomTemplate(templateId: string): CanvasTemplate[] {
  const next = loadCustomTemplates().filter((template) => template.id !== templateId)
  saveToStorage(CUSTOM_TEMPLATE_STORAGE_KEY, next)
  return next
}
