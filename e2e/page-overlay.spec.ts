import { expect, test } from '@playwright/test'
import type { CDPSession, Page } from '@playwright/test'
import type { PageEdit, PageOverlayState } from '../src/notes/desktop'
import { pageInjectionSource } from '../src/notes/pageOverlay'

type PointerRecord = {
  type: string
  pointerId: number
  isPrimary: boolean
  trusted: boolean
}

declare global {
  interface Window {
    __pointerReview: {
      state: PageOverlayState
      edits: PageEdit[]
      events: PointerRecord[]
      listener: ((state: PageOverlayState) => void) | null
      clicks: number
    }
  }
}

test.use({ hasTouch: true })

const layer = (page: Page) => page.locator('#mindnotes-page-layer')
const strokes = (page: Page) => layer(page).locator('polyline')
const touch = (
  cdp: CDPSession,
  type: 'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel',
  points: [number, number, number][]
) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(([id, x, y]) => ({ id, x, y })),
  })

test.beforeEach(async ({ page }) => {
  await page.route('**/pointer-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html lang="zh-CN"><head><title>网页指针回归</title><style>html,body{margin:0}article{height:1200px;padding:16px;font:18px system-ui}</style></head><body><article id="target">页面批注随正文滚动并保留独立笔迹。<button id="underlying">下面网页的按钮</button></article></body></html>',
    })
  )
  await page.goto('/pointer-fixture')
  await page.evaluate(() => {
    const review = {
      state: {
        annotations: [],
        tool: 'pen',
        color: '#e0a11b',
        activeAnnotationId: null,
      } as PageOverlayState,
      edits: [] as PageEdit[],
      events: [] as PointerRecord[],
      listener: null as ((state: PageOverlayState) => void) | null,
      clicks: 0,
    }
    window.__pointerReview = review
    document.getElementById('underlying')!.addEventListener('click', () => {
      review.clicks += 1
    })
    window.__mindnotesPage = {
      ready() {},
      reportPositions() {},
      subscribe(listener) {
        review.listener = listener
        listener(structuredClone(review.state))
        return () => {}
      },
      edit(edit) {
        review.edits.push(structuredClone(edit))
        const next = { ...review.state }
        if (edit.type === 'add')
          next.annotations = [...next.annotations, structuredClone(edit.annotation)]
        if (edit.type === 'delete')
          next.annotations = next.annotations.filter((item) => item.id !== edit.id)
        if (edit.type === 'browse') next.tool = 'browse'
        review.state = next
        review.listener!(structuredClone(next))
      },
    }
  })
  await page.evaluate(pageInjectionSource())
  await page.evaluate(() => {
    const svg = document.getElementById('mindnotes-page-layer')!.shadowRoot!.querySelector('svg')!
    for (const type of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'gotpointercapture',
      'lostpointercapture',
    ]) {
      svg.addEventListener(
        type,
        (raw) => {
          const event = raw as PointerEvent
          window.__pointerReview.events.push({
            type,
            pointerId: event.pointerId,
            isPrimary: event.isPrimary,
            trusted: event.isTrusted,
          })
        },
        true
      )
    }
  })
  await expect(layer(page).locator('svg')).toBeVisible()
  // Raw CDP input bypasses Playwright's painted-target readiness checks. A new
  // unpainted Chromium surface can reset pointer capture on its first frame.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
})

async function start(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await touch(cdp, 'touchStart', [[1, 80, 160]])
  await touch(cdp, 'touchMove', [[1, 160, 175]])
  return cdp
}

async function capture(page: Page) {
  return page.evaluate(() => {
    const svg = document.getElementById('mindnotes-page-layer')!.shadowRoot!.querySelector('svg')!
    const id = window.__pointerReview.events.find(
      (event) => event.type === 'pointerdown'
    )!.pointerId
    return svg.hasPointerCapture(id)
  })
}

async function finish(cdp: CDPSession) {
  await touch(cdp, 'touchMove', [[1, 280, 190]])
  await touch(cdp, 'touchEnd', [])
}

test('browser multitouch keeps the first gesture while the second touch ends', async ({ page }) => {
  const cdp = await start(page)
  await touch(cdp, 'touchStart', [
    [1, 160, 175],
    [2, 500, 320],
  ])
  await touch(cdp, 'touchMove', [
    [1, 220, 180],
    [2, 500, 320],
  ])
  // CDP touchEnd identifies the points ending, rather than the remaining set.
  await touch(cdp, 'touchEnd', [[2, 500, 320]])
  await finish(cdp)
  await expect(strokes(page)).toHaveCount(1)
  const result = await page.evaluate(() => window.__pointerReview)
  expect(result.edits.filter((edit) => edit.type === 'add')).toHaveLength(1)
  expect(result.state.annotations[0].points).toEqual([
    { x: 80, y: 160 },
    { x: 160, y: 175 },
    { x: 220, y: 180 },
    { x: 280, y: 190 },
  ])
  expect(result.events.filter((event) => event.type === 'pointerdown')).toHaveLength(2)
  expect(result.events.filter((event) => event.type === 'pointerup')).toHaveLength(2)
  expect(result.events.every((event) => event.trusted)).toBe(true)
})

test('unrelated synthetic cancel and lost-capture do not discard the browser-owned stroke', async ({
  page,
}) => {
  const cdp = await start(page)
  await layer(page)
    .locator('svg')
    .dispatchEvent('pointercancel', { pointerId: 99, pointerType: 'touch' })
  await layer(page)
    .locator('svg')
    .dispatchEvent('lostpointercapture', { pointerId: 99, pointerType: 'touch' })
  expect(await capture(page)).toBe(true)
  await finish(cdp)
  await expect(strokes(page)).toHaveCount(1)
  expect(await page.evaluate(() => window.__pointerReview.state.annotations[0].points)).toEqual([
    { x: 80, y: 160 },
    { x: 160, y: 175 },
    { x: 280, y: 190 },
  ])
})

test('browser cancellation removes the draft without saving and accepts the next gesture', async ({
  page,
}) => {
  const cdp = await start(page)
  await touch(cdp, 'touchCancel', [])
  await expect(strokes(page)).toHaveCount(0)
  expect(await capture(page)).toBe(false)
  expect(await page.evaluate(() => window.__pointerReview.edits)).toEqual([])
  await touch(cdp, 'touchStart', [[1, 300, 260]])
  await touch(cdp, 'touchMove', [[1, 400, 270]])
  await touch(cdp, 'touchEnd', [])
  await expect(strokes(page)).toHaveCount(1)
  expect(await page.evaluate(() => window.__pointerReview.state.annotations[0].points[0])).toEqual({
    x: 300,
    y: 260,
  })
})

test('real browser capture loss removes the unfinished draft and does not commit on up', async ({
  page,
}) => {
  const cdp = await start(page)
  await page.evaluate(() => {
    const svg = document.getElementById('mindnotes-page-layer')!.shadowRoot!.querySelector('svg')!
    const id = window.__pointerReview.events.find(
      (event) => event.type === 'pointerdown'
    )!.pointerId
    svg.releasePointerCapture(id)
  })
  await touch(cdp, 'touchMove', [[1, 170, 180]])
  await expect(strokes(page)).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      window.__pointerReview.events.some(
        (event) => event.type === 'lostpointercapture' && event.trusted
      )
    )
  ).toBe(true)
  await touch(cdp, 'touchEnd', [])
  expect(await page.evaluate(() => window.__pointerReview.edits)).toEqual([])
  await touch(cdp, 'touchStart', [[1, 300, 260]])
  await touch(cdp, 'touchMove', [[1, 400, 270]])
  await touch(cdp, 'touchEnd', [])
  await expect(strokes(page)).toHaveCount(1)
})

test('delayed synthetic lost-capture leaves a gesture that still owns browser capture', async ({
  page,
}) => {
  const cdp = await start(page)
  const id = await page.evaluate(
    () => window.__pointerReview.events.find((event) => event.type === 'pointerdown')!.pointerId
  )
  await layer(page)
    .locator('svg')
    .dispatchEvent('lostpointercapture', { pointerId: id, pointerType: 'touch' })
  expect(await capture(page)).toBe(true)
  await finish(cdp)
  await expect(strokes(page)).toHaveCount(1)
})

test('switching to browse releases capture and restores the underlying page interaction', async ({
  page,
}) => {
  const cdp = await start(page)
  expect(await capture(page)).toBe(true)
  await page.evaluate(() => {
    window.__pointerReview.state.tool = 'browse'
    window.__pointerReview.listener!(structuredClone(window.__pointerReview.state))
  })
  expect(await capture(page)).toBe(false)
  await expect(strokes(page)).toHaveCount(0)
  await touch(cdp, 'touchEnd', [])
  await page.getByRole('button', { name: '下面网页的按钮' }).click()
  expect(await page.evaluate(() => window.__pointerReview.clicks)).toBe(1)
  expect(await page.evaluate(() => window.__pointerReview.edits)).toEqual([])
})

test('Escape releases capture and the unfinished draft', async ({ page }) => {
  const cdp = await start(page)
  await page.keyboard.press('Escape')
  expect(await capture(page)).toBe(false)
  await expect(strokes(page)).toHaveCount(0)
  await touch(cdp, 'touchEnd', [])
  expect(await page.evaluate(() => window.__pointerReview.state.tool)).toBe('browse')
  expect(await page.evaluate(() => window.__pointerReview.edits)).toEqual([{ type: 'browse' }])
})

test('a synthetic window blur discards the draft and releases actual capture', async ({ page }) => {
  const cdp = await start(page)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  expect(await capture(page)).toBe(false)
  await expect(strokes(page)).toHaveCount(0)
  await touch(cdp, 'touchEnd', [])
  expect(await page.evaluate(() => window.__pointerReview.edits)).toEqual([])
})

test('a second nonprimary browser touch does not create an extra point note', async ({ page }) => {
  await page.evaluate(() => {
    window.__pointerReview.state.tool = 'note'
    window.__pointerReview.listener!(structuredClone(window.__pointerReview.state))
  })
  const cdp = await page.context().newCDPSession(page)
  await touch(cdp, 'touchStart', [[1, 80, 160]])
  await touch(cdp, 'touchStart', [
    [1, 80, 160],
    [2, 500, 320],
  ])
  await touch(cdp, 'touchEnd', [])
  expect(
    await page.evaluate(() => window.__pointerReview.state.annotations.map((item) => item.kind))
  ).toEqual(['note'])
})

test('a released browser endpoint is kept after its last movement sample', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 80,
    y: 160,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  })
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 120,
    y: 165,
    buttons: 1,
  })
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 200,
    y: 175,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  })
  await expect(strokes(page)).toHaveCount(1)
  expect(await page.evaluate(() => window.__pointerReview.state.annotations[0].points)).toEqual([
    { x: 80, y: 160 },
    { x: 120, y: 165 },
    { x: 200, y: 175 },
  ])
  await cdp.detach()
})

test('a rapid released line has its full geometry without a movement event', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 80,
    y: 160,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  })
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 200,
    y: 175,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  })
  await expect(strokes(page)).toHaveCount(1)
  expect(await page.evaluate(() => window.__pointerReview.state.annotations[0].points)).toEqual([
    { x: 80, y: 160 },
    { x: 200, y: 175 },
  ])
  await cdp.detach()
})
