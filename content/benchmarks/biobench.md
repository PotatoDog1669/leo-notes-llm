---
id: "B43"
order: "6.2"
title: "BioBench（benchmarks.bio）"
aliases: ["BioBench"]
summary: "给 Agent 一份真实的生物实验数据和一个分析问题，让它自己写代码做分析，交回一个结构化答案，再由判分程序对照预先算好的参考结果判对错。榜单上的「BioBench」指 LatchBio 的 benchmarks.bio，是一组子基准的合集，不是单一题库。"
domain: "自然科学"
subject: "Agent 任务，Harness 也是变量"
task: "终端/容器任务"
scoring: "混合"
access: "部分公开"
sampleCount: "综合分含 13 个子基准共 1228 题（V1）"
reviewed: "2026-11-18"
links: [{"label": "榜单", "url": "https://benchmarks.bio/"}, {"label": "scBench 仓库", "url": "https://github.com/latchbio/scbench"}, {"label": "scBench 论文", "url": "https://arxiv.org/abs/2602.09063"}]
---

## 评估对象

**能力：** 分析真实实验数据并得出正确科学结论的能力。站点（截至 2026-11-18 访问，数据更新于 2026-11-17）共有 21 个子榜单：单细胞转录组（scBench）、空间转录组（SpatialBench）、表观基因组（EpiBench）、遗传变异（VariantBench）、宏基因组（MetagenomicsBench）、药物研发（TxBench 系列，抗体、寡核苷酸、临床前药理）、肿瘤（OncologyBench），以及生物安全相关的监测与功能分析子集（BioSecBench 系列）等。被测的是 Agent，每一行成绩都同时标明模型和 Harness（Pi、Claude Code、Codex 等）。

**指标：** 综合分 Capabilities 由其中 13 个子基准合成：每个子基准先算通过率，再按配置的题数加权平均；最多允许缺 2 个子基准，缺的不计入而不是记 0。另有一个独立的 Safeguards 分，只来自 BioSecBench-Refusal，衡量模型对有害请求的拒绝和对常规请求的配合，不计入综合分。截至 2026-11-18 访问官方榜单页，综合分最高是 58.0%（Claude Opus 5.5 + Pi，带星号，属于 Anthropic 放宽安全过滤的 LSVP 评测变体）；不带豁免的最高是 54.2%（Claude Sonnet 5.5 + Pi，覆盖 12/13）。站点说明 V1 换了题目和算分方式，与历史 V0 分数不可比。

## 任务格式

以 scBench 为例（其余子基准的题目没有逐一查看）：Agent 拿到一段自然语言任务和一个工作目录，目录里是某个分析步骤之前的数据快照（AnnData `.h5ad` 文件）。它自己读数据、写代码、跑分析，最后按题目规定的 JSON 格式交答案（写进 `eval_answer.json` 或放在 `<EVAL_ANSWER>` 标签里）。题目的设计是不实际分析数据、只凭先验知识作答就会答错。

**示例（真题 `bd_rhapsody_tnbc_panel_aware_qc`，scBench 公开的 6 道样例之一）**

- **需求**（原文翻译）：这份 BD Rhapsody 单细胞数据来自一个三阴性乳腺癌队列的免疫细胞。先决定保留哪些细胞用于下游分析，再刻画外周血部分的主要免疫谱系。报告三个数：质控后保留的外周血细胞数、每个保留细胞检出基因数的中位数、归为经典单核细胞的细胞数。
- **原始题目：** 不转载。这道题的原文在仓库 `evals/qc/bd_rhapsody_tnbc_panel_aware_qc.json` 的 `task` 字段里（英文，约 80 词），但 scBench 公开的 6 个样例文件每个都带 canary 标记，写明基准数据不应进入训练语料；benchmarks.bio 网站和 scBench 论文正文都没有贴出任何一道题的题面原文，所以这里不照录。上面的「需求」是该字段前两段的翻译，第三段规定答案的 JSON 格式。
- **输入材料：** 一份合并后的 AnnData 数据（16136 个细胞、386 个基因）。
- **要做的：** 题目没有明说这是一个只测 386 个基因的靶向 panel。照搬全转录组教程里的质控阈值（如每个细胞至少 200 个基因）会把细胞全部滤掉，Agent 要从数据形状和分布里自己看出这一点。
- **判分：** 三个数都落在参考值的容差内才算通过：14346 ± 800、68 ± 8、2592 ± 1000。

**数据格式：** scBench 一题一个 JSON 文件。仓库只放了 6 道样例，完整的 195 题为防止进入训练语料而不公开；数据文件放在 Latch 平台上，用 `data_node` 引用。

```
evals/qc/bd_rhapsody_tnbc_panel_aware_qc.json
├── id          题目标识
├── task        给 Agent 的任务文字，含答案格式
├── data_node   数据文件在 Latch 平台上的地址（latch://…）
├── grader      判分器：type（如 numeric_tolerance）和 config（参考值 ground_truth、容差 tolerances）
├── metadata    任务类别 task、测序平台 kit、时间跨度 time_horizon
├── notes       出题说明：考什么、参考值怎么来的、常见错误
└── canary      防训练污染的标记串
```

## 评估流程

1. **启动：** 榜单成绩由 LatchBio 自己跑出并发布，网站上没有看到对外的提交入口。公开样例可在本地用 `scbench run <题目.json> --agent minisweagent --model <模型>` 运行，也可以用 `EvalRunner` 接入自己的 Agent 函数。
2. **执行：** 运行器为每题准备工作目录和数据，把任务文字交给 Agent，Agent 结束后读取它的答案。站点的导入记录显示每题跑多次（例如 100 题对应 300 次尝试）。容器和联网等环境细节没有查到。
3. **判分：** 由判分程序对照参考结果，不看分析过程。scBench 有五类判分器：数值容差、选择题、标记基因列表的精确率和召回率、细胞类型集合的 Jaccard 相似度、细胞类型比例分布比较。站点说明另有少数子基准（RareDiseaseBench、OncologyBench）按 rubric 评分，BioSecBench-Refusal 的拒绝判定由评审模型或平台标签给出。
4. **算分：** 每题通过或不通过，子基准得分是通过率。拒绝、超时、出错怎么计，各子基准口径不同：多数算失败，个别从分母里剔除。综合分的算法见上文「指标」。

## 资料依据

依据：benchmarks.bio 首页、`llms.txt`、`results/v1/index.md` 及 scBench、SpatialBench 两个子榜单页（访问日期 2026-11-18，数据日期 2026-11-17）；`latchbio/scbench` 仓库 commit `106726f`（2026-11-16）的 README、`docs/`、`evals/` 样例和 `scbench/cli.py`；`latchbio/latch-eval-tools` 的 README；scBench 论文摘要。frontierlist 榜单上「BioBench」的链接指向 benchmarks.bio，但该站点自己不用这个名字。只细读了 scBench；其余 20 个子榜单只读了站点上的一句话描述和题数，没有看题目、数据是否公开和判分细节。1228 是把站点列出的 13 个计入综合分的子基准 V1 题数相加得到的（21 个子榜单合计 1802）。没有实际运行。
