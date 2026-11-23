---
id: "B49"
order: "7.4"
title: "MazeBench"
aliases: []
summary: "把 Agent 放进一个由两百多个房间连成的三维推箱子迷宫世界，让它一步一步移动、转动镜头、推箱子去找 100 颗宝石，按找到的宝石数计分。"
domain: "多模态与空间"
subject: "Agent 任务，Harness 也是变量"
task: "交互式环境"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "1 个开放世界（256 个房间、100 颗宝石）"
reviewed: "2026-11-18"
links: [{"label": "官网", "url": "https://mazebench.com/"}, {"label": "结果说明", "url": "https://mazebench.com/blog?post=maze-bench-results"}, {"label": "榜单", "url": "https://mazebench.com/leaderboard/ai"}, {"label": "仓库", "url": "https://github.com/mazebench/MazeBenchEngine"}]
---

## 评估对象

**能力：** 在三维空间里看懂周围环境并执行长计划的能力。世界里布满推箱子式的谜题，箱子形状大小各异，要把箱子当工具推开别的箱子、填坑、开路，单个谜题常需一百步以上；另有升降台、可开关的墙、冰面斜坡等机关。房间按难度排成课程，越远越难。被测的是 Agent，即 Harness 加模型，官方让模型在各自厂商的 Harness（Codex、Claude Code、Antigravity 等）里运行。出品方是 Jonathan Pappas 和 David Pappas，由 Prime Intellect 的驻留项目资助；没有论文，官方材料是网站博客和仓库。

**指标：** 收集到的宝石数，一颗宝石记 1%；另报探索分，即到过的房间数（共 256 间）。榜单按观察方式（图像或 ASCII）和是否允许写 Python 分成四栏，目前只有两栏 ASCII 有成绩，图像栏为空并标注「即将推出」。截至 2026-11-18 读取官方榜单页的数据文件：不允许 Python 的 ASCII 栏 47 条成绩里最高是 GPT-6 Astra（Codex，max）24 颗宝石、122 个房间；允许 Python 的 ASCII 栏 27 条里最高也是 GPT-6 Astra，23 颗宝石、113 个房间。这些都是运行中途的快照，不是通关结果。2026-07-28 的官方博客写的是不用 Python 时没有模型超过 1%，用 Python 时最高约 13%。

## 任务格式

Agent 通过 MCP 工具操作游戏：上下左右四个移动、四个镜头旋转、撤销一步、重置当前房间、传送回已到过的房间，以及一次提交多个动作的 `action_sequence`。移动方向以屏幕为准，镜头转过之后方向随之改变，镜头共有 20 个角度。每次动作后返回新的观察和一组元数据（当前房间、视角、已得宝石数、到过的房间、是否死亡）。环境不告诉它某一步是否被挡住，只能从新的观察里自己判断；掉进深渊后只能撤销、重置或传送。除游戏工具外，Agent 没有 shell、文件系统和网络；开启 Python 的赛道另给一个不联网的 Python 环境，可以自己写求解程序。

**示例（真实房间 `H I`，默认起始房间，关卡文件 `ftplmvndyl.txt`）**

- **原始题目**（题面是游戏，没有文字需求。以下照录两段最接近题面的原文：一是开局时发给 Agent 的任务提示词模板，出自仓库 `environments/mazebench/mazebench_tools/__init__.py` 的 `_tool_prompt`，节选，全文约 200 词；二是这个房间的关卡文件开头）：

  任务提示词模板。花括号是代码里的占位符：`{mode}` 填观察方式，`{objective}` 填目标句（默认是收集 100 颗宝石获胜），`{budget}` 填步数上限或不限步数的说明，`{quit_policy}` 说明能否用 quit，`{python_policy}` 在开启 Python 的赛道填一段 `python_exec` 工具说明，否则为空。

  ```text
  Play the hidden 3D grid game using only the supplied game controls.

  Call `start` exactly once first and inspect its sanitized {mode} observation. Use the
  named action tools `up`, `down`, `left`, `right`, `rotate_camera_up`,
  `rotate_camera_down`, `rotate_camera_left`, `rotate_camera_right`, `undo`, `reset`,
  `go_to_level`, and, when permitted, `quit`.
  [……省略约 60 词……]
  The controls do not report whether a movement was blocked; infer its effect only from the
  returned observation.{python_policy}

  {objective} Explore as many rooms as possible. {budget} {quit_policy}
  Finish with a short route summary only after a game result says `ended: true`. A belief that
  no useful move remains is not a stop condition: while `ended: false`, never provide a final
  response and continue using the game controls.

  The game implementation, session, checkpoints, and scoring are evaluator-only. Do not try to
  locate or access them. Do not claim moves or scores that were not returned by the game controls.
  ```

  房间 `H I` 的关卡文件 `games/maze/levels/ftplmvndyl.txt` 的前 7 行（全文 16 行，每行 16 格，省略处的「词」指格子）。Agent 拿到的不是这个文件，而是引擎据此渲染出的观察。

  ```text
  .+# .+# .+# .+# .+# .+# . . . . .+# .+# .+# .+# .+# .+#
  .+# . . . . . . . . . .+# . . . . .+#
  .+# . . . . . . . . . .+# . . . . .+#
  .+# .+# .+# . .+# .+# .+# .+# .+# .+# .+# . . . . .+#
  .+# .+# .+# . .+# .+# .+# .+# .+# .+# .+# . . . . .+#
  .+# . . . . . . . M0 M0 . . . . . .+#
  .+# . . . . . . . M0 M0 . . . . . .+#
  [……省略约 140 词……]
  ```
- **初始状态：** 一个 16×16 格的房间，四周是墙，玩家在下方的空地上。中部一条横向通道里放着一个占 2×2 格的轻箱子（记号 `M0`），右侧有两处 2×2 的坑，上方墙上的缺口通向相邻房间。这个房间里没有宝石。
- **要做的：** 没有文字需求，目标始终是在整个世界里找到 100 颗宝石。Agent 要自己观察，弄清箱子能往哪推、坑怎么过，然后走出这个房间继续探索。
- **判分：** 引擎记录到过的房间和拿到的宝石，离开这个房间进入新房间使探索分加一。

**数据格式：** 世界由一张房间坐标表和每个房间一个文本文件组成，仓库的 `games/maze/` 下共 256 个在用的关卡。

```
games/maze/
├── world_map.json       关卡文件名到房间坐标的映射，如 "ftplmvndyl.txt": ["H", "I"]，共 16×16 个房间
├── world_parsing.json   世界和房间的尺寸，均为 16×16
├── level_parsing.json   关卡记号表：. 地板、# 墙、G 宝石、p 玩家、M0 至 M4 轻箱子、Sl 等冰斜坡、l 升降台
├── config.json          通关所需宝石数 100
└── levels/<名>.txt      一个房间 16 行，每行 16 格，用空格分隔；格内用 + 自下而上叠放，如 .+#+G 是地板、墙、宝石
```

## 评估流程

1. **启动：** 安装 `mazebench` 包后用 Prime Intellect 的 Verifiers 框架发起，例如 `uv run --no-editable --project environments/mazebench eval @ configs/eval/mazebench-codex-game-only.toml`，配置里写明模型、Harness、观察方式和动作上限。
2. **环境：** Harness 在一个全新的隔离沙箱里运行，标准工具（如 shell）被禁用，只能连到模型服务和游戏工具。游戏引擎是 JavaScript 写的，运行在评测方一侧，不进入 Agent 的沙箱。
3. **执行：** 观察有三种：`vision` 返回一张透视渲染的 PNG 图（默认 512×512）；`ascii` 返回字符画，物体的顶面和侧面用不同字符，同样可以转镜头；`json` 返回视野内物体及其坐标的列表。官方运行不限步数，Agent 一直玩到自己退出、出错或被停止。为控制成本设有停滞检测，默认参数是最近 100 步里出现新棋盘状态的比例降到 10% 或以下就终止。
4. **判分：** 模型退出后由引擎根据权威游戏状态结算，不用 LLM。输出三个分量：宝石数、新到达的房间数、推箱子到达的新位置数。成绩单不给模型看。
5. **算分：** 榜单分数等于收集到的不同宝石数除以 100，同时展示房间数、步数、token 用量和估算费用。训练用途下三个分量按权重 1.0、0.1、0.05 相加。

## 资料依据

依据：官方博客《MazeBench Results》（2026-07-28）、官网首页、榜单页及其数据文件 `/data/ai-leaderboards.json`（访问日期 2026-11-18）；GitHub 仓库 commit `d1ed1dc`（2026-11-16）里的 README、`environments/mazebench/README.md`、`docs/maze-level-format.md`、提示词文件、`configs/eval/` 和上述关卡文件，通过 raw 文件读取，没有克隆整仓。没有核实的内容：没有运行游戏，房间 `H I` 的描述是按关卡文件的记号读出来的；没有逐个统计关卡文件里的宝石数，100 颗来自配置和榜单数据；榜单各条成绩所用的引擎和世界版本不同（早期成绩的宝石总数是 71 到 90），彼此不完全可比；官方每个模型的运行次数、停滞检测在榜单运行里的具体参数没有查到。博客称当前版本是 v0.7，官网页面内的版本号是 `maze-v1.1.88`，两者的对应关系不清楚。
