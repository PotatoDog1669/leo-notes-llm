---
id: "B46"
order: "7.1"
title: "Chartography"
aliases: []
summary: "给模型一张专业图表和一个需要从图上读数、推算的问题，让它自由作答，再由另一个模型对照专家给的参考答案和允许范围判对错。"
domain: "多模态与空间"
subject: "两种配置并存"
task: "静态问答"
scoring: "LLM 评审"
access: "部分公开"
sampleCount: "100"
reviewed: "2026-11-18"
links: [{"label": "博客", "url": "https://surgehq.ai/blog/chartography"}, {"label": "论文", "url": "https://arxiv.org/abs/2608.10677"}, {"label": "榜单", "url": "https://surgehq.ai/benchmarks/chartography"}, {"label": "仓库", "url": "https://github.com/surge-ai/chartography"}, {"label": "样例数据", "url": "https://huggingface.co/datasets/surgeai/Chartography-harbor"}]
---

## 评估对象

**能力：** 像从业者那样读懂专业图表并得出一个具体答案的能力。100 道题对应 100 张图，分属 12 个专业领域标签（通用理工、制造与供应链、机械、金融投资、医疗、电气、化学、土木环境、地球科学、生物、物理等），图表类型包括生存曲线、儿童生长曲线、K 线图、等高线图、风玫瑰图、桑基图、伯德图、相图、三维曲面图等。81 张图取自网上，19 张由专家自制。每题由在职专业人士出题并写出解题过程，再由另外三位专家核对；只有至少难倒一个前沿模型的题才保留。论文协议下被测的是模型本身，不给工具。

**指标：** 平均 pass@1，即全部判分尝试中答对的比例，附 95% 置信区间。论文里每题跑 20 次，每种配置共 2,000 次尝试。截至 2026-11-18 访问官方榜单页，最高分是 Gemini 4 Argon（推理强度 High）71.6%，其次是 GPT 6 Astra（Max）71%；论文发布时（2026 年 7 月的快照）30 种配置里最高只有 45.0%（GPT-5.6 Sol，Max）。

## 任务格式

模型拿到一条用户消息：先是问题文字，后面跟一张图表图片。没有系统提示词、没有示例、没有工具，一轮作答，答案是自由文本。答案分三类：51 题有专家划定的允许范围，25 题是精确数值，24 题是类别或名称。

**示例（真题 `healthcare_20b800b0`，公开的两道样例之一）**

- **需求**（原文翻译）：一个 4 岁女孩处在第 50 百分位时身高是多少厘米？四舍五入到最接近的 0.5 厘米。
- **原始题目**（出品方博客 Example 2 公开展示的这道题的问句，全文；题面另有一张图表图片。公开样例 `instruction.md` 里实际发给被测对象的问句措辞略有不同，上面的「需求」译自后者；该数据集带 canary 标记并要求不进入训练语料，所以不照录数据集文件）：

  ```text
  What height corresponds to the 50th percentile for a four-year-old girl? Round to the nearest 0.5 centimeters.
  ```
- **输入材料：** 一张儿童生长曲线图（PNG）。
- **要做的：** 在图上找到 4 岁对应的位置，沿第 50 百分位曲线读出身高。
- **判分：** 参考答案是「100.5 cm（允许范围 100 cm 至 101 cm）」，答案落在范围内（含端点）算对。

**数据格式：** 公开的样例是 Harbor 任务格式，一题一个目录；仓库里另有一种 Inspect 版本，一题一行，列为 `task_id`、`prompt`、`golden_answer`、`chart_path`、`domain_combined`、`source_type`、`source_url`。

```
tasks/healthcare_20b800b0/
├── instruction.md                 问题，并要求把最终答案写进工作目录的 answer.md
├── task.toml                      配置：Agent 限时 1800 秒、判分限时 900 秒、2 核 4 GB、不允许联网
├── environment/Dockerfile         python:3.12-slim，预装 tesseract、Pillow、opencv 等读图工具
├── environment/initial_workspace/ 图表图片，启动后在容器的 /app 下
└── tests/
    ├── test.sh                    安装并运行 harbor-rewardkit，调用评审模型
    ├── judge.toml                 评审模型名、要读的文件 /app/answer.md、判分规则和参考答案
    └── task_prompt.txt            问题原文，供评审模型参考
```

## 评估流程

1. **启动：** 论文用 Inspect AI 运行，仓库 README 给的命令是 `uv run inspect eval src/chartography/task.py --model <模型> -T hf_repo=surgeai/chartography`，「榜单配置」另加 `--epochs 10` 和 `-T judge_model=google/gemini-3.5-flash`。Harbor 版本则把同一道题包成容器任务，交给 Agent 做。
2. **执行：** Inspect 版本只调一次模型接口，问题和图片放在同一条用户消息里，模型直接输出答案。Harbor 版本里 Agent 在容器中看图，可以用预装的图像处理工具，最后把答案写进 `answer.md`。
3. **判分：** 评审模型是 Gemini 3.5 Flash，每次尝试调用一次。它只看问题、参考答案和被测模型的回答，看不到图。它先从回答里提取最终答案，再按规则判定：数值答案落在允许范围内（含端点）算对，没有范围的必须完全一致；类别答案必须给出完全相同的集合；多个小问必须全对。输出是结构化 JSON，格式不对最多重试 4 次。
4. **算分：** 每次尝试记对或错，平均 pass@1 等于答对的尝试数除以全部尝试数。

## 资料依据

依据：论文 arXiv 2608.10677 全文；GitHub 仓库 commit `3f1bf83`（2026-07-16）；Hugging Face `surgeai/Chartography-harbor`（版本 `af22460`，2026-11-10）里两道样例的全部文本文件；官方博客和榜单页（访问日期 2026-11-18）。没有核实的内容：论文称公开全部题目、图片和评测代码，仓库 README 指向的 `surgeai/chartography` 数据集在访问时返回 401，实际能读到的只有 2 道真题，其余 98 题需联系 benchmarks@surgehq.ai，因此题目构成的统计数字只来自论文。论文写每题 20 次，仓库的「榜单配置」写 10 次，当前榜单用的是哪一个没有查到。
