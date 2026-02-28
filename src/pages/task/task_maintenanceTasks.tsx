import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { loadSession, seedIfNeeded } from './task_store'
import { CalendarDays, RefreshCw, Shuffle, Sparkles } from 'lucide-react'
import Task_SearchableSelect from './task_SearchableSelect'

function useQuery(){
  const { search } = useLocation()
  return useMemo(()=> new URLSearchParams(search), [search])
}

function todayIso(){
  return new Date().toISOString().slice(0,10)
}

export default function Task_MaintenanceTasks(){
  const navigate = useNavigate()
  const qs = useQuery()
  const planIdPrefill = String(qs.get('planId') || '')

  const [session, setSession] = useState<any>(null)
  const isAdmin = !!session?.isAdmin

  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [assets, setAssets] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(todayIso())
  const [status, setStatus] = useState<'all'|'todo'|'doing'|'done'>('all')
  const [planId, setPlanId] = useState(planIdPrefill)

  const [reassign, setReassign] = useState({ from: '', to: '' })

  const canCallBackend = useMemo(()=>{
    try { return !!localStorage.getItem('hospital.token') || !!localStorage.getItem('hospital_backup_settings') } catch { return false }
  }, [])

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
  }, [navigate])

  const staffName = (id: any)=> staff.find(s => String(s?._id||'') === String(id||''))?.name || '-'
  const assetName = (id: any)=> assets.find(a => String(a?._id||'') === String(id||''))?.name || '-'
  const planTitle = (id: any)=> plans.find(p => String(p?._id||'') === String(id||''))?.title || '-'

  const planOptions = useMemo(()=>([
    { value: '', label: 'All plans' },
    ...plans.map(p => ({ value: String(p._id), label: String(p.title || 'Plan') })),
  ]), [plans])

  const staffOptions = useMemo(()=>([
    { value: '', label: 'Select' },
    ...staff.map(s => ({ value: String(s._id), label: `${String(s.name || 'Staff')} (${String(s.role || '-')})` })),
  ]), [staff])

  async function loadAll(){
    setLoading(true)
    setError(null)
    try{
      const [t, a, p, st]: any[] = await Promise.all([
        hospitalApi.maintenanceListTasks({ date, status: status==='all'?undefined:status, planId: planId || undefined, limit: 500 }),
        hospitalApi.maintenanceListAssets({ limit: 500 }),
        hospitalApi.maintenanceListPlans({ limit: 500 }),
        (hospitalApi as any).listStaff(),
      ])
      setItems(Array.isArray(t?.items) ? t.items : [])
      setTotal(Number(t?.total || 0))
      setAssets(Array.isArray(a?.items) ? a.items : [])
      setPlans(Array.isArray(p?.items) ? p.items : [])
      setStaff(Array.isArray(st?.staff) ? st.staff : (Array.isArray(st?.items)? st.items : []))
    } catch(e: any){
      const msg = String(e?.message || 'Failed to load')
      if (/unauthorized|forbidden/i.test(msg)) setError('Access denied. Login to Hospital portal or set Admin Key in Backup/Settings.')
      else setError(msg)
    }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ if (canCallBackend) void loadAll() }, [canCallBackend])

  async function generate(){
    setError(null)
    try{
      await hospitalApi.maintenanceGenerateTasks({ dateIso: date, planId: planId || undefined })
      await loadAll()
    } catch(e: any){ setError(String(e?.message || 'Generate failed')) }
  }

  async function setTaskStatus(id: string, next: 'todo'|'doing'|'done'){
    setError(null)
    try{ await hospitalApi.maintenanceUpdateTask(id, { status: next }); await loadAll() }
    catch(e: any){ setError(String(e?.message || 'Update failed')) }
  }

  async function doReassign(){
    if (!reassign.from || !reassign.to) { setError('Select both staff'); return }
    setError(null)
    try{
      await hospitalApi.maintenanceReassignTasks({ fromStaffId: reassign.from, toStaffId: reassign.to, dateIso: date })
      await loadAll()
    } catch(e: any){ setError(String(e?.message || 'Reassign failed')) }
  }

  const statusBadge = (s: any) => {
    const v = String(s || 'todo')
    if (v === 'done') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (v === 'doing') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  if (!session) return null

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Maintenance Tasks</div>
          <div className="text-sm text-slate-600">Auto-generated recurring tasks</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/maintenance/assets')}>Assets</button>
          <button className="btn-outline-navy" onClick={()=>navigate('/task/maintenance/plans')}>Plans</button>
          <button className="btn-outline-navy inline-flex items-center gap-2" onClick={loadAll} disabled={loading}>
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {!!error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-8">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Date</label>
            <div className="relative">
              <CalendarDays className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="all">All</option>
              <option value="todo">Todo</option>
              <option value="doing">Doing</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-sm text-slate-700">Plan</label>
            <Task_SearchableSelect
              value={planId}
              onChange={setPlanId}
              options={planOptions}
              placeholder="All plans"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Total: {total}</div>
          <div className="flex gap-2">
            <button className="btn-outline-navy" onClick={loadAll} disabled={loading}>Apply</button>
            {isAdmin && (
              <button className="btn-navy inline-flex items-center gap-2" onClick={generate}>
                <Sparkles className="size-4" />
                Generate
              </button>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">Reassign (Absence)</div>
            <div className="text-xs text-slate-500">Moves tasks for the selected date</div>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-slate-700">From staff</label>
              <Task_SearchableSelect
                value={reassign.from}
                onChange={(v)=>setReassign(s=>({ ...s, from: v }))}
                options={staffOptions}
                placeholder="Select"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-slate-700">To staff</label>
              <Task_SearchableSelect
                value={reassign.to}
                onChange={(v)=>setReassign(s=>({ ...s, to: v }))}
                options={staffOptions}
                placeholder="Select"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn-navy inline-flex items-center gap-2" onClick={doReassign}>
              <Shuffle className="size-4" />
              Reassign
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y">
          {items.map(it => (
            <div key={String(it._id)} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(it.status)}`}>{String(it.status || 'todo').toUpperCase()}</span>
                  <div className="font-semibold text-slate-900 truncate">{it.title}</div>
                </div>
                <div className="mt-1 text-xs text-slate-600">Asset: {assetName(it.assetId)} • Plan: {planTitle(it.planId)} • Assignee: {staffName(it.assignedToStaffId)}</div>
                {it.description && <div className="mt-1 text-xs text-slate-500">{it.description}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-outline-navy" onClick={()=>setTaskStatus(String(it._id), 'todo')}>Todo</button>
                <button className="btn-outline-navy" onClick={()=>setTaskStatus(String(it._id), 'doing')}>Doing</button>
                <button className="btn-outline-navy" onClick={()=>setTaskStatus(String(it._id), 'done')}>Done</button>
              </div>
            </div>
          ))}
          {!items.length && <div className="p-4 text-sm text-slate-500">No maintenance tasks for selection.</div>}
        </div>
      </div>
    </div>
  )
}
