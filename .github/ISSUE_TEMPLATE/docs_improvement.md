---
name: 📚 文档改进
description: 建议改进文档
title: "[Docs] 请简要描述改进"
labels: ["documentation", "triage"]
body:
  - type: dropdown
    id: doc-type
    attributes:
      label: 文档类型
      options:
        - README
        - 使用指南
        - API 文档
        - 示例代码
        - 其他
    validations:
      required: true
  - type: textarea
    id: problem
    attributes:
      label: 当前问题
      description: 文档有什么问题？
    validations:
      required: true
  - type: textarea
    id: suggestion
    attributes:
      label: 改进建议
      description: 你建议如何改进？
    validations:
      required: true
