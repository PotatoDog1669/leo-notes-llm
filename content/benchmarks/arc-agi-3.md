---
id: "B33"
order: "4.2"
title: "ARC-AGI-3"
aliases: []
summary: "把 Agent 放进一个从没见过的回合制格子游戏，不给任何文字说明，让它靠试探弄清规则和目标并逐关通关，再按「比人类多用了多少步」打分。"
domain: "通用推理与知识"
subject: "Agent 任务，Harness 由官方自备"
task: "交互式环境"
scoring: "脚本/程序"
access: "部分公开"
sampleCount: "135 个游戏环境（公开 25）"
reviewed: "2026-11-18"
links: [{"label": "官网", "url": "https://arcprize.org/arc-agi/3"}, {"label": "论文", "url": "https://arxiv.org/abs/2603.24621"}, {"label": "文档", "url": "https://docs.arcprize.org"}, {"label": "官方评测仓库", "url": "https://github.com/arcprize/arc-agi-3-benchmarking"}]
---

## 评估对象

**能力：** 在陌生环境里边交互边学习的效率。论文列出四项：探索（主动获取信息）、建模（把观察归纳成可预测的规则）、设定目标（没人告诉它要做什么）、规划与执行。游戏只用到物体、几何、计数这类先验，不出现文字、数字和文化符号。官方榜单测的是模型：所有模型用同一个极简 Harness 和同一句系统提示词，不给工具。带自研 Harness 的成绩另放在不经核实的社区榜单。

**指标：** RHAE（Relative Human Action Efficiency），0% 到 100%，100% 表示每个游戏的每一关都通关，且步数不多于人类基线。截至 2026-11-18 访问官方榜单页，官方榜单分两种 Harness 列分：Standard 下最高 81.2%（Claude Fable 5.2，2026-11-09），Provider adapter 下最高 100.0%（GPT-6.2 Astra，2026-11-17）。2026 年 3 月发布时最高分是 0.50%（Opus 4.6）。

## 任务格式

一个游戏由若干关组成，后面的关要用到前面学到的机制。每一回合 Agent 收到一帧画面（最大 64×64 的格子，每格是 0 到 15 的整数，代表 16 种颜色），有过场动画时收到一串帧，同时收到本回合可用的动作列表；它回复一个动作，环境再返回下一帧。动作只有 `RESET`、`ACTION1` 到 `ACTION5`（五个按键，含义由游戏决定）、`ACTION6`（点击某个格子，带 x、y 坐标）和 `ACTION7`（撤销）。没有时间限制，只数动作数；模型自己的思考和工具调用不计入。官方评测里每关的动作上限是人类基线的 5 倍，用完即终止。

**示例（公开游戏 `ls20`，官方入门示例；机制未见官方文字描述，以下只写已披露的部分）**

- **需求：** 没有需求文本。官方 Standard Harness 给模型的系统提示词是固定的一句：「你在玩一个游戏，目标是赢。把你想带到下一回合的信息和要执行的动作写进回复，回复里最后提到的动作会被执行。」（Standard Harness 原文翻译）
- **原始题目**（没有文字题面，题目就是游戏本身；以下是官方 Harness 默认的 Standard 系统提示词全文，出自官方评测仓库的 `benchmarking/agent.py`）：

  ```text
  You are playing a game. Your goal is to win. Include any context you want to carry forward in your reply,
  along with the action you want to take. The final action mentioned in your reply will be executed next turn.
  ```
- **输入材料：** 每回合一段文本：`State`、`Levels completed`、逐行打印的格子数字、可用动作列表。
- **要做的：** 自己试出每个按键的作用和过关条件。论文提到 `ls20` 第一关带「三条命」机制，随机乱按通关的概率是 1/355。
- **判分：** 环境返回的 `levels_completed` 增加即过一关，同时记录这一关用了多少个动作。

**数据格式：** 没有静态题目文件，游戏通过 Python 包 `arc-agi`（本地引擎）或在线 API 提供。每次动作返回一个 `FrameData`：

```
game_id            游戏编号，四个字符加版本后缀，如 ls20-xxxx
frame              一到多帧画面，每帧是 64×64 以内的整数二维数组（0 到 15）
state              NOT_PLAYED / NOT_FINISHED / WIN / GAME_OVER
levels_completed   已通过的关数
win_levels         通关需要的总关数
available_actions  本回合可用的动作编号列表
guid               本局会话标识，后续动作要带上
```

## 评估流程

1. **启动：** 克隆官方仓库 `arc-agi-3-benchmarking`，配置 `ARC_API_KEY` 和模型厂商密钥，运行 `uv run main.py --game=ls20 --config=<模型配置>`；不写 `--game` 就跑全部可见游戏。外部只能跑 25 个公开游戏；榜单成绩由 ARC Prize 基金会在 55 个半私有游戏上跑出。另有 55 个全私有游戏用于 Kaggle 上的 ARC Prize 2026 竞赛，提交的代码在断网环境里运行。
2. **环境：** 纯 API 交互。Harness 开一张 scorecard，向游戏服务器发 `RESET` 开局，之后每个动作一次请求；也可以用本地引擎离线跑，但没有在线 scorecard 和回放。
3. **执行：** 每回合 Harness 把当前帧渲染成文本发给模型，从回复里解析出最后一个合法动作并提交。Standard Harness 只把模型上一轮的可见回复带到下一轮，要记住什么由模型自己写进回复；Provider adapter Harness 改用厂商原生的会话状态，保留推理内容，上下文过长时做压缩。两种成绩分开报告。
4. **判分：** 全部由程序完成，不用 LLM 也不用人工。服务器记录每关是否通过和所用动作数，与人类基线比较。人类基线来自线下测试：每个游戏找 10 名第一次接触的普通人，逐关取通关者步数的上中位数。
5. **算分：** 单关得分 = min(1.15, 人类步数 ÷ AI 步数) 的平方，没通过记 0。游戏得分是各关得分的加权平均，权重等于关卡序号，并且不超过已通过关卡的权重占比（5 关的游戏只过前 4 关，最高 66.7%）。总分是所有游戏得分的平均值。

## 设计上值得学什么

交互式任务允许被测系统先尝试动作、观察反馈，再调整策略。评估这种能力时，环境状态和可观察反馈本身就是任务设计的一部分。

## 资料依据

依据：论文 arXiv 2603.24621v2；`docs.arcprize.org` 的 methodology、actions、game-schema、scorecards、full-play-test、benchmarking-agent 各页；仓库 `arcprize/arc-agi-3-benchmarking` commit `27f3d03`（2026-11-12）和 `arcprize/ARCEngine` 的 `enums.py`（commit `90db472`，2026-11-12）；官方榜单页和测试政策页（均访问于 2026-11-18）。没有实际运行游戏，`ls20` 的具体玩法没有核实；公开、半私有、全私有各 25、55、55 个是论文发布时的数字，未确认之后有无增减；每个游戏的关数论文里有「至少 6 关」和按 5 关举例两种说法，未核实。
