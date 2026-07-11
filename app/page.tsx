import { AllContent } from '@/components/all-content'
import { SiteShell } from '@/components/site-shell'
import { getAllPosts } from '@/lib/posts'

export default function HomePage() {
  return (
    <SiteShell>
      <AllContent posts={getAllPosts()} />
    </SiteShell>
  )
}
