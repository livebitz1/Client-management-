import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function getProgressColor(progress: number): string {
  if (progress >= 80) return '#22c55e'
  if (progress >= 50) return '#3b82f6'
  if (progress >= 25) return '#f59e0b'
  return '#ef4444'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    inactive: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
    prospect: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    planning: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    review: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    on_hold: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    failed: 'text-red-400 bg-red-400/10 border-red-400/20',
    refunded: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
    low: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
    medium: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    urgent: 'text-red-400 bg-red-400/10 border-red-400/20',
    skipped: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  }
  return colors[status] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    prospect: 'Prospect',
    planning: 'Planning',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
    pending: 'Pending',
    failed: 'Failed',
    refunded: 'Refunded',
    bank_transfer: 'Bank Transfer',
    upi: 'UPI',
    cash: 'Cash',
    cheque: 'Cheque',
    card: 'Card',
    crypto: 'Crypto',
    other: 'Other',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    skipped: 'Skipped',
  }
  return labels[status] || status
}

export const DEFAULT_PHASES = [
  'Discovery',
  'Design',
  'Development',
  'Testing',
  'Deployment',
  'Maintenance',
]
