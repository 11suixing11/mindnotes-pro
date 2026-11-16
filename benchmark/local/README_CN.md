# v6 本地性能与断网基线

这组工具测量当前 v6 桌面应用的真实 SQLite/网页 JSON 存储、Electron 启动与界面操作，并回归验证现有功能在外部 HTTP(S) 不可用时的行为。旧白板工具继续保留，运行方法见 [原性能基准说明](../README.md)；它的无头几何与浏览器导出指标不能与这里的存储、桌面报告直接比较。

这是开发和验收工具，使用项目已有 Node、TypeScript、Playwright 等开发依赖。最终安装的桌面应用仍独立运行，不要求普通用户安装 Node、数据库或启动服务器。当前阶段建立基线，不改变生产存储协议、WAL/FULL 耐久策略、绘制行为或旧白板迁移。

## 命令与准备

所有命令从主源码仓库 `mindnotes-pro/` 执行。生成的报告、日志和临时文件放在工作区的 `tmp/local-baseline-20261113/`，或另一个显式指定的工作区任务目录。

| npm 命令 | 对应入口 | 用途 |
| --- | --- | --- |
| `npm run benchmark:local:storage` | `npm run build:electron && node benchmark/local/run-storage.mjs` | 先编译当前 Electron/领域模块，再测真实本地存储 |
| `npm run benchmark:local:desktop` | `node benchmark/local/run-desktop.mjs` | 在同平台 Windows 或 Linux X11/XWayland 环境测 Electron；不隐式构建 |
| `npm run benchmark:local:compare` | `node benchmark/local/compare.mjs` | 验证报告兼容性并比较 p95 |
| `npm run test:local-baseline` | `node --test benchmark/local/*.test.mjs` | Node 内置测试运行器执行工具行为测试 |
| `npm run test:offline` | `node benchmark/local/run-offline.mjs` | 预检后执行独立的真实 Electron 断网旅程 |
| `npm run test:linux` | `node benchmark/local/run-linux.mjs` | 校验任务拥有的虚拟 X11 后执行 Linux 原生/离线旅程；不隐式构建 |

直接运行 `run-storage.mjs` 或使用桌面/断网入口前，必须准备当前 `dist-electron` 模块：

```sh
npm run build:electron
```

源码模式的桌面和断网入口还必须准备相对路径的生产前端资源，两步都要显式执行：

```sh
npm run build:electron
NODE_ENV=production npm run build -- --base=./
```

缺编译模块、缺相对路径生产资源或缺目标环境时，运行器记录失败/不可用并以非零状态退出，不自动安装、构建或以跳过代替成功。存储 npm 入口自带 `build:electron`；Node 工具测试本身不依赖 Vite，但真实存储/fixture 测试需要当前编译模块。项目行为检查继续使用 `npm run typecheck`、`npm run lint`、`npm run test:storage` 与 `npm run check`；日志应记录实际退出阶段，测试未收集到用例不能写成全部通过。

源码资源预检按生产 `dist/index.html` 中实际的 script、stylesheet、preload、manifest 和 icon 引用检查本地文件，不要求统一放在 `assets/`。当前 Vite 的 `js/`、`css/` 与 `icons/` 布局可以使用；绝对/外部地址、缺失文件以及逃出 dist 的路径或符号链接会被拒绝。Node 工具套件中的资源 smoke 只读检查已有 production dist，需要上面显式准备的相对路径资源，不会自动调用 Vite 或启动 Electron。

本地工具使用独立 lint 入口，将 Node 全局限定到早期存储/报告工具并继承项目规则；它不改写应用的 ESLint 配置。完整工具门禁为：

```bash
TEMP="$baseline_temp" TMP="$baseline_temp" TMPDIR="$baseline_temp" ./node_modules/.bin/eslint --config benchmark/local/eslint.config.mjs --max-warnings 0 benchmark/local/*.mjs benchmark/local/electron-harness.d.mts e2e/desktop/offline.spec.ts playwright.offline.config.ts
```

当前 Node 26 的实验性 Web Storage 会影响 Vitest/jsdom；完整检查为该次命令设置 `NODE_ENV=test` 和 `NODE_OPTIONS=--no-experimental-webstorage`。这些选项只影响该命令及其子进程，不写入系统配置。Node 内置测试套件 `test:local-baseline` 不需要该 Web Storage 选项。完整 check 的最后一步会以测试环境构建前端，因此之后应显式恢复桌面源码模式使用的 production 相对路径资产：

```bash
TEMP="$baseline_temp" TMP="$baseline_temp" TMPDIR="$baseline_temp" NODE_ENV=test NODE_OPTIONS=--no-experimental-webstorage npm run check
TEMP="$baseline_temp" TMP="$baseline_temp" TMPDIR="$baseline_temp" NODE_ENV=production npm run build -- --base=./
```

这里的 `$baseline_temp` 使用下节创建的工作区临时目录。Web Storage 选项不证明浏览器或 Electron 的存储行为；桌面子进程会过滤 `NODE_OPTIONS`。

## Linux：存储、原生桌面与诊断范围

以下示例在当前工作区内创建临时目录，并只为对应命令设置 `TEMP`、`TMP`、`TMPDIR`。没有改写系统级目录设置。

```bash
cd '/home/core/桌面/mindnotespro工作区/mindnotes-pro'
baseline_temp="$PWD/tmp/local-baseline-20261113/command-temp"
mkdir -p "$baseline_temp"
TEMP="$baseline_temp" TMP="$baseline_temp" TMPDIR="$baseline_temp" npm run benchmark:local:storage -- --output tmp/local-baseline-20261113/storage-linux.json
TEMP="$baseline_temp" TMP="$baseline_temp" TMPDIR="$baseline_temp" npm run test:local-baseline
npm run benchmark:local:compare -- tmp/local-baseline-20261113/storage-linux.json tmp/local-baseline-20261113/storage-linux.json
```

自身比较用于确认该份报告可读、兼容且比较入口能工作；它不能证明性能提升。已有报告代表生成时的代码、参数和机器，不自动代表随后修改的源码。

当前工作区直接开发 Linux；Windows 端在 Windows 环境继续。Linux 桌面入口接受同平台 x64 ELF 和 X11/XWayland，保留 Windows PE 校验。当前 Electron `43.8.8` 已是 Linux ELF，普通沙盒仍因本机 helper 权限及 AppArmor namespace 条件受限，用户选择在以后安装时处理。源码工具不会自动改为无沙盒启动或修改系统权限；没有显示/运行时、传入 Windows PE 或不受支持后端时，以实际预检结果和非零状态退出。

先显式准备 Electron 与 production 相对路径资产，然后在本任务已有的、经认证和 PID 身份校验的 owned Xvfb `:90`/WM 中运行。Linux 原生套件同时覆盖真实 native 输入/层级/截图，以及本地库离线编辑/备份恢复：

```bash
linux_native_temp="$PWD/tmp/linux-desktop-20261114/command-temp"
mkdir -p "$linux_native_temp"
TEMP="$linux_native_temp" TMP="$linux_native_temp" TMPDIR="$linux_native_temp" npm run build:electron
TEMP="$linux_native_temp" TMP="$linux_native_temp" TMPDIR="$linux_native_temp" NODE_ENV=production npm run build -- --base=./
source tmp/linux-desktop-20261114/test-display/env.sh
TEMP="$linux_native_temp" TMP="$linux_native_temp" TMPDIR="$linux_native_temp" npm run test:linux -- --allow-visible
```

普通模式显式要求 Chromium sandbox。当前机器需要专门无沙盒诊断时，在同一 owned 环境明确加 `--diagnostic-no-sandbox`：

```bash
TEMP="$linux_native_temp" TMP="$linux_native_temp" TMPDIR="$linux_native_temp" npm run test:linux -- --allow-visible --diagnostic-no-sandbox
TEMP="$linux_native_temp" TMP="$linux_native_temp" TMPDIR="$linux_native_temp" npm run benchmark:local:desktop -- --allow-visible --diagnostic-no-sandbox --output tmp/linux-desktop-20261114/desktop-linux-diagnostic.json
```

诊断参数拒绝用户 DISPLAY0/1，只有 live owned 显示身份通过后才允许禁用 Chromium sandbox。它记录真实启动开关、后端和 security scope；窗口 `sandbox:true`/`contextIsolation:true` 不能替代内核沙盒证明。不要将 flag 设为普通产品默认值。当前 owned WM 状态与 lifecycle 见 [显示记录](../../tmp/linux-desktop-20261114/test-display/REPORT.md)；测试结束由拥有显示器的任务按记录身份清理进程，不按名称广泛 kill。

Linux suite 结果写入 `tmp/linux-desktop-20261114/native-results.json` 与 `native-results/`。实际包模式传入 `--executable` 并选解包目录的 ELF，旁边必须有 `resources/app.asar`；该验收入口暂不直接支持 AppImage 容器。Linux 隔离 userData 使用区分大小写的 realpath 比较。

desktop 不可用报告保留诊断，指标为空；offline/native 入口记录实际预检及用例结果，不生成可比较的性能基线。Linux 侧工具测试、生成 PNG、存储或 guard 拒绝结果，不能写成 Windows 原生通过。owned Xvfb 原生结果也不能代表 GNOME compositor、原生 Wayland 客户端像素、portal、正常沙盒、物理笔、多屏混合 DPI 或锁睡拔屏全部通过。完整运行/打包与当前边界见 [Linux 开发说明](../../LINUX_DEVELOPMENT_CN.md)。

## Windows：源码与已有实际包

在目标 Windows 机器的主源码仓库目录打开 PowerShell。以下 `TEMP`/`TMP`/`TMPDIR` 只作用于当前 PowerShell 进程及其子进程；下面保存原有值，并在最后恢复；也可以使用专门的测试终端，结束后关闭它。

```powershell
$baselinePreviousEnvironment = @{}
foreach ($name in @('TEMP', 'TMP', 'TMPDIR', 'NODE_ENV', 'MINDNOTES_EXECUTABLE')) {
    $baselinePreviousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
$baselineTemp = Join-Path (Get-Location) 'tmp/local-baseline-20261113/command-temp'
New-Item -ItemType Directory -Force -Path $baselineTemp | Out-Null
$env:TEMP = $baselineTemp
$env:TMP = $baselineTemp
$env:TMPDIR = $baselineTemp

$env:NODE_ENV = 'production'
$env:MINDNOTES_EXECUTABLE = $null
npm run build:electron
npm run build -- --base=./
npm run benchmark:local:desktop -- --allow-visible --output tmp/local-baseline-20261113/desktop-windows-source.json
npm run test:offline -- --allow-visible
```

`--allow-visible` 是桌面和断网入口的必需参数，表示允许这次运行显示悬浮窗口并执行程序化指针操作。没有该参数，预检不会启动应用。它用于协调可见操作，不是系统权限机制；运行时应保持目标桌面可用。

测量工作区内已有 Windows unpacked 包时，显式指定实际 exe。当前路径示例为 `release/win-unpacked/MindNotes Pro.exe`，两个入口都支持 `--executable`：

```powershell
npm run build:electron
npm run benchmark:local:desktop -- --allow-visible --executable 'release/win-unpacked/MindNotes Pro.exe' --output tmp/local-baseline-20261113/desktop-windows-package.json
npm run test:offline -- --allow-visible --executable 'release/win-unpacked/MindNotes Pro.exe'
```

两个入口也支持 `MINDNOTES_EXECUTABLE` 环境变量作为实际包路径的回退值。显式 `--executable` 优先；二者均未提供或环境变量为空时选择源码模式。上面的源码示例先清空该变量，并在下方恢复原值，避免已有包路径改变本次源码测量模式。使用环境变量选包时，身份记录和启动模式与显式传入同一路径一致。

实际包模式要求 exe 旁的 `resources/app.asar` 存在，记录 exe 与 app.asar 的 SHA256，并从运行中的应用记录实际版本、Electron/Chromium 及 `isPackaged`。工具还需要当前编译的 fixture 准备仓库，因此仍要执行 `build:electron`。测已有包不要求重建或重新打包它；源码模式的前端构建也不会自动证明该包已验收。每次启动核对实际 `userData` 与请求目录，以及源码/实际包模式是否吻合。

存储与桌面可配置 `--iterations`（1–30，默认 5）、`--warmups`（0–10，默认 1）、`--notes`（100/1000/10000，默认 1000）和工作区内的 `.json` `--output`。桌面另外支持 `--idle-seconds`（0–900，默认 5）与 `--frame-seconds`（1–60，默认 5），单段 15 分钟 idle 观察使用一次测量、零次预热，避免默认重复产生多段 15 分钟等待：

```powershell
npm run benchmark:local:desktop -- --allow-visible --iterations 1 --warmups 0 --idle-seconds 900 --output tmp/local-baseline-20261113/desktop-windows-idle-15min.json
```

offline 使用其独立旅程入口，支持 `--allow-visible` 与 `--executable`；不要把性能 runner 的采样参数直接传给它。未知、重复、缺值或非法数值参数会被拒绝。

完成本节所需源码/实际包命令后，恢复当前 PowerShell 进程原有环境值（包括原来未设置的值）：

```powershell
foreach ($name in @('TEMP', 'TMP', 'TMPDIR', 'NODE_ENV', 'MINDNOTES_EXECUTABLE')) {
    [Environment]::SetEnvironmentVariable($name, $baselinePreviousEnvironment[$name], 'Process')
}
```

## 数据隔离与文件范围

存储与桌面测量使用确定性生成数据，不读取软件真实 `userData`、用户笔记或用户现存截图。Windows 原生 capture fixture 创建目标测试桌面捕获；Linux 存储使用生成 PNG，Linux native suite 的 capture 只取经过身份校验的 owned X11 独立颜色客户端显示。原有 storage/desktop 测量在 `tmp/local-baseline-20261113/runtime/` 下建立新目录，Linux native 及其桌面数据使用 `tmp/linux-desktop-20261114/runtime/`；导入使用独立空库，重启恢复复用该次测试的同一个目录。桌面满载草稿恢复与单笔 8000 点场景使用独立初始数据，长手势不会追加到已达到点数上限的草稿。

应用数据和应用进程的临时路径均限制在运行器拥有的目录内。结束时先关闭应用、仓库 worker、保存队列与测试网络服务，再清理自己创建的临时文件；错误路径同样执行关闭与清理。清理失败会导致非零退出并保留诊断路径。运行器不删除相邻文件，不通过清空整个 `tmp` 父目录实现清理。报告输出与临时库分离，保留用于复查；输出只允许工作区内 `.json` 路径，并用同目录临时文件原子替换，拒绝符号链接或路径逃逸。

## 报告与比较

storage/desktop 报告格式是 `mindnotes-pro.local-baseline`，`schemaVersion: 1`。报告包含生成时间、runner、`passed`/`failed`/`unavailable` 状态、来源身份、实际环境、参数、fixture、指标、功能检查与限制。指标保留原始 `samples`、`count`、`min`、`p50`、`p95`、`max`、`unit` 和 `meaning`；不能只摘录某个毫秒值而丢掉负载或语义。

来源身份记录 Git HEAD、已有未提交工作树摘要、实际加载的编译模块及传递依赖、package/lockfile 和工具代码的 SHA256。桌面还记录实际源码资产或 exe/app.asar 身份。环境记录平台、架构、OS、Node、CPU、逻辑处理器数、内存与实际数据目录的文件系统类型；桌面追加实际 Electron/Chromium、Playwright、显示器几何/缩放和源码/实际包运行模式。仅有相同版本号不等于相同测量来源。

fixture 为 `local-fixture-v1`，seed 为 `20261113`，SHA256 覆盖实际生成内容及图片字节；参数含 `local-measurement-v1` 的测量语义版本与采样策略。笔记规模选项用于屏幕库，网页 fixture 使用独立的规模并遵守现有网页库限制，不能把 `--notes 10000` 理解成生成一万篇网页笔记。默认完整草稿为 1000 笔、每笔 160 点，总计 160000 点。屏幕背景及缩略图是有效的确定性 4×4 PNG，用于核对保存、导出/导入和字节保留；它们的体积与真实截图不同，不能据此估算真实截图负载。

```sh
npm run benchmark:local:compare -- tmp/local-baseline-20261113/baseline.json tmp/local-baseline-20261113/current.json
npm run benchmark:local:compare -- tmp/local-baseline-20261113/baseline.json tmp/local-baseline-20261113/current.json 0.2
```

比较要求两份成功报告来自同一 runner，环境指纹、fixture、参数、测量语义及采样策略一致；每个基线指标与检查必须仍存在，指标单位和 `meaning` 必须一致，所有检查仍通过。当前新增指标/检查可以保留。源码与包 hashes 可以随待评估改动不同，它们用于追溯来源；源码模式与实际包模式等环境差异不能混合比较。文件系统身份不可用、缺指标/检查、单位/语义变化或失败报告都拒绝比较。

默认用 p95 比较耗时和内存上升，回归阈值为相对基线增加超过 20%；第三个位置参数接受非负有限阈值。退出码 `0` 表示兼容且未超过阈值，`1` 表示发现回归，`2` 表示参数/报告错误或不兼容。零基线与零当前的变化为零；零基线与正当前视为回归，输出显式 `"Infinity"`，不会静默转换成空值。

分位数采用 nearest-rank：排序后取 `ceil(p × n) - 1` 位置。单项只有五个测量样本时，p95 等于最大值。首份报告属于探索性观察，默认 20% 阈值用于提示本轮变化；它不建立跨机器 SLA，也不设置绝对毫秒通过门槛。库就绪指标可能包含同次重复的多种 constructor/load 事件，样本数与单个稳态操作不同，必须结合该指标的 `meaning` 阅读。首份 Linux 报告与既有历史 Windows 数字不能计算性能优化比例；改善幅度需要后续同机、同负载、同采样策略的前后报告。

## 指标与回执的含义

| 观察 | 可解释的范围 |
| --- | --- |
| 存储 `repositoryReadyMs` | 仓库 constructor 加 load 的就绪成本，包含初始化/重开事件；与稳态保存、检索分开。网页 JSON 重开的 load 同时计入 readiness 和 `pageJsonReloadMs`，两者存在已说明的重叠 |
| 存储保存、搜索、详情、导出与流式导入 | 使用当前真实仓库及备份验证器，核对结果、数量、内容与重开恢复；fixture 准备不冒充稳态操作 |
| `rssBytes`、`heapUsedBytes`、`externalBytes` | Node 运行器的资源观察：RSS 包括该 Node 进程及 worker threads；heap/external 为主 isolate 的观察，不代表独立 worker 进程或完整 Electron 应用 |
| `launchToBubbleReadyMs`、展开与库打开 | 从真实启动/命令到对应 UI 可操作。各次启动使用新进程和新测试目录，但保留 OS 文件缓存，不称为清空缓存的冷启动 |
| `pointerCommandMs` | 从手势开始到 Playwright pointerup 命令返回的工具/API 回执，表示自动化命令完成 |
| `gestureToSavedMs` | 从同一个手势起点到最新新增笔迹的保存状态被核对；要求实际 preview UUID、全部预期坐标、笔刷信息及最新 `saved`，另有重启恢复核对 |
| 帧间隔、超过 16.7ms 比例与长任务 | 按普通手势、满载静态草稿、独立长手势等实际场景记录的调度/界面压力；不是 GPU 绘制完成或物理笔到像素延迟 |
| Electron CPU/working set | 从真实 `app.getAppMetrics()` 按进程角色、场景及阶段观察，不拼成伪精确的全局物理 RSS |

Promise 返回、IPC 编辑回执、pointerup 返回或历史 `saved` 都不能单独证明最新内容已耐久保存。网页 `flushEdits` 等待编辑 IPC；旅程另核对最新 comment 与当前 `saveState=saved`，在回到悬浮流程时等待真实 workspace flush，并通过重启读取验证。屏幕操作等待其真实保存队列 flush；导入/备份恢复使用独立空目录，核对数据后再次重启。报告的功能 checks 与时间指标一起阅读，不能删除失败 checks 以获得比较通过。

## 断网覆盖与后续能力

offline 在真实 Electron 启动时设置随机 loopback 拒绝代理并禁用 loopback 绕过，代理拒绝 HTTP/CONNECT 且不转发。先用 Node 直连 canary 证明控制服务可用，再从默认 Electron session 和实际懒创建的 `persist:mindnotes-pages` session 验证代理拒绝且 canary 没收到应用直连；随后安装 session 级外部 HTTP(S) 取消。仅看到无效域名加载失败，或只切换页面 DevTools 离线状态，不足以证明该阻断流程生效。

实际旅程验证本地壳/工具条/屏幕层、已有屏幕与网页笔记检索和编辑、程序化绘制与撤销/重做、最新保存和重启、真实备份导出/独立空库导入及第二次重启，以及在线导航被阻断后的错误提示与返回本地库。对话框只返回任务文件路径。Windows 截图旅程保留 PowerShell/Win32 capture fixture；独立 Linux suite 使用经过认证/拥有校验的 X11/XTest fixture 和其他客户端的真实颜色像素。读取实际 suite 结果，不能将另一平台的原生分支标成通过。

这验证 Chromium 测试 sessions 在外部 HTTP(S) 不可用时的现有业务行为；系统所有进程的网络流量、物理断网、真实笔输入、混合 DPI、锁睡拔屏与用户场景截图仍需目标机发行验收。Linux 鼠标穿透的证据限定于实际执行的 owned X11/WM 流程；当前 Linux 不执行 Windows 原生流程。

现有本地笔记、草稿、受管理的截图及备份可以构成离线核心；已有在线网页入口仍需要网络访问原文。新的本地资料导入与阅读格式、受管理的网页离线副本、本地服务边界整理及依据基线实施的优化属于后续阶段，这份基线不宣称这些未来能力已经实现。
