# MindNotes Pro - API 使用示例指南

完整的 MindNotes Pro 集成教程，适用于多种前端框架和运行环境。

---

## 📋 目录

- [快速开始](#快速开始)
- [核心 API](#核心-api)
- [框架集成](#框架集成)
- [高级用例](#高级用例)
- [错误处理](#错误处理)
- [常见问题](#常见问题)

---

## 快速开始

### 安装

```bash
# 使用 npm
npm install mindnotes-pro

# 使用 yarn
yarn add mindnotes-pro

# 使用 pnpm
pnpm add mindnotes-pro
```

### 基础使用（原生 JavaScript）

```javascript
// 导入应用存储
import { useAppStore } from 'mindnotes-pro'

// 获取存储实例
const store = useAppStore.getState()

// 开始绘制
store.startStroke()

// 更新笔迹（实时更新绘制点）
store.updateCurrentStroke([
  [100, 200],
  [150, 250],
  [200, 280]
])

// 完成笔迹
store.addStroke({
  id: Date.now().toString(),
  points: [[100, 200], [150, 250], [200, 280]],
  color: '#000000',
  size: 4,
  tool: 'pen'
})

// 撤销操作
store.undo()

// 重做操作
store.redo()
```

---

## 核心 API

### 笔迹操作 (Stroke Operations)

#### `startStroke()`
开始新笔迹，创建当前笔迹对象。

```javascript
store.startStroke()
// 结果: currentStroke 对象被初始化
```

#### `updateCurrentStroke(points)`
更新当前笔迹的点数据（用于实时绘制）。

```javascript
// 添加新点
const newPoints = [[100, 200], [150, 250]]
store.updateCurrentStroke(newPoints)
```

#### `addStroke(stroke)`
添加完成的笔迹到画布。

```javascript
const stroke = {
  id: 'stroke-1',
  points: [[100, 200], [150, 250], [200, 300]],
  color: '#FF0000',
  size: 5,
  tool: 'pen'
}
store.addStroke(stroke)
```

#### `clearStrokes()`
清空所有笔迹。

```javascript
store.clearStrokes()
```

### 形状操作 (Shape Operations)

#### `startShape(type)`
开始新形状，支持类型：`'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line'`

```javascript
store.startShape('rectangle')
store.startShape('circle')
store.startShape('arrow')
```

#### `addShape(shape)`
添加形状到画布。

```javascript
const rectangle = {
  id: 'shape-1',
  type: 'rectangle',
  x: 100,
  y: 200,
  width: 150,
  height: 100,
  color: '#0066FF',
  size: 2
}
store.addShape(rectangle)
```

#### `updateCurrentShape(shape)`
更新当前形状属性。

```javascript
store.updateCurrentShape({
  width: 200,
  height: 150,
  color: '#FF6600'
})
```

### 工具和样式 (Tools & Styling)

#### `setTool(tool)`
切换绘制工具。

```javascript
store.setTool('pen')      // 笔
store.setTool('eraser')   // 橡皮
store.setTool('pan')      // 平移
store.setTool('rectangle') // 矩形
store.setTool('circle')    // 圆形
```

#### `setColor(color)`
设置笔迹/形状颜色。

```javascript
store.setColor('#FF0000')  // 红色
store.setColor('#00FF00')  // 绿色
store.setColor('#0000FF')  // 蓝色
```

#### `setSize(size)`
设置笔迹粗细或形状边框宽度。

```javascript
store.setSize(2)   // 细笔
store.setSize(5)   // 中等
store.setSize(10)  // 粗笔
```

### 画布变换 (Canvas Transformation)

#### `setViewBox(viewBox)`
设置画布视图（位置和缩放）。

```javascript
store.setViewBox({
  x: 0,
  y: 0,
  zoom: 1.5
})
```

#### `zoomIn()` / `zoomOut()`
缩放画布。

```javascript
store.zoomIn()   // 放大 1.2 倍
store.zoomOut()  // 缩小到 1/1.2
```

#### `resetView()`
重置视图为初始状态。

```javascript
store.resetView() // x: 0, y: 0, zoom: 1
```

### 图层管理 (Layer Management)

#### `setSelectedLayer(id)`
选中图层。

```javascript
store.setSelectedLayer('stroke-1')
store.setSelectedLayer(null) // 取消选中
```

#### `toggleLayerLock(id)`
锁定/解锁图层（锁定后不可编辑）。

```javascript
store.toggleLayerLock('stroke-1')
```

#### `toggleLayerHidden(id)`
隐藏/显示图层。

```javascript
store.toggleLayerHidden('stroke-1')
```

#### `deleteLayer(id)`
删除图层。

```javascript
store.deleteLayer('stroke-1')
```

#### `moveLayerUp(id)` / `moveLayerDown(id)`
调整图层顺序。

```javascript
store.moveLayerUp('stroke-1')   // 图层上移一层
store.moveLayerDown('stroke-2') // 图层下移一层
```

#### `clearAllLayers()`
清空所有图层。

```javascript
store.clearAllLayers()
```

### 历史操作 (Undo/Redo)

#### `undo()` / `redo()`
撤销/重做操作。

```javascript
store.undo() // 撤销上一步
store.redo() // 重做下一步
```

---

## 框架集成

### React 集成

#### 方案 1: 使用 Hooks（推荐）

```jsx
import { useAppStore } from 'mindnotes-pro'
import { useEffect, useRef } from 'react'

export function DrawingComponent() {
  const store = useAppStore()
  const canvasRef = useRef(null)

  // 监听撤销/重做状态
  useEffect(() => {
    console.log('可撤销:', store.canUndo)
    console.log('可重做:', store.canRedo)
  }, [store.canUndo, store.canRedo])

  // 处理鼠标按下
  const handleMouseDown = (e) => {
    store.setTool('pen')
    store.startStroke()
  }

  // 处理鼠标移动（绘制）
  const handleMouseMove = (e) => {
    if (store.isDrawing) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      store.updateCurrentStroke([[x, y]])
    }
  }

  // 处理鼠标释放
  const handleMouseUp = () => {
    if (store.currentStroke) {
      store.addStroke(store.currentStroke)
    }
  }

  return (
    <div className="drawing-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        width={800}
        height={600}
        className="border border-gray-300"
      />
      
      {/* 工具栏 */}
      <div className="toolbar">
        <button onClick={() => store.setColor('#FF0000')}>红色</button>
        <button onClick={() => store.setColor('#00FF00')}>绿色</button>
        <button onClick={() => store.setSize(2)}>细笔</button>
        <button onClick={() => store.setSize(5)}>粗笔</button>
        <button 
          onClick={() => store.undo()}
          disabled={!store.canUndo}
        >
          撤销
        </button>
        <button 
          onClick={() => store.redo()}
          disabled={!store.canRedo}
        >
          重做
        </button>
      </div>
    </div>
  )
}
```

#### 方案 2: 包装成 React 组件

```jsx
import React, { useState, useRef, useCallback } from 'react'
import { useAppStore } from 'mindnotes-pro'

export function MindNotesCanvas() {
  const store = useAppStore()
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef(null)

  const startDrawing = useCallback((e) => {
    setIsDrawing(true)
    store.startStroke()
  }, [store])

  const draw = useCallback((e) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 积累点数据
    const currentPoints = store.currentStroke?.points || []
    store.updateCurrentStroke([...currentPoints, [x, y]])
  }, [isDrawing, store])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    if (store.currentStroke) {
      store.addStroke(store.currentStroke)
    }
  }, [store])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      className="cursor-crosshair border border-gray-400"
    />
  )
}
```

### Vue 3 集成

```vue
<template>
  <div class="drawing-app">
    <canvas
      ref="canvas"
      width="800"
      height="600"
      @mousedown="startDrawing"
      @mousemove="draw"
      @mouseup="stopDrawing"
      @mouseleave="stopDrawing"
      class="border border-gray-300 cursor-crosshair"
    />
    
    <div class="toolbar">
      <button @click="store.setColor('#FF0000')">红色</button>
      <button @click="store.setColor('#00FF00')">绿色</button>
      <button @click="store.setColor('#0000FF')">蓝色</button>
      <button 
        @click="store.undo()"
        :disabled="!store.canUndo"
      >
        撤销
      </button>
      <button 
        @click="store.redo()"
        :disabled="!store.canRedo"
      >
        重做
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from 'mindnotes-pro'

const canvas = ref(null)
const isDrawing = ref(false)
const store = useAppStore()

const startDrawing = () => {
  isDrawing.value = true
  store.startStroke()
}

const draw = (e) => {
  if (!isDrawing.value) return

  const rect = canvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const currentPoints = store.currentStroke?.points || []
  store.updateCurrentStroke([...currentPoints, [x, y]])
}

const stopDrawing = () => {
  isDrawing.value = false
  if (store.currentStroke) {
    store.addStroke(store.currentStroke)
  }
}
</script>

<style scoped>
.drawing-app {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

canvas {
  display: block;
  background-color: white;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

### Svelte 集成

```svelte
<script>
  import { onMount } from 'svelte'
  import { useAppStore } from 'mindnotes-pro'

  let canvas
  let isDrawing = false
  const store = useAppStore()

  onMount(() => {
    // 订阅存储变化
    const unsubscribe = store.subscribe(
      (state) => {
        console.log('Store updated:', state)
      }
    )

    return unsubscribe
  })

  function startDrawing(e) {
    isDrawing = true
    store.startStroke()
  }

  function draw(e) {
    if (!isDrawing) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const currentPoints = store.currentStroke?.points || []
    store.updateCurrentStroke([...currentPoints, [x, y]])
  }

  function stopDrawing() {
    isDrawing = false
    if (store.currentStroke) {
      store.addStroke(store.currentStroke)
    }
  }

  function undoAction() {
    store.undo()
  }

  function redoAction() {
    store.redo()
  }
</script>

<canvas
  bind:this={canvas}
  width={800}
  height={600}
  on:mousedown={startDrawing}
  on:mousemove={draw}
  on:mouseup={stopDrawing}
  on:mouseleave={stopDrawing}
  class="canvas-element"
/>

<div class="toolbar">
  <button on:click={() => store.setColor('#FF0000')}>红色</button>
  <button on:click={() => store.setColor('#00FF00')}>绿色</button>
  <button on:click={undoAction} disabled={!store.canUndo}>撤销</button>
  <button on:click={redoAction} disabled={!store.canRedo}>重做</button>
</div>

<style>
  .canvas-element {
    border: 1px solid #ccc;
    cursor: crosshair;
    display: block;
    background-color: white;
  }

  .toolbar {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

### 浏览器扩展集成

```javascript
// background.js - 浏览器扩展后台脚本
import { useAppStore } from 'mindnotes-pro'

// 初始化存储
const store = useAppStore.getState()

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startStroke':
      store.startStroke()
      sendResponse({ success: true })
      break

    case 'addStroke':
      store.addStroke(request.stroke)
      sendResponse({ success: true })
      break

    case 'setColor':
      store.setColor(request.color)
      sendResponse({ success: true })
      break

    case 'setTool':
      store.setTool(request.tool)
      sendResponse({ success: true })
      break

    case 'undo':
      store.undo()
      sendResponse({ success: true })
      break

    case 'redo':
      store.redo()
      sendResponse({ success: true })
      break

    case 'exportCanvas':
      sendResponse({
        success: true,
        data: {
          strokes: store.strokes,
          shapes: store.shapes
        }
      })
      break

    default:
      sendResponse({ success: false, error: 'Unknown action' })
  }
})
```

```javascript
// content.js - 内容脚本
// 向页面注入 MindNotes 功能

window.MindNotesAPI = {
  startDrawing: () => {
    chrome.runtime.sendMessage({ action: 'startStroke' }, (response) => {
      console.log('Drawing started:', response)
    })
  },

  setColor: (color) => {
    chrome.runtime.sendMessage({ action: 'setColor', color }, (response) => {
      console.log('Color set:', color)
    })
  },

  exportDrawing: () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'exportCanvas' }, (response) => {
        resolve(response.data)
      })
    })
  }
}
```

---

## 高级用例

### 1. 自动保存到本地存储

```javascript
import { useAppStore } from 'mindnotes-pro'

export class AutoSaveManager {
  constructor(saveInterval = 5000) {
    this.store = useAppStore()
    this.saveInterval = saveInterval
    this.startAutoSave()
  }

  startAutoSave() {
    setInterval(() => {
      const { strokes, shapes } = this.store.getState()
      const data = {
        strokes,
        shapes,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('mindnotes-draft', JSON.stringify(data))
      console.log('Auto-saved at', new Date())
    }, this.saveInterval)
  }

  loadFromStorage() {
    const saved = localStorage.getItem('mindnotes-draft')
    if (saved) {
      const { strokes, shapes } = JSON.parse(saved)
      strokes.forEach(stroke => this.store.addStroke(stroke))
      shapes.forEach(shape => this.store.addShape(shape))
      return true
    }
    return false
  }

  clearStorage() {
    localStorage.removeItem('mindnotes-draft')
  }
}

// 使用
const autoSave = new AutoSaveManager()
window.addEventListener('beforeunload', () => {
  autoSave.clearStorage() // 可选：页面关闭时清除
})
```

### 2. 导出为 PNG/JSON

```javascript
import { useAppStore } from 'mindnotes-pro'

export function exportCanvas(format = 'json') {
  const store = useAppStore.getState()
  const { strokes, shapes } = store

  if (format === 'json') {
    const json = JSON.stringify({ strokes, shapes }, null, 2)
    downloadFile(json, 'mindnotes.json', 'application/json')
  } else if (format === 'png') {
    drawToCanvas(strokes, shapes).then((canvas) => {
      canvas.toBlob((blob) => {
        downloadFile(blob, 'mindnotes.png', 'image/png')
      })
    })
  }
}

function downloadFile(content, filename, type) {
  const element = document.createElement('a')
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  element.href = URL.createObjectURL(blob)
  element.download = filename
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}
```

### 3. 协作绘制（使用 WebSocket）

```javascript
import { useAppStore } from 'mindnotes-pro'

export class CollaborativeDrawing {
  constructor(serverUrl) {
    this.store = useAppStore()
    this.ws = new WebSocket(serverUrl)
    this.setupListeners()
  }

  setupListeners() {
    this.ws.onopen = () => console.log('Connected to server')

    this.ws.onmessage = (e) => {
      const message = JSON.parse(e.data)

      switch (message.type) {
        case 'stroke-added':
          this.store.addStroke(message.stroke)
          break

        case 'stroke-updated':
          // 更新其他用户的笔迹
          console.log('Remote stroke:', message.stroke)
          break

        case 'shape-added':
          this.store.addShape(message.shape)
          break
      }
    }
  }

  broadcastStroke(stroke) {
    this.ws.send(JSON.stringify({
      type: 'stroke-added',
      stroke
    }))
  }

  broadcastShape(shape) {
    this.ws.send(JSON.stringify({
      type: 'shape-added',
      shape
    }))
  }

  disconnect() {
    this.ws.close()
  }
}

// 使用
const collaborative = new CollaborativeDrawing('ws://localhost:8080')
const store = useAppStore()

// 当添加笔迹时广播
originalAddStroke = store.addStroke
store.addStroke = (stroke) => {
  originalAddStroke(stroke)
  collaborative.broadcastStroke(stroke)
}
```

### 4. 图层导入/导出

```javascript
import { useAppStore } from 'mindnotes-pro'

export function importLayers(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const { layers } = JSON.parse(e.target.result)
        const store = useAppStore()

        layers.forEach(layer => {
          if (layer.type === 'stroke') {
            store.addStroke(layer)
          } else if (layer.type === 'shape') {
            store.addShape(layer)
          }
        })

        resolve(layers.length)
      } catch (error) {
        reject(error)
      }
    }
    reader.readAsText(file)
  })
}

export function exportLayers() {
  const store = useAppStore()
  const { strokes, shapes } = store

  const layers = [
    ...strokes.map(s => ({ type: 'stroke', ...s })),
    ...shapes.map(s => ({ type: 'shape', ...s }))
  ]

  return JSON.stringify({ layers }, null, 2)
}
```

---

## 错误处理

### 常见错误与解决方案

#### 错误 1: 笔迹点数据不正确

```javascript
// ❌ 错误：没有数组嵌套
store.updateCurrentStroke([100, 200, 150, 250])

// ✅ 正确：每个点是 [x, y] 对
store.updateCurrentStroke([[100, 200], [150, 250]])
```

#### 错误 2: 形状 ID 冲突

```javascript
// ❌ 错误：两个形状使用相同 ID
store.addShape({ id: 'shape-1', type: 'rectangle', ... })
store.addShape({ id: 'shape-1', type: 'circle', ... })

// ✅ 正确：使用唯一 ID
store.addShape({ id: 'shape-1', type: 'rectangle', ... })
store.addShape({ id: 'shape-2', type: 'circle', ... })
```

#### 错误 3: 颜色格式不规范

```javascript
// ✅ 支持的格式
store.setColor('#FF0000')        // 十六进制
store.setColor('rgb(255, 0, 0)') // RGB
store.setColor('red')             // 颜色名称

// ❌ 不支持的格式
store.setColor('FF0000')          // 缺少 #
store.setColor('0xFF0000')        // 十进制前缀
```

#### 完整的错误处理示例

```javascript
import { useAppStore } from 'mindnotes-pro'

export class DrawingManager {
  constructor() {
    this.store = useAppStore()
  }

  safeAddStroke(stroke) {
    try {
      // 验证必须字段
      if (!stroke.id || !Array.isArray(stroke.points)) {
        throw new Error('Invalid stroke: missing id or points')
      }

      // 验证点数据格式
      if (!stroke.points.every(p => Array.isArray(p) && p.length === 2)) {
        throw new Error('Invalid points format: expected [[x, y], ...]')
      }

      // 验证颜色格式
      const colorRegex = /^#[0-9A-Fa-f]{6}$|^rgb\(\d+,\s*\d+,\s*\d+\)$/
      if (!colorRegex.test(stroke.color)) {
        console.warn(`Suspicious color format: ${stroke.color}`)
      }

      this.store.addStroke(stroke)
      return { success: true }
    } catch (error) {
      console.error('Error adding stroke:', error.message)
      return { success: false, error: error.message }
    }
  }

  safeSetColor(color) {
    try {
      if (!color || typeof color !== 'string') {
        throw new Error('Color must be a non-empty string')
      }
      this.store.setColor(color)
      return { success: true }
    } catch (error) {
      console.error('Error setting color:', error.message)
      return { success: false, error: error.message }
    }
  }
}
```

---

## 常见问题

### Q1: 如何监听状态变化？

```javascript
import { useAppStore } from 'mindnotes-pro'

const store = useAppStore()

// 订阅整个 store
store.subscribe(
  (state) => console.log('Full state:', state)
)

// 仅订阅特定值
store.subscribe(
  (state) => state.strokes,
  (strokes) => console.log('Strokes updated:', strokes)
)
```

### Q2: 如何实现压力感应笔迹？

```javascript
function handlePointerEvent(e) {
  if (e.pointerType === 'pen') {
    const pressure = e.pressure // 0-1
    const adjustedSize = baseSize * (0.5 + pressure * 1.5)
    store.setSize(adjustedSize)
  }
}

canvasElement.addEventListener('pointermove', handlePointerEvent)
```

### Q3: 如何限制笔迹数量（性能优化）？

```javascript
const MAX_STROKES = 1000

const originalAddStroke = store.addStroke

store.addStroke = (stroke) => {
  const state = store.getState()
  
  if (state.strokes.length >= MAX_STROKES) {
    console.warn('Stroke limit reached')
    // 删除最旧的笔迹
    store.deleteLayer(state.strokes[0].id)
  }
  
  originalAddStroke(stroke)
}
```

### Q4: 如何实现离线同步？

```javascript
export class OfflineSyncManager {
  constructor(store) {
    this.store = store
    this.pendingChanges = []
    this.isOnline = navigator.onLine
    
    window.addEventListener('online', () => this.syncOnline())
    window.addEventListener('offline', () => this.syncOffline())
  }

  syncOnline() {
    this.isOnline = true
    this.uploadPendingChanges()
  }

  syncOffline() {
    this.isOnline = false
    console.log('Now offline. Changes will sync when online.')
  }

  addStroke(stroke) {
    this.store.addStroke(stroke)
    
    if (this.isOnline) {
      this.uploadStroke(stroke)
    } else {
      this.pendingChanges.push({ type: 'stroke', data: stroke })
    }
  }

  async uploadStroke(stroke) {
    try {
      const response = await fetch('/api/strokes', {
        method: 'POST',
        body: JSON.stringify(stroke)
      })
      return response.ok
    } catch (error) {
      this.pendingChanges.push({ type: 'stroke', data: stroke })
      return false
    }
  }

  async uploadPendingChanges() {
    for (const change of this.pendingChanges) {
      await this.uploadStroke(change.data)
    }
    this.pendingChanges = []
  }
}
```

### Q5: 如何处理触摸设备？

```javascript
export class TouchDrawingManager {
  constructor(canvas, store) {
    this.canvas = canvas
    this.store = store
    this.touches = new Map()

    canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e))
    canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e))
    canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e))
  }

  handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const { x, y } = this.getTouchCoords(touch)

    this.store.startStroke()
    this.touches.set(touch.identifier, { x, y })
  }

  handleTouchMove(e) {
    e.preventDefault()
    for (let touch of e.touches) {
      const { x, y } = this.getTouchCoords(touch)
      const points = [[x, y]]
      this.store.updateCurrentStroke(points)
    }
  }

  handleTouchEnd(e) {
    e.preventDefault()
    const touch = e.changedTouches[0]
    this.touches.delete(touch.identifier)

    if (this.store.currentStroke) {
      this.store.addStroke(this.store.currentStroke)
    }
  }

  getTouchCoords(touch) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }
}
```

---

## 更多资源

- [官方文档](https://github.com/11suixing11/mindnotes-pro)
- [GitHub 仓库](https://github.com/11suixing11/mindnotes-pro)
- [动问题](https://github.com/11suixing11/mindnotes-pro/issues)

---

**版本**: 1.3.1  
**最后更新**: 2024 年  
**维护者**: MindNotes 团队
