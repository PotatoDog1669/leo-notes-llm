---
id: "B21"
order: "2.9"
title: "DAYJOB: Tax"
aliases: []
summary: "给 Agent 一个装着客户资料的文件夹（账本、银行流水、合同、往来邮件）和同事口吻的一句话交代，让它像税务师一样自己查清情况、做出报税表草稿、工作底稿或给客户的答复，再由 LLM 评审按税务专家写的逐条标准判，满足 95% 以上才算通过。"
domain: "专业知识工作"
subject: "Agent 任务，Harness 由官方自备"
task: "文件交付物"
scoring: "LLM 评审"
access: "部分公开"
sampleCount: "50（公开 2 道样例）"
reviewed: "2026-11-18"
links: [{"label": "榜单", "url": "https://surgehq.ai/benchmarks/dayjob-tax"}, {"label": "发布文章", "url": "https://surgehq.ai/blog/dayjob-tax"}, {"label": "数据", "url": "https://huggingface.co/datasets/surgeai/DAYJOB-tax"}, {"label": "Harness", "url": "https://github.com/surge-ai/dayjob"}]
---

## 评估对象

**能力：** 独立完成一项完整税务委托的能力：在杂乱的客户资料里找出相关事实，发现客户自己没提到的问题，在信息不全时做出判断，交出达到执业标准的成果。由 Surge AI 出品，是其 DAYJOB 系列（另有医疗、金融、法律）中的税务篇，2026-10-27 发布。50 道题覆盖八个业务方向：个人与家庭、小企业、合伙企业、房产与投资、遗产赠与和信托、国际税务、公司交易、税务复核与争议。被测的是 Agent：官方 Harness 基于 OpenHands SDK，通过 litellm 模型名换模型。

**指标：** 通过率（官方称 pass@1 at a 95% rubric threshold）：一次尝试满足该题 95% 以上的评分标准就算通过，榜单分数是通过的尝试占全部尝试的比例，每题跑 5 次。截至 2026-11-18 访问官方榜单页，16 个模型中最高是 Claude Sonnet 5.5（Adaptive/Max）的 10.8%，其后是 Claude Fable 5.1 的 9.6% 和 Claude Opus 5.5 的 9.2%；有 3 个模型是 0%。

## 任务格式

Agent 在一个 Linux 容器的 `/app` 目录里工作。它拿到一段通用开场白（让它从文件里自己推断角色和该交什么）加一句很短的委托，以及一批客户文件：全集共 1789 个文件，每题 12 到 123 个，中位数 30 个，有 Word、Excel、PDF、扫描件、手写收据照片和邮箱导出。交付物是它写进工作目录的文件，或者它的最后一条回复（题目要求直接作答时）。

**示例（真题 `tax_f9d73a67`，公开的 2 道样例之一）**

- **需求**（原文翻译）：附上 Hargett 的案卷。把答应过的交付物做出来，注意我们还没准备好申报，所以表格都是草稿。
- **原始题目：** 不转载。原文是样例任务的 `instruction.md`（英文，约 140 词：各题通用的开场白，加一句委托，委托就是上面「需求」翻译的那一句）。公开的 2 道样例各带一个 `.benchmark_canary.json` 标记文件，数据集说明页要求任务、配套文件、rubric 及衍生材料都不得进入训练数据；发布文章和官方榜单页也没有贴出任何一道题的题面原文，所以这里不照录。
- **输入材料：** 12 个文件，包括业务约定书、客户从 QuickBooks 导出的 2024 年账本、公司卡和银行流水、派工记录、材料盘点表、外州发票、一份服务合同、OSHA 罚单、许可证滞纳金通知和 `mailbox.json`。
- **要做的：** 从约定书里读出到底答应了客户什么，再结合账本和其他记录完成。委托里没有提示难点在哪。
- **判分：** 45 条标准，每条只判是或否。例如 `c003`：交付物要用站得住的因子把经营活动分摊到各州，现场工作天数要与派工记录一致（佐治亚 12、田纳西 2、肯塔基 35、西弗吉尼亚 4）。

**数据格式：** 每题是一个 Harbor 格式的任务目录。公开数据集只有 2 道样例，完整 50 题要向 Surge AI 发邮件申请；数据集带防训练污染的标记串，并声明只用于评测、不得用于训练。

```
tax_f9d73a67/
├── instruction.md       发给 Agent 的开场白和委托
├── task.toml            运行配置：超时、CPU 和内存、联网白名单
├── environment/
│   ├── Dockerfile       容器镜像（预装 PDF、Office、OCR 相关工具和库）
│   └── workspace/       客户文件，运行时放进 /app
└── tests/
    ├── test.sh          判分入口，安装并运行 rewardkit
    ├── judge.toml       评审模型配置和全部评分标准（name、description、type = "binary"）
    └── prompt_template.md   发给评审的说明
```

## 评估流程

1. **启动：** 下载任务目录和 Harness 仓库，自己跑：`uv run harbor run -p <任务目录> -a harbor_agents:HarborInstalledAgent -m <模型> --allow-agent-host <模型接口域名> -k 5`，并用 `--ve REWARDKIT_MODEL=anthropic/claude-opus-4-8` 指定评审模型。榜单成绩由 Surge AI 自己跑出，没有看到对外提交入口。
2. **环境：** 每次尝试起一个容器（样例题配置为 2 核 CPU、4 GB 内存）。Agent 执行期间只能访问白名单里的模型接口域名，不能上网浏览或下载软件包。
3. **执行：** Agent 在 `/app` 里读文件、写代码、产出交付物，样例题限时 6 小时。运行轨迹记在 `trajectory.json`。
4. **判分：** 由 LLM 评审完成，没有人工评审环节，也没有参考答案文件；评分标准由税务专家编写，发布文章称经过三层专家审核。评审是 Claude Opus 4.8，以 Agent 形式（OpenCode）在任务容器里运行：它对比原始文件清单找出哪些文件是 Agent 新建或改过的，打开实际内容逐条判定，每条都要引用具体证据。Agent 自称「已完成」不算证据，找不到对应内容就判不通过。
5. **算分：** 一次尝试满足至少 95% 的标准记为通过。Harness 文档另给了一套口径：每次尝试的得分在 0 到 1 之间，一题的分数是 5 次尝试的平均（出错的尝试不计），整个领域的分数是各题分数的简单平均。

## 资料依据

依据：Surge AI 发布文章（2026-10-27）和官方榜单页（访问日期 2026-11-18）；Hugging Face 数据集 `surgeai/DAYJOB-tax`（2026-10-28 版）的说明和样例题 `tax_f9d73a67` 的 `instruction.md`、`task.toml`、`tests/judge.toml`、`tests/prompt_template.md`、`tests/test.sh`、`environment/Dockerfile`；`surge-ai/dayjob` 仓库 README。只读了 2 道公开样例的文本文件，没有打开样例里的 Word、PDF 等客户文件，也没有看到其余 48 题。Harness 文档写的是按每次尝试的得分取平均，发布文章和榜单写的是 95% 阈值下的通过率，两者如何对应（每次尝试的得分是不是已按阈值化成 0 或 1）没有核实。没有实际运行。
