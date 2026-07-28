import type { ToolType } from '../store/types'

export type ShortcutCategory = 'tools' | 'edit' | 'view' | 'arrange' | 'style' | 'help'

export type ShortcutActionId =
  | 'tool.select'
  | 'tool.pen'
  | 'tool.eraser'
  | 'tool.pan'
  | 'tool.text'
  | 'tool.rectangle'
  | 'tool.circle'
  | 'tool.line'
  | 'tool.arrow'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.pastePlainText'
  | 'edit.selectAll'
  | 'edit.delete'
  | 'edit.duplicate'
  | 'arrange.group'
  | 'arrange.ungroup'
  | 'arrange.lock'
  | 'arrange.unlock'
  | 'view.zoomIn'
  | 'view.zoomOut'
  | 'view.reset'
  | 'view.zoomToSelection'
  | 'view.toggleGrid'
  | 'view.toggleGridSnap'
  | 'view.eagleEye'
  | 'style.eyedropper'
  | 'style.cycleGeometry'
  | 'help.shortcuts'

export interface ShortcutBinding {
  key: string
  mod?: boolean
  shift?: boolean
  alt?: boolean
}

export type ShortcutBindingMap = Record<ShortcutActionId, ShortcutBinding | null>

export interface ShortcutActionDefinition {
  id: ShortcutActionId
  label: string
  category: ShortcutCategory
  defaultBinding: ShortcutBinding | null
  fixedBindings?: ShortcutBinding[]
}

export interface ShortcutConflict {
  label: string
  actionId?: ShortcutActionId
}

export interface ShortcutExportPayload {
  version: 1
  bindings: Partial<Record<ShortcutActionId, ShortcutBinding | null>>
}

const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Meta', 'Shift'])
const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  tools: 'Tools',
  edit: 'Edit',
  view: 'View',
  arrange: 'Arrange',
  style: 'Style',
  help: 'Help',
}

export const SHORTCUT_DEFINITIONS: ShortcutActionDefinition[] = [
  { id: 'tool.select', label: 'Select tool', category: 'tools', defaultBinding: { key: '0' } },
  { id: 'tool.pen', label: 'Pen tool', category: 'tools', defaultBinding: { key: '1' } },
  { id: 'tool.eraser', label: 'Eraser tool', category: 'tools', defaultBinding: { key: '2' } },
  { id: 'tool.pan', label: 'Pan tool', category: 'tools', defaultBinding: { key: '3' } },
  {
    id: 'tool.rectangle',
    label: 'Rectangle tool',
    category: 'tools',
    defaultBinding: { key: '4' },
  },
  { id: 'tool.circle', label: 'Circle tool', category: 'tools', defaultBinding: { key: '5' } },
  { id: 'tool.text', label: 'Text tool', category: 'tools', defaultBinding: { key: '6' } },
  { id: 'tool.line', label: 'Line tool', category: 'tools', defaultBinding: { key: '7' } },
  { id: 'tool.arrow', label: 'Arrow tool', category: 'tools', defaultBinding: { key: '8' } },
  { id: 'edit.undo', label: 'Undo', category: 'edit', defaultBinding: { key: 'Z', mod: true } },
  {
    id: 'edit.redo',
    label: 'Redo',
    category: 'edit',
    defaultBinding: { key: 'Z', mod: true, shift: true },
    fixedBindings: [{ key: 'Y', mod: true }],
  },
  { id: 'edit.copy', label: 'Copy', category: 'edit', defaultBinding: { key: 'C', mod: true } },
  { id: 'edit.paste', label: 'Paste', category: 'edit', defaultBinding: { key: 'V', mod: true } },
  {
    id: 'edit.pastePlainText',
    label: 'Paste as plain text',
    category: 'edit',
    defaultBinding: { key: 'V', mod: true, shift: true },
  },
  {
    id: 'edit.selectAll',
    label: 'Select all',
    category: 'edit',
    defaultBinding: { key: 'A', mod: true },
  },
  {
    id: 'edit.delete',
    label: 'Delete selected',
    category: 'edit',
    defaultBinding: { key: 'Delete' },
    fixedBindings: [{ key: 'Backspace' }],
  },
  {
    id: 'edit.duplicate',
    label: 'Duplicate selected',
    category: 'edit',
    defaultBinding: { key: 'D', mod: true },
  },
  {
    id: 'arrange.group',
    label: 'Group elements',
    category: 'arrange',
    defaultBinding: { key: 'G', mod: true },
  },
  {
    id: 'arrange.ungroup',
    label: 'Ungroup elements',
    category: 'arrange',
    defaultBinding: { key: 'G', mod: true, shift: true },
  },
  {
    id: 'arrange.lock',
    label: 'Lock selected',
    category: 'arrange',
    defaultBinding: { key: 'L', mod: true },
  },
  {
    id: 'arrange.unlock',
    label: 'Unlock selected',
    category: 'arrange',
    defaultBinding: { key: 'L', mod: true, shift: true },
  },
  {
    id: 'view.zoomIn',
    label: 'Zoom in',
    category: 'view',
    defaultBinding: { key: '+' },
    fixedBindings: [{ key: '=' }],
  },
  { id: 'view.zoomOut', label: 'Zoom out', category: 'view', defaultBinding: { key: '-' } },
  {
    id: 'view.reset',
    label: 'Reset view',
    category: 'view',
    defaultBinding: { key: '0', mod: true },
  },
  {
    id: 'view.zoomToSelection',
    label: 'Zoom to selection',
    category: 'view',
    defaultBinding: { key: '2', mod: true },
  },
  {
    id: 'view.toggleGrid',
    label: 'Toggle grid',
    category: 'view',
    defaultBinding: { key: 'G', shift: true },
  },
  {
    id: 'view.toggleGridSnap',
    label: 'Toggle grid snap',
    category: 'view',
    defaultBinding: { key: 'S', shift: true },
  },
  { id: 'view.eagleEye', label: 'Eagle Eye', category: 'view', defaultBinding: { key: 'Z' } },
  {
    id: 'style.eyedropper',
    label: 'Style eyedropper',
    category: 'style',
    defaultBinding: { key: 'Q' },
  },
  {
    id: 'style.cycleGeometry',
    label: 'Cycle geometry tools',
    category: 'style',
    defaultBinding: { key: 'G' },
  },
  {
    id: 'help.shortcuts',
    label: 'Keyboard shortcuts',
    category: 'help',
    defaultBinding: { key: '?' },
    fixedBindings: [{ key: 'F1' }],
  },
]

export const TOOL_SHORTCUT_ACTIONS: Record<ToolType, ShortcutActionId> = {
  select: 'tool.select',
  pen: 'tool.pen',
  eraser: 'tool.eraser',
  pan: 'tool.pan',
  text: 'tool.text',
  rectangle: 'tool.rectangle',
  circle: 'tool.circle',
  line: 'tool.line',
  arrow: 'tool.arrow',
}

export const FIXED_SHORTCUT_HELP: { keys: string[]; label: string; category: ShortcutCategory }[] =
  [
    { keys: ['Arrow Keys'], label: 'Move selected', category: 'arrange' },
    { keys: ['Ctrl', 'Arrow'], label: 'Move selected by 10px', category: 'arrange' },
    { keys: ['Shift', 'Arrow'], label: 'Move selected by 50px', category: 'arrange' },
    { keys: ['Shift', 'Click'], label: 'Multi-select', category: 'arrange' },
    { keys: ['Shift', '1-0'], label: 'Quick color palette', category: 'style' },
    { keys: ['Alt', '1-8'], label: 'Quick color presets', category: 'style' },
    { keys: ['Double-click'], label: 'Edit text', category: 'edit' },
    { keys: ['Esc'], label: 'Cancel current mode', category: 'view' },
    { keys: ['Ctrl', 'Shift', 'P'], label: 'Screen Pen', category: 'view' },
  ]

export function getShortcutCategoryLabel(category: ShortcutCategory): string {
  return CATEGORY_LABELS[category]
}

export function getDefaultShortcutBindings(): ShortcutBindingMap {
  return SHORTCUT_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.id] = definition.defaultBinding
      ? normalizeShortcutBinding(definition.defaultBinding)
      : null
    return acc
  }, {} as ShortcutBindingMap)
}

export const DEFAULT_SHORTCUT_BINDINGS = getDefaultShortcutBindings()

export function normalizeKey(key: string): string {
  if (key === ' ') return 'Space'
  if (key === 'Esc') return 'Escape'
  if (key.length === 1 && /^[a-z]$/i.test(key)) return key.toUpperCase()
  return key
}

export function normalizeShortcutBinding(binding: ShortcutBinding): ShortcutBinding {
  const normalized: ShortcutBinding = { key: normalizeKey(binding.key) }
  if (binding.mod) normalized.mod = true
  if (binding.shift) normalized.shift = true
  if (binding.alt) normalized.alt = true
  return normalized
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable
  )
}

function keyEncodesShift(key: string): boolean {
  return key.length === 1 && !/^[A-Z0-9]$/.test(key)
}

export function shortcutBindingFromEvent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>
): ShortcutBinding | null {
  if (MODIFIER_KEYS.has(event.key)) return null

  const key = normalizeKey(event.key)
  const binding: ShortcutBinding = { key }
  if (event.ctrlKey || event.metaKey) binding.mod = true
  if (event.altKey) binding.alt = true
  if (event.shiftKey && !keyEncodesShift(key)) binding.shift = true
  return binding
}

export function shortcutBindingSignature(binding: ShortcutBinding | null): string {
  if (!binding) return ''
  const normalized = normalizeShortcutBinding(binding)
  return [
    normalized.mod ? 'mod' : '',
    normalized.alt ? 'alt' : '',
    normalized.shift ? 'shift' : '',
    normalized.key,
  ]
    .filter(Boolean)
    .join('+')
}

export function shortcutBindingsEqual(
  a: ShortcutBinding | null,
  b: ShortcutBinding | null
): boolean {
  return shortcutBindingSignature(a) === shortcutBindingSignature(b)
}

export function matchesShortcutBinding(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  binding: ShortcutBinding | null
): boolean {
  if (!binding) return false
  const eventBinding = shortcutBindingFromEvent(event)
  return shortcutBindingsEqual(eventBinding, binding)
}

export function getShortcutBinding(
  actionId: ShortcutActionId,
  bindings: ShortcutBindingMap
): ShortcutBinding | null {
  return bindings[actionId] ?? null
}

export function findShortcutAction(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  bindings: ShortcutBindingMap
): ShortcutActionId | null {
  for (const definition of SHORTCUT_DEFINITIONS) {
    if (matchesShortcutBinding(event, getShortcutBinding(definition.id, bindings))) {
      return definition.id
    }
    if (definition.fixedBindings?.some((binding) => matchesShortcutBinding(event, binding))) {
      return definition.id
    }
  }
  return null
}

export function formatShortcutBinding(binding: ShortcutBinding | null): string {
  if (!binding) return 'Disabled'
  const normalized = normalizeShortcutBinding(binding)
  const parts = []
  if (normalized.mod) parts.push('Ctrl')
  if (normalized.alt) parts.push('Alt')
  if (normalized.shift) parts.push('Shift')
  parts.push(normalized.key === 'Space' ? 'Space' : normalized.key)
  return parts.join('+')
}

export function getShortcutKeyParts(binding: ShortcutBinding | null): string[] {
  if (!binding) return ['Disabled']
  return formatShortcutBinding(binding).split('+')
}

export function formatShortcutBadge(binding: ShortcutBinding | null): string {
  if (!binding || binding.mod || binding.alt || binding.shift) return ''
  if (binding.key.length <= 2) return binding.key
  return ''
}

export function getDefinition(actionId: ShortcutActionId): ShortcutActionDefinition {
  const definition = SHORTCUT_DEFINITIONS.find((item) => item.id === actionId)
  if (!definition) throw new Error(`Unknown shortcut action: ${actionId}`)
  return definition
}

function getReservedShortcutConflict(binding: ShortcutBinding): ShortcutConflict | null {
  const normalized = normalizeShortcutBinding(binding)

  if (normalized.key === 'Escape') return { label: 'Cancel current mode' }
  if (normalized.key.startsWith('Arrow')) return { label: 'Move selected elements' }
  if (normalized.mod && normalized.shift && normalized.key === 'P') return { label: 'Screen Pen' }
  if (normalized.alt && /^[1-8]$/.test(normalized.key)) return { label: 'Quick color presets' }
  if (normalized.shift && /^[0-9]$/.test(normalized.key)) return { label: 'Quick color palette' }

  return null
}

export function findShortcutConflict(
  actionId: ShortcutActionId,
  binding: ShortcutBinding | null,
  bindings: ShortcutBindingMap
): ShortcutConflict | null {
  if (!binding) return null

  const normalized = normalizeShortcutBinding(binding)
  const reserved = getReservedShortcutConflict(normalized)
  if (reserved) return reserved

  for (const definition of SHORTCUT_DEFINITIONS) {
    if (definition.id === actionId) continue

    const candidate = getShortcutBinding(definition.id, bindings)
    if (shortcutBindingsEqual(normalized, candidate)) {
      return { actionId: definition.id, label: definition.label }
    }
    if (definition.fixedBindings?.some((fixed) => shortcutBindingsEqual(normalized, fixed))) {
      return { actionId: definition.id, label: definition.label }
    }
  }

  return null
}

export function mergeShortcutBindings(
  value: Partial<Record<ShortcutActionId, ShortcutBinding | null>>
): ShortcutBindingMap {
  const merged = getDefaultShortcutBindings()
  for (const definition of SHORTCUT_DEFINITIONS) {
    if (Object.prototype.hasOwnProperty.call(value, definition.id)) {
      const binding = value[definition.id]
      merged[definition.id] = binding ? normalizeShortcutBinding(binding) : null
    }
  }
  return merged
}

export function validateShortcutBindings(bindings: ShortcutBindingMap): ShortcutConflict | null {
  for (const definition of SHORTCUT_DEFINITIONS) {
    const conflict = findShortcutConflict(definition.id, bindings[definition.id], bindings)
    if (conflict) {
      return {
        ...conflict,
        label: `${definition.label} conflicts with ${conflict.label}`,
      }
    }
  }
  return null
}

function isShortcutActionId(value: string): value is ShortcutActionId {
  return SHORTCUT_DEFINITIONS.some((definition) => definition.id === value)
}

function parseBinding(value: unknown): ShortcutBinding | null | undefined {
  if (value === null) return null
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Partial<ShortcutBinding>
  if (typeof candidate.key !== 'string' || candidate.key.trim() === '') return undefined

  return normalizeShortcutBinding({
    key: candidate.key,
    mod: candidate.mod === true,
    shift: candidate.shift === true,
    alt: candidate.alt === true,
  })
}

export function parseShortcutExport(json: string): ShortcutExportPayload | null {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object') return null

    const payload = parsed as { version?: unknown; bindings?: unknown }
    if (payload.version !== 1 || !payload.bindings || typeof payload.bindings !== 'object') {
      return null
    }

    const bindings: Partial<Record<ShortcutActionId, ShortcutBinding | null>> = {}
    for (const [actionId, rawBinding] of Object.entries(payload.bindings)) {
      if (!isShortcutActionId(actionId)) continue
      const binding = parseBinding(rawBinding)
      if (binding !== undefined) bindings[actionId] = binding
    }

    return { version: 1, bindings }
  } catch {
    return null
  }
}

export function createShortcutExport(bindings: ShortcutBindingMap): string {
  return JSON.stringify({ version: 1, bindings }, null, 2)
}
