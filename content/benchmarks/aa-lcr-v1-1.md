---
id: "B34"
order: "4.3"
title: "AA-LCR v1.1"
aliases: []
summary: "把几份真实长文档（合计约 10 万 token）和一个问题一次性塞给模型，让它跨文档推理出答案，再由另一个 LLM 判断答案和标准答案是否一致。"
domain: "通用推理与知识"
subject: "模型直接作答"
task: "静态问答"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "100"
reviewed: "2026-11-18"
links: [{"label": "数据集", "url": "https://huggingface.co/datasets/ArtificialAnalysis/AA-LCR"}, {"label": "发布文章", "url": "https://artificialanalysis.ai/articles/announcing-aa-lcr"}, {"label": "榜单", "url": "https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning"}]
---

## 评估对象

**能力：** 在很长的输入里找到分散的信息并做多步推理。全称 Artificial Analysis Long Context Reasoning，由 Artificial Analysis 出品。题目要求答案不能从文档里直接摘出来，必须综合多份文档的多处内容再推算或归纳。文档是 7 类真实材料：公司报告、行业报告、政府咨询文件、学术论文、法律文件、营销材料、调查报告，其中公司文档占 63 题。被测的是模型，没有检索或工具环节，上下文窗口不足 128K 的模型无法参评。

**指标：** 准确率，即被评审判为正确的题目比例（pass@1）。截至 2026-11-18 访问官方榜单页，页面摘要写的最高分是 88.7%（Kimi K3 (Max)），其后是 Step 5 Preview 88.3%；同一页面的问答栏却把 Step 5 Preview 写成最高，两处不一致。当前版本是 2026 年 9 月的 v1.1，它改正了 16 道题的标准答案并给评审加了系统提示词，分数和 v1.0 不能直接比较。2025 年 8 月首发时最高是 69%（OpenAI o3）。

## 任务格式

每道题对应一个文档集（全库 30 个文档集、234 份文档，多道题共用一个文档集）。模型收到的是一条提示词：所有文档的纯文本按规定顺序拼在前面，问题放在最后；它直接用文字作答，没有格式要求，也没有多轮交互。单题输入在 7.2 万到 11.5 万 token 之间（按 `cl100k_base` 分词器计）。

**示例（真题 `question_id` 23，问题为原文翻译）**

- **需求**（原文翻译）：找出营业利润环比下降 13.5% 的那家公司和那个季度，它的调整后 EBITDA 是多少？列出公司名和调整后 EBITDA。
- **原始题目**（`AA-LCR_Dataset.csv` 中该题 `question` 字段全文；发给模型的提示词还要在它前面拼上 6 份文档的正文，约 9.5 万 token，这里不录）：

  ```text
  For the company and quarter where the company reported a 13.5% decline on the prior quarters operating income.
  What was their adjusted EBITDA? List the company name and adjusted EBITDA
  ```

  数据集说明给出的提示词模板（全文；`{documents_text}` 处是逐份包在 `BEGIN DOCUMENT n:` 和 `END DOCUMENT n` 之间的文档正文）：

  ```text
  BEGIN INPUT DOCUMENTS

  {documents_text}

  END INPUT DOCUMENTS

  Answer the following question using the input documents provided above.

  START QUESTION

  {question}

  END QUESTION
  ```
- **输入材料：** 文档集 `co_dc_press_b`，6 份文件，是 Digital Realty 和 Equinix 两家公司 2023 年前三个季度的业绩新闻稿，共约 9.5 万 token。
- **要做的：** 逐份算出各季度营业利润的环比变化，定位到符合条件的公司和季度，再读出对应数字。
- **判分：** 标准答案是「Equinix, $901 million」，评审模型判断回答是否与之一致。

**数据格式：** 一个 CSV 文件 `AA-LCR_Dataset.csv`，每题一行；文档正文另放在 `extracted_text/AA-LCR_extracted-text.zip`，按「类别/文档集/文件名」存成 txt。

```
document_category      文档类别，如 Company_Documents、Legal
document_set_id        文档集编号，如 co_dc_press_b
question_id            题号，1 到 100
question               问题文本
answer                 标准答案；有多个要点时用分号隔开
data_source_filenames  本题要加载的文档文件名，分号分隔，顺序即拼接顺序
data_source_urls       各文档的原始网址
input_tokens           拼好的提示词的 token 数
```

## 评估流程

1. **启动：** 没有官方评测脚本，官方榜单由 Artificial Analysis 自己跑。数据集说明里给出了提示词模板、读取代码片段和评审提示词，外部可以照此复现。
2. **执行：** 纯 API 调用。按 `data_source_filenames` 的顺序把文档包进 `BEGIN DOCUMENT n` 和 `END DOCUMENT n` 之间，再接上问题，一次请求得到回答。官方的通用设置是非推理模型温度 0、推理模型温度 0.6，零样本，不给示例。
3. **判分：** LLM 评审，没有脚本匹配这一步。评审模型是 GPT-5.6 Luna（medium），它拿到问题、标准答案和模型回答，输出 CORRECT 或 INCORRECT。v1.1 的评审系统提示词规定：同一数值的不同写法（百分数和小数、千和百万、货币符号等）算一致；题目指定了格式、单位或排序的必须满足；只看回答最终认定的那个值，给出多个候选而不选定的判错。
4. **算分：** 得分 = 判为 CORRECT 的题数 ÷ 100。答错不扣分，拒答等同答错。

## 资料依据

依据：Hugging Face 数据集 `ArtificialAnalysis/AA-LCR` revision `9a77ef5`（2026-09-04）的说明和通过 datasets-server 读取的全部 100 行；Artificial Analysis 发布文章、AA-LCR 榜单页、Intelligence Benchmarking 方法页（均访问于 2026-11-18）。没有下载文档压缩包，文档正文没有核对；官方每题跑几次没有查到。方法页显示 AA-LCR 自 Intelligence Index v5.0 起已不再计入该指数，归在 Legacy 一类，但榜单仍在更新。方法页附录里的评审提示词还是 v1.0 的版本，本条目以数据集说明为准。
