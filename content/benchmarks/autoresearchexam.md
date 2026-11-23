---
id: "B26"
order: "3.2"
title: "AutoResearchExam"
aliases: []
summary: "给 Agent 一个开放式的机器学习研究题和 24 小时，让它反复改进方案、反复提交；每次提交只告诉它公开验证集上的分数，最终按隐藏测试集分数随时间变化的曲线下面积算分。"
domain: "机器学习研发"
subject: "Agent 任务，Harness 由官方自备"
task: "模型训练/实验"
scoring: "脚本/程序"
access: "全部公开"
sampleCount: "29"
reviewed: "2026-11-18"
links: [{"label": "仓库", "url": "https://github.com/bespokelabsai/AutoResearchExam"}, {"label": "官方 Harness", "url": "https://github.com/bespokelabsai/AutoResearchExam-Terminus"}, {"label": "网站与榜单", "url": "https://benchmarks.bespokelabs.ai/autoresearchexam/"}]
---

## 评估对象

**能力：** 在长时间里持续做实验并取得能泛化的改进，而不是只把验证集分数刷高。29 题按研究方向分为：模型训练 8、算法与优化 6、数据工程与筛选 6、系统与效率 4、评估校准与鲁棒性 3、AI 安全 1、可解释性 1。被测的是 Agent 整体；官方榜单为了只比较模型，统一用自家的 Terminus 2 改造版 Harness，v1.1 起任何 Harness 都能跑。

**指标：** 隐藏测试集 AUARC（Area Under the AutoResearch Curve），即 24 小时内「当前验证分最高的那次提交的隐藏测试奖励」对时间的平均，取值 0 到 1，29 题等权平均。截至 2026-11-18 访问官方榜单页，页面数据文件里最高的是 Opus 5.5 的 0.609（95% 区间 0.549 到 0.666）；2026-09-09 发布时的 9 个模型中最高是 Claude Fable 5.1 的 0.602。榜单成绩都出自 v1.0 题目加官方 Harness。

## 任务格式

Agent 拿到一份题目说明和一个容器，容器里有起始代码、开发用数据和本地自测工具。说明规定了要优化的指标、交付物的路径和接口、单次调用的时间和资源限制。交付物因题而异，多数是一个按约定接口写的程序或脚本，放在指定目录（如 `/app/output/`）。Agent 随时可以提交，提交次数不限但一次只评一个；每次提交后它只得到公开验证集上的分数和评分输出，隐藏测试集的分数始终看不到。研究窗口是 24 小时，说明里要求它一直改进到被终止为止。

**示例（真题 `budgeted-imputation-mcar50`）**

- **需求**（概括）：数值表格里每个值以 50% 的概率独立缺失，要尽量准确地把缺失值补出来。在 `/app/output/impute.py` 里实现函数 `impute(X_train, X_eval, seed)`，返回补全后的评估矩阵。
- **原始题目**（`instruction.md` 节选，全文约 762 词；省略的部分是返回值要求、指标公式、运行与预算、开发工具说明）：

  ````text
  # Recovering missing values under 50% missingness, on a fixed CPU budget

  Fill in the missing values in unseen numeric tables as accurately as possible.
  Each value is missing independently with 50% probability, and each call has a 30 second
  wall clock limit.

  Write an imputer at `/app/output/impute.py`.

  ## Submission format

  - File: `/app/output/impute.py`.
  - It must define exactly this function:

  ```python
  def impute(X_train: np.ndarray, X_eval: np.ndarray, seed: int) -> np.ndarray
  ```

  - One call handles one dataset.
  - `X_train`: shape `(n_train, d)`, dtype float64.
  - `X_eval`: shape `(n_eval, d)`, dtype float64.
  - `X_train` and `X_eval` are row-disjoint samples from the same numeric tabular dataset.
  - Both matrices have `np.nan` at their missing entries.
  - Missingness is MCAR at a rate of 0.50, drawn independently for each matrix.
  - Features were transformed to a normal output distribution by a quantile transform fitted on the incomplete
  training matrix.
  - `seed`: an integer you may use for any randomness you need.
  - Nothing in the two matrices reveals the true value of a missing entry.

  [……省略约 589 词……]
  ````
- **初始状态：** `/app/output/impute.py` 里是按列均值填补的基线；`/app/data/dev/` 有 6 个完整的开发数据集；`/app/devkit.py` 可在本地按同样规则打分。评测用的数据集不在容器里。
- **限制：** 每次调用在全新进程里运行，墙钟上限 30 秒，线程数固定为 1，超时或返回非法结果按列均值的分数（0）计；容器 8 核、14 GB 内存、无 GPU、不能上网。
- **判分：** 在隐藏数据集上计算被遮住位置的平均 R²。列均值填补得 0 分，没有上限。该题的原始 R² 再经奖励映射换成 0 到 1 的奖励，参考解水平（R² 为 0.30）对应 0.5。

**数据格式：** 一题一个目录，是 Harbor 任务格式。

```
budgeted-imputation-mcar50/
├── instruction.md    给 Agent 的题目说明
├── task.toml         配置：24 小时预算、CPU/内存/GPU、联网白名单、评分器地址
├── README.md         题目的一段话简介
├── hints/hint.md     一条研究提示，官方只在「带提示」的对照实验里用
├── environment/
│   ├── Dockerfile、docker-compose.yaml   Agent 容器和两个评分容器的定义
│   ├── app/                              起始代码、开发数据、本地自测工具
│   └── are-grader-ctx/                   评分器代码，以及验证集（hidden_data/intermediate）和测试集（hidden_data/final）
└── tests/            运行结束时汇总成绩的脚本
```

## 评估流程

1. **启动：** v1.1 用原版 Harbor 发起：`harbor run --path AutoResearchExam/<题目> --agent <agent> --model <模型> --env docker --ak prompt_template_path=AutoResearchExam/are_protocol.md.j2`，其中 `are_protocol.md.j2` 在题目说明后追加「定期提交、持续改进、不要停」的研究协议。复现榜单要用官方 Harness 仓库加 Harbor Hub 上的 v1.0 数据集 `bespokelabs/autoresearch-exam@1.0.5`。
2. **环境：** 每题一个 Agent 容器加两个评分容器，本地 Docker 或 Modal。29 题里 22 题只用 CPU（多为 8 核、14 GB 内存），7 题用 1 块 GPU。Agent 容器只能访问模型 API 和验证评分器，不能上公网，也够不到测试评分器。
3. **执行：** Agent 通过 MCP 工具 `submit`（或 HTTP `POST http://grader:8000/submit`）提交当前交付物的快照，再用 `result` 取回验证分。v1.1 中评分期间 Agent 继续工作，停不停由它自己决定，提前停会吃亏；v1.0 的官方 Harness 会让同一个会话持续提交到 24 小时结束，评分时暂停 Agent。
4. **判分：** 全部由各题自带的评分脚本完成，不用 LLM。同一份快照先在公开验证集上评分并反馈给 Agent，再在隐藏测试集上评分并只记入日志。Agent 停止时，最后的工作区如果和上次提交不同也会被评一次。
5. **算分：** 每题先把测试集原始指标按该题的奖励映射换成 0 到 1 的奖励：平凡基线为 0，较强的参考解通常为 0.5，有上界的指标越接近上界同样的提升给分越多。然后按时间顺序扫描提交：只有验证分严格超过此前最高时才换用新提交的测试奖励，所以测试奖励可能下降；曲线从 0 开始，对 24 小时积分后除以总时长就是该题的 AUARC。同题多次运行先取平均，再对各题等权平均。

## 资料依据

依据：仓库 `AutoResearchExam` commit `23c0d92`（2026-10-23，v1.1），读了 `README.md`、`are_protocol.md.j2`、`budgeted-imputation-mcar50` 的全部文本文件及各题 `task.toml`；`AutoResearchExam-Terminus` commit `b00d949`（2026-10-23），读了 `README.md`、`scripts/custom_harness.md`、`scripts/compute_auarc.py`、`scripts/reward_maps.json`；官方网站及其数据文件 `site-data.js`、`live-leaderboard.js`、`argon-live-data.js`（2026-11-18 访问）。没有实际运行。说明两点：「隐藏测试集」指 Agent 运行时接触不到，测试数据本身就在公开仓库的 `hidden_data/final` 里；网页榜单是脚本动态渲染的，最高分读自数据文件而非渲染后的页面，页面未标注这些新增条目的提交日期。
