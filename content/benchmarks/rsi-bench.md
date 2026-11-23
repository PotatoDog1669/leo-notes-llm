---
id: "B30"
order: "3.6"
title: "RSI Bench"
aliases: []
summary: "Scale AI 牵头、由一线研究者投稿出题的 AI 研发 benchmark：每题给 Agent 一个可运行的基线、一个固定的 GPU 时间预算和一个公开的验证评分脚本，让它做实验把指标做高，最后由隐藏评分器在留出数据上打分。题库仍在建设中。"
domain: "机器学习研发"
subject: "Agent 任务，Harness 也是变量"
task: "模型训练/实验"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "仓库中 41 个题目包，另有 4 道示例题；官网榜单目前只计 1 题"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/scaleapi/rsi-benchmark"}, {"label": "网站与榜单", "url": "https://rsi-benchmark.com/"}, {"label": "发布文章", "url": "https://rsi-benchmark.com/blog/announcing-rsi-bench"}]
---

## 评估对象

**能力：** 自主完成前沿 AI 研发各环节的能力，官方把它看作「递归自我改进」的前提。题目分十类：Architecture、Infra & Systems、Pre-training、Post-training、Multimodal、Data、Evals、Alignment、Harness Optimization、Applied。被测的是 Agent（Harness 加模型）；官方榜单按模型列出，同时标明所用 Harness（Claude Code、Codex、Terminus 2）和推理强度。

**指标：** 每题的奖励是该题自己定义的连续指标（如准确率、速度），在隐藏测试集上测得。官网榜单的算法是先对每题求各次运行的平均奖励，再对各题等权平均，无效运行不计入。截至 2026-11-18 访问官方榜单页，榜单只含 1 道已发布题目 `biomedical-tinyclip-data-curation`，8 个模型中最高是 gpt-6-astra（Codex，最高推理强度）的平均 38.86、单次最好 40.27；该题随机选取基线在隐藏测试集上是 29.56，理论上限 100。

## 任务格式

每题是一个 Harbor 格式的题目包。Agent 在容器的 `/workspace` 里工作，可以运行基线脚本 `/workspace/baseline/baseline.sh`，可以随时用 `/workspace/validation/val.sh` 在公开验证数据上给自己的方案打分，可以读 `/workspace/.timer/remaining_secs` 查剩余时间。最终交付物必须全部放进 `/workspace/submission/`，其中必须有一份 `summary.md`，写明做过哪些实验和最终方案；如果被评分的是生成物（权重、选出的数据等），还要附上能复现它的脚本。预算上限是 12 个 H100 GPU 小时（GPU 数乘以时长），评分器上限 4 个。

**示例（真题 `biomedical-tinyclip-data-curation`）**

- **需求**（概括）：从 1,438,283 对 2021 年及以前的 PMC-OA 生物医学图文对里选出 1 万到 25.6 万个 id，使 TinyCLIP 用固定配方（2000 步，批大小 128）在这些数据上微调后效果最好。模型、配方、步数都不能改，Agent 只能决定选哪些数据。
- **原始题目**（`instruction.md` 节选，全文约 1521 词，这里是标题和 Context 一节；文件第一行是防训练污染的 canary 注释，不录）：

  ```text
  # Task: Curate biomedical figure-caption pairs to train the best small image-text embedding model

  ## Context

  You are building the training set for a small vision-language model that
  embeds biomedical images and text in one space: it should find the right
  caption for a figure, the right figure for a caption, and recognise images
  zero-shot by matching them against text descriptions. You have a **pool of
  1,438,283 figure-caption pairs** from open-access PubMed Central articles
  published in 2021 or earlier (PMC-OA: compound figures split into
  sub-figures, each with its own caption; only articles under CC0, CC BY or
  CC BY-SA). The pool is what the literature
  actually contains: clinical images, micrographs, histology, gels and blots,
  plots and charts, diagrams, tables, chemical structures, photographs of
  equipment, captions that are two words long or two paragraphs long, many
  sub-figures sharing one caption, and a fair amount of noise.

  Compute is fixed. The evaluator fine-tunes a frozen starting checkpoint,
  **TinyCLIP ViT-40M/32 + Text-19M** (distilled on LAION-400M, so it has seen
  almost no biomedical images), for **exactly 2,000 optimizer steps at batch
  size 128 (256,000 pairs seen)** with a fixed recipe. You cannot change the
  recipe. The only thing you control is **which pool ids the recipe trains on**.

  [……省略约 1317 词……]
  ```
- **初始状态：** 约 18 GB 的数据池、两个开发评测集、起始权重 `/opt/tinyclip/`；基线是随机抽 25.6 万个 id，验证分 29.67。
- **交付物：** `selection.json`（id 列表）、`curate.py`（生成该列表的脚本，评分器不执行它，但审稿人会重跑）、`summary.md`。
- **资源：** 4 小时，1 块 H100，16 核 CPU，64 GB 内存；网络只放行模型 API。跑一次验证约 3 到 5 分钟。
- **判分：** 评分器按同一配方微调后，在留出数据上测两项并取平均（百分数）：2022 年论文 8 个领域的图文互检召回率，和 4 套生物医学数据集上的零样本分类平衡准确率。交付物不合规或训练发散记为无效，奖励 0。

**数据格式：** 一题一个目录，结构由 `docs/TASK_REQUIREMENTS.md` 规定。

```
tasks/<题目名>/
├── instruction.md       给 Agent 的说明，结尾是全库统一的一段规则
├── task.toml            类别、奖励方向和理论上限、基线成绩、时限、CPU/GPU、联网策略
├── README.md            给审稿人的设计说明和基线证据
├── checksums.sha256     基线和评分入口脚本的校验和
├── environment/
│   ├── Dockerfile       Agent 容器
│   ├── baseline/        baseline.sh 和 baseline_val_reward.json（基线的验证分）
│   ├── validation/      val.sh，Agent 可见的验证评分器
│   └── workspace/       timer.sh 等放进工作区的文件
├── solution/solve.sh    只负责运行基线
└── tests/               Dockerfile 和 test.sh，隐藏评分器及其数据，Agent 容器里没有
```

## 评估流程

1. **启动：** 用 Harbor 发起，例如 `harbor run -p samples/nano-gpt-data-curation -a claude-code -m claude-opus-5-5 -e modal -y`。官方的运行都在 Modal 云沙箱上。
2. **环境：** 每题在 `task.toml` 里自带硬件、时限和联网策略（公网、白名单或断网三选一）。多数题用 GPU，少数几题只用 CPU。
3. **执行：** Agent 在时限内自由实验，反复调用 `val.sh` 看验证分。说明里禁止查找外部答案，禁止接触隐藏测试和评分器代码。
4. **判分：** 时限结束后，Harbor 只把 `/workspace/submission/` 复制进一个独立的评分容器，运行 `tests/test.sh`。评分器与验证评分器接口和算法相同，只换成留出的数据、种子或环境，输出 `reward`、`invalid` 和各项诊断指标到 `/logs/verifier/reward.json`。全程不用 LLM 打分。
5. **算分：** 榜单页的算法见上文「指标」。仓库的分析工具另外定义了归一化得分 y = (s − b) / (s* − b)，其中 s 是隐藏测试分，b 是基线的隐藏测试均值，s* 默认取题目声明的理论上限；无效提交记 0，即等同基线。再按模型对每题取 k 次运行的平均或最好值，跨题平均并给出自助法区间。

## 资料依据

依据：仓库 `scaleapi/rsi-benchmark` commit `59de487`（2026-11-17），经 GitHub API 和 raw 读了 `README.md`、`CONTRIBUTING.md`、`docs/TASK_REQUIREMENTS.md`、`docs/TAXONOMY.md`、`docs/task-template.toml`、`.github/harbor-run-defaults.yml`、`tools/analyses/rsibench_analyses/scores.py`，以及 `biomedical-tinyclip-data-curation` 的 `instruction.md`、`task.toml`、`tests/test.sh`；官方网站的首页、发布文章（2026-08-07）、榜单、运行记录、投稿说明各页（2026-11-18 访问）。没有克隆仓库，也没有实际运行。未核实：其余 40 个题目包只看了目录名，没有逐个读；它们是否都已正式收录不清楚，官网榜单只列 1 题，投稿说明写的目标是首批 50 题；尚无论文。
