---
id: "B37"
order: "4.6"
title: "SimpleBench"
aliases: []
summary: "出一些普通人凭生活常识就能答对、但故意带干扰信息的六选一文字题，看模型会不会被绕进去；每题答五遍取平均正确率，并和一组普通人的成绩对比。"
domain: "通用推理与知识"
subject: "模型直接作答"
task: "静态问答"
scoring: "标准答案匹配"
access: "部分公开"
sampleCount: "204（公开 10）"
reviewed: "2026-11-18"
links: [{"label": "官网与榜单", "url": "https://simple-bench.com/"}, {"label": "技术报告", "url": "https://drive.google.com/file/d/1mddNFK5UbBFVr3oDftd2Kyc6D8TFctfe/view"}, {"label": "GitHub", "url": "https://github.com/simple-bench/SimpleBench"}, {"label": "公开题", "url": "https://github.com/simple-bench/SimpleBench/blob/main/simple_bench_public.json"}]
---

## 评估对象

**能力：** 不需要专业知识的日常推理：能否在一段夹着无关细节的叙述里看出真正决定答案的那一句。由 SimpleBench Team 出品，技术报告署名 Philip 和 Hemang，发布于 2024-10-31，联系邮箱和赞助页属于 YouTube 频道 AI Explained。报告称全部 204 题由团队手写，先内部审核，再由四位博士水平的审稿人筛过。按报告的估计，空间推理约占 40%，时间推理 10%，社交常识 25%，语言陷阱题 25%。被测的是模型，纯文字，不带工具。

**指标：** 榜单列名是 Score (AVG@5)：每个模型把全部题独立答五遍，五遍正确率的平均。六个选项，随机猜约 16.7%。官方给出的人类基线是 83.7%，另列一行「最高人类成绩」95.4%。截至 2026-11-18 访问官网榜单数据文件，共 112 个模型，最高是 Claude Fable 5.2 的 94.9%（2026-11-10 加入），其后是 Gemini 4 Carbon 92.6%、Gemini 4 Argon 91.7%，共有 6 个模型高于人类基线。官网首页的导语还写着人类基线高于所有被测模型、最高的是 Claude Fable 81.9%，与榜单数据不一致，导语没有跟着更新。

## 任务格式

每题是一段几句话的情境描述加一个问题，后面跟 A 到 F 六个选项，只有一个正确。题目常夹着看似要计算、其实与答案无关的细节，或者有一句话悄悄改变了整个局面。单轮问答，没有附加材料。

**示例（真题 `question_id` 2，原文翻译）**

- **需求：** 一位杂耍演员把一个实心蓝球抛到一米高，接着把一个同样大小的实心紫球抛到两米高。随后她小心地爬到一架高梯子的顶端，头上顶着一个黄气球。此刻紫球相对于蓝球最可能在哪里？
- **原始题目**（公开题文件 `simple_bench_public.json` 里 `question_id` 2 的 `prompt` 字段，全文）：

  ```text
  A juggler throws a solid blue ball a meter in the air and then a solid purple ball (of the same size) two
  meters in the air. She then climbs to the top of a tall ladder carefully, balancing a yellow balloon on her
  head. Where is the purple ball most likely now, in relation to the blue ball?
  A. at the same height as the blue ball
  B. at the same height as the yellow balloon
  C. inside the blue ball
  D. above the yellow balloon
  E. below the blue ball
  F. above the blue ball
  ```
- **输入材料：** 六个选项：A 与蓝球一样高；B 与黄气球一样高；C 在蓝球里面；D 在黄气球上方；E 在蓝球下方；F 在蓝球上方。
- **要做的：** 先写推理过程，最后一行按 `Final Answer: X` 的格式给出一个字母。
- **判分：** 标准答案是 A。报告的解释是：等她爬到梯子顶，两个球都早已落地。

**数据格式：** 公开题文件 `simple_bench_public.json`，顶层只有一个键 `eval_data`，下面是 10 条记录。其余题目不公开。

```
question_id  题号，1 到 10
prompt       给模型的完整题面，情境、问题和 A 到 F 六个选项都写在这一个字符串里
answer       正确选项的字母，如 "A"
```

## 评估流程

1. **启动：** 仓库入口是 `python run_benchmark.py --model_name=gpt-4o --dataset_path=simple_bench_public.json`，基于 weave 的评测框架，经 LiteLLM 调各家 API。外部只能跑 10 道公开题，完整题集上的榜单由官方自己跑。
2. **执行：** 每题一次请求。系统提示词是固定的一段：你是推理专家，总是选最符合现实的答案，一步步思考，最后按 `Final Answer: X` 给出 A 到 F 中的一个字母。题面作为用户消息。默认温度 0.7、top-p 0.95、最多输出 2,048 个 token，调用失败最多重试 3 次；o1 系列不设这些参数，报告里它们用的是去掉「一步步思考」的提示词。
3. **判分：** 用正则 `Final Answer:\s*([A-F])`（不分大小写）从回答里取出字母，与 `answer` 完全相同记对，否则记错；回答里找不到这个格式时代码会抛出异常。答错不扣分。代码另有多数表决模式：一题采样多次，正确字母占到一半以上才算对，报告称之为 MAJ@5。
4. **算分：** 单遍得分是答对题数占总题数的比例。报告的做法是每个模型独立跑五遍，报五遍的平均（AVG@5）和多数表决（MAJ@5），官网榜单只列 AVG@5。人类基线来自 9 名志愿者，每人随机做 25 题，全部题目至少被做过一次，取 9 人平均。

## 资料依据

依据：GitHub `simple-bench/SimpleBench` commit `fbc2e42`（2024-12-20）的 README、`run_benchmark.py`、`system_prompt.txt`、`weave_utils/scorers.py`、`weave_utils/models.py` 和 `simple_bench_public.json` 全部 10 条；官网首页和榜单数据文件 `static/js/leaderboard-data.js`（访问于 2026-11-18）；技术报告 PDF（2024-10-31）的数据集、实验设置和结果各节。没有实际运行。其余 194 道题不公开，无法核对；题量 204 和题型占比取自 2024 年的报告，官网只写「200 多道」，之后是否增删过题没有核实。仓库代码自 2024-12 后没有更新，模型名单只到当时的模型，官方现在跑榜用的代码、提示词和推理档位设置没有核实。榜单脚注提到的专门设计的提示词，在当前数据文件里没有看到带这个标记的条目。报告说个别志愿者接近满分（96%），官网写的最高人类成绩是 95.4%，后者怎么算的没有查到。官网另有一个开放式作答（Open-Ended）榜，只有 3 个模型，最高 64.8%，题目和判分方式未披露，本条目不涉及。
