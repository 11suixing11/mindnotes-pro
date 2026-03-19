import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function TldrawCanvas() {
  return (
    <div className="w-full h-screen">
      <Tldraw persistenceKey="mindnotes-pro" />
    </div>
  )
}

export default TldrawCanvas
