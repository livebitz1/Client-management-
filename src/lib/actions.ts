import { supabase } from './supabase'
import type { Client, Project, Payment, ProjectPhase, DashboardStats, MaintenanceRecord, MaintenanceStatus } from '@/types/database'

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
    supabase.from('projects').select('id, status, progress, budget, paid_amount'),
    supabase.from('payments').select('amount').eq('status', 'completed'),
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('payment_date', firstOfMonth),
  ])

  const clientData = clients.data || []
  const projectData = projects.data || []
  const paymentData = payments.data || []
  const monthPaymentData = monthPayments.data || []

  const completedProjects = projectData.filter((p) => p.progress === 100)
  const activeProjects = projectData.filter((p) => p.status === 'in_progress' || p.status === 'review')

  // Pending payment = total outstanding balance across ALL projects where paid < budget
  const pendingAmount = projectData.reduce(
    (sum, p) => sum + Math.max(0, (p.budget || 0) - (p.paid_amount || 0)),
    0
  )

  return {
    totalClients: clientData.length,
    activeClients: clientData.filter((c) => c.status === 'active').length,
    totalProjects: projectData.length,
    activeProjects: activeProjects.length,
    totalRevenue: paymentData.reduce((sum, p) => sum + (p.amount || 0), 0),
    thisMonthRevenue: monthPaymentData.reduce((sum, p) => sum + (p.amount || 0), 0),
    pendingPayments: pendingAmount,
    completedProjects: completedProjects.length,
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

// ─── MAINTENANCE ─────────────────────────────────────────────

export async function getMaintenanceRecords(month?: string, projectId?: string): Promise<MaintenanceRecord[]> {
  let query = supabase
    .from('project_maintenance')
    .select('*, project:projects(id, name, client:clients(id, name, company, avatar_url))')
    .order('month', { ascending: false })
    .order('created_at', { ascending: false })

  if (month) query = query.eq('month', month)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createMaintenanceRecord(
  payload: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at' | 'project'>
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('project_maintenance')
    .insert(payload)
    .select('*, project:projects(id, name, client:clients(id, name, company, avatar_url))')
    .single()
  if (error) throw error
  return data
}

export async function updateMaintenanceRecord(
  id: string,
  payload: Partial<Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at' | 'project'>>
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('project_maintenance')
    .update(payload)
    .eq('id', id)
    .select('*, project:projects(id, name, client:clients(id, name, company, avatar_url))')
    .single()
  if (error) throw error
  return data
}

export async function deleteMaintenanceRecord(id: string) {
  const { error } = await supabase.from('project_maintenance').delete().eq('id', id)
  if (error) throw error
}

// Generate pending maintenance records for a given month for all active maintenance projects.
// Uses upsert with ignoreDuplicates so re-running is safe.
export async function generateMonthlyMaintenance(month: string): Promise<number> {
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, maintenance_amount')
    .eq('maintenance_active', true)
    .gt('maintenance_amount', 0)

  if (projErr) throw projErr
  if (!projects || projects.length === 0) return 0

  const rows = projects.map((p) => ({
    project_id: p.id,
    month,
    amount: p.maintenance_amount,
    status: 'pending' as MaintenanceStatus,
    paid_date: null,
    notes: null,
  }))

  const { data, error } = await supabase
    .from('project_maintenance')
    .upsert(rows, { onConflict: 'project_id,month', ignoreDuplicates: true })
    .select()

  if (error) throw error
  return (data || []).length
}

export async function getMaintenanceStats(month: string) {
  const [allRecords, activeProjects] = await Promise.all([
    supabase
      .from('project_maintenance')
      .select('amount, status')
      .eq('month', month),
    supabase
      .from('projects')
      .select('maintenance_amount')
      .eq('maintenance_active', true)
      .gt('maintenance_amount', 0),
  ])

  const records = allRecords.data || []
  const projects = activeProjects.data || []

  return {
    monthlyExpected: projects.reduce((s, p) => s + (p.maintenance_amount || 0), 0),
    collected: records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
    pending: records.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0),
    overdue: records.filter((r) => r.status === 'overdue').reduce((s, r) => s + r.amount, 0),
    activeProjectCount: projects.length,
  }
}
