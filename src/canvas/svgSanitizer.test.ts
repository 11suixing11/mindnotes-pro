import { describe, expect, it } from 'vitest'
import { sanitizeImageDataUrl, sanitizeSvg, sanitizeSvgDataUrl } from './svgSanitizer'

describe('SVG sanitizer', () => {
  it('preserves safe mixed-case SVG tags and attributes', () => {
    const sanitized = sanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" preserveAspectRatio="xMidYMid">
        <defs>
          <linearGradient id="paint" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff" />
          </linearGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="2" /></filter>
          <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" />
        </defs>
        <path d="M0 0 L20 20" fill="url(#paint)" filter="url(#blur)" marker-end="url(#arrow)" />
      </svg>
    `)

    expect(sanitized).toContain('viewBox="0 0 20 20"')
    expect(sanitized).toContain('<linearGradient')
    expect(sanitized).toContain('gradientUnits="userSpaceOnUse"')
    expect(sanitized).toContain('<feGaussianBlur')
    expect(sanitized).toContain('stdDeviation="2"')
    expect(sanitized).toContain('markerWidth="4"')
    expect(sanitized).toContain('filter="url(#blur)"')
    expect(sanitized).toContain('marker-end="url(#arrow)"')
  })

  it('removes executable SVG content while retaining safe artwork', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle cx="5" cy="5" r="5"/></svg>'
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(source)}`
    const sanitized = decodeURIComponent(sanitizeSvgDataUrl(dataUrl).split(',')[1])

    expect(sanitized).toContain('<circle')
    expect(sanitized).not.toContain('<script')
    expect(sanitized).not.toContain('onload')
  })

  it('accepts supported raster data URLs and rejects forged image URLs', () => {
    expect(sanitizeImageDataUrl('data:image/png;base64,abc123')).toBe(
      'data:image/png;base64,abc123'
    )
    expect(sanitizeImageDataUrl('data:image/png;base64,abc123" onerror="alert(1)')).toBeNull()
    expect(sanitizeImageDataUrl('data:image/svg+xmlx;base64,abc123')).toBeNull()
    expect(sanitizeImageDataUrl('https://example.com/image.png')).toBeNull()
  })

  it('removes nested SVG, remote, and inline CSS execution paths', () => {
    const source = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <style>* { background: url(javascript:alert(1)); }</style>
        <image href="data:image/svg+xml,%3Csvg%3E%3Cscript%3Ealert(1)%3C/script%3E%3C/svg%3E" />
        <use href="https://attacker.example/payload.svg#x" />
        <rect style="fill: url(https://attacker.example/track)" fill="url(https://attacker.example/track)" />
        <circle fill="url(#safe-gradient)" />
      </svg>
    `

    const sanitized = sanitizeSvg(source)

    expect(sanitized).not.toContain('<style')
    expect(sanitized).not.toContain('data:image/svg+xml')
    expect(sanitized).not.toContain('attacker.example')
    expect(sanitized).not.toContain('style=')
    expect(sanitized).toContain('fill="url(#safe-gradient)"')
  })
})
