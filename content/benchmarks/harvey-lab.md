---
id: "B16"
order: "2.4"
title: "Harvey LAB"
aliases: []
summary: "给 Agent 一份律所客户案卷（一个装满合同、备忘录、邮件的文件夹）和合伙人口吻的一句话指示，让它写出可供审阅的法律工作成果，再由 LLM 评审按专家写的逐条标准判通过或不通过，全部通过才算完成。"
domain: "专业知识工作"
subject: "Agent 任务，Harness 由官方自备"
task: "文件交付物"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "2010（仓库 2026-11-11 版）"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/harveyai/harvey-labs"}, {"label": "发布文章", "url": "https://www.harvey.ai/blog/introducing-harveys-legal-agent-benchmark"}]
---

## 评估对象

**能力：** 在长程法律工作中从一句宽泛的指示出发，自己在案卷里找出相关文件、跨文件发现问题、写出成文交付物的能力。全称 Legal Agent Benchmark，由 Harvey 出品。任务分 `analyze`、`draft`、`review`、`research` 四种工作类型，按业务领域放在 27 个目录下（并购、知识产权、公司治理、信托遗产、诉讼、税务等，另有 498 题的 `contracts` 和 250 题的 `firm-knowledge`）。被测的是 Agent：仓库自带一套 Harness，通过模型适配器换模型，也允许改 Harness。

**指标：** all-pass 率，即所有评分标准都通过的任务占比；另报告「标准通过率」（通过的标准数除以标准总数）作诊断。首版（2026-05-06 发布）是 1250 题、24 个业务领域、7.5 万余条标准；截至仓库 commit `7f9b1ee`（2026-11-11）是 2010 题、约 11.4 万条标准。发布文章说明首发时故意不设榜单；截至 2026-11-18，在仓库和 Harvey 官网研究页没有找到官方总榜，这里不写最高分。不同 release 的分数不保证可比，仓库用 `CHANGELOG.md` 记录每一处会影响分数的改动。

## 任务格式

Agent 拿到一段指示（官方称平均约 50 词，只说要什么，不解释怎么写）和一个只读的 `documents/` 文件夹，里面关键文件和无关文件混在一起，问题埋在多份文件之间。它用 `bash`、`read`、`write`、`edit`、`glob`、`grep` 六个工具工作，把指定文件名的交付物（多为 `.docx`、`.xlsx`）写进 `output/`，再调用 `finish` 结束。沙箱不联网；默认最多 200 轮，每次 `bash` 调用限时 60 秒。案卷文件是在律师指导和审阅下批量合成的，不是真实客户材料。

**示例（真题 `corporate-ma/analyze-change-of-control-provisions-across-targets-material-contracts`）**

- **需求**（原文翻译）：审阅所附收购资料室里的合同和内部备忘录，找出控制权变更条款和转让条款，为交易团队写一份完整的报告。输出：`coc-analysis-report.docx`。
- **原始题目**（`task.json` 的 `instructions` 字段全文）：

  ```text
  Review the attached acquisition data room contracts and internal memo for change of control and assignment
  provisions, and prepare a comprehensive deal team report.

  Output: `coc-analysis-report.docx`
  ```
- **输入材料：** 19 份 `.docx`，包括交易概览备忘录、多份重大合同（许可、信贷、供货、租赁、雇佣等），以及 10-K 节选、递延薪酬计划这类未必相关的材料。
- **要做的：** 判断哪些文件相关，逐份读出控制权变更条款，评估对交易的风险，给出严重程度评级和应对建议。
- **判分：** 57 条标准，覆盖埋在案卷里的 9 个法律问题。例如 `C-002`：报告把 TerraNode 竞争对手除外条款带来的同意风险评为 Critical（或所用的最高等级）则通过，评得更低则不通过。

**数据格式：** 一题一个目录，含一个 `task.json` 和一个 `documents/` 文件夹；没有单独的标准答案文件，评分标准直接写在 `task.json` 里。

```
tasks/<业务领域>/<任务名>/[<场景>/]
├── task.json
│   ├── title          任务标题
│   ├── instructions   发给 Agent 的指示
│   ├── work_type      analyze / draft / review / research
│   ├── deliverables   要求产出的文件名
│   ├── criteria[]     评分标准：id、title、match_criteria（什么情况判 PASS、什么情况判 FAIL）、deliverables（这条标准看哪个交付物）
│   └── tags           检索和分析用的标签
└── documents/         案卷文件（.docx、.xlsx、.eml、.pptx 等）
```

## 评估流程

1. **启动：** 克隆仓库后在本地跑。`uv run python -m lab_core.harness.run --model <模型> --task <任务ID>` 跑一题，`lab_core.utils.sweep` 批量跑并自动接上评分和报告。没有向官方提交成绩的流程。
2. **环境：** 每次运行起一个 Podman 容器，断网（`--network=none`），`/workspace/documents` 只读，`/workspace/output` 可写。
3. **执行：** 系统提示词、技能手册和任务指示一起发给模型，模型循环调用工具，直到调用 `finish`、不再调用工具或达到轮数上限。对话记录、指标和交付物落在 `results/<run-id>/`。
4. **判分：** `lab_core.evaluation.run_eval` 用 LLM 评审逐条判。每条标准单独调用一次评审，评审只看到这条标准指定的交付物、任务标题和 `match_criteria`，回答 pass 或 fail 并附理由。默认用两个评审模型（`claude-sonnet-4-6` 和 `gpt-5.5`）各自独立判一遍。`.docx` 先用 pandoc 转成带修订痕迹和批注的文本再给评审。交付物缺失的标准不调用评审，直接判 fail。不用关键词或正则匹配，也没有人工评审环节；rubric 由律师编写。
5. **算分：** 单个评审下，一题所有标准都通过记 1 分，否则记 0 分，没有部分得分。双评审时取两个评审结果的平均，所以一题的得分是 0、0.5 或 1。全部任务的平均值就是 all-pass 率。

## 资料依据

依据：仓库 commit `7f9b1ee`（2026-11-11）的 `README.md`、`CHANGELOG.md`、`docs/architecture.md`、`docs/eval-strategies.md`、`docs/tutorial.md` 和示例题的 `task.json`；Harvey 发布文章及三篇扩展文章（访问日期 2026-11-18）。题量 2010 是按仓库里 `task.json` 的个数数出来的；约 11.4 万条标准引自仓库文档，没有自己统计。没有实际运行。发布文章预告过的官方榜单没有找到，不确定是否已在别处发布。
