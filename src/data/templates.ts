/**
 * 画布模板 — 预设形状布局，引导用户书写
 * 每个模板由 shapes 组成（线、框），用户在上面手写
 */

import { Shape } from '../store/useAppStore'

export interface CanvasTemplate {
  id: string
  name: string
  icon: string
  description: string
  shapes: Partial<Shape>[]
  guidelines?: { x1: number; y1: number; x2: number; y2: number }[]
}

const line = (x1: number, y1: number, x2: number, y2: number, color = '#e5e7eb'): Partial<Shape> => ({
  id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  type: 'line',
  x: x1,
  y: y1,
  width: x2 - x1,
  height: y2 - y1,
  startX: x1,
  startY: y1,
  endX: x2,
  endY: y2,
  color,
  size: 1,
  hidden: false,
  locked: true,
  opacity: 0.5,
})

const rect = (x: number, y: number, w: number, h: number, color = '#e5e7eb'): Partial<Shape> => ({
  id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  type: 'rectangle',
  x,
  y,
  width: w,
  height: h,
  color,
  size: 1,
  hidden: false,
  locked: true,
  opacity: 0.3,
})

export const TEMPLATES: CanvasTemplate[] = [
  {
    id: 'blank',
    name: '空白画布',
    icon: '📄',
    description: '从零开始',
    shapes: [],
  },
  {
    id: 'lined-paper',
    name: '横线纸',
    icon: '📝',
    description: '经典笔记本横线',
    shapes: Array.from({ length: 20 }, (_, i) =>
      line(50, 150 + i * 40, 750, 150 + i * 40)
    ),
  },
  {
    id: 'grid-paper',
    name: '方格纸',
    icon: '🔲',
    description: '网格布局，适合绘图',
    shapes: [
      // 横线
      ...Array.from({ length: 20 }, (_, i) =>
        line(50, 100 + i * 40, 750, 100 + i * 40)
      ),
      // 竖线
      ...Array.from({ length: 18 }, (_, i) =>
        line(50 + i * 40, 100, 50 + i * 40, 860)
      ),
    ],
  },
  {
    id: 'meeting-notes',
    name: '会议纪要',
    icon: '📋',
    description: '议题 + 要点 + 待办',
    shapes: [
      // 标题区
      rect(50, 80, 700, 60),
      // 议题区
      rect(50, 170, 340, 200),
      // 要点区
      rect(410, 170, 340, 200),
      // 待办区
      rect(50, 400, 700, 150),
      // 分隔线
      line(50, 385, 750, 385),
    ],
  },
  {
    id: 'todo-board',
    name: '待办看板',
    icon: '📌',
    description: '待办 / 进行中 / 已完成',
    shapes: [
      rect(50, 100, 220, 500),
      rect(290, 100, 220, 500),
      rect(530, 100, 220, 500),
    ],
  },
  {
    id: 'daily-journal',
    name: '每日日记',
    icon: '📔',
    description: '晨间目标 + 晚间复盘',
    shapes: [
      rect(50, 80, 700, 50),
      line(50, 150, 750, 150),
      rect(50, 170, 340, 350),
      rect(410, 170, 340, 350),
      line(50, 540, 750, 540),
      rect(50, 560, 700, 150),
    ],
  },
  {
    id: 'mind-map',
    name: '思维导图',
    icon: '🧠',
    description: '中心发散结构',
    shapes: [
      // 中心
      rect(320, 280, 160, 60),
      // 四个分支框
      rect(80, 120, 160, 50),
      rect(560, 120, 160, 50),
      rect(80, 430, 160, 50),
      rect(560, 430, 160, 50),
      // 连线
      line(320, 310, 240, 145),
      line(480, 310, 560, 145),
      line(320, 310, 240, 455),
      line(480, 310, 560, 455),
    ],
  },
]

export function getTemplate(id: string): CanvasTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
