# Windows 发行包验收

当前候选为 beta.12，修复实际 beta.11 复现的导入失败仍提示成功、旧副本恢复未提醒的问题。主仓库构建和资产校验已完成，实际 exe 隐藏集成 8 项、存储故障恢复 8 项、异常恢复 10 项通过；完整源码与剩余门槛见[生产验收](../../PRODUCTION_READINESS_CN.md)。桌面流程共 34 项；新增旧副本持续提醒与失败导入的备份恢复流程，尚未执行可见验收。用户当前选择先做不占用桌面的检查，待另行协调输入时间。

beta.12 已从主仓库构建到 `release/`，实际包验收使用 `release/win-unpacked/MindNotes Pro.exe`。当前[资产清单](../../tmp/beta12-acceptance/artifacts-03/artifact-manifest.json)记录确切版本、hashes、58 个一致的生产资产和 15 个完整运行依赖。beta.11 包保留在 `release/beta11-candidate/release/`；历史验收、日志与原始说明见 [验收归档](../../tmp/qa/history/acceptance-through-beta11.zip)。所有可见命令在对应输入协调后逐项执行；输出用新任务目录，桌面截图跟随每项测试的 outputPath。

实际 beta.11 [存储故障报告](../../tmp/qa/hidden-storage-faults-beta11.json)记录八阶段机制检查成功、两个产品反馈缺陷，整体为 failed；[原件保留记录](../../tmp/qa/beta11-storage-fault-superseded.json)保持包和旧报告不变。隐藏 DOM、备份和强制结束检查不能替代可见合成或物理设备。

2026-11-12 新增实际 beta.11 [隐藏异常恢复 10 阶段](../../tmp/qa/hidden-crash-beta11-final.json)，[最终脚本](../../tmp/qa/hidden-crash-beta11-final.mjs) 与 [日志](../../tmp/qa/logs/tmp-hidden-crash-beta11-final.log) 保留。网页重载、有限笔记窗口重载、继续编辑、相同目录单实例、批注层输入释放、工具条崩溃退出及精确重启通过，四个进程正常退出。页面检查真实 preload 的订阅状态；隐藏动画帧与自动可见布局不计入通过。原始失败记录收录于历史验收归档。

从仓库根目录运行。Node.js >=22.22.2，已安装开发依赖，生产 `dist`、`dist-electron` 和 Windows exe 已生成。输出位于 `tmp/qa` 和所选日志。桌面必须解锁，所有桌面脚本逐个运行，不能并行覆盖画面。自动绘画和原生输入测试期间，使用者需暂停数位笔、鼠标和触摸板输入；开始前先协调使用时间，测试结束后再恢复实笔操作。

## 自动流程

| 文件                              | 验收范围                                                                         | 数据隔离                                                       |
| --------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `real-site-acceptance.mjs`        | 真实 HTTPS 文章的注入、正文摘录、滚动、刷新、恢复、来源和 Markdown               | 独立临时笔记目录                                               |
| `ordinary-fullscreen.mjs`         | 已安装 Chrome 的独立测试窗口、普通全屏、原生命中、像素、擦除与 Esc、截图来源     | 临时 Chrome profile 与临时笔记目录，只前置该测试窗口           |
| `production-soak.mjs`             | 1,000 笔、容量上限、15 分钟闲置、逐点重启恢复、擦除撤销、资源采样                | 临时笔记目录                                                   |
| `distribution-smoke.mjs portable` | 实际 Portable 自解压、两类笔记编辑、搜索和重启恢复                               | 临时笔记目录；屏幕图片为存储样本                               |
| `installer-lifecycle.mjs`         | beta.2→当前版本升级、重装、卸载后再装恢复与快捷方式清理                          | 仅安装到经过路径核验的临时目录；已有安装或同名快捷方式时停止   |
| `verify-artifacts.mjs`            | SHA256、生产资产与 asar 逐文件一致、版本字段、签名状态和当前源码清单             | 只读仓库与发行包；清单写入 `tmp/qa`                            |
| `native-pen.mjs`                  | 由使用者真实落笔；记录 trusted pen 事件、压力范围、笔迹数量、存储一致和重启      | 临时笔记目录；只自动准备工具，绘画必须由实笔完成               |
| `page-permissions.mjs`            | 隐藏 Electron 窗口验证源码网页权限策略、iframe、媒体／定位／通知和捕获拒绝       | 临时用户目录与隔离会话；模块实测不等于最终包集成验收           |
| `hidden-executable.mjs`           | 直接启动实际候选 exe，隐藏窗口下验证生成笔迹恢复、权限拒绝、导入回滚、编辑与导出 | 临时用户目录；生成 PNG／笔迹、程序化 IPC，无真实指针或桌面截图 |

安装生命周期需要 `release/MindNotes-Pro-6.0.0-beta.2-Setup-x64.exe` 与 package.json 当前版本的 Setup。它会真实改动 MindNotes 的单用户安装注册表和快捷方式，并在结束时卸载测试安装；正常用户笔记以 hashes 前后对比保护。不要同时运行真实用户应用。遇已有安装时不覆盖，换干净测试账户／机器验收。

```powershell
$env:NODE_ENV = 'test'
$env:TEMP = (New-Item -ItemType Directory -Path 'tmp/runtime' -Force).FullName
$env:TMP = $env:TEMP
$env:MINDNOTES_EXECUTABLE = (Resolve-Path -LiteralPath 'release/win-unpacked/MindNotes Pro.exe').Path
npx playwright test --config=playwright.desktop.config.ts --output=tmp/qa/beta12-final-desktop/desktop --reporter=list
node e2e/acceptance/real-site-acceptance.mjs
node e2e/acceptance/ordinary-fullscreen.mjs
$env:MINDNOTES_SOAK_COORDINATE = '1'
node e2e/acceptance/production-soak.mjs
node e2e/acceptance/native-pen.mjs
Remove-Item -LiteralPath 'Env:MINDNOTES_EXECUTABLE' -ErrorAction SilentlyContinue
node e2e/acceptance/distribution-smoke.mjs portable
node e2e/acceptance/installer-lifecycle.mjs
$env:MINDNOTES_ARTIFACT_BUILD_ROOT = (Get-Location).Path
$env:MINDNOTES_ARTIFACT_OUTPUT = (New-Item -ItemType Directory -Path 'tmp/qa/beta12-artifact-recheck').FullName
node e2e/acceptance/verify-artifacts.mjs
```

上述是逐项命令参考，不能一次启动全部流程。每项可见测试先协调输入时间，前项完成后再执行下一项；负载在收起后的 15 分钟结束后等待另行恢复协调，实笔阶段由使用者操作。Setup／Portable 脚本读取根 `release/` 内与独立候选 hashes 相同的发行包。已用过的输出路径须保留，重新运行时选择新路径；不要运行通用负载／实笔脚本覆盖等待中的 beta.6 命令。

Chrome 默认位置为 `C:/Program Files/Google/Chrome/Application/chrome.exe`；可用 `MINDNOTES_CHROME_EXECUTABLE` 指定已有安装。全屏验收必须确认 native hit 落在测试 Chrome、工具条按钮落在真实原生点击区域，不能只看 CDP 返回 fullscreen。Windows 跨缩放移动后可能保留旧物理 region，脚本同时记录 region 与可见控件。副屏用 `MINDNOTES_FULLSCREEN_SECONDARY=1` 选择；开始前移开覆盖测试屏中央的用户终端窗口。如果其他窗口遮挡，记录未完成并解决测试窗口可见性后重试，不关闭用户窗口。

资源采样的各进程工作集之和可能重复计入共享内存；手势计时包含 Playwright 通信，不是原生手写延迟。不得用定时器事件注入替代真触控、锁屏、休眠或拔屏。

`e2e/page-overlay.spec.ts` 另在无界面 Chromium 中直接加载源码序列化注入，测试 CDP 多触点、真实 capture 和明确标注的合成中断；`src/notes/screenPointer.test.tsx` 验证桌面层及截图编辑器的指针所有权。它们可以在使用者正常操作桌面时运行，不替代实际 exe 和原生触控验收。beta.7 修复这些用例复现的丢笔问题，旧 beta.6 通过记录仍作为历史证据保留。

权限模块验收读取 `MINDNOTES_PERMISSION_SOURCE_ROOT/dist-electron/electron/pagePermissions.mjs`，未设置时使用仓库根目录。它通过已有 Electron 可执行文件启动两个 `show:false` 隔离窗口，只访问本地 HTTP 测试页，检查权限拒绝与可信会话未被修改。没有接受系统权限对话框、读取用户剪贴板或展示／操作用户窗口；输出 `tmp/qa/page-permissions-source.json`。模块验收之后仍需实际应用的网页会话和发行包回归。

设置 `MINDNOTES_PERMISSION_APP_INTEGRATION=1` 可运行真实应用 main、WebContentsView、注入 bridge 和可信 shell 的隐藏集成，输出 `page-permissions-app-source.json`。窗口 show/focus 被测试保持隐藏，验证权限与批注持久化，不能证明合成画面或用户操作。`MINDNOTES_PERMISSION_BASELINE=1` 单独检查未配置策略时的通知默认权限；它与应用集成模式互斥。发行包权限仍由桌面 Playwright 用例验证。

隐藏应用集成可再设置 `MINDNOTES_PERMISSION_ARCHIVE` 指向新候选 `resources/app.asar`，直接载入其中的 main、preload、页面图层和存储模块，输出 `page-permissions-app-betaN-asar.json`。它使用版本一致的开发 Electron runtime，保持所有窗口隐藏；可以确认包内权限策略与笔记持久化，不能代替最终 exe 启动或桌面回归。

`hidden-executable.mjs` 必须显式设置 `MINDNOTES_EXECUTABLE`。它直接启动该 exe，在任何窗口创建前通过 inspector 阻止 show／focus，并核对 app.isPackaged、应用版本、app.asar 路径、exe 和 asar 的 SHA256。8 阶段验证空目录启动、生成的 1,000 笔／13,000 点恢复、程序化擦除撤销、损坏备份完整回滚与重试、远程权限拒绝、两类编辑与复用导出、2 次重启逐点一致；输出 `hidden-executable-betaN.json`。它不验证普通启动时的可见画面、真实输入、桌面捕获、持续输入负载、笔尖延迟或首次使用。

可选 `MINDNOTES_HIDDEN_SCREENSHOTS=1` 使用 capturePage 的 stayHidden／stayAwake 生成 renderer 图片；其 PNG 不能证明 Windows 可见合成。截图失败必须保留失败记录并退出，不能打开隐藏窗口来取图。当前 beta.6 曾得到 11 张图片，后续可选截图复跑返回 UnknownVizError；未形成视觉通过结论。未启用截图的 8 阶段集成复跑通过，范围与截图失败分别记录。

共享电脑可设置 `MINDNOTES_SOAK_COORDINATE=1`：开始绘画前协调约 90 秒暂停输入，脚本记录 `1000-ink-collapsed` 后允许正常使用电脑。完整 15 分钟采样结束会记录 `waiting-for-recovery-input`，保持收起状态等待；再次确认暂停输入后，向 `tmp/qa/soak-command.json` 写入唯一 `id` 和 `action: "resume"` 才执行重启、擦除和撤销。此协调不缩短闲置时间，也不减少笔数。

资产清单脚本在 Windows 上默认使用 `pwsh.exe` 检查签名；可通过 `MINDNOTES_POWERSHELL_EXECUTABLE` 指定已安装的 PowerShell。它记录当前工作区及实际包的 hashes，不宣称可重现编译，也不能代替发布者签名。最终测试之后若更换 exe 或重建生产资产，需要重新验收并生成清单。

需要保留运行中的旧包时，在独立目录构建新候选，并用 `MINDNOTES_ARTIFACT_BUILD_ROOT` 指向含 `package.json`、`dist`、`dist-electron`、`release` 的新构建目录。源码清单仍读取调用脚本所在仓库，两者版本必须一致。`MINDNOTES_ARTIFACT_OUTPUT` 可选择独立证据目录，清单中的发行包／资产路径相对 `buildRoot`，源码路径相对 `sourceRoot`。资产一致不等于工作流通过。

历史 beta.10 与更早的缺陷、失败诊断和通过记录均见验收归档。旧包及旧测试等待状态属于当时环境，当前只保留最近的 beta.11 包和 beta.2 升级测试基线。

beta.12 同包验收必须显式设置 `MINDNOTES_EXECUTABLE=release/win-unpacked/MindNotes Pro.exe`；资产验收使用当前仓库为 `MINDNOTES_ARTIFACT_BUILD_ROOT`，输出使用新的复核目录。完整桌面共 34 项、3 个文件，须在输入协调后执行。旧 beta.11 清单、准备和通过记录为历史证据，不能替代新包。生成 PNG 和隐藏 renderer 图片不代表实际桌面截图。

实笔验收单独运行 `node e2e/acceptance/native-pen.mjs`，工具准备完毕后由使用者画线、擦除和切换模式。`tmp/qa/native-pen-command.json` 接受带唯一 `id` 的 `snapshot`、`pen`、`eraser`、`pointer`、`undo`、`restart`、`stop` 命令；进度在 `native-pen-live.json`，阶段记录按当前版本保存在 `native-pen-betaN-release.json`。可以用 `MINDNOTES_PEN_RUN` 指定独立记录名称。记录完成后仍需对照实际笔画数量和使用者反馈审核，脚本不会自动宣称通过。

需要准确核对 20 笔时，从 `initial-empty-baseline` 的 0 笔开始，只画 20 条独立短线，不加汉字混合数量。保存后记录 `twenty-independent-lines`；切橡皮再由使用者真实擦线，记录 `physical-erase-complete`。撤销需使用者用笔点工具条，记录 `physical-undo-complete`，不能用自动 `undo` 命令代替。随后由使用者按 Esc 并操作下层软件，记录 `physical-escape-underlying-complete`；记录中包含工具条 trusted 点击、实际命令列表和 Electron 的 Escape 输入，再执行 `restart` 逐点核对及 `stop`。驱动可能将工具条笔点击报告为兼容鼠标，保留实际 pointerType，并与必须为 trusted pen 的绘画事件区分。用户反馈、设备型号和输入设置随证据保留。

## 需要真实设备的流程

| 场景             | 操作                                                                                | 通过条件                                                                |
| ---------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Windows 10／低配 | 运行同 SHA256 Portable；完成桌面画线→保存→编辑→备份，网页摘录→退出→恢复；再验 Setup | 无崩溃、卡住、空白界面或数据差异；记录系统／硬件和采样                  |
| 触控／笔         | 直接点按工具、连画 100 笔、擦除撤销；手指、笔交替和接触取消                         | 完成笔迹一致，无重复／断笔；Esc／鼠标后底层操作正常，不能把掌触画成笔迹 |
| 真锁屏           | 完成笔迹并等已保存，手工锁屏→解锁；截图中途锁屏再复验                               | 锁屏不捕获，取消不丢已完成笔迹，解锁恢复小按钮，底层输入可用            |
| 真睡眠           | 画线途中手工睡眠→唤醒                                                               | 未完成笔迹取消，已完成草稿保留，无透明层吃掉输入                        |
| 真拔屏           | 双屏各画不同笔迹，保存后拔掉副屏再接回                                              | 工具条保持可见、活动屏合法、两屏草稿恢复，不能写错屏幕                  |
| 普通全屏课件     | 全屏目标软件→画线→擦除→Esc→翻页→保存                                                | 真实合成像素和输入释放一致；记录软件版本与显示模式                      |
| 视觉／首次使用   | 未看源码的使用者完成两类笔记保存和导出，检查小屏、长文、错误状态                    | 没有裁切或不可达控件，能理解两类坐标与自动保存状态                      |
| 长时             | 真实交替绘画、阅读、保存、导出，持续数小时                                          | 无持续资源增长、数据差异或输入残留，保留资源采样和问题复现              |

生产状态以 [PRODUCTION_READINESS_CN.md](../../PRODUCTION_READINESS_CN.md) 为准，脚本存在不等于验收通过。
