---
id: "B55"
order: "10.1"
title: "BrowseComp"
aliases: []
summary: "1,266 道「答案很短、很好核对，但要翻很多网页才找得到」的事实题，考联网的模型或 Agent 能不能坚持搜下去并找对，最后由一个 LLM 判断它的答案和标准答案是否一致。"
domain: "网页检索"
subject: "两种配置并存"
task: "静态问答"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "1,266"
reviewed: "2026-11-18"
links: [{"label": "参考实现", "url": "https://github.com/openai/simple-evals/blob/main/browsecomp_eval.py"}, {"label": "论文", "url": "https://arxiv.org/abs/2504.12516"}, {"label": "官方介绍", "url": "https://openai.com/index/browsecomp/"}]
---

## 评估对象

**能力：** 在开放互联网上持续、有策略地查找难找信息的能力。题目是出题人从一个已知事实出发「倒着」写的：把一个人、事件或作品的多个冷门特征拼成条件，答案一查就能验证，但正着找需要排查大量候选。出题时要求：当时的模型（GPT-4o 联网与不联网、o1、早期版 Deep Research）答不出，五次简单的 Google 搜索在首页找不到答案，另一个人十分钟内做不出来。论文里出题人自己尝试作答，两小时内只解出 29.2%。题目按主题分布为影视 205、其他 197、科技 173、艺术 127、历史 125、体育 123、音乐 116、电子游戏 71、地理 70、政治 59。被测的可以是自带搜索的模型，也可以是带浏览工具的 Agent；参考实现本身不提供任何搜索或浏览工具。

**指标：** 准确率，即被判为正确的题目占比。论文另外报告校准误差（模型自报置信度与实际正确率的偏差），参考实现的代码只汇总准确率。没有找到官方持续维护的榜单，`simple-evals` 仓库自 2025-07 起不再更新成绩。论文发表时（2025-04）的最高分是 OpenAI Deep Research 的 51.5%，论文注明该模型的训练数据专门针对这类任务；不联网的 o1 为 9.9%，联网的 GPT-4o 为 1.9%。此后各家在模型发布材料里自报的成绩没有核实，这里不列。

## 任务格式

每题是一段英文问题。参考实现把问题填进固定模板发给被测系统，要求按三行格式回答：Explanation（解释）、Exact Answer（简短的最终答案）、Confidence（0% 到 100% 的置信度）。除此之外没有任何限制：用什么搜索引擎、能翻多少网页、花多长时间，都由被测系统自己决定，所以不同来源的成绩所用的工具和算力并不统一。论文用同一模型的不同「浏览力度」做过实验，准确率随算力平滑上升。

**示例（官方请求不要以明文公开题集里的题目；以下是论文正文中发给出题人的示范题，是否在正式题集内未核实）**

- **需求**（原文翻译）：2018 到 2023 年间发表在 EMNLP 会议上的哪篇论文，第一作者本科毕业于 Dartmouth College，第四作者本科毕业于 University of Pennsylvania？
- **原始题目**（论文 2.1 节给出的这道示范题的问句，全文；题集里的题按出品方请求不贴）：

  ```text
  What’s the title of the scientific paper published in the EMNLP conference between 2018-2023 where the first
  author did their undergrad at Dartmouth College and the fourth author did their undergrad at University of
  Pennsylvania?
  ```

  参考实现 `browsecomp_eval.py` 发给被测系统的固定模板 `QUERY_TEMPLATE`（全文；`{Question}` 处填入问题，双花括号是 Python 格式串的转义，实际发出时是单花括号）：

  ```text
  {Question}

  Your response should be in the following format:
  Explanation: {{your explanation for your final answer}}
  Exact Answer: {{your succinct, final answer}}
  Confidence: {{your confidence score between 0% and 100% for your answer}}
  ```
- **初始状态：** 只有这一段问题，没有附带材料。
- **要做的：** 自行联网查找。暴力做法需要逐篇检查几千篇论文并查每位作者的背景，要靠有策略的搜索把范围缩小。
- **判分：** 标准答案是论文标题 Frequency Effects on Syntactic Rule Learning in Transformers。评审模型从回答里抽出最终答案，和标准答案比较，一致判 yes，否则判 no。

**数据格式：** 一个 CSV 文件 `browse_comp_test_set.csv`，共 1,266 行，每行一题；题目和答案用以 `canary` 字段为口令的 XOR 加密后再做 base64 编码，评测代码读入时解密。

```
problem        加密后的题目文本
answer         加密后的标准答案
problem_topic  主题类别（明文），如 Art、History、Sports
canary         声明「评测数据不应以明文出现在网上」的固定字符串，带 canary GUID，同时用作解密口令
```

## 评估流程

1. **启动：** 参考实现在 OpenAI 的 `simple-evals` 仓库里，运行方式是 `python -m simple-evals.simple_evals --model <模型名> --eval browsecomp`，可用 `--examples` 抽取部分题目（固定随机种子）、`--n-repeats` 重复多次。要评测自己的系统，需要实现一个 sampler，接收消息列表、返回回答文本。
2. **环境：** 没有沙箱或固定的网页快照，被测系统直接访问真实的互联网。数据从 OpenAI 的公开存储地址下载。
3. **执行：** 对每一行解密出题目，套上回答格式模板，作为一条用户消息发给被测系统，取回它的最终回答。中间搜了什么、看了哪些网页，评测代码不关心。
4. **判分：** 把题目、被测系统的完整回答和标准答案填进评审提示词（沿用 Humanity's Last Exam 的评审提示词），交给评审模型。评审模型要抽出最终答案、说明理由，并给出 `correct: yes` 或 `correct: no`；数值题允许小幅误差，有任何不一致、含糊或不等价都判 no。代码用正则取这个结论，取不到按 no 处理。仓库当前代码里评审模型固定为 `gpt-4.1-2025-04-14`。
5. **算分：** 准确率等于判为 yes 的题数除以总题数。

## 设计上值得学什么

把检索难度和判分难度分开设计。问题可以需要长时间查证，同时保留一个短而明确的答案供评审。

## 资料依据

依据：`openai/simple-evals` 仓库的 `browsecomp_eval.py`（该文件最后一次修改为 commit `5e623c2`，2025-05-12）、`simple_evals.py` 和 README（仓库最新 commit `652c89d`，2026-04-22）；数据文件 `browse_comp_test_set.csv`，只核对了列名、行数和主题分布，没有解密阅读题目；论文 arXiv 2504.12516 的 HTML 版。以上访问于 2026-11-18。OpenAI 官方介绍页当天无法打开（返回 403），没有读到。没有找到官方榜单，当前最高分没有查到。论文说题集原有 1,287 题，复查后删去 21 道答案有问题的题，剩 1,266 题。没有实际运行。
