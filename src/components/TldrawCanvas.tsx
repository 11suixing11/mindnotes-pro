import { Suspense, lazy, useEffect } from 'react'
import '@tldraw/tldraw/tldraw.css'
import LoadingFallback from './ui/LoadingFallback'
import { useCollaboration } from '../hooks/useCollaboration'

declare global {
  interface Window {
    __MINDNOTES_TLDRAW_EDITOR__?: unknown
  }
}

const LazyTldraw = lazy(async () => {
  const module = await import('@tldraw/tldraw')
  return { default: module.Tldraw }
})

function TldrawCanvas() {
  const { isSynced, onlineUsers } = useCollaboration('mindnotes-room')
  void isSynced
  void onlineUsers

  const handleMount = (mountedEditor: { updateUserPreferences?: (input: Record<string, unknown>) => void }) => {
    window.__MINDNOTES_TLDRAW_EDITOR__ = mountedEditor
    mountedEditor.updateUserPreferences?.({
      language: 'zh-Hans',
      name: '协作用户',
    })
  }

  useEffect(() => {
    return () => {
      delete window.__MINDNOTES_TLDRAW_EDITOR__
    }
  }, [])

  return (
    <div className="relative w-full h-screen">
      {/*
        生产首发阶段暂时隐藏协作状态展示，避免在双向绑定尚未完成时误导用户。
        底层 useCollaboration 仍保持运行，用于稳定性验证。
      */}

      <Suspense fallback={<LoadingFallback label="正在加载 Tldraw 白板核心..." fullScreen={false} />}>
        <LazyTldraw persistenceKey="mindnotes-pro" onMount={handleMount} />
      </Suspense>
    </div>
  )
}

export default TldrawCanvas
