---
id: "B28"
order: "3.4"
title: "FrontierML"
aliases: []
summary: "给 Agent 一个没有 GPU 的沙箱、12 小时和一个装着 10、50 或 200 美元的钱包，让它自己租 GPU、买数据、训练模型，最后交一个能离线运行的推理服务；官方在断网的 H100 上用留出数据测这个服务，看钱变多时模型能不能变好。"
domain: "机器学习研发"
subject: "Agent 任务，Harness 也是变量"
task: "模型训练/实验"
scoring: "混合"
access: "全部公开"
sampleCount: "21 题，每题 3 档预算"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/induction-labs/frontier-ml"}, {"label": "网站与榜单", "url": "https://www.frontierml.org/"}, {"label": "发布文章", "url": "https://www.frontierml.org/blog/"}, {"label": "题目数据", "url": "https://huggingface.co/datasets/inductionlabs/frontier-ml-tasks"}, {"label": "轨迹", "url": "https://huggingface.co/datasets/inductionlabs/frontier-ml-trajectories"}]
---

## 评估对象

**能力：** 端到端训练出一个模型的能力，包括选架构、找或造数据、写训练代码、租算力、评估检查点、优化推理，以及把有限的钱花在哪里的判断。21 题分六类：LLM 训练 4、效率 3、视觉与音频 5、Computer Use 3、应用 NLP 3、数学与游戏 3，题目灵感来自前沿实验室、创业公司和高校的真实工作。被测的是 Agent；官方让每个模型跑在其开发商自己的 Harness 里（Claude Code、Codex CLI 等），推理强度各取一档。

**指标：** 每题得分 0 到 1，是原始指标在「下限」和「上限」两个实测锚点之间的线性归一化；榜单分数是 21 题的平均乘以 100，按钱包档位分别列出。截至 2026-11-18 访问官方榜单页，200 美元档 19 个 Agent 中最高是 Claude Opus 5.5（Claude Code）的 58.8，其次 Claude Sonnet 5.5 的 50.4、GPT-6 Astra 的 44.5；发布文章的图里，人类研究员在同一档是 66.1。

## 任务格式

Agent 在一个只有 CPU 的沙箱里工作，可以上网。它读题目说明和接口约定 `/task/CONTRACT.md`，用 `spin` 命令从钱包里付钱租 GPU、调用 OpenRouter 上的模型生成数据。题目只给少量公开验证样例，并附带若干限制，例如不得用任何公开 benchmark 的验证集或测试集训练，不得直接使用已有的专用模型。交付物是 `/workspace/output/` 里的一整套服务代码加模型权重，入口是 `serve.sh`。提交前可以用 `frontier selfcheck` 在评分设施上按公开样例试跑，最多 4 次；用 `frontier submit` 正式提交。

**示例（真题 `ternary-ptq`）**

- **需求**（`instruction.md` 概括）：把 `/artifacts/qwen3.5-4b/` 里的 Qwen3.5-4B 量化成三值权重，只用于文本生成。除输入嵌入和输出头外，95% 以上的文本模型参数必须是三值的，存储的参数量最多比原模型多 10%。写 `serve.sh`，在一块 H100 上离线提供 OpenAI 兼容的对话接口，300 秒内就绪。尽量保住性能。
- **原始题目**（`instruction.md` 全文）：

  ```text
  Quantize Qwen3.5-4B in `/artifacts/qwen3.5-4b/` for text generation only. More than 95% of text model
  parameters outside the input embedding and output head must be ternary, with roughly one ternary code per
  original weight (stored parameters may exceed the original count by at most 10%); the embedding, head and
  activations may remain floating point. You may keep the vision tower and the MTP head in floating point as
  well, since they will not be used or evaluated.

  Write `serve.sh` to serve an OpenAI-compatible chat endpoint offline on one H100, ready within 300 seconds.

  Try to preserve as much performance as possible.

  Do not train, fine-tune, calibrate or select on the validation or test split of any public dataset or
  benchmark; training splits and other public corpora are fine.

  Submit in `/workspace/output/`. Interface and runtime details: `/task/CONTRACT.md`.
  Supporting files: `/task/public/`. Evaluate with `python /task/validate.py --server-url URL`.
  Test the finished submission the way it will be run with `frontier selfcheck`.
  Hand it in with `frontier submit` when it is final.
  Use `spin --help` for compute and model APIs.
  ```
- **限制：** 不得在任何公开数据集或 benchmark 的验证集、测试集上训练、微调、校准或挑选；训练集和其他公开语料可以用。
- **判分：** 先审计权重，三值比例不到 95% 直接 0 分。再在 4 个 benchmark 上测准确率或 pass@1：题目只告诉 Agent 其中两个（GPQA-Diamond、LiveCodeBench v6），另两个（MMLU-Pro、MATH-500）不告知。每项按「随机猜为 0、未量化的原模型为 1」归一化后取平均。请求每次最多并发 16 个，每个限时 300 秒，超时的那一条记 0。

**数据格式：** 一题一个目录（Harbor 任务格式）；公开样例和留出数据放在 Hugging Face 数据集 `inductionlabs/frontier-ml-tasks` 的 `<题目>/public` 和 `<题目>/private` 下。

```
tasks/ternary-ptq/
├── instruction.md          给 Agent 的题目说明
├── task.toml               Agent 时限 12 小时、沙箱 2 核 8 GB 无 GPU、评分器时限
├── environment/
│   ├── setup.json          开工前要下载的起始模型和公开样例
│   └── validation/         CONTRACT.md（接口和运行约定）等
├── solution/               只实现接口的最小服务，得分为 0，用来测试设施
└── tests/
    ├── test.sh、grade.py   评分入口
    ├── data.json           留出数据在 Hugging Face 上的位置
    ├── config.json         并发、超时、判答案用的模型等
    └── task/               task.yaml（评分规则和归一化锚点）、verifier.py、review.py（审查规则）
```

## 评估流程

1. **启动：** 用 Harbor 加仓库自带的 `frontier` 插件，例如 `uv run harbor run -y -p tasks/pii-redaction -e modal -a claude-code -m anthropic/claude-opus-5-5 --plugin frontier --pk budget_usd=50`。需要 Modal 账号、Spin 的 key，以及用于审查和判答案的 Anthropic、OpenAI key。
2. **环境：** Agent 沙箱和评分机都在 Modal 上。插件为每次运行开一个 Spin 钱包，运行结束即关闭并停掉还在跑的算力。钱包只管 Agent 通过 Spin 买的 GPU 和模型调用，不含 Agent 自身的模型费用。各型号 GPU 按固定价格表（`spin/prices.json`）扣款，保证同样的钱在每次运行里买到同样多的算力。
3. **执行：** Agent 最多工作 12 小时，可以提前提交。
4. **判分：** 评分器在一块断网的 H100 上启动提交的 `serve.sh`（`llm-diffusion` 一题用 4 块），发送留出请求，检查速度和输出格式要求；在限时内没答完全部留出样例记 0 分。21 题里有 7 题的答案由 OpenAI 模型判对错。之后 Claude Opus 5.5 审查提交物和 Agent 的轨迹，查是否搜索过本 benchmark 的答案、是否用测试集训练、模型来源是否合规；审查不通过，该题 0 分。
5. **算分：** 每题把原始指标按 `task.yaml` 里的锚点线性归一化并截断到 0 到 1，多个分项取平均或调和平均。同一档钱包下 21 题取平均即榜单分数。官方每个 Agent 在每题每档各跑 1 次，跑完三档的钱包支出上限是 5460 美元。

## 资料依据

依据：仓库 `induction-labs/frontier-ml` commit `31837e0`（2026-10-13），经 GitHub API 和 raw 读了 `README.md`、`frontier_ml/scoring/normalization.py`、`frontier_ml/grading.py`（部分）、`frontier_ml/review.py`（部分），以及 `tasks/ternary-ptq` 的 `instruction.md`、`task.toml`、`environment/setup.json`、`tests/test.sh`、`tests/config.json`、`tests/task/task.yaml`；Hugging Face 两个数据集的元数据；官方网站首页和发布文章（2026-10-13 发布，2026-11-18 访问）。没有克隆仓库，也没有实际运行。未核实：其余 20 题只看了名称和分类；「每题每档各跑 1 次」是由文章中的 1197 次运行除以 19 个 Agent、21 题、3 档推出的。出入：GPU 定价快照，文章写 2026-09-29 取 17 家供应商的中位价，`README.md` 写 2026-10-02 取 19 家。
