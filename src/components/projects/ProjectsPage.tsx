'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Edit, FolderKanban, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import { getProjects, createProject, updateProject, deleteProject, updatePhase, getClients } from '@/lib/actions'
import type { Client, Project, ProjectStatus, Priority, PhaseStatus } from '@/types/database'
import { formatCurrency, formatDate, DEFAULT_PHASES } from '@/lib/utils'

const BLANK_FORM = {
  name: '', description: '', client_id: '', status: 'planning' as ProjectStatus,
  current_phase: 'Discovery', budget: '', start_date: '', end_date: '',
  priority: 'medium' as Priority,
  maintenance_active: false,
  maintenance_amount: '',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [p, c] = await Promise.all([getProjects(), getClients()])
      setProjects(p)
      setClients(c)
    } catch { /* handled silently */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let data = projects
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.client?.name || '').toLowerCase().includes(q) ||
        p.current_phase.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') data = data.filter(p => p.status === statusFilter)
    setFiltered(data)
  }, [projects, search, statusFilter])

  const openAdd = () => {
    setEditingProject(null)
    setForm(BLANK_FORM)
    setShowDialog(true)
  }

  const openEdit = (p: Project) => {
    setEditingProject(p)
    setForm({
      name: p.name, description: p.description || '', client_id: p.client_id,
      status: p.status, current_phase: p.current_phase, budget: String(p.budget),
      start_date: p.start_date || '', end_date: p.end_date || '',
      priority: p.priority,
      maintenance_active: p.maintenance_active || false,
      maintenance_amount: p.maintenance_amount ? String(p.maintenance_amount) : '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.client_id) return
    try {
      setSaving(true)
      const payload = {
        ...form,
        budget: parseFloat(form.budget) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        progress: editingProject ? editingProject.progress : 0,
        maintenance_amount: parseFloat(form.maintenance_amount) || 0,
      }
      if (editingProject) {
        await updateProject(editingProject.id, payload)
      } else {
        await createProject(payload, DEFAULT_PHASES)
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
      await deleteProject(id)
      setDeleteId(null)
      await load()
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'))
    }
  }

  const handlePhaseToggle = async (projectId: string, phaseId: string, currentStatus: PhaseStatus, allPhases: Project['phases']) => {
    const next: PhaseStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    const updatedPhases = (allPhases || []).map(ph => ph.id === phaseId ? { ...ph, status: next } : ph)
    const completedCount = updatedPhases.filter(ph => ph.status === 'completed').length
    const newProgress = updatedPhases.length > 0 ? Math.round((completedCount / updatedPhases.length) * 100) : 0
    setProjects(prev => prev.map(p => p.id === projectId
      ? { ...p, progress: newProgress, phases: updatedPhases }
      : p
    ))
    await updatePhase(phaseId, { status: next })
    await updateProject(projectId, { progress: newProgress })
  }

  if (loading) {
    return (
      <div className="page-pad">
        {[1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 16, background: 'rgba(255,255,255,0.03)', marginBottom: 12 }} />)}
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total projects`}
        action={
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, fontSize: 14 }} onClick={openAdd}>
            <Plus size={16} />
            New Project
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input className="input-glass" style={{ paddingLeft: 36 }} placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-glass" style={{ width: 'auto', minWidth: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="planning">Planning</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description={search ? 'Try a different search' : 'Create your first project to track progress'}
            action={!search && (
              <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={openAdd}>
                <Plus size={14} style={{ marginRight: 6 }} />New Project
              </button>
            )}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((p) => {
            const expanded = expandedId === p.id
            const phases = p.phases || []
            const paidPct = p.budget > 0 ? Math.round((p.paid_amount / p.budget) * 100) : 0

            return (
              <div key={p.id} className="glass-card" style={{ overflow: 'visible' }}>
                {/* Header */}
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{p.name}</span>
                        <Badge status={p.status} />
                        <Badge status={p.priority} />
                        {p.maintenance_active && p.maintenance_amount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(167,139,250,0.2)', whiteSpace: 'nowrap' }}>
                            🔧 ₹{p.maintenance_amount.toLocaleString('en-IN')}/mo
                          </span>
                        )}
                      </div>
                      {p.client && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Avatar name={p.client.name} size={20} imageUrl={p.client.avatar_url} />
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{p.client.name}{p.client.company ? ` · ${p.client.company}` : ''}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phase</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>{p.current_phase}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Budget</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{formatCurrency(p.budget)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paid</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: p.paid_amount >= p.budget && p.budget > 0 ? '#4ade80' : '#fbbf24' }}>
                            {formatCurrency(p.paid_amount)} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>({paidPct}%)</span>
                          </div>
                        </div>
                        {p.start_date && (
                          <div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start</div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{formatDate(p.start_date)}</div>
                          </div>
                        )}
                        {p.end_date && (
                          <div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deadline</div>
                            <div style={{ fontSize: 13, color: new Date(p.end_date) < new Date() && p.status !== 'completed' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>{formatDate(p.end_date)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                      <button onClick={() => openEdit(p)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
                        <Edit size={12} /> Edit
                      </button>
                      <button onClick={() => setDeleteId(p.id)} style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171' }}>
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => setExpandedId(expanded ? null : p.id)} style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Project Progress</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{p.progress}%</span>
                    </div>
                    <ProgressBar progress={p.progress} height={5} />
                  </div>
                </div>

                {/* Phases Accordion */}
                {expanded && phases.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Project Phases</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {phases
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((phase, idx) => {
                          const isActive = phase.name === p.current_phase
                          return (
                            <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 24 }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>{idx + 1}</span>
                              </div>
                              <button
                                onClick={() => handlePhaseToggle(p.id, phase.id, phase.status, phases)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: phase.status === 'completed' ? '#4ade80' : 'rgba(255,255,255,0.25)' }}
                              >
                                {phase.status === 'completed' ? <CheckCircle2 size={16} /> : phase.status === 'in_progress' ? <Clock size={16} color="#fbbf24" /> : <Circle size={16} />}
                              </button>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? '#fff' : phase.status === 'completed' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)', textDecoration: phase.status === 'completed' ? 'line-through' : 'none' }}>
                                  {phase.name}
                                  {isActive && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(167,139,250,0.2)' }}>CURRENT</span>}
                                </div>
                              </div>
                              <Badge status={phase.status} />
                            </div>
                          )
                        })}
                    </div>

                    {/* Phase Update */}
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Move to phase:</span>
                      <select className="input-glass" style={{ flex: 1 }} value={p.current_phase}
                        onChange={async e => {
                          await updateProject(p.id, { current_phase: e.target.value })
                          await load()
                        }}>
                        {DEFAULT_PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDialog(false) }}>
          <div className="dialog-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setShowDialog(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Client *</label>
                <select className="input-glass" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Project Name *</label>
                <input className="input-glass" placeholder="Website redesign, Mobile app..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Description</label>
                <textarea className="input-glass" placeholder="Project details..." rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div className="grid-3">
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Status</label>
                  <select className="input-glass" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Priority</label>
                  <select className="input-glass" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Current Phase</label>
                  <select className="input-glass" value={form.current_phase} onChange={e => setForm(f => ({ ...f, current_phase: e.target.value }))}>
                    {DEFAULT_PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-3">
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Budget (₹)</label>
                  <input className="input-glass" type="number" placeholder="50000" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Start Date</label>
                  <input className="input-glass" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>End Date</label>
                  <input className="input-glass" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              {/* Maintenance */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.maintenance_active ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Monthly Maintenance</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Collect a recurring fee each month</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, maintenance_active: !f.maintenance_active }))}
                    style={{
                      width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: form.maintenance_active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: form.maintenance_active ? '#000' : 'rgba(255,255,255,0.5)',
                      position: 'absolute', top: 3, transition: 'left 0.2s',
                      left: form.maintenance_active ? 23 : 3,
                    }} />
                  </button>
                </div>
                {form.maintenance_active && (
                  <div>
                    <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Monthly Amount (₹)</label>
                    <input
                      className="input-glass" type="number" placeholder="e.g. 5000"
                      value={form.maintenance_amount}
                      onChange={e => setForm(f => ({ ...f, maintenance_amount: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-glossy" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14 }} onClick={() => setShowDialog(false)}>Cancel</button>
                <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Delete Project?</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>This will permanently delete the project and all its phases.</p>
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
