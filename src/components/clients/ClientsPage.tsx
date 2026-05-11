'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Edit, Phone, Mail, Building2, Users } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { getClients, createClient, updateClient, deleteClient } from '@/lib/actions'
import type { Client, ClientStatus } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'

const BLANK_FORM = {
  name: '', phone: '', company: '', address: '',
  avatar_url: null as string | null, status: 'active' as ClientStatus, notes: '',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getClients()
      setClients(data)
    } catch {
      setError('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let data = clients
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') data = data.filter(c => c.status === statusFilter)
    setFiltered(data)
  }, [clients, search, statusFilter])

  const openAdd = () => { setEditingClient(null); setForm(BLANK_FORM); setShowDialog(true) }
  const openEdit = (c: Client) => {
    setEditingClient(c)
    setForm({ name: c.name, phone: c.phone || '', company: c.company || '', address: c.address || '', avatar_url: c.avatar_url, status: c.status, notes: c.notes || '' })
    setShowDialog(true)
  }

  const handleSave = async () => {
    // Validate required fields
    if (!form.name.trim()) {
      alert('Full Name is required')
      return
    }
    if (!form.phone.trim()) {
      alert('Phone is required')
      return
    }
    try {
      setSaving(true)
      if (editingClient) { 
        await updateClient(editingClient.id, form) 
      } else { 
        // Generate unique email for new clients
        const newClientData = { 
          ...form, 
          email: `${form.name.replace(/\s+/g, '').toLowerCase()}_${Date.now()}@auto.clientflow` 
        }
        await createClient(newClientData)
      }
      setShowDialog(false)
      await load()
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      alert('Error: ' + errorMsg)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteClient(id)
      setDeleteId(null)
      await load()
    } catch (e: unknown) {
      alert('Error deleting client: ' + (e instanceof Error ? e.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="page-pad">
        <div style={{ height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 20 }} />
        {[1,2,3,4].map(i => <div key={i} style={{ height: 68, borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 8 }} />)}
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} total clients`}
        action={
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, fontSize: 14 }} onClick={openAdd}>
            <Plus size={16} />
            <span>Add Client</span>
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input className="input-glass" style={{ paddingLeft: 36 }} placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-glass" style={{ width: 'auto', minWidth: 130 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Table */}
      <div className="glass-card r-table-wrap" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients found"
            description={search ? 'Try a different search term' : 'Add your first client to get started'}
            action={!search && (
              <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={openAdd}>
                <Plus size={14} style={{ marginRight: 6 }} />Add Client
              </button>
            )}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Client', 'Contact', 'Status', 'Total Paid', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="cell-primary" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={c.name} size={36} imageUrl={c.avatar_url} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{c.name}</div>
                        {c.company && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Building2 size={11} />{c.company}
                        </div>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Contact" style={{ padding: '14px 16px' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Mail size={12} />{c.email}
                      </div>
                      {c.phone && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={12} />{c.phone}
                      </div>}
                    </div>
                  </td>
                  <td data-label="Status" style={{ padding: '14px 16px' }}><Badge status={c.status} /></td>
                  <td data-label="Total Paid" style={{ padding: '14px 16px', fontWeight: 600, fontSize: 14, color: c.total_paid > 0 ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                    {formatCurrency(c.total_paid)}
                  </td>
                  <td data-label="Joined" style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{formatDate(c.created_at)}</td>
                  <td className="cell-actions" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(c)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
                        <Edit size={12} /> Edit
                      </button>
                      <button onClick={() => setDeleteId(c.id)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#f87171' }}>
                        <Trash2 size={12} /> Delete
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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={() => setShowDialog(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Full Name *</label>
                <input className="input-glass" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Phone *</label>
                <input className="input-glass" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Company</label>
                <input className="input-glass" placeholder="Acme Corp" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Status</label>
                <select className="input-glass" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ClientStatus }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Address</label>
                <input className="input-glass" placeholder="City, State, Country" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Notes</label>
                <textarea className="input-glass" placeholder="Any notes about this client..." rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={() => setShowDialog(false)}>Cancel</button>
                <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Delete Client?</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24, lineHeight: 1.6 }}>
                This will permanently delete the client and all their projects and payments.
              </p>
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
