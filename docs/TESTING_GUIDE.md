# MindNotes Pro - 测试指南

完整的单元测试、集成测试和 E2E 测试指南。

---

## 📋 目录

- [测试框架介绍](#测试框架介绍)
- [单元测试](#单元测试)
- [集成测试](#集成测试)
- [E2E 测试](#e2e-测试)
- [测试最佳实践](#测试最佳实践)
- [性能测试](#性能测试)

---

## 测试框架介绍

### 当前测试栈

**MindNotes Pro** 使用以下测试框架：

```
┌─────────────────────────────────────┐
│        Test Architecture            │
├─────────────────────────────────────┤
│ Test Runner: Vitest (Vite Native)   │
│ Framework: React Testing Library    │
│ Coverage: c8                        │
│ E2E: Cypress / Playwright (可选)    │
└─────────────────────────────────────┘
```

### 为什么选择 Vitest？

- ✅ 由 Vite 官方提供，与项目配置深度集成
- ✅ 比 Jest 快 10-100 倍
- ✅ 支持 ESM 和 TypeScript 开箱即用
- ✅ 兼容 Jest API（易于迁移）

---

## 单元测试

### 测试 Store（Zustand）

#### 基础测试模板

```javascript
// src/store/useAppStore.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAppStore } from './useAppStore'

describe('useAppStore', () => {
  // 在每个测试前重置 store
  beforeEach(() => {
    useAppStore.setState({
      strokes: [],
      shapes: [],
      tool: 'pen',
      color: '#000000'
    })
  })

  describe('笔迹操作', () => {
    it('should add a stroke', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addStroke({
          id: 'stroke-1',
          points: [[100, 200]],
          color: '#FF0000',
          size: 4,
          tool: 'pen'
        })
      })

      expect(result.current.strokes).toHaveLength(1)
      expect(result.current.strokes[0].color).toBe('#FF0000')
    })

    it('should start a new stroke', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setColor('#FF0000')
        result.current.setSize(5)
        result.current.startStroke()
      })

      expect(result.current.currentStroke).not.toBeNull()
      expect(result.current.currentStroke?.color).toBe('#FF0000')
      expect(result.current.currentStroke?.size).toBe(5)
    })

    it('should clear all strokes', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addStroke({
          id: 'stroke-1',
          points: [[100, 200]],
          color: '#FF0000',
          size: 4,
          tool: 'pen'
        })
        result.current.addStroke({
          id: 'stroke-2',
          points: [[150, 250]],
          color: '#00FF00',
          size: 4,
          tool: 'pen'
        })
      })

      expect(result.current.strokes).toHaveLength(2)

      act(() => {
        result.current.clearStrokes()
      })

      expect(result.current.strokes).toHaveLength(0)
    })
  })

  describe('工具切换', () => {
    it('should change tool', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTool('eraser')
      })

      expect(result.current.tool).toBe('eraser')
    })

    it('should change color', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setColor('#0000FF')
      })

      expect(result.current.color).toBe('#0000FF')
    })

    it('should change size', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setSize(10)
      })

      expect(result.current.size).toBe(10)
    })
  })

  describe('画布变换', () => {
    it('should zoom in', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.zoomIn()
      })

      expect(result.current.viewBox.zoom).toBeGreaterThan(1)
    })

    it('should zoom out', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.zoomIn()
        result.current.zoomOut()
      })

      expect(result.current.viewBox.zoom).toBeCloseTo(1, 1)
    })

    it('should reset view', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setViewBox({ x: 100, y: 100, zoom: 2 })
        result.current.resetView()
      })

      expect(result.current.viewBox.x).toBe(0)
      expect(result.current.viewBox.y).toBe(0)
      expect(result.current.viewBox.zoom).toBe(1)
    })
  })

  describe('撤销/重做', () => {
    it('should undo last action', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addStroke({
          id: 'stroke-1',
          points: [[100, 200]],
          color: '#FF0000',
          size: 4,
          tool: 'pen'
        })
      })

      expect(result.current.strokes).toHaveLength(1)

      act(() => {
        result.current.undo()
      })

      // 注：实际实现取决于撤销栈
      expect(result.current.canUndo).toBe(false)
    })
  })
})
```

### 测试主题 Store

```javascript
// src/store/useThemeStore.test.ts
import { renderHook, act } from '@testing-library/react'
import { useThemeStore } from './useThemeStore'

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      isDark: false
    })
  })

  it('should toggle dark mode', () => {
    const { result } = renderHook(() => useThemeStore())

    expect(result.current.isDark).toBe(false)

    act(() => {
      result.current.toggleDarkMode()
    })

    expect(result.current.isDark).toBe(true)
  })

  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useThemeStore())

    act(() => {
      result.current.toggleDarkMode()
    })

    const stored = localStorage.getItem('mindnotes-theme')
    expect(JSON.parse(stored).isDark).toBe(true)
  })
})
```

---

## 集成测试

### 测试 React 组件

#### Canvas 组件测试

```javascript
// src/components/Canvas.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Canvas } from './Canvas'
import { useAppStore } from '../store/useAppStore'

describe('Canvas Component', () => {
  beforeEach(() => {
    useAppStore.setState({
      strokes: [],
      shapes: [],
      isDrawing: false
    })
  })

  it('renders canvas element', () => {
    render(<Canvas />)
    const canvas = screen.getByRole('img', { hidden: true })
    expect(canvas).toBeInTheDocument()
  })

  it('should draw on canvas when mouse moved', async () => {
    const { container } = render(<Canvas />)
    const canvas = container.querySelector('canvas')

    const store = useAppStore()
    const initialStrokeCount = store.strokes.length

    // 模拟鼠标按下
    fireEvent.mouseDown(canvas, {
      clientX: 100,
      clientY: 100
    })

    // 模拟鼠标移动
    fireEvent.mouseMove(canvas, {
      clientX: 150,
      clientY: 150
    })

    // 模拟鼠标释放
    fireEvent.mouseUp(canvas)

    await waitFor(() => {
      expect(store.strokes.length).toBeGreaterThan(initialStrokeCount)
    })
  })

  it('should support keyboard shortcuts', () => {
    render(<Canvas />)
    const store = useAppStore()

    // 测试 Z 键（橡皮）
    fireEvent.keyDown(window, { key: 'e' })
    expect(store.tool).toBe('eraser')

    // 测试 P 键（笔）
    fireEvent.keyDown(window, { key: 'p' })
    expect(store.tool).toBe('pen')
  })
})
```

#### Toolbar 组件测试

```javascript
// src/components/Toolbar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Toolbar } from './Toolbar'
import { useAppStore } from '../store/useAppStore'

describe('Toolbar Component', () => {
  it('renders all tool buttons', () => {
    render(<Toolbar />)

    expect(screen.getByAltText(/pen tool/i)).toBeInTheDocument()
    expect(screen.getByAltText(/eraser/i)).toBeInTheDocument()
    expect(screen.getByAltText(/color picker/i)).toBeInTheDocument()
  })

  it('should change tool when button clicked', () => {
    render(<Toolbar />)
    const store = useAppStore()

    const eraserButton = screen.getByRole('button', { name: /eraser/i })
    fireEvent.click(eraserButton)

    expect(store.tool).toBe('eraser')
  })

  it('should open color picker', () => {
    render(<Toolbar />)

    const colorButton = screen.getByRole('button', { name: /color/i })
    fireEvent.click(colorButton)

    expect(screen.getByRole('dialog', { name: /color picker/i })).toBeInTheDocument()
  })

  it('should open undo/redo buttons', () => {
    render(<Toolbar />)

    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument()
  })
})
```

---

## E2E 测试

### 使用 Cypress

```javascript
// cypress/e2e/drawing.cy.js
describe('Drawing Workflow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173')
  })

  it('should draw a stroke from start to finish', () => {
    // 1. 验证初始状态
    cy.get('canvas').should('be.visible')

    // 2. 开始绘制
    cy.get('canvas')
      .trigger('mousedown', { clientX: 100, clientY: 100 })
      .trigger('mousemove', { clientX: 150, clientY: 150 })
      .trigger('mousemove', { clientX: 200, clientY: 200 })
      .trigger('mouseup')

    // 3. 验证笔迹被添加
    cy.window().then((win) => {
      const store = win.useAppStore.getState()
      expect(store.strokes.length).to.be.greaterThan(0)
    })
  })

  it('should switch tools with keyboard', () => {
    // P = 笔
    cy.get('body').type('p')
    cy.window().then((win) => {
      expect(win.useAppStore.getState().tool).to.equal('pen')
    })

    // E = 橡皮
    cy.get('body').type('e')
    cy.window().then((win) => {
      expect(win.useAppStore.getState().tool).to.equal('eraser')
    })
  })

  it('should undo and redo', () => {
    // 1. 绘制
    cy.get('canvas')
      .trigger('mousedown', { clientX: 100, clientY: 100 })
      .trigger('mousemove', { clientX: 150, clientY: 150 })
      .trigger('mouseup')

    let initialCount
    cy.window().then((win) => {
      initialCount = win.useAppStore.getState().strokes.length
    })

    // 2. 撤销
    cy.get('[data-testid="undo-button"]').click()

    // 3. 验证笔迹数减少
    cy.window().then((win) => {
      expect(win.useAppStore.getState().strokes.length).to.equal(initialCount - 1)
    })

    // 4. 重做
    cy.get('[data-testid="redo-button"]').click()

    // 5. 验证恢复
    cy.window().then((win) => {
      expect(win.useAppStore.getState().strokes.length).to.equal(initialCount)
    })
  })

  it('should save and load project', () => {
    // 1. 绘制一些内容
    cy.get('canvas')
      .trigger('mousedown', { clientX: 100, clientY: 100 })
      .trigger('mousemove', { clientX: 150, clientY: 150 })
      .trigger('mouseup')

    // 2. 保存
    cy.get('[data-testid="save-button"]').click()

    // 3. 验证保存成功
    cy.contains('Saved successfully').should('be.visible')

    // 4. 刷新页面
    cy.reload()

    // 5. 验证数据恢复
    cy.window().then((win) => {
      const store = win.useAppStore.getState()
      expect(store.strokes.length).to.be.greaterThan(0)
    })
  })
})
```

### 使用 Playwright

```javascript
// tests/e2e/drawing.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Drawing App E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('should draw and save', async ({ page }) => {
    // 获取 canvas
    const canvas = await page.locator('canvas').first()

    // 绘制
    await canvas.click({ position: { x: 100, y: 100 } })
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 200 }
    })

    // 检查笔迹数量
    const strokeCount = await page.evaluate(() => {
      return window.useAppStore.getState().strokes.length
    })

    expect(strokeCount).toBeGreaterThan(0)

    // 保存
    await page.click('[data-testid="save-button"]')
    await expect(page.locator('text=Saved')).toBeVisible()
  })

  test('color picker should work', async ({ page }) => {
    // 打开颜色选择器
    await page.click('[data-testid="color-button"]')

    // 选择颜色
    await page.click('[data-color="#FF0000"]')

    // 验证颜色改变
    const color = await page.evaluate(() => {
      return window.useAppStore.getState().color
    })

    expect(color).toBe('#FF0000')
  })
})
```

---

## 测试最佳实践

### 1. 测试组织结构

```
src/
  ├── components/
  │   ├── Canvas.tsx
  │   └── Canvas.test.tsx          // 与源文件同级
  ├── store/
  │   ├── useAppStore.ts
  │   └── useAppStore.test.ts
  └── hooks/
      ├── useServiceWorker.ts
      └── useServiceWorker.test.ts
```

### 2. AAA 测试模式

```javascript
it('should add stroke with correct properties', () => {
  // Arrange (准备)
  const store = useAppStore()
  const testStroke = {
    id: 'test-1',
    points: [[100, 200]],
    color: '#FF0000',
    size: 4,
    tool: 'pen'
  }

  // Act (执行)
  act(() => {
    store.addStroke(testStroke)
  })

  // Assert (验证)
  expect(store.strokes).toHaveLength(1)
  expect(store.strokes[0].color).toBe('#FF0000')
})
```

### 3. 避免测试实现细节

```javascript
// ❌ 不好：测试实现细节
it('should call setStrokes function', () => {
  const setStrokes = jest.fn()
  // ...
  expect(setStrokes).toHaveBeenCalled()
})

// ✅ 好：测试行为
it('should add new stroke to the list', () => {
  // ...
  expect(store.strokes).toHaveLength(1)
})
```

### 4. 使用有意义的测试数据

```javascript
// ❌ 不好：魔数
const stroke = { points: [[1, 2]], color: '#000', size: 1 }

// ✅ 好：描述性数据
const validStroke = {
  id: 'stroke-1',
  points: [[100, 200], [150, 250]],
  color: '#FF0000',
  size: 4,
  tool: 'pen'
}

const invalidStroke = {
  id: '',  // 缺少 ID
  points: [],  // 空点数组
  color: 'invalid',
  size: -1
}
```

---

## 性能测试

### 运行性能基准测试

```javascript
// src/performance.test.ts
import { bench, describe } from 'vitest'
import { useAppStore } from './store/useAppStore'

describe('Performance Benchmarks', () => {
  const store = useAppStore()

  bench('adding 100 strokes', () => {
    for (let i = 0; i < 100; i++) {
      store.addStroke({
        id: `stroke-${i}`,
        points: [[Math.random() * 800, Math.random() * 600]],
        color: '#000000',
        size: 4,
        tool: 'pen'
      })
    }
  })

  bench('adding 100 shapes', () => {
    for (let i = 0; i < 100; i++) {
      store.addShape({
        id: `shape-${i}`,
        type: 'rectangle',
        x: Math.random() * 800,
        y: Math.random() * 600,
        width: 100,
        height: 100,
        color: '#000000',
        size: 2
      })
    }
  })

  bench('undo 50 times', () => {
    for (let i = 0; i < 50; i++) {
      store.undo()
    }
  })
})
```

### 覆盖率报告

```bash
# 运行测试并生成覆盖率报告
npm run test:coverage

# 生成 HTML 报告
npm run test:coverage:html

# 查看覆盖率数据
# coverage/index.html
```

---

## 快速参考

### 常用命令

```bash
# 运行所有测试
npm run test

# 监视模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定文件的测试
npm run test -- useAppStore.test.ts

# 运行匹配模式的测试
npm run test -- --grep "should add stroke"

# E2E 测试
npm run test:e2e

# 打开 Cypress UI
npm run test:e2e:ui
```

### 常用断言

```javascript
// 基础断言
expect(value).toBe(expectedValue)
expect(value).toEqual(object)
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()

// 数字断言
expect(value).toBeGreaterThan(5)
expect(value).toBeLessThan(10)
expect(value).toBeCloseTo(3.14)

// 字符串断言
expect(string).toMatch(/regex/)
expect(string).toContain('substring')

// 数组断言
expect(array).toHaveLength(3)
expect(array).toContain(value)

// 对象断言
expect(object).toHaveProperty('key', value)
expect(object).toMatchObject({ key: value })

// 异步断言
expect(promise).resolves.toBe(value)
expect(promise).rejects.toThrow()

// 函数断言
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith(args)
```

---

**版本**: 1.3.1  
**最后更新**: 2024  
**维护者**: MindNotes 团队
