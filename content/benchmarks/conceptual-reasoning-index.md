---
id: "B36"
order: "4.5"
title: "Conceptual Reasoning Index（CRI）"
aliases: ["Conceptual Reasoning Index"]
summary: "把三套题的分数加权成一个指数，衡量模型在哲学、决策论、AI 安全这类没有标准答案可查的问题上推理得好不好：会不会评判论证、信念是否自洽、决策论题能否答对。"
domain: "通用推理与知识"
subject: "模型直接作答"
task: "静态问答"
scoring: "混合"
access: "部分公开"
sampleCount: "三部分共 2,435 项"
reviewed: "2026-11-18"
links: [{"label": "官网与榜单", "url": "https://conceptualreasoning.ai/"}, {"label": "方法页", "url": "https://conceptualreasoning.ai/methodology.html"}, {"label": "LMCA 论文", "url": "https://arxiv.org/abs/2607.27499"}, {"label": "DTBench 仓库", "url": "https://github.com/casparoe/newcomblike_questions_dataset"}, {"label": "ACCoRD 仓库", "url": "https://github.com/casparoe/accord_public"}]
---

## 评估对象

**能力：** FrontierList 榜单上的 Conceptual Reasoning 条目链接到 conceptualreasoning.ai，指的就是这个指数。它由 Redwood Research 的概念推理能力团队出品，测的是模型在难以验证对错的问题上的推理质量。指数由三套题组成：LMCA（给针对某个立场的反驳论证打分，权重 60%）、ACCoRD（对一组相关命题给出的概率是否满足逻辑约束，权重 20%）、DTBench（纽康姆类决策论选择题，只用其中有公认答案的能力题，权重 20%）。被测的是模型，纯问答，不带工具。

**指标：** CRI 是三套题分数的加权平均，0 到 100，0 对应随机作答，100 对应三套题都拿到理论最高分。截至 2026-11-18，按官网数据文件 `data/cri-scores.csv` 和页面脚本里的公式计算，榜单最高是 Claude Fable 5.2（2026-11-09 发布），CRI 79.0，三项分别是 LMCA 70.1、ACCoRD 86.1、DTBench 98.7。官方估计 LMCA 的实际上限约为 85 分，因为专家之间的评分相关系数也只有 0.85 左右。

## 任务格式

三套题形态不同。LMCA：给模型一段立场文本和一条针对它的反驳论证，让模型按评分细则打分，维度有切中要害程度、力度、正确性、清晰度、废话多少、是否只谈一个问题和总评，每项 0 到 1。ACCoRD：分别问模型若干命题的概率（单个命题、合取、条件概率等），每组命题对应一条概率论约束。DTBench：一段情境加一道选择题。

**示例（题目未公开，以下为官方披露的任务形态）**

取自官网 LMCA 页面的例题，LMCA 数据需填表申请才能拿到。

- **需求**（概括）：给下面这条反驳论证打分。
- **原始题目**（官网 LMCA 页面 Example 区块里的立场文本和反驳论证，全文；网页上两处各是一个四条的编号列表，这里每条一行、用缩进表示，没有加编号。这是官方展示的例题内容，发给模型的完整提示词没有看到）：

  ```text
  Position text
  AIs we train can turn out to be schemers or non-schemers. Schemers can have “a wide variety of goals,” while
  the motivations of a non-schemer must be benign by definition. Since there are “more” possible schemers than
  non-schemers, we should expect training to produce schemers most of the time. In Carlsmith's words:
      The non-schemer model classes, here, require fairly specific goals in order to get high reward.
      By contrast, the schemer model class is compatible with a very wide range of (beyond episode) goals, while
      still getting high reward…
      In this sense, there are “more” schemers that get high reward than there are non-schemers that do so.
      So, other things equal, we should expect SGD to select a schemer.
  This argument is a counting argument.

  Argument against the position text
  Counting arguments often yield absurd conclusions. For example, we can construct this analogous argument:
      Neural networks must implement fairly specific functions in order to generalize beyond their training
      data.
      By contrast, networks that overfit to the training set are free to do almost anything on unseen data
      points.
      In this sense, there are “more” models that overfit than models that generalize.
      So, other things equal, we should expect SGD to select a model that overfits.
  ```
- **输入材料：** 立场文本是 Carlsmith 关于 AI「图谋者」的计数论证：能拿到高奖励的图谋者模型比非图谋者「更多」，所以训练更可能选出图谋者。反驳论证说计数论证常得出荒谬结论，并仿写了一个同构的论证：过拟合的网络比能泛化的网络「更多」，所以梯度下降应该选出过拟合的模型。
- **要做的：** 按七个维度各给一个 0 到 1 的分数。
- **判分：** 页面列出的两位专家总评分别是 0.80 和 0.70（后者讨论后由 0.57 上调）。单条论证不判对错，看的是模型在全部论证上的总评与专家平均总评的相关程度。

**数据格式：** LMCA 的字段没有看到。下面是公开仓库里 DTBench 一个情境文件 `setting*.json` 和 ACCoRD 一条约束 YAML 的字段。

```
setup                情境描述，同一文件里的题目共用（DTBench）
questions            题目列表，每题含下面四到五个字段
  question_text        题干
  permissible_answers  选项列表
  correct_answer       正确选项的下标；态度题则是「决策理论到选项」的映射
  qid                  题号
  attitude_q           是否态度题（态度题不计入 CRI）
tags                 题目标签，如 scenario analysis
type                 约束类型，如 ConservationConstraint（ACCoRD，共 18 类）
context / hypothesis / evidence   背景说明和构成约束的各个命题，字段随约束类型不同
```

## 评估流程

1. **启动：** CRI 整体没有公开的评测脚本，榜单由 Redwood Research 自己跑。只有 DTBench 的仓库带评测代码（`run_benchmarks.py`、`grading.py`）。
2. **执行：** 纯 API 调用。温度、top-p、top-k 用各厂商官方 API 的默认值（部分小厂商用 OpenRouter 默认值），输出长度上限和推理强度都开到最大，输出被截断就重新采样。ACCoRD 每个概率只采样一次。
3. **判分：** LMCA 没有逐题对错，算的是模型总评与专家平均总评在 1,461 条论证上的皮尔逊相关系数。ACCoRD 由程序计算每条约束的违反程度，例如全概率公式两边之差的绝对值，在 567 条约束上取平均，再除以数据集中任意两个无关命题概率的平均差距，用 1 减去得到自洽度。DTBench 是选项匹配：仓库代码要求回答里恰好出现一次 `FINAL ANSWER: ` 加选项字母，格式不合记无效。
4. **算分：** LMCA 分 = 相关系数 × 100，负相关记 0。ACCoRD 分线性缩放到「均匀随机作答为 0、完全自洽为 100」。DTBench 分把正确率 40%（随机猜的水平）缩放到 0、100% 保持 100。CRI = 0.6 × LMCA + 0.2 × ACCoRD + 0.2 × DTBench，三项不全的模型没有 CRI。榜单给出 95% 置信区间。

## 资料依据

依据：conceptualreasoning.ai 的首页、Methodology、About、LMCA、ACCoRD、DTBench 各页源码和数据文件 `data/cri-scores.csv`、`data/lmca-stats.csv`（访问于 2026-11-18）；GitHub `casparoe/newcomblike_questions_dataset` commit `284fda2`（2025-05-15）的说明、`grading.py` 和 `data.zip`；`casparoe/accord_public` commit `b06e602`（2026-08-11）的说明和一条约束文件；arXiv 2607.27499 与 2411.10588 的摘要页；frontierlist.com/top-benchmarks。榜单页在浏览器端渲染，最高分是按页面脚本的公式从数据文件算出的，没有看到渲染后的表格；同一模型 xhigh 档算出来是 79.9，但脚本只把每个模型的规范档位列入榜单。LMCA 数据和 CRI 所用的 567 条人工核验约束都没有看到，ACCoRD 公开的是另外 13,286 条未经人工核验的约束。LMCA 和 ACCoRD 给模型的提示词、答案怎么提取，以及官方跑 DTBench 是否沿用仓库代码，都没有核实。LMCA 论文摘要写的是 442 段立场文本、951 条论证，官网现为 560 段、1,461 条。DTBench 官网写 407 道能力题，仓库里粗数是 408 道。官方声明指数的组成和权重今后会调整。
