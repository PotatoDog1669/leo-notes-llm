---
id: "B38"
order: "5.1"
title: "FrontierMath"
aliases: []
summary: "给模型一道答案确定的研究级数学题，允许它反复运行 Python 做计算，最后交一个返回答案的 `answer()` 函数，由题目自带的验证代码判断对错。"
domain: "数学"
subject: "Agent 任务，Harness 由官方自备"
task: "静态问答"
scoring: "脚本/程序"
access: "部分公开"
sampleCount: "338（v2，其中 12 题公开）"
reviewed: "2026-11-18"
links: [{"label": "项目页", "url": "https://epoch.ai/frontiermath"}, {"label": "Tiers 1–3 榜单", "url": "https://epoch.ai/benchmarks/frontiermath-tiers-1-3-v2"}, {"label": "Tier 4 榜单", "url": "https://epoch.ai/benchmarks/frontiermath-tier-4-v2"}, {"label": "公开样题", "url": "https://epoch.ai/frontiermath/tiers-1-4/benchmark-problems"}, {"label": "评测实现", "url": "https://gist.github.com/tadamcz/7b3a45d0d5d35f758bb6deb8000731bb"}]
---

## 评估对象

**能力：** 解原创、未发表的高难度数学题，覆盖现代数学的大多数主要分支，从数论、实分析里计算量大的问题到代数几何、范畴论里的抽象问题。题目分四档：Tier 1 相当于可以借助计算工具的高年级本科或 IMO 水平，Tier 2 相当于高年级研究生水平，Tier 3 相当于博士早期的研究问题，Tier 4 是教授和博士后设计的短期研究项目。出题要求是答案确定且能自动验证、猜不出来、正确的计算过程能在一分钟内跑完。被测的是模型加一个固定的轻量工具循环（Python 执行和提交两个工具），由 Epoch AI 统一运行。本条目写的是 Tiers 1–4 题库；同一项目下的 Open Problems（未解决的研究问题）和 FrontierMath Erdős（Lean 形式化的 Erdős 问题）是另外两个部分。

**指标：** 正确率，每题对记 1 分、错记 0 分。Tiers 1–3 与 Tier 4 分开报告，榜单数字只算不公开的题。v2 于 2026-06-12 发布，更正了约 42% 的题目。截至 2026-11-18（Epoch 数据包 `benchmark_data.zip`，当日更新），Tiers 1–3 v2 最高 95.1% ± 1.3%（Claude Fable 5.2，推理强度 max，2026-11-06 开跑）；Tier 4 v2 有三个模型记为 100%（Claude Fable 5.2、GPT-6.2 Astra、GPT-6.1 Sol，均为 max）。

## 任务格式

模型拿到一段题面和两个工具。`python` 工具执行一段代码并返回标准输出和标准错误，每次调用互不保留状态，限时 30 秒，环境里预装 sympy、mpmath、gmpy2、galois、networkx、numpy、scipy、pyadic。`submit_answer` 工具用来提交最终答案：一段定义了 `answer()` 的 Python 代码，返回值通常是整数或 sympy 对象，函数本身的运行时间不能超过 30 秒。官方榜单页给出的额度是每题 1,000,000 token，用到 660,000 时强制要求提交。

**示例（真题，公开样题 `Counting nonzero solutions of homogeneous equations`，Tier 1）**

- **需求**（原文翻译）：在有限域 F_{5^18} 上，方程 x³y + y³z + z³x = 0 在相差一个比例因子的意义下有多少个非零点？
- **原始题目**（官方公开样题页上这道题的 Problem 栏全文，公式照录网页源码）：

  ```text
  How many nonzero points are there on
  [x^3y+y^3z+z^3x=0]
  over \(\mathbb{F}_{5^{18}}\) up to scaling?
  ```
- **要做的：** 先在小域上数点找规律，再推出 5^18 的情形，提交 `def answer(): return 3814708984376`。
- **判分：** 题目自带的 `verify()` 检查 `answer()` 的返回值。官方公布的答案是 3814708984376。

**数据格式：** 题库不公开，只公开了 12 道样题（Tiers 1–3 十道，Tier 4 两道，网页形式，含题面、答案和解答）。公开的评测实现显示每条记录至少有这些部分：

```
题面                         发给模型的问题文本
metadata.answer_type         答案的 Python 类型说明，写进提示词
metadata.verification_code   一段 Python，定义 verify(a)，对提交的返回值给出 True 或 False
```

## 评估流程

1. **启动：** 外部不能自行评测。题库在 Epoch AI 手里，由它用 Inspect 框架（`inspect_ai`）运行各家模型，结果发布在 Benchmarking Hub。
2. **环境：** 每题一个 Docker 沙箱，镜像基于 `python:3.10-bookworm`，`network_mode: none`（不能联网），内存上限 512 MB。
3. **执行：** 模型在一个对话里交替推理和调用 `python`，直到调用 `submit_answer`、用完 token 额度或被强制提交。
4. **判分：** 评分器把提交的 `answer()` 代码和该题的 `verification_code` 拼在一起放进沙箱执行，限时 120 秒。`verify(answer())` 返回 True 记为正确；返回 False、`answer()` 报错或超时、没有提交，都记为错误。判分不用 LLM。
5. **算分：** 正确率 = 正确题数 ÷ 题数，同时给出标准误。Tiers 1–3 v2 共 295 题，Tier 4 v2 共 43 题，榜单各自去掉公开样题后计算。

## 资料依据

依据：epoch.ai 的项目页、两个 v2 榜单页、Tiers 1–4 说明页、公开样题页、数据使用页和 `benchmark_data.zip`（均 2026-11-18 访问）；Epoch 公开的评测实现 gist（2026-09-05 更新）里的 `agent.py`、`scorer.py`、`compose.yaml`、`Dockerfile`。题库本身不公开，记录的完整字段没有见到。gist 代码里的默认额度是 100,000 token、66,000 时强制提交，与榜单页写的 1,000,000 和 660,000 不同，正文采用榜单页的说法。说明页仍写着 v2 之前的题量（300 加 50）。OpenAI 出资委托出题，可以看到大部分题目和解答，这一点官方有披露。FrontierMath 的技术论文没有打开。
