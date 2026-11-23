---
id: "B20"
order: "2.8"
title: "APEX-Agents 1.1"
aliases: []
summary: "把 Agent 放进专家搭好的项目环境（文件、邮件、聊天、日历、表格等应用齐全），让它完成投行分析师、管理咨询顾问、公司律师的一件日常工作，LLM 评审按专家写的细项逐条判对错。"
domain: "专业知识工作"
subject: "Agent 任务，Harness 由官方自备"
task: "API/工具调用任务"
scoring: "LLM 评审"
access: "全部公开"
sampleCount: "240（31 个项目环境）"
reviewed: "2026-11-18"
links: [{"label": "官方榜单", "url": "https://www.mercor.com/apex/apex-agents-leaderboard/"}, {"label": "1.1 版说明", "url": "https://www.mercor.com/blog/introducing-apex-agents-1-1"}, {"label": "数据集", "url": "https://huggingface.co/datasets/mercor/apex-agents-v1.1"}, {"label": "参考 Agent", "url": "https://github.com/Mercor-Intelligence/apex_loop_truncated_tools_agent"}, {"label": "论文", "url": "https://arxiv.org/abs/2601.14242"}]
---

## 评估对象

**能力：** 在跨多个办公应用的长任务里找齐信息并给出唯一正确结果的能力。出品方是人才与数据公司 Mercor。三种职业各 80 题：投资银行分析师、管理咨询顾问、公司律师，题目和环境由来自高盛、麦肯锡、Latham & Watkins 等机构的从业者制作。榜单按模型排名，所有模型都用官方的参考 Agent 运行。

**指标：** Pass@1，即单次运行中全部细项都通过的题目比例；另报 Mean Score，即细项的平均通过比例。截至 2026-11-18 访问官方榜单页，最高是 Gemini 4 Carbon (High)，Pass@1 84.2%（±4.3%），Mean Score 90.4%；其次 Gemini 4 Argon (High) 82.4%、Fable 5.2 (Max) 80.1%。

**版本和口径：** 2026 年 1 月的原版有 480 题、33 个环境，当时最高 Pass@1 是 24.0%。2026 年 9 月的 1.1 版从中精选并修订出 240 题，把澄清信息补进环境文件，换了评审模型，对「同时给出多个答案来碰运气」的回答判零分；官方榜单现在用 1.1 版。Artificial Analysis 另有 APEX-Agents-AA，用原版 480 题中的 452 题、自家 Harness Stirrup（200 轮上限）和 Gemini 3 Flash 评审，分数和官方榜单不可比。

## 任务格式

每道题属于一个项目环境（官方叫 world），一个环境平均约 167 个文件，供多道题共用。Agent 拿到一段单轮任务说明，通过 MCP 工具操作环境里的九类应用：日历、聊天、代码执行、文档、文件系统、邮件、PDF、电子表格、演示文稿。不能联网搜索。240 题中 206 题以文字作答，34 题要交付文件；63 题另带本题专用的输入文件。

**示例（真题，官网投资银行页展示的示例任务，页面没有给出题目名）**

- **需求**（原文翻译，略有压缩）：评估若干业务驱动因素要变动多少才会让 IRR 跌破 20%。股价已跌到 87.00 美元，使用 LBO 模型里的信息。分别求出增长率系数、获客成本、研发成本、债务成本、EBITDA 倍数这五项的临界点（百分比保留两位小数），使取整后的 IRR 从上方降到 19.99%。约束：任何一年的 EBITDA 不得低于 9,100 万美元；做其他敏感性测算时债务成本设为 0%。新建一个工作表列出这五项的数值。
- **原始题目**（官网投资银行页内嵌示例数据的 `prompt` 字段全文）：

  ```text
  Assess how much certain business drivers must move to bring IRR below 20%. The stock price has fallen to
  $87.00. Use the LBO model for the info.

  1. Find the critical point (percentages to 2 decimal places) for each of the below business drivers at which
  rounded IRR would be pushed down to 19.99% from above:
       a) 'Growth rate scale' (correct the approach for Year 1/2)
       b) 'Customer acquisition costs'
       c) 'R&D cost'
       d) 'Debt costs'
       e) 'EBITDA multiple'

  Assumptions and constraints:
  1. EBITDA is not to fall below $91 million for any year. If this threshold is passed the new constraint
  becomes EBITDA for each individual year instead of the IRR.
  2. 'Debt costs' should be set to 0% for all other sensitivities.

  Create a new sheet that shows values for the five major business drivers.
  ```
- **输入材料：** 项目环境是一个投行团队为 Elastic 公司做私有化 LBO 分析的场景，共 322 个文件（约 605 MB），含多个版本的 LBO 模型 xlsx、路演 pptx、财报 PDF，以及邮箱、聊天记录和日历数据。
- **要做的：** 在 LBO 模型里新建工作表并给出五个临界值。
- **判分：** 5 条细项，形如「States Percentage Change for Growth rate scale is -5.53%」。页面展示的一次运行把研发成本答成 4.42%，标准是 4.41%，这条不通过，整题不算过。

**数据格式：** 下面的目录结构来自数据集卡片和 Hugging Face 接口返回的文件清单；文件内容需登录后才能下载，没有打开核对。

```
apex-agents-v1.1/
├── environment/          三个共用镜像包（world、agent、verifier）和加载脚本
├── worlds/               31 个只读项目环境：filesystem.tar.gz、apps_data.tar.gz、MCP 配置
├── tasks/<题目名>/        240 个 Harbor 任务目录
│   ├── instruction.md    给 Agent 的任务说明
│   ├── task.toml、mercor.json、agent.json   元数据和运行配置
│   ├── environment/      docker-compose.yaml 和本题额外叠加的文件 task_files/
│   ├── solution/         专家答案（answer.txt 或文件）
│   └── tests/            grade.py、grading_config.json（细项）、golden_reference.txt
└── registry.json         题目名到目录的对应表
```

## 评估流程

1. **启动：** 装好 Docker 和 Harbor 0.20.0，下载数据集并加载镜像，然后 `harbor run -p apex-agents-v1.1/tasks -a apex_loop_truncated_tools_agent:ApexLoopTruncatedToolsAgent -m <模型>`。
2. **环境：** 每题用共用镜像加该题所属的项目环境起容器，应用以 MCP 服务的形式提供。
3. **执行：** 参考 Agent 是一个基于 LiteLLM 的工具调用循环，工具输出截断到 200 行或 32K 字符，最多 100 步，超时 10,800 秒。系统提示词会告知背景信息可能在环境文件和通信记录里，并说明同时给多个答案会被判零分。
4. **判分：** 每题 1 到 11 条二元细项，全库 955 条。评审模型对每条细项单独判定，依据是任务说明、Agent 的输出、相关产物或环境里的改动。1.1 版榜单的评审是 DeepSeek-v4-Flash-0731（temperature 0.1），提示词经过优化以识别碰运气式回答。
5. **算分：** 一题的细项全部通过记为通过，Pass@1 是通过题目的比例，榜单附置信区间。

## 资料依据

依据：Mercor 官方榜单页和投资银行分页（含页面内嵌的示例任务数据）、1.1 版发布博客（2026-09-08）、Hugging Face 数据集卡片 `mercor/apex-agents-v1.1`（commit `941dac1`，2026-10-06）和 `mercor/apex-agents`、GitHub 仓库 `apex_loop_truncated_tools_agent`（commit `9d99c6f`，2026-10-06）的 README、论文 arXiv 2601.14242 v3 摘要、Artificial Analysis 方法说明页（均为 2026-11-18 访问）。没有核实的部分：数据集文件需登录并同意条款，没有下载，题目文件和评分脚本内容没有读到；官方榜单每题跑几次没有找到明确说法（博客提到 Pass@4）；榜单页常见问题里写 Mean Score 是排名主指标、完整题库保持私有，这和页面默认按 Pass@1 展示、数据集卡片称 240 题全部发布不一致，正文按后者写。
