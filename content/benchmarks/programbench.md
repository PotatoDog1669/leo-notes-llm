---
id: "B06"
order: "1.6"
title: "ProgramBench"
aliases: []
summary: "只给 Agent 一个能运行但不能读的可执行文件和它的文档，让它从零写出一份行为相同的程序，再用大量隐藏的行为测试对比结果。"
domain: "软件工程"
subject: "Agent 任务，Harness 由官方自备"
task: "终端/容器任务"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "200"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/facebookresearch/ProgramBench"}, {"label": "论文", "url": "https://arxiv.org/abs/2605.03546"}, {"label": "官网与榜单", "url": "https://programbench.com/"}, {"label": "测试数据", "url": "https://huggingface.co/datasets/programbench/ProgramBench-Tests"}]
---

## 评估对象

**能力：** 从零设计并实现一个完整程序的能力。没有现成代码和脚手架，用什么语言、怎么分模块都由 Agent 自己定，只能靠运行原程序、读文档来摸清行为。200 个被重建的程序都是真实开源软件，小的如 figlet、jq，大的如 FFmpeg、SQLite、PHP 解释器；原程序以 Rust（107 个）、Go（46 个）、C（33 个）为主。被测的是 Agent 整体，官方榜单上的成绩都用 mini-SWE-agent 这个 Harness 跑出。

**指标：** 主指标是完全解决率（Resolved）：一道题的全部有效行为测试都通过才算解决，没提交的题按 0 计。榜单另列「几乎解决」（通过不少于 95% 的测试）和平均测试通过率作参考。截至 2026-11-18 访问官方榜单页（页面注明 2026-10-22 更新），最高是 18.5% 完全解决、70.5% 几乎解决（Claude Opus 5.5，推理强度 xhigh，mini-SWE-agent）；论文最初评测的 9 个模型没有一个完全解决任何一题。

## 任务格式

Agent 在一个不能联网的容器里工作。容器里有原程序的可执行文件 `./executable`（只有执行权限，读不了，所以无法反编译）和随程序发布的文档。它要写出全部源码，并提供一个 `compile.sh`，运行后生成新的 `./executable`。交付物是整个工作目录打成的 `submission.tar.gz`。提示词禁止包装原程序、获取原始源码、反编译或跟踪系统调用。官方基线配置的限制是墙钟 6 小时、最多 1000 步、单条命令 180 秒。

**示例（真题 `cmatsuoka__figlet.202a0a8`）**

- **需求**（概括）：重建 figlet，一个把文字渲染成大号字符画的命令行工具。原程序用 C 写成，题目难度标为 easy。
- **原始题目**（没有逐题的文字题面：200 题共用官方基线 mini-SWE-agent 配置 `programbench.yaml` 里的提示词，题与题的差别只在容器里的可执行文件和文档。以下为节选，第一段是 `system_template` 的开头，后两段出自 `instance_template`，两者合计约 1160 词，见 https://github.com/SWE-agent/mini-swe-agent/blob/main/src/minisweagent/config/benchmarks/programbench.yaml ）：

  ```text
  You are a helpful assistant that can interact with a computer.

  Your task is to recreate a program from scratch based only on its observable behavior and bundled
  documentation.
  You are given a reference executable and its documentation.
  Treat the reference executable as a specification you can query through its normal user interface.

  Your submission must be an independent implementation.
  Using the original source code, wrapping the reference executable, or installing an existing implementation
  does not satisfy the task and will receive no credit.
  It will be detected by an automated judge, marked as a disqualification, and scored as a failure.
  [……省略约 400 词……]
  ## Task context

  Build a new implementation from scratch that matches the behavior of the reference executable.
  The executable is located at `./executable` in the workspace root.

  You also have access to the existing documentation.

  ## Your task

  Implement a program whose externally observable behavior matches the reference executable.

  No project-specific dependencies are pre-installed.
  You do NOT have access to the internet.
  [……省略约 26 词……]
  Make sure that you have a `./compile.sh` file that produces an executable `./executable` in the workspace
  root.
  `compile.sh` should be executable and should install any dependencies needed to compile the executable.
  If your compile.sh fails to compile on a fresh checkout, your task has failed.
  [……省略约 520 词……]
  ```
- **输入材料：** figlet 的可执行文件和文档，没有源码。
- **要做的：** 自选语言实现一个 figlet，命令行选项、输出内容、报错信息和退出码都要和原程序一致。
- **判分：** 12 组共 1044 个有效测试，例如 `test_center_flag_c_adds_leading_spaces_compared_to_noncentered` 检查居中选项的输出。全部通过才算解决。

**数据格式：** 仓库里一题一个目录，放在 `src/programbench/data/tasks/` 下；测试代码和容器镜像分别托管在 Hugging Face 和 Docker Hub。

```
cmatsuoka__figlet.202a0a8/      目录名是「组织__仓库.提交号前七位」
├── task.yaml     repository、commit、language、difficulty，以及判分前要清除的文件哈希
└── tests.json    按测试组列出测试名；每组有 tests（有效）和 ignored_tests（剔除及原因）
Hugging Face：<题目名>/tests/<测试组哈希>.tar.gz    每组的 pytest 测试代码
Docker Hub：programbench/<题目名，双下划线换成 _1776_>:task_cleanroom_v6  给 Agent 用的容器镜像
```

## 评估流程

1. **启动：** 分两步。先用 Harness 生成答卷，官方基线是 `mini-extra programbench --model <模型>`，每题产出一个 `submission.tar.gz`；再用 `programbench eval <运行目录>` 判分。
2. **环境：** 每题一个 Docker 容器，用该题的预构建镜像。基线配置下容器断网，给 20 核、60 GB 内存。
3. **执行：** Agent 反复运行原程序观察行为、写代码、自测，直到自己提交或用完时限。
4. **判分：** 判分程序另起一个容器，解开答卷，先删掉与原程序哈希相同的文件和答卷自带的可执行文件，再在断网状态下运行 `compile.sh`（限时 900 秒）。然后逐个测试组运行 pytest，用新编译出的程序对比预期行为。全程是脚本判分，不用 LLM。
5. **算分：** 单题得分 = 通过的测试数 ÷ 有效测试数。得分为 1 记为解决，不低于 0.95 记为几乎解决。`programbench info` 汇总出完全解决率、几乎解决率和平均得分，分母是全部 200 题。

## 资料依据

依据：仓库 commit `895f659`（2026-10-12），读了全部题目的 `task.yaml` 和 `tests.json`、判分代码和使用文档；论文摘要、官网榜单、mini-SWE-agent 文档和 Hugging Face 数据集目录于 2026-11-18 访问。没有实际运行，没有下载测试代码和镜像。官网称测试总数超过 248,000，我按仓库 `tests.json` 数出的有效测试约 247,000 个，另有约 66,000 个被剔除，两个数字的口径差异没有核实。提示词里提到会用自动裁判查作弊，仓库代码里没有找到对应实现。
