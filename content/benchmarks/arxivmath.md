---
id: "B40"
order: "5.3"
title: "ArXivMath"
aliases: []
summary: "每月从新发表的 arXiv 数学论文里抽出一批有确定最终答案的研究级问题，让模型在不联网的条件下求出答案，再判断它和论文里的答案是否等价。"
domain: "数学"
subject: "Agent 任务，Harness 也是变量"
task: "静态问答"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "47（2026 年 10 月版；每月一期）"
reviewed: "2026-11-18"
links: [{"label": "介绍博客", "url": "https://matharena.ai/arxivmath/"}, {"label": "2026-09 改版说明", "url": "https://matharena.ai/arxiv_august/"}, {"label": "榜单", "url": "https://matharena.ai/"}, {"label": "仓库", "url": "https://github.com/eth-sri/matharena"}, {"label": "数据集", "url": "https://huggingface.co/datasets/MathArena/arxivmath-1026"}]
---

## 评估对象

**能力：** 在看不到论文的情况下，重新推出近期数学论文里的精确结论。题目用上一个月的 arXiv 论文生成，以此避开训练数据污染。ArXivMath 是 MathArena（ETH Zurich SRI Lab 与 INSAIT）的一个子榜，2026-02-04 首发，之后每月一期，每期 17 到 57 题。从 2026 年 8 月版起有两处变化：题目优先取「论文推翻了前人猜想」的结果，使照猜想去猜会得到错误答案；所有模型改为在各自厂商的编码 Harness（Codex、Claude Code、Antigravity CLI 等）里运行。因此现在被测的是 Harness 加模型，早期各版测的是纯模型。

**指标：** 正确率，即最终答案被判为正确的比例，附 95% 置信区间。官网说明每个模型每题跑 4 次取平均。截至 2026-11-18 访问官方榜单页，10 月版并列最高的是 Gemini 4 Carbon（high）和 Claude Fable 5.2（max），都是 93.62% ± 6.99%，榜单给两者都标了「模型发布晚于题目发布」；没有这个标记的最高分是 GPT-6.1 Sol（max）的 90.43% ± 5.95%。

## 任务格式

每题是一段自成一体的 LaTeX 题面，定义齐全，问一个确定的值、公式或集合。模型要把最终答案放进 `\boxed{}`。8 月版以后，模型在一个没有外网的 Docker 容器里工作，可以用 shell、Python（NumPy、SciPy、SymPy、NetworkX、Z3 等）、Node.js 和 SageMath 9.5，工作目录 `/work` 初始为空；每次尝试限时 12 小时、模型费用上限 100 美元，到达费用上限后有 5 分钟宽限期用来交答案。提示词说明只按最终答案计分，猜对也给满分。

**示例（真题，10 月版第 25 题，出自 arXiv:2610.22241）**

- **需求**（原文概括）：V 是 {1,…,7} 的全部 3 元子集，图 G 以 V 为顶点集，两个子集不相交时相邻。box(G) 是最小的正整数 d，使得每个顶点可以对应 R^d 中一个各边平行于坐标轴的闭盒子，并且两个盒子相交当且仅当对应的子集不相交。求 box(G) 的精确值。
- **原始题目**（数据集 `MathArena/arxivmath-1026` 第 25 题的 `problem` 字段全文，LaTeX 源码照录；评测时前面另加各题通用的提示词模板，未录）：

  ```text
  Let \(V=\{S\subseteq\{1,2,\ldots,7\}:|S|=3\}\), and let \(G\) be the graph on \(V\) in which distinct vertices
  are adjacent exactly when they are disjoint as sets. Define \(\operatorname{box}(G)\) to be the smallest
  positive integer \(d\) for which there exist boxes
  \[
  B_S=\prod_{j=1}^{d}[a_{S,j},b_{S,j}]\subseteq\mathbb R^d\qquad(S\in V),
  \]
  with real endpoints satisfying \(a_{S,j}\le b_{S,j}\), such that for every pair of distinct \(S,T\in V\),
  \[
  B_S\cap B_T\ne\varnothing\quad\Longleftrightarrow\quad S\cap T=\varnothing.
  \]
  The intervals are closed and may be degenerate. Determine the exact value of \(\operatorname{box}(G)\).
  ```
- **要做的：** 推理，必要时写程序搜索，给出 `\boxed{}` 里的最终答案。
- **判分：** 评审模型判断最终答案是否与标准答案 3 等价。

**数据格式：** 每期一个 Hugging Face 数据集（`MathArena/arxivmath-1026` 等），一题一条记录。各模型的全部输出在同名的 `_outputs` 数据集里，另含 `model_name`、`all_messages`、`parsed_answer`、`gold_answer`、`correct`、`cost` 等字段。

```
problem_idx   题号
problem       题面，LaTeX 文本
answer        标准答案，LaTeX 文本
source        来源论文的 arXiv 编号
title         来源论文标题
authors       来源论文作者
```

## 评估流程

1. **启动：** 在 MathArena 仓库先构建 Harness 镜像，再运行 `uv run python scripts/run.py --comp arxiv/september --models <模型配置>`，默认每题跑 4 次；之后运行 `uv run python scripts/judge/judge.py --comp arxiv/september` 判分。
2. **环境：** 每次尝试一个新容器，无外网，根文件系统只读，只有 `/work` 可写。Harness 由模型配置指定，比赛配置的默认值是 Codex。
3. **执行：** 题面连同环境说明作为提示词交给 Harness，模型自行决定是否写代码，最后输出带 `\boxed{}` 的答案。超时算错。
4. **判分：** 8 月版起用 LLM 评审（配置 `judges/answer_judge`，模型 Gemini 3.8 Flash，不给工具）。评审拿到题面、标准答案和模型回答，只判最终答案是否数学上等价：接受等价的写法，不自己解题，不给部分分，输出 1 或 0。6 月版及以前各版用基于 SymPy 的规则解析器比对 `\boxed{}` 里的答案，判错或解析失败的再交 LLM 复核并人工确认。
5. **算分：** 正确率 = 各题各次得分的平均值。官网的 ArXivMath: Overall 表把多期合并计算。

## 资料依据

依据：仓库 `eth-sri/matharena` commit `d98156f`（2026-11-09）的 `configs/competitions/arxiv/september.yaml`、`august.yaml`、`march.yaml`、`configs/judges/answer_judge.yaml`、`readmes/README_arxivmath.md`、`readmes/README_harness.md`、`src/matharena/grader.py`；Hugging Face 数据集 `MathArena/arxivmath-1026` 的全部 47 条记录；matharena.ai 的两篇博客（2026-02-04、2026-09-15）和榜单数据（2026-11-18 访问）。仓库里没有 10 月版的比赛配置，10 月版的运行条件按 9 月版配置写，没有单独核实。榜单置信区间的宽度显示部分模型在 10 月版可能只跑了 1 次，没有核实。Overall 表合并了哪几期没有核实。
