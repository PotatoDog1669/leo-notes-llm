---
id: "B51"
order: "8.2"
title: "LiveBench 2.0（2026-11-06 版）"
aliases: ["LiveBench 2.0"]
summary: "让模型带着工具去干真实的活（做幻灯片、写调研报告、修线上代码的 bug、接手并长期维护一个应用），再加两组短问答，用脚本和评分细则给交回来的结果打分；题目定期换新以防被模型背过。"
domain: "长程自主与综合 Agent"
subject: "Agent 任务，Harness 由官方自备"
task: "多种形态混合"
scoring: "混合"
access: "部分公开"
sampleCount: "466（7 个套件）"
version: "2.0 · 2026-11-06"
reviewed: "2026-11-18"
links: [{"label": "官网与榜单", "url": "https://livebench.ai/"}, {"label": "v1 代码", "url": "https://github.com/LiveBench/LiveBench"}, {"label": "v1 题库", "url": "https://huggingface.co/livebench"}, {"label": "v1 论文", "url": "https://arxiv.org/abs/2406.19314"}]
---

## 评估对象

**能力：** 模型独立完成整件工作的综合能力。LiveBench 由 Abacus.AI 赞助，2024 年 6 月首发时是一套纯问答题（现称 v1，论文发表于 ICLR 2025），最后一版停在 2026-06-25。官网现在默认展示的是 2026 年 10 月起的 LiveBench 2.0，本条目按其 2026-11-06 版撰写。2.0 有 7 个套件：Agentic（长程任务，18 题）、Coding（24）、Browser Use（25）、Research（22）、Design（25），以及沿用 v1 题型的 Data Analysis（150 问）和 Reasoning（202 问）。前 5 个套件里模型要调用工具、多步完成任务，后 2 个是无工具的单轮问答。被测的是模型，运行框架由官方统一提供。

**指标：** 每个套件的分数是该套件全部任务得分的平均，0 到 100；Overall 是各套件分数的加权平均。截至 2026-11-18 访问官网数据文件（页面标注最后更新于 2026-11-11），2026-11-06 版 Overall 最高是 84.9，Claude Fable 5.2（xhigh 档）和 GPT-6.2 Astra 并列，未取整时前者 84.88、后者 84.87。

## 任务格式

Agentic 套件让模型接手一个现成的应用或代码库，在多轮变化的需求、模拟的数月运营或一连串故障中持续保持正确，也有按规格书写编译器、优化性能这类题。Coding 给一份 bug 报告和一个冻结在某个快照的大型生产代码库，每题对应一个真实合并过的 PR。Browser Use 让模型看截图操作真实浏览器，在网店、项目看板、预约系统、记账本、客服工单、维基这几个网页应用里完成多步任务。Research 给一份带具体人物和处境的委托，常附文件，要求交一份带出处的报告。Design 要求按要求产出或改造 Word、PDF、幻灯片文件。

**示例（题目未公开，以下为官方披露的任务形态）**

- **需求**（概括，译自官网方法说明里对 Research 套件的一句举例，不是题面）： Research 套件的一类任务：判断一份理赔记录里哪些航班延误应当获得赔偿。
- **原始题目：** 未公开。LiveBench 2.0 的任务没有公开下载，也没有公开评测代码；官网的方法说明对每个套件只用一句话举几个例子（上面的「需求」就译自其中半句），没有贴出任何一道题的题面。公开的只有 v1 的旧问答题，见下面的「数据格式」。
- **输入材料：** 委托说明和附带的文件（理赔记录）。
- **要做的：** 自行检索规则和资料，逐条判断，写出一份委托人可以据此行动的报告并给出来源。
- **判分：** 按这道题专属的评分细则给报告打分。

**数据格式：** 2.0 的任务没有公开下载。下面是 v1 公开在 Hugging Face 上的问答题记录（`livebench/reasoning` 等 6 个数据集），2.0 的 Reasoning 和 Data Analysis 沿用这类题型。

```
question_id             题目的哈希编号
category                大类，如 reasoning
task                    题型，如 zebra_puzzle、spatial
turns                   给模型的提示词列表，通常只有一条，里面写明答案格式
ground_truth            标准答案，如「1, filmmaking, police-officer, journalist」
livebench_release_date  这道题加入的版本日期
livebench_removal_date  这道题被移除的日期，仍在用则为空
level                   整数，看到的斑马谜题样例为 15，含义未核实
```

## 评估流程

1. **启动：** 2.0 的榜单由官方自己跑，没有公开评测代码。v1 的代码在 GitHub，入口是 `run_livebench.py`，按版本日期选题，依次生成回答、判分、汇总。
2. **执行：** 每个模型每个套件只跑一遍，用模型支持的最高推理强度，例外会标在模型名上。Browser Use 靠截图操作，不能接收截图的模型该套件记 0。v1 的问答题默认温度 0。
3. **判分：** Agentic 用脚本对照隐藏的参考数据、隐藏测试程序或模拟结果。Coding 用隐藏测试，修好了但破坏原有行为的记 0。Browser Use 检查回答和应用里最终的数据是否符合预期。Design 把产出的文件渲染出来做视觉和结构检查。Research 按评分细则评，由谁来评官网没有说明。两个问答套件对照标准答案，用的是脚本而不是 LLM 评审：以 v1 代码里的斑马谜题为例，从回答的 `<solution>` 标签里取出逗号分隔的答案逐项比对，得分是「是否全对」和「答对比例」的平均。
4. **算分：** 套件分 = 任务得分的平均；因框架或服务商故障测不出的任务重跑一次，仍失败记 0，不从分母里剔除。Overall 的权重在 2026-11-06 版是 Agentic 2、Coding 1.5、Design 1.5、其余各 1，缺分的套件不计入。官网另报每题成本。

## 资料依据

依据：livebench.ai 的前端脚本 `main.cb056455.js`（方法说明和套件定义写在其中）和 `data/20261106/` 下的 `table.csv`、`categories.json`、`cost.csv`、`breakdown.json`、`notes.json`，以及 v1 的 `v1/table_2026_06_25.csv`（访问于 2026-11-18）；GitHub `LiveBench/LiveBench` commit `1d1006a`（2026-10-18）的 README、changelog、`gen_api_answer.py` 和斑马谜题判分代码；Hugging Face `livebench/reasoning` revision `6fc6498`（2025-04-07）的前 100 行。页面在浏览器端渲染，Overall 是按前端的加权公式从数据文件算出的，与页面说明里提到的 84.9 吻合。同一版的 `notes.json` 仍写各套件等权，与 `categories.json` 里的权重不一致，本条目以后者和方法说明为准。2.0 的任务内容、运行框架和 Research 的评审方式没有公开，无法核实。Hugging Face 上的题只到 2024-11-25 版；模型在两个问答套件上的得分与 v1 最后一版相同，据此推断是沿用，没有直接证据。论文没有读。
