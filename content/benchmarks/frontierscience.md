---
id: "B45"
order: "6.4"
title: "FrontierScience"
aliases: []
summary: "给模型一道物理、化学或生物的专家级原创题：竞赛题只看最后的短答案，研究题按专家写的 10 分评分细则看整个解答过程，两种都由评审模型打分。"
domain: "自然科学"
subject: "模型直接作答"
task: "静态问答"
scoring: "LLM 评审"
access: "部分公开"
sampleCount: "160（公开的 gold set：Olympiad 100 题、Research 60 题）"
reviewed: "2026-11-18"
links: [{"label": "官方介绍", "url": "https://openai.com/index/frontierscience/"}, {"label": "论文", "url": "https://arxiv.org/abs/2601.21165"}, {"label": "数据集", "url": "https://huggingface.co/datasets/openai/frontierscience"}]
---

## 评估对象

**能力：** 专家级的科学推理，由 OpenAI 发布，分两个部分。FrontierScience-Olympiad 是国际奥赛难度（IPhO、IChO、IBO 一级）的短答案题，由 42 位国际奥赛奖牌得主或国家队教练原创。FrontierScience-Research 是博士水平的开放题，由 45 位博士生、博士后和教授编写，每题代表研究过程中会遇到的一个子问题，设计上需要人花三到五小时完成。出题时用 OpenAI 内部模型做过筛选，模型能答对的题被丢弃或改写，论文自己说明这会让 OpenAI 的模型吃亏。总题量是「几百道」，从 500 多道竞赛题和 200 多道研究题里挑出 160 道公开，其余留作不公开的对照集。题目只有文字，不含图片。被测的是不联网、不带工具的模型。

**指标：** 两个部分分别报正确率。Olympiad 每题对或错，取 20 次独立运行的平均；Research 每题满分 10 分，拿到至少 7 分算解出，取 30 次独立运行的平均。论文（2026-01-29）里的最高分是 GPT-5.2（推理强度 xhigh）：Olympiad 77%、Research 25%。没有找到官方的持续更新榜单；第三方网站 LLM Stats 汇总各厂商自报的 Research 成绩，截至 2026-11-18 访问最高是 38.3%（Muse Spark），只收了 5 个模型。

## 任务格式

每题是一段文字题面，末尾带固定的答题要求。Olympiad 要求逐步推理，最后另起一行以 `FINAL ANSWER` 开头写出答案；答案是一个数、一个代数表达式、化学式、化合物名或一个指向特定名称的短语。Research 要求写出全部中间推导、公式、关键步骤和理由，没有固定的答案格式。

**示例（真题，Olympiad 化学，公开集第 75 条，原文翻译）**

- **需求：** 分子式为 C4H6 的构造异构体共有多少种？
- **原始题目**（数据集说明页带 canary 标记，写明基准数据不应进入训练语料，所以这道第 75 条的原文不转载。以下照录出品方在论文图 1 里公开展示的生物样题，文字取自公开集 `olympiad/test.jsonl` 第 91 条的 `problem` 字段，全文；图里只有题目正文，最后一段是数据集里每道 Olympiad 题末尾固定的答题要求）：

  ```text
  HEK293T cells were treated with 2.5 µM CPT, a DNA topoisomerase I inhibitor, after which the RNA for gene X
  was quantified with RT-PCR and agarose gel electrophoresis. The results of this reaction show a band 2 kb in
  size, even though computational analysis of the genomic sequence of gene X suggests a 2300 bp product. Next,
  the experiment was repeated, but this time the cells were also treated with 1 µM trichostatin A (TSA). This
  time, the resulting electrophoresis result shows a strong band at 2.3 kb, along with a faint band at 2000 bp.
  Based on these experiments, what process appears to be the main driver of gene X alternative splicing?

  Think step by step and solve the problem below. At the end of your response, write your final answer on a new
  line starting with “FINAL ANSWER”. It should be an answer to the question such as providing a number,
  mathematical expression, formula, or entity name, without any extra commentary or providing multiple answer
  attempts.
  ```
- **要做的：** 逐步推理，最后一行写 `FINAL ANSWER` 加答案。
- **判分：** 评审模型判断答案是否与参考答案 9 等价。

**示例（真题，Research 化学，公开集第 27 条，原文概括）**

- **需求：** 一个未知化合物的钠加合物母离子质量是 846.56，正离子模式下有 363.27 和 337.27 两个主要碎片；它能被 LipidTox 染色，碎片里没有二酰甘油。要求给出化合物的确切名称、所属的脂质亚类、研究者原本会去找的二酰甘油及其质量，并说明两个碎片各是什么。
- **原始题目**（同上，这道第 27 条的原文不转载。以下照录出品方在论文图 2 里公开展示的化学样题，文字取自公开集 `research/test.jsonl` 第 34 条的 `problem` 字段，节选，全文约 246 词；`Context:`、`Question:` 两个前缀和最后一段各题固定的答题要求是数据集里的，图里没有）：

  ```text
  Context: The development of stable, high-conductivity n-type conjugated polymers is crucial for advancing
  organic electronics but lags behind p-type materials. Polyacetylene analogues are attractive targets, but
  incorporating electron-withdrawing groups to achieve low LUMO energies often disrupts backbone planarity
  essential for conductivity. Novel synthetic strategies are needed to create well-defined, planar,
  electron-deficient conjugated polymers.
  Question: Maleimide Polyacetylene (mPA), featuring an alternating vinylene (-CH=CH-) unit and N-alkylated
  maleimide unit backbone, is synthesized via a two-stage strategy:

  [……省略约 53 词……]

  Provide a comprehensive chemical analysis of this system, addressing:
  a) The strategic rationale for employing the two-stage precursor ROMP approach and the specific catalyst
  choice.
  b) The complete mechanistic basis for the conversion of the precursor polymer P to mPA under the notably mild
  TEA/oxidant conditions.
  c) The key structure-property relationships in mPA that determine its electronic characteristics (LUMO level,
  n-type behavior) and potential for electrical conductivity (backbone planarity).
  d) The overall significance of this approach for developing n-type conjugated polymers.

  Think step by step and solve the problem below. In your answer, you should include all intermediate
  derivations, formulas, important steps, and justifications for how you arrived at your answer. Be as detailed
  as possible in your response.
  ```
- **判分：** 评分细则共 9 项、10 分，例如「明确指出该脂质是一种磷脂」1 分、「明确写出该脂质是 BMP 18:2/20:3」2 分。

**数据格式：** Hugging Face 数据集 `openai/frontierscience` 有两个文件，`olympiad/test.jsonl`（100 行；物理 50、化学 40、生物 10）和 `research/test.jsonl`（60 行；三科各 20），一行一题，字段相同。

```
problem         题面，含末尾的答题要求
answer          Olympiad：参考答案（短文本或 LaTeX）
                Research：评分细则，每行「Points: 分值, Item: 给分条件」，每题合计 10 分，7 到 18 项
subject         physics / chemistry / biology
task_group_id   题组标识（UUID）
```

## 评估流程

1. **启动：** 官方没有公开评测代码，只公开了数据集和评审提示词。做法是把 `problem` 原样发给被测模型，收集回答后交评审模型打分。
2. **执行：** 论文里的评测不开浏览，推理模型一律用 high 推理强度（GPT-5.2 用 xhigh）。每题独立重复多次。
3. **判分：** 评审模型是 GPT-5（high 推理强度）。Olympiad 的评审拿到题面、参考答案和模型回答，判断是否等价：等价的代数式、四舍五入后相差一位小数以内的数值、同一化合物的不同名称、换算单位后相同的量都算对，最后一行输出 `VERDICT: CORRECT` 或 `VERDICT: INCORRECT`。Research 的评审拿到题面、评分细则和模型回答，逐项说明理由后在最后一行输出 `VERDICT: <总分>`，可以是小数；提示词要求只按细则给分，即使评审认为细则有误也以细则为准。
4. **算分：** Olympiad 正确率 = 判为正确的比例；Research 正确率 = 得分不低于 7 分的比例。论文说明也可以改用平均得分或别的阈值，并承认细则打分不如单一答案比对客观。

## 资料依据

依据：论文 arXiv:2601.21165 v1（2026-01-29）全文，含附录 B 的两段评审提示词；Hugging Face 数据集 `openai/frontierscience`（最后修改 2025-12-16）的全部 160 条记录；LLM Stats 的 FrontierScience Research 页面（第三方，2026-11-18 访问）。官方介绍页 openai.com/index/frontierscience/ 请求返回 403，没有读到正文，页面上是否有论文之后的新成绩没有核实。不公开题目的确切数量、被测模型调用时的其他参数（如系统提示词）没有找到。论文之后各家新模型的成绩只见到第三方汇总的自报数字，没有逐一核对原始出处。
