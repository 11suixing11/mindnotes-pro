import { describe, expect, it } from 'vitest'
import { getBuiltInTemplates } from '../../templates/canvasTemplates'
import { getBuiltInTemplateSections } from './templatePickerModel'

describe('template picker model', () => {
  it('groups built-in templates by category in source order', () => {
    const templates = getBuiltInTemplates()
    const sections = getBuiltInTemplateSections(templates)

    expect(sections.map((section) => section.category)).toEqual([
      'flowchart',
      'mind-map',
      'wireframe',
      'diagram',
      'notes',
    ])
    expect(sections.map((section) => section.label)).toEqual([
      '流程图',
      '思维导图',
      '线框图',
      '图表',
      '笔记',
    ])
  })

  it('does not mutate the source template collection', () => {
    const templates = getBuiltInTemplates()
    const originalIds = templates.map((template) => template.id)

    getBuiltInTemplateSections(templates)

    expect(templates.map((template) => template.id)).toEqual(originalIds)
  })
})
