import { beforeEach, describe, expect, it } from 'vitest'
import type { CanvasElement, ShapeElement } from '../store/types'
import type { CanvasTemplate } from './canvasTemplates'
import {
  CUSTOM_TEMPLATE_STORAGE_KEY,
  LEGACY_V4_CUSTOM_TEMPLATE_STORAGE_KEY,
  LEGACY_CUSTOM_TEMPLATE_STORAGE_KEY,
  createTemplateFromElements,
  deleteCustomTemplate,
  findTemplateInsertionCenter,
  getBuiltInTemplates,
  getTemplateBounds,
  instantiateTemplate,
  loadCustomTemplates,
  saveCustomTemplate,
} from './canvasTemplates'
import { encodeLegacyStorageValue } from '../test/legacyStorage'

function makeShape(id: string, x = 50, y = 60): CanvasElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x,
    y,
    w: 100,
    h: 60,
    color: '#2563EB',
    size: 2,
    fillColor: '#DBEAFE',
  }
}

function requireTemplate(template: CanvasTemplate | null): CanvasTemplate {
  if (!template) throw new Error('Expected template to be created')
  return template
}

function requireBounds(bounds: ReturnType<typeof getTemplateBounds>) {
  if (!bounds) throw new Error('Expected template bounds')
  return bounds
}

function requireShapeElement(element: CanvasElement | undefined): ShapeElement {
  if (!element || element.type !== 'shape') throw new Error('Expected shape element')
  return element
}

describe('canvas templates', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides one built-in template for each requested category', () => {
    const templates = getBuiltInTemplates()

    expect(templates).toHaveLength(5)
    expect(templates.map((template) => template.name)).toEqual([
      '流程图',
      '思维导图',
      '界面线框',
      '网络图',
      '康奈尔笔记',
    ])
    expect(templates.map((template) => template.category)).toEqual([
      'flowchart',
      'mind-map',
      'wireframe',
      'diagram',
      'notes',
    ])
    expect(templates.every((template) => template.elements.length > 0)).toBe(true)
  })

  it('instantiates templates with fresh ids centered around the requested point', () => {
    const template = getBuiltInTemplates()[0]
    const originalIds = new Set(template.elements.map((el) => el.id))
    const inserted = instantiateTemplate(template, 1200, -340)
    const bounds = requireBounds(getTemplateBounds(inserted))

    expect(inserted).toHaveLength(template.elements.length)
    expect(new Set(inserted.map((el) => el.id)).size).toBe(inserted.length)
    expect(inserted.some((el) => originalIds.has(el.id))).toBe(false)
    expect(inserted.every((el) => el.groupId === undefined)).toBe(true)
    expect(bounds.x + bounds.w / 2).toBeCloseTo(1200, 5)
    expect(bounds.y + bounds.h / 2).toBeCloseTo(-340, 5)
  })

  it('remaps bindings only to elements included in the template', () => {
    const target = makeShape('target')
    const arrow: CanvasElement = {
      type: 'shape',
      id: 'arrow',
      kind: 'arrow',
      x: 0,
      y: 0,
      w: 100,
      h: 60,
      color: '#334155',
      size: 3,
      endBinding: { targetId: 'target', anchorX: 0.5, anchorY: 0.5 },
    }
    const template = requireTemplate(createTemplateFromElements('Bound template', [target, arrow]))
    const inserted = instantiateTemplate(template, 0, 0)
    const insertedTarget = requireShapeElement(
      inserted.find((el) => el.type === 'shape' && el.kind === 'rectangle')
    )
    const insertedArrow = requireShapeElement(
      inserted.find((el) => el.type === 'shape' && el.kind === 'arrow')
    )

    expect(insertedArrow.id).not.toBe('arrow')
    expect(insertedArrow.endBinding?.targetId).toBe(insertedTarget.id)
  })

  it('creates a custom template normalized to its own local bounds', () => {
    const source = [
      makeShape('a', 200, 300),
      {
        type: 'text',
        id: 'label',
        x: 360,
        y: 340,
        width: 120,
        height: 32,
        content: 'Label',
        fontSize: 18,
        color: '#111827',
      } satisfies CanvasElement,
    ]
    const template = requireTemplate(createTemplateFromElements('  My layout  ', source))
    const bounds = requireBounds(getTemplateBounds(template.elements))

    expect(template.name).toBe('My layout')
    expect(template.category).toBe('custom')
    expect(bounds.x).toBeCloseTo(0, 5)
    expect(bounds.y).toBeCloseTo(0, 5)
    expect(template.width).toBeGreaterThan(0)
    expect(template.height).toBeGreaterThan(0)
  })

  it('uses a localized fallback name for unnamed custom templates', () => {
    const template = requireTemplate(createTemplateFromElements('   ', [makeShape('unnamed')]))

    expect(template.name).toBe('未命名模板')
  })

  it('does not persist locked state into reusable templates', () => {
    const source = { ...makeShape('locked-source'), locked: true }
    const template = requireTemplate(createTemplateFromElements('Editable scaffold', [source]))
    const inserted = instantiateTemplate(template, 0, 0)

    expect(template.elements.every((element) => !element.locked)).toBe(true)
    expect(inserted.every((element) => !element.locked)).toBe(true)
  })

  it('persists and deletes custom templates with malformed data fallback', () => {
    const template = requireTemplate(createTemplateFromElements('Saved', [makeShape('saved')]))

    expect(saveCustomTemplate(template)).toHaveLength(1)
    expect(loadCustomTemplates()[0].name).toBe('Saved')
    expect(deleteCustomTemplate(template.id)).toHaveLength(0)

    localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, 'not-json')
    expect(loadCustomTemplates()).toEqual([])
  })

  it('ignores structurally invalid custom template elements', () => {
    localStorage.setItem(
      CUSTOM_TEMPLATE_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'broken-template',
          name: '损坏模板',
          description: 'invalid',
          category: 'custom',
          width: 100,
          height: 100,
          elements: [{ type: 'shape', id: 'missing-geometry' }],
        },
      ])
    )

    expect(loadCustomTemplates()).toEqual([])
  })

  it('recovers encrypted custom templates saved by the previous version', () => {
    const template = requireTemplate(createTemplateFromElements('旧模板', [makeShape('legacy')]))
    localStorage.setItem(LEGACY_CUSTOM_TEMPLATE_STORAGE_KEY, encodeLegacyStorageValue([template]))

    expect(loadCustomTemplates()).toEqual([expect.objectContaining({ name: '旧模板' })])
    expect(localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(LEGACY_CUSTOM_TEMPLATE_STORAGE_KEY)).toBeNull()
  })

  it('imports plain v4 custom templates into the v5 key', () => {
    const template = requireTemplate(createTemplateFromElements('v4', [makeShape('v4')]))
    localStorage.setItem(LEGACY_V4_CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify([template]))

    expect(loadCustomTemplates()).toEqual([expect.objectContaining({ name: 'v4' })])
    expect(localStorage.getItem(LEGACY_V4_CUSTOM_TEMPLATE_STORAGE_KEY)).toBeNull()
  })
})

describe('findTemplateInsertionCenter', () => {
  const preferredCenter = { x: 300, y: 400 }

  function insertedBoundsAt(center: { x: number; y: number }, elements: CanvasElement[]) {
    const bounds = requireBounds(getTemplateBounds(elements))
    return {
      left: center.x - bounds.w / 2,
      right: center.x + bounds.w / 2,
      top: center.y - bounds.h / 2,
      bottom: center.y + bounds.h / 2,
    }
  }

  function expectDisjoint(
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number }
  ) {
    expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(
      true
    )
  }

  it('keeps the preferred center on an empty canvas', () => {
    const elements = [makeShape('existing')]

    expect(
      findTemplateInsertionCenter({
        templateElements: elements,
        existingElements: [],
        preferredCenter,
      })
    ).toEqual(preferredCenter)
  })

  it('walks right until the template clears existing content', () => {
    const templateElements = [makeShape('tpl', 250, 370)]
    // makeShape(300,400) 的包围盒外扩后为 295..405 × 395..465，压住居中落点。
    const existingElements = [makeShape('stroke', 300, 400)]
    const center = findTemplateInsertionCenter({
      templateElements,
      existingElements,
      preferredCenter,
    })

    expect(center.x).toBeGreaterThan(preferredCenter.x)
    expectDisjoint(insertedBoundsAt(center, templateElements), {
      left: 295,
      right: 405,
      top: 395,
      bottom: 465,
    })
  })

  it('falls back to walking down when the whole right lane is blocked', () => {
    const templateElements = [makeShape('template')]
    // 模板步长为 130（宽 110 + 间距 20），沿右方向铺一排障碍封死 6 步试探。
    const existingElements = Array.from({ length: 6 }, (_, index) =>
      makeShape(`row-${index}`, 300 + (index + 1) * 130, 400)
    )
    // 居中落点本身也要有内容才会触发避让。
    existingElements.push(makeShape('stroke', 300, 400))
    const center = findTemplateInsertionCenter({
      templateElements,
      existingElements,
      preferredCenter,
    })

    expect(center.y).toBeGreaterThan(preferredCenter.y)
    expectDisjoint(insertedBoundsAt(center, templateElements), {
      left: 295,
      right: 1075,
      top: 395,
      bottom: 465,
    })
  })

  it('returns the preferred center when no clear spot exists within the budget', () => {
    const templateElements = [makeShape('template')]
    const existingElements: CanvasElement[] = [makeShape('stroke', 300, 400)]
    // 在右移与下移的每个候选位置都铺上障碍（步长与实现一致：130/90）。
    for (let step = 1; step <= 6; step += 1) {
      existingElements.push(makeShape(`right-${step}`, 300 + step * 130, 400))
      existingElements.push(makeShape(`down-${step}`, 300, 400 + step * 90))
    }
    const center = findTemplateInsertionCenter({
      templateElements,
      existingElements,
      preferredCenter,
    })

    expect(center).toEqual(preferredCenter)
  })
})
