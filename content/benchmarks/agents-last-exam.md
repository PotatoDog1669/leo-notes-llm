---
id: "B15"
order: "2.3"
title: "Agents' Last Exam（ALE，公开集 v1.1）"
aliases: ["Agents' Last Exam"]
summary: "把一个完整的 Agent 系统（如 Claude Code、Codex）放进装好专业软件的 Windows 或 Linux 虚拟机，只给一段任务说明，让它独立做完一件真实的专业工作，再拿它留在输出目录里的成果和事后才放进来的隐藏参考答案比对打分。"
domain: "专业知识工作"
subject: "Agent 任务，Harness 也是变量"
task: "文件交付物"
scoring: "混合"
access: "部分公开"
sampleCount: "公开 122（v1.1）；论文称总题池约 1,490，其余不公开"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/rdi-berkeley/agents-last-exam"}, {"label": "论文", "url": "https://arxiv.org/abs/2606.05405"}, {"label": "网站", "url": "https://agents-last-exam.org/"}, {"label": "榜单", "url": "https://agenthle.org/leaderboard"}]
---

## 评估对象

**能力：** 在真实工作环境里把一件有经济价值的专业任务从头做到交付的能力。任务由行业专家提供，按美国职业分类（O\*NET / SOC 2018）归入 13 个行业大类、55 个子领域；v1.1 公开集里题目最多的是商业金融、计算与数学、医疗健康（各 19 题）和工程（16 题），此外还有物理科学、生命科学、视觉媒体等。很多任务既要写代码、跑命令，又要操作图形界面软件（如 Blender、FreeCAD、MuseScore），所以被测对象是「模型加 Harness」的整套 Agent 系统，榜单每一行是一个 Harness、模型、推理强度的组合。

**指标：** 每题得分在 0 到 1 之间。榜单主排序是通过率（Pass rate），论文定义为拿到满分的任务占比；同时列出平均得分、总耗时和费用。题目另分 near-term（45）、full-spectrum（46）、last-exam（36）三个难度清单，清单之间有重叠。截至 2026-11-18 访问官方榜单数据（v1.1，数据标注更新于 2026-11-18），最高为 Codex 搭配 gpt-6.2-astra（推理强度 xhigh）：122 题通过 58 题，通过率 47.5%，平均得分 0.783。榜单上有的行没有跑完 122 题（例如 Claude Code 搭配 claude-fable-5-2 只有 113 题，通过率 46.9%），比较时要留意。

## 任务格式

Agent 只拿到一段任务说明（运行器会在末尾追加一小段固定提示，说明无人介入、按交付物评价）。虚拟机里每题有固定的四个目录：`input/`（输入材料）、`software/`（预装软件或运行环境）、`output/`（Agent 应当写入成果的地方）、`reference/`（参考答案，Agent 工作期间不存在或处于加密状态）。Agent 用自己的 Harness 工作：能在虚拟机里运行的命令行 Harness 直接装进虚拟机，桌面操作通过官方提供的 MCP 工具（`screenshot`、`click`、`type`、`scroll` 等，坐标可配置为像素或归一化到 0 至 1000）完成；在虚拟机外运行的 Harness 另有一组 MCP 工具执行命令和读写文件。限制只有墙钟时间，论文实验每题上限 5 小时。

**示例（真题 `business_finance/sec_10k_financial_parsing`）**

- **需求**（据 `main.py` 中的任务说明概括）：Linux 虚拟机里有 100 份 SEC 10-K 年报 PDF。逐份解析，按给定的 schema 和归一化规则各输出一个 JSON，并保存抽取所依据的原始文本；回答 3 道跨年报的分析题（例如按 2023 财年股东权益给 10 家公司排序）；再对固定的 5 份验证文件重跑一遍抽取。
- **原始题目**（`task_card.json` 的 `taskPrompt` 字段，节选，全文约 320 词，见仓库 `tasks/business_finance/sec_10k_financial_parsing/task_card.json`；运行时的题面由 `main.py` 里的同一份模板生成，路径换成虚拟机里的绝对路径）：

  ```text
  You are working on a Linux VM with a fixed corpus of SEC 10-K PDFs.

  Visible files and tools:
  - Filing corpus: `base/input/filings`
  - Filing metadata: `base/input/filings/manifest.json`
  - Output schema: `base/input/schema/extraction_schema.json`
  - Normalization rules: `base/input/schema/normalization_rules.txt`
  - Analytical questions: `base/input/questions.json`
  - Analytical answer schema: `base/input/schema/qa_answers_schema.json`
  - Analytical answer format example (fictional values): `base/input/schema/qa_answers_example.json`
  - Deterministic validation subset: `base/input/validation`
  - Python wrapper for the staged task runtime: `base/software/python_with_task_deps.sh`

  Your job:
  1. Parse every filing in `input/filings/`.
  2. Save one normalized extraction JSON per filing to `base/output/extractions`.
  3. Save one raw extraction text file per filing to `base/output/raw_extractions`.
  4. Answer the analytical questions and save them to `base/output/qa_answers.json`.
  5. Re-run the extraction workflow on the fixed validation subset in `input/validation/`
     and save those second-pass extraction JSONs to `base/output/run2_extractions`.
  [……省略约 140 词……]
  Important requirements:
  - Follow the staged schema and normalization rules exactly.
  - Use raw USD integers for monetary fields and 2-decimal floats for EPS.
  - Do not write outside `base/output`.
  - Do not modify files under `input/`.
  - The validation rerun should reflect a second deterministic pass over the same
    visible validation filings.
  ```
- **初始状态：** `input/filings/` 下是 PDF 和 `manifest.json`，`input/schema/` 下是输出 schema、归一化规则和答案格式样例，`software/` 下有带依赖的 Python 启动脚本。
- **要做的：** 把四类成果写到 `output/` 下的 `extractions/`、`raw_extractions/`、`qa_answers.json`、`run2_extractions/`，不得改动 `input/`。
- **判分：** 评分脚本 `scripts/score_outputs.py` 在虚拟机里运行，按权重汇总：财务数字准确度 30%、分析题 25%、原始文本相似度 10%、交叉校验一致性 10%、两次抽取的一致性 10%、schema 合规 5%、元数据 5%、完整度 5%。某份年报的原始文本相似度低于 0.6 时，这份年报的 schema、元数据、财务数字和交叉校验得分清零。

**数据格式：** 一题一个目录，核心是可执行的 `main.py`；输入和参考数据不在仓库里，在需申请的 Hugging Face 数据包或官方云盘镜像里。

```
tasks/business_finance/sec_10k_financial_parsing/
├── main.py            任务定义：load() 声明任务说明和所需机器，start() 布置初始状态，evaluate() 判分并返回 0 到 1 的分数
├── task_card.json     任务卡：title、summary、taskPrompt、agentMustDo、inputFiles、referenceFiles、evaluation（评分说明）、vm（机型、快照名、超时）、taxonomy（所属领域）
├── assets/            随任务写入虚拟机的小文件（分析题、答案格式样例）
└── scripts/           评分脚本 score_outputs.py
```

## 评估流程

1. **启动：** 克隆仓库，`uv sync --all-packages --locked`，在 `secret/.env` 填入模型和云平台凭据，复制 `example_exp.yaml` 并在其中指定 Agent 配置（`configs/agents/` 下已有 Claude Code、Codex、Gemini CLI、OpenHands 等二十多种）、环境配置和题目清单（如 `selected_tasks/full.txt`），然后执行 `uv run python -m ale_run run my_experiment.yaml`。接入自己的 Harness 需要写一个 deployer。
2. **环境：** 一次运行是一个 Agent、一个环境、一道题的组合，每题一台全新的沙箱。122 题里 86 题用 Ubuntu 镜像，33 题用 Windows 镜像，3 题用带 GPU 的 Windows 镜像。官方推荐 Google Cloud 虚拟机，也支持 AWS、阿里云、本机 QEMU/KVM（119 题）和 Docker 容器（78 题的子集）。镜像、数据包的版本固定在 `releases/v1.1/assets.json`。
3. **执行：** 运行器先把该题的输入放进沙箱并调用 `start()`，然后启动 Agent，让它自行工作到结束或超时；超时会终止整个进程树。运行器记录统一格式的轨迹、原始日志和用量。
4. **判分：** 确认 Agent 的进程全部退出后，才把参考答案放进沙箱（预装在镜像里的是加密包，此时解密），再调用该题的 `evaluate()`。多数题是确定性比对：精确值、带容差的数值和表格、几何距离、在固定输入下的行为等，常见做法是先过一道硬性门槛（如文件能解析），不过则整题 0 分，过了再算连续的质量分。按仓库代码统计，122 题里有 14 题的评分引用了共享的 LLM 评审函数（主要是看渲染图或截图回答是非题），评审模型由运行者用 `JUDGE_MODEL` 等变量配置。评分出错时该题记为无分数，而不是 0 分。
5. **算分：** 通过率是满分题数除以题目数，平均得分是各题分数的平均。

## 资料依据

依据：仓库 commit `2e91edd`（2026-10-26），读了 README、`docs/releases/v1.1.md`、`docs/ale-docs-site/pages/` 下的任务与 MCP 工具说明、`tasks/common_config.py`、`ale_run/orchestration/judge_preflight.py`、`ale_run/tasks/driver.py`、`selected_tasks/` 和示例题的 `main.py`、`task_card.json`；论文 arXiv 2606.05405 的 HTML 版；官网和榜单数据接口访问于 2026-11-18。论文写的公开题量是 v1 的 150（另一处写 152），v1.1 退役 30 题后为 122，本条目以仓库为准。「满分才算通过」出自论文，榜单页没有另行说明通过的判定线，也没有说明榜单成绩所用的时间上限。输入和参考数据包没有下载，评分脚本只读了示例题的任务卡说明。没有实际运行。
