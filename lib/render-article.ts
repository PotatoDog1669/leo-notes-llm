import { marked } from 'marked'

type Heading = { id: string; text: string; level: number }

function slugify(value: string) {
  return value.toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function renderArticle(markdown: string) {
  const headings: Heading[] = []
  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text)
    if (depth === 2 || depth === 3) headings.push({ id, text, level: depth })
    return `<h${depth} id="${id}"><a class="heading-anchor" href="#${id}" aria-label="Link to ${text}">#</a>${text}</h${depth}>`
  }
  return { html: marked.parse(markdown, { renderer, gfm: true }) as string, headings }
}
