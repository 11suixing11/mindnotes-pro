import { _electron as electron, expect } from '@playwright/test'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-real-sites-'))
const executable = process.env.MINDNOTES_EXECUTABLE
const version = JSON.parse(await readFile('package.json', 'utf8')).version
const releaseLabel = version.replace(/^6\.0\.0-beta\./, 'beta')
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !['ELECTRON_RUN_AS_NODE', 'MINDNOTES_START_WORKSPACE'].includes(key)
  )
)
const sites = [
  {
    url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Introduction',
    selector: 'main p',
  },
  { url: 'https://zh.javascript.info/intro', selector: '.content p' },
  { url: 'https://www.runoob.com/js/js-intro.html', selector: '#content p' },
]
const result = {
  version,
  at: new Date().toISOString(),
  executable: executable ?? 'source production assets',
  directory,
  scope:
    'Public HTTPS pages in the real native Electron WebContentsView; no certificate, permission or login bypass.',
  sites: [],
}
let active
async function launch() {
  const app = await electron.launch({
    ...(executable ? { executablePath: executable, args: [] } : { args: ['.'] }),
    env: {
      ...env,
      MINDNOTES_USER_DATA_DIR: directory,
      MINDNOTES_USE_DIST: '1',
      MINDNOTES_START_WORKSPACE: '1',
    },
  })
  active = app
  const shell = await app.firstWindow()
  await expect(shell.getByRole('region', { name: '统一笔记库' })).toBeVisible()
  return { app, shell }
}
async function open(instance, url, first) {
  const textbox = instance.shell.getByRole('textbox', {
    name: first ? '要批注的网页地址' : '网页地址',
    exact: true,
  })
  await textbox.fill(url)
  await instance.shell
    .getByRole('button', { name: first ? '打开网页' : '打开地址', exact: true })
    .click()
  await expect
    .poll(
      () =>
        instance.app
          .windows()
          .find((page) => page.url().startsWith('https:'))
          ?.url(),
      { timeout: 35_000 }
    )
    .toBe(url)
  const webpage = instance.app.windows().find((page) => page.url().startsWith('https:'))
  await expect(webpage.locator('#mindnotes-page-layer')).toBeAttached({ timeout: 35_000 })
  return webpage
}
const geometry = (webpage) =>
  webpage.locator('#mindnotes-page-layer').locator('polyline').first().getAttribute('points')
try {
  await mkdir('tmp/qa', { recursive: true })
  let instance = await launch()
  for (let index = 0; index < sites.length; index++) {
    const site = sites[index]
    const webpage = await open(instance, site.url, index === 0)
    const candidates = webpage.locator(site.selector)
    await expect(candidates.first()).toBeAttached()
    let target
    for (const candidate of await candidates.all()) {
      const text = (await candidate.textContent())?.trim().replace(/\s+/g, ' ') ?? ''
      if (
        text.length >= 65 &&
        (await candidate.isVisible()) &&
        (await candidate.locator('button').count()) === 0
      ) {
        target = candidate
        break
      }
    }
    if (!target) throw new Error(`No visible article paragraph on ${site.url}`)
    await target.scrollIntoViewIfNeeded()
    await target.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    const quote = (await target.textContent()).trim().replace(/\s+/g, ' ')
    const bounds = await target.boundingBox()
    await instance.shell.getByRole('button', { name: '画笔', exact: true }).click()
    await webpage.mouse.move(bounds.x + 20, bounds.y + 16)
    await webpage.mouse.down()
    await webpage.mouse.move(bounds.x + 155, bounds.y + 22, { steps: 10 })
    await webpage.mouse.up()
    const layer = webpage.locator('#mindnotes-page-layer')
    await expect(layer.locator('polyline')).toHaveCount(1)
    const originalY = Number((await geometry(webpage)).split(' ')[0].split(',')[1])
    const before = await webpage.evaluate(() => scrollY)
    await webpage.evaluate(() => scrollBy(0, 110))
    const after = await webpage.evaluate(() => scrollY)
    expect(after - before).toBeGreaterThan(0)
    await expect
      .poll(async () => Number((await geometry(webpage)).split(' ')[0].split(',')[1]))
      .toBeCloseTo(originalY - (after - before), 0)
    await instance.shell.getByRole('button', { name: '浏览', exact: true }).click()
    await target.evaluate((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
    })
    await instance.shell.getByRole('button', { name: '摘录', exact: true }).click()
    const comment = `真实网站验收 ${index + 1}：原文、评论和笔迹需要在重新打开后继续使用。`
    await instance.shell.getByRole('textbox', { name: '第 2 条批注的笔记' }).fill(comment)
    await expect(instance.shell.locator('blockquote')).toContainText(quote.slice(0, 40))
    await expect(instance.shell.getByRole('status', { name: '笔记保存状态' })).toContainText(
      '已保存在本地'
    )
    await instance.shell.getByRole('button', { name: '刷新网页', exact: true }).click()
    await expect(layer).toBeAttached({ timeout: 35_000 })
    await expect(layer.locator('polyline')).toHaveCount(1)
    await expect(instance.shell.getByRole('textbox', { name: '第 2 条批注的笔记' })).toHaveValue(
      comment
    )
    await expect
      .poll(() =>
        instance.shell.evaluate(() =>
          window.mindnotes.getState().then((state) => state.unresolvedAnnotationIds)
        )
      )
      .toEqual([])
    await instance.shell.getByRole('button', { name: '定位第 2 条批注', exact: true }).click()
    await expect(layer.locator('rect').first()).toBeVisible()
    expect(
      await webpage.evaluate(() => 'mindnotes' in window || typeof window.require !== 'undefined')
    ).toBe(false)
    const saved = JSON.parse(await readFile(path.join(directory, 'page-notes.json'), 'utf8'))
    const page = saved.pages.find((page) => page.url === site.url)
    expect(page.annotations).toHaveLength(2)
    expect(page.annotations[1].comment).toBe(comment)
    const evidence = {
      url: site.url,
      title: await webpage.title(),
      quote,
      comment,
      annotations: page.annotations,
      scrollDelta: after - before,
      checks: [
        'native-HTTPS-load',
        'injected-ink',
        'scroll-alignment',
        'excerpt-and-comment',
        'local-persistence',
        'reload-anchors',
        'position-reveal',
        'remote-page-isolation',
      ],
    }
    result.sites.push(evidence)
    await webpage.screenshot({ path: `tmp/qa/real-site-${index + 1}.png` })
    console.log(
      JSON.stringify({
        stage: 'article-passed',
        url: site.url,
        title: evidence.title,
        checks: evidence.checks,
      })
    )
  }
  const exportPath = path.join(directory, 'real-articles.md')
  await instance.app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath })
  }, exportPath)
  await instance.shell.evaluate(() => window.mindnotes.exportNotes('markdown', 'all'))
  const markdown = await readFile(exportPath, 'utf8')
  for (const site of result.sites) {
    expect(markdown).toContain(site.comment)
    expect(markdown).toContain(site.url)
  }
  await instance.app.close()
  active = null
  instance = await launch()
  for (let index = 0; index < result.sites.length; index++) {
    const site = result.sites[index]
    const webpage = await open(instance, site.url, index === 0)
    await expect(instance.shell.getByRole('textbox', { name: '第 2 条批注的笔记' })).toHaveValue(
      site.comment
    )
    await expect(webpage.locator('#mindnotes-page-layer').locator('polyline')).toHaveCount(1)
    await expect
      .poll(() =>
        instance.shell.evaluate(() =>
          window.mindnotes.getState().then((state) => state.unresolvedAnnotationIds)
        )
      )
      .toEqual([])
    const saved = JSON.parse(await readFile(path.join(directory, 'page-notes.json'), 'utf8'))
    expect(saved.pages.find((page) => page.url === site.url).annotations).toEqual(site.annotations)
    site.checks.push('exact-restart-recovery')
  }
  await instance.app.close()
  active = null
  result.markdownExport = {
    passed: true,
    bytes: Buffer.byteLength(markdown),
    allSourceLinksAndComments: true,
  }
  result.status = 'passed'
} catch (error) {
  result.status = 'failed'
  result.error = String(error.stack ?? error)
  console.error(result.error)
  process.exitCode = 1
  if (active) {
    const webpage = active.windows().find((page) => page.url().startsWith('https:'))
    if (webpage) {
      result.failurePage = {
        url: webpage.url(),
        title: await webpage.title(),
        body: (await webpage.locator('body').innerText()).slice(0, 2500),
      }
      await webpage.screenshot({ path: 'tmp/qa/real-site-failure.png' }).catch(() => {})
    }
  }
} finally {
  if (active) await active.close().catch(() => {})
  await writeFile(
    `tmp/qa/real-sites-${releaseLabel}-${executable ? 'release' : 'source'}.json`,
    JSON.stringify(result, null, 2)
  )
}
