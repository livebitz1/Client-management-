import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 60, height: 60,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon size={24} color="rgba(255,255,255,0.3)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20, maxWidth: 300 }}>
        {description}
      </div>
      {action}
    </div>
  )
}
