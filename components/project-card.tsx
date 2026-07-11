'use client'

import { ArrowUpRight, CalendarDays, GitFork, MonitorCog, Star } from 'lucide-react'
import type { Project } from '@/lib/projects'

export function ProjectCard({ project, activeTag, onTagClick }: { project: Project; activeTag: string | null; onTagClick: (tag: string) => void }) {
  return (
    <article className="project-card">
      <div className="project-card-header">
        <div className="project-emblem" aria-hidden="true"><MonitorCog size={34} strokeWidth={2.2} /></div>
        <div className="project-heading">
          <p className="project-kicker">{project.category} <span aria-hidden="true">·</span> {project.language} <span aria-hidden="true">·</span> {project.license}</p>
          <h2><a href={project.githubUrl} target="_blank" rel="noreferrer">{project.name}<ArrowUpRight size={19} aria-hidden="true" /></a></h2>
          <p className="project-repository">{project.repository}</p>
        </div>
        <div className="project-github-stats" aria-label="GitHub 数据">
          <span><a href={`${project.githubUrl}/stargazers`} target="_blank" rel="noreferrer" aria-label={`查看 ${project.name} 的 Stars`} title={`${project.github.stars} Stars`}><Star size={16} aria-hidden="true" /></a>{project.github.stars}</span>
          <span><a href={`${project.githubUrl}/forks`} target="_blank" rel="noreferrer" aria-label={`查看 ${project.name} 的 Forks`} title={`${project.github.forks} Forks`}><GitFork size={16} aria-hidden="true" /></a>{project.github.forks}</span>
        </div>
      </div>

      <p className="project-summary">{project.summary}</p>

      <div className="project-support" aria-label="支持范围">
        {project.supported.map((group) => (
          <div className="project-support-row" key={group.label}>
            <span className="project-support-label">{group.label}</span>
            <div className="project-support-items">
              {group.items.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div className="project-tags" aria-label="Project topics">
        {project.tags.map((tag) => <button key={tag} className={activeTag === tag ? 'active' : ''} type="button" onClick={() => onTagClick(tag)} aria-pressed={activeTag === tag}>{tag}</button>)}
      </div>

      <div className="project-card-footer">
        <span className="project-updated"><CalendarDays size={16} aria-hidden="true" /> 最近更新于 {project.updatedAt}</span>
      </div>
    </article>
  )
}
