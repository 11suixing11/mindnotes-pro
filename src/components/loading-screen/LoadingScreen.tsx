import { memo } from 'react'

export default memo(function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="正在打开 MindNotes Pro">
      <div className="loading-logo" aria-hidden="true">
        M
      </div>
      <div className="loading-text">MindNotes Pro</div>
      <div className="loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
})
