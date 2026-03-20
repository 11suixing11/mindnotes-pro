import { TEMPLATES } from '../data/templates'
import { useAppStore, Shape } from '../store/useAppStore'

interface TemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
}

export default function TemplateSelector({ isOpen, onClose }: TemplateSelectorProps) {
  const { strokes, shapes, addShape } = useAppStore()

  if (!isOpen) return null

  const handleSelect = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    // 如果画布不为空，确认是否覆盖
    if ((strokes.length > 0 || shapes.length > 0) && templateId !== 'blank') {
      if (!confirm('应用模板会添加到当前画布，确定？')) return
    }

    // 添加模板的形状
    template.shapes.forEach((shape) => {
      addShape(shape as Shape)
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 面板 */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">📋 选择模板</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelect(tpl.id)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-center group"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">{tpl.icon}</span>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{tpl.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{tpl.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
