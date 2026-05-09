export type ClientStatus = 'active' | 'inactive' | 'prospect'
export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold' | 'cancelled'
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'card' | 'crypto' | 'other'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  avatar_url: string | null
  status: ClientStatus
  total_paid: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  description: string | null
  status: ProjectStatus
  current_phase: string
  budget: number
  paid_amount: number
  start_date: string | null
  end_date: string | null
  priority: Priority
  progress: number
  created_at: string
  updated_at: string
  client?: Client
  phases?: ProjectPhase[]
  payments?: Payment[]
}

export interface ProjectPhase {
  id: string
  project_id: string
  name: string
  description: string | null
  order_index: number
  status: PhaseStatus
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  client_id: string
  project_id: string | null
  amount: number
  currency: string
  payment_date: string
  payment_method: PaymentMethod
  status: PaymentStatus
  invoice_number: string | null
  description: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: Client
  project?: Project
}

export interface DashboardStats {
  totalClients: number
  activeClients: number
  totalProjects: number
  activeProjects: number
  totalRevenue: number
  thisMonthRevenue: number
  pendingPayments: number
  completedProjects: number
}

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'total_paid'>
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'paid_amount' | 'client' | 'phases' | 'payments'>
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client' | 'phases' | 'payments'>>
      }
      project_phases: {
        Row: ProjectPhase
        Insert: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>
        Update: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'client' | 'project'>>
      }
    }
  }
}
