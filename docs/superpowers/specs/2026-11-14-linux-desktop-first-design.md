# Linux 桌面开发首阶段

用户明确当前工作区直接开发 Linux 桌面端，Windows 端在 Windows 环境继续。保留既有离线本地笔记架构、数据合同与已完成的增量预览优化。

## 本阶段范围

当前目标为 Ubuntu/GNOME。悬浮屏幕批注优先采用 Electron X11/XWayland 后端：原生 Wayland 无法提供现有拖条选屏所需的全局位置和非激活窗口操作。Linux 存在 DISPLAY 且调用者没有显式 Ozone 选项时，默认 x11；显式原生 Wayland 下优先打开本地笔记工作区，浮层入口明确返回不支持的信息。Windows 逻辑保留。

Electron 同版本 Linux x64 运行时已安装。常规沙盒在本机因 helper 权限及 AppArmor user namespace 限制失败；用户选择安装时处理。正式产品入口不能自动加入 no-sandbox。隔离 Xvfb/Fluxbox 的诊断测试必须显式记录 no-sandbox、隔离 DISPLAY 和测试目录，不能宣称常规沙盒通过。

## 窗口与输入

Linux overlay 在构造时为可聚焦的 WM-managed 窗口，toolbar 保持不激活。用户已选择 Linux 首版鼠标模式暂时隐藏笔迹，切回画笔立即恢复：鼠标模式 unmap overlay，释放 WM 外框与键盘焦点；画笔模式恢复显示/聚焦 overlay，并保持 toolbar 位于其上。规范笔迹、草稿、history不清空，UI单独提示该平台规则而不遮住错误/恢复消息。Windows 继续原有动态 focusable 与 live ink 策略。Linux 策略必须通过原生 X11 点击、键盘和窗口层级验证；属性 getter 和 CDP 输入不足以作为原生通过。

不将原始 XRaiseWindow/XSetInputFocus 诊断操作直接包装成产品通过，不操作真实用户桌面来伪造验收。若 Electron 自身管理窗口仍无法满足必要焦点/层级合同，应记录实际缺口并进行局部适配，而非跳过测试。

## 会话安全与捕获

Linux 来源 app/title 暂保持空值，display/时间/图片/可编辑笔迹正常保存；这一元数据缺口不等于锁态未知。

Ubuntu systemd-logind 可确定本人桌面 session 的 Active/LockedHint/User/Type/Class。优先验证 XDG_SESSION_ID，否则从当前 UID 的 loginctl show-user Display 获取会话；只接受本人 x11/wayland 用户会话。未锁且 active 方可捕获；locked/inactive 拒绝，无法确认时明确拒绝捕获。相关 CLI 均使用结构化 execFile 参数、超时和输出上限，不拼接 shell。

Linux 锁态变化须释放原生输入并取消捕获。通过受控会话通知或有界订阅触发重新查询；订阅失效/状态未知时禁用绘制和捕获，同时保留小入口与本地库可用。解锁不能自动恢复画笔捕获。PowerMonitor suspend/resume 继续保留。

Windows 继续既有 OpenInputDesktop 检查。Linux 不调用 Windows 专用的 DIP-to-physical 来源坐标逻辑；捕获尺寸与 display 选择保留当前截图合同。原生 Wayland/XWayland 的真实全桌面 portal、混合 DPI、原生 Wayland 客户端像素不由 Xvfb 截图证明。

## 测试与发行

Linux 工具允许同平台 ELF、拒绝 Windows PE；Windows 原校验保留。隔离 userData 在 Linux 区分大小写。Linux 进程树退出只针对本任务创建的 PID/进程组，并观察结束；不广泛按进程名 kill。沙盒诊断必须显式选择，正式默认开启。

新增 Linux 原生流程覆盖：启动、展开、实际鼠标穿透、画笔输入与 Esc、笔迹保存重启、截图冻结/保存、本地库搜索编辑、备份空库恢复与无网络可用流程。测试用 owned X11/WM 与生成数据；诊断模式/无 compositor 的局限逐项记录。平台专属 Windows 证据不能在 Linux 被写为通过。

Linux 构建提供显式 AppImage 与 deb，均 publish never，存放 release/linux/ 或清楚分开的 Linux 输出。desktopName 与 com.mindnotes.pro.desktop 对齐，为以后 GNOME portal 身份做好一致的发行元数据；不声称仅改名称已通过全局快捷键门户验收。

本阶段完成要求：Linux 运行时可用、代码和工具入口支持 Linux、隔离原生流程取得真实结果、全部源码/存储/类型/边界检查、Linux 包及使用说明齐备。普通沙盒权限、真实 GNOME/Wayland 合成、portal 与设备边界仍以实际验证为准，不能通过测试 flag 默默降级。
