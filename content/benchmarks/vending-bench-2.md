---
id: "B50"
order: "8.1"
title: "Vending-Bench（榜单所指为 Vending-Bench 2）"
aliases: ["Vending-Bench 2"]
summary: "让模型在一个模拟世界里独自经营一台自动售货机一整年：自己上网找供应商、发邮件谈价进货、补货定价、处理退款，最后只看银行账户里剩多少钱。"
domain: "长程自主与综合 Agent"
subject: "Agent 任务，Harness 由官方自备"
task: "交互式环境"
scoring: "脚本/程序"
access: "未公开"
sampleCount: "1 个模拟场景（不是题库），每个模型跑多次取平均"
reviewed: "2026-11-18"
links: [{"label": "官方页面与榜单", "url": "https://andonlabs.com/evals/vending-bench-2"}, {"label": "初代论文", "url": "https://arxiv.org/abs/2502.15840"}, {"label": "初代页面", "url": "https://andonlabs.com/evals/vending-bench"}]
---

## 评估对象

**能力：** 在很长的时间跨度里保持连贯并持续做出合理经营决策的能力。单看每一步都不难（查库存、下订单、定价、收钱），难在一年的模拟里要一直记得订单和到货情况、不中途停摆，还要会找便宜货源和谈价。Vending-Bench 2 比初代加了更多现实里的麻烦：供应商可能报离谱的价格或者货不对板，诚实的供应商也会抬价，送货会延迟，合作的供应商可能倒闭，顾客会来要求退款。被测的是模型，Agent 循环和工具由官方固定提供。Frontier List 上的 Vending-Bench 链接指向 Vending-Bench 2；初代已被官方标为弃用（2025-11-18 起）。

**指标：** 一年模拟结束时的银行账户余额（美元），多次运行取算术平均并给出标准误；没有上限。官方估算一个「良好」的人类策略一年能做到约 63,000 美元。截至 2026-11-18 访问官方榜单页，最高为 Gemini 4 Carbon，平均余额 16,484.21 美元（标准误 1,096 美元，6 次运行）；其后是 GPT-6 Astra 的 15,514.70 美元。起始资金是 500 美元。

## 任务格式

模型拿到一段系统提示词，之后没有真人用户，偶尔出现的用户消息只是催它继续。它每次只能调用一个工具，每次调用都会让模拟时间前进。官方页面披露的工具用途包括：上网搜索供应商、收发邮件（下单和付款都通过邮件完成）、在仓库和售货机之间搬货、记笔记和设提醒；完整的工具清单没有公开。上下文窗口限制在约 69,000 token，超出后自动裁掉较早的消息，保留约 61%。没有要提交的东西，模拟器里的账户余额就是成绩。

**示例（模拟器未公开，以下为官方披露的任务形态）**

- **需求**（系统提示词摘译）：你是 Charles Paxton，为 Vendings and Stuff 公司管理旧金山的一台自动售货机，公司不会提供任何帮助。首要目标是在一年里把利润和银行账户余额做到最大，一年后只按账户余额评价，没有变现的潜在利润不算。
- **原始题目**（没有逐题的题面，模型拿到的就是这段固定的系统提示词；照录自官方页面「System prompt」一节，节选，全文约 510 词，见 https://andonlabs.com/evals/vending-bench-2）：

  ```text
  You are Charles Paxton, an autonomous AI agent designed to manage a vending machine business.

  You work for Vendings and Stuff, a company that operates vending machines in various locations.
  You have been tasked with managing a vending machine located in San Francisco.

  Vendings and Stuff will not provide any additional help or support, so you must rely on your own capabilities
  to succeed.
  Your performance will be evaluated after a year based on your ability to generate profits and manage the
  vending machine effectively.
  Your primary goal is to maximize profits and your bank account balance over the course of one year. You will
  be judged solely on your bank account balance at the end of one year of operation. Unrealized potential
  profits do not count towards your balance.

  Your task is to generate profits from it by stocking it with popular products that you can buy from
  wholesalers. The following information might be useful:
  [……省略约 100 词……]
  - The location charges a daily fee of $2 for operating the vending machine. If you are unable to pay the daily
  fee for 10 consecutive days, you will be terminated.
  - You will be charged for the output tokens you generate on a weekly basis, the cost is $100 per million
  output tokens.
  [……省略约 180 词……]

  But remember that you are in charge and you should do whatever it takes to maximize your bank account balance
  after one year of operation.
  ```
- **初始状态：** 账户里有 500 美元，一个邮箱，一处兼作仓库的办公地址，一台放在户外的售货机；没有现成的供应商和库存。
- **要做的：** 搜索并联系批发商，谈价、下单、付款；货到仓库后搬进售货机并定价；信用卡收入一天内自动到账，现金要手动从机器里取；应对延迟到货、供应商倒闭和顾客退款。
- **判分：** 每天扣 2 美元场地费，连续 10 天付不起就提前终止；模型自己产生的输出 token 按每百万 100 美元每周扣费。跑满一年（或提前终止）时的账户余额即得分。

**数据格式：** 没有公开的任务文件或配置。下面是从官方页面和系统提示词里整理出的环境参数，不是官方的配置文件格式。

```
起始余额            500 美元
模拟时长            一年；连续 10 天付不起日租则提前终止
售货机日租          每天 2 美元
输出 token 收费     每百万 100 美元，按周扣
上下文上限          约 69,000 token，超出后裁剪，保留约 61% 的消息
工具调用            一次一个，每次调用消耗模拟时间
销量模拟            沿用初代：由星期、季节、天气和价格决定
```

## 评估流程

1. **启动：** 模拟器代码没有公开，在 Andon Labs 的 GitHub 组织里也没有找到对应仓库；榜单成绩由 Andon Labs 自行运行，官方页面没有说明外部如何自测或提交。
2. **环境：** 一个由程序和 LLM 共同驱动的模拟世界，没有虚拟机或真实交易。供应商由 LLM 扮演，会讨价还价，也可能欺诈；页面明说供应商是可以被说服白送货的 LLM。顾客购买量由公式逐日计算，初代论文的做法是：由 LLM 为每种商品生成价格弹性、参考价和基础销量，再乘以星期、月份、天气和品类丰富度的系数并加随机噪声；页面称第 2 版沿用同一套销量模拟。
3. **执行：** 模型在官方的 Agent 循环里反复调用工具，模拟时间随之推进，邮箱在夜间刷新。官方称跑完一年共产生 3,000 到 6,000 条消息，模型输出约 6,000 万到 1 亿 token。初代的做法是把补货、收现金、定价这类「线下动作」交给一个子 Agent 执行，第 2 版是否保留这一设计，页面没有说明。
4. **判分：** 不比对答案，也不用 LLM 评审，直接读取模拟器记录的期末银行账户余额。初代用的是净资产（现金加未取出的现金加库存进货价值），第 2 版改为只看账户余额，并在提示词里向模型写明。
5. **算分：** 同一模型多次运行，榜单取算术平均并标出标准误（页面可切换为几何平均）；当前榜单前十名的标注都是 6 次运行。

## 资料依据

依据：Vending-Bench 2 官方页面（含榜单和系统提示词）、初代页面、初代论文 arXiv 2502.15840 的 HTML 版，均访问于 2026-11-18；另查了 GitHub 上 AndonLabs 组织的公开仓库列表，没有模拟器仓库。Vending-Bench 2 没有单独的论文，机制细节只有页面上的文字说明；完整工具清单、供应商和退款事件的生成规则、每个模型的运行次数（只看到前十名的标注）都没能核实。榜单页显示还有 66 个模型需展开才能看到，未逐一查看。
