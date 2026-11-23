---
id: "B39"
order: "5.2"
title: "ArXivLean"
aliases: []
summary: "把近期 arXiv 数学论文里的结论形式化成 Lean 4 命题，让模型交一份完整的 Lean 证明（2026 年 9 月版起也可以交否证），由 Lean 编译器和 Comparator 工具机器核验。"
domain: "数学"
subject: "两种配置并存"
task: "静态问答"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "53（2026 年 9 月版）"
reviewed: "2026-11-18"
links: [{"label": "介绍博客", "url": "https://matharena.ai/arxivlean/"}, {"label": "榜单", "url": "https://matharena.ai/"}, {"label": "仓库", "url": "https://github.com/eth-sri/matharena"}, {"label": "数据集", "url": "https://huggingface.co/datasets/MathArena/arxivlean-0926"}]
---

## 评估对象

**能力：** 用 Lean 4 和 mathlib 形式化证明研究级数学命题的能力。题目来自发布前一个月左右的 arXiv 数学论文，由模型从论文里抽取命题并写成 Lean 语句，再经模型交叉检查语义和人工审核。ArXivLean 是 MathArena（ETH Zurich SRI Lab 与 INSAIT）的一个子榜，每三个月出一期：2026 年 3 月版 41 题、6 月版 46 题、9 月版 53 题。被测对象可以是通过 API 调用并配 Lean 工具的模型，也可以是模型加各家的编码 Harness（Codex、Claude Code 等）在容器里工作。

**指标：** 正确率，即通过机器核验的题目比例，附 95% 置信区间。截至 2026-11-18 访问官方榜单页，9 月版最高分是 62.26% ± 13.05%（Gemini 4 Carbon，推理强度 high）；榜单给它标了提示「模型发布晚于题目发布」。首期 3 月版发布时的最高分是 17.1%（41 题中 7 题）。

## 任务格式

模型拿到一段自然语言命题和对应的 Lean 语句，要返回一个完整的 Lean 代码块。3 月版和 6 月版只要求证明，交卷时定理头会被替换回原题语句。9 月版改成「证明或否证」：题目给出冻结的定义 `arxivleanConjecture`，模型必须在 `theorem arxivlean_proof : arxivleanConjecture` 和 `theorem arxivlean_disproof : Not arxivleanConjecture` 里二选一，提示词不透露命题真假。不允许 `sorry`、`admit`、新公理、`native_decide`，也不允许改定义或加假设。9 月版每次尝试的模型费用上限是 100 美元，不设总时限；API 路径最多 200 次工具调用。

**示例（真题，9 月版第 31 题，出自 arXiv:2609.15786）**

- **需求**（原文翻译）：对任意特征为零的域 F 和任意满足 [E:F] = 7 的域扩张 E/F，存在 a ∈ E，使得 F[a] = E 且 Tr(a) = Tr(a³) = 0。
- **原始题目**（数据集 `MathArena/arxivlean-0926` 第 31 题的两个字段，全文；评测时它们被填进 `configs/competitions/arxivlean/september.yaml` 提示词模板的 `Conjecture:` 和 `Frozen definitions:` 之后，模板本身是各题通用的作答规则，未录。先是 `problem` 字段，自然语言命题）：

  ```text
  For every field F of characteristic zero and every field extension E/F with [E:F] = 7, there exists an element
  a ∈ E such that F[a] = E and Tr_{E/F}(a) = Tr_{E/F}(a³) = 0. Here [E:F] is the dimension of E as an F-vector
  space, F[a] is the F-subalgebra {p(a) : p ∈ F[T]}, and Tr_{E/F}(b), for b ∈ E, is the trace of the F-linear
  endomorphism E → E given by x ↦ bx.
  ```

  `formal_statement` 字段，Lean 语句（模板把它放在 lean 代码块里）：

  ```text
  import Mathlib



  def arxivleanConjecture : Prop :=
    ∀ (F E : Type) [Field F] [Field E] [CharZero F] [Algebra F E] [FiniteDimensional F E], Module.finrank F E =
    7 → ∃ a : E, Algebra.adjoin F ({a} : Set E) = ⊤ ∧ Algebra.trace F E a = 0 ∧ Algebra.trace F E (a ^ 3) = 0
  ```
- **输入材料：** 冻结的 Lean 定义 `def arxivleanConjecture : Prop := ∀ (F E : Type) [Field F] [Field E] [CharZero F] [Algebra F E] [FiniteDimensional F E], Module.finrank F E = 7 → ∃ a : E, Algebra.adjoin F ({a} : Set E) = ⊤ ∧ Algebra.trace F E a = 0 ∧ Algebra.trace F E (a ^ 3) = 0`。
- **要做的：** 判断命题真假，写出 `arxivlean_proof` 或 `arxivlean_disproof` 的完整证明，连同原定义和自己的辅助引理放在一个代码块里。
- **判分：** 提交能编译，且 Comparator 确认所证定理与冻结的题目一致、没有引入额外公理。

**数据格式：** 每期一个 Hugging Face 数据集（`MathArena/arxivlean-0926` 等），一题一条记录；各模型的完整输出在同名的 `_outputs` 数据集里。

```
problem_idx        题号
problem            自然语言命题
formal_statement   Lean 源码：import Mathlib、辅助定义和 arxivleanConjecture
answer             9 月版与 formal_statement 内容相同，不含命题真假
source             来源论文的 arXiv 编号
title              来源论文标题
arxiv_id           带版本号的 arXiv 编号（3 月和 6 月版此处是 authors 字段）
```

## 评估流程

1. **启动：** 在 MathArena 仓库按 9 月版说明装好固定版本的 Lean 4.34.1、mathlib、Comparator、lean4export 和 Landrun 沙箱，然后运行 `uv run python scripts/run.py --comp arxivlean/september --models <模型配置> --n 1`。
2. **环境：** API 路径下模型只有一个 `verify_submission` 工具，用与最终判分相同的检查器试交。Harness 路径下模型在镜像 `matharena-harness-arxivlean:lean4.34.1` 的容器里工作，目录 `/work` 里有 `Solution.lean` 和给出初步反馈的 `./check.sh`。3 月和 6 月版的 API 路径另有 `verify_lean`、`add_to_file`、`loogle`、`lean_explore_search` 四个工具。
3. **执行：** 模型反复写证明、编译、看报错，直到给出最终代码块或用完预算。
4. **判分：** 评分代码从回答里取出唯一的 Lean 代码块，要求恰好声明两个定理名之一，并先按关键字拒绝 `sorry`、`admit`、`axiom`、`native_decide` 等。随后用冻结的题目语句生成一份对照文件，交给 Comparator 比对所证定理及其依赖，只接受 `propext`、`Quot.sound`、`Classical.choice` 三条标准公理。证明和否证只要通过核验都算对。
5. **算分：** 正确率 = 通过核验的题数 ÷ 题数；同一模型跑多次时先按题取平均。

## 资料依据

依据：仓库 `eth-sri/matharena` commit `d98156f`（2026-11-09）的 `configs/competitions/arxivlean/september.yaml`、`june.yaml`、`readmes/README_arxivlean_september_evaluation.md`、`readmes/README_arxivlean.md`、`src/matharena/lean_conjecture.py`、`grader.py`；Hugging Face 数据集 `MathArena/arxivlean-0926` 的全部 53 条记录；matharena.ai 的介绍博客（2026-04-21）和榜单数据（2026-11-18 访问）。没有找到专门介绍 9 月版出题流程的官方文章，「证明或否证」题目里真命题和假命题各占多少没有核实。出题流程的描述来自 3 月版博客。
