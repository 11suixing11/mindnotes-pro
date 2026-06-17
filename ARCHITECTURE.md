# MindNotes Pro 双轨架构方案

## 架构概览

```
mindnotes-pro/
├── src/                    # 共享代码（Web + Desktop 复用）
│   ├── canvas/             # 绘图引擎
│   ├── components/         # UI 组件
│   ├── store/              # 状态管理
│   └── utils/              # 工具函数
├── src-web/                # Web 专属代码
│   └── main.tsx            # Web 入口
├── src-desktop/            # Desktop 专属代码
│   ├── main.ts             # Electron/Tauri 主进程
│   ├── screen-pen.ts       # 系统级屏幕画笔
│   └── overlay-window.ts   # 全局覆盖窗口
├── electron/               # Electron 配置
├── src-tauri/              # Tauri 配置（可选）
├── package.json
└── vite.config.ts
```

## 技术选型

### 方案 A: Electron（推荐）
**优点：**
- 成熟稳定，社区资源丰富
- 可以创建透明覆盖窗口
- 支持系统级快捷键
- 可以最小化到系统托盘

**缺点：**
- 体积大（~150MB）
- 内存占用高

### 方案 B: Tauri
**优点：**
- 体积小（~10MB）
- 内存占用低
- 性能好

**缺点：**
- 较新，社区资源少
- 需要 Rust 知识
- 透明覆盖窗口实现复杂

## 决策：使用 Electron

对于"屏幕画笔"功能，Electron 更容易实现：
- `BrowserWindow` 支持 `transparent: true`
- 可以设置 `alwaysOnTop: true`
- 可以设置 `frame: false` 无边框
- 可以穿透鼠标事件（`setIgnoreMouseEvents`）

## 实现方案

### 1. 屏幕画笔功能（桌面版）

```typescript
// electron/screen-pen.ts
import { BrowserWindow, ipcMain, globalShortcut } from 'electron'

let overlayWindow: BrowserWindow | null = null

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  overlayWindow.loadFile('overlay.html')
  overlayWindow.setIgnoreMouseEvents(false) // 默认捕获鼠标事件
}

// 注册全局快捷键
globalShortcut.register('CommandOrControl+Shift+P', () => {
  if (overlayWindow?.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow?.show()
  }
})
```

### 2. overlay.html（覆盖层）

```html
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:transparent;">
<canvas id="canvas" style="position:fixed; top:0; left:0; width:100%; height:100%;"></canvas>
<script>
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

let drawing = false
let lastX = 0
let lastY = 0

canvas.addEventListener('mousedown', (e) => {
  drawing = true
  lastX = e.clientX
  lastY = e.clientY
})

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(e.clientX, e.clientY)
  ctx.strokeStyle = 'red'
  ctx.lineWidth = 3
  ctx.stroke()
  lastX = e.clientX
  lastY = e.clientY
})

canvas.addEventListener('mouseup', () => drawing = false)
</script>
</body>
</html>
```

### 3. 主窗口（白板应用）

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron'

let mainWindow: BrowserWindow

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  // 加载现有的 Web 应用
  mainWindow.loadURL('http://localhost:3000') // 开发模式
  // mainWindow.loadFile('dist/index.html') // 生产模式
}
```

## 项目结构

```
mindnotes-pro/
├── src/                    # 共享代码
│   ├── canvas/             # 绘图引擎（Web + Desktop 复用）
│   ├── components/         # UI 组件（Web + Desktop 复用）
│   ├── store/              # 状态管理（Web + Desktop 复用）
│   └── utils/              # 工具函数
├── electron/               # Electron 专属
│   ├── main.ts             # 主进程
│   ├── preload.ts          # 预加载脚本
│   ├── screen-pen.ts       # 屏幕画笔逻辑
│   └── overlay.html        # 覆盖层页面
├── src/                    # Web 入口（现有）
├── package.json
├── vite.config.ts
├── electron-builder.json   # Electron 打包配置
└── tsconfig.json
```

## 开发计划

### Phase 1: 基础架构（1-2天）
- [ ] 安装 Electron 依赖
- [ ] 配置 Electron + Vite
- [ ] 创建基础窗口

### Phase 2: 屏幕画笔（2-3天）
- [ ] 创建透明覆盖窗口
- [ ] 实现绘画功能
- [ ] 添加工具栏
- [ ] 注册全局快捷键

### Phase 3: 打包发布（1天）
- [ ] 配置 electron-builder
- [ ] 打包 Windows exe
- [ ] 测试安装包

## 依赖

```json
{
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 启动命令

```bash
# 开发模式（Web）
npm run dev

# 开发模式（Desktop）
npm run dev:desktop

# 打包 Desktop
npm run build:desktop
```
