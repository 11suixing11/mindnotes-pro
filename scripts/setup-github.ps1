# MindNotes Pro — 一键 GitHub 自动化脚本
# 用法: .\scripts\setup-github.ps1 -Token "ghp_your_token_here"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"
$repo = "11suixing11/mindnotes-pro"
$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "MindNotes-Setup"
}

Write-Host "MindNotes Pro GitHub 自动化设置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Push code
Write-Host "`n[1/7] 推送代码..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\.."
git remote set-url origin "https://$Token@github.com/$repo.git"
git push origin main 2>&1
Write-Host "代码已推送到 GitHub" -ForegroundColor Green

# 2. Update repo metadata
Write-Host "`n[2/7] 更新仓库元数据..." -ForegroundColor Yellow
$repoData = @{
    description = "The beautiful, privacy-first whiteboard that works offline"
    homepage = "https://11suixing11.github.io/mindnotes-pro"
    topics = @(
        "whiteboard", "drawing-app", "note-taking", "canvas",
        "react", "typescript", "local-first", "privacy",
        "pwa", "offline-first", "zustand", "tailwindcss",
        "vite", "perfect-freehand", "digital-ink", "sketching",
        "mind-mapping", "productivity", "open-source", "free"
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://api.github.com/repos/$repo" `
    -Method PATCH -Headers $headers -Body $repoData -ContentType "application/json" | Out-Null
Write-Host "仓库描述和 Topics 已更新" -ForegroundColor Green

# 3. Create Labels
Write-Host "`n[3/7] 创建 GitHub Labels..." -ForegroundColor Yellow
$labels = @(
    @{ name="good first issue"; color="7057ff"; description="Good for newcomers" },
    @{ name="help wanted"; color="008672"; description="Extra attention is needed" },
    @{ name="performance"; color="fbca04"; description="Performance improvements" },
    @{ name="accessibility"; color="e4e669"; description="Accessibility improvements" },
    @{ name="design"; color="f9d0c4"; description="Design improvements" }
)

foreach ($label in $labels) {
    try {
        $body = $label | ConvertTo-Json
        Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/labels" `
            -Method POST -Headers $headers -Body $body -ContentType "application/json" | Out-Null
        Write-Host "  创建标签: $($label.name)" -ForegroundColor Gray
    } catch {
        Write-Host "  标签已存在: $($label.name)" -ForegroundColor DarkGray
    }
}
Write-Host "Labels 已创建" -ForegroundColor Green

# 4. Create Good First Issues
Write-Host "`n[4/7] 创建 Good First Issues..." -ForegroundColor Yellow
$issues = @(
    @{
        title = "[Feature] 添加键盘快捷键提示 tooltip"
        body = "## 描述`n在工具栏的每个工具按钮上添加 tooltip，显示工具名称和对应的键盘快捷键。`n`n## 验收标准`n- [ ] 鼠标悬停在工具按钮上时显示 tooltip`n- [ ] tooltip 显示工具名称和键盘快捷键`n- [ ] 600ms 延迟显示`n`n## 技术细节`n参考 `src/components/toolbar/ToolButtons.tsx`，使用 Tailwind CSS 实现。`n`n## 预计时间`n2-3 小时`n`n## 技能要求`n- React`n- Tailwind CSS"
        labels = @("good first issue", "enhancement")
    },
    @{
        title = "[Feature] 支持导出为 SVG 格式"
        body = "## 描述`n在现有 PDF/PNG 导出功能基础上，增加 SVG 格式导出支持。`n`n## 验收标准`n- [ ] 导出菜单中添加 SVG 选项`n- [ ] 导出的 SVG 包含所有画布元素`n- [ ] SVG 文件可在浏览器和设计工具中正常打开`n`n## 技术细节`n参考 `src/components/export-menu/ExportMenu.tsx`。`n`n## 预计时间`n3-4 小时`n`n## 技能要求`n- Canvas API`n- SVG"
        labels = @("good first issue", "enhancement")
    },
    @{
        title = "[Feature] 文档文件夹排序功能"
        body = "## 描述`n在侧边栏的文档列表中添加排序功能，支持按名称、创建日期、修改日期排序。`n`n## 验收标准`n- [ ] 侧边栏添加排序按钮/下拉菜单`n- [ ] 支持按名称排序 (A-Z, Z-A)`n- [ ] 支持按创建/修改日期排序`n`n## 技术细节`n参考 `src/store/slices/docManagement.ts` 和 `src/components/sidebar/`。`n`n## 预计时间`n2-3 小时`n`n## 技能要求`n- React`n- Zustand"
        labels = @("good first issue", "enhancement")
    },
    @{
        title = "[Feature] 添加画布缩放功能"
        body = "## 描述`n支持 Ctrl+滚轮缩放画布，以及触摸板捏合缩放。`n`n## 验收标准`n- [ ] Ctrl+滚轮缩放画布`n- [ ] 缩放以鼠标位置为中心`n- [ ] 显示当前缩放比例`n- [ ] 支持重置缩放 (Ctrl+0)`n`n## 技术细节`n需要修改 Canvas 渲染逻辑，添加 viewport transform。`n`n## 预计时间`n4-6 小时`n`n## 技能要求`n- Canvas API`n- 事件处理"
        labels = @("good first issue", "enhancement")
    },
    @{
        title = "[Feature] 改进移动端触控支持"
        body = "## 描述`n优化触摸设备上的绘图体验，支持手掌误触过滤。`n`n## 验收标准`n- [ ] 单指绘图流畅`n- [ ] 双指缩放/平移`n- [ ] 手掌误触过滤`n- [ ] 触控笔压感支持`n`n## 技术细节`n需要处理 touch events 和 pointer events 的区别。`n`n## 预计时间`n4-6 小时`n`n## 技能要求`n- 触控事件`n- Canvas API"
        labels = @("good first issue", "enhancement")
    }
)

foreach ($issue in $issues) {
    try {
        $body = @{
            title = $issue.title
            body = $issue.body
            labels = $issue.labels
        } | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/issues" `
            -Method POST -Headers $headers -Body $body -ContentType "application/json" | Out-Null
        Write-Host "  创建 Issue: $($issue.title)" -ForegroundColor Gray
    } catch {
        Write-Host "  Issue 可能已存在: $($issue.title)" -ForegroundColor DarkGray
    }
}
Write-Host "Good First Issues 已创建" -ForegroundColor Green

# 5. Create Release
Write-Host "`n[5/7] 创建 GitHub Release..." -ForegroundColor Yellow
$releaseBody = @"
## v3.2.0 - Major Project Upgrade

### New Features
- Keyboard shortcuts help panel (F1 or '?' button)
- Toolbar tooltips with shortcut badges
- Color history (last 5 colors, persisted)
- Empty canvas hint with fade animation
- Monet-inspired loading screen

### Testing
- 64 new unit tests (canvasElements, history, docManagement)
- Playwright E2E framework setup
- Total: 245 tests across 17 files

### Deployment
- Vercel and Netlify deployment configs
- GitHub Actions: release workflow, Lighthouse CI, Codecov
- Bundle analysis with rollup-plugin-visualizer

### Documentation
- Rewritten README with comparison table and deploy buttons
- Chinese and Japanese translations
- Architecture docs with Mermaid diagrams
- Technical blog post for Dev.to/Medium
- Growth strategy and social media templates

### UI Improvements
- Keyboard shortcuts help panel
- Toolbar tooltips with shortcut badges
- Color history (last 5 colors)
- Empty canvas hint with fade animation
- Loading screen with Monet-inspired design
"@

$releaseData = @{
    tag_name = "v3.2.0"
    name = "v3.2.0 - Major Project Upgrade"
    body = $releaseBody
    prerelease = $false
} | ConvertTo-Json -Depth 3

try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" `
        -Method POST -Headers $headers -Body $releaseData -ContentType "application/json" | Out-Null
    Write-Host "Release v3.2.0 已创建" -ForegroundColor Green
} catch {
    Write-Host "Release 可能已存在" -ForegroundColor DarkGray
}

# 6. Clean up git remote
Write-Host "`n[6/7] 清理凭据..." -ForegroundColor Yellow
git remote set-url origin "https://github.com/$repo.git"
Write-Host "Git remote 已恢复" -ForegroundColor Green

# 7. Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "全部完成!" -ForegroundColor Green
Write-Host ""
Write-Host "接下来你需要做的:" -ForegroundColor White
Write-Host "  1. 在 GitHub 上查看新的 Release 和 Issues" -ForegroundColor Gray
Write-Host "  2. 设置 Social Preview Image (仓库 Settings > General)" -ForegroundColor Gray
Write-Host "  3. 使用 docs/SOCIAL_MEDIA_TEMPLATES.md 在 Reddit/HN 发帖" -ForegroundColor Gray
Write-Host "  4. 部署到 Vercel: https://vercel.com/new/clone?repository-url=https://github.com/$repo" -ForegroundColor Gray
Write-Host ""
