'use client'

import { useEffect, useState, useCallback } from 'react'
import { Wrench, Plus, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw, Edit, X } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import {
  getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord,
  deleteMaintenanceRecord, generateMonthlyMaintenance, getMaintenanceStats, getProjects,
} from '@/lib/actions'
import type { MaintenanceRecord, MaintenanceStatus, Project } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  paid:    { label: 'Paid',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)' },
  overdue: { label: 'Overdue', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const BLANK_FORM = {
  project_id: '',
  month: currentMonth(),
  amount: '',
  status: 'pending' as MaintenanceStatus,
  paid_date: '',
  notes: '',
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ monthlyExpected: 0, collected: 0, pending: 0, overdue: 0, activeProjectCount: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [generateMsg, setGenerateMsg] = useState('')
  const [showNotesId, setShowNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      // Load projects first — independently so dropdown always works even if
      // the maintenance table hasn't been created yet via maintenance-schema.sql
      const projs = await getProjects()
      setProjects(projs)

      try {
        const [recs, st] = await Promise.all([
          getMaintenanceRecords(selectedMonth),
          getMaintenanceStats(selectedMonth),
        ])
        setRecords(recs)
        setStats(st)
      } catch {
        // Maintenance table not yet created — show empty state, projects still work
        setRecords([])
      }
    } catch { /* silently */ } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter === 'all' ? records : records.filter(r => r.status === statusFilter)

  const activeMaintenanceProjects = projects.filter(p => p.maintenance_active && p.maintenance_amount > 0)

  const openAdd = () => {
    setEditingRecord(null)
    setForm({ ...BLANK_FORM, month: selectedMonth })
    setShowDialog(true)
  }

  const openEdit = (r: MaintenanceRecord) => {
    setEditingRecord(r)
    setForm({
      project_id: r.project_id,
      month: r.month,
      amount: String(r.amount),
      status: r.status,
      paid_date: r.paid_date || '',
      notes: r.notes || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.project_id || !form.amount || !form.month) return
    try {
      setSaving(true)
      const payload = {
        project_id: form.project_id,
        month: form.month,
        amount: parseFloat(form.amount) || 0,
        status: form.status,
        paid_date: form.status === 'paid' ? (form.paid_date || new Date().toISOString().split('T')[0]) : null,
        notes: form.notes || null,
      }
      if (editingRecord) {
        await updateMaintenanceRecord(editingRecord.id, payload)
      } else {
        await createMaintenanceRecord(payload)
      }
      setShowDialog(false)
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown'))
    } finally { setSaving(false) }
  }

  const handleMarkPaid = async (r: MaintenanceRecord) => {
    try {
      await updateMaintenanceRecord(r.id, {
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
      })
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown'))
    }
  }

  const handleMarkOverdue = async (r: MaintenanceRecord) => {
    try {
      await updateMaintenanceRecord(r.id, { status: 'overdue' })
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown'))
    }
  }

  const handleSaveNotes = async (id: string) => {
    try {
      await updateMaintenanceRecord(id, { notes: notesDraft || null })
      setShowNotesId(null)
      await load()
    } catch { /* silently */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMaintenanceRecord(id)
      setDeleteId(null)
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown'))
    }
  }

  const handleGenerate = async () => {
    if (activeMaintenanceProjects.length === 0) {
      setGenerateMsg('No projects with maintenance enabled. Enable maintenance on a project first.')
      setTimeout(() => setGenerateMsg(''), 4000)
      return
    }
    try {
      setGenerating(true)
      const count = await generateMonthlyMaintenance(selectedMonth)
      setGenerateMsg(count > 0 ? `Generated ${count} record${count > 1 ? 's' : ''} for ${monthLabel(selectedMonth)}` : `All records already exist for ${monthLabel(selectedMonth)}`)
      setTimeout(() => setGenerateMsg(''), 4000)
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown'))
    } finally { setGenerating(false) }
  }

  if (loading) {
    return (
      <div className="page-pad">
        <div style={{ height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 20 }} />
        {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 10 }} />)}
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        title="Maintenance"
        subtitle={`${activeMaintenanceProjects.length} project${activeMaintenanceProjects.length !== 1 ? 's' : ''} with active maintenance`}
        action={
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, fontSize: 14 }} onClick={openAdd}>
            <Plus size={16} /> Add Record
          </button>
        }
      />

      {/* Month Selector + Generate */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="month"
          className="input-glass"
          style={{ width: 'auto', minWidth: 160 }}
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        />
        <button
          className="btn-glossy"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, fontSize: 14 }}
          onClick={handleGenerate}
          disabled={generating}
        >
          <RefreshCw size={14} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
          {generating ? 'Generating…' : `Generate for ${monthLabel(selectedMonth)}`}
        </button>
        {generateMsg && (
          <span style={{ fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} /> {generateMsg}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 20 }}>
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly Expected</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{formatCurrency(stats.monthlyExpected)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{stats.activeProjectCount} active projects</div>
        </div>
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Collected</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>{formatCurrency(stats.collected)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{monthLabel(selectedMonth)}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>{formatCurrency(stats.pending)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Not yet collected</div>
        </div>
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overdue</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f87171' }}>{formatCurrency(stats.overdue)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Missed payments</div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'paid', 'overdue'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: statusFilter === s ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
              background: statusFilter === s ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: statusFilter === s ? '#fff' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            {s === 'all' ? `All (${records.length})` : `${STATUS_CONFIG[s].label} (${records.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Records List */}
      {filtered.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Wrench}
            title={records.length === 0 ? 'No maintenance records' : 'No records match this filter'}
            description={
              records.length === 0
                ? `Click "Generate for ${monthLabel(selectedMonth)}" to auto-create records for all active maintenance projects, or add one manually.`
                : 'Try a different status filter'
            }
            action={records.length === 0 && (
              <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={handleGenerate} disabled={generating}>
                <RefreshCw size={14} style={{ marginRight: 6 }} />Generate Records
              </button>
            )}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const cfg = STATUS_CONFIG[r.status]
            const project = r.project
            const client = project?.client
            return (
              <div key={r.id} className="glass-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  {/* Left: project + client info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <Avatar name={client?.name || project?.name || '?'} size={38} imageUrl={client?.avatar_url} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project?.name || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {client?.name || ''}
                        {client?.company ? ` · ${client.company}` : ''}
                      </div>
                      {r.notes && showNotesId !== r.id && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontStyle: 'italic' }}>{r.notes}</div>
                      )}
                      {showNotesId === r.id && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <input
                            className="input-glass"
                            style={{ fontSize: 12, padding: '6px 10px' }}
                            placeholder="Add a note..."
                            value={notesDraft}
                            onChange={e => setNotesDraft(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => handleSaveNotes(r.id)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}>Save</button>
                          <button onClick={() => setShowNotesId(null)} style={{ padding: '6px 8px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)' }}><X size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Center: amount + month */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: cfg.color }}>{formatCurrency(r.amount)}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{monthLabel(r.month)}</div>
                    {r.paid_date && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>Paid {new Date(r.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                  </div>

                  {/* Right: status + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Status badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                    }}>
                      {r.status === 'paid' ? <CheckCircle2 size={11} /> : r.status === 'overdue' ? <AlertCircle size={11} /> : <Clock size={11} />}
                      {cfg.label}
                    </span>

                    {/* Quick action buttons */}
                    {r.status !== 'paid' && (
                      <button
                        onClick={() => handleMarkPaid(r)}
                        style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <CheckCircle2 size={12} /> Mark Paid
                      </button>
                    )}
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleMarkOverdue(r)}
                        style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.06)', color: '#f87171' }}
                        title="Mark as overdue"
                      >
                        <AlertCircle size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => { setShowNotesId(r.id); setNotesDraft(r.notes || '') }}
                      style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                      title="Edit notes"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                      title="Edit record"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setDeleteId(r.id)}
                      style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      {showDialog && (
        <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDialog(false) }}>
          <div className="dialog-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{editingRecord ? 'Edit Record' : 'Add Maintenance Record'}</h2>
              <button onClick={() => setShowDialog(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Project *</label>
                <select className="input-glass" value={form.project_id} onChange={e => {
                  const proj = projects.find(p => p.id === e.target.value)
                  setForm(f => ({ ...f, project_id: e.target.value, amount: proj?.maintenance_amount ? String(proj.maintenance_amount) : f.amount }))
                }}>
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.client ? ` (${p.client.name})` : ''}{p.maintenance_active ? ' 🔧' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid-2">
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Month *</label>
                  <input className="input-glass" type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Amount (₹) *</label>
                  <input className="input-glass" type="number" placeholder="5000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Status</label>
                  <select className="input-glass" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as MaintenanceStatus }))}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                {form.status === 'paid' && (
                  <div>
                    <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Paid Date</label>
                    <input className="input-glass" type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Notes</label>
                <input className="input-glass" placeholder="Optional note..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={() => setShowDialog(false)}>Cancel</button>
                <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editingRecord ? 'Update' : 'Add Record'}
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Delete Record?</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>This will permanently remove this maintenance record.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-glossy" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn-danger" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={() => handleDelete(deleteId)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
