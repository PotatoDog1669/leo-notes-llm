---
id: "B48"
order: "7.3"
title: "Humanity's Sixth Sense（HSS）"
aliases: ["Humanity's Sixth Sense"]
summary: "给模型一张图片或一段无声视频，问一个人凭直觉一眼就能答、但需要理解物理、因果或社交情境的问题，让它自由作答，再由另一个模型按评分要点逐条核对。"
domain: "多模态与空间"
subject: "模型直接作答"
task: "静态问答"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "522"
reviewed: "2026-11-18"
links: [{"label": "博客", "url": "https://labs.scale.com/blog/introducing-humanitys-sixth-sense"}, {"label": "论文", "url": "https://arxiv.org/abs/2610.08966"}, {"label": "榜单", "url": "https://scale.com/leaderboard/hss"}, {"label": "数据", "url": "https://huggingface.co/datasets/ScaleAI/HSS"}]
---

## 评估对象

**能力：** 多模态模型的直觉式视觉推理，也就是人看一眼画面就能得出、模型却常答错的那类判断。522 题里 288 题配图片、234 题配视频（合计 17.6 小时，中位数 76 秒，最长 28 分钟），分 4 个领域 11 个子类：物理与空间逻辑 176 题（被遮挡或看不见的东西、换视角、能不能做到、够不够得着）、时间与因果 134 题（倒推之前发生了什么、机械因果、推测之后）、社交理解 110 题（角色与权力关系、揣摩他人想法）、抽象与情境推断 102 题（变化与后果、图案与错视）。出品方 Scale AI 与 Elorian 合作，共写了 3,466 题，经三轮独立审核后留下 522 题。主榜测的是模型本身。

**指标：** pass@1。每题答 3 次，一次回答满足全部评分要点才算对，先算每题答对的比例，再对所有题取平均，置信区间用按题重采样的 bootstrap。人类基线是 93.1%（20 名标注员，同样自由作答）。截至 2026-11-18 访问官方榜单页，34 行成绩里最高是 Gemini 4 Carbon（high）71.10 ± 3.60，其次是 Claude Fable 5.2（max）59.50 ± 3.80；论文发布时（2026-10）25 个模型里最高是 GPT-6-astra（max）53.6%，不给画面只给问题的对照组是 6.6%。

## 任务格式

模型拿到一张图片或一段去掉声音的视频，加一个开放式问题，用自由文本回答，一轮完成，没有工具。没有选项可选，回答里必须给出明确结论，始终不下结论的回答算错。

**示例（真题 `6a8507babd79f7aa9aabe2c1`）**

- **需求**（原文翻译）：图里的白色卡车还能再往后倒吗？为什么？
- **原始题目**（示例这道题的英文原文在数据集 `data/test.jsonl` 该行的 `prompt` 字段。数据集 README 写明「This is a test set. Please do not train on it.」，这里不转载数据集里的题，只照录出品方在官方博客里公开展示的两道样题的问题文本，全文；题面还包括一段视频或一张图片，不在本文档里）：

  博客样题一（社交理解，揣摩他人想法；配一段视频）：

  ```text
  Why does the woman in the white cap and green coat slow down after running?
  ```

  博客样题二（物理与空间逻辑，「能不能做到」，与上面的示例同一子类；配一张书架的图片）：

  ```text
  On the shelf close to the camera, with white, orange, and blue books, I'm interested in knowing whether two
  additional white books similar sized with the ones we already see (Brooklyn Law Review) would fit in front of
  the light blue book before the separator?
  ```
- **输入材料：** 一张图片，领域是物理与空间逻辑，子类是「能不能做到」。
- **要做的：** 看出卡车后轮已经贴着路缘，给出结论和理由。
- **判分：** 参考答案是「不能再倒，因为后轮和凸起的路缘之间已经没有空隙」。两条评分要点都满足才算对：说出白色卡车不能再往后倒；说出路缘和后轮之间没有空隙。

**数据格式：** 只有 `test` 一个划分，`data/test.jsonl` 每行一题，媒体文件按 `task_id` 命名放在 `media/` 下。

```
task_id            题目编号
domain             领域，4 选 1
subdomain          子类，11 选 1
media_type         image 或 video
media_path         图片或视频的相对路径，如 media/images/<task_id>.png
prompt             给模型的问题
golden_response    参考答案
rubric_criteria    评分要点列表，每条有 id 和 title；全库共 723 条，每题 1 到 7 条
num_criteria       要点条数，约七成题只有 1 条
evidence_start/end 视频里关键证据所在的时间段，图片题为空；只作标注，模型看到的是整段视频
```

## 评估流程

1. **调用：** 直接调模型接口。图片按原始分辨率发送。能直接接收视频的模型收到整段视频；不能的模型收到按每秒 2 帧均匀抽取的画面，最多 500 帧（超出时降低抽帧率而不截断），每帧标上时间戳，长边缩到 768 像素。不给音频，也不给字幕。
2. **执行：** 温度等采样参数用服务商默认值，推理强度设为高或最高，输出长度放到最大。每题独立回答 3 次。
3. **判分：** 评审模型是 Claude Opus 5。它看到问题、参考答案、评分要点和被测模型的回答，看不到图片和视频。它对每条要点给出满足或不满足，并附一句理由。全部要点满足，这次回答才算通过。
4. **算分：** 按上面的口径算 pass@1。另外保留一个按要点给部分分的得分，只作诊断用。论文用三个不同的评审模型重判了 5 个被测模型，排名不变，判定一致率超过 95%。
5. **Agent 设置：** 论文另在 388 题的子集上测了 Claude Code 和 Codex 这类 Agent，最高 59.3%，不计入主榜。

## 资料依据

依据：论文 arXiv 2610.08966 全文；Hugging Face `ScaleAI/HSS`（版本 `9add42c`，2026-10-12）的 README 和 `data/test.jsonl` 全部 522 行，题数、要点数和各领域题数已用数据核对；官方博客和榜单页（访问日期 2026-11-18）。没有核实的内容：榜单页和论文都说会公开评测代码，没有找到仓库链接，因此调用和判分流程只读自论文和榜单页的文字说明；没有逐字读评审提示词；没有打开媒体文件查看画面。
