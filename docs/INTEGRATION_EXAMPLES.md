# MindNotes Pro - 集成示例指南

与流行服务和工具集成的详细指南和代码示例。

---

## 📋 目录

- [云存储集成](#云存储集成)
- [设计工具集成](#设计工具集成)
- [通信工具集成](#通信工具集成)
- [开发工具集成](#开发工具集成)
- [自动化工作流](#自动化工作流)
- [部署到云端](#部署到云端)

---

## 云存储集成

### Google Drive 集成

#### 1. 基础设置

```javascript
// google-drive-plugin.js
import { Picker } from './google-picker-api'

export const GoogleDrivePlugin = {
  name: 'Google Drive Integration',
  version: '1.0.0',
  
  async activate(api) {
    // 初始化 Google API
    await gapi.load('auth2', () => {
      gapi.auth2.init({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',
        scope: 'https://www.googleapis.com/auth/drive'
      })
    })
    
    // 添加菜单
    api.menu.add({
      label: 'Google Drive',
      submenu: [
        {
          label: 'Save to Drive',
          onClick: () => saveToGoogleDrive(api)
        },
        {
          label: 'Open from Drive',
          onClick: () => openFromGoogleDrive(api)
        },
        {
          label: 'Sync Settings',
          onClick: () => configureAutoSync(api)
        }
      ]
    })
  }
}

async function saveToGoogleDrive(api) {
  const state = api.store.getState()
  const fileData = {
    strokes: state.strokes,
    shapes: state.shapes,
    timestamp: new Date().toISOString()
  }
  
  try {
    const response = await gapi.client.drive.files.create({
      name: `MindNotes-${Date.now()}.json`,
      mimeType: 'application/json',
      fields: 'id, webViewLink',
      body: new Blob([JSON.stringify(fileData)], { type: 'application/json' })
    })
    
    console.log('Saved to Google Drive:', response.result.webViewLink)
    api.notify.success('已保存到 Google Drive')
    return response.result.id
  } catch (error) {
    console.error('Save error:', error)
    api.notify.error('保存失败: ' + error.message)
  }
}

async function openFromGoogleDrive(api) {
  return new Promise((resolve) => {
    const picker = new Picker({
      clientId: 'YOUR_GOOGLE_CLIENT_ID',
      scope: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
      features: ['MULTISELECT_ENABLED'],
      views: [
        new google.picker.View(google.picker.ViewType.DOCS)
      ],
      callback: (response) => {
        if (response[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
          const fileId = response[google.picker.Response.DOCUMENTS][0].id
          loadFileFromDrive(fileId, api)
          resolve(fileId)
        }
      }
    })
    picker.setVisible(true)
  })
}

async function loadFileFromDrive(fileId, api) {
  try {
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    })
    
    const data = response.result
    if (data.strokes) {
      data.strokes.forEach(stroke => api.store.addStroke(stroke))
    }
    if (data.shapes) {
      data.shapes.forEach(shape => api.store.addShape(shape))
    }
    
    api.notify.success('已从 Google Drive 加载')
  } catch (error) {
    api.notify.error('加载失败: ' + error.message)
  }
}
```

#### 2. 自动同步

```javascript
function configureAutoSync(api) {
  api.panel.add({
    id: 'gdrive-sync-panel',
    title: 'Google Drive Auto Sync',
    content: () => {
      return `
        <div style="padding: 15px;">
          <h4>Auto Sync Settings</h4>
          <label>
            <input type="checkbox" id="autosync-toggle"> Enable Auto Sync
          </label>
          <div id="sync-interval" style="margin-top: 10px;">
            <label>
              Sync Interval:
              <select id="sync-interval-select">
                <option value="5">5 分钟</option>
                <option value="10">10 分钟</option>
                <option value="30">30 分钟</option>
                <option value="60">1 小时</option>
              </select>
            </label>
          </div>
          <div style="margin-top: 15px;">
            <button id="sync-now-btn">Sync Now</button>
            <div id="sync-status" style="margin-top: 10px; font-size: 12px;"></div>
          </div>
        </div>
      `
    },
    onShow: () => {
      setupAutoSyncHandlers(api)
    }
  })
}

let syncTimer
function setupAutoSyncHandlers(api) {
  const toggle = document.getElementById('autosync-toggle')
  const intervalSelect = document.getElementById('sync-interval-select')
  const syncBtn = document.getElementById('sync-now-btn')
  const statusDiv = document.getElementById('sync-status')
  
  toggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      startAutoSync()
    } else {
      clearInterval(syncTimer)
      statusDiv.textContent = 'Auto sync disabled'
    }
  })
  
  syncBtn.addEventListener('click', () => {
    performSync(api, statusDiv)
  })
  
  function startAutoSync() {
    const interval = parseInt(intervalSelect.value) * 60 * 1000
    syncTimer = setInterval(() => {
      performSync(api, statusDiv)
    }, interval)
    statusDiv.textContent = `Auto sync enabled (every ${intervalSelect.value} minutes)`
  }
  
  function performSync(api, statusDiv) {
    statusDiv.textContent = 'Syncing...'
    saveToGoogleDrive(api).then(() => {
      statusDiv.textContent = `Last synced: ${new Date().toLocaleTimeString()}`
    })
  }
}
```

### Dropbox 集成

```javascript
export const DropboxPlugin = {
  name: 'Dropbox Integration',
  version: '1.0.0',
  
  activate(api) {
    const dbx = new Dropbox({ auth: 'DROPBOX_ACCESS_TOKEN' })
    
    api.menu.add({
      label: 'Dropbox',
      submenu: [
        {
          label: 'Save to Dropbox',
          onClick: async () => {
            const state = api.store.getState()
            const fileData = JSON.stringify({
              strokes: state.strokes,
              shapes: state.shapes
            })
            
            try {
              const response = await dbx.filesUpload({
                path: `/MindNotes/${Date.now()}.json`,
                contents: fileData,
                mode: { add: {} }
              })
              
              api.notify.success('已保存到 Dropbox')
            } catch (error) {
              api.notify.error('保存失败: ' + error.message)
            }
          }
        },
        {
          label: 'Open from Dropbox',
          onClick: async () => {
            try {
              const files = await dbx.filesListFolder({ path: '/MindNotes' })
              // 显示文件列表给用户选择
              const selectedFile = await showFileChooser(files.entries)
              
              const content = await dbx.filesDownload({ path: selectedFile.path_display })
              const data = JSON.parse(content.result.fileBlob)
              
              data.strokes?.forEach(s => api.store.addStroke(s))
              data.shapes?.forEach(s => api.store.addShape(s))
            } catch (error) {
              api.notify.error('加载失败: ' + error.message)
            }
          }
        }
      ]
    })
  }
}
```

---

## 设计工具集成

### Figma 插件集成

```javascript
// figma-plugin.js
export const FigmaExportPlugin = {
  name: 'Figma Export',
  version: '1.0.0',
  
  activate(api) {
    api.menu.add({
      label: 'Export to Figma',
      icon: 'figma-logo',
      onClick: () => exportToFigma(api)
    })
  }
}

async function exportToFigma(api) {
  const state = api.store.getState()
  
  // 转换为 Figma 兼容格式
  const figmaData = convertToFigmaFormat(state)
  
  // 使用 Figma API
  const response = await fetch('https://api.figma.com/v1/me', {
    headers: {
      'X-Figma-Token': 'YOUR_FIGMA_TOKEN'
    }
  })
  
  if (response.ok) {
    const user = await response.json()
    console.log('Figma user:', user.handle)
    
    // 将数据分享到 Figma（通过特定的工作流）
    await createFigmaFile(figmaData, user)
  }
}

function convertToFigmaFormat(state) {
  return {
    name: `MindNotes Export ${new Date().toLocaleString()}`,
    children: [
      // 转换笔迹为 SVG 路径
      ...state.strokes.map(stroke => ({
        type: 'PATH',
        name: stroke.name || 'Stroke',
        data: pointsToSVGPath(stroke.points),
        fillColor: stroke.color,
        strokeWidth: stroke.size
      })),
      
      // 转换形状
      ...state.shapes.map(shape => ({
        type: shape.type.toUpperCase(),
        name: shape.name || shape.type,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fillColor: shape.color,
        strokeWidth: shape.size
      }))
    ]
  }
}

function pointsToSVGPath(points) {
  if (points.length === 0) return ''
  
  const pathData = points
    .map((point, index) => {
      const [x, y] = point
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')
  
  return pathData
}
```

---

## 通信工具集成

### Slack 集成

```javascript
export const SlackPlugin = {
  name: 'Slack Integration',
  version: '1.0.0',
  
  activate(api) {
    api.menu.add({
      label: 'Share to Slack',
      icon: 'slack',
      onClick: () => shareToSlack(api)
    })
  }
}

async function shareToSlack(api) {
  // 导出为PNG图片
  const canvas = api.canvas.getElement()
  const imageData = canvas.toDataURL('image/png')
  
  // 打开分享对话框
  api.dialog.show({
    title: 'Share to Slack',
    content: `
      <div style="padding: 20px;">
        <input type="text" id="slack-channel" placeholder="#channel-name" style="width: 100%; margin-bottom: 10px;">
        <textarea id="slack-message" placeholder="Add a message..." style="width: 100%; height: 100px; margin-bottom: 10px;"></textarea>
        <button id="slack-send-btn">Send to Slack</button>
      </div>
    `,
    actions: [
      {
        label: 'Send',
        onClick: async () => {
          const channel = document.getElementById('slack-channel').value
          const message = document.getElementById('slack-message').value
          
          try {
            await sendToSlack({
              channel,
              message,
              imageData,
              slackToken: api.storage.get('slack-token')
            })
            
            api.notify.success('已分享到 Slack')
          } catch (error) {
            api.notify.error('分享失败: ' + error.message)
          }
        }
      }
    ]
  })
}

async function sendToSlack({ channel, message, imageData, slackToken }) {
  // 1. 上传文件到 Slack
  const uploadResponse = await fetch('https://slack.com/api/files.upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackToken}`
    },
    body: new FormData([
      ['channels', channel],
      ['file', new Blob([imageData]), 'mindnotes.png'],
      ['initial_comment', message]
    ])
  })
  
  return uploadResponse.json()
}
```

---

## 开发工具集成

### GitHub 集成

```javascript
export const GitHubPlugin = {
  name: 'GitHub Integration',
  version: '1.0.0',
  
  activate(api) {
    api.menu.add({
      label: 'GitHub',
      submenu: [
        {
          label: 'Create Issue with Screenshot',
          onClick: () => createGitHubIssue(api)
        },
        {
          label: 'Create Gist',
          onClick: () => createGist(api)
        }
      ]
    })
  }
}

async function createGitHubIssue(api) {
  const state = api.store.getState()
  
  // 导出并上传图片
  const canvas = api.canvas.getElement()
  const imageUrl = await uploadToImgur(canvas.toDataURL())
  
  // 创建 Issue
  const issueBody = `
## Design Issue

![](${imageUrl})

**Details:**
- Strokes: ${state.strokes.length}
- Shapes: ${state.shapes.length}
- Created: ${new Date().toISOString()}
  `
  
  const response = await fetch(
    'https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/issues',
    {
      method: 'POST',
      headers: {
        Authorization: `token ${api.storage.get('github-token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Design: ${prompt('Issue title')}`,
        body: issueBody,
        labels: ['design', 'from-mindnotes']
      })
    }
  )
  
  if (response.ok) {
    const issue = await response.json()
    api.notify.success(`Issue created: ${issue.html_url}`)
  }
}

async function createGist(api) {
  const state = api.store.getState()
  const gistContent = JSON.stringify({
    strokes: state.strokes,
    shapes: state.shapes,
    exportedAt: new Date().toISOString()
  }, null, 2)
  
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: `token ${api.storage.get('github-token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: 'MindNotes Export',
      isPublic: false,
      files: {
        'mindnotes.json': {
          content: gistContent
        }
      }
    })
  })
  
  const gist = await response.json()
  api.notify.success(`Gist created: ${gist.html_url}`)
}
```

---

## 自动化工作流

### Zapier 集成

```javascript
export const ZapierPlugin = {
  name: 'Zapier Webhook Integration',
  version: '1.0.0',
  
  activate(api) {
    api.menu.add({
      label: 'Zapier Actions',
      submenu: [
        {
          label: 'Configure Webhooks',
          onClick: () => configureWebhooks(api)
        }
      ]
    })
    
    // 监听事件，发送到 Zapier
    api.on('stroke:add', (stroke) => {
      sendToZapier('stroke.created', stroke, api)
    })
    
    api.on('shape:add', (shape) => {
      sendToZapier('shape.created', shape, api)
    })
  }
}

async function sendToZapier(eventName, data, api) {
  const webhookUrl = api.storage.get('zapier-webhook-url')
  if (!webhookUrl) return
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        data: data
      })
    })
  } catch (error) {
    console.error('Zapier send error:', error)
  }
}

function configureWebhooks(api) {
  api.dialog.show({
    title: 'Zapier Configuration',
    content: `
      <div style="padding: 20px;">
        <p>Paste your Zapier webhook URL:</p>
        <input 
          type="text" 
          id="zapier-url" 
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          style="width: 100%; padding: 8px; margin-bottom: 10px;"
        >
        <label>
          <input type="checkbox" id="zapier-strokes" checked> Track Stroke Events
        </label>
        <label>
          <input type="checkbox" id="zapier-shapes" checked> Track Shape Events
        </label>
      </div>
    `,
    actions: [
      {
        label: 'Save',
        onClick: () => {
          const url = document.getElementById('zapier-url').value
          if (url) {
            api.storage.set('zapier-webhook-url', url)
            api.notify.success('Zapier webhook configured')
          }
        }
      }
    ]
  })
}
```

---

## 部署到云端

### Vercel 部署

```javascript
// 部署配置
export const VercelDeployPlugin = {
  name: 'Vercel Deploy',
  
  activate(api) {
    api.menu.add({
      label: 'Deploy to Vercel',
      onClick: async () => {
        const state = api.store.getState()
        
        // 构建项目
        const project = {
          name: 'mindnotes-project',
          files: {
            'data.json': JSON.stringify(state)
          }
        }
        
        // 部署到 Vercel
        const response = await fetch('https://api.vercel.com/v12/deployments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api.storage.get('vercel-token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(project)
        })
        
        const deployment = await response.json()
        api.notify.success(`Deployed: https://${deployment.url}`)
      }
    })
  }
}
```

---

## 总结：推荐的集成组合

### 个人使用者
```
推荐:
  ├─ Google Drive (自动备份)
  ├─ Slack (团队分享)
  └─ GitHub (版本控制)
```

### 设计团队
```
推荐:
  ├─ Figma (设计协作)
  ├─ Google Drive (项目管理)
  ├─ Slack (沟通)
  └─ GitHub (资源管理)
```

### 开发团队
```
推荐:
  ├─ GitHub (代码&设计)
  ├─ Zapier (自动化工作流)
  ├─ Vercel (部署)
  └─ MongoDB (数据持久化)
```

---

**版本**: 1.3.1  
**最后更新**: 2024  
**维护者**: MindNotes 团队
