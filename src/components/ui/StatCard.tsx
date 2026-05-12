import { LucideIcon } from 'lucide-react'
import { useCountAnimation } from '@/hooks/useCountAnimation'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  trend?: { value: string; positive: boolean }
}

export default function StatCard({ title, value, subtitle, icon: Icon, iconColor = '#fff', trend }: StatCardProps) {
  const animatedValue = useCountAnimation(value)

  return (
    <div className="glass-card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={17} color={iconColor} strokeWidth={2} />
        </div>
        {trend && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: trend.positive ? '#4ade80' : '#f87171',
            background: trend.positive ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            padding: '2px 8px', borderRadius: 99,
            border: `1px solid ${trend.positive ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          }}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {animatedValue}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6, fontWeight: 500 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{subtitle}</div>
      )}
    </div>
  )
}
