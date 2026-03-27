import { useEffect, useMemo, useState } from 'react'
import SyncEngine from '../utils/syncEngine'
import type { ConflictInfo } from '../utils/syncEngine/types'

interface ConflictEventPayload {
  documentId: string
  conflict: ConflictInfo
}

type ResolveStrategy = 'local' | 'remote' | 'merge'

const STRATEGY_LABEL: Record<ResolveStrategy, string> = {
  local: '保留本地',
  remote: '接受远程',
  merge: '自动合并',
}

export default function ConflictResolutionPanel() {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    const engine = new SyncEngine()

    const onConflictDetected = (payload: ConflictEventPayload) => {
      if (!payload?.conflict) return

      setConflicts((prev) => {
        const exists = prev.some((item) => item.documentId === payload.conflict.documentId)
        if (exists) {
          return prev.map((item) =>
            item.documentId === payload.conflict.documentId ? payload.conflict : item
          )
        }
        return [payload.conflict, ...prev]
      })
      setIsOpen(true)
    }

    const onConflictResolved = ({ documentId }: { documentId: string }) => {
      setConflicts((prev) => prev.filter((item) => item.documentId !== documentId))
      setResolvingId((prev) => (prev === documentId ? null : prev))
    }

    engine.on('conflict-detected', onConflictDetected)
    engine.on('conflict-resolved', onConflictResolved)

    return () => {
      engine.off('conflict-detected', onConflictDetected)
      engine.off('conflict-resolved', onConflictResolved)
    }
  }, [])

  const latest = useMemo(() => conflicts[0], [conflicts])

  const resolveConflict = async (docId: string, strategy: ResolveStrategy) => {
    setResolvingId(docId)
    try {
      // TODO: 实现冲突解决逻辑
      console.log('解决冲突:', docId, strategy)
      setConflicts((prev) => prev.filter((c) => c.documentId !== docId))
    } finally {
      setResolvingId(null)
    }
  }

  if (!conflicts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-300 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-amber-700 dark:bg-gray-900/95">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-amber-700 dark:text-amber-400">检测到同步冲突</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            当前待处理 {conflicts.length} 条，建议优先处理最新冲突。
          </div>
        </div>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
        >
          {isOpen ? '折叠' : '展开'}
        </button>
      </div>

      {isOpen && latest ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-1 font-semibold text-gray-700 dark:text-gray-200">文档 ID</div>
            <div className="break-all text-gray-500 dark:text-gray-400">{latest.documentId}</div>
            <div className="mt-2 flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <span>本地版本: {latest.localVersion}</span>
              <span>远程版本: {latest.remoteVersion}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(['local', 'remote', 'merge'] as ResolveStrategy[]).map((strategy) => (
              <button
                key={strategy}
                onClick={() => resolveConflict(latest.documentId, strategy)}
                disabled={resolvingId === latest.documentId}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:bg-blue-900/30"
              >
                {resolvingId === latest.documentId
                  ? '处理中...'
                  : `${STRATEGY_LABEL[strategy]} (${strategy})`}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
