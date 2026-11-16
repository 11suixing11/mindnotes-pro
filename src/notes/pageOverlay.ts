import { quoteMatchIndex, resolvePoint } from './model.js'
import type { NotePoint, PageAnchor, PageAnnotation, TextQuote } from './model.js'
import type { PageOverlayState } from './desktop.js'

/** This function is serialized into the visited page; keep all runtime dependencies in its parameters. */
export function installPageOverlay(
  matchQuote: typeof quoteMatchIndex,
  projectPoint: typeof resolvePoint
): void {
  if (window.__mindnotesOverlay || !window.__mindnotesPage || !document.body) return
  const bridge = window.__mindnotesPage
  const namespace = 'http://www.w3.org/2000/svg'
  const host = document.createElement('div')
  host.id = 'mindnotes-page-layer'
  host.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block;'
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = `
    :host{all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647}
    svg{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;touch-action:none}
    .pin{position:absolute;display:grid;place-items:center;box-sizing:border-box;width:44px;height:44px;border:0;border-radius:0;background:transparent;color:white;font:600 13px system-ui;cursor:pointer;pointer-events:auto;padding:0}
    .pin span{display:grid;place-items:center;box-sizing:border-box;width:28px;height:28px;border:2px solid white;border-radius:50%;background:var(--pin-color);box-shadow:0 2px 8px #0003;pointer-events:none}
    .pin:focus-visible{outline:3px solid #111;outline-offset:3px}
  `
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('aria-label', 'MindNotes Pro 页面批注层')
  const pins = document.createElement('div')
  shadow.append(style, svg, pins)
  document.documentElement.append(host)

  let state: PageOverlayState = {
    annotations: [],
    tool: 'browse',
    color: '#e0a11b',
    activeAnnotationId: null,
  }
  let draft: PageAnnotation | null = null
  let capturedPointer: number | null = null
  let frame = 0
  let changed = true
  let positionsKey: string | null = null
  const anchors = new Map<string, Element>()
  const quoteRanges = new Map<string, Range>()
  const hiddenQuotes = new Set<string>()
  const reportedPositions = new Map<string, boolean>()

  function rendered(element: Element): boolean {
    const style = getComputedStyle(element)
    return (
      element.getClientRects().length > 0 &&
      style.visibility !== 'hidden' &&
      style.visibility !== 'collapse' &&
      style.display !== 'none'
    )
  }

  function safeText(element: Element): string {
    const copy = element.cloneNode(true) as Element
    copy
      .querySelectorAll('input,textarea,select,script,style,[contenteditable="true"]')
      .forEach((child) => child.remove())
    return (copy.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)
  }

  function selectorFor(element: Element): string {
    if (element.id) return `#${CSS.escape(element.id)}`
    const parts: string[] = []
    let current: Element | null = element
    for (let depth = 0; current && current !== document.body && depth < 8; depth += 1) {
      const parent: Element | null = current.parentElement
      if (!parent) break
      const siblings = [...parent.children].filter(
        (sibling) => sibling.tagName === current?.tagName
      )
      parts.unshift(
        `${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`
      )
      if (parent.id) {
        parts.unshift(`#${CSS.escape(parent.id)}`)
        break
      }
      current = parent
    }
    return parts.join(' > ')
  }

  function captureAnchor(x: number, y: number): PageAnchor | null {
    const hit = document
      .elementsFromPoint(x, y)
      .find((element) => element !== host && !host.contains(element))
    const element = hit?.closest('p,h1,h2,h3,h4,li,blockquote,pre,article,section,main,div')
    if (
      !element ||
      element === document.body ||
      element === document.documentElement ||
      element.closest('input,textarea,[contenteditable="true"]')
    )
      return null
    const rect = element.getBoundingClientRect()
    return {
      selector: selectorFor(element),
      text: safeText(element),
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
    }
  }

  function anchorElement(annotation: PageAnnotation): Element | null {
    const anchor = annotation.anchor
    if (!anchor) return null
    const cached = anchors.get(annotation.id)
    if (cached?.isConnected) {
      if (rendered(cached) && (!anchor.text || safeText(cached).includes(anchor.text.slice(0, 60))))
        return cached
      // Keep the original node identity while it is hidden or recycled. Text
      // elsewhere must not take over its annotation; the original may return.
      return null
    }
    anchors.delete(annotation.id)
    let element: Element | null = null
    try {
      element = document.querySelector(anchor.selector)
    } catch {
      /* A stale selector falls back to its text. */
    }
    if (
      element &&
      (!rendered(element) || (anchor.text && !safeText(element).includes(anchor.text.slice(0, 60))))
    )
      return null
    if (!element && anchor.text) {
      const text = anchor.text.slice(0, 100)
      // Repeated text without its original selector is not a trustworthy position.
      for (const candidate of document.querySelectorAll('p,h1,h2,h3,h4,li,blockquote,pre')) {
        if (!rendered(candidate) || !safeText(candidate).includes(text)) continue
        if (element) {
          element = null
          break
        }
        element = candidate
      }
    }
    if (element) anchors.set(annotation.id, element)
    return element
  }

  function projectedPoints(annotation: PageAnnotation): NotePoint[] {
    const rect = anchorElement(annotation)?.getBoundingClientRect()
    return annotation.points.map((point) =>
      projectPoint(point, annotation.anchor, rect ? { x: rect.left, y: rect.top } : null, {
        x: window.scrollX,
        y: window.scrollY,
      })
    )
  }

  function textNodes(visibleOnly = false): Text[] {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (
          !node.textContent ||
          node.parentElement?.closest(
            'script,style,noscript,input,textarea,select,[contenteditable="true"],#mindnotes-page-layer'
          )
        )
          return NodeFilter.FILTER_REJECT
        if (visibleOnly && (!node.parentElement || !rendered(node.parentElement)))
          return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    const nodes: Text[] = []
    let node = walker.nextNode()
    let size = 0
    while (node && size < 5_000_000) {
      nodes.push(node as Text)
      size += node.textContent?.length ?? 0
      node = walker.nextNode()
    }
    return nodes
  }

  function visibleRange(range: Range): boolean {
    const parent = range.startContainer.parentElement
    return Boolean(parent && rendered(parent) && range.getClientRects().length)
  }

  function findQuote(annotation: PageAnnotation): Range | null {
    if (!annotation.quote) return null
    const cached = quoteRanges.get(annotation.id)
    if (
      cached?.startContainer.isConnected &&
      cached.toString() === annotation.quote.exact &&
      visibleRange(cached)
    )
      return cached
    quoteRanges.delete(annotation.id)
    if (hiddenQuotes.has(annotation.id)) return null
    const nodes = textNodes(true)
    const content = nodes.map((node) => node.data).join('')
    const start = matchQuote(content, annotation.quote)
    if (start === -1) return null
    const end = start + annotation.quote.exact.length
    const range = document.createRange()
    let offset = 0
    let started = false
    for (const node of nodes) {
      const next = offset + node.length
      if (!started && start < next) {
        range.setStart(node, start - offset)
        started = true
      }
      if (started && end <= next) {
        range.setEnd(node, end - offset)
        if (!visibleRange(range)) return null
        quoteRanges.set(annotation.id, range)
        return range
      }
      offset = next
    }
    return null
  }

  function appendStroke(annotation: PageAnnotation): void {
    const points = projectedPoints(annotation)
    if (!points.length || annotation.kind === 'note' || annotation.kind === 'quote') return
    const path = document.createElementNS(namespace, 'polyline')
    path.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '))
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', annotation.color)
    path.setAttribute('stroke-width', annotation.kind === 'highlight' ? '18' : '3')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    path.setAttribute('opacity', annotation.kind === 'highlight' ? '0.28' : '0.9')
    path.setAttribute('data-annotation-id', annotation.id)
    svg.append(path)
  }

  function render(): void {
    frame = 0
    if (!changed) return
    changed = false
    svg.replaceChildren()
    pins.replaceChildren()
    const unresolvedIds: string[] = []
    reportedPositions.clear()
    for (const [index, annotation] of state.annotations.entries()) {
      const range = findQuote(annotation)
      const unresolved =
        annotation.kind === 'quote'
          ? !range
          : Boolean(annotation.anchor && !anchorElement(annotation))
      reportedPositions.set(annotation.id, !unresolved)
      if (unresolved) {
        unresolvedIds.push(annotation.id)
        continue
      }
      appendStroke(annotation)
      if (range) {
        for (const rect of [...range.getClientRects()]) {
          if (rect.bottom < 0 || rect.top > window.innerHeight) continue
          const highlight = document.createElementNS(namespace, 'rect')
          highlight.setAttribute('x', String(rect.left))
          highlight.setAttribute('y', String(rect.top))
          highlight.setAttribute('width', String(rect.width))
          highlight.setAttribute('height', String(rect.height))
          highlight.setAttribute('fill', annotation.color)
          highlight.setAttribute('opacity', '0.26')
          highlight.setAttribute('data-annotation-id', annotation.id)
          svg.append(highlight)
        }
      }
      const quoteRect = range?.getBoundingClientRect()
      const point =
        quoteRect && quoteRect.width
          ? { x: quoteRect.right + 8, y: quoteRect.top }
          : projectedPoints(annotation)[0]
      if (!point || point.y < -30 || point.y > window.innerHeight || point.x > window.innerWidth)
        continue
      if (
        annotation.kind === 'note' ||
        annotation.kind === 'quote' ||
        annotation.comment ||
        state.activeAnnotationId === annotation.id
      ) {
        const pin = document.createElement('button')
        pin.type = 'button'
        pin.className = 'pin'
        const label = document.createElement('span')
        label.textContent = String(index + 1)
        pin.append(label)
        pin.setAttribute('aria-label', `打开第 ${index + 1} 条批注`)
        pin.style.cssText = `left:${Math.max(0, Math.min(window.innerWidth - 44, point.x - 8))}px;top:${Math.max(0, Math.min(window.innerHeight - 44, point.y - 8))}px;--pin-color:${annotation.color};`
        pin.addEventListener('click', (event) => {
          event.stopPropagation()
          bridge.edit({ type: 'select', id: annotation.id })
        })
        pins.append(pin)
      }
    }
    if (draft) appendStroke(draft)
    const key = JSON.stringify(unresolvedIds.slice().sort())
    if (key !== positionsKey) {
      positionsKey = key
      bridge.reportPositions(unresolvedIds)
    }
  }

  function invalidate(): void {
    changed = true
    if (!frame) frame = requestAnimationFrame(render)
  }

  function makeAnnotation(
    kind: PageAnnotation['kind'],
    point: NotePoint,
    anchor: PageAnchor | null,
    quote: TextQuote | null = null
  ): PageAnnotation {
    const now = Date.now()
    return {
      id: crypto.randomUUID(),
      kind,
      color: state.color,
      points: [point],
      anchor,
      quote,
      comment: '',
      createdAt: now,
      updatedAt: now,
    }
  }

  function commit(annotation: PageAnnotation): void {
    state = {
      ...state,
      annotations: [...state.annotations, annotation],
      activeAnnotationId: annotation.id,
    }
    bridge.edit({ type: 'add', annotation })
    invalidate()
  }

  function captureSelection(): boolean {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) return false
    const range = selection.getRangeAt(0).cloneRange()
    if (
      range.commonAncestorContainer.parentElement?.closest(
        'input,textarea,[contenteditable="true"]'
      )
    )
      return false
    const exact = range.toString()
    if (!exact.trim() || exact.length > 30_000) return false
    const nodes = textNodes()
    const content = nodes.map((node) => node.data).join('')
    let start = 0
    let located = false
    for (const node of nodes) {
      if (node === range.startContainer) {
        start += range.startOffset
        located = true
        break
      }
      start += node.length
    }
    if (!located) start = content.indexOf(exact)
    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) return false
    const quote = {
      exact,
      prefix: start >= 0 ? content.slice(Math.max(0, start - 40), start) : '',
      suffix: start >= 0 ? content.slice(start + exact.length, start + exact.length + 40) : '',
    }
    const annotation = makeAnnotation(
      'quote',
      { x: rect.left + window.scrollX, y: rect.top + window.scrollY },
      captureAnchor(rect.left + 1, rect.top + 1),
      quote
    )
    quoteRanges.set(annotation.id, range)
    selection.removeAllRanges()
    commit(annotation)
    return true
  }

  function eraseAt(x: number, y: number): void {
    for (const annotation of [...state.annotations].reverse()) {
      if (reportedPositions.get(annotation.id) === false) continue
      const range = findQuote(annotation)
      const inQuote =
        range &&
        [...range.getClientRects()].some(
          (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
        )
      const points = projectedPoints(annotation)
      let hit = points.some((point) => Math.hypot(point.x - x, point.y - y) <= 18)
      for (let index = 1; !hit && index < points.length; index += 1) {
        const a = points[index - 1]
        const b = points[index]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const t = Math.max(
          0,
          Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1))
        )
        hit = Math.hypot(a.x + t * dx - x, a.y + t * dy - y) <= 18
      }
      if (hit || inQuote) {
        state = {
          ...state,
          annotations: state.annotations.filter((item) => item.id !== annotation.id),
        }
        bridge.edit({ type: 'delete', id: annotation.id })
        invalidate()
        return
      }
    }
  }

  svg.addEventListener('pointerdown', (event) => {
    if (
      event.button !== 0 ||
      state.tool === 'browse' ||
      capturedPointer !== null ||
      (event.pointerType === 'touch' && !event.isPrimary)
    )
      return
    event.preventDefault()
    if (state.tool === 'erase') {
      eraseAt(event.clientX, event.clientY)
      return
    }
    const point = { x: event.clientX + window.scrollX, y: event.clientY + window.scrollY }
    const annotation = makeAnnotation(
      state.tool === 'note' ? 'note' : state.tool === 'highlight' ? 'highlight' : 'ink',
      point,
      captureAnchor(event.clientX, event.clientY)
    )
    if (state.tool === 'note') {
      commit(annotation)
      return
    }
    try {
      svg.setPointerCapture(event.pointerId)
    } catch {
      // The page or browser can interrupt the pointer before capture is acquired.
      return
    }
    draft = annotation
    capturedPointer = event.pointerId
    invalidate()
  })

  svg.addEventListener('pointermove', (event) => {
    if (!draft || capturedPointer !== event.pointerId || draft.points.length >= 8_000) return
    const events =
      typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event]
    for (const sample of events.length ? events : [event]) {
      const point = { x: sample.clientX + window.scrollX, y: sample.clientY + window.scrollY }
      const last = draft.points[draft.points.length - 1]
      if (Math.hypot(point.x - last.x, point.y - last.y) > 1 && draft.points.length < 8_000)
        draft.points.push(point)
    }
    invalidate()
  })

  function finishStroke(event: PointerEvent): void {
    if (!draft || capturedPointer !== event.pointerId) return
    const annotation = draft
    const end = { x: event.clientX + window.scrollX, y: event.clientY + window.scrollY }
    const last = annotation.points[annotation.points.length - 1]
    if (annotation.points.length < 8_000 && (end.x !== last.x || end.y !== last.y))
      annotation.points.push(end)
    draft = null
    capturedPointer = null
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId)
    if (annotation.points.length === 1)
      annotation.points.push({ x: annotation.points[0].x + 0.1, y: annotation.points[0].y })
    commit(annotation)
  }
  svg.addEventListener('pointerup', finishStroke)

  function cancelStroke(): void {
    const pointer = capturedPointer
    draft = null
    capturedPointer = null
    if (pointer !== null && svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer)
    invalidate()
  }
  svg.addEventListener('pointercancel', (event) => {
    if (capturedPointer === event.pointerId) cancelStroke()
  })
  svg.addEventListener('lostpointercapture', (event) => {
    // A previous pointerup can deliver its lost-capture event after the next
    // stroke has acquired the same mouse pointer ID.
    if (capturedPointer === event.pointerId && !svg.hasPointerCapture(event.pointerId))
      cancelStroke()
  })
  svg.addEventListener(
    'wheel',
    (event) => {
      if (state.tool === 'browse') return
      event.preventDefault()
      const multiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 18
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1
      const underlying = document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((element) => element !== host)
      let scroller = underlying?.parentElement ?? null
      while (scroller && scroller !== document.body && scroller !== document.documentElement) {
        const overflow = getComputedStyle(scroller).overflowY
        if (/(auto|scroll)/.test(overflow) && scroller.scrollHeight > scroller.clientHeight) break
        scroller = scroller.parentElement
      }
      if (scroller && scroller !== document.body && scroller !== document.documentElement)
        scroller.scrollBy(event.deltaX * multiplier, event.deltaY * multiplier)
      else window.scrollBy(event.deltaX * multiplier, event.deltaY * multiplier)
    },
    { passive: false }
  )

  document.addEventListener('keydown', (event) => {
    if (
      (event.target as Element | null)?.closest?.('input,textarea,select,[contenteditable="true"]')
    )
      return
    if (event.key === 'Escape') {
      cancelStroke()
      bridge.edit({ type: 'browse' })
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      captureSelection()
    }
    if (
      state.tool !== 'browse' &&
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'z'
    ) {
      event.preventDefault()
      bridge.edit({ type: event.shiftKey ? 'redo' : 'undo' })
    }
  })

  bridge.subscribe((next) => {
    if (next.tool !== state.tool) cancelStroke()
    // Undo, import and SPA navigation can replace the data while reusing IDs.
    const previous = new Map(state.annotations.map((annotation) => [annotation.id, annotation]))
    for (const annotation of next.annotations) {
      const old = previous.get(annotation.id)
      if (JSON.stringify(old?.anchor) !== JSON.stringify(annotation.anchor))
        anchors.delete(annotation.id)
      if (JSON.stringify(old?.quote) !== JSON.stringify(annotation.quote)) {
        quoteRanges.delete(annotation.id)
        hiddenQuotes.delete(annotation.id)
      }
    }
    state = next
    svg.style.pointerEvents = state.tool === 'browse' ? 'none' : 'auto'
    svg.style.cursor =
      state.tool === 'erase' ? 'cell' : state.tool === 'note' ? 'copy' : 'crosshair'
    const ids = new Set(state.annotations.map((annotation) => annotation.id))
    for (const id of anchors.keys()) if (!ids.has(id)) anchors.delete(id)
    for (const id of quoteRanges.keys()) if (!ids.has(id)) quoteRanges.delete(id)
    for (const id of hiddenQuotes) if (!ids.has(id)) hiddenQuotes.delete(id)
    invalidate()
  })

  window.addEventListener('scroll', invalidate, { capture: true, passive: true })
  window.addEventListener('resize', invalidate, { passive: true })
  window.addEventListener('blur', cancelStroke)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelStroke()
  })
  new ResizeObserver(invalidate).observe(document.body)
  new MutationObserver(() => {
    // A virtualized page may reuse a connected text/element node for new content.
    // Keep a quote bound to that original node until it restores the original text.
    for (const [id, range] of quoteRanges) {
      const annotation = state.annotations.find((item) => item.id === id)
      if (range.startContainer.isConnected && range.toString() !== annotation?.quote?.exact)
        hiddenQuotes.add(id)
    }
    for (const id of hiddenQuotes) {
      const annotation = state.annotations.find((item) => item.id === id)
      const element = annotation ? anchorElement(annotation) : null
      if (
        !annotation?.quote ||
        (element &&
          safeText(element).includes(
            annotation.quote.exact.replace(/\s+/g, ' ').trim().slice(0, 60)
          ))
      )
        hiddenQuotes.delete(id)
    }
    if (!host.isConnected) document.documentElement.append(host)
    invalidate()
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['id', 'class', 'style', 'hidden'],
  })

  window.__mindnotesOverlay = {
    captureSelection,
    reveal(id) {
      const annotation = state.annotations.find((item) => item.id === id)
      if (!annotation || reportedPositions.get(id) === false) return false
      const range = findQuote(annotation)
      const anchor = anchorElement(annotation)
      if ((annotation.quote && !range) || (annotation.anchor && !anchor && !range)) return false
      const rect = range?.getBoundingClientRect()
      const y = rect ? rect.top : projectedPoints(annotation)[0]?.y
      if (y !== undefined)
        window.scrollBy({ top: y - window.innerHeight * 0.35, behavior: 'smooth' })
      const target = range?.startContainer.parentElement ?? anchor
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      invalidate()
      return true
    },
  }
  bridge.ready()
  invalidate()
}

export function pageInjectionSource(): string {
  return `(${installPageOverlay.toString()})(${quoteMatchIndex.toString()},${resolvePoint.toString()})`
}
