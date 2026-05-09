'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, FolderKanban, DollarSign, TrendingUp,
  Clock, CheckCircle2, ArrowRight, AlertCircle, Wrench
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import ProgressBar from '@/components/ui/ProgressBar'
import PageHeader from '@/components/ui/PageHeader'
import { getDashboardStats, getRevenueByMonth, getClients, getProjects, getPayments, getMaintenanceStats, getMaintenanceRecords } from '@/lib/actions'
import type { DashboardStats, Client, Project, Payment, MaintenanceRecord } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{formatCurrency(payload[0].value)}</div>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<{ month: string; revenue: number }[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [maintStats, setMaintStats] = useState({ monthlyExpected: 0, collected: 0, pending: 0, overdue: 0, activeProjectCount: 0 })
  const [maintRecords, setMaintRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentMonth = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [s, r, c, p, pay] = await Promise.all([
        getDashboardStats(), getRevenueByMonth(), getClients(), getProjects(), getPayments(),
      ])
      setStats(s); setRevenue(r)
      setClients(c.slice(0, 5)); setProjects(p.slice(0, 5)); setPayments(pay.slice(0, 5))

      // Load maintenance separately so it doesn't break dashboard if table isn't set up
      try {
        const [ms, mr] = await Promise.all([
          getMaintenanceStats(currentMonth),
          getMaintenanceRecords(currentMonth),
        ])
        setMaintStats(ms)
        setMaintRecords(mr)
      } catch { /* maintenance table may not exist yet */ }
    } catch {
      setError('Failed to connect to Supabase. Please configure your .env.local file.')
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="page-pad">
        <div className="grid-stats" style={{ marginBottom: 24 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 120, borderRadius: 16, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-pad">
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 6 }}>Configuration Required</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{error}</div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: 8 }}>
              NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co<br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        title="Dashboard"
        subtitle={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} — here's your overview`}
      />

      {/* Stats Grid */}
      <div className="grid-stats">
        <StatCard title="Total Clients" value={String(stats?.totalClients || 0)} subtitle={`${stats?.activeClients || 0} active`} icon={Users} iconColor="#a78bfa" />
        <StatCard title="Total Projects" value={String(stats?.totalProjects || 0)} subtitle={`${stats?.activeProjects || 0} active`} icon={FolderKanban} iconColor="#60a5fa" />
        <StatCard title="Total Revenue" value={formatCurrency(stats?.totalRevenue || 0)} subtitle="All time earnings" icon={DollarSign} iconColor="#4ade80" />
        <StatCard title="This Month" value={formatCurrency(stats?.thisMonthRevenue || 0)} subtitle={`${formatCurrency(stats?.pendingPayments || 0)} pending`} icon={TrendingUp} iconColor="#fbbf24" />
        <StatCard title="Completed" value={String(stats?.completedProjects || 0)} subtitle="100% progress projects" icon={CheckCircle2} iconColor="#34d399" />
        <StatCard title="Pending Payment" value={formatCurrency(stats?.pendingPayments || 0)} subtitle="Unpaid project balance" icon={Clock} iconColor="#f87171" />
        <StatCard
          title="Maintenance / Mo"
          value={formatCurrency(maintStats.monthlyExpected || maintStats.collected)}
          subtitle={maintStats.activeProjectCount > 0 ? `${maintStats.activeProjectCount} active project${maintStats.activeProjectCount !== 1 ? 's' : ''}` : `${formatCurrency(maintStats.collected)} collected this month`}
          icon={Wrench}
          iconColor="#c084fc"
        />
      </div>

      {/* Charts + Recent Payments */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* Revenue Chart */}
        <div className="glass-card" style={{ padding: '20px 20px 10px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Revenue Trend</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Last 6 months</div>
          </div>
          {revenue.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
              No payment data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={revenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {revenue.map((entry, index) => {
                    const max = Math.max(...revenue.map(r => r.revenue))
                    const isMax = entry.revenue === max
                    return (
                      <Cell
                        key={index}
                        fill={isMax ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)'}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Payments */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Recent Payments</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Latest transactions</div>
            </div>
            <Link href="/payments" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No payments yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {payments.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Avatar name={p.client?.name || 'Unknown'} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.client?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{formatDate(p.payment_date)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{formatCurrency(p.amount)}</div>
                    <Badge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Clients + Active Projects */}
      <div className="grid-2">
        {/* Recent Clients */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Recent Clients</div>
            <Link href="/clients" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No clients yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clients.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Avatar name={c.name} size={30} imageUrl={c.avatar_url} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{c.company || c.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Badge status={c.status} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{formatCurrency(c.total_paid)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Projects */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Active Projects</div>
            <Link href="/projects" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No projects yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {projects.map((p) => (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.current_phase} · {p.client?.name}</div>
                    </div>
                    <Badge status={p.status} />
                  </div>
                  <ProgressBar progress={p.progress} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
