import { useState } from 'react'

const FIRST_USE_NOTICE_KEY = 'mindnotes-pro.first-use-local-storage-notice'

function wasDismissed() {
  try {
    return localStorage.getItem(FIRST_USE_NOTICE_KEY) === '1'
  } catch {
    return false
  }
}

export default function FirstUseNotice() {
  const [visible, setVisible] = useState(() => !wasDismissed())

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(FIRST_USE_NOTICE_KEY, '1')
    } catch {
      // The notice can be dismissed for this session even when storage is unavailable.
    }
  }

  return (
    <aside className="first-use-notice" role="status" aria-live="polite">
      <div>
        <strong>本地优先保存</strong>
        <p>内容保存在此设备的当前浏览器中，不会自动同步到其他设备。</p>
      </div>
      <button type="button" onClick={dismiss} aria-label="关闭本地保存说明">
        知道了
      </button>
    </aside>
  )
}
