---
id: "B24"
order: "2.12"
title: "Realm Warren（LegalReasonBench）"
aliases: ["Realm Warren"]
summary: "给 Agent 一宗法律案件的卷宗，再像上级律师那样分几次布置工作（先写备忘录，再写可提交法院的文书），每次交一份成文稿，由三个 LLM 评审按执业律师写的带分值标准逐条表决。榜单上的「Realm Warren」链接现在跳转到 micro1 的 LegalReasonBench 页面。"
domain: "专业知识工作"
subject: "Agent 任务，Harness 由官方自备"
task: "文件交付物"
scoring: "LLM 评审"
access: "部分公开"
sampleCount: "50 宗案件、122 次工作布置（公开 5 宗样例）"
reviewed: "2026-11-18"
links: [{"label": "报告与榜单", "url": "https://www.micro1.ai/benchmark/legal-reason-bench"}, {"label": "样例数据", "url": "https://huggingface.co/datasets/micro1-inc/LegalReasonBench"}]
---

## 评估对象

**能力：** 在一宗持续推进的案件里做法律推理的能力：从卷宗里找出争点，确定适用的法律规则，把规则用到事实上，得出有依据的结论，并在案情变化后修正先前的分析。由 micro1 出品（Realm 是它面向 AI 实验室的评测产品线）。50 宗案件覆盖诉讼与争议、知识产权、刑事、房地产、民权、劳动雇佣等 12 个业务领域，每宗由执业律师从选案、整理卷宗到写题目和评分标准全程制作。其中 22 宗允许上网检索法律依据（官方称 open universe），28 宗只许用卷宗里给的材料。被测的是 Agent：官方成绩统一用 OpenCode 作 Harness，只换模型。

**指标：** 加权 rubric 得分，范围 0 到 1：每宗案件一个分，每个模型每宗跑 3 次取平均，再对 50 宗取平均。每条标准还被归入争点、规则、适用、结论四类之一（法律界称 IRAC），用来分项报告。截至 2026-11-18 访问官方页面（榜单更新于 2026-11-17），11 个模型中最高是 Gemini 4 Argon 的 50.8%，其后是 Claude Fable 5.1 的 50.6%。Argon 带星号：它是后补跑的，50 宗里有 17 宗用的是更新过的题目版本。官方另称，若改用「所有标准全部通过才算完成」的口径，所有模型都是 0 分。

## 任务格式

每宗案件在一个持续存在的容器里按顺序进行 2 到 5 次工作布置（74% 的案件是 2 次）。卷宗文件放在 `/app/attachments/`，每宗 3 到 25 个，多为 PDF 和 Word，部分是没有文字层的扫描件。每次布置是一段固定的角色说明加一份上级写来的交办便函；Agent 把这一次的成文稿写到 `/app/response<N>.md`，交完后下一次布置才出现，之前的文件和稿子都还在盘上。后续布置常常带来新事实、新文书或新的程序阶段。交付物约四分之三是法律备忘录，四分之一是动议、诉状、辩论意见书；面向法院的文书有字数上限。

**示例（真题 `lrb-certiorari-quasi-judicial-land-use`，公开的 5 宗样例之一，允许上网检索）**

- **需求**（第 1 次布置，原文节译）：我们收到了所附的「准予调卷令申请」的法院命令。只审阅这四份文件，给县议会写一份结构化的法律备忘录：概述命令和案件经过，解释命令的影响，列出县政府可选的做法，建议一个法律上的行动方案。引注用完整的 Bluebook 格式。
- **原始题目**（`instruction.md` 节选（角色说明 + 第 1 次布置的交办便函），全文约 490 词，见数据集 `tasks/lrb-certiorari-quasi-judicial-land-use/steps/assignment-1/instruction.md`）：

  ```text
  You are a senior legal analyst operating autonomously. You are completing a multi-step legal reasoning task.
  Follow the role, factual record, instructions, and deliverable requirements provided in the Task and each
  Assignment.
  [……省略约 255 词……]
  1st ASSIGNMENT
  TO: Denise Swarek, Assistant County Attorney
  FROM: Thomas Rowe, County Attorney
  RE: PETER SPAHN, ET. AL., V. LEE COUNTY; Case No. 24-CA-1479
  DATE: October 27, 2025
  ________________________________________
  We received the attached Order Granting Petition for Writ of Certiorari.
  You are initially provided with the following record as uploaded files. Limit your review to these documents
  and what legal research is necessary to identify applicable rules and case law relevant to these documents. Do
  not conduct legal research beyond that. All legal analysis should be based on the versions of statutes,
  regulations, and ordinances in effect as of January 1, 2025.
  •	Resolution Z-23-035 (Resolution.docx)
  •	Petition for Writ of Certiorari (Petition.docx)
  •	Order Granting Petition (Orderpdf.docx)
  •	LCU Project Detail (LCU Project.pdf)
  Review only these documents and draft a structured legal memorandum to the Board of County Commissioners that
  1) outlines the Order and case history, 2) explains the implications of the Order, 3) identifies options and
  available actions for Lee County, 4) recommends a legal course of action to the Board. Use full Bluebook
  citation format.
  ```
- **输入材料：** 4 个文件：县议会的改划决议、对方的调卷令申请书、法院准予申请的命令、项目详情。
- **要做的：** 第 1 次交备忘录 `response1.md`。第 2 次布置告知县议会决定上诉，要求在前一份分析的基础上起草一份可直接提交的上诉意见书 `response2.md`。
- **判分：** 第 1 次布置有 25 条标准，20 条加分（共 170 分）、5 条扣分。例如 +15 分：指出对准司法决定的唯一复审途径是在书面决定作出后 30 天内依佛罗里达上诉程序规则申请调卷令；-30 分：建议县政府停止该地块上的施工。

**数据格式：** 每宗案件是一个 Harbor 多步任务目录。公开数据集只有 5 宗样例（15 次布置、221 条标准），其余 45 宗不公开，可向 micro1 申请。

```
tasks/lrb-certiorari-quasi-judicial-land-use/
├── task.toml                  元数据、超时，每次布置一个 [[steps]] 条目
├── environment/Dockerfile     容器镜像（Python、pandoc、poppler-utils、LibreOffice）
└── steps/assignment-1/
    ├── instruction.md         角色说明加本次布置，发给 Agent
    ├── workdir/attachments/   本次新增的卷宗文件
    ├── solution/solve.sh      占位，不附参考答案
    └── tests/                 判分用，Agent 看不到
        ├── fixtures/rubric.json     本次的评分标准：描述、分值、加分或扣分、出处、理由
        ├── raw_correctness/*.toml   每条标准一份评审配置
        ├── m1_judge_panel.json      三个评审模型的配置
        └── test.sh                  判分入口
```

## 评估流程

1. **启动：** 公开样例可在本地跑：`harbor run -p tasks/<案件> -a opencode -m <模型>`，再用 `scripts/score_matter.py` 算整宗案件的分。榜单成绩由 micro1 自己跑出，没有看到对外提交入口。
2. **环境：** 每宗案件一个容器（样例配置为 2 核 CPU、4 GB 内存）。Agent 有命令行（带 `pdftotext`、`pandoc`、Python）、文件读写编辑、检索文件的工具和待办清单，以及网页搜索和抓取。官方跑分时推理强度统一设为 high，并去掉了子 Agent 工具。
3. **执行：** 每次布置限时 3 小时。Agent 写完当次的稿子后，判分程序取走该文件，然后在同一个容器里发出下一次布置。
4. **判分：** 由 LLM 评审完成，没有人工逐份评审，也不附参考答案。三个评审模型（GPT-5.6 Terra、Claude Sonnet 5、Gemini 3.8 Flash）各自独立阅读整份稿子，对每条标准单独判是或否，不知道稿子出自哪个模型，两票以上为准。任何一个评审调用不通，这次布置直接判失败，不会用少于三票的结果。
5. **算分：** 一次布置的得分是得到的分值（扣分项触发就减去）除以全部加分项的分值，截到 0 和 1 之间。一宗案件的得分把各次布置的分值合在一起同样计算。榜单分数是各宗案件 3 次运行平均分的平均。

## 资料依据

依据：micro1 的 LegalReasonBench 报告页（访问日期 2026-11-18，页面内榜单数据更新于 2026-11-17）；Hugging Face 数据集 `micro1-inc/LegalReasonBench`（2026-10-16 版）的说明，以及样例案件 `lrb-certiorari-quasi-judicial-land-use` 的 `task.toml`、两次布置的 `instruction.md`、`rubric.json`、评审配置和 `test.sh`。frontierlist 榜单上「Realm Warren」的链接 `micro1.ai/benchmark/warren` 会经 `/benchmark/realm-legal` 跳转到 LegalReasonBench 页面，页面上没有出现「Warren」这个名字，据此认定两者是同一个 benchmark，但没有找到官方对改名的说明。全集的统计数字引自报告页；只读了 1 宗样例的文本文件，没有打开卷宗里的 PDF 和 Word。只许用卷宗的案件是靠提示词约束还是真的断网，没有核实。没有实际运行。
