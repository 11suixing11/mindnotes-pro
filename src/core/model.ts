export type BrushType =
  | 'pen'
  | 'highlighter'
  | 'pencil'
  | 'calligraphy'
  | 'marker'
  | 'watercolor'
  | 'crayon'
  | 'dashed'
  | 'glow'
export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'arrow'
export type ToolType = 'select' | 'pen' | 'eraser' | 'pan' | 'text' | ShapeKind
export type CanvasBackgroundStyle = 'plain' | 'grid' | 'dots' | 'ruled' | 'notebook'
export type TextFontWeight = 'normal' | 'bold'
export type TextFontStyle = 'normal' | 'italic'
export type TextDecoration = 'none' | 'underline'
export type TextAlign = 'left' | 'center' | 'right'

export interface StrokeElement {
  type: 'stroke'
  id: string
  layerId?: string
  points: number[][]
  color: string
  size: number
  brush: BrushType
  opacity?: number
  pressures?: number[]
  groupId?: string
  // 元素旋转
  // 专业白板标准功能：选中元素后拖拽旋转手柄自由旋转
  // 用户痛点："无法调整手写笔迹/形状的角度，画斜线很困难"
  rotation?: number
  // 元素锁定
  // 专业设计工具标配：锁定元素防止误操作
  // 用户痛点："背景元素经常被不小心移动/删除"
  locked?: boolean
}

// 箭头绑定
// 专业白板标准功能：箭头端点吸附到形状边缘，移动形状时箭头自动跟随
// 用户痛点："花了十分钟才让三条线都正确连接" - Excalidraw Issue #3412
export interface Binding {
  /** 绑定的目标形状 ID */
  targetId: string
  /** 归一化锚点 X (0-1, 相对于形状宽度) */
  anchorX: number
  /** 归一化锚点 Y (0-1, 相对于形状高度) */
  anchorY: number
}

export interface ShapeElement {
  type: 'shape'
  id: string
  layerId?: string
  kind: ShapeKind
  x: number
  y: number
  w: number
  h: number
  color: string
  size: number
  fillColor?: string
  groupId?: string
  // P12 箭头绑定：起点绑定（仅 line/arrow 类型）
  startBinding?: Binding
  // P12 箭头绑定：终点绑定（仅 line/arrow 类型）
  endBinding?: Binding
  // 元素旋转
  rotation?: number
  // 元素锁定
  locked?: boolean
}

export interface TextElement {
  type: 'text'
  id: string
  layerId?: string
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize: number
  color: string
  fontWeight?: TextFontWeight
  fontStyle?: TextFontStyle
  textDecoration?: TextDecoration
  textAlign?: TextAlign
  backgroundColor?: string
  groupId?: string
  // 元素旋转
  rotation?: number
  // 元素锁定
  locked?: boolean
}

export interface ImageElement {
  type: 'image'
  id: string
  layerId?: string
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
  opacity?: number
  groupId?: string
  // 元素旋转
  rotation?: number
  // 元素锁定
  locked?: boolean
}

export type CanvasElement = StrokeElement | ShapeElement | TextElement | ImageElement

export const CANVAS_ELEMENT_TYPES = ['stroke', 'shape', 'text', 'image'] as const

export interface CanvasLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  order: number
  createdAt: number
  updatedAt: number
}

export type UndoAction =
  | { type: 'add'; ids: string[]; els?: CanvasElement[] }
  | { type: 'remove'; items: { el: CanvasElement; index: number }[] }
  | { type: 'clear'; snapshot: CanvasElement[] }
  | {
      type: 'snapshot'
      before: CanvasElement[]
      after: CanvasElement[]
      label: string
      affectedIds: string[]
    }
  | { type: 'move'; deltas: { id: string; dx: number; dy: number }[] }
  | { type: 'erase'; before: CanvasElement[]; after: CanvasElement[] }
  | {
      type: 'group'
      groupId: string
      elementIds: string[]
      beforeGroup: { id: string; oldGroupId?: string }[]
    }
  | { type: 'ungroup'; groupIds: string[]; beforeUngroup: { id: string; oldGroupId?: string }[] }
  | { type: 'lock'; elementIds: string[]; beforeLock: { id: string; wasLocked: boolean }[] }
  | { type: 'unlock'; elementIds: string[]; beforeUnlock: { id: string; wasLocked: boolean }[] }

/** Documents can be read from the v4 import boundary before normalization. */
export type CanvasSchemaVersion = 4 | 5

export interface CanvasDoc {
  schemaVersion: CanvasSchemaVersion
  id: string
  title: string
  elements: CanvasElement[]
  layers?: CanvasLayer[]
  activeLayerId?: string
  bgColor: string
  backgroundStyle?: CanvasBackgroundStyle
  folderId: string | null
  createdAt: number
  updatedAt: number
  undoStack?: UndoAction[]
  redoStack?: UndoAction[]
}

export type CurrentCanvasDoc = Omit<CanvasDoc, 'schemaVersion'> & { schemaVersion: 5 }

export interface CanvasFolder {
  id: string
  name: string
  parentId: string | null
  order: number
  expanded: boolean
}
