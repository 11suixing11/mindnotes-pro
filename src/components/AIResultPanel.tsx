import type { WhiteboardAnalysisResult } from '../services/aiService'

interface AIResultPanelProps {
  open: boolean
  result: WhiteboardAnalysisResult | null
  onClose: () => void
}

export default function AIResultPanel({ open, result, onClose }: AIResultPanelProps) {
  if (!open || !result) {
    return null
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-color)] bg-[var(--toolbar-bg)] shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
        <div>
          <div className="text-xs text-[var(--text-secondary)]">AI 分析面板</div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{result.summary}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          关闭
        </button>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-auto p-4">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">识别内容</h4>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-sm leading-6 text-[var(--text-primary)]">
            {result.text}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">AI 建议</h4>
          {result.suggestions.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {result.suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion}-${index}`}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-secondary)]">
              暂无建议
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
