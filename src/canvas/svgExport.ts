import type {
  CanvasElement,
  CanvasBackgroundStyle,
  StrokeElement,
  ShapeElement,
  TextElement,
  ImageElement,
} from '../store/types'
import { getSvgBrushStyle } from './brushPresets'
import { sanitizeSvgDataUrl } from './svgSanitizer'
import {
  getTextAnchorX,
  getTextLineHeight,
  isVisibleTextBackground,
  normalizeTextFormat,
} from './textFormatting'
import getStroke from 'perfect-freehand'

// ── helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const DARK_BG = '#1C1A24'

function hasPressureData(el: StrokeElement): el is StrokeElement & { pressures: number[] } {
  return !!el.pressures && el.pressures.length === el.points.length
}

function pressureStrokeToSVG(el: StrokeElement & { pressures: number[] }): string {
  const outline = getStroke(
    el.points.map((point, index) => [point[0], point[1], el.pressures[index]]),
    {
      size: el.size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
    }
  )
  if (outline.length < 3) return ''

  let d = `M${outline[0][0]} ${outline[0][1]}`
  for (let i = 1; i < outline.length; i++) {
    d += `L${outline[i][0]} ${outline[i][1]}`
  }
  d += 'Z'

  return `<path d="${d}" fill="${esc(el.color)}"/>\n`
}

// ── per-element renderers ────────────────────────────────────────────────────

function strokeToSVG(el: StrokeElement): string {
  if (el.points.length < 2) return ''
  if (el.brush === 'pen' && hasPressureData(el)) return pressureStrokeToSVG(el)

  let d = `M${el.points[0][0]} ${el.points[0][1]}`
  for (let i = 1; i < el.points.length; i++) {
    d += `L${el.points[i][0]} ${el.points[i][1]}`
  }

  const { strokeWidth, opacity, dashArray, filterId } = getSvgBrushStyle(
    el.brush,
    el.size,
    el.opacity
  )
  let extraAttrs = ''

  if (dashArray) extraAttrs += ` stroke-dasharray="${dashArray[0]} ${dashArray[1]}"`
  if (filterId) extraAttrs += ` filter="url(#${filterId})"`

  const opacityAttr = opacity === undefined ? '' : ` opacity="${opacity}"`
  const attrs = `d="${d}" stroke="${esc(el.color)}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"${opacityAttr}${extraAttrs}`

  return `<path ${attrs}/>\n`
}

function shapeToSVG(el: ShapeElement): string {
  const fill = el.fillColor && el.fillColor !== 'transparent' ? esc(el.fillColor) : 'none'
  const baseAttrs = `stroke="${esc(el.color)}" stroke-width="${el.size}" fill="${fill}"`

  switch (el.kind) {
    case 'rectangle':
      return `<rect x="${Math.min(el.x, el.x + el.w)}" y="${Math.min(el.y, el.y + el.h)}" width="${Math.abs(el.w)}" height="${Math.abs(el.h)}" ${baseAttrs} rx="3"/>\n`
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
  const format = normalizeTextFormat(el)
  const lineHeight = getTextLineHeight(format.fontSize)
  const textX = getTextAnchorX(el.x, el.width, format.textAlign)
  const anchor =
    format.textAlign === 'center' ? 'middle' : format.textAlign === 'right' ? 'end' : 'start'
  const fontWeight = format.fontWeight === 'bold' ? ' font-weight="700"' : ''
  const fontStyle = format.fontStyle === 'italic' ? ' font-style="italic"' : ''
  const textDecoration = format.textDecoration === 'underline' ? ' text-decoration="underline"' : ''
  const textAttrs = `x="${textX}" y="${el.y + format.fontSize}" fill="${esc(format.color)}" font-size="${format.fontSize}" font-family="sans-serif" text-anchor="${anchor}"${fontWeight}${fontStyle}${textDecoration}`
  const background = isVisibleTextBackground(format.backgroundColor)
    ? `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${Math.max(el.height, lines.length * lineHeight)}" fill="${esc(format.backgroundColor)}"/>\n`
    : ''

  if (lines.length === 1) {
    return `${background}<text ${textAttrs}>${esc(lines[0])}</text>\n`
  }

  let s = `${background}<text ${textAttrs}>\n`
  for (let i = 0; i < lines.length; i++) {
    s += `  <tspan x="${textX}" dy="${i === 0 ? 0 : lineHeight}">${esc(lines[i])}</tspan>\n`
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

function elementToSVGContent(el: CanvasElement): string {
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

function elementToSVG(el: CanvasElement): string {
  const content = elementToSVGContent(el)
  if (el.type === 'stroke') return content
  const rotation = el.rotation ?? 0
  if (!content || Math.abs(rotation) < 0.001) return content

  const bounds =
    el.type === 'shape'
      ? {
          x: Math.min(el.x, el.x + el.w),
          y: Math.min(el.y, el.y + el.h),
          w: Math.abs(el.w),
          h: Math.abs(el.h),
        }
      : { x: el.x, y: el.y, w: el.width, h: el.height }
  const degrees = (rotation * 180) / Math.PI
  const centerX = bounds.x + bounds.w / 2
  const centerY = bounds.y + bounds.h / 2
  return `<g transform="rotate(${degrees} ${centerX} ${centerY})">\n${content}</g>\n`
}

// ── public API ───────────────────────────────────────────────────────────────

export interface SVGExportOptions {
  /** SVG width in px */
  width: number
  /** SVG height in px */
  height: number
  /** World-space origin used by the SVG viewBox */
  x?: number
  y?: number
  /** Document background color */
  backgroundColor?: string
  /** Document background pattern */
  backgroundStyle?: CanvasBackgroundStyle
  /** Set false for a transparent SVG */
  includeBackground?: boolean
  /** Dark mode determines the background fill */
  isDarkMode?: boolean
}

/**
 * Convert an array of canvas elements into a complete SVG string.
 * This is a pure function with no DOM dependencies.
 */
export function buildSVGString(elements: CanvasElement[], options: SVGExportOptions): string {
  const {
    width,
    height,
    x = 0,
    y = 0,
    isDarkMode = false,
    backgroundColor,
    backgroundStyle = 'plain',
    includeBackground = true,
  } = options
  const bg = esc(backgroundColor ?? (isDarkMode ? DARK_BG : '#ffffff'))
  const lineColor = isDarkMode ? 'rgba(200,190,220,0.16)' : 'rgba(86,104,128,0.16)'
  const dotColor = isDarkMode ? 'rgba(210,200,225,0.28)' : 'rgba(76,92,112,0.28)'

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">\n`

  // Defs: arrowhead marker + glow filter
  svg += `<defs>`
  svg += `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="context-stroke"/></marker>`
  svg += `<filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
  if (backgroundStyle === 'dots') {
    svg += `<pattern id="document-background" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1.25" fill="${dotColor}"/></pattern>`
  } else if (backgroundStyle === 'grid') {
    svg += `<pattern id="document-background" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="${lineColor}" stroke-width="1"/></pattern>`
  } else if (backgroundStyle === 'ruled' || backgroundStyle === 'notebook') {
    svg += `<pattern id="document-background" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 0 0 H 28" fill="none" stroke="${lineColor}" stroke-width="1"/></pattern>`
  }
  svg += `</defs>\n`

  if (includeBackground) {
    svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${bg}"/>\n`
    if (backgroundStyle !== 'plain') {
      svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#document-background)"/>\n`
    }
    if (backgroundStyle === 'notebook' && x <= 72 && x + width >= 72) {
      const marginColor = isDarkMode ? 'rgba(220,140,155,0.34)' : 'rgba(205,92,92,0.34)'
      svg += `<line x1="72" y1="${y}" x2="72" y2="${y + height}" stroke="${marginColor}" stroke-width="1"/>\n`
    }
  }

  // Elements
  for (const el of elements) {
    svg += elementToSVG(el)
  }

  svg += `</svg>`
  return svg
}
