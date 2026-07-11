export type Project = {
  slug: string
  name: string
  repository: string
  githubUrl: string
  category: string
  language: string
  license: string
  summary: string
  github: {
    stars: number
    forks: number
  }
  supported: Array<{
    label: string
    items: string[]
  }>
  tags: string[]
  updatedAt: string
}

export const projects: Project[] = [
  {
    slug: 'insight-flow',
    name: 'Insight Flow',
    repository: 'PotatoDog1669/insight-flow',
    githubUrl: 'https://github.com/PotatoDog1669/insight-flow',
    category: '开源项目',
    language: 'Python · TypeScript',
    license: 'MIT',
    summary: '一个面向研究监控、持续情报收集和内容沉淀的工作台。系统可基于手动配置或 Agent 生成的 Monitor 草案，持续完成多源内容采集、AI 筛选与总结、报告生成，并将结果同步发布到 Notion、Obsidian 或 RSS。',
    github: {
      stars: 6,
      forks: 1,
    },
    supported: [
      { label: '信息源', items: ['RSS', '网站抓取', 'GitHub Trending', 'Hugging Face', 'OpenAlex', 'PubMed', 'Reddit', 'X'] },
      { label: '报告类型', items: ['日报', '周报', '调研报告', '论文推荐'] },
      { label: '发布目标', items: ['Notion', 'Obsidian', 'RSS'] },
    ],
    tags: ['Research monitoring', 'Continuous intelligence', 'AI workflow', 'FastAPI', 'Next.js'],
    updatedAt: '2026 年 6 月 25 日',
  },
  {
    slug: 'browseruse-agent-bench',
    name: 'Browseruse Agent Bench',
    repository: 'lexmount/browseruse-agent-bench',
    githubUrl: 'https://github.com/lexmount/browseruse-agent-bench',
    category: '开源项目',
    language: 'Python',
    license: 'Apache-2.0',
    summary: '一个针对 AI 浏览器 Agent 的全能评估框架，旨在受控且可复现的设置下，跨多个数据集、浏览器后端和模型对多个 Agent 进行评测。支持本地和云端浏览器，集成 LLM-as-Judge 自动化评估，并提供本地排行榜以及 Agent 步骤、端到端延迟和 Token 使用量等效率与成本指标。',
    github: {
      stars: 17,
      forks: 3,
    },
    supported: [
      { label: '支持的 Benchmark', items: ['LexBench-Browser', 'Online-Mind2Web', 'BrowseComp'] },
      { label: '支持的 Agent', items: ['browser-use', 'skyvern', 'Agent-TARS'] },
    ],
    tags: ['Browser agents', 'Multi-benchmark evaluation', 'LLM-as-Judge', 'Local and cloud browsers', 'Leaderboard'],
    updatedAt: '2026 年 7 月 9 日',
  },
]
