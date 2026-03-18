# 👨‍💻 开发者文档

> 面向开发者的技术文档

**适合人群**：开发者、贡献者、技术爱好者

---

## 📋 目录

1. [项目架构](#1-项目架构)
2. [技术栈](#2-技术栈)
3. [目录结构](#3-目录结构)
4. [核心模块](#4-核心模块)
5. [数据流](#5-数据流)
6. [本地开发](#6-本地开发)
7. [构建部署](#7-构建部署)
8. [性能优化](#8-性能优化)
9. [常见问题](#9-常见问题)

---

## 1. 项目架构

### 整体架构

```
┌─────────────────────────────────────────┐
│           用户界面层                     │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │ Canvas  │ │Toolbar  │ │SaveDialog │ │
│  └─────────┘ └─────────┘ └───────────┘ │
├─────────────────────────────────────────┤
│         状态管理层 (Zustand)             │
│  ┌─────────────────────────────────┐   │
│  │    useAppStore (全局状态)       │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│           工具层                         │
│  ┌───────────┐ ┌───────────┐          │
│  │ perfect-  │ │ 导出工具  │          │
│  │ freehand  │ │ (jsPDF)   │          │
│  └───────────┘ └───────────┘          │
└─────────────────────────────────────────┘
```

### 技术选型理由

| 技术 | 选型理由 |
|------|---------|
| **React 18** | 组件化、生态丰富、易上手 |
| **TypeScript** | 类型安全、减少 Bug、易于维护 |
| **Vite** | 极速启动、热更新、构建快速 |
| **Tailwind CSS** | 开发效率高、易于维护 |
| **Zustand** | 轻量、简单、无样板代码 |
| **perfect-freehand** | 专业的平滑笔迹算法 |

---

## 2. 技术栈

### 核心依赖

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.2.2",
  "vite": "^5.1.6",
  "tailwindcss": "^3.4.1",
  "zustand": "^4.5.0",
  "perfect-freehand": "^1.2.0",
  "jspdf": "^2.5.1",
  "file-saver": "^2.0.5"
}
```

### 开发依赖

```json
{
  "@types/react": "^18.2.64",
  "@types/react-dom": "^18.2.21",
  "eslint": "^8.57.0",
  "@typescript-eslint/eslint-plugin": "^7.1.1",
  "@vitejs/plugin-react": "^4.2.1"
}
```

---

## 3. 目录结构

```
mindnotes-pro/
├── 📂 src/                    # 源代码
│   ├── 📂 components/         # React 组件
│   │   ├── Canvas.tsx         # 画布组件（核心）
│   │   ├── Toolbar.tsx        # 工具栏组件
│   │   └── SaveDialog.tsx     # 保存对话框
│   ├── 📂 store/              # 状态管理
│   │   └── useAppStore.ts     # Zustand Store
│   ├── 📂 utils/              # 工具函数（可选）
│   ├── App.tsx                # 根组件
│   ├── main.tsx               # 入口文件
│   └── index.css              # 全局样式
│
├── 📂 public/                 # 静态资源
│
├── 📂 src-tauri/              # Tauri 桌面应用
│   ├── src/
│   ├── icons/
│   └── tauri.conf.json
│
├── 📂 dist/                   # 构建输出（自动生成）
│
├── 🔧 配置文件
│   ├── package.json           # 依赖配置
│   ├── tsconfig.json          # TypeScript
│   ├── tailwind.config.js     # Tailwind
│   ├── vite.config.ts         # Vite
│   ├── vercel.json            # Vercel 部署
│   └── capacitor.config.ts    # Capacitor 移动端
│
└── 📚 文档
    ├── README.md              # 用户文档
    ├── CONTRIBUTING.md        # 贡献指南
    ├── DEVELOPER.md           # 本文档
    └── ...
```

---

## 4. 核心模块

### 4.1 Canvas 组件

**文件**: `src/components/Canvas.tsx`

**职责**: 处理用户输入、渲染笔迹

**核心代码**:

```typescript
// 使用 perfect-freehand 生成平滑笔迹
const pathData = getStroke(stroke.points, {
  size: stroke.size,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
})

// 渲染到 Canvas
ctx.beginPath()
ctx.moveTo(pathData[0][0], pathData[0][1])
for (let i = 1; i < pathData.length; i++) {
  ctx.lineTo(pathData[i][0], pathData[i][1])
}
ctx.closePath()
ctx.fillStyle = stroke.color
ctx.fill()
```

**关键特性**:
- 使用 `perfect-freehand` 算法
- 支持压感
- 高性能渲染（Canvas API）
- 响应式调整大小

---

### 4.2 Zustand Store

**文件**: `src/store/useAppStore.ts`

**职责**: 全局状态管理

**状态结构**:

```typescript
interface AppState {
  // 笔迹数据
  strokes: Stroke[]
  currentStroke: Stroke | null
  
  // 工具状态
  tool: 'pen' | 'eraser'
  color: string
  size: number
  
  // 方法
  addStroke: (stroke: Stroke) => void
  updateCurrentStroke: (points: number[][]) => void
  startStroke: () => void
  clearStrokes: () => void
  setTool: (tool: 'pen' | 'eraser') => void
  setColor: (color: string) => void
  setSize: (size: number) => void
  undo: () => void
  redo: () => void
}
```

**使用示例**:

```typescript
// 在组件中使用
const { strokes, addStroke, setTool } = useAppStore()

// 添加笔迹
addStroke(newStroke)

// 切换工具
setTool('eraser')
```

---

### 4.3 导出功能

**文件**: `src/components/SaveDialog.tsx`

**支持格式**:

#### PNG 导出

```typescript
canvas.toBlob((blob) => {
  saveAs(blob, 'note.png')
}, 'image/png')
```

#### PDF 导出

```typescript
const imgData = canvas.toDataURL('image/png')
const pdf = new jsPDF({
  orientation: 'landscape',
  format: [canvas.width, canvas.height]
})
pdf.addImage(imgData, 'PNG', 0, 0)
pdf.save('note.pdf')
```

#### JSON 导出

```typescript
const data = JSON.stringify(strokes, null, 2)
const blob = new Blob([data], { type: 'application/json' })
saveAs(blob, 'note.json')
```

---

## 5. 数据流

### 用户交互流程

```
用户鼠标按下
  ↓
Canvas.handlePointerDown
  ↓
useAppStore.startStroke()
  ↓
创建新笔迹
  ↓
用户鼠标移动
  ↓
Canvas.handlePointerMove
  ↓
useAppStore.updateCurrentStroke()
  ↓
更新笔迹坐标
  ↓
Canvas 重新渲染
  ↓
用户鼠标松开
  ↓
Canvas.handlePointerUp
  ↓
useAppStore.addStroke()
  ↓
笔迹添加到 strokes 数组
  ↓
Canvas 重新渲染所有笔迹
```

### 状态更新流程

```
用户操作
  ↓
调用 Store 方法
  ↓
更新状态
  ↓
React 检测到状态变化
  ↓
触发组件重新渲染
  ↓
Canvas 使用新状态渲染
```

---

## 6. 本地开发

### 环境配置

**1. 安装 Node.js**

```bash
# 访问 https://nodejs.org/
# 下载并安装 LTS 版本
```

**2. 克隆项目**

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
```

**3. 安装依赖**

```bash
npm install
```

**4. 启动开发服务器**

```bash
npm run dev
```

浏览器自动打开：http://localhost:3000

---

### 开发技巧

#### 热更新

修改代码后，浏览器自动刷新，无需手动刷新。

#### 调试技巧

**1. React DevTools**

安装浏览器扩展：
- [React Developer Tools](https://react.dev/learn/react-developer-tools)

**2. 状态调试**

在浏览器控制台：

```javascript
// 查看当前状态
useAppStore.getState()

// 监听状态变化
useAppStore.subscribe((state) => {
  console.log('状态变化:', state)
})
```

**3. 性能分析**

```bash
# 构建生产版本并分析
npm run build -- --stats
```

---

## 7. 构建部署

### 本地构建

```bash
# 构建生产版本
npm run build

# 输出目录：dist/
# 总大小：~912KB
```

### 部署到 Vercel

**自动部署**（推荐）:

1. 推送到 GitHub
2. 访问 https://vercel.com/new
3. 导入项目
4. 自动构建部署

**手动部署**:

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### 部署到 Netlify

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod
```

### 桌面应用打包

```bash
# 安装 Tauri
npm install -D @tauri-apps/cli

# 打包
npm run tauri build

# 输出：src-tauri/target/release/bundle/
```

### 移动端打包

```bash
# 安装 Capacitor
npm install @capacitor/core @capacitor/cli

# 添加平台
npx cap add android
npx cap add ios

# 构建
npm run build
npx cap sync

# 打开 IDE
npx cap open android
npx cap open ios
```

---

## 8. 性能优化

### 已实施的优化

#### 1. 代码分割

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        utils: ['perfect-freehand', 'jspdf']
      }
    }
  }
}
```

#### 2. 缓存策略

```json
// vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 3. 渲染优化

```typescript
// 使用 ResizeObserver 响应式调整
const resizeObserver = new ResizeObserver(updateSize)
resizeObserver.observe(containerRef.current)
```

#### 4. 状态管理优化

```typescript
// Zustand 只更新变化的部分
const { strokes, addStroke } = useAppStore(
  (state) => ({
    strokes: state.strokes,
    addStroke: state.addStroke
  })
)
```

### 性能指标

| 指标 | 目标 | 当前 | 状态 |
|------|------|------|------|
| 首屏加载 | < 2s | ~1s | ✅ |
| 笔迹延迟 | < 16ms | ~8ms | ✅ |
| 内存占用 | < 100MB | ~50MB | ✅ |
| 构建时间 | < 10s | ~4s | ✅ |

---

## 9. 常见问题

### Q: 如何添加新功能？

**步骤**:

1. 在 `components/` 创建新组件
2. 在 `App.tsx` 中引入
3. 在 `useAppStore` 中添加状态
4. 测试功能
5. 提交 PR

---

### Q: 如何修改主题颜色？

**方法 1**: 修改 Tailwind 配置

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#4f46e5', // 修改这里
    }
  }
}
```

**方法 2**: 修改 CSS 变量

```css
/* src/index.css */
:root {
  --primary-color: #4f46e5; /* 修改这里 */
}
```

---

### Q: 如何优化渲染性能？

**建议**:

1. 使用 `React.memo` 避免不必要的重新渲染
2. 使用 `useCallback` 缓存回调函数
3. 使用 `useMemo` 缓存计算结果
4. 避免在渲染函数中创建新对象

---

### Q: 如何调试状态问题？

**方法**:

```typescript
// 在组件中添加调试日志
useEffect(() => {
  console.log('当前状态:', useAppStore.getState())
}, [strokes])

// 或使用 Redux DevTools（需配置）
```

---

### Q: 如何添加新的导出格式？

**步骤**:

1. 在 `SaveDialog.tsx` 中添加新格式选项
2. 实现导出函数
3. 安装必要的依赖库
4. 测试导出功能

---

## 📞 需要帮助？

- **查看 Issue**: https://github.com/11suixing11/mindnotes-pro/issues
- **参与讨论**: https://github.com/11suixing11/mindnotes-pro/discussions
- **查看代码**: 每个文件都有注释

---

**祝你开发愉快！** 🚀

*开源让我们走得更远* ❤️
