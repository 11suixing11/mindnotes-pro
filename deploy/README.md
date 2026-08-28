# VPS 静态部署

此目录提供在独立 VPS 上托管 MindNotes Pro 的最小配置。应用是纯静态 Vite/PWA 构建，不需要 Node.js 常驻进程、数据库或反向代理到应用服务器。

## 目录约定

发布脚本使用原子切换目录：

```text
/var/www/mindnotespro/
├── releases/<release-id>/   # 每次完整 dist 发布
└── current -> releases/<release-id>
```

Caddy 读取 `current`，因此上传失败不会覆盖正在服务的版本。

## 服务器初始化（Ubuntu/Debian）

1. 安装 Caddy（按官方仓库文档操作），确认 DNS 的 `A`/`AAAA` 已指向本机。
2. 创建发布目录。以下示例允许 `quizops` 直接发布，并让 Caddy 只读访问；把 `quizops` 换成实际 SSH 发布账号：

   ```bash
   sudo usermod -aG caddy quizops
   sudo install -d -o quizops -g caddy -m 0750 /var/www/mindnotespro
   sudo install -d -o quizops -g caddy -m 0750 /var/www/mindnotespro/releases
   ```

   重新登录 SSH 以应用组成员变更。该模式下发布时设置 `DEPLOY_REMOTE_SUDO=`；脚本保留 SSH 用户 `quizops` 的所有权，不需要日常免密 sudo。

3. `deploy/Caddyfile` 是一个可独立追加的站点块。如果服务器只托管本站，可以直接安装为主配置：

   ```bash
   sudo install -m 0644 deploy/Caddyfile /etc/caddy/Caddyfile
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```

   如果主配置已有其他站点，不要覆盖它。把本站保存为 `/etc/caddy/sites-enabled/mindnotespro.caddy`，并在主配置顶层只添加一次：

   ```caddyfile
   import /etc/caddy/sites-enabled/*.caddy
   ```

   然后用同样的 `caddy validate` 和 `systemctl reload caddy` 检查并加载。

   Caddy 会自动申请并续期 `mindnotespro.l.cd` 的 HTTPS 证书；开放 TCP 80/443，且不要让其他服务占用这两个端口。

## 构建与发布

在本地或 CI 中使用 Node 22（仓库要求 `>=22.22.2`）。根域名部署必须使用 Vite base `/`；不要复用 GitHub Pages 的 `/mindnotes-pro/` base：

```bash
npm ci
VITE_APP_BASE=/ npm run build
```

运行发布脚本时会默认重新执行上述根域构建，然后上传完整 `dist/` 并原子更新 `current`：

```bash
bash deploy/publish-vps.sh user@server
# 可选：bash deploy/publish-vps.sh user@server 22
```

`quizops` 无 sudo 发布示例：

```bash
DEPLOY_REMOTE_SUDO= \
bash deploy/publish-vps.sh quizops@server
```

root SSH 发布示例：

```bash
DEPLOY_REMOTE_SUDO= bash deploy/publish-vps.sh root@server
```

脚本环境变量：

- `DEPLOY_SSH_TARGET`、`DEPLOY_SSH_PORT`：不在命令行传参时使用。
- `DEPLOY_SSH_IDENTITY_FILE`：可选 SSH 私钥文件；服务器密钥不在默认 SSH 配置中时使用。不要把真实路径或私钥写入仓库。
- `DEPLOY_REMOTE_ROOT`：默认 `/var/www/mindnotespro`。
- `DEPLOY_REMOTE_OWNER`：默认不执行 `chown`。仅在 sudo/root 模式确实需要统一所有者时设置为 `user:group`；无 sudo 时用户名必须与 SSH 用户一致。
- `DEPLOY_REMOTE_SUDO`：默认 `sudo -n`。root SSH 或目录已归发布账号所有时，显式设为空字符串。
- `SKIP_BUILD=1`：仅在已用 `VITE_APP_BASE=/` 构建并验证 `dist/` 后跳过本地构建。

发布脚本先上传到隐藏暂存目录，将目录统一为 `0755`、文件统一为 `0644`，再重命名为正式 release，并用临时软链接原子替换 `current`。它不会重载 Caddy；Caddyfile 仅在首次安装或配置发生变化时需要 reload。

发布前建议运行仓库门禁：

```bash
npm run test:run
npm run lint
npm run typecheck
```

## 验证清单

```bash
bash deploy/verify-vps.sh
# 或：bash deploy/verify-vps.sh https://mindnotespro.l.cd
```

确认：

- 首页和任意未知路径返回 `index.html`（SPA fallback）。
- `/sw.js` 与 `/manifest.json` 返回 `200` 且 `Cache-Control: no-cache`，便于 PWA 更新。
- `/icons/*` 按 `dist/` 的稳定路径直接提供；缺失图标返回 `404`，不会误回退到 HTML。
- 哈希 JS/CSS/字体/图片返回长期 immutable 缓存。
- HTTPS 证书有效，HTTP 自动跳转 HTTPS（由 Caddy 管理）。
- 不存在的哈希资源返回 `404`，不会误回退到 `index.html`。

## 域名切换与本地数据

`mindnotespro.l.cd` 必须至少配置一条 `A` 记录指向 VPS 公网 IPv4；只有服务器确实配置了稳定公网 IPv6 时才添加 `AAAA`。DNS 生效前可先用临时 hosts/`curl --resolve` 验证源站，但 Caddy 只能在公网解析正确后签发正式证书。

MindNotes Pro 的画板数据保存在浏览器本地，并按 origin 隔离。旧 GitHub Pages 地址的数据不会自动出现在新域名：迁移前应在旧站导出 v5 JSON 备份，然后在新域名导入。不要在确认备份前清理旧站数据或停用旧入口。

## 回滚与清理

查看当前版本：

```bash
readlink -f /var/www/mindnotespro/current
```

用临时软链接原子切换到旧版本即可，无需重载 Caddy：

```bash
sudo ln -s /var/www/mindnotespro/releases/<previous-release-id> /var/www/mindnotespro/.rollback-current
sudo mv -Tf /var/www/mindnotespro/.rollback-current /var/www/mindnotespro/current
```

只删除已验证不再需要的旧 release，至少保留一个可回滚版本。不要删除正在被 `current` 引用的目录。
