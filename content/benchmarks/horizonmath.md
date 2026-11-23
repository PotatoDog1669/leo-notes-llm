---
id: "B41"
order: "5.4"
title: "HorizonMath"
aliases: []
summary: "给模型一道绝大多数至今没人解出的数学研究问题，要它交一个返回具体答案的 Python 函数（闭式表达式或构造出的数学对象），由数值比对和专用验证器自动判对错。"
domain: "数学"
subject: "模型直接作答"
task: "静态问答"
scoring: "混合"
access: "全部公开"
sampleCount: "113（其中 10 题已有解，用作校准）"
reviewed: "2026-11-18"
links: [{"label": "项目页", "url": "https://ewang26.github.io/HorizonMath/"}, {"label": "仓库", "url": "https://github.com/ewang26/HorizonMath"}, {"label": "论文", "url": "https://arxiv.org/abs/2603.15617"}, {"label": "数据集", "url": "https://huggingface.co/datasets/squashenthus/HorizonMath"}]
---

## 评估对象

**能力：** 做出新的数学发现。选题原则是「难发现、易验证」：找到答案需要数学洞察，但候选答案用简单计算就能检查。题目取自期刊、教材和 arXiv 预印本，分三类：没有已知闭式解的常数或函数、现有最好结果未被证明最优的优化问题、目标对象尚未被找到的构造问题。覆盖 8 个领域：数论 20 题、特殊函数 19、统计力学 15、离散几何 15、组合 13、谱理论 12、连续介质物理 10、编码理论 9。每题标了可解性等级：0 级是已有解的校准题（10 题），1 级「可能可解」29 题，2 级「有挑战」66 题，3 级「可能无解」8 题。因为答案未知，题目不怕训练数据污染。作者来自 Stanford、Oxford、Harvard、Princeton 等机构。被测的主要是单次调用的模型，论文里也有一个配置是在 Codex 里运行。

**指标：** 解出的题数占 113 题的比例，每题只试一次（pass@1），同时单列 10 道校准题和 103 道未解题上的通过数。项目页给出的 2026 年 8 月论文稿结果（2026-11-18 访问）：最高是 GPT-5.6 Sol Max，13/113（11.5%），其中校准题 7 道、未解题 6 道；九个配置里多数低于 10%。

## 任务格式

每题一段题面，给出定义、要求和必须遵守的输出格式。模型的回答里要有一个名为 `proposed_solution()` 的 Python 函数：闭式题返回一个用 mpmath 写的有限符号表达式，构造题和优化题返回一个可以转成 JSON 的字典或列表。闭式题只许用有理数和代数数、π、e、Euler 常数、Catalan 常数、初等函数，以及 Gamma、zeta、多重对数、椭圆积分、超几何函数；数值积分、截断级数、数值求根、直接写死小数都禁止。

**示例（真题，`sum_three_cubes_627`，数论，可解性 1 级，原文翻译）**

- **需求：** 627 是 1000 以内仍不知道能否写成三个整数立方和的七个数之一；因为 627 ≡ 6 (mod 9)，同余条件不排除有解。找出整数 x、y、z，使 x³ + y³ + z³ = 627。
- **原始题目**（题库 `data/problems_full.json` 里该题的 `prompt` 字段，全文）：

  ```text
  **Sum of Three Cubes for $n = 627$**

  **Definition:** The integer 627 is one of seven remaining integers below 1000 for which no representation as a
  sum of three cubes is known. Since $627 \equiv 6 \pmod 9$, congruence conditions do not rule out a solution.

  **Task:** Find integers $x, y, z$ such that $x^3 + y^3 + z^3 = 627$.

  **REQUIRED OUTPUT FORMAT:**

  def proposed_solution():
      return {
          "x": <int>,  # Integer x
          "y": <int>,  # Integer y
          "z": <int>   # Integer z
      }
      # Alternative format: return [x, y, z]
  ```
- **要做的：** 写出 `def proposed_solution(): return {"x": ..., "y": ..., "z": ...}`。
- **判分：** 验证器 `validators/sum_three_cubes_627.py` 精确计算三个立方之和，等于 627 即通过。

**数据格式：** 全部题目在仓库的 `data/problems_full.json` 里，是一个 113 项的数组；优化题的基准值另存在 `data/baselines.json`。参考值的计算脚本在 `numerics/`，验证器在 `validators/`。

```
id                 题目标识，如 sum_three_cubes_627
prompt             发给模型的题面，含要求的输出格式
output_type        constant（56）/ construction（39）/ function（15）/ formula_discovery（3）
domain             八个领域之一
evaluation_mode    ground_truth_computable（71）/ benchmark_best_known（33）/ new_construction（9）
solvability        可解性等级 0 到 3
source_url / source_note   问题出处
numeric_value      闭式常数题的高精度参考值（约 110 位）
test_points        函数题的若干组参数和对应参考值
metric_key / optimization_direction / baseline_value / baseline_note   个别优化题的指标说明
```

## 评估流程

1. **启动：** `uv run scripts/run_benchmark.py --provider <厂商> --model <模型>` 生成回答，写入 `responses.jsonl`；`uv run scripts/evaluate_responses.py results/<run_dir>/` 判分。两步分开，可以只重新判分。
2. **执行：** 每题一次 API 请求，系统提示词按判分方式分三种，都要求模型必须给出确定答案、不得拒答。仓库代码里各厂商的工具不同：Gemini 开代码执行和 Google 搜索，OpenAI 非 Pro 模型只开网页搜索（代码解释器在代码里被注释停用），OpenAI Pro 模型、Anthropic 和 OpenRouter 不带工具。推理强度默认 high，论文里的评测用各模型的最高推理强度。
3. **判分：** 评测脚本从回答里取出 `proposed_solution()`，放进子进程执行，限时 300 秒，mpmath 精度设为 110 位。之后按 `evaluation_mode` 分三路。闭式题把返回值与参考值逐位比较，前 20 位有效数字一致才算数值通过（参考值不足 20 位时相应降低；函数题要求所有测试点都通过）；数值通过后再做合规检查：评审模型（默认 Gemini 3.6 Flash）读代码，判断是否用了禁止的手段，共判 5 次，过半数判合规才通过，无法判定也不算通过。优化题由该题的验证器检查构造是否合法并算出指标，必须严格优于文献里的最好结果，持平不算。构造题由验证器逐条检查全部性质，只有通过和不通过。
4. **算分：** 通过率 = 通过题数 ÷ 113，另按判分方式和可解性等级分组统计。论文说明：数值吻合 20 位不等于证明，合规检查也可能出错，通过的答案只是候选发现，仍需专家复核。

## 资料依据

依据：仓库 `ewang26/HorizonMath` commit `4ef0b61`（2026-09-25）的 README、`data/problems_full.json` 全部 113 条记录、`scripts/run_benchmark.py`、`scripts/evaluate_responses.py`、`scripts/evaluator/` 下的 `scoring.py`、`sandbox.py`、`compliance.py`、`batch.py`，`validators/sum_three_cubes_627.py`；项目页（2026-11-18 访问）；论文 arXiv:2603.15617 v2（2026-09-10）的摘要和评测部分。Hugging Face 数据集只看了元数据（最后修改 2026-03-18），没有核对它与仓库 JSON 是否一致。论文没有逐一说明各模型评测时实际开了哪些工具，正文按仓库当前代码写。论文摘要写的是 GPT-5.4 Pro 和 GPT-5.6 Sol 各发现三个新解，项目页写的是共六个不同的发现；没有找到论文稿之后持续更新的榜单。
