'use client'

import { useMemo, useState } from 'react'
import { ProjectCard } from '@/components/project-card'
import type { Project } from '@/lib/projects'

export function ProjectsContent({ projects }: { projects: Project[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const visibleProjects = useMemo(
    () => activeTag ? projects.filter((project) => project.tags.includes(activeTag)) : projects,
    [activeTag, projects],
  )

  function toggleTag(tag: string) {
    setActiveTag((current) => current === tag ? null : tag)
  }

  return (
    <section className="project-list" aria-label="Projects">
      {visibleProjects.map((project) => <ProjectCard key={project.slug} project={project} activeTag={activeTag} onTagClick={toggleTag} />)}
    </section>
  )
}
