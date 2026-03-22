# MindNotes Pro - 插件开发指南

创建自定义插件和扩展 MindNotes Pro 功能的完整教程。

---

## 📋 目录

- [插件架构](#插件架构)
- [快速开始](#快速开始)
- [API 参考](#api-参考)
- [实战示例](#实战示例)
- [发布和分享](#发布和分享)
- [常见问题](#常见问题)

---

## 插件架构

### 插件系统概览

MindNotes Pro 插件系统基于 **事件驱动架构** 和 **Hook 机制**:

```
┌─────────────────────────────────────┐
│       MindNotes Pro Core            │
│  (Canvas, Store, Rendering)         │
└─────────────────────────────────────┘
              ↑         ↓
         (Events)   (Hooks)
              ↑         ↓
┌─────────────────────────────────────┐
│       Plugin System                 │
│  (Event Bus, Hook Registry)         │
└─────────────────────────────────────┘
         ↑                    ↑
    ┌────┴────┬────────┬─────┴────┐
    ↓         ↓        ↓          ↓
┌────────┐ ┌─────┐ ┌────────┐ ┌──────┐
│Plugin 1│ │Plugin2│ │Plugin 3│ │Plugin N│
└────────┘ └─────┘ └────────┘ └──────┘
```

### 插件生命周期

```javascript
plugin.lifecycle = {
  install:   // 插件被安装时
  activate:  // 用户启用插件
  deactivate:// 用户禁用插件
  uninstall: // 插件被卸载时
}
```

---

## 快速开始

### 1. 创建基础插件

```javascript
// my-plugin.js
export const MyPlugin = {
  // 必需：插件元数据
  name: 'My Custom Plugin',
  version: '1.0.0',
  author: 'Your Name',
  description: '我的第一个 MindNotes 插件',
  
  // 可选：依赖项
  dependencies: ['canvas', 'store'],
  
  // 钩子：插件激活
  activate(api) {
    console.log('插件已激活！')
    
    // 监听事件
    api.on('stroke:add', (stroke) => {
      console.log('新笔迹:', stroke)
    })
    
    // 添加菜单项
    api.menu.add({
      label: '我的功能',
      icon: 'star',
      onClick: () => {
        console.log('用户点击了我的菜单项')
      }
    })
  },
  
  // 钩子：插件停用
  deactivate(api) {
    console.log('插件已停用')
    // 清理资源
    api.menu.remove('my-feature')
  }
}
```

### 2. 注册插件

```javascript
// 在应用启动时注册
import { useAppStore } from 'mindnotes-pro'
import { MyPlugin } from './my-plugin.js'

const store = useAppStore()
store.registerPlugin(MyPlugin)
```

### 3. 在 React 中使用

```jsx
import { usePlugin } from 'mindnotes-pro/hooks'
import { MyPlugin } from './my-plugin.js'

export function AppWithPlugin() {
  const { api } = usePlugin(MyPlugin)
  
  return (
    <div className="app">
      <Canvas />
      <button onClick={() => api.menu.trigger('my-feature')}>
        执行插件功能
      </button>
    </div>
  )
}
```

---

## API 参考

### 核心 API

#### `api.store`

访问应用状态存储：

```javascript
api.store.getState()        // 获取完整状态
api.store.getState().strokes // 获取所有笔迹
api.store.addStroke(stroke) // 添加笔迹
api.store.undo()            // 撤销
api.store.redo()            // 重做
```

#### `api.canvas`

获取 Canvas 上下文：

```javascript
const canvas = api.canvas.getElement()
const ctx = api.canvas.getContext('2d')
const rect = api.canvas.getBoundingClientRect()
```

#### `api.render`

控制渲染：

```javascript
api.render.redraw()         // 重新渲染画布
api.render.invalidate()     // 标记需要重绘
api.render.getPixelData()   // 获取像素数据
```

### 事件系统

#### `api.on(event, callback)`

监听事件：

```javascript
// 笔迹事件
api.on('stroke:start', (data) => {})
api.on('stroke:update', (data) => {})
api.on('stroke:end', (data) => {})
api.on('stroke:add', (stroke) => {})
api.on('stroke:delete', (id) => {})

// 形状事件
api.on('shape:add', (shape) => {})
api.on('shape:update', (shape) => {})
api.on('shape:delete', (id) => {})

// 工具事件
api.on('tool:change', (tool) => {})
api.on('color:change', (color) => {})
api.on('size:change', (size) => {})

// 画布事件
api.on('canvas:zoom', (zoom) => {})
api.on('canvas:pan', ({ x, y }) => {})

// 图层事件
api.on('layer:select', (id) => {})
api.on('layer:lock', (id) => {})
api.on('layer:hide', (id) => {})

// 撤销/重做
api.on('undo', () => {})
api.on('redo', () => {})
```

#### `api.emit(event, data)`

发送事件：

```javascript
api.emit('stroke:add', {
  id: 'stroke-1',
  points: [[100, 200]],
  color: '#FF0000'
})
```

#### `api.off(event, callback)`

取消监听：

```javascript
const handler = (data) => console.log(data)
api.on('stroke:add', handler)
// 稍后...
api.off('stroke:add', handler)
```

### 菜单和工具栏

#### `api.menu.add(item)`

添加菜单项：

```javascript
api.menu.add({
  id: 'my-feature',
  label: '我的功能',
  icon: 'star',          // 可选
  shortcut: 'Ctrl + M',  // 可选
  onClick: () => {
    console.log('功能被执行')
  },
  submenu: [             // 可选：子菜单
    {
      label: '选项 1',
      onClick: () => {}
    },
    {
      label: '选项 2',
      onClick: () => {}
    }
  ]
})
```

#### `api.toolbar.addButton(button)`

添加工具栏按钮：

```javascript
api.toolbar.addButton({
  id: 'my-button',
  label: '我的按钮',
  icon: 'zap',
  tooltip: '点击执行功能',
  active: false,         // 是否激活状态
  onClick: () => {
    console.log('按钮被点击')
  }
})
```

#### `api.panel.add(panel)`

添加侧边栏面板：

```javascript
api.panel.add({
  id: 'my-panel',
  title: '我的面板',
  position: 'right',     // 'left' | 'right'
  width: 300,
  resizable: true,
  content: () => {
    return `<div class="panel-content">
      <h3>面板内容</h3>
      <button id="panel-btn">点击我</button>
    </div>`
  },
  onShow: () => {
    // 面板显示时
    document.getElementById('panel-btn')?.addEventListener('click', () => {
      console.log('面板按钮被点击')
    })
  }
})
```

### 存储和持久化

#### `api.storage.set(key, value)`

保存数据：

```javascript
api.storage.set('my-plugin-config', {
  theme: 'dark',
  autoSave: true
})
```

#### `api.storage.get(key)`

读取数据：

```javascript
const config = api.storage.get('my-plugin-config')
console.log(config)  // { theme: 'dark', autoSave: true }
```

#### `api.storage.remove(key)`

删除数据：

```javascript
api.storage.remove('my-plugin-config')
```

---

## 实战示例

### 示例 1: 颜色吸管工具

```javascript
export const ColorPickerPlugin = {
  name: 'Color Picker Tool',
  version: '1.0.0',
  
  activate(api) {
    let isPickingColor = false
    
    // 添加菜单
    api.menu.add({
      label: 'Color Picker',
      icon: 'droplet',
      shortcut: 'I',
      onClick: toggleColorPicker
    })
    
    // 添加工具栏按钮
    api.toolbar.addButton({
      id: 'color-picker',
      label: 'Pick Color',
      icon: 'pipette',
      onClick: toggleColorPicker
    })
    
    function toggleColorPicker() {
      isPickingColor = !isPickingColor
      api.toolbar.setButtonActive('color-picker', isPickingColor)
      
      if (isPickingColor) {
        api.canvas.getElement().style.cursor = 'crosshair'
        api.canvas.getElement().addEventListener('click', pickColor)
      } else {
        api.canvas.getElement().style.cursor = 'default'
        api.canvas.getElement().removeEventListener('click', pickColor)
      }
    }
    
    function pickColor(e) {
      const canvas = api.canvas.getElement()
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const imageData = api.render.getPixelData(x, y, 1, 1)
      const [r, g, b] = imageData.data
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
      
      api.store.setColor(hex)
      console.log('颜色已选择:', hex)
    }
  }
}
```

### 示例 2: 自动保存插件

```javascript
export const AutoSavePlugin = {
  name: 'Auto Save',
  version: '1.0.0',
  
  activate(api) {
    const SAVE_INTERVAL = 30000 // 30 秒
    const MAX_BACKUPS = 10
    let saveTimer
    
    // 配置面板
    api.panel.add({
      id: 'autosave-panel',
      title: 'Auto Save Settings',
      position: 'left',
      content: () => {
        return `
          <div class="panel-content">
            <label>
              <input type="checkbox" id="autosave-toggle" checked>
              启用自动保存
            </label>
            <label>
              保存间隔: <input type="number" id="save-interval" value="30" min="10" max="300"> 秒
            </label>
            <button id="backup-now">立即备份</button>
            <div id="backup-list" style="margin-top: 10px;"></div>
          </div>
        `
      },
      onShow: () => {
        document.getElementById('autosave-toggle').addEventListener('change', (e) => {
          if (e.target.checked) {
            startAutoSave()
          } else {
            stopAutoSave()
          }
        })
        
        document.getElementById('save-interval').addEventListener('change', (e) => {
          clearInterval(saveTimer)
          SAVE_INTERVAL = e.target.value * 1000
          startAutoSave()
        })
        
        document.getElementById('backup-now').addEventListener('click', performBackup)
        updateBackupList()
      }
    })
    
    function startAutoSave() {
      saveTimer = setInterval(() => {
        performBackup()
      }, SAVE_INTERVAL)
    }
    
    function stopAutoSave() {
      clearInterval(saveTimer)
    }
    
    function performBackup() {
      const state = api.store.getState()
      const backups = JSON.parse(api.storage.get('backups') || '[]')
      
      backups.push({
        timestamp: new Date().toISOString(),
        data: {
          strokes: state.strokes,
          shapes: state.shapes
        }
      })
      
      // 保留最近 10 个备份
      if (backups.length > MAX_BACKUPS) {
        backups.shift()
      }
      
      api.storage.set('backups', JSON.stringify(backups))
      console.log('已自动保存备份')
      updateBackupList()
    }
    
    function updateBackupList() {
      const backups = JSON.parse(api.storage.get('backups') || '[]')
      const list = document.getElementById('backup-list')
      if (!list) return
      
      list.innerHTML = `
        <div style="font-size: 12px;">
          <strong>最近备份:</strong><br>
          ${backups.map((b, i) => `
            <button style="font-size: 11px; margin: 2px 0;">
              ${new Date(b.timestamp).toLocaleString()} 
              <a onclick="restoreBackup(${i})">恢复</a>
            </button><br>
          `).join('')}
        </div>
      `
    }
  },
  
  deactivate(api) {
    // 停止自动保存
    clearInterval(saveTimer)
  }
}
```

### 示例 3: 图形识别插件

```javascript
export const ShapeRecognitionPlugin = {
  name: 'Shape Auto Recognition',
  version: '1.0.0',
  
  activate(api) {
    api.menu.add({
      label: 'Recognize Shapes',
      icon: 'zap',
      onClick: recognizeShapes
    })
    
    // 监听笔迹完成
    api.on('stroke:add', (stroke) => {
      // 自动识别手绘形状
      const shape = detectShape(stroke)
      if (shape) {
        api.emit('shape:auto-detected', shape)
        console.log('识别到形状:', shape.type)
      }
    })
    
    function recognizeShapes() {
      const state = api.store.getState()
      const strokes = state.strokes.filter(s => s.tool === 'pen')
      
      const shapes = strokes
        .map(stroke => detectShape(stroke))
        .filter(shape => shape !== null)
      
      shapes.forEach(shape => {
        api.store.addShape(shape)
      })
      
      console.log(`识别并转换了 ${shapes.length} 个形状`)
    }
    
    function detectShape(stroke) {
      const points = stroke.points
      if (points.length < 10) return null
      
      // 简单的形状识别算法
      const bounds = getBounds(points)
      const aspectRatio = bounds.width / bounds.height
      
      if (Math.abs(aspectRatio - 1) < 0.2) {
        // 大约是方形或圆形
        return {
          type: 'circle',
          x: bounds.minX,
          y: bounds.minY,
          width: bounds.width,
          height: bounds.height,
          color: stroke.color,
          size: stroke.size
        }
      } else if (aspectRatio > 1.5) {
        // 宽长方形
        return {
          type: 'rectangle',
          x: bounds.minX,
          y: bounds.minY,
          width: bounds.width,
          height: bounds.height,
          color: stroke.color,
          size: stroke.size
        }
      }
      
      return null
    }
    
    function getBounds(points) {
      const xs = points.map(p => p[0])
      const ys = points.map(p => p[1])
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
      }
    }
  }
}
```

---

## 发布和分享

### 打包插件

```javascript
// 标准插件包结构
my-plugin/
  ├── package.json
  ├── README.md
  ├── src/
  │   ├── plugin.js
  │   ├── styles.css
  │   └── utils.js
  ├── dist/
  │   └── plugin.min.js
  └── examples/
      └── usage.html
```

### package.json 示例

```json
{
  "name": "mindnotes-plugin-example",
  "version": "1.0.0",
  "description": "A sample plugin for MindNotes Pro",
  "author": "Your Name",
  "license": "MIT",
  "main": "dist/plugin.min.js",
  
  "mindnotes": {
    "pluginId": "com.example.myplugin",
    "compatibleVersions": ["1.3.0", "1.3.1", "1.4.0"],
    "category": "utilities"
  },
  
  "scripts": {
    "build": "webpack src/plugin.js -o dist/plugin.min.js",
    "test": "jest",
    "publish": "npm publish"
  }
}
```

### 发布到 npm

```bash
# 1. 注册 npm 账户 (如果还没有)
npm adduser

# 2. 构建插件
npm run build

# 3. 发布到 npm
npm publish

# 4. 用户可以通过 npm 安装
npm install mindnotes-plugin-example
```

### 发布到插件市场

```bash
# 提交到 MindNotes Plugin Registry
npm run publish:registry

# 在 https://plugins.mindnotes.pro 查看你的插件
```

---

## 最佳实践

### 1. 性能优化

```javascript
// ❌ 不好：频繁重绘
api.on('stroke:update', () => {
  api.render.redraw()
})

// ✅ 好：使用防抖
import { debounce } from 'lodash-es'

const debouncedRedraw = debounce(() => {
  api.render.redraw()
}, 100)

api.on('stroke:update', () => {
  debouncedRedraw()
})
```

### 2. 错误处理

```javascript
activate(api) {
  try {
    api.on('stroke:add', (stroke) => {
      if (!stroke.id || !stroke.points) {
        throw new Error('Invalid stroke object')
      }
      // 处理笔迹...
    })
  } catch (error) {
    console.error('Plugin error:', error)
    // 通知用户
    api.notify.error(error.message)
  }
}
```

### 3. 版本兼容性

```javascript
export const MyPlugin = {
  name: 'My Plugin',
  version: '2.0.0',
  minVersion: '1.3.0',  // 最低兼容版本
  maxVersion: '2.0.0',  // 最高兼容版本
  
  activate(api) {
    // 检查 API 兼容性
    if (!api.panel) {
      console.warn('Panel API not available')
      return
    }
    // ... 使用 API
  }
}
```

### 4. 国际化

```javascript
export const MyPlugin = {
  name: 'My Plugin',
  i18n: {
    en: {
      'menu.label': 'My Feature',
      'panel.title': 'Settings'
    },
    zh: {
      'menu.label': '我的功能',
      'panel.title': '设置'
    }
  },
  
  activate(api) {
    const t = api.i18n.t
    api.menu.add({
      label: t('menu.label'),
      onClick: () => {}
    })
  }
}
```

---

## 常见问题

### Q1: 如何调试插件？

```javascript
// 启用调试模式
const plugin = MyPlugin
plugin.debug = true

// 在浏览器控制台
localStorage.setItem('mindnotes-debug', 'true')

// 现在所有 console.log 都会显示在调试面板中
```

### Q2: 插件可以访问用户的本地文件吗？

```javascript
// 不能直接访问文件系统（浏览器沙箱限制）
// 但可以通过文件选择器
api.file.openDialog({
  title: 'Select a file',
  filters: [{ name: 'JSON', extensions: ['json'] }],
  onSelect: (path) => {
    // 用户选择的文件路径
  }
})
```

### Q3: 如何在插件之间通信？

```javascript
// 使用事件总线
api.emit('plugin:custom-event', { message: 'Hello' })

// 其他插件监听
api.on('plugin:custom-event', (data) => {
  console.log(data.message)
})
```

### Q4: 插件有大小限制吗？

```
推荐大小：
  - 最大: 1MB（未压缩）
  - 理想: 50-300 KB
  
优化建议：
  - 使用代码分割
  - 移除未使用的依赖
  - 压缩图片和资源
```

---

## 更多资源

- [官方插件示例库](https://github.com/11suixing11/mindnotes-plugins)
- [插件开发社区](https://community.mindnotes.pro)
- [API 参考](./API_USAGE_EXAMPLES.md)

---

**版本**: 1.3.1  
**最后更新**: 2024  
**维护者**: MindNotes 团队
