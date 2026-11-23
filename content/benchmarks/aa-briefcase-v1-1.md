---
id: "B14"
order: "2.2"
title: "AA-Briefcase v1.1"
aliases: []
summary: "把 Agent 放进一个塞满公司资料的离线沙箱，让它按任务书做出财务模型、PPT、备忘录等交付文件，再由 LLM 评审逐条核对细项，并和别的模型的交付物两两比较。"
domain: "专业知识工作"
subject: "Agent 任务，Harness 由官方自备"
task: "文件交付物"
scoring: "LLM 评审"
access: "部分公开"
sampleCount: "91（4 个场景，全部私有）"
reviewed: "2026-11-18"
links: [{"label": "榜单", "url": "https://artificialanalysis.ai/evaluations/aa-briefcase"}, {"label": "发布文章", "url": "https://artificialanalysis.ai/articles/aa-briefcase"}, {"label": "方法说明", "url": "https://artificialanalysis.ai/methodology/intelligence-benchmarking#aa-briefcase"}, {"label": "示例数据", "url": "https://huggingface.co/datasets/ArtificialAnalysis/AA-Briefcase-Lite"}]
---

## 评估对象

**能力：** 在长周期知识工作项目里，从大量零散、互相矛盾的资料中找出依据并做成专业交付物的能力。四个正式场景是数据科学、产品管理、银行运营、重工业战略，每个场景是一个持续数周的项目。出品方 Artificial Analysis 用自家开源 Harness Stirrup 统一运行，榜单比较的是模型。

**指标：** 主指标 AA-Briefcase Elo，由三部分合成：rubric 通过率（通过的检查项数除以总检查项数）、分析质量 Elo、呈现质量 Elo。Elo 以 GPT-5.5 (medium) 为 1000 定标。截至 2026-11-18 访问官方榜单页，最高是 Claude Sonnet 5.5 (Max) 1815（95% 置信区间 -11/+12），其次 Claude Opus 5.5 (Max) 1800。v1.1 相对 2026-06-18 发布的 v1 只改了 Elo 的拟合方法，题目不变。

## 任务格式

每道题是项目某一周里的一件交付物。Agent 拿到场景概述、本周概述、任务书和应交文件名，沙箱里挂着只读的资料库（全场景共用的和本周新增的），包括 Slack 导出、邮件、PDF、表格、访谈记录等；四个正式场景合计近 2,000 个源文件。Agent 只有一个执行命令的工具（支持图像的模型另有看图工具），不能联网，不能向用户提问，最多 500 轮，最后调用 `finish` 提交文件路径，或调用 `abandon_task_finish` 放弃。同一场景的各题独立运行，不继承自己前面题目的产出。

**示例（正式题未公开；以下是官方公开示例场景 AA-Briefcase-Lite 的 `w1_t2`，不计入榜单）**

- **需求**（任务书概括）：你协助一家虚构私募基金的副总裁，对一家新西兰鸡蛋生产商做收购前尽调。请做一份新西兰鸡蛋市场的 Excel 模型：过去 3 年的市场规模、未来 5 年预测、2027 年底笼养禁令的转型情景，并纳入标的公司的鸡群数据和需求、成本敏感性。
- **原始题目**（公开示例场景的任务书 `tasks/w1_t2.md` 全文；它填在用户消息模板的 `<task_description>` 里，同一条消息还内嵌场景概述、本周概述和应交文件名，模板见数据集 README）：

  ```text
  # Task 2: Market Model

  ## Objective

  Develop a comprehensive Excel workbook modeling the NZ egg market. This model will provide a clear
  quantitative foundation for the deal team. Note that the deal team will continue to use and update this model
  in the coming weeks as new data arrives through diligence.

  ## Requirements

  - Build an Excel workbook the deal team can keep refreshing as new diligence data arrives.
  - Calculate historical market size (looking back 3 years) and a 5-year forecast.
  - Include cage-ban transition scenarios for the colony cohort by end-2027.
  - Incorporate Aurora Eggs' flock data.
  - Reflect consumer-demand sensitivity in the forecast.
  - Carry the cost-side input-cost and supply-side sensitivities that bear on the underwriting horizon.

  ## Deliverable

  **Filename:** `market_model.xlsx`
  ```
- **输入材料：** 67 份资料（147 个文件），含行业报告、专家访谈记录、公司分析规范、Slack 聊天导出、邮件附件，其中故意埋了互相矛盾的说法。
- **要做的：** 交付 `market_model.xlsx`。
- **判分：** 12 条二元检查加 2 条成对比较。二元检查例如「至少有三个有名字的转型情景，且各情景的价格走势不同」「金额用美元并按公司统一假设表里的分年汇率换算」「自下而上的份额数据采用指定专家的口径，不采用另一位已被内部叫停引用的顾问的说法」。

**数据格式：** 正式题未公开。公开示例场景的结构如下，官方称正式场景结构相同。

```
AA-Briefcase-Lite/
├── tasks.jsonl           每题一行：task_id、任务书路径、应交文件名、挂载的 shared_files 和 week_files
├── tasks/w1_t2.md        给 Agent 的任务书
├── summary_docs/         场景概述和本周概述，和任务书一起给 Agent
├── source_files/shared/  整个场景共用的资料
├── source_files/week/    本周新增的资料
├── checks.jsonl          63 条检查：check_type（A 准确性、C 关键洞察、AQ 分析质量、P 呈现）、
│                         scoring_type（binary 或 pairwise）、通过与不通过标准、所需源文件 files_needed
├── grader/               评分细则、资料与检查项的对应关系、每条检查的证据链
├── prompts/              Agent 提示词和 rubric 评审提示词原文
└── submissions/          6 个模型的交付物样例
```

## 评估流程

1. **启动：** 正式评测由 Artificial Analysis 自己运行并发布结果。题目、资料、评分细则都不公开，外部无法复现正式分数；公开的只有示例场景的数据和提示词。
2. **环境：** 每个场景的每一周对应一个 E2B 沙箱，预装 Python 数据栈、LibreOffice、Pandoc、TeX Live、FFmpeg 等，完全断网，单条命令 20 分钟超时。上下文快满时 Stirrup 会把较早的历史压缩成摘要。
3. **执行：** 每题跑 1 次。Agent 读资料、写脚本、生成文件，交付物须按任务书指定的文件名放在 `/home/user` 下并通过 `finish` 提交，没提交的不判。
4. **判分：** 全部由 LLM 评审，评审只看到任务书、检查项和交付物内容，看不到源文件。二元检查（A、C 类）逐条判通过或不通过，不给部分分；成对检查（AQ、P 类）把两个模型对同一题的交付物放在一起，选出更好的一份或判平。两类检查各有一个三家模型组成的评审团，每条检查从中抽一位，同一条 rubric 检查始终由同一位评审判。
5. **算分：** rubric 结果通过虚拟的两两对局折算成 Elo，再和分析质量、呈现质量两项成对比较的 Elo 一起，用最大似然（Crowd-BT 模型）合成总 Elo。

## 设计上值得学什么

评估文件交付物时，评分细则可以针对成品逐项提出可观察的要求。这样比分配一个笼统的总分更容易定位短板。

## 资料依据

依据：官方榜单页、发布文章、方法说明页（均为 2026-11-18 访问）；Hugging Face 数据集 `ArtificialAnalysis/AA-Briefcase-Lite`（commit `4dec557`，2026-06-19）的 README、`tasks/w1_t2.md`、`tasks.jsonl`、`checks.jsonl`。正式的 91 题没有公开，题目形态只能从示例场景和官方描述推知；三部分合成总 Elo 的具体权重官方没有给出。
