'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Edit, CreditCard, ArrowDownCircle, Filter } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { getPayments, createPayment, updatePayment, deletePayment, getClients, getProjects } from '@/lib/actions'
import type { Client, Project, Payment, PaymentMethod, PaymentStatus } from '@/types/database'
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils'

const PAYMENT_METHODS: PaymentMethod[] = ['bank_transfer', 'upi', 'cash', 'cheque', 'card', 'crypto', 'other']

const BLANK_FORM = {
  client_id: '', project_id: '', amount: '', currency: 'INR',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'bank_transfer' as PaymentMethod,
  status: 'completed' as PaymentStatus,
  invoice_number: '', description: '', notes: '',
}

const METHOD_ICONS: Record<PaymentMethod, string> = {
  bank_transfer: '🏦', upi: '📱', cash: '💵', cheque: '📝', card: '💳', crypto: '₿', other: '💰',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filtered, setFiltered] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [pay, c, p] = await Promise.all([getPayments(), getClients(), getProjects()])
      setPayments(pay)
      setClients(c)
      setProjects(p)
    } catch { /* handled silently */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let data = payments
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(p =>
        (p.client?.name || '').toLowerCase().includes(q) ||
        (p.project?.name || '').toLowerCase().includes(q) ||
        (p.invoice_number || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') data = data.filter(p => p.status === statusFilter)
    setFiltered(data)
  }, [payments, search, statusFilter])

  const openAdd = () => {
    setEditingPayment(null)
    setForm(BLANK_FORM)
    setShowDialog(true)
  }

  const openEdit = (p: Payment) => {
    setEditingPayment(p)
    setForm({
      client_id: p.client_id, project_id: p.project_id || '', amount: String(p.amount),
      currency: p.currency, payment_date: p.payment_date, payment_method: p.payment_method,
      status: p.status, invoice_number: p.invoice_number || '',
      description: p.description || '', notes: p.notes || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.client_id || !form.amount) return
    try {
      setSaving(true)
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        project_id: form.project_id || null,
      }
      if (editingPayment) {
        await updatePayment(editingPayment.id, payload)
      } else {
        await createPayment(payload)
      }
      setShowDialog(false)
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePayment(id)
      setDeleteId(null)
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'))
    }
  }

  const clientProjects = projects.filter(p => p.client_id === form.client_id)

  const totalCompleted = filtered.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const totalPending = filtered.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  if (loading) {
    return (
      <div style={{ padding: '32px 28px' }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 68, borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 8 }} />)}
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 28px' }}>
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} total transactions`}
        action={
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, fontSize: 14 }} onClick={openAdd}>
            <Plus size={16} />
            Record Payment
          </button>
        }
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Collected</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>{formatCurrency(totalCompleted)}</div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>{formatCurrency(totalPending)}</div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transactions</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{filtered.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input className="input-glass" style={{ paddingLeft: 36 }} placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-glass" style={{ width: 'auto', minWidth: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments found"
            description={search ? 'Try a different search term' : 'Record your first payment to track revenue'}
            action={!search && (
              <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={openAdd}>
                <Plus size={14} style={{ marginRight: 6 }} />Record Payment
              </button>
            )}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Client', 'Project', 'Amount', 'Method', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={p.client?.name || '?'} size={30} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.client?.name || '—'}</div>
                        {p.invoice_number && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>#{p.invoice_number}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {p.project?.name || <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: p.status === 'completed' ? '#4ade80' : p.status === 'pending' ? '#fbbf24' : p.status === 'refunded' ? '#94a3b8' : '#f87171' }}>
                      {formatCurrency(p.amount)}
                    </div>
                    {p.description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{p.description}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      <span>{METHOD_ICONS[p.payment_method]}</span>
                      {getStatusLabel(p.payment_method)}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{formatDate(p.payment_date)}</td>
                  <td style={{ padding: '14px 16px' }}><Badge status={p.status} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(p)} style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
                        <Edit size={12} />
                      </button>
                      <button onClick={() => setDeleteId(p.id)} style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDialog(false) }}>
          <div className="dialog-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{editingPayment ? 'Edit Payment' : 'Record Payment'}</h2>
              <button onClick={() => setShowDialog(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Client *</label>
                <select className="input-glass" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value, project_id: '' }))}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                </select>
              </div>
              {form.client_id && (
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Project (optional)</label>
                  <select className="input-glass" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">No project</option>
                    {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Amount (₹) *</label>
                  <input className="input-glass" type="number" placeholder="25000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Payment Date</label>
                  <input className="input-glass" type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Payment Method</label>
                  <select className="input-glass" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_ICONS[m]} {getStatusLabel(m)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Status</label>
                  <select className="input-glass" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PaymentStatus }))}>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Invoice Number</label>
                <input className="input-glass" placeholder="INV-001" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Description</label>
                <input className="input-glass" placeholder="Initial deposit, Milestone 1..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Notes</label>
                <textarea className="input-glass" placeholder="Additional notes..." rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={() => setShowDialog(false)}>Cancel</button>
                <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingPayment ? 'Update' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div className="dialog-content" style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={20} color="#f87171" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Delete Payment?</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>This will permanently remove this payment record.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-glossy" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn-danger" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={() => handleDelete(deleteId)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
