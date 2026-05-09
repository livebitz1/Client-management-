import { getStatusColor, getStatusLabel } from '@/lib/utils'

interface BadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export default function Badge({ status, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`status-badge ${getStatusColor(status)}`}
      style={size === 'md' ? { fontSize: 12, padding: '4px 12px' } : {}}
    >
      {getStatusLabel(status)}
    </span>
  )
}
