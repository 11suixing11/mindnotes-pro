import type {
  TextAlign,
  TextDecoration,
  TextElement,
  TextFontStyle,
  TextFontWeight,
} from '../store/types'

export const DEFAULT_TEXT_FONT_SIZE = 16
export const DEFAULT_TEXT_BOX_WIDTH = 240
export const TEXT_LINE_HEIGHT_RATIO = 1.6
export const TEXT_FONT_SIZE_OPTIONS = [12, 14, 16, 20, 24, 32, 40] as const

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
  return `${style}${weight}${clampTextFontSize(format.fontSize)}px 'Noto Sans SC', 'PingFang SC', sans-serif`
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
