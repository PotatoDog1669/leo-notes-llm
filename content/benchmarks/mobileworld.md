---
id: "B54"
order: "9.2"
title: "MobileWorld"
aliases: []
summary: "让 Agent 在一台安卓模拟器里像人一样点屏幕完成 201 个手机任务，其中一部分必须先向「用户」问清楚才能做，一部分要配合外部 MCP 工具，最后由脚本检查手机和应用后台的实际状态来判对错。"
domain: "Computer Use"
subject: "Agent 任务，Harness 也是变量"
task: "GUI 操作"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "201"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/Tongyi-MAI/MobileWorld"}, {"label": "官网与榜单", "url": "https://tongyi-mai.github.io/MobileWorld/"}, {"label": "论文", "url": "https://arxiv.org/abs/2512.19432"}, {"label": "任务清单", "url": "https://huggingface.co/datasets/Tongyi-MAI/MobileWorld"}]
---

## 评估对象

**能力：** 在真实的安卓界面上完成较长的日常和办公任务。题目覆盖 20 个应用（含 5 个 MCP 服务），包括邮件、短信、日历、文件、相册、地图、浏览器，以及自建后台的社交平台 Mastodon、团队聊天 Mattermost 和电商应用。按任务清单统计，125 题要跨应用，76 题在单个应用内完成；155 题为英文，41 题为中文。题目分三类：纯界面操作（GUI-Only）117 题；人机交互类 44 题，题面故意漏掉关键信息，Agent 必须主动向用户提问；MCP 增强类 40 题，要把外部工具调用和界面操作配合起来用。论文称平均完成步数 27.8 步，约为 AndroidWorld 的两倍。被测的可以是端到端的界面操作模型，也可以是「规划模型加定位模型」的 Agent 框架。

**指标：** 成功率，即完全达成目标的题目占比，每题只有成功或失败；分三类分别报告，榜单页的 Overall 是三类成功率按题数加权的结果，没报的类别按 0 计。榜单上的成绩都在每题最多 50 步的设置下取得。截至 2026-11-18 读取官方榜单数据（仓库 `site/leaderboard.json`，44 行）：只看 GUI-Only，最高是 Qwen-UI-Agent 的 82.1%（只报了这一类，README 写明是对方报告的成绩）；三类都报了的系统里，最高是 GPT-5 + UI-Ins-7B，三类分别为 54.0%、62.2%、51.6%，按题数加权为 55.3%，它也是页面默认 Overall 排序的第一名。多数新模型没有报 MCP 类成绩。

## 任务格式

每题给 Agent 一句自然语言目标。之后每一步，Agent 拿到当前手机截图（调用过工具或问过用户时，还附带工具返回或用户的回答），输出一个动作。动作包括点击、双击、长按、拖动、输入文字、滚动、返回、回主屏、回车、等待；用 `answer` 回答问题并结束，用 `status` 宣布完成或不可行；另有两个扩展动作：`ask_user` 向用户提问，`mcp` 调用一个 MCP 工具。坐标用像素或归一化数值，取决于具体的 Agent 实现。没有要提交的文件，只看任务结束时手机和应用后台的状态，或者 `answer` 给出的文本。

**示例（真题 `CheckConferenceAndSendSmsTask1`）**

- **需求**（原文翻译）：查看我的日历，给 Mia 发一条短信，告知我到达和离开巴黎的日期。短信只能包含这两个日期，格式为 MM/DD/YYYY，用逗号分隔。
- **原始题目**（任务类里的 `goal` 字符串，即发给 Agent 的任务目标全文）：

  ```text
  Check my calendar and send an SMS notification to Mia with the dates of my arrival and departure from Paris.
  The message should contain only the two dates in MM/DD/YYYY format, separated by a comma.
  ```
- **初始状态：** 模拟器恢复到名为 `init_state` 的快照并回到主屏，任务里的「今天」固定为 2025-10-16。日历行程和联系人数据在快照里（没有拉取镜像核对）；题目定义里注明 Mia Scott 的号码可以在联系人应用里查到。
- **要做的：** 打开日历找到巴黎行程的起止日期，到联系人里确认 Mia 的号码，再用短信应用发出符合格式的消息。
- **判分：** 评测代码通过 ADB 读取手机「已发送短信」记录，要求存在一条发给 `+14058298746` 且正文同时包含 `10/11/2025` 和 `10/15/2025` 的短信，满足得 1.0，否则得 0.0。

**数据格式：** 每题是 `src/mobile_world/tasks/definitions/<应用>/` 下的一个 Python 类，继承 `BaseTask`，类名就是题目名；评测时会自动扫描这个目录并登记所有任务。Hugging Face 上的 `task_info.csv` 只是题目名、目标、标签和所用应用的清单。

```python
class CheckConferenceAndSendSmsTask1(BaseTask):
    goal = "Check my calendar and send an SMS notification to Mia ..."  # 给 Agent 的任务目标
    task_tags = {"lang-en"}              # 标签；含 agent-user-interaction 或 agent-mcp 的分属另外两类
    app_names = {"Calendar", "Messages"}  # 涉及的应用
    correct_phone_number = "+14058298746"                  # 判分用的期望值，写在类里
    expected_message_content = ["10/11/2025", "10/15/2025"]

    def initialize_task_hook(self, controller):  # 快照恢复后的额外准备
        self.relevant_information = "Mia Scott's phone number can be found in the Contacts app."  # 给模拟用户的背景信息
        return True

    def is_successful(self, controller):         # 判分，返回 (1.0 或 0.0, 原因)
        ...
```

## 评估流程

1. **启动：** 先用 `mw env run --count 5` 拉起若干个环境容器，再运行 `mw eval --agent_type <Agent 类型> --task ALL --max_round 50 --model_name <模型名> --llm_base_url <接口地址>`。不加开关时只跑 GUI-Only 题，加 `--enable_user_interaction` 和 `--enable_mcp` 才包含另外两类。
2. **环境：** 每个环境是一个 Docker 容器（需要特权模式和 KVM），里面有已 root 的安卓模拟器、自建的应用后台和一个负责调度的 API 服务；Agent 跑在宿主机上，通过 HTTP 取截图、发动作。每题开始前恢复模拟器快照，保证起点一致。MCP 类题目调用的是外部在线服务（高德地图、GitHub、Jina、证券之星、arXiv，论文表格合计 64 个工具），需要自备 DashScope 和 ModelScope 的密钥。
3. **执行：** 循环「截图、模型输出动作、执行动作」，直到 Agent 用 `answer` 或 `status` 结束，或者达到步数上限。Agent 发出 `ask_user` 时，问题转给一个由 LLM 扮演的用户（论文和 README 示例用 GPT-4.1）；它的系统提示词里有题面缺少的那部分信息，并被要求只依据这些信息回答、不编造。
4. **判分：** 调用该题的 `is_successful`。论文把核验方式分为四种：查自建后台的数据库（95 题）、用 ADB 查手机本地存储（74 题）、对回答文本做匹配（22 题）、读定制应用回调记录下的状态（10 题）。人机交互题同样只看最终状态，例如是否删对了日历事件。
5. **算分：** 得分大于 0.99 的题记为成功，成功率等于成功题数除以总题数；用 `--pass-k` 跑多次时，另出一份「任一次成功即算通过」的统计。论文另外报告平均步数、平均提问次数、提问质量和平均 MCP 调用次数。

## 资料依据

依据：GitHub 仓库 `Tongyi-MAI/MobileWorld`（commit `5d9dd9d`，2026-11-18）的 README、`docs/mcp_setup.md`、`docs/submit.md`、`CHANGELOG.md`、`src/mobile_world/tasks/base.py`、`core/runner.py`、`core/subcommands/eval.py`、`runtime/client.py`、两个题目定义文件和 `site/leaderboard.json`，只通过 raw 文件读取，没有克隆仓库；Hugging Face 数据集 `Tongyi-MAI/MobileWorld` 的 `task_info.csv`（201 行）；论文 arXiv 2512.19432 的 HTML 版；官网页面。以上访问于 2026-11-18。没有拉取 Docker 镜像，也没有实际运行，快照里的应用数据没有核对。有三处出入：论文写三类题量为 116、45、40，仓库和榜单现为 117、44、40；论文正文说 MCP 工具 61 个，表格合计 64 个；论文给 GPT-5 + UI-Ins-7B 的总成功率是 51.7%，榜单数据按题数加权算出是 55.3%。榜单里有一部分成绩是提交方自报的，官方是否复跑没有说明。
