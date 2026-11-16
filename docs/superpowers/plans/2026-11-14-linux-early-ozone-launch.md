# Linux Early Ozone Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans. Steps use checkbox syntax.

**Goal:** 普通 Linux 开发/安装入口在 Wayland 会话且 DISPLAY 存在时，在 Electron C++ 初始化之前传入 X11；保留调用者显式 Ozone 与无 DISPLAY 的本地工作区路径。

**Architecture:** Electron43 已在 JS 前创建 Ozone 实例，因此启动参数必须在外部入口设置。源码以 Node launcher 执行 Electron；现有安全 AppRun 作为 deb/AppImage 共用入口并条件注入 X11。main 仅识别 Electron 实际选择，不再晚追加 switch。不会使用 relaunch、提权或默认 no-sandbox。

**Tech Stack:** 现有 Electron43.8.8、TypeScript、Node、Bash、electron-builder、Playwright、owned Xvfb/Openbox。

**Spec:** 延续 `docs/superpowers/specs/2026-11-14-linux-desktop-first-design.md` 默认X11/显式Wayland策略；本计划修复截图暴露的入口时序缺陷。

## Global Constraints

- 原版本6.0.0-beta.12、依赖、Windows发行/构建配置和本地存储/IPC/会话保护/增量预览合同保留。
- 用户已安装当前包，真实笔记和运行PID123449不修改、不终止；不在用户DISPLAY0/1操作GUI。
- 所有诊断和原生输入只在live校验owned90；no-sandbox仅显式隔离诊断；源码/产品默认沙盒不降级。
- 工作文件在tmp/linux-launch-20261114；既有证据保留，Linux旧包先留哈希记录再重建，最新哈希需重新交付。
- 已有脏工作树不重置、不整体暂存、不提交。

## Task 1: 源码启动与真实后端判定

**Files:** Create electron/linuxLaunch.mjs、electron/linuxLaunch.test.mjs；modify electron/main.mts；root修改package scripts。

**Interfaces:** `linuxLaunchArgs(platform, env, argv)` 返回新数组。仅Linux非空DISPLAY且原argv（--之前）没有ozone-platform/ozone-platform-hint键时，前置字面量 `--ozone-platform=x11`；显式=或分离形式、空值、auto及其他平台保留。`runElectron` 只在本模块作为CLI时启动，导入无副作用；退出码/信号转发限定自己child。共享现有compiled defaultOzonePlatform可用，但Node测试必须运行真实CLI/dummy executable验证参数及退出。

- [ ] RED：Wayland+DISPLAY默认argv必须为 `['--ozone-platform=x11','.','--workspace']`；显式wayland/hint/auto、无DISPLAY、Windows、-- terminator/URL、参数空格及非零退出需精确保持。
- [ ] 最小实现Node启动器，导入不启动。CLI接受原Electron参数，解析依赖路径并spawn同一runtime，inheritstdio，不添加沙盒开关。
- [ ] main移除JS阶段default append，改成按app.commandLine的实际Ozone选择判能力；不把C++默认称作caller explicit，不晚改后端。
- [ ] build:electron、Node launcher tests、type/lint通过。Root把dev:desktop中electron .和electron:dev改为Node launcher（Windows传原参数），dev:linux仍复用。

## Task 2: 正常发行入口

**Files:** Modify electron/linuxAfterPack.mjs/test；afterPack中的精确deb helper适配，不设置被builder拒绝的desktop.entry.Exec。

**Interfaces:** 安全AppRun在原exec前遍历原argv的--之前键，只有非空DISPLAY且无显式Ozone时将 `--ozone-platform=x11` 前置。原字节/空格/显式参数顺序保持；依然无unshare/no-sandbox默认。deb target helper用原上游metadata生成，然后只把唯一且已知的默认执行token从 `"/opt/MindNotes Pro/mindnotes-pro"` 改为 `"/opt/MindNotes Pro/AppRun"`，保留原参数。AppImage及非空explicit exec原样；接口/重复/陌生Exec拒绝构建。此guarded adapter仅作用当前builder helper实例，不改node_modules。

- [ ] RED：实际生成Bash在XDG_SESSION_TYPE=wayland、DISPLAY=:90调用owned dummy executable，输出必须多出一个x11参数；显式wayland/hint/auto、无DISPLAY、--终止符参数、库路径和退出码保持；原安全测试继续。
- [ ] 最小修改AppRun条件选择，header/name/layout guards保持；Windows/macOS不修改。
- [ ] Node测试、focusedlint、builder config validator和desktop entry生成/语法检查通过。

## Task 3: 实际启动与收尾

**Files:** benchmark/local/electron-harness.mjs/.d.mts/desktop.test.mjs；e2e/desktop/linux.spec.ts必要最小；Linux docs/packaging evidence。

- [ ] RED/GREEN：source Linux launch args使用同一source helper；packaged Linux用其adjacent AppRun执行但仍验证实际ELF/asar/runtime路径，wrapper realpath必须在实际app目录且可执行。正常沙盒与owned过程合同不变。
- [ ] 新增独立Wayland bootstrap/input case：XDG_SESSION_TYPE=wayland、测试专属不存在socket、真实AppRun且harness不提前注入X11；用实际X11窗/XTest验证，不调用capture或只依getter。原完整native X11截图case使用自身X11会话环境，所有15检查保持；generated offline保留Wayland环境的10检查点。
- [ ] 最终packaged AppRun三条case通过：原完整X11截图/保存、Wayland bootstrap/input、Wayland环境generated offline；原failed Wayland捕获与同provider观察保留，真实Portal仍待目标桌面验收。保留源码普通launcher及显式Wayland before-ready证据，不操作用户Wayland。
- [ ] 独立局部代码评审；完整npmcheck、productionrelativebuild、本地工具、launcher/session测试通过；LinuxAppImage/deb重建、asar/ELF/AppRun/desktop/ldd/SHA与最终源码核对、旧Windows226SHA不变。
- [ ] docs明确支持入口先选后端，raw Electron/ELF需要显式X11；旧SHA报告标历史。停止ownedOpenbox→Xvfb；交付最新deb及需重新安装说明，不替用户提权安装。

## 已复现的截图测试边界

同AppRun/fakeWayland/owned90诊断确认：真实UID1000 session2始终known/unlocked/active，actualOzone=x11；原desktopCapturer.getSources(type screen,1280×900)立即rejected。stderr为screen_capture_portal_interface.cc Failed to get a proxy for the portal: Unknown or unsupported transport “disabled” for address “disabled:”，随后ScreenCastPortal failed3与Failed to get sources。隔离会话有意禁用用户session bus，防止接入真实用户桌面；模拟Wayland触发了独立的Portal/PipeWire捕获路线。

这不是启动选后端回归：同一失败流程的前12项真实native输入/焦点/笔迹检查通过，后3项冻结/图像保存重启未执行。测试矩阵调整为分别检验启动与X11捕获，保持原捕获断言，不在产品屏蔽Wayland环境或关闭PipeWire、不把该失败标成pass。真实GNOME Portal捕获仍属已有待验范围。诊断进程均ordinary exit0并/proc gone；证据在tmp/linux-launch-20261114/capture-boundary-diagnostic.*。
