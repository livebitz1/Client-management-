import Shell from '@/components/Shell'
import ProjectsPage from '@/components/projects/ProjectsPage'

export default function Page() {
  return (
    <Shell>
      <ProjectsPage />
    </Shell>
  )
}

export const dynamic = 'force-dynamic'
