import {
  TEMPLATE_CATEGORY_LABELS,
  type CanvasTemplate,
  type TemplateCategory,
} from '../../templates/canvasTemplates'

export interface TemplateSection {
  category: TemplateCategory
  label: string
  templates: CanvasTemplate[]
}

export function getBuiltInTemplateSections(templates: CanvasTemplate[]): TemplateSection[] {
  const grouped = templates.reduce<Partial<Record<TemplateCategory, CanvasTemplate[]>>>(
    (sections, template) => {
      sections[template.category] = [...(sections[template.category] ?? []), template]
      return sections
    },
    {}
  )

  return Object.entries(grouped).map(([category, sectionTemplates]) => ({
    category: category as TemplateCategory,
    label: TEMPLATE_CATEGORY_LABELS[category as TemplateCategory],
    templates: sectionTemplates,
  }))
}
