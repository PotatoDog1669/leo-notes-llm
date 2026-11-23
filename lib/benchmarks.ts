import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const directory = path.join(process.cwd(), 'content/benchmarks')

type BenchmarkFrontmatter = {
  id: string
  order: string
  title: string
  aliases?: string[]
  summary: string
  domain: string
  subject: string
  task: string
  scoring: string
  access: string
  sampleCount: string
  version?: string
  reviewed: string
  links: { label: string; url: string }[]
}

type Benchmark = BenchmarkFrontmatter & { slug: string; content: string }

export type BenchmarkListing = Pick<Benchmark, 'slug' | 'id' | 'title' | 'aliases' | 'summary' | 'domain' | 'subject' | 'task' | 'scoring' | 'access'>

function readBenchmark(filename: string): Benchmark {
  const { data, content } = matter(fs.readFileSync(path.join(directory, filename), 'utf8'))
  return { ...(data as BenchmarkFrontmatter), slug: filename.slice(0, -3), content }
}

export function getBenchmarks() {
  return fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.md'))
    .map(readBenchmark)
    .sort((a, b) => a.order.localeCompare(b.order, 'en', { numeric: true }))
}

export function getBenchmarkListings(): BenchmarkListing[] {
  return getBenchmarks().map(({ slug, id, title, aliases, summary, domain, subject, task, scoring, access }) => ({
    slug, id, title, aliases, summary, domain, subject, task, scoring, access,
  }))
}
