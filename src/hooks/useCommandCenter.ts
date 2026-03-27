import { useCallback, useEffect } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useGuideStore } from '../store/useGuideStore'
import { useLayerStore } from '../store/useLayerStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { commandRegistry } from '../core/commands/registry'
import { defaultCommands } from '../core/commands/defaultCommands'
import type { CommandId, CommandPayload } from '../core/commands/types'
import { keybindingManager } from '../core/keybindings/KeybindingManager'
import { defaultKeybindings } from '../core/keybindings/defaultKeybindings'

export function useCommandCenter() {
  const setTool = useDrawingStore(state => state.setTool)
  const clearStrokes = useDrawingStore(state => state.clearStrokes)
  const undo = useHistoryStore(state => state.undo)
  const redo = useHistoryStore(state => state.redo)
  const zoomIn = useViewStore(state => state.zoomIn)
  const zoomOut = useViewStore(state => state.zoomOut)
  const resetView = useViewStore(state => state.resetView)
  const toggleShowGuides = useGuideStore(state => state.toggleShowGuides)
  const toggleSnapToGrid = useGuideStore(state => state.toggleSnapToGrid)
  const toggleLayersPanel = useLayerStore(state => state.toggleLayersPanel)

  useEffect(() => {
    for (const descriptor of defaultCommands) {
      switch (descriptor.id) {
        case 'tool.pen':
          commandRegistry.register(descriptor, () => setTool('pen'))
          break
        case 'tool.eraser':
          commandRegistry.register(descriptor, () => setTool('eraser'))
          break
        case 'tool.pan':
          commandRegistry.register(descriptor, () => setTool('pan'))
          break
        case 'tool.rectangle':
          commandRegistry.register(descriptor, () => setTool('rectangle'))
          break
        case 'tool.circle':
          commandRegistry.register(descriptor, () => setTool('circle'))
          break
        case 'tool.triangle':
          commandRegistry.register(descriptor, () => setTool('triangle'))
          break
        case 'tool.line':
          commandRegistry.register(descriptor, () => (setTool as unknown as (tool: 'line') => void)('line'))
          break
        case 'tool.arrow':
          commandRegistry.register(descriptor, () => (setTool as unknown as (tool: 'arrow') => void)('arrow'))
          break
        case 'edit.undo':
          commandRegistry.register(descriptor, () => undo())
          break
        case 'edit.redo':
          commandRegistry.register(descriptor, () => redo())
          break
        case 'edit.clear':
          commandRegistry.register(descriptor, () => {
            if (confirm('确定要清空所有笔迹吗？')) {
              clearStrokes()
            }
          })
          break
        case 'view.zoomIn':
          commandRegistry.register(descriptor, () => zoomIn())
          break
        case 'view.zoomOut':
          commandRegistry.register(descriptor, () => zoomOut())
          break
        case 'view.reset':
          commandRegistry.register(descriptor, () => resetView())
          break
        case 'view.toggleGuides':
          commandRegistry.register(descriptor, () => toggleShowGuides())
          break
        case 'view.toggleGrid':
          commandRegistry.register(descriptor, () => toggleSnapToGrid())
          break
        case 'file.save':
          commandRegistry.register(descriptor, () => {
            window.dispatchEvent(new CustomEvent('mindnotes-save'))
          })
          break
        case 'ui.toggleLayersPanel':
          commandRegistry.register(descriptor, () => toggleLayersPanel())
          break
        case 'help.shortcuts':
          commandRegistry.register(descriptor, () => {
            window.dispatchEvent(new CustomEvent('toggle-shortcuts'))
          })
          break
        default:
          break
      }
    }

    return () => {
      for (const descriptor of defaultCommands) {
        commandRegistry.unregister(descriptor.id)
      }
    }
  }, [
    clearStrokes,
    redo,
    resetView,
    setTool,
    toggleLayersPanel,
    toggleShowGuides,
    toggleSnapToGrid,
    undo,
    zoomIn,
    zoomOut,
  ])

  useEffect(() => {
    keybindingManager.setExecutor((commandId, payload) => {
      void commandRegistry.execute(commandId, payload)
    })

    keybindingManager.clear()
    for (const binding of defaultKeybindings) {
      keybindingManager.register(binding)
    }

    keybindingManager.startListening()

    return () => {
      keybindingManager.stopListening()
      keybindingManager.clear()
    }
  }, [])

  const executeCommand = useCallback((commandId: CommandId, payload?: CommandPayload) => {
    return commandRegistry.execute(commandId, payload)
  }, [])

  const getKeybindings = useCallback(() => keybindingManager.getBindings(), [])
  const getCommands = useCallback(() => commandRegistry.getCommands(), [])

  return {
    executeCommand,
    getKeybindings,
    getCommands,
  }
}
