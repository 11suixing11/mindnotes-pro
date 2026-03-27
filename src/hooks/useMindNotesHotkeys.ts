import { useHotkeys } from 'react-hotkeys-hook'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useGuideStore } from '../store/useGuideStore'
import { useLayerStore } from '../store/useLayerStore'
import { useHistoryStore } from '../store/useHistoryStore'

export function useMindNotesHotkeys() {
  const setTool = useDrawingStore(state => state.setTool)
  const clearStrokes = useDrawingStore(state => state.clearStrokes)
  const undo = useHistoryStore(state => state.undo)
  const zoomIn = useViewStore(state => state.zoomIn)
  const zoomOut = useViewStore(state => state.zoomOut)
  const resetView = useViewStore(state => state.resetView)
  const toggleShowGuides = useGuideStore(state => state.toggleShowGuides)
  const toggleSnapToGrid = useGuideStore(state => state.toggleSnapToGrid)
  const toggleLayersPanel = useLayerStore(state => state.toggleLayersPanel)

  // 工具切换
  useHotkeys('1', () => setTool('pen'), { preventDefault: true })
  useHotkeys('2', () => setTool('eraser'), { preventDefault: true })
  useHotkeys('3', () => setTool('pan'), { preventDefault: true })
  useHotkeys('4', () => setTool('rectangle'), { preventDefault: true })
  useHotkeys('5', () => setTool('circle'), { preventDefault: true })
  useHotkeys('6', () => setTool('triangle'), { preventDefault: true })

  // 编辑操作
  useHotkeys('ctrl+z,meta+z', () => undo(), { preventDefault: true })
  useHotkeys(
    'delete,backspace',
    () => {
      if (confirm('确定要清空所有笔迹吗？')) {
        clearStrokes()
      }
    },
    { preventDefault: true }
  )

  // 视图控制
  useHotkeys('+,=', () => zoomIn(), { preventDefault: true })
  useHotkeys('-', () => zoomOut(), { preventDefault: true })
  useHotkeys('0', () => resetView(), { preventDefault: true })

  // 功能切换
  useHotkeys('shift+g', () => toggleShowGuides(), { preventDefault: true })
  useHotkeys('g', () => toggleSnapToGrid(), { preventDefault: true })
  useHotkeys('l', () => toggleLayersPanel(), { preventDefault: true })

  // 帮助
  useHotkeys(
    '?',
    () => {
      window.dispatchEvent(new CustomEvent('toggle-shortcuts'))
    },
    { preventDefault: true }
  )
}

export default useMindNotesHotkeys
