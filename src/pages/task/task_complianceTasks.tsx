import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { loadSession, seedIfNeeded, todayIso } from './task_store'
import { Filter, Search, ShieldCheck } from 'lucide-react'

function hasHospitalToken(){
  try { return !!(localStorage.getItem('hospital.token') || localStorage.getItem('token')) } catch { return false }
}

export default function Task_ComplianceTasks(){
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all'|'pending'|'submitted'|'approved'|'rejected'|'escalated'>('all')
  const [mine, setMine] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tpls, setTpls] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [assignTplId, setAssignTplId] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignDeadline, setAssignDeadline] = useState(todayIso())
  const [assignPriority, setAssignPriority] = useState<'low'|'medium'|'high'>('medium')
  const [assigning, setAssigning] = useState(false)
  const [assignMsg, setAssignMsg] = useState<string | null>(null)

  const [tplError, setTplError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
  }, [navigate])

  const isAdmin = !!session?.isAdmin

  useEffect(()=>{
    if (!session) return
    if (!hasHospitalToken()) return
    if (!isAdmin) return
    const run = async ()=>{
      try{
        setTplError(null)
        const [t, u]: any[] = await Promise.all([
          hospitalApi.complianceListTemplates({ active: true }),
          hospitalApi.listHospitalUsers(),
        ])
        const tpls = Array.isArray(t?.items) ? t.items : []
        const users = Array.isArray(u?.users) ? u.users : []
        setTpls(tpls)
        setUsers(users)
        if (!assignTplId && tpls[0]?._id) setAssignTplId(String(tpls[0]._id))
      }catch(e: any){
        setTplError(e?.message || 'Failed to load templates/users')
      }
    }
    run()
  }, [assignTplId, isAdmin, session])

  const seedDefaults = async ()=>{
    if (!isAdmin) return
    setSeeding(true)
    setAssignMsg(null)
    setTplError(null)
    try{
      await hospitalApi.complianceSeedDefaultTemplates()
      const t: any = await hospitalApi.complianceListTemplates({ active: true })
      const tpls = Array.isArray(t?.items) ? t.items : []
      setTpls(tpls)
      if (!assignTplId && tpls[0]?._id) setAssignTplId(String(tpls[0]._id))
      setAssignMsg('Default templates created')
    }catch(e: any){
      setTplError(e?.message || 'Seeding failed')
    }finally{
      setSeeding(false)
    }
  }

  useEffect(()=>{
    if (!session) return
    if (!hasHospitalToken()) {
      setError('Hospital login token not found. Please login to Hospital portal first.')
      return
    }
    const run = async ()=>{
      setLoading(true)
      setError(null)
      try{
        const data: any = await hospitalApi.complianceListTasks({
          mine: isAdmin ? (mine ? true : undefined) : true,
          status: status === 'all' ? undefined : status,
        })
        setItems(Array.isArray(data?.items) ? data.items : [])
      }catch(e: any){
        setError(e?.message || 'Failed to load compliance tasks')
      }finally{
        setLoading(false)
      }
    }
    run()
  }, [isAdmin, mine, session, status])

  const assign = async ()=>{
    if (!isAdmin) return
    const templateId = String(assignTplId || '')
    const assignedToId = String(assignUserId || '')
    if (!templateId) { setAssignMsg('Select a template'); return }
    if (!assignedToId) { setAssignMsg('Select a user'); return }
    setAssigning(true)
    setAssignMsg(null)
    try{
      const u = users.find(x => String(x?._id || '') === assignedToId)
      await hospitalApi.complianceAssignTask({
        templateId,
        assignedToId,
        assignedToUsername: String(u?.username || ''),
        deadlineIso: assignDeadline,
        priority: assignPriority,
      })
      setAssignMsg('Task assigned')
      const data: any = await hospitalApi.complianceListTasks({ mine: mine ? true : undefined, status: status === 'all' ? undefined : status })
      setItems(Array.isArray(data?.items) ? data.items : [])
    }catch(e: any){
      setAssignMsg(e?.message || 'Assign failed')
    }finally{
      setAssigning(false)
    }
  }

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(it => {
      const hay = `${it.name || ''} ${it.category || ''} ${it.priority || ''} ${it.deadlineIso || ''} ${it.assignedToUsername || ''}`.toLowerCase()
      return hay.includes(qq)
    })
  }, [items, q])

  const badge = (s: string)=>{
    const st = String(s || '')
    if (st === 'approved') return 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700'
    if (st === 'rejected') return 'inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700'
    if (st === 'submitted') return 'inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700'
    if (st === 'escalated') return 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700'
    return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700'
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Compliance Tasks</div>
          <div className="text-sm text-slate-600">Checklist completion with image proof and admin verification</div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="btn-outline-navy" onClick={()=>navigate('/task/compliance/review')}>Evidence Review</button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {isAdmin && hasHospitalToken() && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-slate-900">Assign compliance task</div>
              <div className="text-sm text-slate-600">Create a task from a compliance template and assign to a Hospital user</div>
            </div>
            <div className="text-xs text-slate-500">Uses Hospital users + Hospital token</div>
          </div>

          {tplError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tplError}</div>
          )}

          {assignMsg && (
            <div className={/assigned/i.test(assignMsg)
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'
              : 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800'}>{assignMsg}</div>
          )}

          {tpls.length === 0 && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-700">No compliance templates found in database.</div>
              <button className={seeding ? 'btn opacity-70 pointer-events-none' : 'btn'} onClick={seedDefaults}>{seeding ? 'Creating...' : 'Create Default Templates'}</button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label className="mb-1 block text-sm text-slate-700">Template</label>
              <select value={assignTplId} onChange={e=>setAssignTplId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select template...</option>
                {tpls.map((t: any) => (
                  <option key={String(t._id)} value={String(t._id)}>{t.category ? `${t.category} — ` : ''}{t.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-sm text-slate-700">Assign to (Hospital user)</label>
              <select value={assignUserId} onChange={e=>setAssignUserId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select user...</option>
                {users.map((u: any) => (
                  <option key={String(u._id)} value={String(u._id)}>{u.username} {u.role ? `(${u.role})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Deadline</label>
              <input type="date" value={assignDeadline} onChange={e=>setAssignDeadline(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-sm text-slate-700">Priority</label>
              <select value={assignPriority} onChange={e=>setAssignPriority(e.target.value as any)} className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm">
                <option value="low">L</option>
                <option value="medium">M</option>
                <option value="high">H</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button className={assigning ? 'btn opacity-70 pointer-events-none' : 'btn'} onClick={assign}>{assigning ? 'Assigning...' : 'Assign Task'}</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="relative">
              <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e=>setQ(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm" placeholder="Search tasks..." />
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="relative">
              <Filter className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
          </div>
          <div className="md:col-span-2 flex items-center justify-end">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)} disabled={!isAdmin} />
              My tasks
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">No compliance tasks</div>
            <div className="mt-1 text-sm text-slate-600">If you’re an admin, assign tasks from the Hospital compliance templates.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((it: any) => (
              <div key={it._id} className="py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-900 truncate">{it.name}</div>
                    <span className={badge(it.status)}>{String(it.status || '').toUpperCase()}</span>
                    {String(it.priority || '') === 'high' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <ShieldCheck className="size-4" />
                        High
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">Category: {it.category || '-'} · Due: {it.deadlineIso || todayIso()}</div>
                  {isAdmin && (
                    <div className="text-xs text-slate-500">Assigned to: {it.assignedToUsername || it.assignedToId}</div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <NavLink to={`/task/compliance/tasks/${it._id}`} className="btn-outline-navy text-sm">Open</NavLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
