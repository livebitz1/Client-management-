import Shell from '@/components/Shell'
import ClientsPage from '@/components/clients/ClientsPage'

export default function Page() {
  return (
    <Shell>
      <ClientsPage />
    </Shell>
  )
}

export const dynamic = 'force-dynamic'
