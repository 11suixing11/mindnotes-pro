# 本地性能与断网基线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 v6 桌面应用交付可重复的存储、桌面性能与断网回归工具，输出带环境和负载身份的报告。

**Architecture:** 工具通过现有编译领域模块、仓库、受限 preload 与真实 UI 测量，不修改生产业务行为。报告统计、生成数据和进程隔离作为共享工具；SQLite/JSON 工作负载和可见 Electron 工作负载分别运行、分别比较。

**Tech Stack:** 当前 Node、Electron、TypeScript、SQLite worker、Node test runner、Playwright；不新增产品运行时依赖。

**Spec:** `docs/superpowers/specs/2026-11-13-local-performance-offline-baseline-design.md`

## Global Constraints

- 本设计只覆盖第一阶段：建立可重复的性能测量、离线功能回归和结果比较。
- 第一阶段不实现资料阅读器，不迁移存储，不增加 HTTP 服务，不修改绘制行为，不调整现有耐久保存策略。
- 新增工具置于 `benchmark/local/`，测试与工具共置，生成报告、临时库与日志置于 `tmp/local-baseline-20261113/` 或显式指定的工作区内任务目录。
- 报告格式为 `mindnotes-pro.local-baseline`，`schemaVersion: 1`。
- 默认 1 次预热、5 次测量；默认生成 1,000 条笔记、1,000 笔/160,000 点，笔记数允许选择 100、1,000、10,000。
- `fixture` 包含版本 `local-fixture-v1`、固定 seed `20261113` 以及生成数据的 SHA256；只比较这些字段一致的负载。
- 比较工具默认关注耗时和内存上升，阈值为相对基线增加 20%；比较采用 p95。
- 分位数使用 nearest-rank：排序后取 `ceil(p*n)-1`。
- 桌面 runner 必须显式传入 `--allow-visible`，才允许显示悬浮窗口并执行 Playwright 指针操作。
- SQL WAL/FULL、原子文件保存、失败编辑保留、导入回执等待耐久写入、`.previous` 原件保护、关闭/导航前 flush 和 v5 白板协议保持不变。
- 运行器只访问自己的生成目录；不得读取软件真实 userData。项目进程设置 `TEMP`、`TMP`、`TMPDIR`。
- 失败或不可用结果可以输出诊断报告，命令必须以非零状态退出。
- 当前仓库有用户未提交的 v6 改动，仅提交本任务新增文件与本任务增量；不得批量 stage/reset/clean，不复制仓库或 node_modules。

## 执行环境与工作区决定

继续使用用户指定的唯一主源码工作区；已有 `main` 工作树包含当前 v6 未提交源码，额外 worktree 基于旧 HEAD 会缺失这些模块。用户已批准在当前工作区继续开发，因此不创建第二份源码。进度账本、brief、review diff 与临时脚本全部放入 `tmp/local-baseline-20261113/`。

当前 Node 为 `v26.13.1`，TypeScript 检查可运行；Rolldown `1.2.18` 只安装了 Windows binding，Vitest 因缺少 `@rolldown/binding-linux-x64-gnu@1.2.18` 无法启动。Linux 开发绑定须按 lockfile 与当前包版本补齐后重验，不更改产品依赖版本。Electron 只有 Windows `electron.exe`，本机先执行 Node 工具和不可用分支测试；Windows 可见工具按目标机命令验收。实际发行包保持原位，不重新打包。

## Task 1: 报告、兼容比较与隔离运行基础

**Files:**
- Create: `benchmark/local/report.mjs`, `benchmark/local/report.test.mjs`
- Create: `benchmark/local/runtime.mjs`, `benchmark/local/runtime.test.mjs`
- Create: `benchmark/local/fixtures.mjs`, `benchmark/local/fixtures.test.mjs`

**Interfaces:**
- `summarize(samples: number[], unit: 'ms'|'bytes'|'percent', meaning: string): {unit,meaning,samples,count,min,p50,p95,max}`。
- `createReport({runner,status,identity,environment,parameters,fixture,metrics,checks,limitations})` 增补 format/schemaVersion/generatedAt 并验证完整结构；失败报告允许 metrics 为空，成功报告须有至少一项有限的非负样本与非空全部通过 checks。
- `compareReports(baseline,current,threshold=0.2): {compatible,passed,reason,comparisons}`；报告缺失/错误、参数/环境/fixture 不兼容或任一基线指标/检查缺失，返回 incompatible；不抛出吞掉失败的成功对象。
- `collectIdentity(projectRoot, measuredFiles): Promise<{applicationVersion,gitHead,workingTree,files:Record<string,string>}>`；测量文件包括所有传递依赖及 package-lock.json，路径相对仓库，不记录笔记；实际包同时记录 exe 与 app.asar。
- `collectEnvironment(dataDirectory): {platform,arch,osRelease,node,cpuModel,cpuCount,totalMemoryBytes,fileSystemType}`；使用 Node statfs 查询数据所在文件系统；查询失败明确不可用，不编造卷身份。
- `withWorkspace(projectRoot, callback): Promise<T>` 在 `tmp/local-baseline-20261113/runtime/` 下新建目录，将目录传给 callback，finally 仅清理自己目录；不能静默忽略清理失败。
- `parseOptions(argv, mode)`：storage 接受 `--iterations`（1..30）、`--warmups`（0..10）、`--notes`（100/1000/10000）、`--output`；desktop 另接受 `--allow-visible`、`--executable`、`--idle-seconds`（0..900）、`--frame-seconds`（1..60）；未知/重复参数、缺失值、不合法数字拒绝。
- `makeStrokes(count=1000, pointsPerStroke=160)`、`makeScreenEntries(count)`、`makePageNotebooks(count=100)`；屏幕 PNG 为确定性有效小图片，page URL 用 `https://baseline.invalid/article/<id>`，批注字段使用实际 v1 合同，页数不超过 2,000。
- `fixtureIdentity(data)` 使用 `local-fixture-v1`、seed 20261113 与实际数据 SHA256。

- [ ] **Step 1: 先写行为测试，运行确认缺少实现导致失败。**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize, compareReports } from './report.mjs'

test('nearest-rank metrics retain the slow tail', () => {
  assert.deepEqual(summarize([9, 1, 4, 2, 100], 'ms', 'save receipt'), {
    unit: 'ms', meaning: 'save receipt', samples: [9, 1, 4, 2, 100],
    count: 5, min: 1, p50: 4, p95: 100, max: 100,
  })
})
test('empty and invalid samples cannot become a passing baseline', () => {
  for (const input of [[], [-1], [NaN], [Infinity]])
    assert.throws(() => summarize(input, 'ms', 'save receipt'))
})
```

另加手算比较用例：100→119 不回归、100→121 回归、0→0 不回归、0→1 回归；缺少基线指标/检查、单位变更、fixture seed/hash 变更、环境变更、failed report 均不兼容。runtime 使用真实临时文件验证 callback 抛错时目录仍清理、相邻 sentinel 文件保留；fixtures 用当前编译验证器解码 PNG、校验笔迹/页面合同。

Run: `node --test benchmark/local/report.test.mjs benchmark/local/runtime.test.mjs benchmark/local/fixtures.test.mjs`

- [ ] **Step 2: 实现最小统计、兼容比较、目录管理和有效数据生成。**

```js
const sorted = [...samples].sort((a, b) => a - b)
const nearestRank = (fraction) => sorted[Math.ceil(fraction * sorted.length) - 1]
const ratio = baselineValue === 0
  ? (currentValue === 0 ? 0 : Infinity)
  : (currentValue - baselineValue) / baselineValue
```

成功报告的 metric 摘要须与 samples 重新计算结果一致，不能只相信输入 p95；comparisons 遍历所有基线键，当前新增键允许存在。checks 按名称匹配并要求基线所有检查仍通过。环境精确匹配字段，identity 文件 hashes 是报告来源信息，允许跨代码版本比较。

- [ ] **Step 3: 重跑测试及 Node syntax 检查，做自身审阅。**
- [ ] **Step 4: 仅提交 Task 1 新文件，保留完整红/绿测试输出到任务报告。**

## Task 2: 真实 SQLite/JSON 存储基线与 CLI

**Files:**
- Create: `benchmark/local/run-storage.mjs`, `benchmark/local/storage.test.mjs`
- Create: `benchmark/local/compare.mjs`, `benchmark/local/compare.test.mjs`

**Interfaces:**
- Consumes: Task 1 的报告、runtime、fixtures 接口，当前 `dist-electron/electron/{screenNotebookRepository,notebookRepository}.mjs`、`dist-electron/src/notes/{model,screenInk}.js`。
- `runStorageBenchmark(options): Promise<Report>`：export，直接 CLI 执行时写 stdout 和可选 output；import 时不自动运行。
- `compare.mjs <baseline.json> <current.json> [threshold]`：兼容且未回归退出 0；回归退出 1；参数或报告不兼容退出 2。

- [ ] **Step 1: 先写真实存储及 CLI 行为测试，运行确认失败。**

```js
test('the runner checks persistence and leaves no test database behind', async () => {
  const report = await runStorageBenchmark({ iterations: 1, warmups: 0, notes: 100 })
  assert.equal(report.status, 'passed')
  assert.equal(report.metrics.draftSaveMs.count, 1)
  assert.equal(report.checks.find(c => c.name === 'draft-restart').status, 'passed')
  assert.equal(report.checks.find(c => c.name === 'page-json-restart').status, 'passed')
})
```

用 CLI 子进程检查无效 notes/路径/缺少编译模块时的非零退出，以及 compare 的三类退出码和错误报告。运行器报告不能泄漏笔记内容，tests 通过真实校验器与仓库返回值核对 fixtures。禁止断言耗时低于硬编码值。

Run: `node --test benchmark/local/storage.test.mjs benchmark/local/compare.test.mjs`

- [ ] **Step 2: 实现首次初始化与稳态的独立测量。**

```js
const measure = async (samples, operation) => {
  const start = performance.now()
  const value = await operation()
  samples.push(performance.now() - start)
  return value
}
```

每次 repository 构建后 `await load()`，独立记录 `repositoryReadyMs`。稳态记录 `eraseMs`（确定性几何）、`draftSaveMs`、`searchMs`、`detailReadMs`、`exportMs`、`streamImportMs`、`pageJsonSaveMs`、`pageJsonReloadMs`；fixtures 导入准备不纳入检索耗时。导入重复使用新的空目标 repository；所有 worker finally close；restart 对比内容及数量。page JSON save 前使用实际 createBackup/decodeBackup 合同，重开 repository 核对 annotations。

记录 `rssBytes`、`heapUsedBytes`、`externalBytes` 并说明只覆盖 Node runner，worker 数据未计为独立进程。失败时写 failed report 与错误 checks，命令非零退出。报告来源包含被加载编译模块的传递 SHA256，编译模块缺失则明确要求 build:electron，不隐式构建或安装。

- [ ] **Step 3: 重跑测试，并生成 1 预热/5 测量的 Linux 首份存储报告。**

Run: `node benchmark/local/run-storage.mjs --output tmp/local-baseline-20261113/storage-linux.json`

- [ ] **Step 4: 用同一报告 self-compare 验证兼容机制，再审阅与提交本任务文件。**

Run: `node benchmark/local/compare.mjs tmp/local-baseline-20261113/storage-linux.json tmp/local-baseline-20261113/storage-linux.json`

## Task 3: Electron 桌面测量与断网业务回归

**Files:**
- Create: `benchmark/local/electron-harness.mjs`, `benchmark/local/electron-harness.d.mts`, `benchmark/local/desktop.test.mjs`
- Create: `benchmark/local/run-desktop.mjs`, `benchmark/local/run-offline.mjs`
- Create: `e2e/desktop/offline.spec.ts`, `playwright.offline.config.ts`

**Interfaces:**
- Consumes: Task 1 报告、workspace、options、fixture 接口；Task 2 的现有仓库 fixtures 准备方式。
- `launchIsolated({directory,executable,offline,allowVisible}): Promise<{app,toolbar,overlay,close}>`；关闭必须结束应用及拒绝代理，出现错误也清理。
- `startDenyProxy(): Promise<{port,requests,close}>` 仅监听 loopback 的随机端口，HTTP 和 CONNECT 都拒绝，从不连接目标站。
- `runDesktopBenchmark(options): Promise<Report>`；无可见标志或无可执行 Electron 时，不启动应用，输出 unavailable report 并非零退出。
- `electron-harness.d.mts` 声明 JS 导出所需类型，供 e2e strict TypeScript 引用；不能通过 any 掩盖桥调用错误。
- `run-offline.mjs --allow-visible [--executable <path>]` 预检运行环境后启动独立 Playwright 配置；缺环境退出 2，失败退出 1，真实检查通过退出 0。

- [ ] **Step 1: 先写真实 loopback 拒绝代理与 CLI guard 行为测试。**

```js
import http from 'node:http'
test('offline proxy rejects HTTP and CONNECT without forwarding', async () => {
  let hits = 0
  const canary = http.createServer((_request, response) => { hits++; response.end('canary') })
  await new Promise(resolve => canary.listen(0, '127.0.0.1', resolve))
  const target = `127.0.0.1:${canary.address().port}`
  assert.equal(await (await fetch(`http://${target}/`)).text(), 'canary')
  hits = 0
  const proxy = await startDenyProxy()
  const rejected = method => new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port: proxy.port, method,
      path: method === 'CONNECT' ? target : `http://${target}/` })
    request.on('response', response => { response.resume(); resolve(response.statusCode) })
    request.on('connect', (response, socket) => { socket.destroy(); resolve(response.statusCode) })
    request.on('error', reject)
    request.end()
  })
  try {
    assert.equal(await rejected('GET'), 503)
    assert.equal(await rejected('CONNECT'), 503)
    assert.equal(hits, 0)
    assert.equal(proxy.requests.length, 2)
  } finally {
    await proxy.close()
    await new Promise(resolve => canary.close(resolve))
  }
})
```

补充 CLI 无 --allow-visible、缺 executable、未知参数时非零退出且未创建库/进程；用真实文件 sentinel 验证 executable 存在但不可运行也不误报成功。该测试不启动可见窗口。

Run: `node --test benchmark/local/desktop.test.mjs`

- [ ] **Step 2: 实现启动、可见标志与环境预检，复用现有受限桥。**

```js
const args = executable ? [] : ['.']
if (offline) args.push(
  `--proxy-server=http://127.0.0.1:${proxy.port}`,
  '--proxy-bypass-list=<-loopback>'
)
const env = { ...filteredEnvironment,
  MINDNOTES_USE_DIST: '1', MINDNOTES_USER_DATA_DIR: directory,
  TEMP: directory, TMP: directory, TMPDIR: directory }
```

动态加载 Playwright，避免 guard 分支依赖可运行 Electron。filteredEnvironment 排除 ELECTRON_RUN_AS_NODE 与 MINDNOTES_START_WORKSPACE。按 window URL 的 surface 参数选 toolbar/screen，等待“展开悬浮批注”和“悬浮批注工具条”真实按钮，不依赖窗口排序；失败 finally app.close。

测量 `launchToBubbleReadyMs`、`expandToolbarMs`、`openLibraryMs`、`pointerCommandMs`、`gestureToSavedMs`，通过现有工具条与 screen bridge 核对预期新增笔迹 ID/摘要和保存状态，不能只读旧 saved。帧间隔/长任务 observer 结束时解绑；长笔画 8,000 点使用独立草稿，不叠加到已满 160,000 点的场景。启动/单次展开跨新进程重复，报告明确 OS 缓存未清空；进程内存/CPU 与各个阶段分类记录，不拼成伪精确全局 RSS。

- [ ] **Step 3: 实现断网回归与独立配置。**

```ts
export default defineConfig({
  testDir: './e2e/desktop', testMatch: 'offline.spec.ts',
  outputDir: 'tmp/local-baseline-20261113/offline-results',
  workers: 1, timeout: 60_000, reporter: 'list',
})
```

离线配置启动前由 wrapper 显式提供可见标志。新 spec 使用真实生成库、page-notes.json 和草稿，首次启动即通过 deny proxy 无网络可用；先运行 Node canary 直连控制，再通过应用请求它，确认代理拒绝记录存在且 canary 没有应用直连。覆盖默认及后续创建的 persist:mindnotes-pages session；独立的 session.webRequest 拦截不要吞掉代理控制实验的请求。检查本地笔记库两类数据的检索、编辑、桥 flush、screen 绘制/撤销/重做/持久化/重启；对话框按既有 app.evaluate 方法返回本任务路径，备份导出/导入核对真实数据。导航 `https://baseline.invalid/blocked` 显示错误后返回本地库，数据不丢失。

截图场景仅目标 Windows 可见环境执行现有真实 capture fixture；Linux 用生成 PNG 做存储验证而不报告 capture 通过。整个测试有真实断网功能 assertions，不能只验证页面打开，也不能用 skip 让 wrapper 在不可用环境返回成功。

- [ ] **Step 4: 本机执行 guard/proxy 测试及 typecheck；目标机命令写入说明。**

Run: `npm run typecheck`

目标机：`node benchmark/local/run-desktop.mjs --allow-visible --output tmp/local-baseline-20261113/desktop-windows.json`

目标机：`node benchmark/local/run-offline.mjs --allow-visible`

- [ ] **Step 5: 仅提交新 runner、harness、类型与离线 spec/config。**

## Task 4: 命令、文档与整体验证

**Files:**
- Modify: `package.json`（只增加脚本，不改变用户已有版本或依赖）
- Create: `benchmark/local/README_CN.md`
- Modify: `benchmark/README.md`（连接新 v6 工具，保留旧白板测量解释）

**Interfaces:**
- `npm run benchmark:local:storage` → `npm run build:electron && node benchmark/local/run-storage.mjs`
- `npm run benchmark:local:desktop` → `node benchmark/local/run-desktop.mjs`
- `npm run benchmark:local:compare` → `node benchmark/local/compare.mjs`
- `npm run test:local-baseline` → `node --test benchmark/local/*.test.mjs`
- `npm run test:offline` → `node benchmark/local/run-offline.mjs`

- [ ] **Step 1: 接入脚本与准确的运行说明。**

```json
{
  "benchmark:local:storage": "npm run build:electron && node benchmark/local/run-storage.mjs",
  "benchmark:local:desktop": "node benchmark/local/run-desktop.mjs",
  "benchmark:local:compare": "node benchmark/local/compare.mjs",
  "test:local-baseline": "node --test benchmark/local/*.test.mjs",
  "test:offline": "node benchmark/local/run-offline.mjs"
}
```

README 写明 TEMP/TMP/TMPDIR 设置、当前来源编译/实际包身份、同机同负载比较、p95 小样本限制、绝对耗时不设通过阈值、fixture 与真实截图/物理输入的区别。Windows 例子用 PowerShell 指向工作区临时目录，显式 `--allow-visible`，实际包可用 `--executable 'release/win-unpacked/MindNotes Pro.exe'`。首份 Linux 与既有历史 Windows 数字不得计算优化比例。

- [ ] **Step 2: 执行新增测试、typecheck、lint、存储检查和 npm run check，保留日志。**

Node 测试不依赖 Vite。先补齐已确认缺少的 Linux native 开发包再运行 Vitest；如环境仍不可用，按实际退出阶段记录，不报告 0 个用例为全部通过。

- [ ] **Step 3: 完成首份当前存储报告、self-compare 与不可用 desktop/offline guard 结果；有真实 Windows 环境才跑可见命令。**
- [ ] **Step 4: 单独评审本阶段增量，确认用户既有改动未混入本任务提交。**
- [ ] **Step 5: 提交本阶段新增/增量，最终说明已交付工具、可运行结果与目标机仍待测项。**

## 计划自检

Task 1 的 report/runtime/fixtures 接口是 Task 2、3 的共同输入；Task 2 不依赖 Electron UI；Task 3 不改变存储合同；Task 4 只集成已经存在的工具。报告兼容性要求覆盖缺指标/缺检查、单位、fixture 和环境；cleanup 覆盖成功、失败与邻近文件保护；Windows 原生能力不由 Linux 模拟结果替代。新资料阅读与服务抽离属于后续阶段，不在本计划中隐式开始。
