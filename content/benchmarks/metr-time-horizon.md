---
id: "B52"
order: "8.3"
title: "METR time horizon（Time Horizon 1.1）"
aliases: ["METR time horizon"]
summary: "一种度量方法：让 Agent 做一批已知「人类专家要花多久」的软件类任务，拟合成功率随任务时长下降的曲线，读出成功率为 50% 时对应的人类任务时长。"
domain: "长程自主与综合 Agent"
subject: "Agent 任务，Harness 由官方自备"
task: "多种形态混合"
scoring: "脚本/程序"
access: "部分公开"
sampleCount: "228（TH 1.1）"
reviewed: "2026-11-18"
links: [{"label": "官方页", "url": "https://metr.org/time-horizons/"}, {"label": "论文", "url": "https://arxiv.org/abs/2503.14499"}, {"label": "TH 1.1 说明", "url": "https://metr.org/blog/2026-01-29-time-horizon-1-1/"}, {"label": "分析代码与运行数据", "url": "https://github.com/METR/eval-analysis-public"}]
---

## 评估对象

**能力：** Agent 独立完成长任务的能力，用「任务对人来说有多长」来刻度。它不是一份单独的题集，背后是出品方 METR 的三组任务。按公开运行数据统计，TH 1.1 的 228 题里 157 题来自 HCAST（软件工程、机器学习、网络安全和一般推理，人类耗时约 1 分钟到 30 小时），5 题来自 RE-Bench（机器学习研究工程，各按 8 小时计），66 题来自 SWAA（软件工作中 1 到 30 秒的单步动作）。2025 年 3 月的初版 TH 1.0 是 170 题。被测的是 Agent，即模型加脚手架（ReAct、Triframe 等，由 METR 在开发集上挑选）。

**指标：** 50% 时间跨度，单位是人类专家的耗时，同时报 80% 时间跨度和 95% 置信区间。它衡量任务难度，不是 Agent 实际运行多久。官方页已于 2026-09-08 声明不再更新。截至 2026-11-18 访问该页及其数据文件，26 个模型里最高是 Claude Mythos Preview（early）约 17.4 小时（置信区间约 8.5 至 55 小时），但页面注明超过 16 小时的测量在现有任务集上不可靠；其次是 Claude Opus 4.6 约 12.0 小时。

## 任务格式

HCAST 和 RE-Bench 的任务由一段说明、起始资源（代码、数据、文档）和一个自动评分函数组成。Agent 在任务环境里用 Bash 和 Python 多步工作，到 token 或时间上限为止，最后提交结果，得分在 0 到 1 之间。SWAA 是单步的选择题或填空题，直接调一次模型。任务按相似程度归成任务族，TH 1.1 共 79 个。

**示例（题目未公开，以下为官方披露的任务形态）**

- **需求：** 任务族 `munge_data`，论文表 1 的描述（翻译）：写一个 Python 脚本，把 JSON 数据从一种格式转成另一种，转换规则要从给出的示例文件里自己推断。
- **原始题目**（发给 Agent 的任务说明没有公开：论文和公开的运行数据里都没有它，`munge_data` 也不在 METR 公开的任务仓库 `METR/public-tasks` 里。以下照录论文 arXiv 2503.14499 表 1 的 Description 一栏，全文；它是出品方对任务的描述，不是任务说明本身）：

  `munge_data` 一行（表中 Length 一栏写 56 minutes）：

  ```text
  Write a Python script to transform JSON data from one format to another by inferring the conversion rules from
  provided example files.
  ```

  下面「短任务的样子」提到的 SWAA 任务族 `find_shell_script` 一行（Length 一栏写 3 seconds）：

  ```text
  Multiple choice: “Which file is a shell script?”
  Choices: “run.sh”, “run.txt”, “run.py”, “run.md”
  ```
- **人类耗时：** 公开数据里这个族有 4 题，由人类基线测得的耗时从 8.1 分钟（`munge_data/very_easy`）到 129.3 分钟（`munge_data/trajectories`）。
- **判分：** 任务的评分函数给分，再按任务各自的阈值记成成功或失败。在公开数据里，Claude Mythos Preview（early）在 `munge_data/trajectories` 上 4 次运行成功 1 次，在另外 3 题上 4 次全部成功。
- **短任务的样子：** SWAA 的 `find_shell_script`，人类约 3 秒，题目是「哪个文件是 shell 脚本？」，四个选项是 run.sh、run.txt、run.py、run.md。

**数据格式：** 多数任务的内容不公开，以免进入训练数据。公开的是每次运行的结果，`runs.jsonl` 每行一次运行，其中也包含人类基线的记录。

```
task_id              任务编号，如 acdc_bug/fix_checkpointing
task_family          任务族
task_source          HCAST、RE-Bench 或 SWAA
alias                模型的公开名称；人类基线记为 human
score_cont           连续得分，0 到 1
score_binarized      按阈值二值化后的结果，1 为成功
human_minutes        该任务的人类耗时，单位分钟
human_source         baseline（实测基线）或 estimate（估计）
scaffold             所用的脚手架
invsqrt_task_weight  这次运行在拟合中的权重
```

## 评估流程

1. **人类耗时：** 请有相关经验的专业人员在与 Agent 相同的环境和说明下尽快完成任务，全程录屏。取成功完成者耗时的几何平均作为该任务的时长。SWAA 由内部员工用专门的计时网页测。没有可靠基线的任务用专家估计或质检试做的时间。TH 1.1 的数据里 162 题是实测、66 题是估计；8 小时以上的 31 题里只有 5 题是实测。RE-Bench 一律按 8 小时计，成功阈值取 7 到 9 小时人类运行的平均得分。
2. **运行：** 模型接上脚手架，TH 1.1 用 Inspect 框架（TH 1.0 用 Vivaria）。先在一小组开发任务上调试，再在测试集上每题独立跑 6 次，一个模型约 1,000 次运行。
3. **判分与复核：** 每次运行由任务的评分函数自动打分并二值化。之后用 LLM 和关键词搜索标出疑似钻评分漏洞的运行，再由多名人工复核并改分，按标准做法作弊的运行记为失败。
4. **拟合：** 对每个模型做带正则的逻辑回归，自变量是人类耗时以 2 为底的对数，因变量是是否成功。每次运行的权重使每题总权重相等，再乘以所在任务族题数平方根的倒数，以免大任务族占比过高。拟合曲线与 50%、80% 成功率相交处的时长就是两个时间跨度。
5. **置信区间与趋势：** 置信区间来自 1,000 次分层 bootstrap，依次对任务族、任务、运行重采样。再把各模型时间跨度的对数对发布日期做线性回归得到翻倍时间：论文给出 2019 至 2025 年约 7 个月，TH 1.1 数据文件给出 2023 年以来约 129 天。

## 设计上值得学什么

用专家耗时给任务标尺度，可以把成功率与任务长度关联起来。解释结果时，要同时写清任务领域、拟合方法和不确定性。

## 资料依据

依据：官方页 metr.org/time-horizons 及其数据文件 `benchmark_results_1_1.yaml`、`task_results_1_1.yaml`，TH 1.1 发布说明（2026-01-29），GPT-5.6 Sol 评估摘要（2026-06-26），以上访问日期 2026-11-18；论文 arXiv 2503.14499 全文；GitHub `METR/eval-analysis-public` commit `52cb829`（2026-03-06）的 README、拟合与 bootstrap 源码、TH 1.1 的 `runs.jsonl`（24,008 行，任务来源和人类耗时来源的题数由此统计）。没有核实的内容：HCAST 和 RE-Bench 的任务原文与评分函数没有读到，任务形态只来自论文的描述；每次运行的 token 和时间上限、正则强度的具体数值没有查到；官方页停更后的模型没有统一口径的数值，METR 对 GPT-5.6 Sol 给出约 11.3 小时但声明不可靠。
