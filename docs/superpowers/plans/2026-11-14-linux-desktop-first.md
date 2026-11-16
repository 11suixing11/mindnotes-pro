# Linux Desktop First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 让当前项目在 Linux 上开发、测试和打包，取得隔离 X11 原生流程证据。

**Architecture:** 使用现有 Electron/React/SQLite 架构，提取纯平台策略，Linux 会话安全独立查询/订阅，保留受限 IPC 与存储合同。X11/XWayland 浮层先行；原生 Wayland 以库工作区和准确能力边界运行。

**Tech Stack:** Electron43.8.8、Node26、TypeScript、loginctl/GDBus、Playwright、owned Xvfb/Openbox（保留早期 Fluxbox 探针）、electron-builder。

**Spec:** `docs/superpowers/specs/2026-11-14-linux-desktop-first-design.md`

## Global Constraints

- 用户已明确 Linux 当前开发，Windows 在 Windows 环境开发；不改旧 Windows 发行包。
- 不增加默认 no-sandbox，不修改本机 sudo/kernel/AppArmor；用户选择安装时处理沙盒权限。
- 不改页 JSON v1、屏幕 SQLite schema2、WAL/FULL、备份/恢复、sender/sandbox/contextIsolation 合同和当前增量预览。
- 所有测试数据在 tmp/linux-desktop-20261114，使用 owned DISPLAY90，不操作用户 DISPLAY0。
- 已有用户未提交源码保持，改动先通过 before 快照评审，不 wholesale stage/reset。

## Task 1: 平台、窗口与 Linux 会话安全

**Files:**
- Create `src/notes/desktopPlatform.ts` / `.test.ts`
- Create `electron/linuxSession.mts` / `linuxSession.test.mjs`
- Modify `electron/main.mts`, `electron/floatingController.mts`, `electron/screenSource.mts`
- Modify `src/notes/floating.ts`, `FloatingToolbar.tsx` / `.test.tsx`（用户已选 Linux 鼠标隐藏/画笔恢复规则的单独运行时提示）

**Interfaces:**
- `resolveDesktopBackend(platform, env, ozoneOption?)` 返回 windows/x11/wayland/unsupported；`defaultOzonePlatform(platform, env, explicit?)` 仅 Linux 无显式 option 且 DISPLAY存在时返回 x11。
- `surfaceFocusable(platform,surface)` Linux screen=true、toolbar=false；其他平台保留原构造默认 false。Linux 不依赖动态 setFocusable 改变 WM 管理属性。
- `readLinuxSessionState(options?)` 返回 `{known,locked,active,sessionId?,sessionPath?,reason?}`；构造查询执行器/UID/env 可注入供真实输出解析和生命周期测试。
- `observeLinuxSession(callback,options?)` 返回有界 stop；订阅本人的 logind 会话变更并重新读取，故障回调 unknown。只操作自己创建的监听进程。

- [x] 先写纯策略及会话输出/错误/订阅失效测试，观察 RED。

```ts
expect(defaultOzonePlatform('linux', {DISPLAY: ':90'}, undefined)).toBe('x11')
expect(defaultOzonePlatform('linux', {DISPLAY: ':90'}, 'wayland')).toBeUndefined()
expect(surfaceFocusable('linux','screen')).toBe(true)
expect(surfaceFocusable('linux','toolbar')).toBe(false)
expect(resolveDesktopBackend('linux',{WAYLAND_DISPLAY:'wayland-0'},'wayland')).toBe('wayland')
```

会话测试用手工文本 `User=1000\nType=wayland\nClass=user\nActive=yes\nLockedHint=no\nState=active`；locked=yes/inactive/foreignUID/missingfield/timeout 均拒绝绘制/捕获，不把空 metadata 当安全失败。测试 stop、旧结果覆盖保护和 unknown→locked/unlocked 变化。

- [x] 实现策略并在 app.ready 前设置默认 Ozone 与 desktopName；原生 Wayland 默认打开 workspace，showFloating 受能力检查。
- [x] 修改 Linux overlay 构造焦点/状态处理；pointer模式隐藏overlay，pen模式恢复，数据不清空；用户已明确选择该Linux首版规则。Windows 原行为保留。原生 X11 测试验证实际管理/堆叠/焦点，而非只测 getter。
- [x] Linux capture 前查询本人锁态；事件通知使浮层取消/释放；unknown保留库入口。Windows source 检查不变。
- [x] `NODE_ENV=test NODE_OPTIONS=--no-experimental-webstorage npm run typecheck`、focused Vitest、编译后 Node 会话测试通过，保留完整 RED/GREEN。

## Task 2: Linux 工具与原生/离线流程

**Files:**
- Modify `benchmark/local/electron-harness.mjs`, `.d.mts`, `desktop.test.mjs`, `run-desktop.mjs`, `run-offline.mjs`
- Create `e2e/desktop/linux.spec.ts`, `playwright.linux.config.ts`

**Interfaces:**
- Linux preflight 允许 ELF与 DISPLAY x11/XWayland，同平台签名/架构及相邻 app.asar；Windows PE 校验保留。
- 隔离路径比较仅 Windows case-fold，Linux精确realpath。
- 无沙盒仅显式诊断参数/环境，并在报告记录实际命令开关；不能把配置 sandbox=true 当内核沙盒通过。
- `npm run test:linux` 独立配置/ownedenv，普通旧 Windows suite 不收集新的 Linux 特定流程。

- [x] 先写 OS签名、环境、路径大小写、显式诊断开关拒绝/接受和进程退出测试。

```js
assert.equal(pathsMatch('/tmp/App','/tmp/app','linux'),false)
assert.equal(pathsMatch('C:\\App','c:\\app','win32'),true)
```

- [x] 接入 Linux ELF/隔离启动、owned进程组/树有界退出和报告 runtime/backend/sandbox scope。
- [x] 写真实 Linux keyboard/mouse pass-through/focus/画线/Esc 流程；不使用 rawraise/rawfocus 绕过产品。
- [x] 同一生成库真实离线搜索/编辑、队列flush、导出、空目录导入和重启核对。
- [x] 在 owned Xvfb/Openbox 上运行记录；实际 GNOME与 compositor/portal仍未验证时逐项标为待验。

## Task 3: Linux 发行与说明

**Files:**
- Modify `package.json`, `AGENTS.md`, `benchmark/local/README_CN.md`
- Create `LINUX_DEVELOPMENT_CN.md`

- [x] 添加 `dev:linux`、`test:linux`、`build:linux`；desktopName=com.mindnotes.pro.desktop，产品描述覆盖当前 Linux。

```json
{"build:linux":"npm run build -- --base=./ && npm run build:electron && electron-builder --linux AppImage deb --x64 --publish never --config.directories.output=release/linux"}
```

- [x] AppImage/deb生成、解包检查LinuxELF/版本/asar/desktop元数据、校验值。未安装的常规沙盒不标通过。
- [x] 完整 npmcheck、生产relativebuild、local工具测试、Linux原生/离线流程、代码评审，发行旧WindowsSHA不变。
- [x] 写运行/安装/沙盒/UbuntuX11与nativeWayland边界，保留诊断与真实结果；不宣称全Linux/Wayland或设备验收完成。

## 最终验证记录

最终代码与包检查见 `tmp/linux-desktop-20261114/final-verification/report.md`、`task3-final-report.md` 和 `final-review.md`。全部实施步骤完成；普通沙盒安装及真实 GNOME/Wayland/portal/物理设备验收按用户决定与阶段边界仍待后续进行。
