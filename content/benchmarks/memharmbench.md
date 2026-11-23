---
id: "B61"
order: "11.4"
title: "MemHarmBench"
aliases: []
summary: "考察带长期记忆的 Agent 能否在多步任务里维持安全边界。"
domain: "AI 安全"
subject: "Agent 任务，Harness 也是变量"
task: "交互式环境"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "288"
reviewed: "2026-11-19"
links: [{"label": "官网", "url": "https://kirito14it.github.io/MemHarmBench/"}, {"label": "论文", "url": "https://arxiv.org/abs/2611.01700"}]
---

## 评估对象

评估长期记忆机制对 Agent 安全行为的影响。

## 任务格式

每道题包含上下文、记忆和应满足的安全条件。

## 评估流程

固定的 LLM 评审按逐题的安全条件判定表现。

## 资料依据

资料依据为原稿收录的公开项目资料。此条目保留评估对象、任务形态和判分的概述。
