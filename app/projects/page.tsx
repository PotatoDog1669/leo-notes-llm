import { SiteShell } from '@/components/site-shell'
import { PixelIcon } from '@/components/pixel-icon'
import { ProjectsContent } from '@/components/projects-content'
import { projects } from '@/lib/projects'

export default function ProjectsPage() {
  return (
    <SiteShell>
      <main className="content-page projects-page">
        <h1><PixelIcon name="anvil" size={44} /> Projects</h1>
        <p className="lede">Experiments, small systems, and work in progress.</p>

        <ProjectsContent projects={projects} />
      </main>
    </SiteShell>
  )
}
