import Shell from '@/components/Shell'
import PaymentsPage from '@/components/payments/PaymentsPage'

export default function Page() {
  return (
    <Shell>
      <PaymentsPage />
    </Shell>
  )
}

export const dynamic = 'force-dynamic'
