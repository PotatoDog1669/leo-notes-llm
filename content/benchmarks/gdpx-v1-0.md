---
id: "B17"
order: "2.5"
title: "GDPx v1.0"
aliases: []
summary: "研究机构 SemiAnalysis 联合 14 家数据合作方，在芯片设计、网络安全、金融、法律等 11 个高价值领域各出一批长任务，让模型在沙箱里连续工作最多 8 小时，按各领域自己的方式判分后等权平均。"
domain: "专业知识工作"
subject: "Agent 任务，Harness 也是变量"
task: "多种形态混合"
scoring: "混合"
access: "部分公开"
sampleCount: "206"
reviewed: "2026-11-18"
links: [{"label": "官网榜单", "url": "https://gdpx.semianalysis.com"}, {"label": "发布文章", "url": "https://newsletter.semianalysis.com/p/gdpx-measuring-frontier-model-capabilities"}]
---

## 评估对象

**能力：** 在专业领域里独立完成长周期实际工作的能力。11 个领域和题量是：芯片设计 34、材料科学 23、金融 24、硬件设计 21、法律 20、网络安全 18、对齐 18、软件工程 15、生物 13、量化交易 10、递归自我改进（机器学习研究工程）10。出品方有意不按 GDP 占比或职业分类取样，只选它认为前沿模型最能产生收入的领域。榜单按模型排名，每个模型在自己厂商的原生 Harness 里运行。

**指标：** 总分是百分比。每题跑 3 次，按该题原定的判分方式取 3 次的平均；同一领域内各合作方等权，11 个领域再等权平均。截至 2026-11-18 访问官网榜单，最高是 Claude Fable 5.2 的 16.4%，其次 Claude Opus 5.5 12.0%、Gemini 4 Carbon 10.9%。2026-11-02 的发布文章写的最高分是 12%，当时榜上还没有 Claude Fable 5.2。

## 任务格式

各领域的题由对应合作方出，形态差别很大：金融和法律题交付 Excel、Word、PDF 文件；软件工程和芯片设计题在代码库和仿真流程里改代码；硬件设计题在 SolidWorks、Fusion 360、KiCad、Vivado 等工程软件里做图；网络安全题在多服务的企业环境里找漏洞并利用；量化交易题用 IEX 逐笔行情写策略。共同点是模型在沙箱里拿到一段任务说明和一个工作目录，在限时内自行完成，到时即停，按当时的成果判分。

**示例（真题 `bellwood-qoe`，金融领域的公开题，合作方 Living Context）**

- **需求**（任务说明概括）：你有 8 小时，机器 2 核 CPU、8 GiB 内存、无 GPU。同事 Tyler 被调去做别的项目，请接手他没做完的 Bellwood 公司盈利质量（quality of earnings）数据簿：核对截至 2026-03-31 的过去十二个月 EBITDA 的管理层调整和尽调调整、净营运资本及建议目标值、净债务和类债务项目。
- **原始题目**（官网金融领域页公开的这道题的任务说明全文，来源 GDPx by SemiAnalysis，https://gdpx.semianalysis.com/domains/finance ）：

  ```text
  You have 8 hours of wall-clock time for this task. Your machine has 2 CPUs, 8 GiB of RAM and no GPU. When the
  time is up, you are stopped and your work is graded as it stands.

  Tyler got pulled onto the Haverly closing statement review this week, so I need you to pick up his Bellwood
  databook under Change Order 3 and finish it. It's Friday, May 22, and Alex wants our numbers next week.

  What I need is the quality of earnings on Bellwood's twelve months to March 31, 2026: management's adjustments
  and our diligence adjustments to LTM EBITDA, net working capital with a proposed target, and net debt and
  debt-like items. Keep it on the same basis and conventions as our Haverly QoE. Set the target at the average
  of the twelve month-ends from April 2025 through March 2026. Take working capital and net debt on the
  definitions and accounting principles in the latest draft of the purchase agreement, as if the deal closed on
  July 15 on the March 31, 2026 balance sheet.

  Tyler's workbook and everything we have on Bellwood are in the engagement folder. Mark up his workbook rather
  than starting a new one: keep his tabs, columns, line labels, units and signs, put each corrected figure in
  the cell that holds his, add any new line just above the total on its tab, and say in the notes column what
  each line is based on. Save it as `/output/HAV25 Bellwood QoE databook.xlsx`.
  ```
- **输入材料：** 工作目录 `/app/world`，是一桩真实私募股权交易的仿制资料库（整个金融领域共用约 4,000 个文件），含目标公司的账簿、银行流水、工资记录、账龄表、合同与往来邮件导出、收购协议草稿，以及 Tyler 做到一半的工作簿。
- **要做的：** 把修订后的工作簿写到 `/output`，保留原本正确的条目，改掉有问题的，每项发现要在 EBITDA 调节表、十二个月营运资本余额和净债务三处对上，并注明证据。
- **判分：** 拆成 11 项检查，通过项数达到门槛才算过，否则记 0。官方披露的 25 次尝试里没有一次通过，单次最好成绩是过 8 项。

**数据格式：** 官方没有发布题库文件。官网公开的是 14 道公开题的任务说明和 168 份运行记录，记录的存放路径如下。

```
rollouts/
└── bellwood-qoe/                    公开题的题目名，共 14 个
    └── gpt-6-astra/                 模型名
        └── <运行编号>/
            └── transcript.<哈希>.jsonl.gz   这次运行的完整对话和工具调用记录
```

## 评估流程

1. **启动：** 由 SemiAnalysis 自己运行并发布结果，私有题和评分器不对外，外部无法复现。
2. **环境：** 每题一个沙箱，基础设施由 Modal 提供，开源模型的推理由 Fireworks 提供。有原生 Harness 的模型用原生的（Claude Code、Codex、Antigravity 等），没有的统一用 OpenCode。
3. **执行：** 每题跑 3 次，默认限时 8 小时，部分题更短。
4. **判分：** 随领域而定。生物题全部按真实实验数据做确定性判分；量化交易题把策略在未公开交易日上的逐日盈亏和参考策略做单侧配对 t 检验，p 值低于 0.01 得 1 分，高于 0.5 得 0 分，中间线性折算，不用 LLM；硬件设计题是确定性验证器加 LLM 按专家 rubric 评审；法律题由 LLM 按专家写的 rubric 逐条判，每份产出判 5 次；金融和法律题原定是过门槛才得分的二元判分。
5. **算分：** 按上面的等权方式平均。金融和法律两个领域在二元判分下所有模型都是 0 分，所以官方另外报告这两个领域的平均部分得分。

## 资料依据

依据：GDPx 官网首页、领域页（总览、金融、法律）和运行记录页（2026-11-18 访问，页面标注 v1.0）；SemiAnalysis 发布文章（2026-11-02 发表，2026-11-18 访问）。发布文章在「The future of GDPx」之后是付费内容，没有读到。没有核实的部分：14 道公开题的环境文件和评分器是否可以下载；网络安全、材料科学、对齐、软件工程等领域的判分细节只读了文章里的概述；官方提到部分模型在网络安全、生物、对齐领域的得分受安全分类器拦截影响，具体影响幅度没有核对。
