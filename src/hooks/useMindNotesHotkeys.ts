import { useHotkeys } from 'react-hotkeys-hook'
import { useAppStore } from '../store/useAppStore'

export function useMindNotesHotkeys() {
  const {
    setTool,
    undo,
    redo,
    clearStrokes,
    zoomIn,
    zoomOut,
    resetView,
    toggleShowGuides,
    toggleSnapToGrid,
    toggleLayersPanel,
    copySelected,
  } = useAppStore()

  // 工具切换
  useHotkeys('v', () => setTool('select'), { preventDefault: true })
  useHotkeys('1', () => setTool('pen'), { preventDefault: true })
  useHotkeys('2', () => setTool('eraser'), { preventDefault: true })
  useHotkeys('3', () => setTool('pan'), { preventDefault: true })
  useHotkeys('t', () => setTool('text'), { preventDefault: true })
  useHotkeys('4', () => setTool('rectangle'), { preventDefault: true })
  useHotkeys('5', () => setTool('circle'), { preventDefault: true })
  useHotkeys('6', () => setTool('triangle'), { preventDefault: true })
  useHotkeys('7', () => setTool('line'), { preventDefault: true })
  useHotkeys('8', () => setTool('arrow'), { preventDefault: true })

  // 编辑操作
  useHotkeys('ctrl+z,meta+z', () => undo(), { preventDefault: true })
  useHotkeys('ctrl+shift+z,meta+shift+z', () => redo(), { preventDefault: true })

  // 复制粘贴（Ctrl+V 已在 Canvas.tsx 中处理系统剪贴板粘贴，此处不再绑定）
  useHotkeys('ctrl+c,meta+c', () => copySelected(), { preventDefault: true })
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
