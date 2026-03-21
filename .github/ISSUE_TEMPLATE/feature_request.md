---
name: ✨ 功能请求
description: 建议一个新功能
title: "[Feature] 请简要描述功能"
labels: ["feature", "triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: 相关问题
      description: 这个功能解决了什么问题？
      placeholder: 我希望...
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: 建议的解决方案
      description: 你希望这个功能是什么样的？
      placeholder: 我希望可以...
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: 其他方案
      description: 有没有其他替代方案？
  - type: textarea
    id: context
    attributes:
      label: 补充信息
      description: 任何其他背景信息或截图
  - type: dropdown
    id: priority
    attributes:
      label: 优先级
      description: 这个功能对你的重要程度
      options:
        - 🌟 低（有了更好）
        - ⭐⭐ 中（比较需要）
        - ⭐⭐⭐ 高（非常需要）
    validations:
      required: true
