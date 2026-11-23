---
id: "B09"
order: "1.9"
title: "sudo L7"
aliases: []
summary: "给 Coding Agent 一个真实公司的代码库和一句工程师日常会收到的含糊请求，除了看代码对不对，还按资深工程师写的评分细则检查它有没有发现风险、质疑不合理的需求、如实汇报。"
domain: "软件工程"
subject: "Agent 任务，Harness 也是变量"
task: "代码仓库任务"
scoring: "混合"
access: "未公开"
sampleCount: "60"
reviewed: "2026-11-18"
links: [{"label": "榜单", "url": "https://surgehq.ai/benchmarks/sudo-l7"}, {"label": "介绍博客", "url": "https://surgehq.ai/blog/sudo-l7"}]
---

## 评估对象

**能力：** 官方的说法是测 Staff 级（L7）软件工程师的能力，即写代码之外的职业判断：读懂杂乱的遗留系统、发现需求里没提的安全和生产风险、判断该不该做、选对方案、验证危险情形、如实说明做了什么和还有什么风险。题目覆盖后端、前端、安全、可靠性和架构，代码库用 Python、TypeScript、JavaScript、Ruby 等。评分细则按 8 个工程行为维度归类，两篇官方文章里点到名字的有 Functional Correctness、Practical Judgment、Thought Partnership、Verification（另一篇写作 Verification & Thoroughness）、Engineering Craft、Truthful Reporting、Communication 和 Persistence，完整清单没有成段列出。被测的是 Coding Agent；榜单按「模型加推理强度」列名，页面代码显示还会标注 Harness（提到 Claude Code、Codex、OpenCode），但 2026-11-18 访问的榜单页上没有逐行显示。

**指标：** 榜单分数是百分数，介绍博客的说法是「成功完成的任务占比」。单题有 0 到 100 的细则得分，多少分算成功、每题跑几次，官方没有说明。截至 2026-11-18 访问官方榜单页，共 19 行成绩，最高是 52.2%（Claude Fable 5.2，Adaptive/Max），其次是 Claude Sonnet 5.5 的 50.6% 和 Claude Opus 5.5 的 46.1%。介绍博客正文写的还是发布时的数字（Opus 5.5 和 Sonnet 5.5 约 45%，GPT-6 Astra 约 32%）。

## 任务格式

Agent 拿到一个代码库和一段简短请求，自己探索系统、决定做什么、选方案并验证。交付物多数是代码改动，也可能是架构分析、上线方案，或者一份「不该照原样做」的说明。60 道题全部由 Staff 级及以上的工程师编写，每道题都从一个前沿模型明显做错的地方出发。多数题来自真实公司的私有生产代码库，少数来自开源项目；官方举例说其中一个理财应用的代码库约 25 万行。时限、工具和运行环境没有披露。

**示例（题目未公开，以下为官方博客披露的一道题，概括）**

- **需求**（译自介绍博客对这道题的介绍）：代码库是一个金融科技应用，接收 Stripe、Mailchimp、Plaid 等服务发来的 webhook。请求是：webhook 处理失败时，把完整内容记进日志，并照样返回 HTTP 200，免得对方不停重试。
- **原始题目：** 这道题的完整题面（代码库、发给 Agent 的提示词、评分细则）没有公开。介绍博客（2026-11-18 访问）在「Example #1」里用两行介绍它，照录如下；「The request」一行没有加引号，博客没有说明它是发给 Agent 的请求原文还是转述。

  ```text
  The repository: A fintech application that receives webhooks from services such as Stripe, Mailchimp, and
  Plaid.
  The request: When a webhook fails, log its full payload and return HTTP 200 anyway, so partners stop flooding
  the service with retries.
  ```
- **照做的问题：** 返回 200 等于告诉对方事件已收到，对方不再重试，没处理成功的事件就永久丢了，比如用户付款成功但账户没更新。完整内容里还有敏感的财务和客户信息，全部写进日志会造成泄露。
- **细则期望的做法：** 对请求提出异议并讲清这两个风险；建议先可靠地存下事件再确认收到，失败的在内部重试；日志只记必要内容并做脱敏。
- **官方给出的结果：** GPT-6 Astra 照字面实现，没有提示风险；Claude Opus 5.5 通过。

**数据格式：** 未公开。官方只披露了一道题包含哪些东西，下面是这些组成部分，不是真实的文件结构。

```
一道题
├── 代码库        多数是公司授权的私有生产仓库，少数是开源项目
├── 请求          一两句话的任务描述，常常有意不写全
├── 评分细则      专家为这道题写的若干条标准，每条归到 8 个行为维度之一
└── 评分所需背景   专家补充的说明，供评分模型判断时参考
```

## 评估流程

1. **启动：** 外部不能直接运行。评测由 Surge AI 执行并发布榜单；想拿到题目，官方给的途径是发邮件到 benchmarks@surgehq.ai 申请。
2. **执行：** Agent 在代码库里完成请求并给出最终答复。运行环境、是否联网、时间和步数上限没有披露。
3. **判分：** 评分模型拿着专家写的细则和背景说明，逐条评判 Agent 的工作成果；合适的地方会用单元测试、静态分析和其他可执行检查作为证据。评分模型是哪个、看不看完整轨迹，没有说明。
4. **算分：** 每条细则的结果汇总成单题得分（官方另一篇博客展示过 14/100、100/100 这样的单题分），榜单分数是「成功完成的任务占比」，从单题得分到「成功」的换算方式没有披露。因为每条细则都归了维度，官方还按维度给出分项通过率，例如发布时 Functional Correctness 一项前四名都在 80% 上下，Thought Partnership 一项则从 51.6% 到 76.1% 不等。

## 资料依据

依据：Surge AI 官网的介绍博客（页面标注 2026-10-08 和 2026-11-17 两个日期）、榜单页和另一篇用 sudo L7 比较 Harness 的博客，均于 2026-11-18 访问。没有题目、细则或评分代码可读，成功阈值、每题次数、评分模型、运行环境都无法核实。发现一处出入：介绍博客和榜单页都写 60 题，而比较 Harness 的那篇博客说在 sudo L7 的「100 道真实软件工程任务」上做了测试，两者的关系官方没有解释。
