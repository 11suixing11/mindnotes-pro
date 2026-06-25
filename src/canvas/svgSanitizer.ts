/**
 * P32 新功能: SVG 安全过滤器 (来源 tldraw v4.5.0 PR #7896)
 * 
 * 安全背景:
 * SVG 是 XML 格式，可以包含 <script> 标签执行任意 JavaScript。
 * 当用户粘贴恶意 SVG 并导出时，导出文件可能包含 XSS 攻击代码。
 * 
 * 竞品对标:
 * - tldraw v4.5.0: 引入完整 SVG sanitizer (#7896)
 * - excalidraw: 使用 DOMPurify 过滤 SVG
 * - Figma: 严格的 SVG 白名单机制
 * 
 * 实现方案: 白名单机制 - 只允许安全的标签和属性
 * - 移除所有 <script> 标签及内容
 * - 移除所有 on* 事件处理器
 * - 移除 javascript: / data: 等危险协议
 * - 移除 <foreignObject> 等可嵌入 HTML 的标签
 * - 递归处理嵌套 SVG
 */

// 安全的 SVG 标签白名单 (基于 tldraw + W3C SVG 安全规范)
const SAFE_SVG_TAGS = new Set([
  'svg', 'g', 'defs', 'use', 'symbol',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'linearGradient', 'radialGradient', 'stop',
  'clipPath', 'mask', 'pattern', 'filter',
  'feGaussianBlur', 'feMerge', 'feMergeNode', 'feOffset', 'feColorMatrix',
  'image', 'text', 'tspan', 'title', 'desc',
  'marker', 'style',
])

// 安全的 SVG 属性白名单
const SAFE_SVG_ATTRS = new Set([
  // 核心属性
  'id', 'class', 'style', 'transform',
  // 坐标尺寸
  'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry',
  'width', 'height', 'viewBox',
  // 路径
  'd', 'points',
  // 样式
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'opacity',
  // 渐变
  'offset', 'stop-color', 'stop-opacity',
  'gradientUnits', 'gradientTransform', 'xlink:href', 'href',
  // 滤镜
  'stdDeviation', 'result', 'in',
  // 文本
  'font-size', 'font-family', 'text-anchor', 'dominant-baseline', 'dy',
  // 标记
  'markerWidth', 'markerHeight', 'refX', 'refY', 'orient',
  // 命名空间
  'xmlns', 'xmlns:xlink', 'preserveAspectRatio',
])

// 危险的属性前缀（事件处理器）
const DANGEROUS_ATTR_PREFIXES = ['on', 'onclick', 'onload', 'onerror', 'onmouseover']

/**
 * 检测 data URL 是否是 SVG
 */
export function isSvgDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith('data:image/svg+xml')
}

/**
 * 从 data URL 中提取 SVG 内容
 */
function extractSvgFromDataUrl(dataUrl: string): string | null {
  try {
    // data:image/svg+xml;base64,...
    const base64Match = dataUrl.match(/^data:image\/svg\+xml;base64,(.+)$/)
    if (base64Match) {
      return atob(base64Match[1])
    }
    // data:image/svg+xml,... (URL encoded)
    const plainMatch = dataUrl.match(/^data:image\/svg\+xml,(.+)$/)
    if (plainMatch) {
      return decodeURIComponent(plainMatch[1])
    }
    return null
  } catch {
    return null
  }
}

/**
 * 将 SVG 内容转换为安全的 data URL
 */
function svgToSafeDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

/**
 * 递归清理单个 DOM 节点
 */
function sanitizeNode(node: Element, doc: Document): void {
  // 移除不在白名单中的标签
  if (!SAFE_SVG_TAGS.has(node.tagName.toLowerCase())) {
    node.remove()
    return
  }

  // 清理属性
  const attrs = Array.from(node.attributes)
  for (const attr of attrs) {
    const name = attr.name.toLowerCase()
    
    // 移除事件处理器
    if (DANGEROUS_ATTR_PREFIXES.some(prefix => name.startsWith(prefix))) {
      node.removeAttribute(attr.name)
      continue
    }
    
    // 移除不在白名单中的属性
    if (!SAFE_SVG_ATTRS.has(name)) {
      node.removeAttribute(attr.name)
      continue
    }
    
    // 检查属性值是否包含危险协议
    const value = attr.value.toLowerCase()
    if (value.includes('javascript:') || 
        value.includes('vbscript:') ||
        value.includes('data:text/html')) {
      node.removeAttribute(attr.name)
      continue
    }
  }

  // 递归清理子节点
  const children = Array.from(node.children)
  for (const child of children) {
    sanitizeNode(child, doc)
  }
}

/**
 * 清理 SVG 字符串，移除所有危险内容
 * 
 * @param svgString 原始 SVG 字符串
 * @returns 安全的 SVG 字符串
 */
export function sanitizeSvg(svgString: string): string {
  try {
    // 使用 DOMParser 解析 SVG
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    
    // 检查解析错误
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      console.warn('[SVG Sanitizer] SVG parse error, using empty fallback')
      return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    }

    const svg = doc.documentElement
    
    // 确保有正确的命名空间
    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }

    // 递归清理所有节点
    sanitizeNode(svg, doc)

    // 序列化回字符串
    return new XMLSerializer().serializeToString(svg)
  } catch (e) {
    console.warn('[SVG Sanitizer] Sanitization failed, using empty fallback:', e)
    return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  }
}

/**
 * 清理 SVG data URL，防止 XSS 攻击
 * 
 * 使用场景:
 * 1. 用户粘贴 SVG 图片时
 * 2. 导出 SVG 包含嵌入图片时
 * 
 * @param dataUrl 原始图片 data URL
 * @returns 安全的 data URL（如果是 SVG 则清理，否则原样返回）
 */
export function sanitizeSvgDataUrl(dataUrl: string): string {
  // 非 SVG 直接返回
  if (!isSvgDataUrl(dataUrl)) {
    return dataUrl
  }

  try {
    const svgContent = extractSvgFromDataUrl(dataUrl)
    if (!svgContent) {
      console.warn('[SVG Sanitizer] Could not extract SVG content')
      return 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E'
    }

    const safeSvg = sanitizeSvg(svgContent)
    return svgToSafeDataUrl(safeSvg)
  } catch (e) {
    console.warn('[SVG Sanitizer] Data URL sanitization failed:', e)
    return 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E'
  }
}

/**
 * 检测 SVG 是否包含恶意内容（快速预检）
 * 用于在粘贴时快速警告用户
 */
export function hasPotentialDangerousContent(svgString: string): boolean {
  const lower = svgString.toLowerCase()
  return (
    lower.includes('<script') ||
    lower.includes('javascript:') ||
    lower.includes('onload=') ||
    lower.includes('onclick=') ||
    lower.includes('onerror=') ||
    lower.includes('<foreignobject')
  )
}
