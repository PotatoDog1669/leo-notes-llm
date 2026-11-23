---
id: "B01"
order: "1.1"
title: "Terminal-Bench 4"
aliases: []
summary: "把 Agent 放进一个准备好的容器环境，给它一段文字需求和 8 小时，让它用命令行把一件专业工作做完，再把指定的交付物拿到另一个独立的判分容器里用程序检查。"
domain: "软件工程"
subject: "Agent 任务，Harness 也是变量"
task: "终端/容器任务"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "66"
version: "4.1.0"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/harbor-framework/terminal-bench"}, {"label": "官网榜单", "url": "https://www.tbench.ai/"}, {"label": "4.0 公告", "url": "https://www.tbench.ai/news/terminal-bench-4-0"}, {"label": "4.1 公告", "url": "https://www.tbench.ai/news/terminal-bench-4-1"}]
---

## 评估对象

**能力：** 在终端里独立完成一件需要专业知识的完整工作。题目按 7 个大类标注：Software 18 题、Science 14 题、ML 11 题、Operations 9 题、Hardware 5 题、Security 5 题、Media 4 题，具体如数据库在线切换、CUDA 算子优化、FreeCAD 建模、保修理赔审核、Coq/Lean 证明、乐谱转写。作者估计专家完成一题需 0.75 到 60 小时。被测的是 Agent 整体，即 Harness 加模型。

**版本：** Terminal-Bench 从 3.0 起改为持续更新、语义化版本号。4.0（2026-08-26 发布）是在 3.0 的 74 题上删掉 8 题、修 19 题并把时限统一成 8 小时；4.1（2026-11-03 发布）题目不增不减，只加固判分脚本，Agent 看到的环境不变。本条目依据 4.1.0，官网首页当前展示的也是 4.1 榜单。

**指标：** 通过率（官网称 resolution rate），即成功的尝试数除以全部尝试数，每题至少跑 5 次，同时给出 95% 置信区间、Token 数和费用。截至 2026-11-18 访问官网 4.1 榜单，52 份成绩里最高分是 71.2% ± 2.9%（GitHub Copilot + Copilot Fusion，推理强度 max，模型发布日期 2026-11-17）。

## 任务格式

Agent 拿到一段需求和容器的 shell，自己决定执行什么命令。每题在 `task.toml` 的 `artifacts` 里写明要收走的交付物（文件、目录、代码补丁或其他服务容器里的快照），判分只看这些交付物。全部 66 题的时限都是 8 小时，需求末尾统一附一句「你有 28800 秒，不要用网上针对本题的答案作弊」。11 题是多容器环境（带数据库、消息队列等服务），3 题需要一块 H100 GPU。

**示例（真题 `cad-model`）**

- **需求**（第一句的原文翻译；后面两句是各题统一附加的时限和禁止作弊说明）：请输出一个 STEP 文件到 `/app/out.step`，内容是 `/app/schematic.png` 这张二维图纸所描述的物体。
- **原始题目**（`instruction.md` 全文；文件开头另有一行防训练污染的 canary 注释，不录）：

  ```text
  I'd like you to output a STEP file in `/app/out.step` which contains the object described by the 2d schematic
  in `/app/schematic.png`.

  You have 28800 seconds to complete this task. Do not cheat by using online solutions or hints specific to this
  task.
  ```
- **初始状态：** 一个只有 Python 3.12 的容器，`/app` 下放着图纸 `schematic.png`，画的是一个带曲面的角码零件。
- **Agent 要做的：** 读懂图纸上的形状和尺寸，自己装 CAD 库（参考解用 build123d）建出三维模型并导出 STEP。
- **判分：** 把 STEP 转成三角网格，检查 8 项几何性质：是否封闭、体积、表面积、主惯性矩、凸包体积、凸包面积、欧拉数、平均曲率积分。数值项与参考解相差不超过 0.1%，8 项全过才得分。

**数据格式：** 一题一个目录，另有 `tasks/dataset.toml` 列出 66 题的名称和内容摘要值。

```
cad-model/
├── instruction.md   给 Agent 的需求
├── task.toml        配置：时限、CPU/内存/GPU、交付物路径 artifacts、类别、专家耗时估计
├── README.md        题目说明：难点、解法、判分思路、逐版本修改记录
├── environment/     Agent 容器的 Dockerfile（多容器题另有 docker-compose.yaml）和题目数据
├── solution/        参考解 solve.sh，Agent 看不到
└── tests/           判分容器的 Dockerfile、入口 test.sh、检查程序 checks.py、汇总规则 reward.toml
```

## 评估流程

1. **启动：** 用评测框架 Harbor 发起，例如 `harbor run -d terminal-bench/terminal-bench@4.1.0 --agent claude-code --model <模型> --env modal`。4.1 另有去掉 3 道 GPU 题的 63 题版本 `terminal-bench/terminal-bench-cpu@4.1.0`。
2. **环境：** 每次尝试按题目的 `environment/` 构建并启动全新容器，官方推荐在 Modal 或 Daytona 云沙箱上跑。资源按题配置：2 到 16 核 CPU，4 到 32 GB 内存；Agent 容器默认可联网。
3. **执行：** `instruction.md` 的内容作为提示词交给 Agent，Agent 工作到自己停下或满 8 小时被终止。
4. **判分：** 66 题全部采用「独立判分环境」：Agent 结束后，Harbor 先清理交付物里的危险符号链接和权限位，再把它们复制进由 `tests/Dockerfile` 构建的另一个容器，运行 `test.sh`。检查程序是 pytest 或 RewardKit 写的确定性检查，多数题要求全部检查项通过，结果写成 1 或 0。判分不用 LLM；只有上榜审核时，维护者才用 LLM 审查成功尝试的轨迹，被认定作弊的尝试改记 0 分。
5. **算分：** 通过率 = 成功的尝试数 ÷ 全部尝试数，出错的尝试按 0 分计入。榜单要求 66 题齐全、每题至少 5 次、不得改时限和资源，同时公布 pass@2 到 pass@5。4.0 榜单目前只收维护者自己跑的成绩。

## 设计上值得学什么

把执行和判分放在独立环境里，按事先声明的交付物评分。设计自己的评测时，可以先问交付物能否脱离运行轨迹被独立验证。

## 资料依据

依据：仓库标签 `v4.1.0`（commit `4070d6c`，2026-11-03）和 `v4.0.0`（commit `452bf30`，2026-08-26）的全部 66 份 `task.toml`、`instruction.md`、`test.sh`，以及 `cad-model` 的判分代码和 `leaderboard/` 下的提交说明与算分代码；官网首页和两篇公告访问于 2026-11-18；流程读自 Harbor 文档（commit `3ee9f53`，2026-11-17）。没有实际运行。「判分不用 LLM」是按各题 `test.sh` 和 `reward.toml` 搜索关键词得出的，没有逐题读完检查程序；4.0 榜单（在 Harbor Hub 上）没有打开核对。
