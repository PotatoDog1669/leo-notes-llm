---
id: "B18"
order: "2.6"
title: "GDP.pdf"
aliases: []
summary: "把一份真实的专业 PDF（保单、租约、数据手册、建筑图纸等）连同一个从业者会问的问题交给模型，模型一次作答，LLM 评审按专家写的细项逐条判对错，全部细项都过才算这题通过。"
domain: "专业知识工作"
subject: "模型直接作答"
task: "静态问答"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "100"
reviewed: "2026-11-18"
links: [{"label": "官方榜单", "url": "https://surgehq.ai/benchmarks/gdp-pdf"}, {"label": "论文", "url": "https://arxiv.org/abs/2607.11192"}, {"label": "评测代码", "url": "https://github.com/surge-ai/gdp-pdf"}, {"label": "数据集", "url": "https://huggingface.co/datasets/surgeai/GDP.pdf"}]
---

## 评估对象

**能力：** 读懂原始 PDF 并依据其中正确的证据回答专业问题的能力。出品方是数据标注公司 Surge AI。题目覆盖十个领域，每个领域 10 题：金融、医疗、法律、科研、工程、建筑施工、制造与供应链、保险、房地产、人力资源。题目由各领域从业者从自己的工作中提出，只有至少两个前沿模型犯了实质性错误的题才保留。难点通常是脚注、除外条款、图例、跨页表格、对数坐标图、被后续修订取代的条文，另有一部分题文档里根本没有答案，模型要明确说没有。

**指标：** 主指标是严格通过率（代码里叫 `all_pass`）：一次作答的所有细项都通过才算过，每题跑 5 次取平均。辅助指标 `mean_criteria` 是细项的平均通过比例。截至 2026-11-18 访问官方榜单页，最高是 Gemini 4 Carbon (High reasoning) 56.4%，其次 Muse Wonder 1.0 (Max reasoning) 54.8%。论文记录的 2026 年 7 月榜单最高是 30.7%。

**和 Artificial Analysis 版本的区别：** Artificial Analysis 用同一批题另跑了一套并计入它的 Intelligence Index。它不用各家 API 的 PDF 输入功能，改为先用 LiteParse 加 OCR 抽出全文，再连同页面图像一起发给模型；评审换成 GPT-5.6 Luna，并且评审能看到题目。官方说明两边分数不能直接比较。

## 任务格式

每题是一个问题加一份 PDF（代码显示个别题还带图片）。PDF 以原文件形式作为附件直接发给模型，由各家 API 自己的文档处理功能去读。模型没有任何工具，单轮作答，输出一段文字回答。

**示例（数据集没能打开，以下是论文表 5 披露的一道真题的梗概，人力资源领域）**

- **需求**（概括：译自论文表 5 的题目梗概）：按时间顺序列出最早提供带薪丧假的五家公司。
- **原始题目**（发给模型的 prompt 原文没能取到，数据集匿名访问返回 401；以下照录论文表 5 里这道题的一整行，四行依次是 Domain、Task sketch、Document evidence、Typical failure mode 四列的内容。Task sketch 是论文作者写的梗概，不是 prompt 原文）：

  ```text
  HR
  Order the first five companies to offer paid bereavement leave.
  A multi-page table must be sorted by announcement date, but a footnote changes Mastercard’s date and removes
  it from the top five.
  The footnote is ignored, so the list comes back fluent but chronologically wrong.
  ```
- **输入材料：** 一份 PDF，其中有一张跨多页的公司福利表，要按公布日期排序；一条脚注更改了 Mastercard 的日期，使它掉出前五。
- **要做的：** 用文字给出这五家公司及顺序。
- **判分：** 专家为每题写若干条互相独立的是非细项，规定答案必须包含哪些事实、哪些说法算等价、不能出现哪些说法。这道题的典型失败是忽略脚注，名单读起来通顺但顺序是错的。

**数据格式：** 以下字段来自官方评测代码里的读取逻辑，数据集本身没能打开核对。Artificial Analysis 的方法说明称 100 题共 4,592 页 PDF、1,275 条细项。

```
surgeai/GDP.pdf（Hugging Face 数据集，test 切分，每行一题）
task_id                  题目 ID
prompt                   问题全文
pdf_path                 该题 PDF 在数据集仓库里的相对路径
rubric - 1. criterion    第 1 条细项，例如「回答应指出……」「回答不应……」
rubric - 2. criterion    第 2 条细项，以此类推，每题条数不等
```

## 评估流程

1. **启动：** 评测代码基于 Inspect AI 框架。官方榜单的配置是 `uv run inspect eval src/gdp_pdf/task.py --model <模型> --epochs 5 -T judge_model=google/gemini-3.5-flash`，需要被测模型和评审模型的 API 密钥。
2. **执行：** 每题把问题和 PDF 放进一条用户消息，模型生成一次回答，不给工具，也没有多轮。每题重复 5 次。
3. **判分：** 评审模型是 Gemini 3.5 Flash。每条细项单独调用一次评审，评审只看到模型的回答和这一条细项，看不到题目、PDF 和参考答案，输出 0 或 1 及理由。评审输出解析失败最多重试 4 次，仍失败则这条细项不计分，这次作答也不计入严格通过率。
4. **算分：** 一次作答的全部细项都得 1，`all_pass` 记 1，否则记 0；榜单数字是 100 题乘 5 次的平均。`mean_criteria` 是每次作答通过细项的比例再取平均。

## 资料依据

依据：GitHub 仓库 `surge-ai/gdp-pdf`（commit `7a72a51`，2026-08-14 推送）的 README、`dataset.py`、`scorer.py`、`task.py` 和仓库自带的合成示例题；论文 arXiv 2607.11192 v3；Surge AI 官方榜单页和发布博客、Artificial Analysis 方法说明页（均为 2026-11-18 访问）。重要出入：论文和 README 都写 100 题已在 Hugging Face 以 Apache 2.0 发布，但 2026-11-18 匿名访问 `surgeai/GDP.pdf` 的接口返回 401，该组织的公开数据集列表里也没有它，所以没能读到真题全文和细项原文，示例只用了论文里的梗概。
