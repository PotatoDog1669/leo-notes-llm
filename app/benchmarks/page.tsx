import type { Metadata } from 'next'
import { BenchmarkDirectory } from '@/components/benchmark-directory'
import { PixelIcon } from '@/components/pixel-icon'
import { SiteShell } from '@/components/site-shell'
import { getBenchmarkListings } from '@/lib/benchmarks'

export const metadata: Metadata = {
  title: 'Benchmark 百科全书',
  description: '查找 LLM 和 Agent 评测，了解每项 Benchmark 测什么、任务怎么设计、结果怎么判。',
  alternates: { canonical: '/benchmarks' },
}

export default function BenchmarksPage() {
  const entries = getBenchmarkListings()
  const domainCount = new Set(entries.map((entry) => entry.domain)).size

  return (
    <SiteShell>
      <main className="content-page benchmark-page" lang="zh-CN">
        <header className="benchmark-page-header">
          <h1><PixelIcon name="books" size={44} /> <span>Benchmark <span className="benchmark-title-zh">百科全书</span></span></h1>
          <p className="lede">查找 LLM 和 Agent 评测，了解它们测什么、怎么测、怎么判。</p>
          <p className="benchmark-count">{entries.length} 个条目 · {domainCount} 个领域</p>
        </header>
        <BenchmarkDirectory entries={entries} />
      </main>
    </SiteShell>
  )
}
