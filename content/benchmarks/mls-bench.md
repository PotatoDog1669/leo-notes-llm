---
id: "B29"
order: "3.5"
title: "MLS-Bench"
aliases: []
summary: "考 Agent 做「机器学习科学」而不是调参：每题固定一套研究脚手架和几个强基线，只允许 Agent 在指定代码区域里改一个组件（一种损失、一个优化器、一条采样规则），5 小时探索后由脚本在多个设置上重新训练和评测，看它提出的方法能不能超过人类已发表的方法。"
domain: "机器学习研发"
subject: "Agent 任务，Harness 也是变量"
task: "模型训练/实验"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "140 题，官方精简版 MLS-Bench-Lite 30 题"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/Imbernoulli/MLS-Bench"}, {"label": "网站", "url": "https://mls-bench.com/"}, {"label": "榜单", "url": "https://mls-bench.com/leaderboard"}, {"label": "论文", "url": "https://arxiv.org/abs/2605.08678"}, {"label": "数据集", "url": "https://huggingface.co/datasets/Bohan22/MLS-Bench-Tasks"}]
---

## 评估对象

**能力：** 提出一个新的算法组件，并且让它的收益在不同模型、数据集、随机种子和规模上都成立的能力。140 题分 12 个领域：语言模型 18、经典与自适应学习 14、强化学习 13、优化与理论 13、机器人 12、视觉与生成 11、深度学习 11、ML 系统与高效 ML 10、AI for Science 10、时间序列 10、结构化与因果推理 10、可信学习 8。被测的是 Agent；官方榜单同时标出模型、Harness（Claude Code、Codex、Kimi-Code）和推理强度。

**指标：** 每题得分 0 到 1，是相对该题基线的归一化分：每个指标上，最差基线记 0，最好基线记 0.5，理论上限记 1。官方榜单目前只公布 30 题的 MLS-Bench-Lite 分数（0 到 100）。截至 2026-11-18 访问官方榜单页，15 个 Agent 中最高是 Claude Fable 5.1（Claude Code）的 50.3，其次 GPT-6 Astra（Codex）的 50.0、Claude Fable 5 的 49.9；页面给出的「Human SOTA」参考线是 44.66，由复现的人类基线算出。

## 任务格式

每题给 Agent 一棵研究代码树、题目说明、几个基线的参考实现，以及一个明确的可编辑范围（某个文件的某一段行号）。Agent 可以读代码、改这一段、自己试跑；范围以外的代码不许动，也不许新建或删除文件。交付物就是改过的那段代码，没有单独的提交动作，时限到了由评分器接手。

**示例（真题 `llm-qat-algorithm`，属 Lite）**

- **需求**（概括）：为 Pythia-1.4B 设计一种量化感知训练算法，使模型量化到 INT4、INT3、INT2 之后困惑度尽量低，而且三种位宽要用同一套方法。
- **原始题目**（Harbor 版 `instruction.md` 节选，全文约 5171 词，其中大部分是可读的代码和 4 个基线的实现；这里只录开头的研究问题一节）：

  ```text
  # MLS-Bench: llm-qat-algorithm

  # LLM Quantization-Aware Training (QAT) Algorithm

  ## Research Question

  Design a quantization-aware training (QAT) algorithm that minimizes the
  perplexity gap between a full-precision Pythia-1.4B and the same model
  quantized to very low bit-widths (INT4 / INT3 / INT2) at inference time.
  The algorithm must be a *training-side* contribution: how the fake-quant
  forward, the gradient flow, the learnable parameters, and the optimizer
  schedule are designed. It must work uniformly across 4-, 3-, and 2-bit
  settings, not just one.

  [……省略约 5091 词……]
  ```
- **初始状态：** 代码树 `/workspace/llm-qat-runtime/`，训练循环、数据采样、量化回写和评测都已写死。说明里附了 4 个基线（`no_qat`、`ste`、`lsq`、`finetune_then_ptq`）的实现。
- **要做的：** 只能改 `custom_qat.py` 的第 33 到 176 行，里面是训练超参数、伪量化函数、`QATWrapper` 类和 `prepare_qat_model`，函数签名要保持不变。
- **资源：** 探索 5 小时；Harbor 版本的沙箱是 16 核、64 GB 内存、1 块 H100，可以联网；评分器另有 7.5 小时上限。
- **判分：** 评分器用固定种子 42 按三种位宽各训练并评测一次，得到三个困惑度。每个困惑度按该题基线成绩归一化，三个位宽的分数取几何平均。照抄基线会被识别并按基线复现计分。

**数据格式：** 原生题目定义在 `tasks/<题目>/`；`harbor/` 下另有同样 140 题的 Harbor 打包，按运行平台分 `tasks-docker/`、`tasks-daytona/`、`tasks-modal/` 三份。

```
tasks/llm-qat-algorithm/
├── task_description.md   题目说明：研究问题、可改范围、接口、评测方式、基线介绍
├── config.json           可编辑文件和行号、评测命令（可标 hidden）、种子、基线列表
├── edits/                每个基线对应的代码改动
├── scripts/              各设置的训练加评测脚本
├── parser.py             从运行日志里解析出指标
├── score_spec.py         声明每个指标的方向、上限和汇总方式
└── leaderboard.csv       基线已跑出的成绩，用作归一化的锚点
```

## 评估流程

1. **启动：** 官方榜单用 Harbor 跑，例如 `cd harbor; PYTHONPATH=. harbor run -c run-daytona-lite.yaml --agent codex --model openai/gpt-5.6`。仓库另有原生命令行：`mlsbench agent <题目> --model <模型> --config configs/react.yaml` 之后 `mlsbench score task <题目>`。
2. **环境：** 每题一个容器镜像，140 题共用 65 个基础镜像。约一半的题要 GPU，统一声明为 H100；纯 CPU 的题是 8 核 32 GB（Daytona 上是 4 核 8 GB）。有 2 题要调用模型 API，默认的全量运行配置只跑其余 138 题。
3. **执行：** 每题的探索时限统一是 5 小时，写在 `task.toml` 的 `[agent] timeout_sec = 18000` 里。官方说明，改了这个时限的结果不能和榜单直接比较。
4. **判分：** 评测脚本只在判分阶段挂载进容器，Agent 工作时看不到。评分器先把工作区和原始代码逐段比对，改动越出允许范围直接记 0 分；然后运行全部评测脚本（包括对 Agent 隐藏的设置），基线和 Agent 用同一套脚本、解析器、种子和资源限制。全程不用 LLM 打分。
5. **算分：** 每个指标先统一成越大越好，再归一化：有理论上限的指标用幂函数曲线，没有上限的用 S 形曲线，两种都让最差基线得 0、最好基线得 0.5。一个设置内各指标加权平均，各设置之间取几何平均，得到写入 `reward.txt` 的 0 到 1 的题目分。

## 资料依据

依据：仓库 `Imbernoulli/MLS-Bench` commit `b873944`（2026-10-06），经 GitHub API 和 raw 读了 `README.md`、`harbor/README.md`、`src/mlsbench/scoring/` 下的 `primitives.py`、`anchors.py`、`spec.py` 和 `evaluate.py`（部分），以及 `llm-qat-algorithm` 的 `task_description.md`、`config.json`、`score_spec.py`、`leaderboard.csv` 和 Harbor 版本的 `instruction.md`、`task.toml`、`tests/test.sh`；论文 arXiv 2605.08678 的摘要页（v1 2026-05-09，v3 2026-07-06）；官方网站首页和榜单页（2026-11-18 访问）；Hugging Face 数据集的元数据。没有克隆仓库，也没有实际运行。未核实：论文正文没有读；其余 139 题只看了 `README.md` 里的列表；榜单页没有写明 30 题的分数如何汇总成总分，也没有找到 140 题全量的官方榜单；`config.json` 里 `hidden` 标记在原生运行方式下的具体效果没有读代码确认；作者单位没有核对。
