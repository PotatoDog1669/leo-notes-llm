---
id: "B03"
order: "1.3"
title: "FrontierSWE"
aliases: []
summary: "给 Agent 一个装好环境的 Linux 沙箱和 20 小时，让它独立完成一项接近人类能力上限的工程或研究任务（重写一个系统、压榨性能、训练模型等），再把工作目录拿到独立的判分容器里用程序打出 0 到 1 的分数。"
domain: "软件工程"
subject: "Agent 任务，Harness 由官方自备"
task: "终端/容器任务"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "34（v2）"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/Proximal-Labs/frontier-swe-v2"}, {"label": "官网榜单", "url": "https://www.frontierswe.com/"}, {"label": "v2 博客", "url": "https://www.frontierswe.com/blog/v2"}]
---

## 评估对象

**能力：** 在很长的时间跨度里独立推进一项开放的技术任务，并且在没有人指点的情况下自己判断做到什么程度、还能怎么改进。题目按五类标注（一题可属两类）：Implementation 14 题（如用 Zig 重写 git、用 Rust 写 SPICE 电路模拟器）、AI Research 9 题、Performance Optimisation 6 题、Scientific Computing 6 题、Visual Reasoning 6 题。被测的是模型；官方榜单统一用自家的 Harness「Proximus」来跑，每个模型开最高推理强度。

**版本：** 由 Proximal 团队发布。v2（2026-09-02 发布，仓库标签 `v2.0.0`）在 v1 基础上新增 21 题、退役 4 题，共 34 题，并把所有题目的得分统一成 0 到 1。本条目依据 v2。README 注明题目内容和计分仍可能调整。

**指标：** mean@5，即每题跑 5 次取平均分，再对 34 题取平均；榜单同时画出 5 次中最差和最好的范围，并列出每次尝试的平均费用和耗时。截至 2026-11-18 访问官网榜单，26 个模型里最高分是 69.9% ± 8.6（Claude Fable 5.2 + Proximus，2026-11-09 上榜）；v2 发布时（2026-09-02 博客）最高为 56.29%（Claude Fable 5.1）。

## 任务格式

Agent 以非 root 用户 `agent` 进入沙箱，工作目录是 `/app`。需求文字很短（34 题的 `instruction.md` 都在 591 到 2254 字节之间），细节靠工作目录里的文档、测试和自检工具自己摸清。每题都提供一个自检工具，其输出与正式判分的分数同向变化。沙箱不能访问外网，所需材料都已预置。33 题时限 20 小时，1 题 15 小时；11 题配 GPU（L4、T4、A10G、A100、H100、B200 不等）。

**示例（真题 `notebook-compression`）**

- **需求**（概括）：把 `/app/corpus/` 里的 Jupyter notebook 无损压缩得尽量小。成果放在 `/app/dist/`，运行 `python3 /app/dist/decompress.py <out_dir>` 必须只靠 `/app/dist/` 里的东西逐字节还原全部文件；`/app/dist/` 的总大小就算作压缩后大小。
- **原始题目**（`instruction.md` 全文）：

  ```text
  Compress the Jupyter notebooks (`.ipynb`) in `/app/corpus/` as small as you can, losslessly.

  Ship your work under `/app/dist/`: `python3 /app/dist/decompress.py <out_dir>` must recreate every notebook
  byte-for-byte into `<out_dir>`, using only what is under `/app/dist/`, and the total size of `/app/dist/` is
  considered as compressed data. Run `python3 /app/check.py` to verify the round trip and see your size.

  Confine your changes to `/app/dist`. This sandbox times out after a fixed amount of time — check it with
  `sandbox-timer --help`. Ensure to keep the workspace updated and in working condition even in case the sandbox
  times out. The machine is offline; everything you need is already present.
  ```
- **初始状态：** 约 650 MB 的真实 notebook 语料，一个只有空壳的 `decompress.py` 模板，自检脚本 `/app/check.py`，以及查看剩余时间的 `sandbox-timer` 命令。
- **Agent 要做的：** 自己设计压缩方案和解码器，例如挖掘 notebook 之间的重复结构、单独处理内嵌图片。
- **判分：** 判分容器以 `agent` 用户身份运行解码器，逐字节比对隐藏的原始语料，不一致得 0 分。一致则按压缩率算分：与整体 `xz -9` 打包一样大得 0 分，压到语料大小的 15% 得 1 分，中间按 `2^u − 1` 的曲线取值（`u` 是相对 `xz -9` 的压缩倍数提升占目标的比例）。

**数据格式：** 一题一个目录；判分代码多数放在 `environment/tests/`，构建时拷进镜像里只有 root 能读的 `/root/tests/`。

```
tasks/notebook-compression/
├── instruction.md    给 Agent 的需求
├── task.toml         配置：时限、CPU/内存/GPU、Agent 镜像和判分镜像的摘要值、交付物路径（整个 /app）
├── environment/
│   ├── Dockerfile    环境构建文件
│   ├── workspace/    Agent 的初始工作目录，含自检工具
│   ├── tests/        判分入口 test.sh、verify.py、算分 compute_reward.py
│   └── setup/        构建期脚本
├── solution/         参考解 solve.sh 及说明
└── preflight/        跑之前检查镜像是否正常的脚本
```

## 评估流程

1. **启动：** 题目是 Harbor 任务格式，官方用自己的轻量运行器 px-eval 发起：`rollout.py <tasks 目录> --environment environment.yaml --agent <Agent> --model <模型>`。
2. **环境：** 每次尝试在 Modal 云沙箱里拉起题目预构建好的镜像（`task.toml` 里按摘要值固定）。资源按题配置：2 到 16 核 CPU，4 到 128 GB 内存。网络为白名单模式，只放行模型接口等必要地址。
3. **执行：** Agent 工作到主动结束或时限用完。Proximus 是在 mini-swe-agent 上加了上下文压缩、看图和 `submit` 工具：`submit` 把当前工作目录记为一个候选并告知剩余时间，Agent 可继续干活，连续调用两次才算最终提交。
4. **判分：** 34 题全部采用独立判分环境：Agent 容器停掉，`/app`（排除缓存等）被复制进由判分镜像启动的全新容器，运行 `test.sh`。判分脚本先锁住分数目录，再降权到 `agent` 用户去编译和运行 Agent 的代码。各题算分公式不同，都输出 0 到 1 的分数：整套测试类题目会在判分时对测试做结构性变换以防硬编码，性能类题目用按指令加权的计数代替墙钟时间。判分不用 LLM；跑完后另有一组 LLM 评审读全部轨迹查作弊，确认作弊的尝试记 0 分。
5. **算分：** 每题 5 次得分取平均，34 题再取平均，即榜单上的百分数。

## 资料依据

依据：仓库 `Proximal-Labs/frontier-swe-v2` 标签 `v2.0.0`（commit `da83f84`，2026-09-19）的 README、CHANGELOG、全部 34 份 `task.toml` 和 `instruction.md`，以及 `notebook-compression` 的判分代码；px-eval 的 README；官网首页、v2 博客、更新日志页和 `git-to-zig` 题目页访问于 2026-11-18。没有实际运行，也没有拉取镜像。各题判分方式只细读了示例一题，其余取自博客的描述；「判分不用 LLM」来自 README 的说法（每题都有确定性的自动判分程序），没有逐题核对。榜单上 ± 值的统计含义页面没有说明。Proximus 的代码未见公开（README 称将合入 Harbor）。v1 的仓库没有查看。
