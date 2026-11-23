---
id: "B27"
order: "3.3"
title: "DeepRSI"
aliases: []
summary: "给 Agent 一个取自真实机器学习研究的开放式优化题和一份能跑的基线，让它在 48 小时内尽量把指标做高；用它看不到的私有评分器给成绩，再把各模型在每题上两两比较，拟合成 Elo 分。"
domain: "机器学习研发"
subject: "Agent 任务，Harness 由官方自备"
task: "模型训练/实验"
scoring: "脚本/程序"
access: "部分公开"
sampleCount: "15"
reviewed: "2026-11-18"
links: [{"label": "网站与榜单", "url": "https://www.deeprsi.com/"}, {"label": "发布文章", "url": "https://www.deeprsi.com/blog/"}]
---

## 评估对象

**能力：** 长时间自主做机器学习研究并持续改进一个基线的能力。15 题分四类：深度学习训练 6 题（改训练方法，使模型在留出数据上更好）、估计器改进 4 题（提高预测准确度）、加速与算子 3 题（在结果不变的前提下让 GPU 代码更快）、算法优化 2 题（改进搜索、压缩、去噪程序）。出品方 Hillclimb 称题目来自与一线研究者合作时观察到的真实研究环境。被测的是 Agent；官方统一用 Pi 这个极简 Harness 加各模型的最高推理强度，比较的是模型。

**指标：** Elo 分。每题的原始成绩是「相对基线的提升幅度」，Elo 由各模型在每题上的两两胜负用 Bradley–Terry 模型拟合，基线（starter）固定为 0 分。截至 2026-11-18 访问官方榜单页（页面数据生成于 2026-10-31），8 个模型中最高是 Claude Opus 5.5 的 1629（95% 自助法区间 1231 到 2655），其次 Claude Fable 5.1 的 1548、GPT-6 Astra 的 1232。

## 任务格式

Agent 拿到一份说明和一个起始文件夹。说明写明要优化什么、怎么自测、哪些做法被禁止，不规定研究方法。工作区里有一个公开评分器，Agent 想跑多少次都可以；每跑一次，系统就给当时的代码环境存一个快照。交付物就是工作区里改好的代码或产物，没有单独的提交动作。时间预算 48 小时，全程不能上网。

**示例（题目 `SIFT1M 32-MiB Vector Search`；完整说明和起始文件未公开，以下概括自官网的题目概述）**

- **需求**（概括自官网的题目概述）：改进一个向量检索包（一百万个 SIFT1M 向量的压缩副本加检索代码），让每个查询返回的 10 个结果里有更多真正的最近邻。整个包不得超过 32 MiB，约合每个数 2 比特。
- **原始题目**（发给 Agent 的完整说明未公开；以下是官网题目页上的题目概述全文，是出品方写给读者的介绍，不是任务说明）：

  ```text
  An agent must improve a search package, the compressed copy of one million stored vectors plus its search
  code, to find more of each query's 10 closest vectors. Each vector, from the SIFT1M dataset, holds 128
  numbers describing a small photo patch. The whole package must fit in 32 MiB, roughly 2 bits per number.
  Compression makes distances approximate, so the search misses some of the true 10 closest vectors. The
  starter, the package the agent begins with, cuts each vector into 32 chunks of 4 numbers. For each of the 32
  chunk slots, it picks 256 typical chunks, then replaces each real chunk with a one-byte number naming its
  closest typical chunk. These 32 bytes per vector fill almost the whole budget. The agent may rebuild the
  package by any method, using the original vectors and 10,000 practice queries with known answers. When
  searching, the package sees only its own files and the queries, and may run only Python with the NumPy,
  PyTorch and FAISS libraries. The grader runs the package on 10,000 queries the agent never sees, allowing 4
  minutes in total, 16 CPU cores and 8 GiB of memory. Recall is the share of the 10 returned vectors that are
  among the query's true 10 closest, ties included, averaged over all queries. Higher is better. The reward is
  the agent's recall divided by the starter's, minus one, or 0 if the agent does no better, so raising recall
  from about 66% to about 72.5% earns 0.1. A package that breaks any limit earns a reward of 0.
  ```
- **初始状态：** 基线把每个向量切成 32 段，每段用 256 个典型片段之一的编号表示（即乘积量化），召回率约 66%。Agent 可以使用原始向量和 1 万个带答案的练习查询。
- **限制：** 检索时只能读包内文件和查询，只能运行 Python 加 NumPy、PyTorch、FAISS；评分时总共给 4 分钟、16 核 CPU、8 GiB 内存。
- **判分：** 在 Agent 没见过的 1 万个查询上算 recall@10。奖励等于 Agent 的召回率除以基线的召回率再减 1，不如基线记 0，违反任何限制记 0。例如从 66% 提到 72.5% 得 0.1。

**数据格式：** 题目环境和评分器没有公开下载。官网为每题提供一个 JSON 文件（`/data/tasks/<题目名>.json`），记录全部运行及其检查点，字段如下。

```
trials[]                     该题的每次运行
├── trial / model / agent / effort   运行编号、模型、Harness（pi）、推理强度
├── reward                   最终奖励，即私有评分器给出的相对基线提升
├── valid / error            成绩是否有效、运行的结束原因
└── duration_s / steps / cost_usd / tokens_m   用时、步数、API 花费、token 数（百万）
waypoints{运行编号: []}      该次运行的每个检查点
├── seconds                  距开始的秒数
├── reward                   私有评分器对该快照的评分
└── public_reward            Agent 当时从公开评分器看到的评分
```

## 评估流程

1. **启动：** 由 Hillclimb 自己运行，没有公开的运行命令或提交入口。官方称今后会冻结首批模型的 Elo，把新提交与它们比较。
2. **环境：** 每次运行一个云沙箱，无网络。15 题里 11 题带 GPU（多数是 1 块 H200，另有 2 块 H200、1 块 B200、1 块 RTX PRO 6000 各一题），4 题只用 CPU；多数是 16 核、64 GB 内存。沙箱寿命上限 24 小时，所以在第 24 小时会换沙箱并迁移文件系统快照，运行中的进程会被中断，Agent 会被提示检查是否需要重启。
3. **执行：** 每个模型每题跑 2 次。Agent 如果提前结束，系统用一句简短的续跑提示自动恢复会话，让它尽量用满 48 小时；少数情况下 Agent 恢复后只是快速连续重交最后的结果，这类运行会被提前终止。
4. **判分：** 运行结束后，私有评分器给每个快照和最终代码评分；多数题用的是 Agent 从未见过的留出数据。只有私有评分器的分数计入成绩，公开评分器只是给 Agent 的实时反馈。两者之差被官方用来衡量过拟合。
5. **算分：** 每题上，每个模型的每次运行与其他模型的每次运行两两比较奖励高低，再用 Bradley–Terry 模型拟合各模型的强度，换算成 Elo，使 P(i 胜 j) = 1 / (1 + 10^((Rj − Ri)/s))。榜单按 48 小时结束时的成绩排名，并给出对题目和运行重抽样 5000 次得到的 95% 区间。

## 资料依据

依据：官方网站首页、发布文章（2026-10-12，作者 Pruthvi Rajaghatta 等）、页面内嵌数据（生成于 2026-10-31）和 `SIFT1M` 题的 JSON 数据文件，均为 2026-11-18 访问。没有找到论文、代码仓库或可下载的题目环境，评分器的具体实现无从核实，流程部分全部来自官方自述。发布文章写 Fable 领先，当前榜单第一是后来加入的 Opus 5.5。
