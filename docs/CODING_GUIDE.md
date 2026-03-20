# MindNotes Pro — 编码与 UI 规范

> 内部参考文档。每次写代码前过一遍。

---

## 一、React 组件规范

### 1.1 组件职责单一
- 一个组件只做一件事。超过 200 行就考虑拆分
- 容器组件（逻辑）和展示组件（UI）分离
- 不要把业务逻辑和渲染混在一起

### 1.2 Props 设计
```tsx
// ✅ 好：接口清晰，有默认值
interface ToolbarProps {
  onToolChange: (tool: Tool) => void
  className?: string
}

// ❌ 工具：props 超过 5 个就该用对象或 context
```

### 1.3 事件处理
- 拖拽/绘画类用 `useRef` 存状态，避免闭包陷阱
- 全局事件（keydown, resize）必须在 `useEffect` cleanup 里移除
- 触摸事件 `{ passive: false }` 仅在需要 `preventDefault` 时加

### 1.4 懒加载原则
- 重量级依赖（>50KB）用 `React.lazy` + `Suspense`
- 模态框、面板、对话框默认懒加载
- 不要在主包里引入只有 10% 用户会用的功能

---

## 二、TypeScript 规范

### 2.1 禁止 `any`
```tsx
// ❌ 错误
function save(data: any) { ... }

// ✅ 正确
interface SavedData { strokes: Stroke[]; shapes: Shape[] }
function save(data: SavedData) { ... }
```

### 2.2 禁止 `as any` 类型断言
```tsx
// ❌ 错误
setTool('line' as any)

// ✅ 正确 — 扩展 union type
type Tool = 'pen' | 'eraser' | 'pan' | 'line' | 'arrow' | ...
```

### 2.3 善用 discriminated union
```tsx
type ExportFormat = 
  | { type: 'png'; quality?: number }
  | { type: 'json' }
  | { type: 'pdf'; pageSize?: 'A4' | 'Letter' }
```

---

## 三、Zustand Store 规范

### 3.1 Store 拆分原则
- 全局共享状态 → 主 store（useAppStore）
- 纯 UI 状态 → 组件内部 useState（如弹窗开关）
- 持久化偏好 → 独立 store（useThemeStore）

### 3.2 撤销/重做
- 在修改状态前调用 `_pushHistory()`
- 限制历史栈深度（MAX_HISTORY = 50）
- 双栈结构：undoStack + redoStack

### 3.3 避免不必要的 re-render
```tsx
// ✅ 好：选择器只订阅需要的状态
const tool = useAppStore((s) => s.tool)

// ❌ 工具：订阅整个 store
const { tool, color, size, strokes, ... } = useAppStore()
```

---

## 四、Canvas / 性能规范

### 4.1 重绘策略
- 用 `requestAnimationFrame` 节流，不要用 `setTimeout`
- 只在状态变化时触发重绘（通过 useEffect 依赖）
- 高 DPI：`canvas.width = window.innerWidth * devicePixelRatio`

### 4.2 事件处理
- 鼠标/触摸事件用 ref 跟踪绘制状态，不走 React 合成事件
- 所有 addEventListener 必须有对应的 removeEventListener
- 拖拽/绘画期间阻止默认行为（`preventDefault`）

### 4.3 大数据量
- 超过 1000 条笔迹时考虑分层渲染（只绘制可见区域）
- 用 `OffscreenCanvas` 或 Web Worker 做复杂计算（未来优化）

---

## 五、UI / UX 设计规范

### 5.1 布局原则
- **F 型阅读模式**：重要操作放在左上到右下的视觉路径上
- **工具栏**：固定在顶部，分组用分隔线，不超过 3 行
- **弹窗/面板**：从右侧滑入（图层、快捷键），居中弹出（保存、模板）

### 5.2 交互反馈
- 按钮 hover：`scale(1.05)` + 阴影增强
- 按钮 active：`scale(0.95)`
- 状态切换：颜色渐变 `transition: 200ms`
- 操作完成：Toast 通知（3 秒自动消失）

### 5.3 颜色系统
- 主色：`#4f46e5`（Indigo 600）
- 深色模式主色：`#6366f1`（Indigo 500）
- 危险操作：`#ef4444`（Red 500）
- 成功：`#22c55e`（Green 500）

### 5.4 间距
- 组件间距：`gap-4`（16px）
- 内边距：`p-3`（12px）用于紧凑，`p-4`（16px）用于一般
- 圆角：`rounded-lg`（8px）用于按钮，`rounded-xl`（12px）用于面板

### 5.5 暗色模式
- 不要用 `*` 通配符加 transition（影响 Canvas 性能）
- 只对 UI 容器加 `transition: background-color 0.3s`
- 背景用 `rgba` + `backdrop-blur` 实现毛玻璃效果

---

## 六、代码检查清单

每次提交前过一遍：

- [ ] TypeScript 编译无错误
- [ ] 没有 `any` 或 `as any`
- [ ] 所有 useEffect 的 cleanup 函数正确
- [ ] 懒加载组件有 Suspense 包裹
- [ ] 没有 console.log（除了 error/warn）
- [ ] Bundle 大小没有大幅增长
- [ ] 深色模式正常显示
- [ ] 移动端触摸可用

---

## 七、文件组织

```
src/
├── components/        # UI 组件
│   ├── ui/           # 基础 UI（Toast, ErrorBoundary, Loading）
│   └── [Feature]/    # 功能组件（一个功能一个文件夹）
├── hooks/            # 自定义 hooks
├── store/            # Zustand stores
├── utils/            # 工具函数
├── types/            # 全局类型定义
└── data/             # 静态数据（模板等）
```

- 每个组件一个文件，命名用 PascalCase
- hooks 用 `use` 前缀
- 工具函数用 camelCase
- 不要在根目录散落 .md 文件

---

*最后更新：2026-03-20*
