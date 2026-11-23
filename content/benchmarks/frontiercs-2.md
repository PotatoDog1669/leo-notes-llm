---
id: "B05"
order: "1.5"
title: "FrontierCS 2"
aliases: []
summary: "从一篇计算机论文的开源代码里删掉论文的核心贡献，让 Agent 在 5 小时内把它补回来并做得更好，再用隐藏的工作负载和原作者的实现逐项比性能。"
domain: "软件工程"
subject: "Agent 任务，Harness 也是变量"
task: "代码仓库任务"
scoring: "脚本/程序"
access: "部分公开"
sampleCount: "已公开 48（计划 150）"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/FrontierCS/FrontierCS-2"}, {"label": "论文", "url": "https://arxiv.org/abs/2610.29932"}, {"label": "官网与榜单", "url": "https://frontier-cs.org/"}]
---

## 评估对象

**能力：** 在真实研究代码库里独立做出一项研究级改进的能力：读懂代码库，设计方法，实现，靠有限次数的反馈迭代，最后在没见过的数据上超过论文原作者的实现。48 题分布在 13 个方向，数量最多的是机器学习 9 题、数据库 9 题、机器学习系统 6 题，其中 32 题只用 CPU，16 题需要 GPU。被测的是 Agent 整体，官方称为 Candidate，即 Harness 加模型。和旧版 FrontierCS 1.0 不同：旧版是开放式算法题、按连续分计，2 版是论文代码库任务、以是否胜过参考实现为准。

**指标：** 一题通过的条件是最终提交在每一个隐藏工作负载的每一项指标上都胜过参考实现；通过率是通过的运行占比，每个 Candidate 每题跑一次。官网榜单的主数字是 FCI（FrontierCS Capabilities Index），由各题各指标的胜负和分差拟合出的能力指数，以 Kimi K2.7 为 5 作锚点。截至 2026-11-18 访问官网（页面注明 2026-11-14 更新，共 21 个模型），通过率最高是 58.3%，即 48 题过 28 题（Claude Opus 5.5 + Claude Code）；FCI 最高是 50.7，Claude Opus 5.5 和 Gemini 4 Carbon 并列。

## 任务格式

Agent 拿到一个删掉了论文贡献的代码仓库，仓库里的 `README.md` 就是题面，平台另外生成一份 `/frontier/task/README.md` 说明时限和提交规则。它在容器里改代码，只能改题目允许的路径，不能联网。过程中可以用 `frontier-submit train` 把当前补丁提交到开发工作负载上评一次，拿回分数和各项指标，次数有上限（各题 3 到 100 次不等）。最后用 `frontier-submit final` 提交一次补丁作为答卷，只能提交一次。墙钟时限 5 小时。

**示例（真题 `binary_fuse_filter`，概括自题目文件）**

- **需求**（概括）：论文是 Binary Fuse Filters（ACM JEA 2022），一种判断元素是否在集合里的近似过滤器。仓库里 `include/binaryfusefilter.h` 的构建例程被删掉了，要重新实现并优化 8 位和 16 位指纹的过滤器构建与查询。
- **原始题目**（题面 `repo/README.md` 节选，全文约 870 词，见仓库 `tasks/problems/Theory/binary_fuse_filter/repo/README.md`）：

  ```text
  # Binary Fuse Filter Construction and Lookup

  Implement and optimize static binary fuse filters for distinct `uint64_t` keys: construction must
  succeed with no false negatives, and the score compares your memory, construction time and lookup
  time with the exact upstream filters on the same CPU. **First priority: beat the reference on every
  workload under all five comparisons (see Scoring); the descriptive score is secondary** and never
  compensates for a failed comparison.

  ## Task

  This is Graf and Lemire's segmented three-wise binary fuse filter library
  (`FastFilter/xor_singleheader`; Binary Fuse Filters, ACM JEA 2022) with 8-bit and 16-bit
  fingerprints. The population routines of `include/binaryfusefilter.h` have been removed;
  allocation, lookup and serialization remain. The alternate XOR population routines are removed
  too; XOR performance is not scored.

  ## What you may change

  - `include/`: edit the headers and add header-only helpers there, at most 32 changed files.
  - Keep the `binary_fuse8_*` and `binary_fuse16_*` allocate, populate, contain and free APIs;
    the filter structs may change. Helpers must build with `cc -std=c99 -O3 -fno-lto -DNDEBUG`
    and `-lm`.
  - Everything else (benchmarks, tests, build files) stays unchanged; no symlinks or binary files.
  [……省略约 690 词……]
  ```
- **限制：** 只能改 `include/` 下的文件，最多改 32 个；Agent 有 2 核 4 GiB，可以提交 100 次开发评测，单次评测限时 180 秒。
- **判分：** 先过正确性检查，再和参考实现比三项指标：常驻内存、构建时间、单次查询时间。在每个隐藏工作负载上三项都严格更低，并且假阳性率和空间开销不比参考差，才算通过。连续分是三项指标得分的平均，和参考持平约 50 分。

**数据格式：** 一题一个目录，按方向分组，放在 `tasks/problems/<方向>/<题目名>/`。

```
binary_fuse_filter/
├── task.toml    配置：资源、时限、开发评测次数、可改路径、反馈给 Agent 的指标
├── README.md    给人看的题目说明
├── repo/        Agent 起步的代码仓库，其中的 README.md 是题面
├── docker/      agent.Dockerfile 和 verifier.Dockerfile，GPU 题另有对应文件
├── datasets/    train.json 和 eval.json，开发与最终工作负载的描述
└── judge/       判分程序 evaluator.py 和参考实现 reference.patch，Agent 看不到
```

## 评估流程

1. **启动：** 评测平台要装进使用者自己的 AWS 账号。用 `scripts/frontier_deploy.py` 依次执行 `validate`、`preflight`、`plan`、`apply`、`verify` 完成部署，然后在管理界面里选题目和 Candidate 发起运行。GPU 题另需 Modal 账号。
2. **环境：** 每次运行有两个容器，Agent 容器和判分容器，镜像按摘要固定。Agent 容器不能访问外网，模型调用经过平台的网关。仓库内置 Codex 这个 Candidate，另给出 Claude Code、Antigravity、OpenCode 等十种 Harness 的构建配方。
3. **执行：** Agent 读题面、改代码、多次调用 `frontier-submit train` 看开发分数，最后调用一次 `frontier-submit final`。
4. **判分：** 判分容器里的共用程序把补丁打到干净仓库上，检查改动有没有越界，再调用该题的 `evaluate` 在隐藏工作负载上实测，和参考实现逐项比较。全程是程序判分，不用 LLM。
5. **算分：** 单题给出是否通过和一个 0 到 100 的连续分；没有最终提交记 0 分。汇总成通过率和 FCI，FCI 的 90% 区间由对题目做自助抽样得到。

## 资料依据

依据：仓库 commit `1867a90`（2026-11-16），读了 README、两道题的题目文件和共用判分代码；论文摘要和官网榜单数据于 2026-11-18 访问。没有部署和运行；48 题里只细读了 `binary_fuse_filter` 和 `bbq_packet_scheduling` 两题；论文和官网提到的一百多道私有题没有公开，无法核实；FCI 的拟合细节只读了官网说明。
