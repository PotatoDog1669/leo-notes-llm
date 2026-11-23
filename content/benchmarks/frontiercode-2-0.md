---
id: "B02"
order: "1.2"
title: "FrontierCode 2.0"
aliases: []
summary: "让 Coding Agent 在真实开源仓库里按一段简短需求改代码，再按仓库维护者定的标准检查这份改动能不能被合并。"
domain: "软件工程"
subject: "Agent 任务，Harness 也是变量"
task: "代码仓库任务"
scoring: "混合"
access: "未公开"
sampleCount: "132（2.0 版）"
version: "2.0"
reviewed: "2026-11-18"
links: [{"label": "榜单", "url": "https://cognition.com/frontiercode"}, {"label": "2.0 方法说明", "url": "https://cognition.com/blog/frontier-code-2.0"}, {"label": "1.0 方法说明", "url": "https://cognition.com/blog/frontier-code"}]
---

## 评估对象

**能力：** 写出「维护者愿意合并」的改动的能力。除了功能正确，还看能否从简短需求里推断没写明的要求、改动范围是否克制、测试质量、是否遵守仓库的风格和约定。题目由 20 多位开源维护者在自己维护的仓库上出，2.0 版比 1.1 版多了安全补丁和性能优化两类。榜单按模型排名，模型装在 Agent Harness 里运行；榜单更新日志提到的 Harness 有 Devin CLI、Antigravity CLI 和 Mistral Vibe。

**指标：** 主指标是 Score：一次运行通过的评分条目按权重加总，只要有一条阻断项（blocker）没过就记 0 分。另报通过率（阻断项全过的运行占比）。每个模型在每档推理强度下各跑 5 次取平均，榜单取成绩最好的那一档。截至 2026-11-18 访问官方榜单页（更新日志最后一条是 2026-11-12），FrontierCode 2.0 最高分是 50.2%（Claude Fable 5.2），其次是 Claude Opus 5.5 的 47.3%；最高分所用的 Harness 和推理强度没有核实。

## 任务格式

Agent 拿到一个仓库、一段简短的任务描述和一份仓库规范（怎么跑测试、lint 和代码风格，类似 `AGENTS.md`），要直接在仓库里完成改动，交付物是代码 diff。可以联网查文档和报错信息，但不许获取参考答案。官方没有披露时限和运行环境的规格。

**示例（题目未公开，以下为官方披露的样题 `msw-fix-reset-generator-state`，概括自 2.0 方法说明）**

- **需求**（概括）：仓库是 JavaScript 网络请求模拟库 Mock Service Worker。用户报告了一个 bug：调用 `resetHandlers()` 之后，生成器写的处理函数没有从头开始。让 Agent 修掉它。
- **原始题目：** 这道题的任务描述原文官方没有贴出。三道样题里只有 1.0 版方法说明的那道（C++ 仓库 jsonschema）贴出了发给 Agent 的全文，照录如下；它是否还在 2.0 版的 132 题里没有核实。

  ```text
  Task description
  Encapsulate all warning logs in a new `auto LOG_WARNING() -> std::ostream &` method in `src/logger.h` such that:
  - Warnings are always printed to standard error
  - Warnings are always printed, independently of `--verbose`
  - The helper automatically prints the `warning:` prefix
  Use this new function in every instance of `warning: <message>` messages throughout the codebase.

  Test guidelines
  Run `make` and ensure no code changes remain. If there are more code changes, then it means that the code
  was not formatted properly.
  Unless you are sure that the code change is already covered by an existing test case, always edit or create
  relevant tests (in the `./test` directory) to confirm the changes work and prevent regressions.
  The tests are written using GoogleTest and POSIX shell scripts (not bash) and must be registered in the
  `test/CMakeLists.txt` build definition to run.

  Lint guidelines
  Run `make configure compile` to compile and format the code in-place. The compile step comes with a large
  amount of linter-like checks.

  Style guidelines
  You are already on the correct base commit. Create your branch from this commit. Do not rebase or start
  from master, main, or any other branch.
  ```
- **要做的：** 重置时让下一次请求重新启动生成器，并且把旧生成器关闭，这样用户写在 `finally` 里的清理代码才会执行。后一点需求里没有写，属于需要自己推断出的要求。
- **判分：** 官方展示的结果是 Claude Opus 5.5 在五档推理强度下各 5 次全部不通过：它只丢掉了对旧生成器的引用，bug 表面上修好了，但旧生成器没有关闭，清理代码不会执行，没过阻断项。

**数据格式：** 未公开。官方只披露了一道题由哪几部分组成，下面是这些组成部分，不是真实的文件结构。

```
一道题
├── 任务描述     维护者写的简短需求，故意不写全
├── 仓库规范     测试、lint、风格的做法，随提示词一起给 Agent
├── 评分条目     每条标明是阻断项还是非阻断项，以及用哪种方式检查
├── 隐藏测试     判分时注入仓库运行，Agent 看不到
└── 参考解      维护者写的实现，八成题目与上游实际合并的 PR 不同
```

## 评估流程

1. **启动：** 题目不公开，评测由 Cognition 自己运行。1.0 版方法说明的原话是「While we don't currently plan to release the tasks publicly to avoid contamination, we are opening up our evaluation to all model creators」，1.1 和 2.0 两篇没有改口。
2. **执行：** Agent 在仓库里工作直到提交改动。全程可以联网；一个扫描器会读每次运行的全部轨迹。
3. **判分：** 每条评分条目用下列方式之一检查。测试类：把隐藏测试注入后运行必须全过；Agent 自己写的测试放回改动前的代码上必须失败；实现方式与参考解不同时，先由 LLM 工具把参考测试改写成适配 Agent 实现的版本，再照常运行。命令类：构建、lint、回归命令退出码为 0。范围类：检查哪些文件可以改、不许改、必须删，以及改动规模。提示词类：LLM 对照一条自然语言标准审查 diff，分数达到阈值算过。
4. **反作弊：** 扫描器发现运行使用了参考解、打开了原始 PR 或从上游仓库取了答案内容，该次运行记 0 分；较弱的迹象交给一个模型裁决。2026-11-11 起扫描器改为规则检查加过滤裁决，全部结果重新算过。
5. **算分：** 单次运行的 Score 是通过条目的加权和，阻断项不过记 0；对题目和 5 次运行取平均，再取各推理强度中最好的一档。榜单同时列出成本和被判作弊的运行比例。

## 设计上值得学什么

把「功能正确」与「维护者愿意合并」拆开评估。后者需要在用例通过之外，显式检查变更范围、维护成本和仓库约定。

## 资料依据

依据：Cognition 官网的榜单页和 1.0（2026-06-08）、1.1（2026-07-07）、2.0（2026-10-27）三篇方法说明，均于 2026-11-18 访问。题目、评分条目权重、运行环境和时限官方没有公开，无法核实；官方文章里展示过 3 道样题（1.0 版 1 道，2.0 版 2 道），其中只有 1.0 版那道贴出了任务描述原文；2026-11-18 在 GitHub 和 Hugging Face 上搜索，没有找到官方发布的题目仓库或数据集，只见到一个第三方上传、需申请才能访问的数据集 `yangning10000/FrontierCode2.0`（2026-11-16 创建），内容和来历都没有核实；「每档 5 次取平均」的文字说明出自 1.0 版，2.0 版只在样题里看到每档 5 次运行；各模型具体用哪个 Harness 没有逐一核对。
