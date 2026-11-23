'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, SlidersHorizontal } from 'lucide-react'
import type { BenchmarkListing } from '@/lib/benchmarks'
import { PixelIcon } from '@/components/pixel-icon'

const fields = [
  ['domain', '领域'],
  ['subject', '被测对象'],
  ['scoring', '判分方式'],
  ['task', '任务形态'],
  ['access', '数据公开程度'],
] as const

type FilterField = typeof fields[number][0]
type Filters = Partial<Record<FilterField | 'q', string>>

const subjects: Record<string, string> = {
  'Agent 任务，Harness 由官方自备': '固定 Harness',
  'Agent 任务，Harness 也是变量': '可变 Harness',
}

const questions: { label: string; filters: Filters }[] = [
  { label: '哪些评测能比较不同 Harness？', filters: { subject: 'Agent 任务，Harness 也是变量' } },
  { label: '哪些评测公开了全部题目？', filters: { access: '全部公开' } },
  { label: '哪些任务需要提交文件？', filters: { task: '文件交付物' } },
]

function readFilters(): Filters {
  const params = new URLSearchParams(window.location.search)
  return {
    q: params.get('q') ?? '',
    ...Object.fromEntries(fields.map(([field]) => [field, params.get(field) ?? ''])),
  }
}

function formatOption(field: FilterField, option: string) {
  return field === 'subject' ? subjects[option] ?? option : option
}

function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

export function BenchmarkDirectory({ entries }: { entries: BenchmarkListing[] }) {
  const [filters, setFilters] = useState<Filters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    function restoreFilters() {
      const restored = readFilters()
      setFilters(restored)
      if (restored.task || restored.access) setShowMore(true)
    }

    restoreFilters()
    window.addEventListener('popstate', restoreFilters)
    return () => window.removeEventListener('popstate', restoreFilters)
  }, [])

  function updateFilters(next: Filters) {
    setFilters(next)
    const url = new URL(window.location.href)
    url.hash = ''
    for (const field of ['q', ...fields.map(([name]) => name)] as const) {
      const value = next[field]
      if (value) url.searchParams.set(field, value)
      else url.searchParams.delete(field)
    }
    window.history.replaceState(null, '', url)
  }

  const words = (filters.q ?? '').split(/\s+/).map(normalizeSearch).filter(Boolean)
  const results = entries.filter((entry) => {
    const text = normalizeSearch([
      entry.id, entry.title, ...(entry.aliases ?? []), entry.summary, entry.domain,
      entry.task, entry.subject, formatOption('subject', entry.subject), entry.scoring, entry.access,
    ].join(' '))
    return words.every((word) => text.includes(word))
      && fields.every(([field]) => !filters[field] || entry[field] === filters[field])
  })

  const groups = new Map<string, BenchmarkListing[]>()
  for (const entry of results) {
    const group = groups.get(entry.domain)
    if (group) group.push(entry)
    else groups.set(entry.domain, [entry])
  }

  const hasFilters = Object.values(filters).some(Boolean)

  function renderFilter([field, label]: typeof fields[number]) {
    const options = [...new Set(entries.map((entry) => entry[field]))]

    return (
      <label className="benchmark-select" key={field}>
        <span>{label}</span>
        <select value={filters[field] ?? ''} onChange={(event) => updateFilters({ ...filters, [field]: event.target.value })}>
          <option value="">全部</option>
          {options.map((option) => <option key={option} value={option}>{formatOption(field, option)}</option>)}
        </select>
      </label>
    )
  }

  return (
    <>
      <section className="benchmark-controls" aria-label="查找 Benchmark">
        <label className="search-field benchmark-search">
          <PixelIcon name="search" size={25} />
          <input
            type="search"
            aria-label="搜索 Benchmark"
            placeholder="搜索名称、别名或能力"
            value={filters.q ?? ''}
            onChange={(event) => updateFilters({ ...filters, q: event.target.value })}
          />
        </label>
        <button type="button" className="benchmark-mobile-filter" aria-expanded={showFilters} aria-controls="benchmark-filters" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={16} aria-hidden="true" /> 筛选
        </button>
        <div id="benchmark-filters" className={showFilters ? 'benchmark-filters is-open' : 'benchmark-filters'}>
          <div className="benchmark-filter-row">
            {fields.slice(0, 3).map(renderFilter)}
            <button type="button" className="benchmark-more" aria-expanded={showMore} aria-controls="benchmark-more-filters" onClick={() => setShowMore(!showMore)}>
              更多筛选 <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
          <div id="benchmark-more-filters" hidden={!showMore}>
            <div className="benchmark-filter-row">{fields.slice(3).map(renderFilter)}</div>
          </div>
        </div>
        <div className="benchmark-questions">
          <span>按问题找</span>
          {questions.map(({ label, filters: preset }) => (
            <button type="button" key={label} onClick={() => {
              if (preset.task || preset.access) setShowMore(true)
              updateFilters(preset)
            }}>{label}</button>
          ))}
        </div>
      </section>

      <div className="benchmark-result-bar">
        <p role="status">{results.length} 个结果</p>
        {hasFilters && <button type="button" onClick={() => updateFilters({})}>清除搜索和筛选</button>}
      </div>
      {groups.size > 1 && (
        <nav className="benchmark-group-nav" aria-label="跳转到领域">
          {[...groups].map(([domain]) => (
            <a key={domain} href={`#domain-${encodeURIComponent(domain)}`}>{domain}</a>
          ))}
        </nav>
      )}

      {results.length === 0 && <p className="benchmark-empty">没有找到符合条件的条目。试试缩短关键词，或清除一个筛选条件。</p>}
      {[...groups].map(([domain, group]) => (
        <section key={domain} className="benchmark-group" id={`domain-${domain}`} aria-label={domain}>
          <h2>{domain} <span>{group.length} 项</span></h2>
          <ul>
            {group.map((entry) => (
              <li key={entry.id}>
                <Link href={`/benchmarks/${entry.slug}`} prefetch={false} className="benchmark-row">
                  <h3>{entry.title}</h3>
                  <p>{entry.summary}</p>
                  <ul className="benchmark-row-facts" aria-label="条目速览">
                    {[entry.task, formatOption('subject', entry.subject), entry.scoring, entry.access].map((value) => <li key={value}>{value}</li>)}
                  </ul>
                  <ArrowRight size={18} aria-hidden="true" className="benchmark-row-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
