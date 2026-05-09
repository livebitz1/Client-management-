import { supabase } from './supabase'
import type { Client, Project, Payment, ProjectPhase, DashboardStats } from '@/types/database'

// ─── CLIENTS ─────────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createClient(payload: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'total_paid'>) {
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, payload: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

// ─── PROJECTS ────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(*), phases:project_phases(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(*), phases:project_phases(*), payments(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, phases:project_phases(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createProject(
  payload: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'paid_amount' | 'client' | 'phases' | 'payments'>,
  phases?: string[]
) {
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  if (phases && phases.length > 0) {
    const phaseRows = phases.map((name, index) => ({
      project_id: data.id,
      name,
      order_index: index,
      status: index === 0 ? 'in_progress' : 'pending',
    }))
    await supabase.from('project_phases').insert(phaseRows)
  }

  return data
}

export async function updateProject(id: string, payload: Partial<Project>) {
  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ─── PROJECT PHASES ──────────────────────────────────────────

export async function updatePhase(id: string, payload: Partial<ProjectPhase>) {
  const { data, error } = await supabase
    .from('project_phases')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── PAYMENTS ────────────────────────────────────────────────

export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, client:clients(id,name,company), project:projects(id,name)')
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPaymentsByClient(clientId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, project:projects(id,name)')
    .eq('client_id', clientId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createPayment(
  payload: Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
) {
  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePayment(id: string, payload: Partial<Payment>) {
  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayment(id: string) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

// ─── DASHBOARD STATS ─────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const [clients, projects, payments, monthPayments] = await Promise.all([
    supabase.from('clients').select('id, status'),
    supabase.from('projects').select('id, status'),
    supabase.from('payments').select('amount, status').eq('status', 'completed'),
    supabase
      .from('payments')
      .select('amount, status')
      .eq('status', 'completed')
      .gte('payment_date', firstOfMonth),
  ])

  const clientData = clients.data || []
  const projectData = projects.data || []
  const paymentData = payments.data || []
  const monthPaymentData = monthPayments.data || []

  const pendingPayments = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'pending')

  return {
    totalClients: clientData.length,
    activeClients: clientData.filter((c) => c.status === 'active').length,
    totalProjects: projectData.length,
    activeProjects: projectData.filter((p) => p.status === 'in_progress' || p.status === 'review').length,
    totalRevenue: paymentData.reduce((sum, p) => sum + (p.amount || 0), 0),
    thisMonthRevenue: monthPaymentData.reduce((sum, p) => sum + (p.amount || 0), 0),
    pendingPayments: (pendingPayments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0),
    completedProjects: projectData.filter((p) => p.status === 'completed').length,
  }
}

export async function getRevenueByMonth(): Promise<{ month: string; revenue: number }[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount, payment_date, status')
    .eq('status', 'completed')
    .order('payment_date', { ascending: true })
  if (error) return []

  const grouped: Record<string, number> = {}
  ;(data || []).forEach((p) => {
    const d = new Date(p.payment_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    grouped[key] = (grouped[key] || 0) + (p.amount || 0)
  })

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, revenue]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue,
    }))
}
