---
id: "B11"
order: "1.11"
title: "SWE-Marathon"
aliases: []
summary: "给 Agent 一个容器和 4 到 10 小时，让它独立完成一项人类专家要做几十到几百小时的软件工程（如用 Rust 重写 Kubernetes、从零做一个 Slack 式聊天应用）；结束后在同一个容器里跑多层验证，全部通过才得分。"
domain: "软件工程"
subject: "Agent 任务，Harness 也是变量"
task: "终端/容器任务"
scoring: "混合"
access: "全部公开"
sampleCount: "20"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/abundant-ai/swe-marathon"}, {"label": "官网榜单", "url": "https://www.swe-marathon.org/"}, {"label": "论文", "url": "https://arxiv.org/abs/2606.07682"}]
---

## 评估对象

**能力：** 在数小时、上千万 Token 的跨度里持续推进一项大工程：自己规划、自己验证、不提前收工，也不走捷径骗过测试。官网把 20 题分成四类：库和系统的重写或复现 8 题（如用 Rust 写 C 编译器、只看 RFC 写 zstd 解码器、在 Vite 上重做 Next.js）、产品克隆 5 题（Excel、Mastodon、S3、Slack、Stripe）、机器学习工程 5 题（如在一块 H100 上微调模型、为 AlphaFold-3 的一个算子写 GPU 内核）、算法与优化 2 题。每题在配置里注明专家预计耗时，从 4 小时到 400 小时不等。被测的是模型加 Harness 的组合，榜单每行写明所用的 Harness（Claude Code、Codex、Antigravity CLI 等）。

**版本：** 由 Abundant AI 牵头发布，论文被 NeurIPS 2026 的 Evaluations and Datasets Track 接收。v1.0 于 2026-06 发布；v1.1（2026-07 发布，仓库标签 `v1.1-official`）仍是 20 题，但全部题目都改过：除 4 道克隆题外都改为断网运行，时限和资源上调，一道依赖外部服务的微调题换成了自带 GPU 的版本，并改用官方的 Harbor 0.20.0。本条目依据 v1.1。

**指标：** Resolution rate（pass@1），即得 1 分的尝试占全部尝试的比例；v1.1 每题跑 8 次，一个配置共 160 次尝试（v1.0 每题 5 次）。各题另记一个未校准的部分得分，只用来看进度，不计入榜单。截至 2026-11-18 访问官网，v1.1 榜单显示 20 个配置，最高 53.8%（Gemini 4 Carbon，推理强度 high，Antigravity CLI，160 次尝试通过 86 次，运行于 2026-11-05 至 11-07）；v1.0 存档榜单最高为 29%（Grok 4.5 + Grok Build）。

## 任务格式

Agent 在容器里拿到需求说明和起步材料（规格文档、参考实现、骨架代码或数据，视题而定），直接在工作目录里干活，结束时成果留在指定位置。需求说明短的约 1 KB，带界面的克隆题长达 20 KB 左右，把接口和界面要求逐条列出。每题都有 `/app/timer.sh`，可随时查看剩余时间。时限按题设定：4 小时 5 题，5 小时 4 题，6、7 小时各 1 题，8 小时 2 题，10 小时 7 题。

**示例（真题 `zstd-decoder`，时限 5 小时）**

- **需求**（概括）：只依据 RFC 8878（放在 `/app/rfc8878.txt`）用 C 语言写一个 Zstandard 解码器，命令形式为 `/app/src/zstd_decompress <input.zst> <output> [dictionary]`，对任何 zstd 压缩输入都要和 `zstd -d` 的输出逐字节一致，包括带训练字典的帧。不得调用 libzstd 或其他现成实现，不得改 Makefile。
- **原始题目**（`instruction.md` 节选，全文约 330 词，见仓库 `tasks/zstd-decoder/instruction.md`）：

  ````text
  # Zstandard Decoder

  Build a Zstandard decoder in C, working only from RFC 8878 (at `/app/rfc8878.txt`). When done, it should run
  as

  ```
  /app/src/zstd_decompress <input.zst> <output> [dictionary]
  ```

  and produce byte-identical output to `zstd -d` on any zstd-compressed input, including frames built with
  trained dictionaries.

  ## Ground rules

  - Implement everything yourself — no calls into libzstd or any other existing zstd implementation, by any
  route. The runtime is configured so that linking, `dlopen`, and similar shortcuts won't work.
  - C99 plus the system `libxxhash` for the frame checksum (already wired into the Makefile). Nothing else; no
  other compression or decompression libraries.
  - Sealed environment: no network, no package manager, no interpreters.
  - Build with `cd /app/src && make`. Do not modify the Makefile.
  - `/app/test.sh` is a quick sanity check against a handful of visible inputs; useful for iteration, but not
  the full grading set, which exercises every feature listed below.
  [……省略约 150 词……]
  You do not have internet access — every tool, package, and dependency you need is already installed in the
  environment. You have 5 hours. Run `bash /app/timer.sh` to check how much wall-clock time remains.
  ````
- **初始状态：** RFC 全文、带 Makefile 的源码骨架、6 个公开的压缩样本，以及只覆盖这几个样本的自检脚本 `/app/test.sh`。容器里删掉了包管理器、Python、Perl 和 zstd 命令行工具，且不能联网。
- **Agent 要做的：** 实现帧头解析、三种块类型、Huffman 和 FSE 熵解码、序列执行、多帧和字典等全部环节，用 `make` 构建。
- **判分：** 判分脚本先核对 Makefile 未被改动，再删除系统里的 libzstd 并扫描 Agent 是否偷带了它的副本，然后用解码器解 6 个公开样本和 37 个隐藏样本，逐字节比对。43 个全对得 1 分，否则 0 分；通过比例另记为部分得分。

**数据格式：** Harbor 任务格式，一题一个目录。隐藏测试材料在构建镜像时加密打包，判分时才解开。

```
tasks/zstd-decoder/
├── instruction.md   给 Agent 的需求
├── task.toml        配置：时限、CPU/内存/GPU、各阶段网络策略、专家预计耗时、判分说明
├── environment/     Dockerfile、起步材料（RFC、源码骨架、公开样本）、自检脚本、timer.sh、隐藏样本
├── solution/        人写的参考解 zstd_decompress.c 和 solve.sh
├── tests/           判分入口 test.sh、公开样本的期望输出、测试说明 doc.md
└── scripts/         出题时生成测试数据的脚本
```

## 评估流程

1. **启动：** 用 Harbor 逐题发起，官方在 Modal 云沙箱上跑：`harbor run -p tasks/zstd-decoder -a claude-code -m <模型> -e modal --allow-agent-host <模型接口地址> --agent-kwarg disallowed_tools="WebSearch WebFetch"`。
2. **环境：** 每次尝试按题目的 Dockerfile 起一个全新容器，多数题 4 核 CPU、16 GB 内存；5 题配一块 GPU（4 题 H100，1 题 A100）。16 题的 Agent 网络为白名单模式，只放行模型接口（两道 Rust 题另放行 crates.io 等构建源），并关掉 Harness 自带的网页工具；4 道带界面评审的克隆题（Excel、Mastodon、S3、Slack）允许联网。
3. **执行：** Agent 工作到自己停下或时限用完。
4. **判分：** Agent 结束后，Harbor 在同一个容器里运行 `tests/test.sh`，写出 `reward.txt`。所有题都是 0/1 判分：重写类题目跑隐藏的测试套件，要求全部通过；优化和训练类题目要求指标达到门槛（如延迟、周期数、验证集损失）。不少题的判分脚本带防作弊检查（如核对受保护文件是否被改）。4 道克隆题的判分脚本在功能测试之外还有界面评审：由 Claude Opus 4.7 操作浏览器，按 `rubric.json` 逐条检查，再由 LLM 评审它的报告；功能测试和界面评审都满分才得 1 分，评审服务出错则该次尝试记为出错而不是 0 分。
5. **算分：** 通过率 = 得 1 分的尝试数 ÷ 全部尝试数（20 题 × 8 次）。

## 资料依据

依据：仓库 `abundant-ai/swe-marathon` 主分支（commit `c527248`，2026-11-13；`tasks/` 目录与标签 `v1.1-official` 完全相同）的 README、CHANGELOG、`scripts/run-benchmark.sh`、全部 20 份 `task.toml` 和 `instruction.md`，`zstd-decoder` 的 Dockerfile 和判分脚本，`slack-clone` 的界面评审脚本和配置（另外三道克隆题只核对了评审配置和合分脚本）；arXiv 摘要页和官网访问于 2026-11-18。没有实际运行，也没有构建镜像。官网是前端渲染的页面，榜单数字是按页面脚本里内嵌的逐次运行记录、照页面自己的筛选规则重算的，没有在浏览器里核对显示结果。论文全文没有读。判分脚本只细读了 `zstd-decoder` 一题，其余题只核对了写分数的部分和配置里的判分说明。约 800 GB 的运行日志需向作者申请凭据，没有查看。
