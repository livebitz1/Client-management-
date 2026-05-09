import { getProgressColor } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  showLabel?: boolean
  height?: number
}

export default function ProgressBar({ progress, showLabel = false, height = 4 }: ProgressBarProps) {
  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Progress</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: getProgressColor(progress) }}>{progress}%</span>
        </div>
      )}
      <div className="progress-bar-bg" style={{ height }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${progress}%`,
            background: getProgressColor(progress),
          }}
        />
      </div>
    </div>
  )
}
