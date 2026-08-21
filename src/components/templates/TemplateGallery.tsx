import { TEMPLATE_CATEGORY_LABELS, type CanvasTemplate } from '../../templates/canvasTemplates'
import TemplateCard from './TemplateCard'
import type { TemplateSection } from './templatePickerModel'

interface TemplateGalleryProps {
  builtInSections: TemplateSection[]
  customTemplates: CanvasTemplate[]
  onInsert: (template: CanvasTemplate) => void
  onDeleteCustom: (templateId: string) => void
}

export default function TemplateGallery({
  builtInSections,
  customTemplates,
  onInsert,
  onDeleteCustom,
}: TemplateGalleryProps) {
  return (
    <div className="template-picker-body">
      {builtInSections.map((section) => (
        <section key={section.category} className="template-section" aria-label={section.label}>
          <h3>{section.label}</h3>
          <div className="template-grid">
            {section.templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isCustom={false}
                onInsert={onInsert}
                onDelete={onDeleteCustom}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="template-section" aria-label={TEMPLATE_CATEGORY_LABELS.custom}>
        <h3>{TEMPLATE_CATEGORY_LABELS.custom}</h3>
        {customTemplates.length > 0 ? (
          <div className="template-grid">
            {customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isCustom
                onInsert={onInsert}
                onDelete={onDeleteCustom}
              />
            ))}
          </div>
        ) : (
          <div className="template-empty">暂无自定义模板</div>
        )}
      </section>
    </div>
  )
}
