import { nanoid } from 'nanoid'

// 生成唯一 ID
export function generateId(): string {
  return nanoid()
}

// 生成短 ID（用于分享链接等）
export function generateShortId(): string {
  return nanoid(8)
}

// 生成颜色 ID
export function generateColorId(): string {
  return `color-${nanoid(6)}`
}
