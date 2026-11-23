---
id: "B07"
order: "1.7"
title: "SWE-sweep"
aliases: []
summary: "把 Agent 放进一个同时藏着许多真实 bug 的开源仓库，不给任何线索，让它自己找出并修掉尽可能多的 bug，再用每个 bug 对应的隐藏测试检查修没修好。"
domain: "软件工程"
subject: "Agent 任务，Harness 由官方自备"
task: "代码仓库任务"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "100 个仓库，共 4,068 个 bug"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/facebookresearch/swe-sweep"}, {"label": "官网与榜单", "url": "https://swesweep.com/"}, {"label": "论文", "url": "https://swesweep.com/paper"}]
---

## 评估对象

**能力：** 在大型代码库里长时间自主排查的能力：没有 issue 描述、文件名或行号提示，Agent 要自己读代码和文档判断哪里的行为不对，修好它，同时不能弄坏原有功能。100 个仓库覆盖 22 种语言，最多的是 Python 25 个、JavaScript 13 个、Java 10 个，包括 pandas、numpy、rails、duckdb、Go 工具链等，单个仓库里的 bug 数从 4 个到 239 个不等。被测的是 Agent 整体，官方榜单上的成绩都用 mini-SWE-agent 这个 Harness 跑出。

**指标：** bug 解决率，即全部仓库里被修好的 bug 数除以 bug 总数（4,068）。一个 bug 算修好的条件是它的隐藏测试全部通过；如果某个仓库原有的测试出现了新的失败，这个仓库记 0 分。截至 2026-11-18 访问官方榜单页（页面注明 2026-11-02 更新），最高是 8.9%（Astra 6，mini-SWE-agent，全量跑一遍花费 3,255 美元），第二名 Sol 5.6（xhigh）是 4.7%。

## 任务格式

一个仓库是一道题。Agent 拿到的是停在某个历史提交上的仓库，这个提交是从仓库历史里挑出来的、同时存在的已知 bug 最多的一个。提示词只要求它修掉所有「仅凭仓库本身就能发现」的 bug，判断依据限于仓库自己的文档、类型标注和公认的常识（比如不该崩溃、不该死循环），不许加新功能，不许改或弄坏原有测试，不许联网。交付物是对起始提交的一份 diff，由平台在 Agent 结束后自动提取。时限 12 小时。

**示例（真题 `swe-sweep__dateutil`）**

- **需求**（原文翻译，提示词最后一句）：探索代码，尽可能多地找出真实的 bug，并直接修改源文件修复它们。
- **原始题目**（`instruction.md` 节选，全文约 790 词，见仓库 `tasks/swe-sweep__dateutil/instruction.md`）：

  ```text
  <role>You are a helpful assistant that can interact with a computer shell to solve programming tasks.</role>

  <instructions>
  # Task

  Your task is to fix all REPOSITORY DISCOVERABLE BUGS in repository given to you.
  You MUST NOT make any OUT OF SCOPE edits.
  [……省略约 30 词……]
  ### REPOSITORY DISCOVERABLE BUG

  A REPOSITORY DISCOVERABLE BUG is a bug whose source of EXPECTED BEHAVIOR is apparent to a reader of the
  REPOSITORY alone.
  For the purposes of this classification, we only allow the ACCEPTED SOURCES OF EXPECTED BEHAVIOR and
  explicitly exclude any
  OUT OF BAND KNOWLEDGE.
  [……省略约 290 词……]
  ## OUT OF SCOPE

  ### Bugs only

  You MUST NOT implement new features, changes, or enhancements.

  ### No modification to PRE-EXISTING TESTS

  Do NOT edit or delete existing tests to make them pass.

  ### No failing of PRE-EXISTING GREEN TESTS

  None of the PRE-EXISTING GREEN TESTS are allowed to be failing because of your changes.
  [……省略约 120 词……]
  ## Settings

  You are in a container. The REPOSITORY is checked out at `/dateutil`.
  [……省略约 160 词……]
  </instructions>

  Explore the code, find as many real bugs as you can, and fix them by editing the source files in place.
  ```
- **初始状态：** Python 日期库 dateutil 的 2.6.0 版，里面有 10 个被收录的 bug，分布在 `parser.py`、`rrule.py`、`relativedelta.py` 和 `tz/tz.py` 四个文件里。
- **要做的：** 举其中一个 bug 为例：把重复规则对象转成字符串时，输出漏掉了 `RRULE:` 前缀。参考修复只改一行。
- **判分：** 这个 bug 的隐藏测试是 `testStrAppendRRULEToken`，检查转出的字符串带有 `RRULE:` 前缀。10 个 bug 修好几个，这道题就得十分之几；原有的 1064 个基线测试只要有一个新失败，整题记 0 分。

**数据格式：** 采用 Harbor 的任务格式，一个仓库一个目录，放在 `tasks/` 下。

```
swe-sweep__dateutil/
├── task.toml          配置：起始版本、bug 数、16 核 64 GiB、时限、联网方式
├── instruction.md     不带线索的提示词
├── agent/             官方基线 mini-SWE-agent 的配置
├── environment/       Agent 容器的 Dockerfile，克隆仓库到起始提交
└── tests/             判分用，Agent 看不到
    ├── swesweep_eval.json      每个 bug 的编号、应由失败变通过的测试名、涉及文件
    ├── base_tests.json.gz      起始提交上稳定通过的原有测试清单
    ├── subtasks/<编号>/test.patch   每个 bug 的隐藏测试
    └── oracle/<编号>.patch     每个 bug 的参考修复
```

## 评估流程

1. **启动：** 仓库只是评测框架 Harbor 的一层薄封装。跑 Agent 用 `harbor run -p swe-sweep__dayjs -a mini-swe-agent -m <模型>`；已有补丁只想判分，用 `sweep eval <题目> <补丁文件>`。
2. **环境：** 每题从 Dockerfile 构建 Agent 镜像和判分镜像，构建一个仓库要几分钟到几小时。Agent 容器断网，只放行模型接口地址。
3. **执行：** Agent 在容器里读代码、跑测试、改源码，直到自己提交或超时。结束后平台对起始提交取 diff，作为答卷交给独立的判分容器。
4. **判分：** 判分容器把仓库重置到起始提交，打上答卷补丁，还原被改动的测试文件，需要时重新构建，然后跑一遍原有测试，查有没有新失败。接着对每个 bug 依次打上它的隐藏测试、运行、撤销。全程是脚本判分，不用 LLM，每项检查只跑一次。
5. **算分：** 单题得分 = 修好的 bug 数 ÷ 该题 bug 数，原有测试有新失败则为 0。总分是按 bug 数加权的平均，等于修好的 bug 总数 ÷ 4,068，用 `sweep info <结果目录>` 汇总。

## 资料依据

依据：仓库 commit `7310266`（2026-11-12），读了 README、`tasks/README.md` 和 `swe-sweep__dateutil` 的题目文件；官网首页、提示词页和仓库列表页于 2026-11-18 访问。没有实际运行，没有读论文正文，也没有逐题检查其余 99 个仓库。`tasks/README.md` 说明有 17 个仓库的基线测试清单为空，这些题实际上没有「弄坏原有测试记 0 分」这道关。官网写的是 4.1k 个 bug，仓库文档给出的精确数字是 4,068。
