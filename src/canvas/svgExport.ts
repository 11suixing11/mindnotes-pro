import type {
  CanvasElement,
  StrokeElement,
  ShapeElement,
  TextElement,
  ImageElement,
} from '../store/types'
import { sanitizeSvgDataUrl } from './svgSanitizer'

// ── helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const DARK_BG = '#1C1A24'

// ── per-element renderers ────────────────────────────────────────────────────

function strokeToSVG(el: StrokeElement): string {
  if (el.points.length < 2) return ''

  let d = `M${el.points[0][0]} ${el.points[0][1]}`
  for (let i = 1; i < el.points.length; i++) {
    d += `L${el.points[i][0]} ${el.points[i][1]}`
  }

  let strokeWidth = el.size
  let opacity: number | undefined
  let extraAttrs = ''

  // Opacity for brushes that use it
  if (el.brush === 'highlighter') {
    opacity = el.opacity ?? 0.3
    strokeWidth = el.size * 4
  } else if (el.brush === 'pencil') {
    opacity = el.opacity ?? 0.65
    strokeWidth = el.size * 0.6
  } else if (el.brush === 'marker') {
    opacity = el.opacity ?? 0.9
    strokeWidth = el.size * 2.2
  } else if (el.brush === 'watercolor') {
    opacity = el.opacity ?? 0.28
    strokeWidth = el.size * 2.6
  } else if (el.brush === 'crayon') {
    opacity = el.opacity ?? 0.78
    strokeWidth = el.size * 1.15
  }

  // Dashed stroke
  if (el.brush === 'dashed') {
    const dashLen = el.size * 2
    const gapLen = el.size * 1.5
    extraAttrs += ` stroke-dasharray="${dashLen} ${gapLen}"`
  }

  // Glow effect via filter
  if (el.brush === 'glow') {
    strokeWidth = el.size * 0.7
    opacity = 0.9
    extraAttrs += ` filter="url(#glow)"`
  }

  const opacityAttr = opacity === undefined ? '' : ` opacity="${opacity}"`
  const attrs = `d="${d}" stroke="${el.color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"${opacityAttr}${extraAttrs}`

  return `<path ${attrs}/>\n`
}

function shapeToSVG(el: ShapeElement): string {
  const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
  const baseAttrs = `stroke="${el.color}" stroke-width="${el.size}" fill="${fill}"`

  switch (el.kind) {
    case 'rectangle':
      return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" ${baseAttrs} rx="3"/>\n`
    case 'circle':
      return `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${Math.abs(el.w) / 2}" ry="${Math.abs(el.h) / 2}" ${baseAttrs}/>\n`
    case 'arrow':
      return `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}" ${baseAttrs} marker-end="url(#arrowhead)"/>\n`
    case 'line':
      return `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}" ${baseAttrs}/>\n`
    default:
      return ''
  }
}

function textToSVG(el: TextElement): string {
  const lines = el.content.split('\n')
  const lineHeight = el.fontSize * 1.4

  if (lines.length === 1) {
    return `<text x="${el.x}" y="${el.y + el.fontSize}" fill="${el.color}" font-size="${el.fontSize}" font-family="sans-serif">${esc(lines[0])}</text>\n`
  }

  let s = `<text x="${el.x}" y="${el.y + el.fontSize}" fill="${el.color}" font-size="${el.fontSize}" font-family="sans-serif">\n`
  for (let i = 0; i < lines.length; i++) {
    s += `  <tspan x="${el.x}" dy="${i === 0 ? 0 : lineHeight}">${esc(lines[i])}</tspan>\n`
  }
  s += `</text>\n`
  return s
}

function imageToSVG(el: ImageElement): string {
  // SVG 安全过滤 - 导出时二次清理，防止 XSS 攻击
  // 参考: 通用编辑器安全处理做法
  const safeDataUrl = sanitizeSvgDataUrl(el.dataUrl)
  return `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${safeDataUrl}" preserveAspectRatio="none"/>\n`
}

function elementToSVG(el: CanvasElement): string {
  switch (el.type) {
    case 'stroke':
      return strokeToSVG(el)
    case 'shape':
      return shapeToSVG(el)
    case 'text':
      return textToSVG(el)
    case 'image':
      return imageToSVG(el)
    default:
      return ''
  }
}

// ── public API ───────────────────────────────────────────────────────────────

export interface SVGExportOptions {
  /** SVG width in px */
  width: number
  /** SVG height in px */
  height: number
  /** Dark mode determines the background fill */
  isDarkMode?: boolean
}

/**
 * Convert an array of canvas elements into a complete SVG string.
 * This is a pure function with no DOM dependencies.
 */
export function buildSVGString(elements: CanvasElement[], options: SVGExportOptions): string {
  const { width, height, isDarkMode = false } = options
  const bg = isDarkMode ? DARK_BG : '#ffffff'

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n`

  // Defs: arrowhead marker + glow filter
  svg += `<defs>`
  svg += `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="context-stroke"/></marker>`
  svg += `<filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
  svg += `</defs>\n`

  // Background
  svg += `<rect width="100%" height="100%" fill="${bg}"/>\n`

  // Elements
  for (const el of elements) {
    svg += elementToSVG(el)
  }

  svg += `</svg>`
  return svg
}
