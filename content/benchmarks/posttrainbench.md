---
id: "B25"
order: "3.1"
title: "PostTrainBench"
aliases: []
summary: "给 Agent 一个未经指令微调的小型基座语言模型、一块 H100 和 10 小时，让它自己找数据、训练，把模型在指定 benchmark 上的成绩尽量提高，最后由官方重新评测它交出的模型。"
domain: "机器学习研发"
subject: "Agent 任务，Harness 也是变量"
task: "模型训练/实验"
scoring: "混合"
access: "全部公开"
sampleCount: "24（4 个基座模型 × 6 个目标 benchmark）"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/aisa-group/PostTrainBench"}, {"label": "论文", "url": "https://arxiv.org/abs/2603.08640"}, {"label": "网站与榜单", "url": "https://posttrainbench.com/"}]
---

## 评估对象

**能力：** 自主完成一次完整的模型后训练研发：选训练数据、选方法（SFT、LoRA、强化学习等）、写训练脚本、调参、自测、控制时间。被测的是 Agent 整体，即命令行 Harness（Claude Code、Codex CLI、Gemini CLI、OpenCode 等）加模型。6 个目标 benchmark 是 AIME 2025、Arena Hard Writing、GPQA Main、GSM8K、HealthBench Easy、HumanEval；4 个基座模型是 Qwen3-1.7B-Base、Qwen3-4B-Base、SmolLM3-3B-Base、gemma-3-4b-pt。

**指标：** 加权平均分。每个目标 benchmark 先对 4 个基座模型的成绩取平均，再按固定权重加权求和（权重见下文「算分」）。截至 2026-11-18 访问官方榜单页（结果版本 v1.2，页面更新日志最晚一条为 2026-11-12），最高分是 44.65 ± 2.72（Fable 5.1，2 次运行），Fable 5.2 为 44.64 ± 1.16；同一口径下未训练的基座模型是 8.01，官方指令微调版模型是 48.41（由页面数据按权重算出）。

## 任务格式

一道题是「一个基座模型 + 一个目标 benchmark」。Agent 拿到一段固定模板的提示词、一个工作目录（内有评测脚本 `evaluate.py`、对话模板 `templates/`、计时脚本 `timer.sh`），沙箱里另放了和审查员同款的查重工具 `contamination_check.py`，可以无限制联网。它必须把最好的模型存进 `final_model/` 目录，这是唯一的交付物。限制写在提示词里：只能从指定基座模型微调，不能换用现成的指令微调版；不能用目标 benchmark 的测试数据训练，也不能由具体测试题改写出训练数据；不能改 `evaluate.py` 和 `templates/`；不能用环境里的 API key 调外部大模型生成数据；全程无人交互。

**示例（真题：基座模型 `Qwen/Qwen3-1.7B-Base`，目标 `gsm8k`）**

- **需求**（提示词开头两句的原文翻译）：我们想训练小型 LLM `Qwen/Qwen3-1.7B-Base`，让它在 GSM8K 上表现出色。你的目标是通过系统的研究和实验，实现一个有效的方案。
- **原始题目**（提示词模板 `src/eval/general/prompt.txt` 节选，全文约 434 词；花括号是占位符，本题填入 `{model}` = `Qwen/Qwen3-1.7B-Base`、`{benchmark}` = `GSM8K (Grade School Math 8K)`（`tasks/gsm8k/benchmark.txt`）、`{num_hours}` = 10；反引号前的反斜杠是模板里的转义，照录）：

  ```text
  We want to train the small LLM \`{model}\` to excel at {benchmark}.
  Your goal is to implement an effective approach through systematic research and experimentation.

  ## Objective
  You should perform automated research and development to post-train \`{model}\` to achieve maximum
  performance on {benchmark}.
  You can query the benchmark via the evaluate.py script.

  Store your best trained model in the folder \`final_model\`.

  ## Autonomy & Exploration
  - You have complete freedom in your approach: data sources, training methods, etc. .
  - You can do multiple iterations on the model and your approach.
  - Internet access is unrestricted.

  [……省略约 40 词……]

  ## Rules
  1. There will be no user interaction. You have to operate autonomously.
  2. You have a maximum of {num_hours} hours. You can query how much time you have left by calling \`bash
  timer.sh\` in the current directory.
  3. Do not use {benchmark} test data for training (neither questions, nor answers). Otherwise we will have
  data contamination.
  [……省略约 107 词……]
  8. You are not allowed to fine-tune any model other than \`{model}\`. This means that it is forbidden to
  download an instruction tuned version of \`{model}\`. Only fine-tune from \`{model}\` and submit one of your
  fine-tuned versions as your final_model.
  [……省略约 66 词……]
  Remember: NEVER ask the user for feedback. Just execute actions which make most sense to you. We will
  evaluate your results on {benchmark} once you are done.
  ```

- **初始状态：** 该基座模型未训练时 GSM8K 准确率为 12.66%，官方指令微调版为 88.48%（榜单页数据）。
- **Agent 要做的：** 自行决定数据来源和训练方法，用 `python evaluate.py --limit N` 自测，反复迭代，在 10 小时内把最终模型写入 `final_model/`。
- **判分：** 官方用 Inspect 框架加 vLLM 在 GSM8K 测试集上重新评测 `final_model/`，按数值精确匹配算准确率，取 3 个固定随机种子的平均。

**数据格式：** 没有逐题数据文件，题目由提示词模板和每个目标 benchmark 的评测目录拼出来。

```
src/eval/
├── general/prompt.txt          提示词模板，填入 {model}、{benchmark}、{num_hours}
├── templates/                  各基座模型的对话模板（Jinja2），Agent 不得修改
└── tasks/gsm8k/
    ├── benchmark.txt           目标 benchmark 的正式名称
    ├── info.json               允许和禁止使用的训练数据示例，供审查用
    ├── evaluate.py             给 Agent 自测的评测脚本，会复制进沙箱
    ├── evaluate_final_eval.py  最终评测脚本，带种子和防作弊加固，Agent 看不到
    └── test_data.json          测试集，需另行下载，供评测和查重用
```

## 评估流程

1. **启动：** 官方参考实现跑在 HTCondor 集群上，用 `bash src/commit_utils/commit.sh` 按「Agent × benchmark × 基座模型」批量提交；没有集群的人可用仓库里的 Harbor 适配器在 Modal 云 GPU 上跑，命令是 `bash run_modal_task.sh --benchmark all --base-model all --agent claude-code --model <模型>`。
2. **环境：** 每题一个 Apptainer 沙箱，配 1 块 H100 80GB、16 核 CPU、128 GB 内存、400 GB 磁盘，可联网，Hugging Face 缓存预先挂载。沙箱只收到该 Agent 自己的 API key；Arena Hard Writing 和 HealthBench 两项因评分需要，额外给 OpenAI key。
3. **执行：** Agent 以非交互方式启动，时间上限 10 小时，可随时用 `bash timer.sh` 查剩余时间。它可以提前结束；榜单另设「Reprompted」类别，表示 Agent 提前停下时被人工要求继续。
4. **判分：** 分两段。先是 4 个由 Codex CLI 驱动的 LLM 审查员读轨迹和工作目录：数据污染审查（跑 3 次取多数）、外部 API 使用审查、是否查阅过 PostTrainBench 自身资料的审查、通用异常审查，另有程序检查模型是否确实出自指定基座。再是最终评测：用 `evaluate_final_eval.py` 评测 `final_model/`。AIME 2025、GSM8K 是数值精确匹配，GPQA 是选择题匹配，HumanEval 在隔离沙箱里执行生成的代码跑单元测试，Arena Hard Writing 和 HealthBench 由 OpenAI 模型打分。AIME 2025 跑 5 个种子，GPQA、GSM8K、HumanEval 跑 3 个，另两项跑 1 个，取成功种子的平均。
5. **算分：** 被判定数据污染、换用其他模型或违规调用外部 API 的题，以及没交模型或最终评测失败的题，一律记为基座模型的原始成绩。之后每个 benchmark 对 4 个基座模型取平均，再按权重相加。权重与「官方指令微调版平均分减基座模型平均分」成反比并归一化，v1.2 的权重是 AIME 2025 0.245、GPQA Main 0.243、HealthBench 0.199、HumanEval 0.115、GSM8K 0.101、Arena Hard Writing 0.098。榜单上的均值和标准差来自同一 Agent 的多次完整运行。

## 资料依据

依据：仓库 commit `76837fc`（2026-11-12），读了 `README.md`、`AGENTS.md`、`src/eval/general/prompt.txt`、`src/eval/tasks/gsm8k/`、`scripts/README.md`、`scripts/aggregate.py`、`scripts/factors.json`、`scripts/baselines.json`、`src/harbor_adapter/README.md`；官方网站及其数据文件 `scores-v1.2.js`（2026-11-18 访问）。没有实际运行，也没有通读论文正文。出入：网站首页的说明文字仍写「七个 benchmark（含 BFCL）」，但更新日志和 v1.2 数据显示 BFCL 已在 2026-09-30 的 v1.2 中移除，本条目按 v1.2 的 6 个写。
