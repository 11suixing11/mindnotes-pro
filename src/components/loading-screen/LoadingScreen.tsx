import { memo } from 'react'

export default memo(function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="正在打开 MindNotes Pro">
      <span className="sr-only">正在打开 MindNotes Pro</span>
    </div>
  )
})
