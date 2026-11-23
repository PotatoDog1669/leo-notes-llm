---
id: "B10"
order: "1.10"
title: "SWE-Bench Pro"
aliases: []
summary: "把 Agent 放进一个真实的大型开源项目，给它一段经人工整理的需求说明，让它在断网的容器里改代码；再把它的改动拿到干净的镜像里重放，用隐藏的测试检查问题是否解决、原有功能是否完好。"
domain: "软件工程"
subject: "Agent 任务，Harness 也是变量"
task: "代码仓库任务"
scoring: "脚本/程序"
access: "部分公开"
sampleCount: "642（V2 公开集）"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/scaleapi/SWE-bench_Pro-os"}, {"label": "V2 榜单", "url": "https://labs.scale.com/leaderboard/swe_bench_pro_public_v2"}, {"label": "数据集", "url": "https://huggingface.co/datasets/ScaleAI/SWE-bench_Pro"}, {"label": "论文", "url": "https://arxiv.org/abs/2509.16941"}]
---

## 评估对象

**能力：** 在成熟的大型代码库里按一份需求说明修 bug 或加功能，改动往往跨多个文件，同时不能弄坏已有功能。题目取自真实的提交历史：相邻两次提交之间确实修了问题或加了功能，并带有能验证它的测试；再由人工补写问题描述、需求清单和新增接口说明。为降低模型在训练数据里见过答案的可能，公开题目只取 GPL 一类强著佐权许可证的项目。V2 公开集的 642 题来自 11 个仓库：openlibrary 82、ansible 82、flipt 78、qutebrowser 73、teleport 68、vuls 58、webclients 55、navidrome 52、element-web 52、NodeBB 38、tutanota 4，涵盖 Python、Go、JavaScript 和 TypeScript。被测的是模型加 Harness 的组合，榜单每行都注明所用的 Harness（Claude Code、Codex 或 mini-swe-agent）。

**版本：** 由 Scale AI 发布。原版（2025-09，论文）共 1865 题、41 个仓库，分三部分：公开集 731 题；商业集 276 题，来自 18 家创业公司的私有代码库，题目不公开但公布成绩；留存集 858 题，不公开也不公布成绩。V2（2026-09-22，与 Reflection 合作）只重做公开集：剔除 89 道无效题后剩 642 题，改写了 529 题的需求说明，加固了判分脚本，题目改成 Harbor 任务格式，并规定了一套锁定的评测流程；同时划出一个 51 题的难题子集 HARD-51。本条目依据 V2。

**指标：** Resolve Rate，即判为「已解决」的题目占比。截至 2026-11-18 访问 Scale 的 V2 榜单，全集 18 行成绩里最高是 99.4% ± 0.4（Claude Opus 5 + Claude Code，推理强度 xhigh，2026-10-07 录入），HARD-51 上最高是 98.00%（同一组合）。旧版榜单已标为停用，其公开集（731 题）最高为 61.50% ± 3.10，商业集最高为 51.50% ± 5.50（均为 Muse Spark 1.1 + mini-swe-agent，2026-07-09 录入）。

## 任务格式

Agent 在容器的 `/app` 目录（少数题是 `/testbed`）拿到项目在基准提交上的代码，git 历史经过清理，看不到修复提交。`instruction.md` 以拉取请求描述的形式给出问题、需求清单和新增接口，长度从 928 到 23642 字节不等，平均约 3900 字节；末尾附一条约束：不得查找或照抄现成的解法。Agent 直接改工作目录里的代码，不需要提交。每题时限 50 分钟，Agent 阶段断网。

**示例（真题 `instance_qutebrowser__qutebrowser-fea33d6…`）**

- **需求**（概括）：qutebrowser 在决定是否启用「额外文件后缀」这个变通处理时，比较的是编译时的 Qt 版本，而不是运行时实际加载的 Qt 版本。要求 `extra_suffixes_workaround` 改为调用 `version_check("6.2.3", compiled=False)` 和 `version_check("6.7.0", compiled=False)`，只有运行时 Qt 版本不低于 6.2.3 且低于 6.7.0 时才启用，否则返回空集合。没有新增接口。
- **原始题目**（V2 任务目录里的 `instruction.md` 全文）：

  ```text
  A code repository is available in the `/app` directory. Your task is to implement the changes necessary to
  satisfy the following Pull Request (PR) description:

  <pr_description>
  # Title: Version gate for suffix workaround ignores runtime Qt

  ## Description
  When qutebrowser decides whether the extra suffixes workaround applies, its Qt version comparison reflects the
  version qutebrowser was built against, not the Qt libraries actually running at launch. The upstream fix lives
  in qtbase, so the decision should depend on the Qt version present at runtime rather than the bindings or
  build-time Qt version.

  ## Requirements

  - `extra_suffixes_workaround` must evaluate the lower version bound by calling `version_check("6.2.3",
  compiled=False)`.

  - `extra_suffixes_workaround` must evaluate the upper version bound by calling `version_check("6.7.0",
  compiled=False)`.

  - The MIME suffix workaround must activate only when both version checks pass (runtime Qt ≥ 6.2.3 and <
  6.7.0), and must return an empty set when either check fails.

  ## New Interfaces

  No new interfaces are introduced
  </pr_description>

  Constraints:
  * Do not reference, look up, or copy existing solutions, external PRs, or online workarounds. The
  implementation must be entirely your own independent work.
  ```
- **初始状态：** qutebrowser 仓库停在基准提交上，依赖已装好。
- **Agent 要做的：** 找到这个函数（在 `qutebrowser/browser/webengine/webview.py`）并修改。参考补丁只动了两个文件。
- **判分：** 判分脚本打上隐藏的测试补丁，运行 `tests/unit/browser/webengine/test_webview.py`。配置里列出 14 个「原本失败、现在应通过」的测试和 6 个「原本通过、必须保持通过」的测试，20 个全部通过才得 1 分，否则 0 分。

**数据格式：** 一题一个目录，目录名是 `instance_<组织>__<仓库>-<提交哈希>`；同样的内容在 HuggingFace 上以表格形式提供（`default` 配置为 V2，`hard` 为 HARD-51，`v1` 为原版 731 题）。

```
v2/tasks/instance_qutebrowser__qutebrowser-fea33d6…/
├── instruction.md     给 Agent 的需求：问题描述、需求清单、新增接口
├── task.toml          配置：预构建镜像、时限、资源、各阶段的网络策略
├── environment/       Dockerfile，只有一行，引用 ghcr.io 上的预构建镜像
├── solution/          参考补丁 gold_patch.diff 和 solve.sh
└── tests/
    ├── test.sh           判分入口
    ├── test_patch.patch  隐藏测试，以补丁形式加入仓库
    ├── run_script.sh     按该项目的方式运行指定的测试文件
    ├── parser.py         把测试输出解析成「测试名、状态」列表
    └── config.json       两组测试名（fail_to_pass / pass_to_pass）和要运行的测试文件
```

## 评估流程

1. **启动：** 用 Harbor 发起，官方在 Modal 云沙箱上并行：`harbor run -p v2/tasks -e modal -n 50 -a locked_claude_code:LockedClaudeCode -m <模型> --allow-agent-host <模型接口地址>`。仓库的 `v2/tooling/` 提供了 Claude Code、Codex 和 mini-swe-agent 三种 Harness 的「锁定版」。
2. **环境：** 每题拉起自己的预构建镜像，统一 1 核 CPU、4 GB 内存、10 GB 磁盘。Agent 阶段断网，只放行模型接口地址，并禁用 Harness 自带的网页工具；构建和判分阶段可以联网（个别 Go 题在测试时要下载模块）。
3. **执行：** Agent 在 50 分钟内改代码。超时由容器内的 `timeout` 命令执行，所以超时后已做的改动仍会被收走判分。锁定版 Harness 在结束时把 `git diff` 存为 `model.patch`。
4. **判分：** `test.sh` 先把仓库里的测试代码恢复到基准状态、删掉 Agent 新加的测试文件，打上隐藏测试补丁，运行指定的测试文件，再由 `parser.py` 解析结果；两组测试里列出的每一个都通过才算已解决，写入 `reward.txt`（1 或 0）。判分不用 LLM。锁定流程要求再做一遍「重放判分」：用 `patch_replay:PatchReplayAgent` 把 `model.patch` 打到全新的原始镜像上，运行同一个判分脚本，以防 Agent 在自己的容器里动过依赖缓存之类的环境；榜单以重放判分的结果为准，两种结果都要公布。
5. **算分：** Resolve Rate = 已解决题数 ÷ 总题数（全集 642，HARD-51 为 51），榜单附置信区间。

## 资料依据

依据：仓库 `scaleapi/SWE-bench_Pro-os` 主分支（commit `66f9276`，2026-09-22）的 `v2/README.md`、`v2/GATE.md`、`v2/tooling/`、全部 642 份 `task.toml` 和 `instruction.md` 的长度统计、另外抽查的 16 份 `instruction.md`，以及示例题的全部文件；HuggingFace 数据集 `ScaleAI/SWE-bench_Pro` 的元数据；Scale 的 V2 榜单页、旧版榜单页（含页面内嵌的榜单数据）、论文介绍页和 arXiv 摘要页访问于 2026-11-18。没有实际运行，也没有拉取镜像。论文全文没有读，原版三个子集的数字取自榜单页和论文摘要。商业集和留存集的题目不公开，无法查看。榜单各行实际用的步数和费用上限、置信区间的算法、以及 V2 榜单是否每题只跑一次，页面没有说明。原版（v1）的评测脚本只看了目录结构，没有细读。
