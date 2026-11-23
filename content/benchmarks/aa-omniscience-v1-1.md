---
id: "B35"
order: "4.4"
title: "AA-Omniscience v1.1"
aliases: []
summary: "不给资料、不给工具，直接问模型一道冷门事实题，并告诉它不知道就说不知道；答对加分，答错扣分，弃答不加不扣。"
domain: "通用推理与知识"
subject: "模型直接作答"
task: "静态问答"
scoring: "LLM 评审"
access: "部分公开"
sampleCount: "3,000（公开 300）"
reviewed: "2026-11-18"
links: [{"label": "公开子集", "url": "https://huggingface.co/datasets/ArtificialAnalysis/AA-Omniscience-Public-v1.1"}, {"label": "论文", "url": "https://arxiv.org/abs/2511.13029"}, {"label": "榜单", "url": "https://artificialanalysis.ai/evaluations/omniscience"}, {"label": "发布文章", "url": "https://artificialanalysis.ai/articles/aa-omniscience-knowledge-hallucination-benchmark"}]
---

## 评估对象

**能力：** 两件事一起测：模型靠记忆能不能答对专业事实，以及不知道的时候会不会老实弃答而不是编一个。由 Artificial Analysis 出品。题目分 6 个领域：科学工程与数学 600 题、软件工程 600 题，金融、健康、人文社科、法律各 450 题，每个领域下再分子主题。题目取材于权威的学术和行业资料，由一个基于 LLM 的出题流程自动生成。被测的是模型。

**指标：** 主指标是 AA-Omniscience Index（官网图表上也叫 Net Score），范围 -100 到 100，0 表示答对和答错一样多。另报两个分项：Accuracy（答对的题占全部题的比例）和 Hallucination Rate（没答对的题里，硬答而答错的比例）。截至 2026-11-18 访问官方榜单页，Index 最高是 67（Claude Fable 5.2，Max 档），它的 Accuracy 79% 也是最高；Hallucination Rate 最低是 4%（Gemini 4 Carbon，Medium 档）。当前版本 v1.1 于 2026 年 10 月发布，题量从 v1 的 6,000 减到 3,000，去掉了已饱和的题和 v1 公开过的 600 题，分数和 v1 不能直接比较。

## 任务格式

每题是一个独立的短问题，答案是一个确定的事实：年份、版本号、人名、数值、案件名等。每题前模型先收到一段固定的指令，里面写明题目所属的领域和子主题，要求只给答案、不要解释，并说明不知道或需要更多上下文时应当直说，这比答错好。单轮问答，没有上下文材料，没有工具，不联网。

**示例（公开子集真题 `question_id` 109，原文翻译）**

- **需求**（原文翻译）：`inspect.Signature.format` 是在 Python 的哪个小版本引入的？
- **原始题目**（公开子集 `AA-Omniscience_dataset_public.csv` 中该题 `question` 字段全文）：

  ```text
  In which Python minor version was inspect.Signature.format introduced?
  ```

  每题之前先发给模型的固定指令 `OMNISCIENCE_ANSWER_PROMPT`（数据集说明，全文；这道题的 `{domain}` 是 Software Engineering，`{subtopic}` 是 python）：

  ```text
  You are answering questions about {domain}, and in particular {subtopic}.
  You will be given a question, answer with JUST the answer (no explanation).
  If you do not know the answer, or you need more context or tools to answer the question,
  be clear about this - it is better that you say this than get the wrong answer.
  ```
- **输入材料：** 只有指令里的领域 `Software Engineering` 和子主题 `python`。
- **要做的：** 直接回答版本号，或者说明不知道。
- **判分：** 标准答案是 `3.13`。答 3.13 记正确，答成别的版本记错误并扣分，说不知道记弃答。

**数据格式：** 公开子集是一个 CSV 文件 `AA-Omniscience_dataset_public.csv`，300 行，按领域等比例从全集抽出。其余 2,700 题不公开。

```
domain       领域，如 Finance、Law、Software Engineering
subtopic     领域下的子主题，如 Accounting、python
question_id  题号，1 到 300
question     给模型的问题
answer       标准答案，供评审模型对照
```

## 评估流程

1. **启动：** 没有官方评测脚本。官方榜单由 Artificial Analysis 在完整的 3,000 题上自己跑；外部只能用 300 题的公开子集，按数据集说明里给出的答题提示词和评审提示词复现。官方称发布时 86 个模型在公开子集和私有部分上的 Index 相关系数是 0.991。
2. **执行：** 纯 API 调用，每题一次请求、跑一遍。官方通用设置是非推理模型温度 0、推理模型温度 0.6，零样本。
3. **判分：** LLM 评审，不做字符串匹配。评审模型是 GPT-5.6 Luna（medium），它拿到问题、标准答案和模型回答，从四档里选一档：CORRECT（与标准答案一致或等价）、INCORRECT（矛盾或意思不同）、PARTIAL_ANSWER（没有错但详略程度不对）、NOT_ATTEMPTED（拒答、空答、明说不知道或需要更多信息）。评审提示词带细则和 7 个示例，例如数值要精确到标准答案的最后一位有效数字，版本号和条款号必须完全一致，人名的拼写出入不扣。
4. **算分：** Index = 100 ×（正确题数 − 错误题数）÷ 总题数，部分正确和弃答都记 0，所以答错比弃答更亏。Accuracy = 正确题数 ÷ 总题数。Hallucination Rate = 错误题数 ÷（错误 + 部分正确 + 弃答）。

## 资料依据

依据：Hugging Face 数据集 `ArtificialAnalysis/AA-Omniscience-Public-v1.1` revision `1f9cbce`（2026-10-28）的说明和通过 datasets-server 读取的全部 300 行；Artificial Analysis 的 AA-Omniscience 榜单页、Intelligence Benchmarking 方法页和 2025-11-16 的发布文章（均访问于 2026-11-18）。论文只读了榜单页转载的摘要，没有读全文；论文描述的是 6,000 题的 v1。私有的 2,700 题无法核对。v1 发布文章说全集有 42 个主题、89 个子主题，方法页对 v1.1 仍写 42 个主题；v1.1 公开子集里 `subtopic` 有 86 个不同取值，全集的子主题数没有核实。金融这个领域在方法页上写作 Business。
