# 📦 导出格式增强计划

> 支持多种导出格式，满足用户需求

**优先级**: P1  
**预计时间**: 1 小时  
**状态**: 待实施

---

## 目标

增强现有的导出功能，支持更多格式和选项。

---

## 功能列表

### 1. PNG 导出 ✅（已有）
- 导出为 PNG 图片
- 透明背景选项
- 分辨率设置

### 2. SVG 导出（新增）
- 矢量格式导出
- 无限缩放不失真
- 可编辑性

### 3. PDF 导出（新增）
- 文档格式
- 适合打印
- 多页支持（未来）

### 4. JSON 导出（新增）
- 原始数据导出
- 可重新导入
- 备份用途

---

## 技术实现

### SVG 导出
```typescript
function exportToSVG(strokes: Stroke[], shapes: Shape[]): string {
  // 生成 SVG 字符串
  // 包含所有笔迹和形状
  // 支持下载
}
```

### PDF 导出
```typescript
// 使用 jsPDF 或 pdfmake
import jsPDF from 'jspdf'

function exportToPDF(canvas: HTMLCanvasElement) {
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF()
  pdf.addImage(imgData, 'PNG', 0, 0)
  pdf.save('mindnotes.pdf')
}
```

### JSON 导出
```typescript
function exportToJSON(data: AppState): string {
  return JSON.stringify({
    strokes: data.strokes,
    shapes: data.shapes,
    metadata: {
      version: '1.0.1',
      exportedAt: new Date().toISOString(),
    }
  }, null, 2)
}
```

---

## UI 设计

**导出对话框**:
```
┌─────────────────────────────┐
│        📦 导出笔记          │
├─────────────────────────────┤
│ 格式：                      │
│ ○ PNG 图片                  │
│ ○ SVG 矢量图                │
│ ○ PDF 文档                  │
│ ○ JSON 数据                 │
│                             │
│ 选项：                      │
│ ☑ 透明背景                  │
│ ☑ 包含网格                  │
│                             │
│ 分辨率：[1920] x [1080]    │
│                             │
│      [取消]    [导出]       │
└─────────────────────────────┘
```

---

## 实施步骤

### Step 1: SVG 导出
- [ ] 创建 SVG 生成函数
- [ ] 添加导出菜单选项
- [ ] 测试下载

### Step 2: JSON 导出/导入
- [ ] JSON 序列化
- [ ] 下载功能
- [ ] 导入功能（可选）

### Step 3: PDF 导出
- [ ] 安装 jsPDF
- [ ] 实现 PDF 生成
- [ ] 优化打印质量

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+E` | 打开导出对话框 |
| `Ctrl+Shift+S` | 快速导出 SVG |

---

**创建时间**: 2026-03-19 10:15  
**实施时间**: 立即
