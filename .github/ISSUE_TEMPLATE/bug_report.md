---
name: 🐛 Bug 报告
description: 报告一个问题
title: "[Bug] 请简要描述问题"
labels: ["bug", "triage"]
body:
  - type: input
    id: version
    attributes:
      label: MindNotes Pro 版本
      description: 例如：v1.1.6
      placeholder: v1.x.x
    validations:
      required: true
  - type: dropdown
    id: platform
    attributes:
      label: 操作系统
      description: 你使用的是什么操作系统？
      options:
        - Windows
        - macOS
        - Linux
        - Android
        - Web (浏览器)
        - 其他
    validations:
      required: true
  - type: dropdown
    id: browser
    attributes:
      label: 浏览器（仅 Web 用户）
      description: 如果使用的是 Web 版本
      options:
        - Chrome
        - Firefox
        - Safari
        - Edge
        - 其他
  - type: textarea
    id: description
    attributes:
      label: 问题描述
      description: 请详细描述你遇到的问题
      placeholder: 问题是什么？
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: 复现步骤
      description: 如何复现这个问题？
      placeholder: |
        1. 打开...
        2. 点击...
        3. 出现错误
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: 期望行为
      description: 你期望发生什么？
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: 实际行为
      description: 实际发生了什么？
    validations:
      required: true
  - type: textarea
    id: screenshots
    attributes:
      label: 截图
      description: 如有截图请上传
  - type: textarea
    id: logs
    attributes:
      label: 日志
      description: 如有错误日志请粘贴
      render: shell
