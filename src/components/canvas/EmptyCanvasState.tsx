import type { CSSProperties } from 'react'
import { FileUp, Moon, PenLine, Shapes, Sun, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useToastStore } from '../../store/toastStore'
import { useThemeStore } from '../../store/useThemeStore'
import { createOpenFileEvent, OPEN_TEMPLATES_EVENT } from '../../appEvents'
import { getBuiltInTemplates, type CanvasTemplate } from '../../templates/canvasTemplates'
import { insertTemplateIntoCanvas } from '../templates/templateInsertion'
import { TemplateMiniPreview } from '../templates/TemplateMiniPreview'
import { isDarkPaperColor } from '../../canvas/canvasBackground'

const QUICK_START_TEMPLATE_NAMES = ['思维导图', '流程图', '康奈尔笔记']

/**
 * Hand-drawn annotation arrows, Drawnix-style: they point at the real chrome
 * around the empty canvas. Purely decorative.
 */
function NoteArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="86"
      height="64"
      viewBox="0 0 86 64"
      fill="none"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M78 58C58 48 24 42 8 10"
        stroke="var(--paper-ink-2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M8 10L5 24M8 10L20 16"
        stroke="var(--paper-ink-2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  )
}

/**
 * The hero of the empty canvas: a hand-sketched mini mind map that draws
 * itself in — solid branches first, then the pencil arrives to finish the
 * dashed branch, inviting the user to take over. Words cannot teach a
 * whiteboard; a sketch that draws itself can.
 */
function MindMapSketch({ accent }: { accent: string }) {
  return (
    <svg
      className="empty-canvas-sketch"
      width="280"
      height="170"
      viewBox="0 0 280 170"
      fill="none"
      aria-hidden="true"
    >
      {/* branches draw themselves in sequence */}
      <path
        className="ec-draw ec-dd-1"
        d="M98 66C80 58 68 46 58 36"
        stroke="var(--monet-lavender)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
      />
      <path
        className="ec-draw ec-dd-2"
        d="M182 62C198 52 210 42 222 32"
        stroke="var(--monet-sage)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
      />
      <path
        className="ec-draw ec-dd-3"
        d="M100 94C84 104 70 112 62 118"
        stroke="var(--monet-sage)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
      />
      {/* the branch the user will draw: fades in dashed, pencil finishes it */}
      <path
        className="ec-fade ec-dd-7"
        d="M180 92C196 104 210 114 224 122"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 6"
      />

      {/* center node */}
      <path
        className="ec-pop ec-dd-4"
        d="M98 62C102 50 178 48 184 60C190 74 189 88 183 94C168 102 110 101 100 94C93 87 94 71 98 62Z"
        stroke="var(--paper-ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text
        className="ec-fade ec-dd-5"
        x="141"
        y="82"
        textAnchor="middle"
        fill="var(--paper-ink)"
        fontSize="17"
        fontWeight="500"
      >
        想法
      </text>

      {/* branch nodes */}
      <rect
        className="ec-pop ec-dd-5"
        x="18"
        y="14"
        width="46"
        height="26"
        rx="13"
        fill="var(--monet-lavender)"
        opacity="0.18"
      />
      <rect
        className="ec-pop ec-dd-5"
        x="18"
        y="14"
        width="46"
        height="26"
        rx="13"
        stroke="var(--monet-lavender)"
        strokeWidth="1.8"
      />
      <rect
        className="ec-pop ec-dd-6"
        x="216"
        y="12"
        width="46"
        height="26"
        rx="13"
        fill="var(--monet-sage)"
        opacity="0.18"
      />
      <rect
        className="ec-pop ec-dd-6"
        x="216"
        y="12"
        width="46"
        height="26"
        rx="13"
        stroke="var(--monet-sage)"
        strokeWidth="1.8"
      />
      <rect
        className="ec-pop ec-dd-6"
        x="18"
        y="112"
        width="48"
        height="26"
        rx="13"
        fill="var(--monet-sage)"
        opacity="0.14"
      />
      <rect
        className="ec-pop ec-dd-6"
        x="18"
        y="112"
        width="48"
        height="26"
        rx="13"
        stroke="var(--monet-sage)"
        strokeWidth="1.8"
      />

      {/* the node waiting for the user: dashed outline */}
      <rect
        className="ec-pop ec-dd-10"
        x="222"
        y="116"
        width="50"
        height="28"
        rx="14"
        stroke={accent}
        strokeWidth="1.8"
        strokeDasharray="5 5"
      />

      {/* pencil drawing the dashed branch (CSS pop + bob on the wrapper) */}
      <g className="ec-pencil">
        <g transform="translate(196 136) rotate(-42)">
          <rect x="-4" y="-19" width="8" height="20" rx="2" fill={accent} />
          <rect x="-4" y="-21" width="8" height="4" rx="1.5" fill="var(--monet-rose)" />
          <path d="M-4 1L0 9L4 1Z" fill="var(--monet-warm)" />
          <path d="M-1.2 5.5L0 9L1.2 5.5Z" fill="var(--paper-ink)" />
        </g>
      </g>

      {/* life: small gold dots */}
      <circle className="ec-pop ec-dd-10" cx="258" cy="70" r="3" fill="var(--monet-gold)" opacity="0.9" />
      <circle className="ec-pop ec-dd-9" cx="34" cy="66" r="2.5" fill="var(--monet-gold)" opacity="0.8" />
      <circle className="ec-pop ec-dd-10" cx="244" cy="10" r="2" fill="var(--monet-rose)" opacity="0.7" />
    </svg>
  )
}

export function EmptyCanvasState() {
  const hasElements = useAppStore((state) => state.elements.length > 0)
  const bgColor = useAppStore((state) => state.bgColor)
  const setTool = useAppStore((state) => state.setTool)
  const toast = useToastStore((state) => state.show)
  const isDarkMode = useThemeStore((state) => state.isDarkMode)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  if (hasElements) return null

  // The onboarding lives on the paper, and the paper color is user content:
  // pick ink that contrasts with it instead of following the chrome theme.
  const darkPaper = isDarkPaperColor(bgColor)
  const paperInk = darkPaper ? '#f2ede6' : '#1c1917'
  const paperInkSoft = darkPaper ? 'rgba(242, 237, 230, 0.65)' : 'rgba(28, 25, 23, 0.62)'
  const accent = darkPaper ? '#d08a6c' : 'var(--primary)'
  const paperVars = {
    '--paper-ink': paperInk,
    '--paper-ink-2': paperInkSoft,
  } as CSSProperties

  const quickStartTemplates = getBuiltInTemplates().filter((template) =>
    QUICK_START_TEMPLATE_NAMES.includes(template.name)
  )

  const insertTemplate = (template: CanvasTemplate) => {
    const inserted = insertTemplateIntoCanvas(template)
    if (inserted.length === 0) {
      toast('模板为空', 'warning')
      return
    }
    toast(`已插入并选中 ${template.name}`, 'success')
  }

  return (
    <section
      className="empty-canvas-state"
      aria-labelledby="empty-canvas-title"
      style={paperVars}
    >
      <div className="empty-canvas-note empty-canvas-note-left ec-fade ec-dd-11" aria-hidden="true">
        <span>从这里开始</span>
        <NoteArrow />
      </div>
      <div className="empty-canvas-note empty-canvas-note-right ec-fade ec-dd-11" aria-hidden="true">
        <span>导出与备份</span>
        <NoteArrow flip />
      </div>

      <MindMapSketch accent={accent} />

      <h2 id="empty-canvas-title" className="empty-canvas-wordmark ec-up ec-dd-7">
        MindNotes Pro
      </h2>
      <svg
        className="empty-canvas-swash ec-draw ec-dd-8"
        width="104"
        height="10"
        viewBox="0 0 104 10"
        fill="none"
        aria-hidden="true"
        style={{ strokeDasharray: 130, strokeDashoffset: 130 }}
      >
        <path
          d="M3 7C30 3 74 2 101 6"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
      <p className="empty-canvas-tagline ec-up ec-dd-8">
        All-in-one 白板 · 思维导图 · 流程图 · 自由画笔
      </p>

      <div className="empty-canvas-actions ec-up ec-dd-9">
        <button
          type="button"
          className="empty-canvas-action empty-canvas-action-primary"
          onClick={() => setTool('pen')}
        >
          <PenLine size={18} aria-hidden="true" />
          <span>开始绘制</span>
        </button>
        <button
          type="button"
          className="empty-canvas-action"
          onClick={() => window.dispatchEvent(new Event(OPEN_TEMPLATES_EVENT))}
        >
          <Shapes size={18} aria-hidden="true" />
          <span>插入模板</span>
        </button>
        <button
          type="button"
          className="empty-canvas-action"
          onClick={() => window.dispatchEvent(createOpenFileEvent('import'))}
        >
          <FileUp size={18} aria-hidden="true" />
          <span>导入备份</span>
        </button>
        <button
          type="button"
          className="empty-canvas-action"
          onClick={toggleTheme}
          aria-label={isDarkMode ? '切换到亮色模式' : '切换到深色模式'}
        >
          {isDarkMode ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          <span>{isDarkMode ? '亮色模式' : '深色模式'}</span>
        </button>
      </div>
      {quickStartTemplates.length > 0 && (
        <>
          <h3 className="empty-canvas-templates-label ec-up ec-dd-10">快速开始</h3>
          <div className="empty-canvas-templates ec-up ec-dd-10">
            {quickStartTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="empty-canvas-template-card"
                onClick={() => insertTemplate(template)}
              >
                <TemplateMiniPreview elements={template.elements} />
                <span className="empty-canvas-template-name">{template.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="empty-canvas-footnote ec-up ec-dd-11">
        <Sparkles size={12} aria-hidden="true" />
        支持直接粘贴豆包、ChatGPT 生成的 Mermaid 代码
      </p>
    </section>
  )
}

export default EmptyCanvasState
