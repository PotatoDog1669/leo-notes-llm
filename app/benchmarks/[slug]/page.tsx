import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { ArticleToc } from '@/components/article-toc'
import { SiteShell } from '@/components/site-shell'
import { getBenchmarks } from '@/lib/benchmarks'
import { renderArticle } from '@/lib/render-article'

export function generateStaticParams() {
  return getBenchmarks().map(({ slug }) => ({ slug }))
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const entry = getBenchmarks().find((item) => item.slug === slug)
  if (!entry) return {}
  return {
    title: entry.title,
    description: entry.summary,
    alternates: { canonical: `/benchmarks/${slug}` },
  }
}

export default async function BenchmarkPage({ params }: PageProps) {
  const { slug } = await params
  const entries = getBenchmarks()
  const index = entries.findIndex((item) => item.slug === slug)
  const entry = entries[index]
  if (!entry) notFound()
  const next = entries[index + 1]

  const { html, headings } = renderArticle(entry.content)
  const related = entries.filter((item) => item.slug !== slug && item.domain === entry.domain)
  related.sort((a, b) => Number(b.task === entry.task) - Number(a.task === entry.task))
  const facts = [
    ['被测对象', entry.subject],
    ['任务形态', entry.task],
    ['判分方式', entry.scoring],
    ['题量', entry.sampleCount],
    ['数据公开程度', entry.access],
    ['资料查阅日期', entry.reviewed],
  ]

  return (
    <SiteShell>
      <main className="content-page article-page benchmark-detail" lang="zh-CN">
        <Link className="back-link" href="/benchmarks">
          <ArrowLeft size={18} aria-hidden="true" /> Benchmark 百科全书
        </Link>
        <header className="article-header">
          <div className="benchmark-entry-kicker">
            <Link href={`/benchmarks?domain=${encodeURIComponent(entry.domain)}`}>{entry.domain}</Link>
            <span>{entry.id}</span>
            {entry.version && <span>版本 {entry.version}</span>}
          </div>
          <h1>{entry.title}</h1>
          <p className="article-intro">{entry.summary}</p>
          <ul className="benchmark-sources" aria-label="原始资料">
            {entry.links.map(({ url, label }) => (
              <li key={`${url}:${label}`}><a href={url}>{label}<ArrowUpRight size={14} aria-hidden="true" /></a></li>
            ))}
          </ul>
          <dl className="benchmark-facts">
            {facts.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </header>
        <div className="article-layout">
          <article className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
          <ArticleToc headings={headings} label="本页目录" />
        </div>
        {related.length > 0 && (
          <section className="benchmark-related" aria-labelledby="related-benchmarks">
            <h2 id="related-benchmarks">同领域的 Benchmark</h2>
            <ul>
              {related.slice(0, 3).map((item) => (
                <li key={item.id}><Link href={`/benchmarks/${item.slug}`}>{item.title}</Link></li>
              ))}
            </ul>
          </section>
        )}
        {next && (
          <nav className="benchmark-next" aria-label="条目翻页">
            <Link href={`/benchmarks/${next.slug}`} rel="next">
              下一页
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </nav>
        )}
      </main>
    </SiteShell>
  )
}
