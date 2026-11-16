# Linux 桌面开发与发行

当前工作区以 Linux 桌面端为开发和验证目标，Windows 端在 Windows 环境继续开发。产品版本保持 `6.0.0-beta.12`，开发运行时为 Electron `43.8.8` Linux x64；本轮不升级项目依赖。源码与安装包共用现有 React/Electron、本地网页 JSON、屏幕 SQLite 和备份流程。

## Ubuntu 与显示后端

本阶段目标是 Ubuntu/GNOME 的 X11 或 XWayland 浮层。只要 Linux 环境存在 `DISPLAY`，且调用者没有显式传入 Ozone 后端，应用会在 ready 前选择 `x11`。GNOME Wayland 会话中的 XWayland 仍记录底层会话为 Wayland，不能因为 Electron 使用 x11 就声称已验证原生 Wayland。

| 环境 | 本阶段行为与边界 |
| --- | --- |
| X11 / GNOME 下的 XWayland | 提供悬浮入口、画笔与本地笔记工作流；真实 GNOME 合成、跨客户端截图及设备边界需在目标桌面验收 |
| 显式 `--ozone-platform=wayland` | 先打开本地库工作区；悬浮入口明确提示当前后端不支持，不依赖原生 Wayland 不提供的全局坐标和强制置顶能力 |
| 无可用显示后端 | 不将 headless ready 探针当作产品 UI 通过；桌面入口需具备可运行的显示环境 |
| owned Xvfb + WM | 开发测试使用独立显示器、生成数据和原生 XTest 输入；没有 GNOME compositor、portal 或物理设备证据 |

Linux 鼠标模式暂时隐藏覆盖层及其笔迹，使窗口管理器外框和键盘焦点真正释放；切回画笔恢复同一份笔迹。此操作不清空草稿、history 或保存的笔记，工具条单独提示这一 Linux 首版规则。Windows 保持既有鼠标模式可见笔迹策略。

Linux 当前不自动附加其他应用的名称和窗口标题，保存的来源字段可以为空；显示器、时间、图片和可编辑笔迹继续保留。这与锁态安全判断是两件事。

## 准备与源码运行

从仓库根目录执行。开发机需要项目规定的 Node 版本（`>=22.22.2`）、npm 和开发依赖；当前检查使用 Node 26。若用户级 npm 配置省略 dev 依赖，使用 `npm ci --include=dev`。安装版应用不要求普通用户自行安装 Node、数据库或启动服务器。

`node_modules/electron/dist/electron` 必须是 Linux x64 ELF。Windows PE 运行时不能在当前 Linux 桌面测试中使用。已有 Linux 运行时安装记录位于 [runtime setup](tmp/linux-desktop-20261114/runtime-setup/README.md)，包含下载校验、版本、ELF 与动态库验证；headless/no-sandbox 探针只证明运行时加载。

```bash
linux_task_temp="$PWD/tmp/linux-desktop-20261114/command-temp"
mkdir -p "$linux_task_temp"
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" npm run dev:linux
```

`dev:linux` 编译 Electron，然后启动 Vite 和普通 Electron；应用自行选择 X11 后端。它保留 Chromium 正常沙盒，没有失败后改用无沙盒的重试。

使用生产源码资源时，先显式构建相对路径资产：

```bash
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" NODE_ENV=production npm run build -- --base=./
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" npm run build:electron
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" ./node_modules/.bin/electron .
```

只打开本地工作区可用 `electron . --workspace`。在拥有真实 Wayland 会话的目标机上，可显式选择 `electron . --ozone-platform=wayland --workspace` 进行工作区验收；这是后端选择方式，不是当前隔离 X11 结果中的通过项。

## 会话安全与运行依赖

Linux 桌面运行需要 systemd-logind 提供本人图形会话，并有 `loginctl`（Ubuntu 的 `systemd` 包）和 `gdbus`（`libglib2.0-bin` 包）。deb 元数据包含这两项及 Electron 桌面库依赖。AppImage 随包提供 Electron，但不替代主机 logind 服务和上述 CLI。

应用优先验证 `XDG_SESSION_ID`；没有有效值时，从当前 UID 的 `loginctl show-user Display` 获取图形会话。只有本人 `Class=user`、`Type=x11/wayland`、active 且未锁定的会话可以绘制/捕获。查询失败、缺字段、外来 UID、locked 或 inactive 都释放原生输入并拒绝捕获，本地库仍可使用。锁态通知或订阅失效会重新限制输入；解锁不会自动切回画笔。电源 suspend/resume 继续使用现有处理。

这些查询使用有界结构化命令参数，不通过拼接 shell 运行。Xvfb 本身不是 logind 用户桌面；测试实际查询当前 UID 的本人图形会话，捕获仅限 owned X11 测试显示，不读取用户桌面。真实用户锁屏、睡眠和会话切换仍需独立验收。

## 当前主机的沙盒状态

截至本阶段，普通 Electron 沙盒启动仍受本机权限限制：开发运行时的 `chrome-sandbox` 为用户所有、模式 `0755`，不满足 setuid helper 的 root/`4755` 条件；Ubuntu AppArmor 对非特权 user namespace 的限制也已在运行诊断中观察到。用户选择在安装时处理，源码开发不修改 helper 所有权、内核参数或 AppArmor 设置。

`sandbox:true`、`contextIsolation:true` 和 `nodeIntegration:false` 是窗口安全配置；当测试显式关闭 Chromium sandbox 时，它们不能证明内核沙盒已运行。正式源码入口和发行入口不应自动添加 `--no-sandbox`。普通启动失败应保留其错误，不能通过诊断 flag 改写为沙盒验收通过。

deb 的上游安装脚本会在将来安装时处理桌面入口、helper 权限，并在适用的 Ubuntu 上处理随包 AppArmor profile。这些脚本在本轮构建/解包检查中只读审查，没有安装或执行。AppImage 的挂载/FUSE 和 namespace 条件也必须在目标机验证；单文件生成成功不等于正常沙盒启动成功。

## 源码与原生测试

完整检查在当前 Node 26 上为命令局部设置测试环境和 Web Storage 选项：

```bash
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" NODE_ENV=test NODE_OPTIONS=--no-experimental-webstorage npm run check
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" NODE_ENV=production npm run build -- --base=./
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" npm run test:local-baseline
```

`check` 结束时生成的前端使用 test 环境，因此恢复 production 相对路径资产后再进行真实桌面验收。Linux suite 不隐式构建当前源码；普通 Windows desktop/offline suite 保留在 Windows 环境执行。

Linux 原生套件只接受本任务拥有的、经过 PID/start ticks/命令/Xauthority 校验的虚拟 X11 显示器。使用现有 owned `:90` 和 WM，源码资源准备完成后执行：

```bash
source tmp/linux-desktop-20261114/test-display/env.sh
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" npm run test:linux -- --allow-visible
```

普通模式需要正常 Chromium sandbox；当前主机这一分支预期受沙盒限制。专门的隔离诊断需明确选择：

```bash
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" npm run test:linux -- --allow-visible --diagnostic-no-sandbox
```

`--allow-visible` 表示允许本次隔离应用窗口和程序化输入；它不授予修改系统权限。`--diagnostic-no-sandbox` 只允许在通过 owned 显示校验后使用，报告记录实际启动参数和安全范围，不能传给普通产品运行作为默认值。不要将这些命令改为用户 `DISPLAY=:0`/`:1`。

套件包括真实鼠标/键盘穿透、画笔焦点和 Esc、窗口层级、笔迹保存重启、独立颜色客户端截图/冻结/保存，以及生成库的离线搜索/编辑、备份与空库恢复。报告位于 `tmp/linux-desktop-20261114/native-results.json` 和 `native-results/`；必须阅读实际每项结果，缺用例、失败或不可用不等于通过。

实际包验收可加 `--executable /absolute/path/to/linux-unpacked/mindnotes-pro`。该入口校验同平台 ELF 及旁边的 `resources/app.asar`；暂不直接接受 AppImage 容器，需要解包后选择内部 ELF。运行器使用隔离 userData，并仅结束本任务拥有的进程组和观察退出。

## Linux 构建与安装边界

Linux x64 的 AppImage 与 deb 显式构建入口为：

```bash
TEMP="$linux_task_temp" TMP="$linux_task_temp" TMPDIR="$linux_task_temp" NODE_ENV=production npm run build:linux
```

脚本先构建 production 相对路径前端及 Electron，再以 `--linux AppImage deb --x64 --publish never` 打包到 `release/linux/`，与 Windows 发行包分开。desktopName、发行 `.desktop` 文件与窗口身份统一为 `com.mindnotes.pro.desktop`；这为后续 GNOME portal 身份准备，不等于已经验证 GlobalShortcuts portal。

上游 electron-builder 的 AppImage 默认 launcher 会在 namespace 探测失败时自动关闭沙盒。本项目明确将 `appImage.executableArgs` 设为空，并用 Linux 专属 `electron/linuxAfterPack.mjs` 生成只转发调用者参数的 `AppRun`；它保留相对路径执行与随包库路径，拒绝不安全的可执行文件名，并在上游 AppImage staging 顺序不符合检查时中止构建。Windows/macOS hook 分支直接返回。最终发行检查同时读取解包后的 launcher 和 `.desktop`，避免只改配置却仍携带无沙盒回退。

构建需要 electron-builder 自己的 AppImage/fpm 工具；初次使用可能从上游下载到工具缓存。构建和只读解包检查不安装包、不启动自动发布，也不修改旧 Windows 发行文件。检查应包含 x64 ELF、`app.asar` 内实际版本/编译模块、桌面 Exec/StartupWMClass、deb depends/postinst 和 SHA256。

最终已从通过独立评审及原生流程的代码重建以下 Linux x64 包，production 构建和只读解包/元数据检查均退出成功：

| 产物 | 实际大小 | 说明 |
| --- | --- | --- |
| [MindNotes Pro-6.0.0-beta.12.AppImage](<release/linux/MindNotes Pro-6.0.0-beta.12.AppImage>) | 140,198,574 字节 | ELF AppImage；内部应用为 Linux x64，版本 beta.12 |
| [mindnotes-pro_6.0.0-beta.12_amd64.deb](release/linux/mindnotes-pro_6.0.0-beta.12_amd64.deb) | 108,552,724 字节 | amd64；Debian 控制版本 `6.0.0~beta.12`，应用版本仍为 `6.0.0-beta.12` |
| [SHA256SUMS-linux-beta12.txt](release/linux/SHA256SUMS-linux-beta12.txt) | 校验文本 | 覆盖上述两个实际文件 |

AppImage、deb 和 `linux-unpacked` 内的应用 ELF、`app.asar`、安全 `AppRun` 一致；两份 desktop entry 已通过语法检查。包生成与校验通过不代表已安装运行或普通沙盒已通过。构建后核对的 226 个既有非 Linux 发行文件 SHA256 均未改变。

生成的 deb 可在用户以后授权安装的 Ubuntu 目标机通过系统包管理器安装；AppImage 需具有执行权限并满足该机运行条件。当前用户已将安装和沙盒权限处理推迟到之后，本阶段不执行安装命令。

## 验收记录与尚未覆盖的范围

最终修复后完整 `check` 退出 0：141 个测试文件、1354 个单元测试及 16 个真实存储测试通过，类型与依赖边界通过；lint 零错误，保留 63 条既有警告。本地工具 62 项、Linux 会话及 launcher 22 项通过。隔离 Openbox/Xvfb 的两条最终流程通过（原生 6.8 秒、离线恢复 8.2 秒，总计 15.6 秒），全部 15 项原生检查和 10 个离线检查点执行。独立评审发现的两项竞态已修复并复评通过，见 [最终评审](tmp/linux-desktop-20261114/final-review.md)。全部 60 个最终前端/Electron 文件已与包内字节核对。

实际状态以 [本轮进度](tmp/linux-desktop-20261114/progress.md)、[Task 1](tmp/linux-desktop-20261114/task1-report.md)、[Task 2](tmp/linux-desktop-20261114/task2-report.md) 与 [最终发行检查](tmp/linux-desktop-20261114/task3-final-report.md) 的当前结果为准。历史未修改代码的 WM 探针、旧 beta 和 Windows 发行证据不代表本阶段最终实现。Linux 发行检查报告逐项记录包是否实际生成以及任何失败，不能仅凭配置推断已经有可用包。

隔离 X11/WM 能验证实际输入、窗口层级、单屏截图和保存业务。它不能证明正常 Chromium kernel sandbox、GNOME 透明合成、原生 Wayland 客户端全桌面像素、portal 快捷键/捕获、物理笔、多显示器混合 DPI、拔屏、真实锁睡或其他 Linux 桌面环境已经通过。对这些项目继续保留明确的待验状态。
