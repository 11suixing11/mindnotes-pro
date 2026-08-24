import type {
  TextAlign,
  TextDecoration,
  TextElement,
  TextFontStyle,
  TextFontWeight,
} from '../store/types'

export const DEFAULT_TEXT_FONT_SIZE = 16
export const DEFAULT_TEXT_BOX_WIDTH = 240
export const MIN_TEXT_BOX_WIDTH = 40
export const MAX_TEXT_BOX_WIDTH = 800
export const TEXT_LINE_HEIGHT_RATIO = 1.6
export const TEXT_FONT_SIZE_OPTIONS = [12, 14, 16, 20, 24, 32, 40] as const
export const TEXT_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans SC', 'Noto Sans', 'Noto Sans CJK SC', 'Microsoft YaHei', 'Hiragino Sans GB', Arial, sans-serif"

export type TextWidthMeasurer = (text: string) => number

export interface TextLayout {
  originalContent: string
  renderedContent: string
  lines: string[]
  width: number
  height: number
  wraps: boolean
}

export interface TextFormatState {
  fontSize: number
  color: string
  fontWeight: TextFontWeight
  fontStyle: TextFontStyle
  textDecoration: TextDecoration
  textAlign: TextAlign
  backgroundColor?: string
}

export function normalizeTextFormat(
  source: Partial<TextElement> & { color?: string; fontSize?: number }
): TextFormatState {
  return {
    fontSize: clampTextFontSize(source.fontSize ?? DEFAULT_TEXT_FONT_SIZE),
    color: source.color ?? '#1A1A1A',
    fontWeight: source.fontWeight === 'bold' ? 'bold' : 'normal',
    fontStyle: source.fontStyle === 'italic' ? 'italic' : 'normal',
    textDecoration: source.textDecoration === 'underline' ? 'underline' : 'none',
    textAlign:
      source.textAlign === 'center' || source.textAlign === 'right' ? source.textAlign : 'left',
    backgroundColor: isVisibleTextBackground(source.backgroundColor)
      ? source.backgroundColor
      : undefined,
  }
}

export function clampTextFontSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_TEXT_FONT_SIZE
  return Math.min(96, Math.max(8, Math.round(size)))
}

export function getTextLineHeight(fontSize: number): number {
  return clampTextFontSize(fontSize) * TEXT_LINE_HEIGHT_RATIO
}

export function getTextFont(
  format: Pick<TextFormatState, 'fontSize' | 'fontStyle' | 'fontWeight'>
) {
  const style = format.fontStyle === 'italic' ? 'italic ' : ''
  const weight = format.fontWeight === 'bold' ? '700 ' : ''
  return `${style}${weight}${clampTextFontSize(format.fontSize)}px ${TEXT_FONT_FAMILY}`
}

export function normalizeTextContent(content: string): string {
  return content.replace(/\r\n?/g, '\n').replace(/\t/g, '        ')
}

export function getOriginalTextContent(
  source: Pick<TextElement, 'content' | 'originalContent'>
): string {
  return normalizeTextContent(source.originalContent ?? source.content)
}

export function isAutoResizeText(source: Pick<TextElement, 'autoResize'>): boolean {
  return source.autoResize === true
}

type SegmenterLike = {
  segment(input: string): Iterable<{ segment: string }>
}

type SegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' }
) => SegmenterLike

let graphemeSegmenter: SegmenterLike | null | undefined

function splitGraphemes(value: string): string[] {
  if (graphemeSegmenter === undefined) {
    const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter
    graphemeSegmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : null
  }
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment)
    : Array.from(value)
}

const CJK_GRAPHEME = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const EMOJI_GRAPHEME = /\p{Extended_Pictographic}/u
const BREAK_AFTER_GRAPHEME = /[-/]/u
const OPENING_PUNCTUATION =
  /[([{<\u3008\u300a\u300c\u300e\u3010\u3014\u3016\u3018\u301a\uff08\uff3b\uff5b\u3001]/u
const CLOSING_PUNCTUATION =
  /[\])}>\u3009\u300b\u300d\u300f\u3011\u3015\u3017\u3019\u301b\uff09\uff3d\uff5d\u3001\u3002\uff0c\uff01\uff1f\uff1a\uff1b\u300d\u300f\u300b\u300d,.;:!?]/u

function tokenizeForWrapping(line: string): string[] {
  const tokens: string[] = []
  let word = ''
  let openingPrefix = ''

  const flushWord = () => {
    if (!word) return
    tokens.push(openingPrefix + word)
    word = ''
    openingPrefix = ''
  }

  // Keep the user's original code points intact. Intl.Segmenter already
  // treats combining marks as part of their grapheme; normalizing here would
  // silently change exported text.
  for (const grapheme of splitGraphemes(line)) {
    if (/\s/u.test(grapheme)) {
      flushWord()
      if (openingPrefix) {
        tokens.push(openingPrefix)
        openingPrefix = ''
      }
      const lastIndex = tokens.length - 1
      if (lastIndex >= 0 && /^\s+$/u.test(tokens[lastIndex])) tokens[lastIndex] += grapheme
      else tokens.push(grapheme)
      continue
    }

    if (OPENING_PUNCTUATION.test(grapheme)) {
      flushWord()
      openingPrefix += grapheme
      continue
    }

    if (CLOSING_PUNCTUATION.test(grapheme)) {
      if (word) {
        word += grapheme
      } else if (openingPrefix) {
        tokens.push(openingPrefix + grapheme)
        openingPrefix = ''
      } else {
        const lastIndex = tokens.length - 1
        if (lastIndex >= 0 && !/^\s+$/u.test(tokens[lastIndex])) tokens[lastIndex] += grapheme
        else tokens.push(grapheme)
      }
      continue
    }

    if (CJK_GRAPHEME.test(grapheme) || EMOJI_GRAPHEME.test(grapheme)) {
      flushWord()
      tokens.push(openingPrefix + grapheme)
      openingPrefix = ''
      continue
    }

    word += grapheme
    if (BREAK_AFTER_GRAPHEME.test(grapheme)) flushWord()
  }

  flushWord()
  if (openingPrefix) tokens.push(openingPrefix)
  return tokens
}

function wrapLongToken(token: string, maxWidth: number, measureText: TextWidthMeasurer): string[] {
  const lines: string[] = []
  let current = ''

  for (const grapheme of splitGraphemes(token)) {
    const candidate = current + grapheme
    if (current && measureText(candidate) > maxWidth) {
      lines.push(current)
      current = grapheme
    } else {
      current = candidate
    }
  }

  if (current || lines.length === 0) lines.push(current)
  return lines
}

function wrapLine(line: string, maxWidth: number, measureText: TextWidthMeasurer): string[] {
  if (!line || !Number.isFinite(maxWidth) || maxWidth <= 0 || measureText(line) <= maxWidth) {
    return [line]
  }

  const lines: string[] = []
  let current = ''

  for (const token of tokenizeForWrapping(line)) {
    if (!current) {
      if (/^\s+$/u.test(token)) continue
      if (measureText(token) <= maxWidth) {
        current = token
        continue
      }

      const pieces = wrapLongToken(token, maxWidth, measureText)
      lines.push(...pieces.slice(0, -1))
      current = pieces[pieces.length - 1] ?? ''
      continue
    }

    const candidate = current + token
    if (measureText(candidate) <= maxWidth) {
      current = candidate
      continue
    }

    const committed = current.replace(/\s+$/u, '')
    if (committed) lines.push(committed)
    current = ''

    const nextToken = token.replace(/^\s+/u, '')
    if (!nextToken) continue
    if (measureText(nextToken) <= maxWidth) {
      current = nextToken
      continue
    }

    const pieces = wrapLongToken(nextToken, maxWidth, measureText)
    lines.push(...pieces.slice(0, -1))
    current = pieces[pieces.length - 1] ?? ''
  }

  if (current || lines.length === 0) lines.push(current.replace(/\s+$/u, ''))
  return lines
}

export function wrapTextLines(
  content: string,
  maxWidth: number,
  measureText: TextWidthMeasurer
): string[] {
  const normalized = normalizeTextContent(content)
  return normalized.split('\n').flatMap((line) => wrapLine(line, maxWidth, measureText))
}

function approximateTextWidth(text: string, fontSize: number): number {
  let width = 0
  for (const grapheme of splitGraphemes(text)) {
    if (/\s/u.test(grapheme)) width += fontSize * 0.33
    else if (CJK_GRAPHEME.test(grapheme) || EMOJI_GRAPHEME.test(grapheme)) width += fontSize
    else if (/[ilI1'`.,:;!|]/u.test(grapheme)) width += fontSize * 0.3
    else if (/[mwMW@#%&]/u.test(grapheme)) width += fontSize * 0.82
    else width += fontSize * 0.56
  }
  return width
}

let metricsCanvas: HTMLCanvasElement | null = null

export function createTextWidthMeasurer(
  format: Pick<TextFormatState, 'fontSize' | 'fontStyle' | 'fontWeight'>,
  context?: CanvasRenderingContext2D | null
): TextWidthMeasurer {
  let ctx = context ?? null
  if (!ctx && typeof document !== 'undefined') {
    metricsCanvas ??= document.createElement('canvas')
    ctx = metricsCanvas.getContext('2d')
  }

  if (ctx) {
    ctx.font = getTextFont(format)
    return (text) => ctx?.measureText(text).width ?? 0
  }

  const fontSize = clampTextFontSize(format.fontSize)
  return (text) => approximateTextWidth(text, fontSize)
}

export function getTextLayout(
  content: string,
  format: Pick<TextFormatState, 'fontSize' | 'fontStyle' | 'fontWeight'>,
  options: {
    autoResize: boolean
    width?: number
    maxWidth?: number
    measureText?: TextWidthMeasurer
  }
): TextLayout {
  const originalContent = normalizeTextContent(content)
  const lineHeight = getTextLineHeight(format.fontSize)
  const measureText = options.measureText ?? createTextWidthMeasurer(format)
  const maxWidth = Math.max(MIN_TEXT_BOX_WIDTH, options.maxWidth ?? MAX_TEXT_BOX_WIDTH)

  let width: number
  let lines: string[]
  let wraps = !options.autoResize

  if (options.autoResize) {
    const hardLines = originalContent.split('\n')
    const naturalWidth = hardLines.reduce(
      (maximum, line) => Math.max(maximum, measureText(line)),
      0
    )
    const bufferedWidth = Math.ceil(naturalWidth + 2)
    width = Math.max(MIN_TEXT_BOX_WIDTH, Math.min(maxWidth, bufferedWidth))
    wraps = bufferedWidth > maxWidth
    lines = wraps ? wrapTextLines(originalContent, width, measureText) : hardLines
  } else {
    width = Math.max(MIN_TEXT_BOX_WIDTH, options.width ?? DEFAULT_TEXT_BOX_WIDTH)
    lines = wrapTextLines(originalContent, width, measureText)
  }

  if (lines.length === 0) lines = ['']

  return {
    originalContent,
    renderedContent: lines.join('\n'),
    lines,
    width,
    height: Math.max(lineHeight, lines.length * lineHeight),
    wraps,
  }
}

export function getTextAnchorX(x: number, width: number, textAlign: TextAlign | undefined): number {
  if (textAlign === 'center') return x + width / 2
  if (textAlign === 'right') return x + width
  return x
}

export function isVisibleTextBackground(color?: string): color is string {
  return !!color && color !== 'transparent'
}

export function toStoredTextFormat(format: TextFormatState) {
  return {
    fontWeight: format.fontWeight === 'bold' ? format.fontWeight : undefined,
    fontStyle: format.fontStyle === 'italic' ? format.fontStyle : undefined,
    textDecoration: format.textDecoration === 'underline' ? format.textDecoration : undefined,
    textAlign: format.textAlign === 'left' ? undefined : format.textAlign,
    backgroundColor: isVisibleTextBackground(format.backgroundColor)
      ? format.backgroundColor
      : undefined,
  }
}
