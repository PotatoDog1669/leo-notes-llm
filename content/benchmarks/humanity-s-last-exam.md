---
id: "B32"
order: "4.1"
title: "Humanity's Last Exam"
aliases: []
summary: "给模型 2,500 道由各学科专家出的闭卷难题（选择题或短答案题，部分带图），模型直接作答，再由另一个模型对照标准答案判对错。"
domain: "通用推理与知识"
subject: "模型直接作答"
task: "静态问答"
scoring: "LLM 评审"
access: "部分公开"
sampleCount: "2,500"
reviewed: "2026-11-18"
links: [{"label": "网站", "url": "https://lastexam.ai/"}, {"label": "仓库", "url": "https://github.com/centerforaisafety/hle"}, {"label": "数据集", "url": "https://huggingface.co/datasets/cais/hle"}, {"label": "论文", "url": "https://arxiv.org/abs/2501.14249"}, {"label": "Scale 榜单", "url": "https://scale.com/leaderboard/humanitys_last_exam"}]
---

## 评估对象

**能力：** 研究生到专家水平的学科知识和推理，覆盖数学、自然科学、人文等一百多个学科。题目由 500 多家机构的近千名学科专家贡献，入选前要先难倒当时的前沿模型。约 14% 的题需要看图，约 24% 是选择题，其余是短答案题。被测的是模型本身：官方脚本只做一次 API 调用，不给工具。Center for AI Safety 与 Scale AI 出品，论文 2026-01-28 发表于 Nature。

**指标：** 准确率（答对题数 ÷ 总题数）和校准误差（模型自报置信度与实际正确率的 RMS 偏差，越低越好）。截至 2026-11-18 访问 Scale 榜单页，原版 2,500 题最高分是 54.80% ± 1.94%（GPT 6 Astra，校准误差 39）。官方在 2026-09-22 另发布了精选子集 HLE-Diamond（1,000 题，单独计分，不带工具时最高 74.3%，Claude Fable 5.2），本条目写的是原版。

## 任务格式

每题是一段题面，有的附一张图。模型按规定格式回答：解释、最终答案、0% 到 100% 的置信度。不分轮次，不能检索，不能执行代码。选择题有五个或更多选项；短答案题的标准答案是一个数、一个词或一小段文字。

**示例（真题，官网首页展示的样题，Ecology 类）**

- **需求**（原文翻译）：雨燕目中只有蜂鸟具有一块两侧成对的卵圆形骨，它是一块籽骨，嵌在尾降肌止点处扩展的十字形腱膜的尾外侧部分。这块籽骨支撑着多少对肌腱？用一个数字回答。
- **原始题目**（官网 lastexam.ai 首页展示的这道样题的题面全文；题库带 canary、出品方要求不得进入训练语料，数据集里的题不转载）：

  ```text
  Hummingbirds within Apodiformes uniquely have a bilaterally paired oval bone, a sesamoid embedded in the
  caudolateral portion of the expanded, cruciate aponeurosis of insertion of m. depressor caudae. How many
  paired tendons are supported by this sesamoid bone? Answer with a number.
  ```

  官方评测脚本 `hle_eval/run_model_predictions.py` 在每道题前固定加的系统提示词（全文）：

  ```text
  Your response should be in the following format:
  Explanation: {your explanation for your answer choice}
  Answer: {your chosen answer}
  Confidence: {your confidence score between 0% and 100% for your answer}
  ```
- **要做的：** 给出解释、一个数字和置信度。
- **判分：** 评审模型从回答里抽出最终答案，与数据集的 `answer` 字段比对。官网不展示这道题的答案，数据集需登录申请后才能读取，本条目没有读到。

**数据格式：** Hugging Face 数据集 `cais/hle`，只有一个 `test` 划分，2,500 条记录；需登录并同意条款后下载。

```
id              题目编号
question        题面文本
image           题目配图，评测时原样作为 image_url 发送；无图为空字符串
image_preview   配图预览
answer          标准答案
answer_type     题型：精确匹配的短答案题，或选择题
author_name     出题人
rationale       出题人写的解答说明
rationale_image 解答说明的配图
raw_subject     细分学科
category        大类学科
canary          防止混入训练语料的标识串
```

## 评估流程

1. **启动：** 在官方仓库的 `hle_eval/` 下先跑 `python run_model_predictions.py --dataset cais/hle --model <模型> --max_completion_tokens 8192 --num_workers 100` 生成回答，再跑 `python run_judge_results.py --dataset cais/hle --predictions hle_<模型>.json --num_workers 100` 判分。
2. **执行：** 纯 API 调用，走 OpenAI 兼容接口，temperature 默认 0。系统提示词规定输出 `Explanation:`、`Answer:`、`Confidence:` 三行；带图的题把图作为 `image_url` 一起发送。官方建议推理模型的最大输出不低于 8192 token。
3. **判分：** 评审模型默认是 `o3-mini-2025-01-31`。它拿到题面、模型回答和标准答案，用结构化输出给出 `extracted_final_answer`、`reasoning`、`correct`（yes 或 no）和 `confidence`。提示词要求只看抽出的最终答案与标准答案是否一致，数值题允许很小的误差。
4. **算分：** 准确率 = 判为 yes 的题数 ÷ 全部题数，没有回答的题算错；同时给出 95% 置信区间半宽 `1.96 × sqrt(acc × (100 − acc) / n)`。校准误差把题目按置信度排序后分箱（每箱 100 题），计算各箱平均置信度与正确率之差的 RMS。

## 资料依据

依据：仓库 `centerforaisafety/hle` commit `22ed307`（2026-09-23）的 README、`hle_eval/run_model_predictions.py`、`hle_eval/run_judge_results.py`；Hugging Face API 返回的 `cais/hle` 字段和条数；lastexam.ai 首页与 HLE-Diamond 博客、Scale 榜单页、arXiv 2501.14249 网页版（均 2026-11-18 访问）。数据集设了访问门槛，没有读到任何一条数据记录，字段含义按字段名和评测代码的用法写。官网提到另有一份不公开的留出题集，规模和成绩没有找到。HLE-Rolling（滚动更新版）与原版的差异没有核对。
