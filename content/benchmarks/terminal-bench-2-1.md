---
id: "B12"
order: "1.12"
title: "Terminal-Bench 2.1"
aliases: []
summary: "把 Agent 放进一个 Linux 容器，给它一段文字需求，让它只用命令行把事情做完，再用测试脚本检查容器里的结果。"
domain: "软件工程"
subject: "Agent 任务，Harness 也是变量"
task: "终端/容器任务"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "89"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/harbor-framework/terminal-bench-2-1"}, {"label": "论文", "url": "https://arxiv.org/abs/2601.11868"}]
---

## 评估对象

**能力：** 在一台陌生机器上独立完成一件完整技术活的能力。除了写代码，还包括装环境、编译旧软件、恢复损坏的数据、破解哈希、训练小模型等，覆盖软件工程、系统管理、安全、科学计算、数据处理等 16 个类别。被测的是 Agent 整体，即 Harness 加模型。

**指标：** 通过率，即通过的尝试占全部尝试的比例。每题跑 5 次，89 题共 445 次尝试。截至 2026-11-05（仓库 commit `12b7565`），仓库收录的 20 份成绩里最高分是 83.8% ± 1.2%（Claude Code + Fable 5，推理强度 xhigh，2026-06-07 提交）；最晚一份成绩提交于 2026-07-11，未对照网站实时榜单。

## 任务格式

Agent 拿到的只有一段需求和一个容器的 shell。执行什么命令由它自己决定：查看文件、安装软件、写代码、运行程序，直到它认为完成。没有规定的提交物，最后留在容器里的文件和状态就是答卷。每题有时限，过半数是 15 分钟，最长 3 小时 20 分。

**示例（真题 `fix-git`）**

- **需求**（原文翻译）：我刚改了个人网站，然后切回了 master，现在找不到那些改动了，帮我找回来并合进 master。
- **原始题目**（`instruction.md` 全文）：

  ```text
  I just made some changes to my personal site and checked out master, but now I can't find those changes.
  Please help me find them and merge them into master.
  ```
- **初始状态：** 容器里有一个 git 仓库，那次改动提交在游离 HEAD 上，切回 master 后任何分支都看不到它。
- **Agent 要做的：** 从 reflog 里找到那个提交，合并进 master。
- **判分：** 检查两个被改过的文件，内容的 MD5 是否和预期一致。

**数据格式：** 一题一个目录，89 题结构相同。

```
fix-git/
├── instruction.md   给 Agent 的需求，纯文本
├── task.toml        配置：时限、CPU/内存、镜像名、难度、类别
├── environment/     Dockerfile 和题目自带的数据
├── solution/        参考解 solve.sh，Agent 看不到
└── tests/           判分脚本 test.sh 和 pytest 用例，Agent 工作时不在容器里
```

## 评估流程

1. **启动：** 用评测框架 Harbor 一条命令发起，指定数据集、Harness、模型和每题次数，例如 `harbor run -d terminal-bench/terminal-bench-2-1 -a claude-code -m <模型> -k 5`。
2. **环境：** 每次尝试用题目的预构建镜像起一个全新的 Docker 容器，可以在本地或云沙箱。多数题是 1 核 2 GB，全部无 GPU、可联网。
3. **执行：** `instruction.md` 的内容作为提示词交给 Agent。Agent 在容器里工作，直到自己停下或超时被终止。
4. **判分：** Agent 结束后，把 `tests/` 放进同一个容器并运行 `test.sh`。它用 pytest 检查文件内容和程序行为，全部通过记 1 分，否则记 0 分。判分不用 LLM；只有上榜时，才另外用 LLM 审查轨迹，把作弊的尝试改记 0 分。
5. **算分：** 通过率 = 得 1 分的尝试数 ÷ 全部尝试数，出错和超时都算 0 分。榜单同时给出标准误和 pass@k（同一题跑 k 次至少通过一次的比例）。

## 资料依据

依据：仓库 commit `12b7565`（2026-11-05）。流程部分读自 Harbor 文档和源码，没有实际运行。
