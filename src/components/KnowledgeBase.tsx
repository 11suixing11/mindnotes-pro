import { useEffect } from 'react'
import KBSidebar from './KBSidebar'
import KBContent from './KBContent'
import { useKBStore } from '../store/useKBStore'

export default function KnowledgeBase({ onOpenWhiteboard }: { onOpenWhiteboard?: () => void }) {
  const init = useKBStore((s) => s.init)
  const loaded = useKBStore((s) => s.loaded)

  useEffect(() => { init() }, [init])

  if (!loaded) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>加载中...</div>

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--card-solid)' }}>
      <KBSidebar onOpenWhiteboard={onOpenWhiteboard} />
      <KBContent />
    </div>
  )
}
