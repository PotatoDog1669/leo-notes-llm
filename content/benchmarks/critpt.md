---
id: "B44"
order: "6.3"
title: "CritPt"
aliases: []
summary: "给模型一道物理学研究者自己出的、未发表过的研究级计算题，让它推导并把最终答案填进一个 `answer()` 代码模板，由官方判分服务器对照不公开的标准答案自动判对错。"
domain: "自然科学"
subject: "两种配置并存"
task: "静态问答"
scoring: "脚本/程序"
access: "部分公开"
sampleCount: "70（v2 测试题；另有 1 道带解答的公开例题）"
reviewed: "2026-11-18"
links: [{"label": "官网与榜单", "url": "https://critpt.com/"}, {"label": "仓库", "url": "https://github.com/CritPt-Benchmark/CritPt"}, {"label": "数据集", "url": "https://huggingface.co/datasets/CritPt-Benchmark/CritPt"}, {"label": "论文", "url": "https://arxiv.org/abs/2509.26574"}, {"label": "Artificial Analysis 榜单", "url": "https://artificialanalysis.ai/evaluations/critpt-v2"}]
---

## 评估对象

**能力：** 独立完成一个相当于入门级研究项目的物理计算，全称是 Complex Research using Integrated Thinking - Physics Test。题目由 50 多位在职物理研究者根据自己未发表的研究编写，覆盖凝聚态、量子物理、原子分子与光物理、天体物理、高能物理、数学物理、统计物理、核物理、非线性动力学、流体力学和生物物理。论文把 71 道完整题（challenge）拆成 190 个小步骤（checkpoint）；公开榜单只算其中 70 道完整测试题。由 Argonne 国家实验室和 UIUC 的研究者牵头。当前版本是 2026-10-22 发布的 CritPt v2：作者和物理专家把题目重新审了一遍，改正了条件不足、错误和笔误。被测对象可以是不带工具的模型，也可以是带代码执行工具的模型。

**指标：** 平均正确率，即 5 次独立运行乘 70 道题的平均值，每题只有对和错。论文另有一个更严的指标「稳定解出率」：5 次里至少 4 次答对才算解出。截至 2026-11-18 访问 Artificial Analysis 的 CritPt v2 页面，最高分是 86.3%（Claude Fable 5.2，Max）；同日 critpt.com 自己的 v2 榜单最高是 83.1%（gpt-6-astra），两边收录的模型不同。论文首发时（2025-09）最好的模型只有 5.7%。

## 任务格式

每题是一段自成一体的题面，给出物理设定、记号和要算的量，后面附一个 Python 代码模板。答案的形式有三种：数值、SymPy 符号表达式、带参数的 Python 函数。出题时要求答案猜不出来、能用机器核对。模型先完整推导，再把最终结果填进模板里的 `answer()` 函数；模板之外不许引入新的包。题面没有指定精度且没有精确表达式时，系统提示词要求至少给 12 位有效数字。

**示例（真题，`Challenge_17_main`）**

- **需求**（原文概括）：给定哈密顿量 H = −(1/2) Σ_a Σ_{ijkl} C^a_ij C^a_kl χ_i χ_j χ_k χ_l，其中 χ 是 Majorana 费米子，系数满足 N²⟨C^a_ij C^b_kl⟩ = J δ_ab(δ_ik δ_jl − δ_il δ_jk)。取大 N 极限，定义零温熵 S 为温度 T 趋于 0 时 −∂F/∂T 的极限，求 S/N 的数值，保留四位小数。
- **原始题目**（`Challenge_17_main` 的原文在数据集的 `problem_description` 字段里（约 56 词），但数据集说明页写明该数据集不得用于模型训练，这里不转载。以下照录出品方在官网 critpt.com/example.html 公开展示并附完整解答的那道例题（量子纠错），它不在 70 道测试题里；文字取自仓库 `data/example_challenges/json/quantum_error_correction_main.json` 的 `problem_description` 字段，正文各段与官网页面一致。节选，全文约 398 词，后面同样附一个 `answer()` 代码模板）：

  ```text
  # Problem setup:
  In quantum error correction, you encode quantum states into logical states made of many qubits in order to
  improve their resilience to errors. In quantum error detection, you do the same but can only detect the
  presence of errors and not correct them. In this problem, we will consider a single [[4,2,2]] quantum error
  detection code, which encodes two logical qubits into four physical qubits, and investigate how robust logical
  quantum operations in this code are to quantum errors.

  Our convention is that the four physical qubits in the [[4,2,2]] code are labelled 0,1,2,3. The two logical
  qubits are labelled A and B. The stabilizers are $XXXX$ and $ZZZZ$, where $X$ and $Z$ are Pauli matrices. The
  logical $X$ and $Z$ operators on the two qubits are $X_A = XIXI$, $X_B=XXII$, $Z_A = ZZII$, $Z_B = ZIZI$, up
  to multiplication by stabilizers.

  [……省略约 97 词……]

  # Main problem:

  Suppose that we prepare a logical two-qubit $|00\rangle_{AB}$ state in the [[4,2,2]] code. To do so, we
  introduce an ancilla qubit, qubit 4, and use the following state preparation circuit:

  $$M_4 (CNOT_{04}) (CNOT_{34}) (CNOT_{23}) (CNOT_{10}) (CNOT_{12}) (H_1) $$

  [……省略约 69 词……]

  What is the logical state fidelity of the final 2-qubit logical state at the end of the circuit as a function
  of two-qubit gate error rate $p$, assuming the state is post-selected on all detectable errors in the code and
  on the ancilla qubit measuring $|0\rangle$?
  ```
- **要做的：** 推导出结果，把数值填进模板 `def answer(): S_per_N = ...; return S_per_N`。
- **判分：** 判分服务器执行提交的 `answer()`，把返回值与专家给的标准答案在该题的容差内比较。标准答案不公开。

**数据格式：** Hugging Face 数据集 `CritPt-Benchmark/CritPt` 只有一个 `train` 分片，70 条记录，一题一条；仓库的 `data/public_test_challenges/` 里是同一批题的 notebook。答案相关字段都被留空。

```
problem_id                题目标识，如 Challenge_17_main
problem_type              公开数据里全是 main（完整题）
problem_index             题号
problem_description       题面，Markdown 加 LaTeX
code_template             待填写的 answer() 模板
answer_code               公开数据里与 code_template 相同，不含答案
answer_only_code          空
testcases                 空（函数型答案的测试用例不公开）
metadata_notebook_path / metadata_problem_setup / metadata_tag   来源 notebook 路径等元数据
```

## 评估流程

1. **启动：** 在仓库里运行 `python -m critpt generate epochs=5 model=<模型> task_config=.config/multiturn_without_answer_without_tool.json` 生成回答，再运行 `evaluate_all_results.py` 把回答交给判分服务器。判分服务器与 Artificial Analysis 合作运营，要申请 API key；一次必须交齐 70 题，每个账号 24 小时内最多交 10 次。
2. **环境：** 生成部分基于 Inspect 框架（`inspect_ai`）。默认配置不带工具；另有两个配置分别打开 Python 和 bash 执行（单次命令限时 1800 秒）以及再加网页搜索。Artificial Analysis 跑 v2 榜单时用自己的 Harness（Stirrup），模型在不联网的 Linux 沙箱里用 Python 3.13（numpy、scipy、sympy、matplotlib），最多 50 轮。
3. **执行：** 仓库默认是两步：第一步模型自由推导并写出 `Final Answer:`；第二步另发一条提示，让模型把答案填进代码模板，这一步只做格式转换。Artificial Analysis 用的是一步式提示词，模型调用 finish 工具同时交推导和填好的模板。
4. **判分：** 服务器从回答里取出 Python 代码块，只允许 math、numpy、sympy、scipy 等少数库，在沙箱里执行（默认限时 30 秒）。数值答案按专家给每题定的容差比较，精确结果默认要求 12 位有效数字；符号答案用基于 SymPy 的分层等价检查；函数答案用专家挑的测试用例检查。答案由多个部分组成时，全部对才算对。判分不用 LLM。没有交出答案的题记 0 分。
5. **算分：** 正确率 = 5 次运行乘 70 题的平均值。Artificial Analysis 另报一个 Hard Subset：从 70 题里去掉 v2 发布时七个前沿模型 5 次全对的 30 题，剩 40 题。

## 资料依据

依据：仓库 `CritPt-Benchmark/CritPt` commit `c998cd7`（2026-11-03）的 README、`.config/` 下三个配置、`templates/prompt_template_default.yaml`、`src/critpt/critpt_generate.py`、`evaluate_all_results.py`；Hugging Face 数据集的全部 70 条记录；critpt.com 首页和新闻页、Artificial Analysis 的 CritPt v2 页面和方法说明页（均 2026-11-18 访问）；论文 arXiv:2509.26574 v4 的摘要和第 3 节。判分服务器的代码不公开，判分规则按论文写，v2 之后是否有变化没有核实；Artificial Analysis 称 2026 年 11 月按作者的改进重新判了一遍分。各题的容差、三种答案形式各占多少没有核实。critpt.com 榜单页脚本里有一个常量 `TOTAL = 65`，与页面写的 70 题不一致，原因不明。Epoch AI 数据包里的 CritPt 外部成绩最高只有 36%，应是 v2 之前的数据，没有采用。
